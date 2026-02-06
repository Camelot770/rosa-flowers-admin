import { useState, useEffect, FormEvent } from 'react';
import { Loader2, Trash2, Plus } from 'lucide-react';
import api from '../api/client';

interface ConstructorItem {
  id: string;
  _id?: string;
  name: string;
  price: number;
  inStock?: boolean;
}

interface ConstructorData {
  flowers: ConstructorItem[];
  greenery: ConstructorItem[];
  packaging: ConstructorItem[];
}

type TabKey = 'flowers' | 'greenery' | 'packaging';

const TABS: { key: TabKey; label: string; endpoint: string }[] = [
  { key: 'flowers', label: 'Цветы', endpoint: '/constructor/flowers' },
  { key: 'greenery', label: 'Зелень', endpoint: '/constructor/greenery' },
  { key: 'packaging', label: 'Упаковка', endpoint: '/constructor/packaging' },
];

export default function ConstructorManager() {
  const [activeTab, setActiveTab] = useState<TabKey>('flowers');
  const [data, setData] = useState<ConstructorData>({
    flowers: [],
    greenery: [],
    packaging: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const fetchData = async () => {
    try {
      const { data: res } = await api.get('/constructor');
      setData({
        flowers: res.flowers || [],
        greenery: res.greenery || [],
        packaging: res.packaging || [],
      });
    } catch {
      setError('Ошибка загрузки данных конструктора');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) return;

    const tab = TABS.find((t) => t.key === activeTab)!;
    setSubmitting(true);
    setError('');

    try {
      const { data: created } = await api.post(tab.endpoint, {
        name: newName.trim(),
        price: Number(newPrice),
      });
      setData((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], created],
      }));
      setNewName('');
      setNewPrice('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка добавления');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: ConstructorItem) => {
    if (!window.confirm(`Удалить «${item.name}»?`)) return;

    const tab = TABS.find((t) => t.key === activeTab)!;
    const itemId = item.id || item._id;

    try {
      await api.delete(`${tab.endpoint}/${itemId}`);
      setData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(
          (i) => (i.id || i._id) !== itemId
        ),
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  const handleToggleStock = async (item: ConstructorItem) => {
    const tab = TABS.find((t) => t.key === activeTab)!;
    const itemId = item.id || item._id;
    const newVal = !item.inStock;

    try {
      await api.put(`${tab.endpoint}/${itemId}`, { inStock: newVal });
      setData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].map((i) =>
          (i.id || i._id) === itemId ? { ...i, inStock: newVal } : i
        ),
      }));
    } catch {
      // silently fail, could show error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const items = data[activeTab];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Конструктор букетов</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-end gap-4"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="Введите название"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена</label>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            required
            min="1"
            placeholder="0"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Добавить
        </button>
      </form>

      {/* Items List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Нет элементов. Добавьте первый выше.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Название
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Цена
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  В наличии
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const itemId = item.id || item._id;
                return (
                  <tr key={itemId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.price} &#8381;
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleStock(item)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          item.inStock !== false ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            item.inStock !== false ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
