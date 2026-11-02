import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { formatRubles } from '../utils/format';
import { useToast } from '../components/Toast';
import { Plus, Pencil, Trash2, Search, X, AlertTriangle, ArrowUp, ArrowDown, Copy, Check } from 'lucide-react';

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
  isFeatured: boolean;
  customOrder: boolean;
  images: BouquetImage[];
}

type ToggleField = 'inStock' | 'isHit' | 'isNew' | 'isFeatured' | 'customOrder';

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

// A customer can order a bouquet that is in stock or made to order, the catalog hides the rest
const onSale = (b: Bouquet) => b.inStock || b.customOrder;

const FILTERS: { key: string; label: string; match: (b: Bouquet) => boolean }[] = [
  { key: 'all', label: 'Все', match: () => true },
  { key: 'sale', label: 'На витрине', match: onSale },
  { key: 'hidden', label: 'Скрытые', match: (b) => !onSale(b) },
  { key: 'custom', label: 'Под заказ', match: (b) => b.customOrder },
  { key: 'hit', label: 'Хиты', match: (b) => b.isHit },
  { key: 'new', label: 'Новинки', match: (b) => b.isNew },
  { key: 'nophoto', label: 'Без фото', match: (b) => !b.images?.length },
];

const TOGGLES: { field: ToggleField; label: string; on: string; title: string }[] = [
  { field: 'inStock', label: 'В наличии', on: 'bg-green-100 text-green-800 border-green-200', title: 'Букет есть, его можно купить' },
  { field: 'customOrder', label: 'Под заказ', on: 'bg-blue-100 text-blue-800 border-blue-200', title: 'Букета нет сейчас, но его можно заказать' },
  { field: 'isHit', label: 'Хит', on: 'bg-orange-100 text-orange-800 border-orange-200', title: 'Значок «Хит» на витрине' },
  { field: 'isNew', label: 'Новинка', on: 'bg-emerald-100 text-emerald-800 border-emerald-200', title: 'Значок «Новинка» на витрине' },
  { field: 'isFeatured', label: 'На превью', on: 'bg-primary text-white border-primary', title: 'Главный букет на обложке мини-приложения. Может быть только один.' },
];

function PriceEditor({ bouquet, onSaved }: { bouquet: Bouquet; onSaved: (price: number) => void }) {
  const toast = useToast();
  const [value, setValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const price = Number(value);
    if (!Number.isInteger(price) || price < 1) {
      toast('Цена должна быть целым числом больше нуля', { tone: 'error' });
      return;
    }
    if (price === bouquet.price) {
      setValue(null);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/bouquets/${bouquet.id}/price`, { price });
      onSaved(price);
      setValue(null);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось изменить цену', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (value === null) {
    return (
      <button
        onClick={() => setValue(String(bouquet.price))}
        title="Изменить цену"
        className="group inline-flex items-center gap-1.5 font-semibold text-gray-800 hover:text-primary whitespace-nowrap"
      >
        {formatRubles(bouquet.price)}
        <Pencil size={12} className="text-gray-300 group-hover:text-primary" />
      </button>
    );
  }

  return (
    <form onSubmit={save} className="inline-flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        min="1"
        step="1"
        autoFocus
        aria-label={`Цена букета ${bouquet.name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setValue(null); }}
        onBlur={() => { if (!saving) setValue(null); }}
        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg"
      />
      <button
        type="submit"
        disabled={saving}
        aria-label="Сохранить цену"
        // Keeps the input from losing focus first, its blur would close the editor
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-50"
      >
        <Check size={14} />
      </button>
    </form>
  );
}

export default function Bouquets() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'all';
  const sort = params.get('sort') || 'order';
  const categoryFilter = params.get('category') || 'all';
  const search = params.get('q') || '';

  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [percent, setPercent] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const fetchBouquets = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    return api.get('/bouquets')
      .then((res) => setBouquets(res.data))
      .catch(() => setError('Не удалось загрузить букеты'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBouquets();
  }, []);

  const openBouquet = (path: string) => navigate(path, { state: { back: location.search } });

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Удалить букет «${name}»? Его больше не будет на витрине, в старых заказах название останется.`)) return;
    try {
      await api.delete(`/bouquets/${id}`);
      setBouquets((prev) => prev.filter((b) => b.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast(`Букет «${name}» удалён`);
    } catch {
      toast('Не удалось удалить букет', { tone: 'error' });
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const { data } = await api.post(`/bouquets/${id}/duplicate`);
      toast('Копия создана и скрыта с витрины, поправьте её и включите наличие');
      openBouquet(`/bouquets/${data.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось скопировать букет', { tone: 'error' });
    }
  };

  const handleToggle = async (id: number, field: ToggleField, value: boolean) => {
    try {
      await api.patch(`/bouquets/${id}/toggle`, { field, value });
      setBouquets((prev) =>
        prev.map((b) => {
          // isFeatured — только один букет может быть featured
          if (field === 'isFeatured' && value === true) {
            return { ...b, isFeatured: b.id === id };
          }
          return b.id === id ? { ...b, [field]: value } : b;
        })
      );
    } catch {
      toast('Не удалось обновить букет', { tone: 'error' });
      fetchBouquets(true);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...bouquets];
    const [moved] = next.splice(index, 1);
    next.splice(index + direction, 0, moved);
    setBouquets(next);
    try {
      await api.put('/bouquets/reorder', { ids: next.map((b) => b.id) });
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось сохранить порядок', { tone: 'error' });
      fetchBouquets(true);
    }
  };

  const activeFilter = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const usedCategories = useMemo(() => [...new Set(bouquets.map((b) => b.category))], [bouquets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = bouquets.filter((b) => (
      activeFilter.match(b)
      && (categoryFilter === 'all' || b.category === categoryFilter)
      && (!q || b.name.toLowerCase().includes(q))
    ));
    if (sort === 'priceUp') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'priceDown') return [...list].sort((a, b) => b.price - a.price);
    if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return list;
  }, [bouquets, activeFilter, categoryFilter, search, sort]);

  // Arrows only make sense over the whole catalog in its own order
  const canReorder = sort === 'order' && filter === 'all' && categoryFilter === 'all' && !search.trim();

  const allShownSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));

  const toggleSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllShown = () => {
    setSelected(allShownSelected ? new Set() : new Set(filtered.map((b) => b.id)));
  };

  const bulk = async (action: 'show' | 'hide' | 'price') => {
    const ids = [...selected];
    const change = Number(percent.replace(',', '.'));
    if (action === 'price') {
      if (!Number.isFinite(change) || change === 0 || change <= -90 || change > 300) {
        toast('Укажите изменение цены от -89 до 300 процентов', { tone: 'error' });
        return;
      }
      const verb = change > 0 ? `Поднять цены на ${change}%` : `Снизить цены на ${Math.abs(change)}%`;
      if (!window.confirm(`${verb} у букетов: ${ids.length}? Цены округлятся до 10 ₽.`)) return;
    }
    if (action === 'hide' && !window.confirm(`Убрать из наличия букеты: ${ids.length}?`)) return;

    setBulkBusy(true);
    try {
      const { data } = await api.post('/bouquets/bulk', { ids, action, percent: action === 'price' ? change : undefined });
      toast(`Готово, букетов изменено: ${data.count}`);
      setPercent('');
      setSelected(new Set());
      await fetchBouquets(true);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось изменить букеты', { tone: 'error' });
    } finally {
      setBulkBusy(false);
    }
  };

  const featuredOutOfStock = bouquets.find((b) => b.isFeatured && !onSale(b));
  const noFeatured = !loading && bouquets.length > 0 && !bouquets.some((b) => b.isFeatured);

  return (
    <div className={`space-y-4 ${selected.size > 0 ? 'pb-32 md:pb-20' : ''}`}>
      {/* Fullscreen image preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            aria-label="Закрыть"
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Букеты</h1>
          {!loading && (
            <span className="text-sm text-gray-500">
              на витрине {bouquets.filter(onSale).length} из {bouquets.length}
            </span>
          )}
        </div>
        <button
          onClick={() => openBouquet('/bouquets/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Добавить букет
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      {featuredOutOfStock && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Букет «{featuredOutOfStock.name}» выбран на превью, но его нет в наличии. Пока он не вернётся в наличие, на обложке будет другой букет.</span>
        </div>
      )}
      {noFeatured && (
        <div className="p-3 bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg">
          Букет на обложку не выбран, мини-приложения покажут первый подходящий. Выбрать можно кнопкой «На превью».
        </div>
      )}

      {/* Filters */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FILTERS.map(({ key, label, match }) => {
          const count = bouquets.filter(match).length;
          return (
            <button
              key={key}
              onClick={() => setParam('filter', key, 'all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label} <span className={filter === key ? 'text-white/70' : 'text-gray-400'}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem] sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setParam('q', e.target.value, '')}
            placeholder="Поиск по названию"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select
          aria-label="Порядок"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value, 'order')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="order">Порядок витрины</option>
          <option value="priceUp">Сначала дешёвые</option>
          <option value="priceDown">Сначала дорогие</option>
          <option value="name">По названию</option>
        </select>
        {usedCategories.length > 1 && (
          <select
            aria-label="Категория"
            value={categoryFilter}
            onChange={(e) => setParam('category', e.target.value, 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Все категории</option>
            {usedCategories.map((value) => (
              <option key={value} value={value}>{CATEGORIES[value] || value}</option>
            ))}
          </select>
        )}
      </div>

      {canReorder && !loading && bouquets.length > 1 && (
        <p className="text-xs text-gray-500">
          Стрелки меняют порядок букетов в мини-приложениях Telegram и Max. На сайте сначала идут хиты, затем букеты по цене.
        </p>
      )}

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
          <>
            <label className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 text-xs font-medium text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} className="w-4 h-4 accent-primary" />
              Выбрать все показанные: {filtered.length}
            </label>
            <ul className="divide-y divide-gray-100">
              {filtered.map((b, index) => {
                const thumbUrl = b.images?.[0] ? imageUrl(b.images[0].url) : null;
                return (
                  <li key={b.id} className={`px-4 py-3 flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-2 ${selected.has(b.id) ? 'bg-primary/5' : ''}`}>
                    <input
                      type="checkbox"
                      aria-label={`Выбрать ${b.name}`}
                      checked={selected.has(b.id)}
                      onChange={() => toggleSelected(b.id)}
                      className="w-4 h-4 accent-primary shrink-0"
                    />
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={b.name}
                        loading="lazy"
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                        onClick={() => setPreviewUrl(thumbUrl)}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-[10px] text-center leading-tight shrink-0">Нет фото</div>
                    )}
                    <div className="flex-1 min-w-[10rem]">
                      <button
                        onClick={() => openBouquet(`/bouquets/${b.id}`)}
                        className="block text-left text-sm font-medium text-gray-800 hover:text-primary"
                      >
                        {b.name}
                      </button>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <PriceEditor
                          bouquet={b}
                          onSaved={(price) => setBouquets((prev) => prev.map((item) => (item.id === b.id ? { ...item, price } : item)))}
                        />
                        {usedCategories.length > 1 && <span className="text-xs text-gray-500">{CATEGORIES[b.category] || b.category}</span>}
                        {!onSale(b) && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">Скрыт с витрины</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 w-full lg:w-auto order-last lg:order-none">
                      {TOGGLES.map(({ field, label, on, title }) => (
                        <button
                          key={field}
                          onClick={() => handleToggle(b.id, field, !b[field])}
                          aria-pressed={b[field]}
                          title={title}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                            b[field] ? on : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center ml-auto shrink-0">
                      {canReorder && (
                        <>
                          <button
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                            aria-label={`Выше: ${b.name}`}
                            title="Выше"
                            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => move(index, 1)}
                            disabled={index === filtered.length - 1}
                            aria-label={`Ниже: ${b.name}`}
                            title="Ниже"
                            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </>
                      )}
                      <button onClick={() => openBouquet(`/bouquets/${b.id}`)} aria-label={`Редактировать ${b.name}`} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Редактировать">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDuplicate(b.id)} aria-label={`Копировать ${b.name}`} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Сделать копию">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => handleDelete(b.id, b.name)} aria-label={`Удалить ${b.name}`} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Actions on the selected bouquets */}
      {selected.size > 0 && (
        <div className="fixed z-30 left-0 right-0 md:left-64 bottom-14 md:bottom-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800 mr-1">Выбрано: {selected.size}</span>
          <button disabled={bulkBusy} onClick={() => bulk('show')} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">В наличии</button>
          <button disabled={bulkBusy} onClick={() => bulk('hide')} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Убрать из наличия</button>
          <form
            onSubmit={(e) => { e.preventDefault(); bulk('price'); }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              inputMode="numeric"
              aria-label="Изменение цены в процентах"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="+10 %"
              className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <button disabled={bulkBusy || !percent.trim()} className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">Изменить цены</button>
          </form>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 sm:ml-auto">Снять выбор</button>
        </div>
      )}
    </div>
  );
}
