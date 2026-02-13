import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './api/client';
import Login from './pages/Login';
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

function App() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('rosa_admin_token');
    if (!token) {
      setIsAuth(false);
      return;
    }
    api.get('/auth/me')
      .then(() => setIsAuth(true))
      .catch(() => {
        localStorage.removeItem('rosa_admin_token');
        setIsAuth(false);
      });
  }, []);

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
        <Route path="/login" element={<Login onLogin={() => setIsAuth(true)} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar onLogout={() => {
        localStorage.removeItem('rosa_admin_token');
        setIsAuth(false);
      }} />
      <main className="flex-1 p-6 ml-64 overflow-auto">
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
  );
}

export default App;
