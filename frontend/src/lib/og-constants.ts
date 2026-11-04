// Константы и хелперы для opengraph-image.tsx, безопасные для Edge-рантайма
// (никаких fs/path — см. комментарий в начале src/lib/og-image.ts о том,
// почему сами картинки рендерятся на runtime='edge').
export const OG_COLORS = {
  background: '#09080A',
  text: '#F5F0EB',
  muted: '#8C8480',
  primary: '#F97316',
  primaryLight: '#FB923C',
  panelDark: '#1E1A1E',
  panelDarker: '#120F12',
} as const

// Абсолютный origin сайта — next/og сам фетчит <img src> (и мы сами фетчим
// свои og-data роуты), относительные пути не поддерживаются надёжно.
// .env.local держит SITE_URL = прод-домен (используется в постах Telegram),
// что для ЛОКАЛЬНОЙ генерации картинки не подходит — поэтому в dev (next dev
// всегда ставит NODE_ENV=development) бьём напрямую в локальный сервер, а в
// проде используем SITE_URL/фолбэк. OG_SITE_ORIGIN — опциональный явный
// оверрайд на будущее (например, для staging), сейчас нигде не задан.
export function ogSiteOrigin(): string {
  if (process.env.OG_SITE_ORIGIN) return process.env.OG_SITE_ORIGIN.replace(/\/$/, '')
  if (process.env.NODE_ENV !== 'production') return 'http://127.0.0.1:3200'
  return (process.env.SITE_URL || 'https://autoevo.agc-flow.online').replace(/\/$/, '')
}

// Та же логика года, что /brand/[slug]/_client.tsx рисует для модели:
// активная модель — открытый диапазон "2010–", иначе "2010–2015" либо
// одиночный год.
export function yearRangeText(startYear?: number, endYear?: number, isActive?: boolean): string {
  if (!startYear) return ''
  if (isActive) return `${startYear}–`
  if (!endYear || endYear === startYear) return `${startYear}`
  return `${startYear}–${endYear}`
}
