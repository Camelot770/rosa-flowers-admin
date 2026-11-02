import { calendarDate, dayLabel, isIsoDate, studioDate } from './format';
import { formatAddress } from './address';

export interface OrderUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: string | null;
  maxId?: string | null;
  _count?: { orders: number };
}

export interface OrderAddress {
  id: number;
  title: string;
  street: string;
  house: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  comment?: string | null;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  bouquet?: { images?: { url: string }[] } | null;
}

export interface Order {
  id: number;
  user: OrderUser;
  address?: OrderAddress | null;
  items: OrderItem[];
  status: string;
  deliveryType: string;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  isAnonymous: boolean;
  cardText?: string | null;
  comment?: string | null;
  adminNote?: string | null;
  customerEmail?: string | null;
  totalPrice: number;
  bonusUsed: number;
  bonusEarned: number;
  promoCode?: string | null;
  promoDiscount?: number;
  paymentStatus: string;
  createdAt: string;
}

export const ACTIVE_STATUSES = ['confirmed', 'preparing', 'delivering'];

export const statusLabels: Record<string, string> = {
  new: 'Ждёт оплаты',
  confirmed: 'Подтверждён',
  preparing: 'Готовится',
  delivering: 'В доставке',
  completed: 'Выполнен',
  canceled: 'Отменён',
};

export const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  delivering: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-700',
};

export const paymentColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  paid: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-600',
};

export const paymentLabels: Record<string, string> = {
  pending: 'Не оплачен',
  paid: 'Оплачен',
  canceled: 'Оплата отменена',
};

// Mirrors the server: orders move one step forward, or get canceled
const NEXT_STATUS: Record<string, string> = {
  new: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'completed',
};

const PREVIOUS_STATUS: Record<string, string> = {
  confirmed: 'new',
  preparing: 'confirmed',
  delivering: 'preparing',
  completed: 'delivering',
};

export function statusLabel(order: Pick<Order, 'status' | 'deliveryType'>): string {
  if (order.status === 'delivering' && order.deliveryType === 'pickup') return 'Готов к выдаче';
  return statusLabels[order.status] || order.status;
}

export function nextStatus(order: Pick<Order, 'status'>): string | null {
  return NEXT_STATUS[order.status] || null;
}

export function previousStatus(order: Pick<Order, 'status' | 'paymentStatus'>): string | null {
  const previous = PREVIOUS_STATUS[order.status];
  // A paid order became "confirmed" by itself, "new" would mean it still waits for the money
  if (!previous || (previous === 'new' && order.paymentStatus === 'paid')) return null;
  return previous;
}

export function nextStepLabel(order: Pick<Order, 'status' | 'deliveryType'>): string {
  const pickup = order.deliveryType === 'pickup';
  switch (order.status) {
    case 'new': return 'Подтвердить';
    case 'confirmed': return 'Начать сборку';
    case 'preparing': return pickup ? 'Готов к выдаче' : 'В доставку';
    case 'delivering': return pickup ? 'Выдан' : 'Доставлен';
    default: return '';
  }
}

export function isOverdue(order: Pick<Order, 'status' | 'deliveryDate'>): boolean {
  return ACTIVE_STATUSES.includes(order.status) && isIsoDate(order.deliveryDate) && order.deliveryDate < studioDate();
}

export function customerName(user: Pick<OrderUser, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

// The order does not store its delivery price, so it is what remains of the total after the discounts
export function orderBreakdown(order: Order) {
  const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const promoDiscount = order.promoDiscount || 0;
  const deliveryPrice = order.totalPrice - (itemsTotal - promoDiscount - order.bonusUsed);
  return { itemsTotal, promoDiscount, deliveryPrice };
}

export function whenLabel(order: Pick<Order, 'deliveryDate' | 'deliveryTime'>): string {
  return [dayLabel(order.deliveryDate), order.deliveryTime].filter(Boolean).join(', ');
}

// The address without the label a customer gave it, like "Дом"
export function plainAddress(address: OrderAddress): string {
  return formatAddress(address).replace(/^[^:]*:\s/, '');
}

export function calendarWhen(order: Pick<Order, 'deliveryDate' | 'deliveryTime'>): string {
  return [calendarDate(order.deliveryDate), order.deliveryTime].filter(Boolean).join(', ');
}

// For a map search: no flat, and the mini-apps do not ask for a city
export function mapQuery(address: OrderAddress): string {
  const place = plainAddress({ ...address, entrance: undefined, floor: undefined, apartment: undefined });
  return /казан/i.test(place) ? place : `Казань, ${place}`;
}

export function courierText(order: Order): string {
  const lines = [`Заказ #${order.id}, ${calendarWhen(order)}`];
  if (order.deliveryType === 'pickup') lines.push('Самовывоз');
  if (order.address) lines.push(`Адрес: ${plainAddress(order.address)}`);
  if (order.address?.comment) lines.push(`К адресу: ${order.address.comment}`);
  if (order.recipientName || order.recipientPhone) {
    lines.push(`Получатель: ${[order.recipientName, order.recipientPhone].filter(Boolean).join(', ')}`);
  }
  lines.push(`Букет: ${order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}`);
  if (order.isAnonymous) lines.push('Анонимно: отправителя не называть');
  return lines.join('\n');
}

export function cancelConfirmText(order: Order, money: (n: number) => string): string {
  const lines = [`Отменить заказ #${order.id}? Вернуть его в работу будет нельзя.`];
  if (order.bonusUsed > 0) lines.push(`Списанные бонусы (${order.bonusUsed}) вернутся клиенту.`);
  if (order.paymentStatus === 'paid') lines.push(`Заказ уже оплачен: ${money(order.totalPrice)} нужно вернуть вручную в кабинете ЮKassa.`);
  return lines.join('\n\n');
}
