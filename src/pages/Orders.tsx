import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Truck, Store, RefreshCw, Download, Clock, MapPin, Gift, X } from 'lucide-react';
import api from '../api/client';
import { imageUrl } from '../utils/image';
import { getPlatform } from '../utils/platform';
import { formatAddress } from '../utils/address';
import { downloadCsv } from '../utils/csv';
import { dayLabel, formatRubles, isIsoDate, plural, studioDate, telHref } from '../utils/format';
import {
  ACTIVE_STATUSES, Order, customerName, isOverdue, nextStatus, nextStepLabel,
  paymentColors, paymentLabels, plainAddress, statusColors, statusLabel,
} from '../utils/orders';
import { useOrderActions } from '../components/useOrderActions';
import { useOrderSummary } from '../components/OrderSummary';
import OrderDrawer from '../components/OrderDrawer';

const VIEWS = [
  { key: 'active', label: 'В работе' },
  { key: 'new', label: 'Ждут оплаты' },
  { key: 'confirmed', label: 'Подтверждённые' },
  { key: 'preparing', label: 'Готовятся' },
  { key: 'delivering', label: 'В доставке' },
  { key: 'completed', label: 'Выполненные' },
  { key: 'canceled', label: 'Отменённые' },
  { key: 'all', label: 'Все' },
];

const DATE_CHIPS = [
  { key: '', label: 'Любая дата' },
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'overdue', label: 'Просроченные' },
];

const PAGE_SIZE = 50;

// Work is planned by the delivery day, finished orders are looked up by when they came in
const WORK_VIEWS = ['active', 'confirmed', 'preparing', 'delivering'];

function inView(order: Order, view: string): boolean {
  if (view === 'all') return true;
  if (view === 'active') return ACTIVE_STATUSES.includes(order.status);
  return order.status === view;
}

function onDate(order: Order, date: string): boolean {
  if (!date) return true;
  if (date === 'today') return order.deliveryDate === studioDate();
  if (date === 'tomorrow') return order.deliveryDate === studioDate(1);
  if (date === 'overdue') return isOverdue(order);
  return order.deliveryDate === date;
}

function matchesSearch(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const phones = [order.user.phone, order.recipientPhone].map((phone) => (phone || '').replace(/\D/g, ''));
  if (digits.length >= 3 && phones.some((phone) => phone.includes(digits))) return true;
  return [
    `#${order.id}`,
    customerName(order.user),
    order.user.username,
    order.recipientName,
    order.comment,
    order.adminNote,
    order.cardText,
    order.customerEmail,
    order.address && formatAddress(order.address),
    ...order.items.map((item) => item.name),
  ].some((text) => (text || '').toLowerCase().includes(q));
}

function compareByDelivery(a: Order, b: Order): number {
  const aDate = isIsoDate(a.deliveryDate) ? a.deliveryDate : '9999';
  const bDate = isIsoDate(b.deliveryDate) ? b.deliveryDate : '9999';
  if (aDate !== bDate) return aDate < bDate ? -1 : 1;
  const start = (order: Order) => parseInt(order.deliveryTime || '') || 99;
  return start(a) - start(b) || a.id - b.id;
}

function NextStep({ order, busy, onClick, className = '' }: { order: Order; busy: boolean; onClick: () => void; className?: string }) {
  if (!nextStatus(order)) return null;
  return (
    <button
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 ${
        order.status === 'new'
          ? 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          : 'bg-primary text-white hover:bg-primary/90'
      } ${className}`}
    >
      {nextStepLabel(order)}
    </button>
  );
}

function Thumb({ order }: { order: Order }) {
  const src = order.items[0]?.bouquet?.images?.[0]?.url;
  return (
    <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
      {src
        ? <img src={imageUrl(src)} alt="" loading="lazy" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">🌹</div>}
    </div>
  );
}

function Items({ order }: { order: Order }) {
  return (
    <div className="min-w-0">
      {order.items.slice(0, 2).map((item) => (
        <div key={item.id} className="truncate text-sm text-gray-800">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</div>
      ))}
      {order.items.length > 2 && <div className="text-xs text-gray-400">и ещё {order.items.length - 2}</div>}
    </div>
  );
}

function Pills({ order }: { order: Order }) {
  return (
    <>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
        {statusLabel(order)}
      </span>
      {order.status !== 'new' && order.paymentStatus !== 'paid' && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
          {paymentLabels[order.paymentStatus] || order.paymentStatus}
        </span>
      )}
      {isOverdue(order) && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-600 text-white">Просрочен</span>}
    </>
  );
}

function When({ order }: { order: Order }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {order.deliveryType === 'pickup' ? <Store size={14} className="text-gray-400 shrink-0" /> : <Truck size={14} className="text-gray-400 shrink-0" />}
      {order.deliveryTime || (order.deliveryType === 'pickup' ? 'Самовывоз' : 'Время не указано')}
    </span>
  );
}

interface RowProps {
  order: Order;
  busy: boolean;
  onOpen: () => void;
  onNext: () => void;
  showDay: boolean;
}

function OrderCard({ order, busy, onOpen, onNext, showDay }: RowProps) {
  return (
    <article onClick={onOpen} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-800 mr-1">#{order.id}</span>
        <Pills order={order} />
        <span className="text-sm font-semibold text-gray-800 ml-auto">{formatRubles(order.totalPrice)}</span>
      </div>
      <div className="flex items-center gap-3">
        <Thumb order={order} />
        <Items order={order} />
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <div className={`flex items-center gap-1.5 ${isOverdue(order) ? 'text-red-600 font-medium' : ''}`}>
          {showDay && <><Clock size={14} className="text-gray-400 shrink-0" />{dayLabel(order.deliveryDate)},</>}
          <When order={order} />
        </div>
        {order.address && (
          <div className="flex items-start gap-1.5">
            <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{plainAddress(order.address)}</span>
          </div>
        )}
        {(order.recipientName || order.recipientPhone) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Gift size={14} className="text-gray-400 shrink-0" />
            {order.recipientName && <span>{order.recipientName}</span>}
            {order.recipientPhone && (
              <a href={telHref(order.recipientPhone)} onClick={(e) => e.stopPropagation()} className="font-medium text-primary">
                {order.recipientPhone}
              </a>
            )}
          </div>
        )}
      </div>
      <NextStep order={order} busy={busy} onClick={onNext} className="w-full py-2.5 text-sm" />
    </article>
  );
}

function OrderRow({ order, busy, onOpen, onNext, showDay }: RowProps) {
  const platform = getPlatform(order.user);
  return (
    <tr onClick={onOpen} className="hover:bg-gray-50 transition-colors cursor-pointer">
      <td className={`px-3 py-3 whitespace-nowrap ${isOverdue(order) ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
        {showDay && <div className="font-medium">{dayLabel(order.deliveryDate)}</div>}
        <When order={order} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <Thumb order={order} />
          <div className="min-w-0">
            <div className="text-xs text-gray-500">#{order.id}</div>
            <Items order={order} />
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {order.address
          ? <div className="text-gray-700 line-clamp-2">{plainAddress(order.address)}</div>
          : <div className="text-gray-500">Самовывоз</div>}
        {order.recipientName && <div className="text-xs text-gray-500 truncate">Получатель: {order.recipientName}</div>}
      </td>
      <td className="px-3 py-3">
        <div className="text-gray-800 font-medium truncate">{customerName(order.user)}</div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${platform.soft}`}>{platform.tag}</span>
          {order.user.phone && (
            <a href={telHref(order.user.phone)} onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline truncate">{order.user.phone}</a>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-gray-800 whitespace-nowrap mb-1">{formatRubles(order.totalPrice)}</div>
        <div className="flex flex-wrap gap-1"><Pills order={order} /></div>
      </td>
      <td className="px-3 py-3 text-right">
        <NextStep order={order} busy={busy} onClick={onNext} />
      </td>
    </tr>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'active';
  const date = params.get('date') || '';
  const openId = parseInt(params.get('order') || '') || null;
  const sort = params.get('sort') || (WORK_VIEWS.includes(view) ? 'delivery' : 'newest');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { summary } = useOrderSummary();

  const fetchOrders = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return api.get('/orders')
      .then((res) => { setOrders(res.data); setError(''); })
      .catch(() => { if (!silent) setError('Не удалось загрузить заказы'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [view, date, sort, search]);

  const { updatingId, advance } = useOrderActions(() => fetchOrders(true));

  const setParam = (changes: Record<string, string | null>, push = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setParams(next, { replace: !push });
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    VIEWS.forEach(({ key }) => { result[key] = orders.filter((order) => inView(order, key)).length; });
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    const list = orders.filter((order) => inView(order, view) && onDate(order, date) && matchesSearch(order, search));
    return sort === 'delivery'
      ? [...list].sort(compareByDelivery)
      : [...list].sort((a, b) => b.id - a.id);
  }, [orders, view, date, search, sort]);

  const shown = filtered.slice(0, visible);

  // Under the delivery sort the day becomes a heading, so rows repeat only the time
  const groups = useMemo(() => {
    if (sort !== 'delivery') return [{ key: 'all', label: '', orders: shown }];
    const result: { key: string; label: string; orders: Order[] }[] = [];
    shown.forEach((order) => {
      const key = order.deliveryDate || '';
      const last = result[result.length - 1];
      if (last && last.key === key) last.orders.push(order);
      else result.push({ key, label: dayLabel(order.deliveryDate), orders: [order] });
    });
    return result;
  }, [shown, sort]);

  const exportCsv = () => {
    downloadCsv(
      `Заказы ${studioDate()}.csv`,
      ['Заказ', 'Статус', 'Оплата', 'Дата доставки', 'Время', 'Способ', 'Адрес', 'Получатель', 'Телефон получателя', 'Клиент', 'Телефон клиента', 'Состав', 'Сумма', 'Создан', 'Заметка студии'],
      filtered.map((order) => [
        order.id,
        statusLabel(order),
        paymentLabels[order.paymentStatus] || order.paymentStatus,
        order.deliveryDate,
        order.deliveryTime,
        order.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка',
        order.address ? plainAddress(order.address) : '',
        order.recipientName,
        order.recipientPhone,
        customerName(order.user),
        order.user.phone,
        order.items.map((item) => `${item.name} x${item.quantity}`).join(', '),
        order.totalPrice,
        new Date(order.createdAt).toLocaleString('ru-RU'),
        order.adminNote,
      ]),
    );
  };

  const customDate = date && !DATE_CHIPS.some((chip) => chip.key === date) ? date : '';
  const hasFilters = !!(date || search.trim());
  const chip = 'px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-800">Заказы</h1>
          <button
            onClick={() => fetchOrders()}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="Обновить"
            aria-label="Обновить"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-40"
            title="Скачать таблицу для Excel"
            aria-label="Скачать таблицу для Excel"
          >
            <Download size={16} />
          </button>
        </div>
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Номер, имя, телефон, букет, адрес"
            className="pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Очистить поиск" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Status views */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setParam({ view: key === 'active' ? null : key, sort: null })}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              view === key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${view === key ? 'bg-white/20' : 'bg-gray-100'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Delivery date and sort */}
      <div className="flex flex-wrap items-center gap-2">
        {DATE_CHIPS.map(({ key, label }) => (
          <button
            key={key || 'any'}
            onClick={() => setParam({ date: key || null })}
            className={`${chip} ${date === key ? 'bg-ink text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
        <input
          type="date"
          aria-label="Дата доставки"
          value={customDate}
          onChange={(e) => setParam({ date: e.target.value || null })}
          className="px-2.5 py-1 text-xs border border-gray-200 rounded-full"
        />
        <select
          aria-label="Порядок"
          value={sort}
          onChange={(e) => setParam({ sort: e.target.value })}
          className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-full sm:ml-auto"
        >
          <option value="delivery">Сначала ближайшая доставка</option>
          <option value="newest">Сначала новые заказы</option>
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center text-gray-500 text-sm py-12 px-4 space-y-2">
          <p>{hasFilters ? 'С такими условиями заказов нет' : view === 'active' ? 'В работе сейчас ничего нет' : 'Заказов пока нет'}</p>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setParam({ date: null }); }} className="font-medium text-primary hover:underline">
              Сбросить условия
            </button>
          )}
          {!hasFilters && view === 'active' && !!summary?.awaitingPayment && (
            <Link to="/orders?view=new" className="font-medium text-primary hover:underline">
              Посмотреть заказы, которые ждут оплаты: {summary.awaitingPayment}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* One table for a wide screen, so the columns line up across the days */}
          <div className="hidden xl:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-36" />
                <col className="w-52" />
                <col />
                <col className="w-44" />
                <col className="w-36" />
                <col className="w-36" />
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Когда</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Заказ</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Куда</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Клиент</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Сумма и статус</th>
                  <th className="px-3 py-2.5"><span className="sr-only">Следующий шаг</span></th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.key} className="divide-y divide-gray-100 border-b border-gray-100 last:border-b-0">
                  {sort === 'delivery' && (
                    <tr className="bg-paper/60">
                      <th colSpan={6} scope="rowgroup" className={`text-left px-3 py-2 text-sm font-semibold ${isIsoDate(group.key) && group.key < studioDate() && WORK_VIEWS.includes(view) ? 'text-red-600' : 'text-gray-700'}`}>
                        {group.label}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {group.orders.length} {plural(group.orders.length, 'заказ', 'заказа', 'заказов')}
                        </span>
                      </th>
                    </tr>
                  )}
                  {group.orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      busy={updatingId === order.id}
                      showDay={sort !== 'delivery'}
                      onOpen={() => setParam({ order: String(order.id) }, true)}
                      onNext={() => advance(order)}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* Cards for everything narrower */}
          {groups.map((group) => (
            <section key={group.key} className="xl:hidden space-y-2">
              {sort === 'delivery' && (
                <h2 className={`text-sm font-semibold flex items-center gap-2 ${isIsoDate(group.key) && group.key < studioDate() && WORK_VIEWS.includes(view) ? 'text-red-600' : 'text-gray-700'}`} style={{ fontFamily: 'inherit', letterSpacing: 0 }}>
                  {group.label}
                  <span className="text-xs font-normal text-gray-500">
                    {group.orders.length} {plural(group.orders.length, 'заказ', 'заказа', 'заказов')}
                  </span>
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    busy={updatingId === order.id}
                    showDay={sort !== 'delivery'}
                    onOpen={() => setParam({ order: String(order.id) }, true)}
                    onNext={() => advance(order)}
                  />
                ))}
              </div>
            </section>
          ))}

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((current) => current + PAGE_SIZE)}
              className="w-full py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Показать ещё, осталось {filtered.length - visible}
            </button>
          )}
        </div>
      )}

      {openId && (
        <OrderDrawer
          orderId={openId}
          preview={orders.find((order) => order.id === openId)}
          onClose={() => setParam({ order: null })}
          onChanged={() => fetchOrders(true)}
        />
      )}
    </div>
  );
}
