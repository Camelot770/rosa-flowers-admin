import { useState, useEffect, FormEvent } from 'react';
import { Loader2, X, History, Plus, Minus, Search, Star } from 'lucide-react';
import api from '../api/client';

interface LoyaltyUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  username?: string;
  phone?: string;
  bonusPoints: number;
  telegramId: string;
}

interface HistoryEntry {
  id: number;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
}

export default function Loyalty() {
  const [users, setUsers] = useState<LoyaltyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [selectedUser, setSelectedUser] = useState<LoyaltyUser | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Adjust form
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/loyalty');
      const list = Array.isArray(data) ? data : data.users || [];
      setUsers(list.map((u: any) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        phone: u.phone,
        bonusPoints: u.bonusPoints,
        telegramId: u.telegramId?.toString() || '',
      })));
    } catch {
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const openUserHistory = async (user: LoyaltyUser) => {
    setSelectedUser(user);
    setHistoryLoading(true);
    setHistory([]);
    setShowAdjust(false);
    setAdjustAmount('');
    setAdjustDescription('');

    try {
      const { data } = await api.get(`/loyalty/${user.id}`);
      setHistory(Array.isArray(data) ? data : data.history || []);
    } catch {
      setError('Ошибка загрузки истории');
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setHistory([]);
    setShowAdjust(false);
  };

  const handleAdjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount) return;

    setAdjusting(true);
    setError('');

    try {
      await api.post(`/loyalty/${selectedUser.id}/adjust`, {
        amount: Number(adjustAmount),
        description: adjustDescription.trim() || undefined,
      });

      await fetchUsers();
      const { data } = await api.get(`/loyalty/${selectedUser.id}`);
      setHistory(Array.isArray(data) ? data : data.history || []);

      setSelectedUser((prev) =>
        prev ? { ...prev, bonusPoints: prev.bonusPoints + Number(adjustAmount) } : null
      );

      setAdjustAmount('');
      setAdjustDescription('');
      setShowAdjust(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка корректировки баллов');
    } finally {
      setAdjusting(false);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return (
      name.includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q)
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
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Star size={22} className="text-primary" />
          Программа лояльности
        </h1>
        <span className="text-sm text-gray-500">{filtered.length} клиентов</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, username, телефону..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {search ? 'Ничего не найдено' : 'Нет клиентов'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Имя</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Телефон</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Бонусные баллы</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => openUserHistory(user)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || '---'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.username ? `@${user.username}` : '---'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '---'}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-semibold ${user.bonusPoints > 0 ? 'text-primary' : 'text-gray-400'}`}>
                      {user.bonusPoints}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openUserHistory(user); }}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="История"
                    >
                      <History size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || 'Пользователь'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Баллы: <span className={`font-semibold ${selectedUser.bonusPoints > 0 ? 'text-primary' : 'text-gray-400'}`}>{selectedUser.bonusPoints}</span>
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Adjust Button */}
              {!showAdjust && (
                <button
                  onClick={() => setShowAdjust(true)}
                  className="mb-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  Корректировка баллов
                </button>
              )}

              {/* Adjust Form */}
              {showAdjust && (
                <form onSubmit={handleAdjust} className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сумма <span className="text-gray-400">(+ начислить, - списать)</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustAmount((prev) => prev.startsWith('-') ? prev.slice(1) : prev)}
                        className="p-2.5 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                        title="Начислить"
                      >
                        <Plus size={16} className="text-green-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustAmount((prev) => prev.startsWith('-') ? prev : `-${prev}`)}
                        className="p-2.5 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                        title="Списать"
                      >
                        <Minus size={16} className="text-red-600" />
                      </button>
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        required
                        placeholder="100"
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <input
                      type="text"
                      value={adjustDescription}
                      onChange={(e) => setAdjustDescription(e.target.value)}
                      placeholder="Причина корректировки"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={adjusting}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {adjusting && <Loader2 size={14} className="animate-spin" />}
                      Применить
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdjust(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}

              {/* History */}
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">История баллов</h3>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">История пуста</p>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => {
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
