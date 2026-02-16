import { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import api from '../api/client';

export default function Broadcast() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!window.confirm('Отправить рассылку всем пользователям?')) return;
    setSending(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/broadcast', { message: message.trim() });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка отправки рассылки');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Рассылка</h1>

      {result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} />
          Отправлено: {result.sent} из {result.total}
          {result.failed > 0 && ` (ошибок: ${result.failed})`}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users size={16} className="text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Сообщение для всех пользователей</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Текст сообщения
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст рассылки... (поддерживается Markdown)"
              maxLength={4000}
              rows={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{message.length}/4000</p>
          </div>

          {/* Preview */}
          {message.trim() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Предпросмотр</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                {message}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {sending ? 'Отправка...' : 'Отправить рассылку'}
        </button>
      </div>
    </div>
  );
}
