import { useState, useEffect, FormEvent } from 'react';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import api from '../api/client';

interface SettingField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea';
  placeholder?: string;
}

const SETTINGS_FIELDS: SettingField[] = [
  { key: 'studio_name', label: 'Название студии', placeholder: 'Rosa Flowers' },
  { key: 'phone', label: 'Телефон', type: 'tel', placeholder: '+7 (999) 123-45-67' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'info@rosaflowers.ru' },
  { key: 'address', label: 'Адрес', placeholder: 'г. Москва, ул. Цветочная, 1' },
  { key: 'work_hours', label: 'Часы работы', placeholder: '09:00 - 21:00' },
  { key: 'delivery_price', label: 'Стоимость доставки', type: 'number', placeholder: '500' },
  { key: 'free_delivery_from', label: 'Бесплатная доставка от', type: 'number', placeholder: '5000' },
  { key: 'min_order', label: 'Минимальный заказ', type: 'number', placeholder: '1000' },
  { key: 'bonus_percent', label: 'Процент бонусов', type: 'number', placeholder: '5' },
  { key: 'max_bonus_discount', label: 'Макс. скидка бонусами (%)', type: 'number', placeholder: '20' },
  { key: 'telegram_channel', label: 'Telegram канал', placeholder: '@rosaflowers' },
  { key: 'instagram', label: 'Instagram', placeholder: '@rosaflowers' },
];

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then(({ data }) => {
        // Handle if data is wrapped in an object
        const settingsObj =
          typeof data === 'object' && !Array.isArray(data)
            ? data.settings || data
            : {};
        setSettings(settingsObj);
      })
      .catch(() => setError('Ошибка загрузки настроек'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Clear success when editing
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await api.put('/settings', settings);
      setSuccess(true);
      // Auto-hide success after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Настройки</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} />
          Настройки успешно сохранены
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
      >
        {SETTINGS_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={settings[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
            ) : (
              <input
                type={field.type || 'text'}
                value={settings[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Сохранить настройки
          </button>
        </div>
      </form>
    </div>
  );
}
