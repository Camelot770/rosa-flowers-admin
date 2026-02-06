import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface BouquetImage {
  url: string;
}

interface Bouquet {
  id: number;
  name: string;
  price: number;
  category?: { name: string } | null;
  categoryName?: string;
  inStock: boolean;
  isHit: boolean;
  isNew: boolean;
  images: BouquetImage[];
}

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Букеты</h1>
        <button
          onClick={() => navigate('/bouquets/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Добавить букет
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bouquets.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Букетов пока нет</div>
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
                {bouquets.map((b) => {
                  const thumbUrl = b.images?.[0]
                    ? imageUrl(b.images[0].url)
                    : null;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={b.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            Нет
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                      <td className="px-4 py-3 text-gray-700">{formatRubles(b.price)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {b.category?.name || b.categoryName || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${b.inStock ? 'bg-green-500' : 'bg-red-400'}`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.isHit ? (
                          <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Хит</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.isNew ? (
                          <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-600 rounded-full">New</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/bouquets/${b.id}`)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id, b.name)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
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
