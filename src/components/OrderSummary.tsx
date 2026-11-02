import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from './Toast';

export interface Summary {
  active: number;
  toStart: number;
  awaitingPayment: number;
  deliveriesToday: number;
  deliveriesTomorrow: number;
  overdue: number;
}

interface SummaryContextValue {
  summary: Summary | null;
  refresh: () => void;
}

const SummaryContext = createContext<SummaryContextValue>({ summary: null, refresh: () => {} });

export const useOrderSummary = () => useContext(SummaryContext);

const POLL_MS = 30_000;
const BASE_TITLE = document.title;

// Counters for the menu and the tab title. A paid order moves to "confirmed" by itself, that is the one to act on.
export function OrderSummaryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const known = useRef<number | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback((announce: boolean) => {
    api.get('/orders/summary')
      .then(({ data }) => {
        setSummary(data);
        // The counter also grows when the studio itself moves an order back, that is not news
        if (announce && known.current !== null && data.toStart > known.current) {
          toast('Новый оплаченный заказ', {
            action: { label: 'Открыть', onClick: () => navigate('/orders?view=confirmed') },
          });
        }
        known.current = data.toStart;
      })
      // The counters are a convenience: the page itself reports its own errors
      .catch(() => {});
  }, [toast, navigate]);

  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => {
    load(false);
    const poll = () => {
      if (!document.hidden) load(true);
    };
    const interval = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [load]);

  useEffect(() => {
    document.title = summary?.toStart ? `(${summary.toStart}) ${BASE_TITLE}` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [summary?.toStart]);

  return <SummaryContext.Provider value={{ summary, refresh }}>{children}</SummaryContext.Provider>;
}
