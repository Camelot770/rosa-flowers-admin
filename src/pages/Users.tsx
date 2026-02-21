import { useState, useEffect } from 'react';
import { Loader2, Search, X, Package, Star, MapPin, Calendar } from 'lucide-react';
import api from '../api/client';

interface UserItem {
  id: number;
  telegramId?: string | null;
  maxId?: string | null;
  platform?: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  bonusPoints: number;
  ordersCount: number;
  createdAt: string;
}

interface UserOrder {
  id: number;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
}

interface LoyaltyEntry {
  id: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface UserDetail extends UserItem {
  orders: UserOrder[];
  loyaltyHistory: LoyaltyEntry[];
  addresses: { id: number; title: string; street: string; house: string; apartment: string | null; entrance: string | null; floor: string | null }[];
}

const statusLabels: Record<string, string> = {
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

function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail modal
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'orders' | 'bonus' | 'addresses'>('orders');

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (userId: number) => {
    setDetailLoading(true);
    setDetailTab('orders');
    try {
      const { data } = await api.get(`/users/${userId}`);
      setSelectedUser(data);
    } catch {
      // silently fail
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return (
      name.includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.telegramId || '').includes(q) ||
      (u.maxId || '').includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Клиенты</h1>
        <span className="text-sm text-gray-500">{filtered.length} из {users.length}</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, username, телефону, ID..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {search ? 'Ничего не найдено' : 'Нет клиентов'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Телефон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Платформа</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Заказы</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Бонусы</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дата рег.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openDetail(user.id)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || '---'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.username ? `@${user.username}` : '---'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '---'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${user.telegramId ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {user.telegramId ? '📱 Telegram' : '💬 Max'}
                      </span>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{user.telegramId || user.maxId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">{user.ordersCount}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-primary">{user.bonusPoints}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedUser(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : selectedUser && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || 'Клиент'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {selectedUser.username && <span>@{selectedUser.username}</span>}
                      {selectedUser.phone && <span>{selectedUser.phone}</span>}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${selectedUser.telegramId ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {selectedUser.telegramId ? '📱 TG' : '💬 Max'}
                      </span>
                      <span className="font-mono text-xs text-gray-400">{selectedUser.telegramId || (selectedUser as any).maxId}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={18} />
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                    <Package size={16} className="text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Заказов</p>
                      <p className="font-bold text-gray-800">{selectedUser.orders?.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-pink-50 rounded-lg">
                    <Star size={16} className="text-primary" />
                    <div>
                      <p className="text-xs text-gray-500">Бонусы</p>
                      <p className="font-bold text-primary">{selectedUser.bonusPoints}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg">
                    <Calendar size={16} className="text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">С нами с</p>
                      <p className="font-bold text-gray-800 text-xs">{new Date(selectedUser.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-5">
                  {([['orders', 'Заказы'], ['bonus', 'Бонусы'], ['addresses', 'Адреса']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setDetailTab(key)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        detailTab === key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {detailTab === 'orders' && (
                    <div className="space-y-2">
                      {(!selectedUser.orders || selectedUser.orders.length === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-4">Нет заказов</p>
                      ) : selectedUser.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-800">Заказ #{order.id}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                              {statusLabels[order.status] || order.status}
                            </span>
                            <span className="text-sm font-semibold text-gray-800">{formatRubles(order.totalPrice)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailTab === 'bonus' && (
                    <div className="space-y-2">
                      {(!selectedUser.loyaltyHistory || selectedUser.loyaltyHistory.length === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-4">История пуста</p>
                      ) : selectedUser.loyaltyHistory.map((entry) => {
                        const isPositive = entry.amount > 0;
                        return (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-700">{entry.description || 'Корректировка'}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(entry.createdAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric', month: 'long', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                              {isPositive ? '+' : ''}{entry.amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {detailTab === 'addresses' && (
                    <div className="space-y-2">
                      {(!selectedUser.addresses || selectedUser.addresses.length === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-4">Нет сохранённых адресов</p>
                      ) : selectedUser.addresses.map((addr) => (
                        <div key={addr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin size={16} className="text-gray-400 shrink-0" />
                          <p className="text-sm text-gray-700">
                            {[addr.title, addr.street, addr.house,
                              addr.apartment ? `кв. ${addr.apartment}` : null,
                              addr.entrance ? `подъезд ${addr.entrance}` : null,
                              addr.floor ? `этаж ${addr.floor}` : null]
                              .filter(Boolean)
                              .join(', ') || '---'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
