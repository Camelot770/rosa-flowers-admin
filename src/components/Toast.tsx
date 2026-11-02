import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  text: string;
  tone: 'ok' | 'error';
  action?: ToastAction;
}

type ShowToast = (text: string, options?: { tone?: 'ok' | 'error'; action?: ToastAction }) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

const TOAST_MS = 7000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>((text, options) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, text, tone: options?.tone || 'ok', action: options?.action }]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      dismiss(id);
    }, TOAST_MS);
    timers.current.add(timer);
  }, [dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed z-[60] bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 space-y-2 print:hidden" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 text-sm ${
              toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-ink text-white'
            }`}
          >
            <span className="flex-1 min-w-0">{toast.text}</span>
            {toast.action && (
              <button
                onClick={() => { dismiss(toast.id); toast.action!.onClick(); }}
                className="font-semibold underline underline-offset-2 shrink-0"
              >
                {toast.action.label}
              </button>
            )}
            <button onClick={() => dismiss(toast.id)} aria-label="Закрыть" className="shrink-0 opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
