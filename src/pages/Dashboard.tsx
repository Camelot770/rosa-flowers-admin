import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  AlertTriangle, CalendarClock, ChevronRight, Clock, Crown, CreditCard, Flame, MapPin, Package, Store, Truck,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { dayLabel, formatRubles, plural, studioDate } from '../utils/format';
import { Order, isOverdue, plainAddress, statusColors, statusLabel, statusLabels } from '../utils/orders';
import { useOrderSummary } from '../components/OrderSummary';

interface RecentOrder {
  id: number;
  status: string;
  totalPrice: number;
  customerName: string;
  createdAt: string;
}

interface Analytics {
  totalUsers: number;
  todayRevenue: number;
  monthRevenue: number;
  monthPaidOrders: number;
  period: { averageCheck: number };
  catalog: {
    total: number;
    onSale: number;
    noPhoto: number;
    featured: { id: number; name: string; available: boolean } | null;
  };
  revenueByDay: { date: string; revenue: number }[];
  topBouquets: { name: string; count: number }[];
  recentOrders: RecentOrder[];
}

const shortDate = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(day)}.${month}`;
};

function Tile({ to, label, value, hint, icon, tone = 'default' }: {
  to: string;
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  tone?: 'default' | 'alert';
}) {
  const alert = tone === 'alert';
  return (
    <Link
      to={to}
      className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
        alert ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-200 hover:border-primary/30'
      }`}
    >
      <div className={`flex items-center gap-2 text-sm ${alert ? 'text-white/90' : 'text-gray-500'}`}>
        {icon}
        {label}
      </div>
      <p className={`text-3xl font-semibold mt-1 ${alert ? 'text-white' : 'text-gray-800'}`}>{value}</p>
      {hint && <p className={`text-xs mt-0.5 ${alert ? 'text-white/80' : 'text-gray-500'}`}>{hint}</p>}
    </Link>
  );
}

function Metric({ label, value, className = '' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800 mt-0.5 whitespace-nowrap">{value}</p>
    </div>
  );
}

function DeliveryRow({ order }: { order: Order }) {
  const overdue = isOverdue(order);
  const pill = statusColors[order.status] || 'bg-gray-100 text-gray-600';
  return (
    <Link
      to={`/orders?order=${order.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className={`w-[5.5rem] shrink-0 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
        <div className="flex items-center gap-1">
          {order.deliveryType === 'pickup' ? <Store size={13} className="text-gray-400" /> : <Truck size={13} className="text-gray-400" />}
          {overdue ? dayLabel(order.deliveryDate) : order.deliveryTime?.split('—')[0].trim() || 'Без времени'}
        </div>
        {overdue && order.deliveryTime && <div className="text-xs">{order.deliveryTime.split('—')[0].trim()}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          #{order.id} {order.items.map((item) => item.name).join(', ')}
        </p>
        <p className="text-xs text-gray-500 flex items-start gap-1">
          {order.address ? <><MapPin size={11} className="shrink-0 mt-0.5" /><span className="line-clamp-2">{plainAddress(order.address)}</span></> : 'Самовывоз'}
        </p>
        <span className={`sm:hidden inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${pill}`}>{statusLabel(order)}</span>
      </div>
      <span className={`hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${pill}`}>
        {statusLabel(order)}
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const { summary } = useOrderSummary();
  const [data, setData] = useState<Analytics | null>(null);
  const [active, setActive] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics')
      .then((res) => setData(res.data))
      .catch(() => setError('Не удалось загрузить цифры'))
      .finally(() => setLoading(false));
  }, []);

  // The counters update on their own, the list follows them
  useEffect(() => {
    api.get('/orders', { params: { status: 'active' } })
      .then((res) => setActive(res.data))
      .catch(() => setError('Не удалось загрузить заказы'));
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const byTime = (a: Order, b: Order) => (parseInt(a.deliveryTime || '') || 99) - (parseInt(b.deliveryTime || '') || 99);
  const overdue = active.filter(isOverdue).sort((a, b) => (a.deliveryDate! < b.deliveryDate! ? -1 : 1));
  const today = active.filter((order) => order.deliveryDate === studioDate()).sort(byTime);
  const featured = data?.catalog.featured;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Сегодня</h1>
        <span className="text-sm text-gray-500">
          {new Date(`${studioDate()}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
        </span>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          to="/orders"
          label="В работе"
          value={summary?.active ?? '...'}
          hint={summary?.toStart ? `не начато: ${summary.toStart}` : undefined}
          icon={<Package size={15} />}
        />
        <Tile
          to="/orders?date=today"
          label="Доставки сегодня"
          value={summary?.deliveriesToday ?? '...'}
          hint={summary?.deliveriesTomorrow ? `завтра: ${summary.deliveriesTomorrow}` : undefined}
          icon={<CalendarClock size={15} />}
        />
        <Tile
          to="/orders?date=overdue"
          label="Просрочены"
          value={summary?.overdue ?? '...'}
          icon={<Flame size={15} />}
          tone={summary?.overdue ? 'alert' : 'default'}
        />
        <Tile
          to="/orders?view=new"
          label="Ждут оплаты"
          value={summary?.awaitingPayment ?? '...'}
          icon={<CreditCard size={15} />}
        />
      </div>

      {featured && !featured.available && (
        <Link to={`/bouquets/${featured.id}`} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg hover:bg-amber-100 transition-colors">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          Букет на обложке «{featured.name}» не в наличии, клиенты видят на обложке другой.
        </Link>
      )}
      {!!data?.catalog.noPhoto && (
        <Link to="/bouquets?filter=nophoto" className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg hover:bg-amber-100 transition-colors">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {plural(data.catalog.noPhoto, 'Букет', 'Букета', 'Букетов')} без фото: {data.catalog.noPhoto}. Откройте список, чтобы добавить.
        </Link>
      )}

      {/* What has to happen today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {overdue.length > 0 && (
          <section className="bg-white rounded-xl border border-red-200 overflow-hidden lg:col-span-2">
            <h2 className="px-4 py-3 text-base text-red-600 border-b border-red-100 flex items-center gap-2">
              <Flame size={16} />
              Просроченные доставки
            </h2>
            <div className="divide-y divide-gray-100">
              {overdue.map((order) => <DeliveryRow key={order.id} order={order} />)}
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <h2 className="text-base text-gray-800 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Доставки сегодня
            </h2>
            {!!summary?.deliveriesTomorrow && (
              <Link to="/orders?date=tomorrow" className="text-xs font-medium text-primary hover:underline flex items-center">
                Завтра: {summary.deliveriesTomorrow} <ChevronRight size={14} />
              </Link>
            )}
          </div>
          {today.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">На сегодня доставок нет</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {today.map((order) => <DeliveryRow key={order.id} order={order} />)}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base text-gray-800 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              Последние заказы
            </h2>
            <Link to="/orders?view=all&sort=newest" className="text-xs font-medium text-primary hover:underline">Все</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(data?.recentOrders || []).map((order) => (
              <Link
                key={order.id}
                to={`/orders?view=all&sort=newest&order=${order.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">#{order.id} {order.customerName}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{formatRubles(order.totalPrice)}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </Link>
            ))}
            {(!data?.recentOrders || data.recentOrders.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-8">Заказов пока нет</p>
            )}
          </div>
        </section>
      </div>

      {data && (
        <>
          {/* Money */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Metric label="Выручка сегодня" value={formatRubles(data.todayRevenue)} />
            <Metric label="Выручка за месяц" value={formatRubles(data.monthRevenue)} />
            <Metric label="Оплачено за месяц" value={data.monthPaidOrders} />
            <Metric label="Средний чек, 30 дней" value={data.period.averageCheck ? formatRubles(data.period.averageCheck) : 'нет данных'} />
            <Metric label="Клиенты" value={data.totalUsers} className="col-span-2 lg:col-span-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base text-gray-800">Выручка за 30 дней</h2>
                <Link to="/analytics" className="text-xs font-medium text-primary hover:underline">Аналитика</Link>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.revenueByDay}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8421E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C8421E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} tickFormatter={shortDate} />
                  <YAxis tick={{ fontSize: 12 }} width={44} allowDecimals={false} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)} />
                  <Tooltip
                    formatter={(value: number) => [formatRubles(value), 'Выручка']}
                    labelFormatter={(label) => dayLabel(label)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#C8421E" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-base text-gray-800 mb-3 flex items-center gap-2">
                <Crown size={16} className="text-primary" />
                Что покупают
              </h2>
              <div className="space-y-2.5">
                {data.topBouquets.slice(0, 6).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 shrink-0">{item.count} шт.</span>
                  </div>
                ))}
                {data.topBouquets.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Оплаченных заказов пока нет</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
