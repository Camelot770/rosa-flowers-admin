import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Flower2, Package, Star,
  BarChart3, Settings, LogOut, Users, Send, Menu, ExternalLink,
} from 'lucide-react';
import { useOrderSummary } from '../OrderSummary';

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Сегодня' },
  { path: '/orders', icon: Package, label: 'Заказы' },
  { path: '/bouquets', icon: Flower2, label: 'Букеты' },
  { path: '/users', icon: Users, label: 'Клиенты' },
  { path: '/loyalty', icon: Star, label: 'Лояльность' },
  { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { path: '/broadcast', icon: Send, label: 'Рассылка' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

const bottomItems = menuItems.slice(0, 4);

const isActive = (pathname: string, path: string) => (
  pathname === path || (path !== '/' && pathname.startsWith(path))
);

function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Sidebar({ open, onOpen, onClose, onLogout }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { summary } = useOrderSummary();
  const ordersCount = summary?.toStart || 0;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden print:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 md:z-auto w-64 bg-white border-r border-gray-200 flex flex-col transition-transform md:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            🌹 Роза цветов
          </h1>
          <p className="text-xs text-gray-400 mt-1">Панель управления</p>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(location.pathname, item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.path === '/orders' && <CountBadge count={ordersCount} />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <a
            href="https://rosa-web.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={18} />
            Открыть сайт
          </a>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </aside>

      {/* The everyday pages stay under the thumb on a phone, the rest is under "Ещё" */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 grid grid-cols-5 print:hidden pb-[env(safe-area-inset-bottom)]">
        {bottomItems.map((item) => {
          const active = isActive(location.pathname, item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-primary' : 'text-gray-500'}`}
            >
              <Icon size={20} />
              {item.label}
              {item.path === '/orders' && <CountBadge count={ordersCount} className="absolute top-1 left-1/2 ml-1.5" />}
            </button>
          );
        })}
        <button onClick={onOpen} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-gray-500">
          <Menu size={20} />
          Ещё
        </button>
      </nav>
    </>
  );
}
