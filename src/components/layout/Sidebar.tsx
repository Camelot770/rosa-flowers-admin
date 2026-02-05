import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Flower2, Palette, Package, Star,
  BarChart3, Settings, LogOut,
} from 'lucide-react';

interface Props {
  onLogout: () => void;
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { path: '/bouquets', icon: Flower2, label: 'Букеты' },
  { path: '/constructor', icon: Palette, label: 'Конструктор' },
  { path: '/orders', icon: Package, label: 'Заказы' },
  { path: '/loyalty', icon: Star, label: 'Лояльность' },
  { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

export default function Sidebar({ onLogout }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          🌹 Роза цветов
        </h1>
        <p className="text-xs text-gray-400 mt-1">Панель управления</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
