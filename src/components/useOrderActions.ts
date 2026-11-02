import { useState } from 'react';
import api from '../api/client';
import { useToast } from './Toast';
import { useOrderSummary } from './OrderSummary';
import { formatRubles } from '../utils/format';
import { Order, cancelConfirmText, nextStatus, previousStatus, statusLabel } from '../utils/orders';

const errorText = (err: any, fallback: string) => err.response?.data?.error || fallback;

export function useOrderActions(onChanged: (orderId: number) => void) {
  const toast = useToast();
  const { refresh } = useOrderSummary();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const put = async (orderId: number, status: string) => {
    await api.put(`/orders/${orderId}/status`, { status });
    onChanged(orderId);
    refresh();
  };

  const advance = async (order: Order) => {
    const target = nextStatus(order);
    if (!target) return;
    setUpdatingId(order.id);
    try {
      if (order.status === 'new') {
        // The customer may have paid since this list was loaded, then the order has moved on by itself
        const { data: fresh } = await api.get(`/orders/${order.id}`);
        if (fresh.status !== 'new') {
          toast(`Заказ #${order.id} уже оплачен и подтверждён`);
          onChanged(order.id);
          refresh();
          return;
        }
        const question = `Заказ #${order.id} не оплачен. Подтвердить его без оплаты и взять в работу?`;
        if (!window.confirm(question)) return;
      }
      await put(order.id, target);
      const undo = previousStatus({ status: target, paymentStatus: order.paymentStatus });
      toast(`Заказ #${order.id}: ${statusLabel({ status: target, deliveryType: order.deliveryType }).toLowerCase()}`, {
        action: undo ? {
          label: 'Вернуть',
          onClick: () => {
            put(order.id, undo).catch((err) => toast(errorText(err, 'Не удалось вернуть статус'), { tone: 'error' }));
          },
        } : undefined,
      });
    } catch (err) {
      onChanged(order.id);
      toast(errorText(err, `Не удалось обновить заказ #${order.id}`), { tone: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const back = async (order: Order) => {
    const target = previousStatus(order);
    if (!target) return;
    setUpdatingId(order.id);
    try {
      await put(order.id, target);
      toast(`Заказ #${order.id} возвращён: ${statusLabel({ status: target, deliveryType: order.deliveryType }).toLowerCase()}. Клиенту об этом не сообщается.`);
    } catch (err) {
      onChanged(order.id);
      toast(errorText(err, 'Не удалось вернуть статус'), { tone: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const cancel = async (order: Order) => {
    setUpdatingId(order.id);
    try {
      // The customer may have paid since this list was loaded
      const { data: fresh } = await api.get(`/orders/${order.id}`);
      if (!window.confirm(cancelConfirmText(fresh, formatRubles))) return;
      await put(order.id, 'canceled');
      toast(`Заказ #${order.id} отменён`);
    } catch (err) {
      onChanged(order.id);
      toast(errorText(err, `Не удалось отменить заказ #${order.id}`), { tone: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  return { updatingId, advance, back, cancel };
}
