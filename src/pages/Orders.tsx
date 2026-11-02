import { useState, useEffect, useCallback } from 'react';
import { Search, X, Truck, Store, CreditCard, Eye, User, MapPin, Clock, Gift, MessageSquare, Star, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { getPlatform } from '../utils/platform';
import { formatAddress } from '../utils/address';

interface OrderUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: string | null;
  maxId?: string | null;
}

interface OrderAddress {
  id: number;
  title: string;
  street: string;
  house: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  comment?: string | null;
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  bouquet?: { images?: { url: string }[] } | null;
}

interface Order {
  id: number;
  user: OrderUser;
  address?: OrderAddress | null;
  items: OrderItem[];
  status: string;
  deliveryType: string;
  deliveryDate?: string;
  deliveryTime?: string;
  recipientName?: string;
  recipientPhone?: string;
  isAnonymous: boolean;
  cardText?: string;
  comment?: string;
  totalPrice: number;
  bonusUsed: number;
  bonusEarned: number;
  promoCode?: string | null;
  promoDiscount?: number;
  paymentStatus: string;
  createdAt: string;
}

const statuses = ['all', 'new', 'confirmed', 'preparing', 'delivering', 'completed', 'canceled'] as const;

const statusLabels: Record<string, string> = {
  all: 'Все',
  new: 'Новый',
  confirmed: 'Подтверждён',
  preparing: 'Готовится',
  delivering: 'В доставке',
  completed: 'Выполнен',
  canceled: 'Отменён',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  delivering: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-700',
};

const paymentColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  paid: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-600',
};

const paymentLabels: Record<string, string> = {
  pending: 'Ожидает',
  paid: 'Оплачен',
  canceled: 'Отменён',
};

const nextStatuses: Record<string, string[]> = {
  new: ['confirmed', 'canceled'],
  confirmed: ['preparing', 'canceled'],
  preparing: ['delivering', 'canceled'],
  delivering: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function cancelConfirmText(order: Order): string {
  const lines = [`Отменить заказ #${order.id}? Вернуть его в работу будет нельзя.`];
  if (order.bonusUsed > 0) lines.push(`Списанные бонусы (${order.bonusUsed}) вернутся клиенту.`);
  if (order.paymentStatus === 'paid') lines.push(`Заказ уже оплачен: ${formatRubles(order.totalPrice)} нужно вернуть вручную в кабинете ЮKassa.`);
  return lines.join('\n\n');
}

// The order does not store its delivery price, so it is what remains of the total after the discounts
function orderBreakdown(order: Order) {
  const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const promoDiscount = order.promoDiscount || 0;
  const deliveryPrice = order.totalPrice - (itemsTotal - promoDiscount - order.bonusUsed);
  return { itemsTotal, promoDiscount, deliveryPrice };
}

export default function Orders() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get('/orders')
      .then((res) => setAllOrders(res.data))
      .catch(() => { if (!silent) setError('Не удалось загрузить заказы'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders by active tab
  const orders = activeTab === 'all' ? allOrders : allOrders.filter((o) => o.status === activeTab);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    setError('');
    try {
      if (newStatus === 'canceled') {
        // The customer may have paid since this list was loaded
        const { data: fresh } = await api.get(`/orders/${orderId}`);
        if (!window.confirm(cancelConfirmText(fresh))) return;
      }
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        try {
          const { data } = await api.get(`/orders/${orderId}`);
          setSelectedOrder(data);
        } catch {
          setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `Не удалось обновить статус заказа #${orderId}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = [o.user.firstName, o.user.lastName].filter(Boolean).join(' ').toLowerCase();
    return (
      `#${o.id}`.includes(q) ||
      String(o.id).includes(q) ||
      name.includes(q) ||
      (o.user.phone || '').includes(q) ||
      (o.recipientPhone || '').includes(q)
    );
  });

  const statusCounts: Record<string, number> = {};
  allOrders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const breakdown = selectedOrder ? orderBreakdown(selectedOrder) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Заказы</h1>
          <button
            onClick={() => fetchOrders()}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ID, имени, телефону..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const count = status === 'all' ? allOrders.length : statusCounts[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === status
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {statusLabels[status]}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === status ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Заказов не найдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Клиент</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Товары</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Сумма</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Тип</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Оплата</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Дата</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => {
                  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(' ');
                  const platform = getPlatform(order.user);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      <td className="px-4 py-3 font-medium text-gray-800">#{order.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-800 font-medium">{customerName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${platform.soft}`}>
                            {platform.tag}
                          </span>
                        </div>
                        {order.user.phone && <div className="text-xs text-gray-400">{order.user.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="max-w-[180px]">
                          {order.items.slice(0, 2).map((item, i) => (
                            <div key={i} className="truncate text-xs">{item.name} x{item.quantity}</div>
                          ))}
                          {order.items.length > 2 && <div className="text-xs text-gray-400">+{order.items.length - 2} ещё</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{formatRubles(order.totalPrice)}</td>
                      <td className="px-4 py-3 text-center">
                        {order.deliveryType === 'pickup' ? (
                          <Store size={16} className="inline text-gray-500" />
                        ) : (
                          <Truck size={16} className="inline text-blue-500" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {paymentLabels[order.paymentStatus] || order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setSelectedOrder(order)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Подробнее">
                            <Eye size={16} />
                          </button>
                          {nextStatuses[order.status]?.length > 0 && (
                            <select
                              disabled={updatingId === order.id}
                              value=""
                              onChange={(e) => { if (e.target.value) handleStatusChange(order.id, e.target.value); }}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                            >
                              <option value="">Изменить...</option>
                              {nextStatuses[order.status].map((s) => (
                                <option key={s} value={s}>{statusLabels[s]}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">Заказ #{selectedOrder.id}</h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentColors[selectedOrder.paymentStatus]}`}>
                  {paymentLabels[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}
                </span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Refund reminder */}
              {selectedOrder.status === 'canceled' && selectedOrder.paymentStatus === 'paid' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>Заказ оплачен и отменён. Деньги сами не вернутся: сделайте возврат {formatRubles(selectedOrder.totalPrice)} в кабинете ЮKassa, если ещё не сделали.</span>
                </div>
              )}

              {/* Status Actions */}
              {nextStatuses[selectedOrder.status]?.length > 0 && (
                <div className="flex gap-2">
                  {nextStatuses[selectedOrder.status].map((s) => (
                    <button
                      key={s}
                      disabled={updatingId === selectedOrder.id}
                      onClick={() => handleStatusChange(selectedOrder.id, s)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        s === 'canceled' ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              )}

              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2"><User size={14} /> Клиент</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Имя:</span> <span className="font-medium">{[selectedOrder.user.firstName, selectedOrder.user.lastName].filter(Boolean).join(' ')}</span></div>
                  {selectedOrder.user.username && <div><span className="text-gray-400">Username:</span> <span className="font-medium">@{selectedOrder.user.username}</span></div>}
                  {selectedOrder.user.phone && <div><span className="text-gray-400">Телефон:</span> <span className="font-medium">{selectedOrder.user.phone}</span></div>}
                  <div>
                    <span className="text-gray-400">Платформа:</span>{' '}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${getPlatform(selectedOrder.user).strong}`}>
                      {getPlatform(selectedOrder.user).full}
                    </span>
                    <span className="ml-2 font-mono text-xs text-gray-400">{selectedOrder.user.telegramId || selectedOrder.user.maxId}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Состав заказа</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => {
                    const imgSrc = item.bouquet?.images?.[0]?.url;
                    return (
                      <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg p-2">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                          {imgSrc ? <img src={imageUrl(imgSrc)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">🌹</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.quantity} x {formatRubles(item.price)}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{formatRubles(item.price * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  {selectedOrder.deliveryType === 'pickup' ? <Store size={14} /> : <Truck size={14} />}
                  {selectedOrder.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedOrder.address && (
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div>{formatAddress(selectedOrder.address)}</div>
                        {selectedOrder.address.comment && <div className="text-gray-500 mt-0.5">{selectedOrder.address.comment}</div>}
                      </div>
                    </div>
                  )}
                  {selectedOrder.deliveryDate && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span>{new Date(selectedOrder.deliveryDate).toLocaleDateString('ru-RU')}</span>
                      {selectedOrder.deliveryTime && <span className="text-gray-400">({selectedOrder.deliveryTime})</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient */}
              {(selectedOrder.recipientName || selectedOrder.recipientPhone) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <Gift size={14} /> Получатель
                    {selectedOrder.isAnonymous && <span className="text-xs font-normal text-orange-500 ml-1">(анонимно)</span>}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedOrder.recipientName && <div><span className="text-gray-400">Имя:</span> <span className="font-medium">{selectedOrder.recipientName}</span></div>}
                    {selectedOrder.recipientPhone && <div><span className="text-gray-400">Телефон:</span> <span className="font-medium">{selectedOrder.recipientPhone}</span></div>}
                  </div>
                </div>
              )}

              {/* Card Text */}
              {selectedOrder.cardText && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2"><MessageSquare size={14} /> Текст открытки</h3>
                  <p className="text-sm text-gray-700 italic">&laquo;{selectedOrder.cardText}&raquo;</p>
                </div>
              )}

              {/* Comment */}
              {selectedOrder.comment && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Комментарий</h3>
                  <p className="text-sm text-gray-700">{selectedOrder.comment}</p>
                </div>
              )}

              {/* Financial */}
              {breakdown && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2"><CreditCard size={14} /> Стоимость</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Товары</span><span className="font-medium">{formatRubles(breakdown.itemsTotal)}</span></div>
                    {breakdown.promoDiscount > 0 && <div className="flex justify-between text-green-600"><span>Промокод {selectedOrder.promoCode}</span><span>-{formatRubles(breakdown.promoDiscount)}</span></div>}
                    {selectedOrder.bonusUsed > 0 && <div className="flex justify-between text-green-600"><span>Использовано бонусов</span><span>-{formatRubles(selectedOrder.bonusUsed)}</span></div>}
                    {selectedOrder.deliveryType === 'delivery' && breakdown.deliveryPrice >= 0 && (
                      <div className="flex justify-between"><span className="text-gray-500">Доставка</span><span className="font-medium">{breakdown.deliveryPrice > 0 ? formatRubles(breakdown.deliveryPrice) : 'бесплатно'}</span></div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold text-gray-800"><span>Итого</span><span>{formatRubles(selectedOrder.totalPrice)}</span></div>
                    {selectedOrder.bonusEarned > 0 && selectedOrder.status !== 'canceled' && (
                      <div className="flex justify-between text-primary"><span className="flex items-center gap-1"><Star size={12} /> {selectedOrder.paymentStatus === 'paid' ? 'Начислено бонусов' : 'Начислится после оплаты'}</span><span>+{selectedOrder.bonusEarned}</span></div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 text-right">Создан {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
