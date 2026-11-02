import { useState, FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api/client';

const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

interface Props {
  onChanged: () => void;
}

function passwordErrorMessage(err: any): string {
  const status = err.response?.status;
  if (status === 401) return 'Неверный текущий пароль';
  if (status === 404) return 'Смена пароля заработает после обновления сервера. Попробуйте позже.';
  if (!err.response || status >= 500) return 'Сервер недоступен. Пароль не изменён, попробуйте позже.';
  return err.response.data?.error || 'Не удалось сменить пароль';
}

export default function ChangePasswordForm({ onChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
      return;
    }
    if (newPassword !== repeatPassword) {
      setError('Новые пароли не совпадают');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Новый пароль должен отличаться от текущего');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put('/auth/password', { currentPassword, newPassword });
      // The old token stops working after the change
      if (data?.token) localStorage.setItem('rosa_admin_token', data.token);
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      onChanged();
    } catch (err: any) {
      // A dead session is also a 401 here, but its message is about the token
      if (err.response?.status === 401 && /token/i.test(err.response.data?.error || '')) {
        localStorage.removeItem('rosa_admin_token');
        window.location.href = '/login';
        return;
      }
      setError(passwordErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Текущий пароль</label>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Новый пароль <span className="text-gray-400">(минимум {MIN_PASSWORD_LENGTH} символов)</span>
        </label>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Повторите новый пароль</label>
        <input
          type="password"
          autoComplete="new-password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Сменить пароль
        </button>
      </div>
    </form>
  );
}
