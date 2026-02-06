const API_URL = import.meta.env.VITE_API_URL || '';

export function imageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}
