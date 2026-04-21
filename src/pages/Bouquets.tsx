import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  customOrder: boolean;
  images: BouquetImage[];
}

const CATEGORIES: Record<string, string> = {
  stabilized: 'Стабилизированные',
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
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchBouquets = () => {
    setLoading(true);
    setError('');
    api.get('/bouquets')
      .then((res) => setBouquets(res.data))
      .catch(() => setError('Не удалось загрузить букеты'))
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
    } catch {
      setError('Не удалось удалить букет');
    }
  };

  const handleToggle = async (id: number, field: 'inStock' | 'isHit' | 'isNew' | 'customOrder', value: boolean) => {
    try {
      await api.patch(`/bouquets/${id}/toggle`, { field, value });
      setBouquets((prev) =>
        prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
      );
    } catch {
      setError('Не удалось обновить статус');
      fetchBouquets();
    }
  };

  const filtered = bouquets.filter((b) => {
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (search.trim()) {
      return b.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Reset to first page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      {/* Fullscreen image preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={22} className="text-white" />
          </button>
          <img
            src={previewUrl}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
      )}

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

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {bouquets.length === 0 ? 'Букетов пока нет' : 'Ничего не найдено'}
          </div>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200 shadow-sm">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 bg-gray-50 first:rounded-tl-xl">Фото</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 bg-gray-50">Название</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 bg-gray-50">Цена</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 bg-gray-50">Категория</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 bg-gray-50">В наличии</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 bg-gray-50">Хит</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 bg-gray-50">Новинка</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 bg-gray-50">Под заказ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 bg-gray-50 last:rounded-tr-xl">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((b) => {
                  const thumbUrl = b.images?.[0] ? imageUrl(b.images[0].url) : null;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={b.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 hover:border-primary transition-all"
                            onClick={() => setPreviewUrl(thumbUrl)}
                          />
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(b.id, 'customOrder', !b.customOrder)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.customOrder ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${b.customOrder ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
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

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>На странице:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
            <span className="text-gray-400">
              {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} из {filtered.length}
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'dots' ? (
                    <span key={`dots-${i}`} className="px-2 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                        p === currentPage
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
