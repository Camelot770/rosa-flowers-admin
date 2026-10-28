const API_URL = import.meta.env.VITE_API_URL || 'https://roza-cvetov-camelot770.msk1.amvera.tech';

export function imageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}
