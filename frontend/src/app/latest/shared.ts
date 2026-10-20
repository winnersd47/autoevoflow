// Общие типы и хелперы для /latest (список) и /latest/[id] (детальная страница).

export interface PublishedStory {
  modelKey:    string;
  id:          string;
  brand:       string;
  brandSlug:   string;
  name:        string;
  fullName:    string;
  year:        number | null;
  story:       string;        // HTML (<b>/<i> только) — то же тело, что ушло в Telegram
  imageUrl:    string | null;
  pageUrl:     string | null; // ссылка на страницу модели в графе, если есть матч
  source:      string;
  sourceLabel: string;
  publishedAt: string;
}

export interface PublishedData {
  stories:   PublishedStory[];
  updatedAt: string | null;
}

// Живой найденный баг: когда модель склеивает заголовок секции прямо в
// предложение без переноса строки ("🏛 ИСТОРИЕЙ ID.Tiguan стала попытка...")
// — вырезание ВСЕГО остатка строки как "строки-заголовка" схлопывало превью
// в пустую строку, если это происходило сразу во всех 4 секциях. Вырезаем
// только само слово-заголовок (с учётом падежных окончаний и опечатки
// "ЭВОЛЪЮЦИЯ") — остальной текст строки остаётся на месте.
export const SECTION_HEADER_RE = /^(🏛|🧬|⚡|🔮)\s*(?:<[bi]>)?(?:ИСТОРИ[ЕЙЯИ]{1,2}|ЭВОЛ[ЮЪ]ЦИ[ЕЙЯИ]{1,2}|ЧТО\s+ДЕЛАЕТ\s+Е[ЁE]\s+ОСОБЕННОЙ|ПРОГНОЗ)(?:<\/[bi]>)?:?\s*/gmu;

// Строит plain-text превью из HTML-тела поста (убирает теги/эмодзи-заголовки разделов)
export function storyPreview(html: string, maxLen = 220): string {
  const plain = html
    .replace(SECTION_HEADER_RE, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + '…' : plain;
}

// Прокси для netcarshow.com (hotlink protection требует Referer — см. /api/netcarshow-image).
export function imageSrc(imageUrl: string | null): string {
  if (!imageUrl) return '';
  const isNetCarShow = /^https:\/\/(www\.)?netcarshow\.com\//.test(imageUrl);
  return isNetCarShow ? `/api/netcarshow-image?url=${encodeURIComponent(imageUrl)}` : imageUrl;
}
