import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  ShoppingCart, CalendarDays, CalendarRange, Users,
  DollarSign, TrendingUp, Package, Crown, Bell, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface RecentOrder {
  id: number;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  customerName: string;
  createdAt: string;
}

interface Analytics {
  totalOrders: number;
  todayOrders: number;
  monthOrders: number;
  totalUsers: number;
  totalRevenue: number;
  monthRevenue: number;
  revenueByDay: { date: string; revenue: number }[];
  topBouquets: { name: string; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  recentOrders: RecentOrder[];
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
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-12">Не удалось загрузить аналитику</div>;
  }

  const newOrdersCount = data.ordersByStatus.find((s) => s.status === 'new')?.count || 0;

  const statCards = [
    { label: 'Всего заказов', value: data.totalOrders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', link: '/orders' },
    { label: 'Заказы сегодня', value: data.todayOrders, icon: CalendarDays, color: 'text-green-600', bg: 'bg-green-50', link: '/orders' },
    { label: 'Заказы за месяц', value: data.monthOrders, icon: CalendarRange, color: 'text-purple-600', bg: 'bg-purple-50', link: '/orders' },
    { label: 'Пользователи', value: data.totalUsers, icon: Users, color: 'text-pink-600', bg: 'bg-pink-50', link: '/users' },
    { label: 'Общая выручка', value: formatRubles(data.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/analytics' },
    { label: 'Выручка за месяц', value: formatRubles(data.monthRevenue), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', link: '/analytics' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Дашборд</h1>

      {/* New Orders Alert */}
      {newOrdersCount > 0 && (
        <button
          onClick={() => navigate('/orders')}
          className="w-full flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0">
            <Bell size={18} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-800">
              {newOrdersCount} {newOrdersCount === 1 ? 'новый заказ' : newOrdersCount < 5 ? 'новых заказа' : 'новых заказов'}
            </p>
            <p className="text-sm text-blue-600">Требуют подтверждения</p>
          </div>
          <ChevronRight size={18} className="text-blue-400" />
        </button>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => navigate(card.link)}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon size={22} className={card.color} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Выручка по дням</h2>
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
              tick={{ fontSize: 12 }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => [formatRubles(value), 'Выручка']}
              labelFormatter={(label) => new Date(label).toLocaleDateString('ru-RU')}
            />
            <Area type="monotone" dataKey="revenue" stroke="#E91E63" strokeWidth={2} fill="url(#revenueGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Последние заказы
            </h2>
            <button onClick={() => navigate('/orders')} className="text-sm text-primary font-medium hover:underline">
              Все
            </button>
          </div>
          <div className="space-y-3">
            {(data.recentOrders || []).map((order) => (
              <button
                key={order.id}
                onClick={() => navigate('/orders')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">#{order.id} {order.customerName}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{formatRubles(order.totalPrice)}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </button>
            ))}
            {(!data.recentOrders || data.recentOrders.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Нет заказов</p>
            )}
          </div>
        </div>

        {/* Top Bouquets */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Crown size={18} className="text-primary" />
            Топ букетов
          </h2>
          <div className="space-y-3">
            {data.topBouquets.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">{item.count} шт.</span>
              </div>
            ))}
            {data.topBouquets.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
            )}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Заказы по статусам
          </h2>
          <div className="space-y-3">
            {data.ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[item.status] || item.status}
                </span>
                <span className="text-sm font-medium text-gray-700">{item.count}</span>
              </div>
            ))}
            {data.ordersByStatus.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
