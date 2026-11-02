interface PlatformUser {
  telegramId?: string | null;
  maxId?: string | null;
}

const PLATFORMS = {
  telegram: { tag: 'TG', short: '📱 TG', full: '📱 Telegram', soft: 'bg-blue-50 text-blue-600', strong: 'bg-blue-100 text-blue-700' },
  max: { tag: 'Max', short: '💬 Max', full: '💬 Max', soft: 'bg-purple-50 text-purple-600', strong: 'bg-purple-100 text-purple-700' },
  web: { tag: 'Сайт', short: '🌐 Сайт', full: '🌐 Сайт', soft: 'bg-emerald-50 text-emerald-600', strong: 'bg-emerald-100 text-emerald-700' },
};

// A site order has a guest user with neither messenger id
export function getPlatform(user: PlatformUser) {
  if (user.telegramId) return PLATFORMS.telegram;
  if (user.maxId) return PLATFORMS.max;
  return PLATFORMS.web;
}
