import { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../api/client';
import { useToast } from './Toast';

interface Template {
  label: string;
  text: string;
}

interface Props {
  userId: number;
  templates?: Template[];
}

// One message to one customer, into the messenger they ordered from
export default function MessageForm({ userId, templates = [] }: Props) {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = message.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.post(`/users/${userId}/message`, { message: text });
      setMessage('');
      toast('Сообщение доставлено');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось отправить сообщение', { tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => setMessage(template.text)}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              {template.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Сообщение клиенту"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-y"
      />
      <button
        type="button"
        onClick={send}
        disabled={sending || !message.trim()}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Send size={14} />
        {sending ? 'Отправляем...' : 'Отправить'}
      </button>
    </div>
  );
}
