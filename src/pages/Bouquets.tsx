import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface BouquetImage {
  url: string;
}

interface Bouquet {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  isHit: boolean;
  isNew: boolean;
  images: BouquetImage[];
}

const CATEGORIES: Record<string, string> = {
  roses: 'Розы',
  tulips: 'Тюльпаны',
  author: 'Авторские',
  peonies: 'Пионы',
  exotic: 'Экзотика',
  mixed: 'Микс',
  lilies: 'Лилии',
  hydrangea: 'Гортензии',
  greenery: 'Зелень',
};

function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Bouquets() {
  const navigate = useNavigate();
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchBouquets = () => {
    setLoading(true);
    api.get('/bouquets')
      .then((res) => setBouquets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBouquets();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Удалить букет "${name}"?`)) return;
    try {
      await api.delete(`/bouquets/${id}`);
      fetchBouquets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (id: number, field: 'inStock' | 'isHit' | 'isNew', value: boolean) => {
    try {
      await api.patch(`/bouquets/${id}/toggle`, { field, value });
      setBouquets((prev) =>
        prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = bouquets.filter((b) => {
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (search.trim()) {
      return b.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Букеты</h1>
          <span className="text-sm text-gray-400">{filtered.length} из {bouquets.length}</span>
        </div>
        <button
          onClick={() => navigate('/bouquets/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Добавить букет
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="all">Все категории</option>
          {Object.entries(CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {bouquets.length === 0 ? 'Букетов пока нет' : 'Ничего не найдено'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Фото</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Название</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Цена</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Категория</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">В наличии</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Хит</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Новинка</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => {
                  const thumbUrl = b.images?.[0] ? imageUrl(b.images[0].url) : null;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={b.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Нет</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                      <td className="px-4 py-3 text-gray-700">{formatRubles(b.price)}</td>
                      <td className="px-4 py-3 text-gray-600">{CATEGORIES[b.category] || b.category}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(b.id, 'inStock', !b.inStock)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.inStock ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${b.inStock ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(b.id, 'isHit', !b.isHit)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.isHit ? 'bg-orange-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${b.isHit ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(b.id, 'isNew', !b.isNew)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.isNew ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${b.isNew ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/bouquets/${b.id}`)} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Редактировать">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(b.id, b.name)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
