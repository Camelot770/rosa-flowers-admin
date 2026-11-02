export function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function plural(n: number, one: string, few: string, many: string): string {
  const tens = n % 100;
  const units = n % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

// A date on the studio's clock as YYYY-MM-DD, Kazan is UTC+3
export function studioDate(offsetDays = 0): string {
  return new Date(Date.now() + (3 + offsetDays * 24) * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isIsoDate(value?: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// "Сегодня", "Завтра" or "5 ноября". Older orders may hold a date in another format, it is shown as it is.
export function dayLabel(date?: string | null): string {
  if (!date) return 'Без даты';
  if (!isIsoDate(date)) return date;
  if (date === studioDate()) return 'Сегодня';
  if (date === studioDate(1)) return 'Завтра';
  if (date === studioDate(-1)) return 'Вчера';
  return calendarDate(date);
}

// For what leaves the screen, a printed slip or a message: "сегодня" stops being true there
export function calendarDate(date?: string | null): string {
  if (!date) return 'Без даты';
  if (!isIsoDate(date)) return date;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(String(year) === studioDate().slice(0, 4) ? {} : { year: 'numeric' as const }),
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
