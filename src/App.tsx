import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import api from './api/client';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Bouquets from './pages/Bouquets';
import BouquetForm from './pages/BouquetForm';
import Users from './pages/Users';
import Orders from './pages/Orders';
import Loyalty from './pages/Loyalty';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Broadcast from './pages/Broadcast';
import Sidebar from './components/layout/Sidebar';

function ServerDown({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Сервер не отвечает</h1>
        <p className="text-gray-500 text-sm mt-2 mb-6">
          Вы остаётесь в системе, заново входить не нужно. Попробуйте ещё раз через минуту.
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [serverDown, setServerDown] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('rosa_admin_token');
    if (!token) {
      setIsAuth(false);
      return;
    }
    setServerDown(false);
    api.get('/auth/me')
      .then(({ data }) => {
        setMustChangePassword(data?.mustChangePassword === true);
        setIsAuth(true);
      })
      .catch((err) => {
        // Only a 401 means the token is bad; an outage must not log the admin out
        if (err.response?.status === 401) {
          localStorage.removeItem('rosa_admin_token');
          setIsAuth(false);
        } else {
          setServerDown(true);
        }
      });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = () => {
    localStorage.removeItem('rosa_admin_token');
    setMustChangePassword(false);
    setIsAuth(false);
  };

  if (serverDown) {
    return <ServerDown onRetry={checkAuth} />;
  }

  if (isAuth === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuth) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <Login
              onLogin={(mustChange) => {
                setMustChangePassword(mustChange);
                setIsAuth(true);
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  if (mustChangePassword) {
    return <ChangePassword onChanged={() => setMustChangePassword(false)} onLogout={handleLogout} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />
      <div className="flex-1 min-w-0 md:ml-64">
        {/* On phones the sidebar is hidden and opens from here */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-bold text-primary">🌹 Роза цветов</span>
        </header>
        <main className="p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bouquets" element={<Bouquets />} />
            <Route path="/bouquets/new" element={<BouquetForm />} />
            <Route path="/bouquets/:id" element={<BouquetForm />} />
            <Route path="/users" element={<Users />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/loyalty" element={<Loyalty />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/broadcast" element={<Broadcast />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
