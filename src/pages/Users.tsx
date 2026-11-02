import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search, X, Package, Star, MapPin, Calendar, Download, Wallet, Phone } from 'lucide-react';
import api from '../api/client';
import { getPlatform } from '../utils/platform';
import { formatAddress } from '../utils/address';
import { downloadCsv } from '../utils/csv';
import { dayLabel, formatRubles, plural, studioDate, telHref } from '../utils/format';
import { statusColors, statusLabels } from '../utils/orders';
import { useToast } from '../components/Toast';
import MessageForm from '../components/MessageForm';

interface UserItem {
  id: number;
  telegramId?: string | null;
  maxId?: string | null;
  platform?: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  orderPhone?: string | null;
  bonusPoints: number;
  ordersCount: number;
  paidOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

interface UserOrder {
  id: number;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
  deliveryDate?: string | null;
  recipientPhone?: string | null;
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

const displayName = (user: Pick<UserItem, 'firstName' | 'lastName'>) => (
  [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Без имени'
);

const SORTS: Record<string, { label: string; compare: (a: UserItem, b: UserItem) => number }> = {
  recent: { label: 'Сначала новые', compare: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  spent: { label: 'По сумме покупок', compare: (a, b) => b.totalSpent - a.totalSpent },
  orders: { label: 'По числу заказов', compare: (a, b) => b.ordersCount - a.ordersCount },
  bonus: { label: 'По бонусам', compare: (a, b) => b.bonusPoints - a.bonusPoints },
  last: { label: 'По последнему заказу', compare: (a, b) => (b.lastOrderAt || '').localeCompare(a.lastOrderAt || '') },
};

const FILTERS: { key: string; label: string; match: (user: UserItem) => boolean }[] = [
  { key: 'all', label: 'Все', match: () => true },
  { key: 'orders', label: 'С заказами', match: (user) => user.ordersCount > 0 },
  { key: 'buyers', label: 'Покупатели', match: (user) => user.paidOrders > 0 },
  { key: 'telegram', label: 'Telegram', match: (user) => !!user.telegramId },
  { key: 'max', label: 'Max', match: (user) => !user.telegramId && !!user.maxId },
  { key: 'web', label: 'Сайт', match: (user) => !user.telegramId && !user.maxId },
];

function BonusForm({ userId, onDone }: { userId: number; onDone: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/loyalty/${userId}/adjust`, {
        amount: Number(amount),
        description: description.trim() || undefined,
      });
      setAmount('');
      setDescription('');
      toast('Бонусы изменены');
      onDone();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось изменить бонусы', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 mb-3">
      <input
        type="number"
        step="1"
        required
        aria-label="Сколько бонусов начислить или списать"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="+100 или -50"
        className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={200}
        placeholder="За что (необязательно)"
        className="flex-1 min-w-[10rem] px-3 py-2 text-sm border border-gray-300 rounded-lg"
      />
      <button disabled={saving || !amount} className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
        Применить
      </button>
    </form>
  );
}

function UserDrawer({ userId, onClose, onChanged }: { userId: number; onClose: () => void; onChanged: () => void }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'orders' | 'bonus' | 'addresses'>('orders');

  const load = useCallback(() => {
    api.get(`/users/${userId}`)
      .then(({ data }) => setUser(data))
      .catch((err) => setError(err.response?.status === 404 ? 'Такого клиента нет' : 'Не удалось загрузить клиента'));
  }, [userId]);

  useEffect(() => {
    setUser(null);
    setError('');
    setTab('orders');
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const platform = user ? getPlatform(user) : null;
  const orderPhone = user?.orders?.find((order) => order.recipientPhone)?.recipientPhone;

  return (
    <div>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <aside role="dialog" aria-label="Карточка клиента" className="fixed inset-y-0 right-0 z-50 w-full md:max-w-xl bg-white shadow-xl flex flex-col">
        <header className="flex items-start gap-2 px-4 py-3 border-b border-gray-100">
          <button onClick={onClose} aria-label="Закрыть" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
          {user && (
            <div className="min-w-0">
              <h2 className="text-lg text-gray-900">{displayName(user)}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-sm">
                {platform && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platform.strong}`}>{platform.full}</span>}
                {user.username && user.telegramId && (
                  <a href={`https://t.me/${user.username}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">@{user.username}</a>
                )}
                {user.username && !user.telegramId && <span className="text-gray-500">@{user.username}</span>}
                {user.phone && (
                  <a href={telHref(user.phone)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <Phone size={13} />{user.phone}
                  </a>
                )}
                {!user.phone && orderPhone && (
                  <a href={telHref(orderPhone)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <Phone size={13} />{orderPhone}
                    <span className="font-normal text-xs text-gray-500">из заказа</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </header>

        {!user ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 p-6 text-center">
            {error || <Loader2 className="w-8 h-8 animate-spin text-primary" />}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Package size={12} /> Заказов</p>
                <p className="font-semibold text-gray-800">{user.ordersCount}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Wallet size={12} /> Покупки</p>
                <p className="font-semibold text-gray-800 whitespace-nowrap">{formatRubles(user.totalSpent)}</p>
              </div>
              <div className="p-2.5 bg-paper-2 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Star size={12} /> Бонусы</p>
                <p className="font-semibold text-primary">{user.bonusPoints}</p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> С нами с</p>
                <p className="font-semibold text-gray-800 text-sm">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>

            <div className="px-4 pb-4">
              {user.telegramId || user.maxId ? (
                <MessageForm userId={user.id} />
              ) : (
                <p className="text-xs text-gray-500">Клиент оформлял заказ на сайте, бот ему написать не может. Связаться можно по телефону.</p>
              )}
            </div>

            <div className="flex border-y border-gray-100 px-4">
              {([['orders', 'Заказы'], ['bonus', 'Бонусы'], ['addresses', 'Адреса']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === 'orders' && (
                <div className="space-y-2">
                  {(!user.orders || user.orders.length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-4">Заказов нет</p>
                  ) : user.orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders?view=all&sort=newest&order=${order.id}`}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">Заказ #{order.id}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.deliveryDate ? `Доставка: ${dayLabel(order.deliveryDate)}` : new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{formatRubles(order.totalPrice)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {tab === 'bonus' && (
                <div>
                  <BonusForm userId={user.id} onDone={() => { load(); onChanged(); }} />
                  <div className="space-y-2">
                    {(!user.loyaltyHistory || user.loyaltyHistory.length === 0) ? (
                      <p className="text-sm text-gray-500 text-center py-4">История пуста</p>
                    ) : user.loyaltyHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-700">{entry.description || 'Корректировка'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(entry.createdAt).toLocaleDateString('ru-RU', {
                              day: 'numeric', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold ${entry.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'addresses' && (
                <div className="space-y-2">
                  {(!user.addresses || user.addresses.length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-4">Нет сохранённых адресов</p>
                  ) : user.addresses.map((addr) => (
                    <div key={addr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin size={16} className="text-gray-400 shrink-0" />
                      <p className="text-sm text-gray-700">{formatAddress(addr)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

const PAGE_SIZE = 50;

export default function Users() {
  const [params, setParams] = useSearchParams();
  const openId = parseInt(params.get('user') || '') || null;
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(() => (
    api.get('/users')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setError('Не удалось загрузить клиентов'))
      .finally(() => setLoading(false))
  ), []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, filter, sort]);

  const openUser = (id: number) => {
    const next = new URLSearchParams(params);
    next.set('user', String(id));
    setParams(next);
  };

  const closeUser = useCallback(() => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('user');
      return next;
    }, { replace: true });
  }, [setParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const match = FILTERS.find((f) => f.key === filter)?.match || (() => true);
    return users
      .filter((u) => {
        if (!match(u)) return false;
        if (!q) return true;
        const phones = [u.phone, u.orderPhone].map((phone) => (phone || '').replace(/\D/g, ''));
        return (
          displayName(u).toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (digits.length >= 3 && phones.some((phone) => phone.includes(digits))) ||
          (u.telegramId || '').includes(q) ||
          (u.maxId || '').includes(q)
        );
      })
      .sort(SORTS[sort].compare);
  }, [users, search, filter, sort]);

  const exportCsv = () => {
    downloadCsv(
      `Клиенты ${studioDate()}.csv`,
      ['Имя', 'Username', 'Телефон', 'Телефон из заказа', 'Откуда', 'Заказов', 'Оплачено заказов', 'Сумма покупок', 'Бонусы', 'Последний заказ', 'Дата регистрации'],
      filtered.map((u) => [
        displayName(u),
        u.username,
        u.phone,
        u.orderPhone,
        getPlatform(u).tag,
        u.ordersCount,
        u.paidOrders,
        u.totalSpent,
        u.bonusPoints,
        u.lastOrderAt ? new Date(u.lastOrderAt).toLocaleDateString('ru-RU') : '',
        new Date(u.createdAt).toLocaleDateString('ru-RU'),
      ]),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Клиенты</h1>
          <span className="text-sm text-gray-500">{filtered.length} из {users.length}</span>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          title="Скачать таблицу для Excel"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <Download size={15} />
          Excel
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FILTERS.map(({ key, label, match }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              filter === key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label} <span className={filter === key ? 'text-white/70' : 'text-gray-400'}>{users.filter(match).length}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Имя, username, телефон"
            className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Очистить поиск" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          aria-label="Порядок"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          {search || filter !== 'all' ? 'Ничего не найдено' : 'Клиентов пока нет'}
        </div>
      ) : (
        <>
          {/* Table for a wide screen */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Клиент</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Телефон</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Заказы</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Покупки</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Бонусы</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Последний заказ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((user) => {
                  const platform = getPlatform(user);
                  const phone = user.phone || user.orderPhone;
                  return (
                    <tr key={user.id} onClick={() => openUser(user.id)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{displayName(user)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${platform.soft}`}>{platform.tag}</span>
                        </div>
                        {user.username && <div className="text-xs text-gray-500">@{user.username}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {phone ? (
                          <a href={telHref(phone)} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline whitespace-nowrap">{phone}</a>
                        ) : <span className="text-gray-400">нет</span>}
                        {!user.phone && user.orderPhone && <div className="text-xs text-gray-500">из заказа</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">{user.ordersCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">{user.totalSpent ? formatRubles(user.totalSpent) : '0'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{user.bonusPoints}</td>
                      <td className="px-4 py-3 text-gray-500">{user.lastOrderAt ? new Date(user.lastOrderAt).toLocaleDateString('ru-RU') : 'нет'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards for a phone */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {shown.map((user) => {
              const platform = getPlatform(user);
              const phone = user.phone || user.orderPhone;
              return (
                <article key={user.id} onClick={() => openUser(user.id)} className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 truncate">{displayName(user)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${platform.soft}`}>{platform.tag}</span>
                    {user.bonusPoints > 0 && <span className="ml-auto text-xs font-semibold text-primary shrink-0">{user.bonusPoints} б.</span>}
                  </div>
                  {phone && (
                    <a href={telHref(phone)} onClick={(e) => e.stopPropagation()} className="inline-block mt-1 text-sm text-primary">
                      {phone}{!user.phone && <span className="text-xs text-gray-500"> из заказа</span>}
                    </a>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {user.ordersCount
                      ? `${user.ordersCount} ${plural(user.ordersCount, 'заказ', 'заказа', 'заказов')}, покупок на ${formatRubles(user.totalSpent)}`
                      : 'Заказов нет'}
                  </p>
                </article>
              );
            })}
          </div>

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((current) => current + PAGE_SIZE)}
              className="w-full py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Показать ещё, осталось {filtered.length - visible}
            </button>
          )}
        </>
      )}

      {openId && <UserDrawer userId={openId} onClose={closeUser} onChanged={fetchUsers} />}
    </div>
  );
}
