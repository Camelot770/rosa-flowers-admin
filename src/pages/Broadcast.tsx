import { useEffect, useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, Users, FlaskConical } from 'lucide-react';
import api from '../api/client';
import { plural } from '../utils/format';
import { useToast } from '../components/Toast';

type Audience = 'all' | 'telegram' | 'max' | 'buyers';

const AUDIENCES: { key: Audience; label: string; hint: string }[] = [
  { key: 'all', label: 'Все', hint: 'Все, кто писал боту в Telegram или Max' },
  { key: 'buyers', label: 'Покупатели', hint: 'Те, кто уже оплатил заказ' },
  { key: 'telegram', label: 'Только Telegram', hint: '' },
  { key: 'max', label: 'Только Max', hint: '' },
];

export default function Broadcast() {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [counts, setCounts] = useState<Record<Audience, number> | null>(null);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/broadcast/audience')
      .then(({ data }) => setCounts(data))
      .catch(() => setError('Не удалось посчитать получателей'));
  }, []);

  const count = counts ? counts[audience] : 0;

  const handleTest = async () => {
    if (!message.trim()) return;
    setTesting(true);
    try {
      const { data } = await api.post('/broadcast/test', { message: message.trim() });
      if (data.sent > 0) {
        toast('Проверочное сообщение отправлено администраторам в Telegram');
      } else {
        toast('Проверка не дошла: администратор не указан или бот Telegram не может ему написать', { tone: 'error' });
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось отправить проверку', { tone: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !counts) return;
    const people = `${count} ${plural(count, 'человек', 'человека', 'человек')}`;
    const label = AUDIENCES.find((item) => item.key === audience)?.label.toLowerCase();
    if (!window.confirm(`Отправить сообщение: ${people} (${label})? Отозвать его будет нельзя.`)) return;
    setSending(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/broadcast', { message: message.trim(), audience });
      setResult(data);
      // Nothing delivered usually means the bots are off, the text is still needed for another try
      if (data.sent > 0) setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка отправки рассылки');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Рассылка</h1>

      {result && result.sent === 0 && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          Никому не доставлено. Проверьте, что боты работают, и попробуйте ещё раз.
        </div>
      )}

      {result && result.sent > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          Отправлено: {result.sent} из {result.total}
          {result.failed > 0 && ` (не доставлено: ${result.failed})`}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users size={16} className="text-blue-600" />
          </div>
          <h2 className="text-base text-gray-800">Кому</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AUDIENCES.map((item) => (
            <label
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                audience === item.key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="audience"
                checked={audience === item.key}
                onChange={() => setAudience(item.key)}
                className="mt-0.5 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800">
                  {item.label}{counts ? `: ${counts[item.key]}` : ''}
                </span>
                {item.hint && <span className="block text-xs text-gray-500">{item.hint}</span>}
              </span>
            </label>
          ))}
        </div>
        <p className="px-6 pb-4 text-xs text-gray-500">Клиенты, заказавшие только на сайте, рассылку не получат: бот им написать не может.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label htmlFor="broadcast-text" className="block text-sm font-medium text-gray-700 mb-1.5">
          Текст сообщения
        </label>
        <textarea
          id="broadcast-text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Например: к выходным свежие пионы, закажите заранее"
          maxLength={4000}
          rows={6}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg resize-y"
        />
        <div className="flex flex-wrap justify-between gap-2 mt-1 text-xs text-gray-500">
          <span>В Telegram *так* получится жирный текст, а в Max звёздочки останутся как есть.</span>
          <span>{message.length}/4000</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={handleTest}
          disabled={testing || sending || !message.trim()}
          className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
          Проверить на себе
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || !counts || count === 0}
          className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {sending ? 'Отправка...' : `Отправить${counts ? `: ${count}` : ''}`}
        </button>
      </div>
    </div>
  );
}
