import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Loader2, TrendingUp, ShoppingCart, CreditCard, Percent } from 'lucide-react';
import api from '../api/client';
import { dayLabel, formatRubles } from '../utils/format';
import { statusLabels } from '../utils/orders';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  period: { days: number; orders: number; paidOrders: number; revenue: number; averageCheck: number };
  sources: { source: string; orders: number; revenue: number }[];
  catalog: { total: number; onSale: number };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topBouquets: { name: string; count: number }[];
}

const PERIODS = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
];

const SOURCE_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  max: 'Max',
  web: 'Сайт',
};

const PIE_COLORS = ['#C8421E', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800', '#795548'];

const shortDate = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(day)}.${month}`;
};

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    setError('');
    api
      .get('/analytics', { params: { days } })
      .then(({ data: res }) => { if (!stale) setData(res); })
      .catch(() => { if (!stale) setError('Не удалось загрузить аналитику'); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
        {error || 'Нет данных'}
      </div>
    );
  }

  const { period } = data;
  const conversion = period.orders ? Math.round((period.paidOrders / period.orders) * 100) : 0;

  const summaryCards = [
    {
      label: 'Выручка',
      value: formatRubles(period.revenue),
      hint: 'Оплаченные заказы без отменённых',
      icon: TrendingUp,
      color: 'bg-paper-2 text-vermilion',
    },
    {
      label: 'Оформлено заказов',
      value: String(period.orders),
      hint: `Оплачено: ${period.paidOrders}`,
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Средний чек',
      value: period.averageCheck ? formatRubles(period.averageCheck) : 'нет данных',
      icon: CreditCard,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Доходят до оплаты',
      value: period.orders ? `${conversion}%` : 'нет данных',
      hint: 'Доля оплаченных среди оформленных',
      icon: Percent,
      color: 'bg-green-50 text-green-600',
    },
  ];

  const pieData = data.ordersByStatus.map((item) => ({
    ...item,
    name: statusLabels[item.status] || item.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1" role="group" aria-label="Период">
          {PERIODS.map((option) => (
            <button
              key={option.days}
              onClick={() => setDays(option.days)}
              aria-pressed={days === option.days}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                days === option.days ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-0.5 whitespace-nowrap">{card.value}</p>
                </div>
              </div>
              {card.hint && <p className="text-xs text-gray-500 mt-2">{card.hint}</p>}
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-0">
        <h2 className="text-lg text-gray-900 mb-4">Выручка по дням</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.revenueByDay}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C8421E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#C8421E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" minTickGap={24} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={shortDate} />
            <YAxis width={56} allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
              }}
              labelFormatter={(val) => dayLabel(val)}
              formatter={(value: number) => [formatRubles(value), 'Выручка']}
            />
            <Area type="monotone" dataKey="revenue" stroke="#C8421E" strokeWidth={2} fill="url(#revenueGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sources */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <h2 className="text-lg text-gray-900 px-5 pt-5 pb-3">Откуда покупают</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-y border-gray-200">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">Канал</th>
              <th className="text-right px-5 py-2.5 font-medium text-gray-500">Оплачено</th>
              <th className="text-right px-5 py-2.5 font-medium text-gray-500">Выручка</th>
              <th className="text-right px-5 py-2.5 font-medium text-gray-500">Доля</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.sources.map((source) => (
              <tr key={source.source}>
                <td className="px-5 py-3 font-medium text-gray-800">{SOURCE_LABELS[source.source] || source.source}</td>
                <td className="px-5 py-3 text-right text-gray-700">{source.orders}</td>
                <td className="px-5 py-3 text-right text-gray-700 whitespace-nowrap">{formatRubles(source.revenue)}</td>
                <td className="px-5 py-3 text-right text-gray-500">{period.revenue ? `${Math.round((source.revenue / period.revenue) * 100)}%` : '0%'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">
        За всё время: выручка {formatRubles(data.totalRevenue)}, заказов {data.totalOrders}, клиентов {data.totalCustomers}, на витрине {data.catalog.onSale} букетов из {data.catalog.total}.
      </p>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-0">
            <h2 className="text-lg text-gray-900 mb-4">Заказы по статусам, за всё время</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="name"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Bouquets */}
        {data.topBouquets.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-0">
            <h2 className="text-lg text-gray-900 mb-4">Популярные букеты, за всё время</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topBouquets} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [value, 'Продано']}
                />
                <Bar dataKey="count" fill="#C8421E" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
