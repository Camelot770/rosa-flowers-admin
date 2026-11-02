import { useState, useEffect, useRef, FormEvent, ChangeEvent, DragEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Upload, X, Loader2, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { resizeImage } from '../utils/resizeImage';
import { useToast } from '../components/Toast';

interface BouquetData {
  id?: string;
  name: string;
  description: string;
  price: string;
  oldPrice: string;
  category: string;
  tags: string;
  inStock: boolean;
  isHit: boolean;
  isNew: boolean;
  isFeatured: boolean;
  customOrder: boolean;
  sortOrder: string;
}

const CATEGORIES = [
  { value: 'stabilized', label: 'Стабилизированные' },
  { value: 'roses', label: 'Розы' },
  { value: 'tulips', label: 'Тюльпаны' },
  { value: 'author', label: 'Авторские' },
  { value: 'peonies', label: 'Пионы' },
  { value: 'exotic', label: 'Экзотика' },
  { value: 'mixed', label: 'Микс' },
  { value: 'lilies', label: 'Лилии' },
  { value: 'hydrangea', label: 'Гортензии' },
  { value: 'greenery', label: 'Зелень' },
];

// A saved photo has an id, a new one has the file to upload. The first photo is the main one everywhere.
interface Photo {
  key: string;
  url: string;
  id?: number;
  file?: File;
}

// The server takes this many files in one request
const MAX_NEW_PHOTOS = 10;

const initialData: BouquetData = {
  name: '',
  description: '',
  price: '',
  oldPrice: '',
  category: 'stabilized',
  tags: '',
  inStock: true,
  isHit: false,
  isNew: false,
  isFeatured: false,
  customOrder: false,
  sortOrder: '0',
};

export default function BouquetForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isEdit = Boolean(id);
  const backTo = `/bouquets${(location.state as { back?: string } | null)?.back || ''}`;

  const [form, setForm] = useState<BouquetData>(initialData);
  const [loadedFeatured, setLoadedFeatured] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [originalImageIds, setOriginalImageIds] = useState<number[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const addAnother = useRef(false);
  const objectUrls = useRef(new Set<string>());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    api
      .get(`/bouquets/${id}`)
      .then(({ data: bouquet }) => {
        if (!bouquet) {
          setError('Букет не найден');
          return;
        }
        setForm({
          name: bouquet.name || '',
          description: bouquet.description || '',
          price: String(bouquet.price || ''),
          oldPrice: String(bouquet.oldPrice || ''),
          category: bouquet.category || 'roses',
          tags: Array.isArray(bouquet.tags) ? bouquet.tags.join(', ') : bouquet.tags || '',
          inStock: bouquet.inStock !== false,
          isHit: bouquet.isHit || false,
          isNew: bouquet.isNew || false,
          isFeatured: bouquet.isFeatured || false,
          customOrder: bouquet.customOrder || false,
          sortOrder: String(bouquet.sortOrder || 0),
        });
        setLoadedFeatured(bouquet.isFeatured || false);
        if (bouquet.images) {
          const imgs = Array.isArray(bouquet.images) ? bouquet.images : [bouquet.images];
          const mapped: Photo[] = imgs.map((img: any) => ({
            key: `saved-${img.id}`,
            id: img.id,
            url: imageUrl(typeof img === 'string' ? img : img.url),
          }));
          setPhotos(mapped);
          setOriginalImageIds(mapped.map((m) => m.id as number));
        }
      })
      .catch(() => setError('Ошибка загрузки букета'))
      .finally(() => setFetching(false));
  }, [id]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addFiles = async (files: File[]) => {
    const pictures = files.filter((file) => file.type.startsWith('image/'));
    if (pictures.length === 0) return;
    const room = MAX_NEW_PHOTOS - photos.filter((photo) => photo.file).length;
    if (pictures.length > room) {
      toast(`За один раз можно добавить до ${MAX_NEW_PHOTOS} фото`, { tone: 'error' });
    }
    const accepted = pictures.slice(0, Math.max(0, room));
    if (accepted.length === 0) return;
    setPreparingPhotos(true);
    const resized = await Promise.all(accepted.map(resizeImage));
    setPreparingPhotos(false);
    const added = resized.map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { key: `new-${Date.now()}-${index}`, url, file };
    });
    setPhotos((prev) => [...prev, ...added]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    // The same file can be chosen again after it was removed
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removePhoto = (key: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.key !== key));
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(index + direction, 0, moved);
      return next;
    });
  };

  // Previews of new photos live as long as the form
  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', form.price);
      if (form.oldPrice) fd.append('oldPrice', form.oldPrice);
      fd.append('category', form.category);
      fd.append('tags', form.tags);
      fd.append('inStock', String(form.inStock));
      fd.append('isHit', String(form.isHit));
      fd.append('isNew', String(form.isNew));
      // An untouched checkbox must not overwrite a choice made elsewhere after this form was loaded.
      // The field is still sent: a backend without the "absent means unchanged" rule reads absent as false.
      let featured = form.isFeatured;
      if (isEdit && form.isFeatured === loadedFeatured) {
        const { data: fresh } = await api.get(`/bouquets/${id}`);
        featured = !!fresh?.isFeatured;
      }
      fd.append('isFeatured', String(featured));
      fd.append('customOrder', String(form.customOrder));
      fd.append('sortOrder', form.sortOrder);

      // Вычисляем удалённые изображения (были в оригинале, но убраны пользователем)
      const currentIds = photos.filter((photo) => photo.id).map((photo) => photo.id as number);
      const deletedIds = originalImageIds.filter((origId) => !currentIds.includes(origId));
      if (deletedIds.length > 0) {
        fd.append('deleteImages', JSON.stringify(deletedIds));
      }

      // Files go in the order they stand in the list, so a new bouquet needs nothing more
      let newIndex = 0;
      const imageOrder = photos.map((photo) => {
        if (photo.id) return photo.id;
        fd.append('images', photo.file as File);
        return `new:${newIndex++}`;
      });

      if (isEdit) {
        fd.append('imageOrder', JSON.stringify(imageOrder));
        await api.put(`/bouquets/${id}`, fd);
      } else {
        await api.post('/bouquets', fd);
      }

      if (addAnother.current) {
        toast(`Букет «${form.name}» создан, можно добавлять следующий`);
        setForm(initialData);
        setPhotos([]);
        window.scrollTo({ top: 0 });
      } else {
        navigate(backTo);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Ошибка сохранения букета');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
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

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(backTo)}
          aria-label="Назад к букетам"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Редактировать букет' : 'Новый букет'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Название букета"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Описание букета"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* Price & Old Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              min="1"
              placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Старая цена <span className="text-gray-400">(необязательно)</span>
            </label>
            <input
              type="number"
              name="oldPrice"
              value={form.oldPrice}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {Number(form.oldPrice) > 0 && Number(form.oldPrice) <= Number(form.price) && (
          <p className="-mt-3 text-xs text-amber-700">
            Старая цена не выше новой, поэтому скидку на витрине не покажем.
          </p>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Категория</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Теги <span className="text-gray-400">(через запятую)</span>
          </label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="нежный, весенний, праздничный"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Порядок сортировки</label>
          <input
            type="number"
            name="sortOrder"
            value={form.sortOrder}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          <p className="mt-1 text-xs text-gray-500">Чем меньше число, тем выше букет в мини-приложениях. Удобнее двигать стрелками в списке букетов.</p>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="inStock"
              checked={form.inStock}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">В наличии</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="isHit"
              checked={form.isHit}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">Хит</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="isNew"
              checked={form.isNew}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">Новинка</span>
          </label>

          <label
            className="flex items-center gap-2 cursor-pointer select-none"
            title="Этот букет будет показан главным на обложке мини-приложения. Может быть только один."
          >
            <input
              type="checkbox"
              name="isFeatured"
              checked={form.isFeatured}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">На превью (главный)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="customOrder"
              checked={form.customOrder}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">Под заказ</span>
          </label>
        </div>

        {form.isFeatured && !form.inStock && !form.customOrder && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>Букет выбран на превью, но его нет в наличии. Пока он не вернётся в наличие, на обложке будет другой букет.</span>
          </div>
        )}

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Фотографии</label>
          {photos.length > 1 && (
            <p className="mb-2 text-xs text-gray-500">Первое фото главное: его видно в каталоге и на обложке. Порядок меняется стрелками.</p>
          )}

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {photos.map((photo, i) => (
                <div key={photo.key} className="w-28">
                  <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewUrl(photo.url)}
                    />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-white rounded">Главное</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.key)}
                      aria-label={`Убрать фото ${i + 1}`}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {photos.length > 1 && (
                    <div className="flex justify-between mt-1">
                      <button
                        type="button"
                        onClick={() => movePhoto(i, -1)}
                        disabled={i === 0}
                        aria-label={`Фото ${i + 1} левее`}
                        className="p-1.5 text-gray-500 hover:text-primary rounded disabled:opacity-25"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(i, 1)}
                        disabled={i === photos.length - 1}
                        aria-label={`Фото ${i + 1} правее`}
                        className="p-1.5 text-gray-500 hover:text-primary rounded disabled:opacity-25"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
          >
            {preparingPhotos ? <Loader2 size={18} className="animate-spin text-gray-400" /> : <Upload size={18} className="text-gray-400" />}
            <span className="text-sm text-gray-500">{preparingPhotos ? 'Готовим фото...' : 'Выберите фото или перетащите сюда'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading || preparingPhotos}
            onClick={() => { addAnother.current = false; }}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'Сохранить' : 'Создать'}
          </button>
          {!isEdit && (
            <button
              type="submit"
              disabled={loading || preparingPhotos}
              onClick={() => { addAnother.current = true; }}
              className="px-6 py-2.5 border border-primary text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              Создать и добавить ещё
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
