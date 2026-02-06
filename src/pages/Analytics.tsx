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
import { Loader2, TrendingUp, ShoppingCart, Package, Users } from 'lucide-react';
import api from '../api/client';

interface AnalyticsData {
  totalRevenue?: number;
  totalOrders?: number;
  totalBouquets?: number;
  totalCustomers?: number;
  revenueByDay: { date: string; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  topBouquets: { name: string; count: number }[];
}

const PIE_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800', '#795548'];

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтвержден',
  preparing: 'Готовится',
  delivering: 'Доставляется',
  completed: 'Завершен',
  canceled: 'Отменен',
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/analytics')
      .then(({ data: res }) => setData(res))
      .catch(() => setError('Ошибка загрузки аналитики'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
        {error || 'Нет данных'}
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Выручка',
      value: `${(data.totalRevenue || 0).toLocaleString('ru-RU')} \u20BD`,
      icon: TrendingUp,
      color: 'bg-pink-50 text-pink-600',
    },
    {
      label: 'Заказы',
      value: String(data.totalOrders || 0),
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Букеты',
      value: String(data.totalBouquets || 0),
      icon: Package,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Клиенты',
      value: String(data.totalCustomers || 0),
      icon: Users,
      color: 'bg-green-50 text-green-600',
    },
  ];

  const pieData = data.ordersByStatus.map((item) => ({
    ...item,
    name: STATUS_LABELS[item.status] || item.status,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      {data.revenueByDay.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Выручка по дням</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.revenueByDay}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E91E63" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E91E63" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
                }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                }}
                labelFormatter={(val) =>
                  new Date(val).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                  })
                }
                formatter={(value: number) => [`${value.toLocaleString('ru-RU')} \u20BD`, 'Выручка']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#E91E63"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Заказы по статусам</h2>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Популярные букеты</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topBouquets} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} />
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
                  formatter={(value: number) => [value, 'Продаж']}
                />
                <Bar dataKey="count" fill="#E91E63" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
