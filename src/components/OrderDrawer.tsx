import { useCallback, useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ChevronLeft, ClipboardCopy, Clock, CreditCard, ExternalLink, Gift, Loader2, MapPin,
  MessageSquare, NotebookPen, Package, Pencil, Phone, Printer, Star, Store, Truck, User, X,
} from 'lucide-react';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { getPlatform } from '../utils/platform';
import { copyText, formatRubles, telHref } from '../utils/format';
import {
  Order, calendarWhen, courierText, customerName, isOverdue, mapQuery, nextStatus, nextStepLabel, orderBreakdown,
  paymentColors, paymentLabels, plainAddress, previousStatus, statusColors, statusLabel, whenLabel,
} from '../utils/orders';
import { useToast } from './Toast';
import { useOrderActions } from './useOrderActions';
import MessageForm from './MessageForm';

// The labels the checkouts offer, an admin can also type anything else
const TIME_SLOTS = ['9:00 — 12:00', '12:00 — 15:00', '15:00 — 18:00', '18:00 — 21:00'];

function Section({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2" style={{ fontFamily: 'inherit', letterSpacing: 0 }}>
          {icon} {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a href={telHref(phone)} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
      <Phone size={13} />
      {phone}
    </a>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start gap-2">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function DeliveryForm({ order, onSaved, onCancel }: { order: Order; onSaved: (order: Order) => void; onCancel: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    deliveryDate: order.deliveryDate || '',
    deliveryTime: order.deliveryTime || '',
    recipientName: order.recipientName || '',
    recipientPhone: order.recipientPhone || '',
    cardText: order.cardText || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const save = async () => {
    const changed = Object.fromEntries(
      Object.entries(form).filter(([key, value]) => value !== (order[key as keyof Order] || '')),
    );
    if (Object.keys(changed).length === 0) {
      onCancel();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/orders/${order.id}`, changed);
      onSaved(data);
      toast('Сохранено. Клиенту об изменении не сообщается');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg';
  const label = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="order-date" className={label}>Дата</label>
          <input id="order-date" type="date" value={form.deliveryDate} onChange={(e) => set('deliveryDate', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="order-time" className={label}>Время</label>
          <input id="order-time" list="order-time-slots" value={form.deliveryTime} onChange={(e) => set('deliveryTime', e.target.value)} maxLength={32} className={field} />
          <datalist id="order-time-slots">
            {TIME_SLOTS.map((slot) => <option key={slot} value={slot} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="order-recipient" className={label}>Получатель</label>
          <input id="order-recipient" value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)} maxLength={100} className={field} />
        </div>
        <div>
          <label htmlFor="order-recipient-phone" className={label}>Телефон получателя</label>
          <input id="order-recipient-phone" type="tel" value={form.recipientPhone} onChange={(e) => set('recipientPhone', e.target.value)} maxLength={32} className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="order-card" className={label}>Текст открытки</label>
        <textarea id="order-card" value={form.cardText} onChange={(e) => set('cardText', e.target.value)} rows={2} maxLength={1000} className={`${field} resize-y`} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

function StudioNote({ order, onSaved }: { order: Order; onSaved: (order: Order) => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/orders/${order.id}`, { adminNote: draft });
      onSaved(data);
      setDraft(null);
      toast('Заметка сохранена');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Не удалось сохранить заметку', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={draft ?? order.adminNote ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Видно только студии. Например: заменить эвкалипт, клиент просил позвонить за час"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-y"
      />
      {draft !== null && draft !== (order.adminNote ?? '') && (
        <button onClick={save} disabled={saving} className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? 'Сохраняем...' : 'Сохранить заметку'}
        </button>
      )}
    </div>
  );
}

// What goes along with the bouquet, so no prices here
function OrderSlip({ order }: { order: Order }) {
  return createPortal(
    <div className="print-slip" style={{ fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Заказ #{order.id}</h1>
      <p><b>{order.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}:</b> {calendarWhen(order)}</p>
      {order.address && <p><b>Адрес:</b> {plainAddress(order.address)}{order.address.comment ? ` (${order.address.comment})` : ''}</p>}
      {(order.recipientName || order.recipientPhone) && (
        <p><b>Получатель:</b> {[order.recipientName, order.recipientPhone].filter(Boolean).join(', ')}</p>
      )}
      {!order.isAnonymous && <p><b>Заказчик:</b> {[customerName(order.user), order.user.phone].filter(Boolean).join(', ')}</p>}
      {order.isAnonymous && <p><b>Анонимно: отправителя не называть</b></p>}
      <p style={{ marginTop: 12 }}><b>Состав:</b></p>
      <ul style={{ margin: 0, paddingLeft: 20, listStyle: 'disc' }}>
        {order.items.map((item) => <li key={item.id}>{item.name} x{item.quantity}</li>)}
      </ul>
      {order.cardText && <p style={{ marginTop: 12 }}><b>Открытка:</b> «{order.cardText}»</p>}
      {order.comment && <p style={{ marginTop: 12 }}><b>Комментарий:</b> {order.comment}</p>}
    </div>,
    document.body,
  );
}

interface Props {
  orderId: number;
  preview?: Order;
  onClose: () => void;
  onChanged: () => void;
}

export default function OrderDrawer({ orderId, preview, onClose, onChanged }: Props) {
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(preview || null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    api.get(`/orders/${orderId}`)
      .then(({ data }) => { setOrder(data); setError(''); })
      .catch((err) => setError(err.response?.status === 404 ? 'Такого заказа нет' : 'Не удалось загрузить заказ'));
  }, [orderId]);

  const { updatingId, advance, back, cancel } = useOrderActions(() => {
    load();
    onChanged();
  });

  useEffect(() => {
    setOrder(preview || null);
    setEditing(false);
    load();
    // The list copy is only for the first paint, it should not restart the loading on every list refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const saved = (updated: Order) => {
    setOrder(updated);
    setEditing(false);
    onChanged();
  };

  const copy = async (text: string, done: string) => {
    if (await copyText(text)) toast(done);
    else toast('Браузер не дал скопировать', { tone: 'error' });
  };

  const breakdown = order ? orderBreakdown(order) : null;
  const platform = order ? getPlatform(order.user) : null;
  const canMessage = !!order && !!(order.user.telegramId || order.user.maxId);
  const canEdit = !!order && !['completed', 'canceled'].includes(order.status);

  return (
    <div>
      <div className="fixed inset-0 bg-black/40 z-50 print:hidden" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={`Заказ #${orderId}`}
        className="fixed inset-y-0 right-0 z-50 w-full md:max-w-xl bg-white shadow-xl flex flex-col print:hidden"
      >
        <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button onClick={onClose} aria-label="Закрыть" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
          <h2 className="text-lg text-gray-900 mr-auto">Заказ #{orderId}</h2>
          {order && (
            <>
              <button
                onClick={() => copy(courierText(order), 'Данные для курьера скопированы')}
                title="Скопировать для курьера"
                aria-label="Скопировать для курьера"
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <ClipboardCopy size={18} />
              </button>
              <button
                onClick={() => window.print()}
                title="Распечатать бланк"
                aria-label="Распечатать бланк"
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Printer size={18} />
              </button>
            </>
          )}
        </header>

        {!order ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 p-6 text-center">
            {error || <Loader2 className="w-8 h-8 animate-spin text-primary" />}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel(order)}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${paymentColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {paymentLabels[order.paymentStatus] || order.paymentStatus}
                </span>
                <span className="text-sm font-semibold text-gray-800 ml-auto">{formatRubles(order.totalPrice)}</span>
              </div>
              {(nextStatus(order) || previousStatus(order) || order.status !== 'canceled') && (
                <div className="flex flex-wrap gap-2">
                  {nextStatus(order) && (
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => advance(order)}
                      className={`flex-1 min-w-[8rem] px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        order.status === 'new'
                          ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {order.status === 'new' ? 'Подтвердить без оплаты' : nextStepLabel(order)}
                    </button>
                  )}
                  {previousStatus(order) && (
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => back(order)}
                      className="inline-flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft size={15} />
                      Назад
                    </button>
                  )}
                  {order.status !== 'completed' && order.status !== 'canceled' && (
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => cancel(order)}
                      className="px-3 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Отменить
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

              {order.status === 'canceled' && order.paymentStatus === 'paid' && (
                <Warning>Заказ оплачен и отменён. Деньги сами не вернутся: сделайте возврат {formatRubles(order.totalPrice)} в кабинете ЮKassa, если ещё не сделали.</Warning>
              )}
              {order.status === 'new' && (
                <Warning>Заказ ещё не оплачен. После оплаты он сам перейдёт в работу.</Warning>
              )}
              {isOverdue(order) && (
                <Warning>Дата доставки уже прошла. Поменяйте дату или завершите заказ.</Warning>
              )}
              {order.isAnonymous && (
                <Warning>Анонимный заказ: получателю нельзя называть отправителя.</Warning>
              )}

              <Section
                title={order.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}
                icon={order.deliveryType === 'pickup' ? <Store size={14} /> : <Truck size={14} />}
                action={canEdit && !editing && (
                  <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Pencil size={12} />
                    Изменить
                  </button>
                )}
              >
                <div className="space-y-2 text-sm">
                  {!editing && (
                    <div className={`flex items-center gap-2 ${isOverdue(order) ? 'text-red-600 font-medium' : ''}`}>
                      <Clock size={14} className="text-gray-400 shrink-0" />
                      {whenLabel(order)}
                    </div>
                  )}
                  {order.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div>{plainAddress(order.address)}</div>
                        {order.address.comment && <div className="text-gray-500 mt-0.5">{order.address.comment}</div>}
                        <div className="flex flex-wrap gap-3 mt-1">
                          <a
                            href={`https://yandex.ru/maps/?text=${encodeURIComponent(mapQuery(order.address))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink size={12} />
                            На карте
                          </a>
                          <button
                            onClick={() => copy(plainAddress(order.address!), 'Адрес скопирован')}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Скопировать адрес
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {!editing && (order.recipientName || order.recipientPhone) && (
                    <div className="flex items-start gap-2 pt-1">
                      <Gift size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {order.recipientName && <span className="font-medium">{order.recipientName}</span>}
                        {order.recipientPhone && <PhoneLink phone={order.recipientPhone} />}
                      </div>
                    </div>
                  )}
                  {!editing && order.cardText && (
                    <div className="flex items-start gap-2 pt-1">
                      <MessageSquare size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <span className="italic text-gray-700">«{order.cardText}»</span>
                    </div>
                  )}
                  {editing && (
                    <div className="pt-2">
                      <DeliveryForm order={order} onSaved={saved} onCancel={() => setEditing(false)} />
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Состав" icon={<Package size={14} />}>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const src = item.bouquet?.images?.[0]?.url;
                    return (
                      <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg p-2">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                          {src ? <img src={imageUrl(src)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">🌹</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.quantity} x {formatRubles(item.price)}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{formatRubles(item.price * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {order.comment && (
                <Section title="Комментарий клиента" icon={<MessageSquare size={14} />}>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.comment}</p>
                </Section>
              )}

              <Section title="Заметка студии" icon={<NotebookPen size={14} />}>
                <StudioNote key={order.id} order={order} onSaved={saved} />
              </Section>

              <Section
                title="Клиент"
                icon={<User size={14} />}
                action={<Link to={`/users?user=${order.user.id}`} className="text-xs font-medium text-primary hover:underline">Карточка</Link>}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{customerName(order.user)}</span>
                    {platform && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${platform.soft}`}>{platform.tag}</span>}
                    {order.user._count && (
                      <span className="text-xs text-gray-500">
                        {order.user._count.orders === 1 ? 'первый заказ' : `заказов всего: ${order.user._count.orders}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {order.user.phone && <PhoneLink phone={order.user.phone} />}
                    {order.user.username && order.user.telegramId && (
                      <a href={`https://t.me/${order.user.username}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        @{order.user.username}
                      </a>
                    )}
                    {order.customerEmail && <a href={`mailto:${order.customerEmail}`} className="font-medium text-primary hover:underline">{order.customerEmail}</a>}
                  </div>
                  {canMessage ? (
                    <div className="pt-1">
                      <MessageForm
                        key={order.user.id}
                        userId={order.user.id}
                        templates={[
                          { label: 'Уточнить адрес', text: `Здравствуйте! Это студия «Роза цветов». Уточните, пожалуйста, адрес доставки заказа #${order.id}.` },
                          { label: 'Уточнить время', text: `Здравствуйте! Это студия «Роза цветов». Подскажите, пожалуйста, когда удобно доставить заказ #${order.id}?` },
                        ]}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Клиент оформил заказ на сайте: уведомления о статусе ему не приходят, связаться можно по телефону.</p>
                  )}
                </div>
              </Section>

              {breakdown && (
                <Section title="Стоимость" icon={<CreditCard size={14} />}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Товары</span><span className="font-medium">{formatRubles(breakdown.itemsTotal)}</span></div>
                    {breakdown.promoDiscount > 0 && <div className="flex justify-between text-green-600"><span>Промокод {order.promoCode}</span><span>-{formatRubles(breakdown.promoDiscount)}</span></div>}
                    {order.bonusUsed > 0 && <div className="flex justify-between text-green-600"><span>Использовано бонусов</span><span>-{formatRubles(order.bonusUsed)}</span></div>}
                    {order.deliveryType === 'delivery' && breakdown.deliveryPrice >= 0 && (
                      <div className="flex justify-between"><span className="text-gray-500">Доставка</span><span className="font-medium">{breakdown.deliveryPrice > 0 ? formatRubles(breakdown.deliveryPrice) : 'бесплатно'}</span></div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold text-gray-800"><span>Итого</span><span>{formatRubles(order.totalPrice)}</span></div>
                    {order.bonusEarned > 0 && order.status !== 'canceled' && (
                      <div className="flex justify-between text-primary"><span className="flex items-center gap-1"><Star size={12} /> {order.paymentStatus === 'paid' ? 'Начислено бонусов' : 'Начислится после оплаты'}</span><span>+{order.bonusEarned}</span></div>
                    )}
                  </div>
                </Section>
              )}

              <p className="text-xs text-gray-400 text-right">Создан {new Date(order.createdAt).toLocaleString('ru-RU')}</p>
            </div>
          </div>
        )}
      </aside>
      {order && <OrderSlip order={order} />}
    </div>
  );
}
