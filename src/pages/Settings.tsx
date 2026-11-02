import { useState, useEffect, FormEvent } from 'react';
import { Loader2, Save, CheckCircle, Building2, Truck, Star, Share2, KeyRound } from 'lucide-react';
import api from '../api/client';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { useToast } from '../components/Toast';

interface SettingField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea';
  placeholder?: string;
  hint?: string;
  max?: number;
}

interface SettingSection {
  title: string;
  icon: typeof Building2;
  color: string;
  bg: string;
  fields: SettingField[];
}

const SECTIONS: SettingSection[] = [
  {
    title: 'Бизнес',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    fields: [
      { key: 'studio_name', label: 'Название студии', placeholder: 'Роза цветов' },
      { key: 'phone', label: 'Телефон', type: 'tel', placeholder: '+7 (917) 876-59-58', hint: 'Клиенты видят его в приложении и звонят на него' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'rozacvetov@list.ru' },
      { key: 'address', label: 'Адрес', placeholder: 'д. Званка, ул. Приозёрная, д. 58' },
      { key: 'work_hours', label: 'Часы работы', placeholder: '09:00 – 21:00' },
    ],
  },
  {
    title: 'Доставка',
    icon: Truck,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    fields: [
      { key: 'delivery_price', label: 'Стоимость доставки (₽)', type: 'number', placeholder: '300', hint: 'Прибавляется к заказу, если он меньше суммы бесплатной доставки' },
      { key: 'free_delivery_from', label: 'Бесплатная доставка от (₽)', type: 'number', placeholder: '3000', hint: 'Заказ от этой суммы доставляется бесплатно' },
      { key: 'min_order', label: 'Минимальный заказ (₽)', type: 'number', placeholder: '1000', hint: 'Заказ меньше этой суммы оформить нельзя' },
    ],
  },
  {
    title: 'Программа лояльности',
    icon: Star,
    color: 'text-primary',
    bg: 'bg-paper-2',
    fields: [
      { key: 'bonus_percent', label: 'Процент кэшбэка (%)', type: 'number', placeholder: '5', max: 100, hint: 'Сколько бонусов клиент получает с оплаченного заказа' },
      { key: 'max_bonus_discount', label: 'Макс. скидка бонусами (%)', type: 'number', placeholder: '20', max: 100, hint: 'Какую часть заказа можно оплатить бонусами' },
    ],
  },
  {
    title: 'Соц. сети',
    icon: Share2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    fields: [
      { key: 'telegram_channel', label: 'Telegram канал', placeholder: '@rozacvetov' },
      { key: 'max_channel', label: 'Канал в Max (полная ссылка)', placeholder: 'https://max.ru/...' },
      { key: 'instagram', label: 'Instagram', placeholder: '@rozacvetov' },
    ],
  },
];

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then(({ data }) => {
        const settingsObj =
          typeof data === 'object' && !Array.isArray(data) ? data : {};
        setSettings(settingsObj);
      })
      .catch(() => setError('Ошибка загрузки настроек'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.put('/settings', settings);
      setDirty(false);
      toast('Настройки сохранены');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Ошибка сохранения настроек');
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Настройки</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}>
                  <Icon size={16} className={section.color} />
                </div>
                <h2 className="text-base font-semibold text-gray-800">{section.title}</h2>
              </div>

              {/* Fields */}
              <div className="p-6 space-y-4">
                {section.fields.map((field) => (
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
                        min={field.type === 'number' ? 0 : undefined}
                        max={field.max}
                        step={field.type === 'number' ? 1 : undefined}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      />
                    )}
                    {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Save Button */}
        <div className="sticky bottom-14 md:bottom-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-paper/95 flex items-center justify-end gap-3">
          {dirty && <span className="text-xs text-gray-500">Есть несохранённые изменения</span>}
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

      {/* Password */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-paper-2 flex items-center justify-center">
            <KeyRound size={16} className="text-primary" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Смена пароля</h2>
        </div>

        <div className="p-6">
          {passwordChanged && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle size={16} />
              Пароль изменён
            </div>
          )}
          <ChangePasswordForm onChanged={() => setPasswordChanged(true)} />
        </div>
      </div>
    </div>
  );
}
