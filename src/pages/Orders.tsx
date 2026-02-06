import { useState, useEffect } from 'react';
import api from '../api/client';

interface OrderItem {
  bouquet?: { name: string };
  quantity: number;
}

interface Order {
  id: number;
  firstName: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fetchOrders = (status: string) => {
    setLoading(true);
    const params = status === 'all' ? {} : { status };
    api.get('/orders', { params })
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    setError('');
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(activeTab);
    } catch (err) {
      console.error(err);
      setError(`Не удалось обновить статус заказа #${orderId}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Заказы</h1>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === status
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Дата</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">#{order.id}</td>
                    <td className="px-4 py-3 text-gray-700">{order.firstName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="max-w-[200px]">
                        {order.items.map((item, i) => (
                          <div key={i} className="truncate text-xs">
                            {item.bouquet?.name || 'Букет'} x{item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatRubles(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      {nextStatuses[order.status]?.length > 0 ? (
                        <select
                          disabled={updatingId === order.id}
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusChange(order.id, e.target.value);
                            }
                          }}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                        >
                          <option value="">Изменить...</option>
                          {nextStatuses[order.status].map((s) => (
                            <option key={s} value={s}>
                              {statusLabels[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
