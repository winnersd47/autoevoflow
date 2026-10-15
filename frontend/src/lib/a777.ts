// ─── A777 Integration — types, brand map, URL building, HTML parsing ─────────

export interface A777CarData {
  url: string
  found: boolean
  topSpeed?: number         // km/h
  acceleration?: number     // s (0-100)
  horsepower?: number       // hp
  torque?: number           // Nm
  displacementCc?: number   // cm³
  weightKg?: number         // kg
  priceUsd?: number         // USD
  hpPerTon?: number
  hpPerLiter?: number
  trackTimes?: Partial<Record<TrackKey, string>>
  fetchedAt?: number
  error?: string
}

export type TrackKey = 'nurburgring' | 'topgear' | 'hockenheim' | 'tsukuba'

export const TRACK_META: Record<TrackKey, { label: string; url: string; emoji: string }> = {
  nurburgring: {
    label: 'Нюрбургринг',
    url:   'https://www.a777aa77.ru/tracks/nurburgring-nordschleife-germany-lap-times/',
    emoji: '🇩🇪',
  },
  topgear: {
    label: 'Top Gear',
    url:   'https://www.a777aa77.ru/tracks/top-gear-track-great-britain-lap-times/',
    emoji: '🇬🇧',
  },
  hockenheim: {
    label: 'Hockenheim',
    url:   'https://www.a777aa77.ru/tracks/hockenheim-short-germany-lap-times/',
    emoji: '🇩🇪',
  },
  tsukuba: {
    label: 'Tsukuba',
    url:   'https://www.a777aa77.ru/tracks/tsukuba-circuit-japan-lap-times/',
    emoji: '🇯🇵',
  },
}

// our brandId → A777 brand slug in URL
export const A777_BRAND_MAP: Record<string, string> = {
  'ferrari':       'ferrari',
  'lamborghini':   'lamborghini',
  'porsche':       'porsche',
  'mercedes':      'mercedes-benz',
  'bmw':           'bmw',
  'audi':          'audi',
  'mclaren':       'mclaren',
  'bugatti':       'bugatti',
  'koenigsegg':    'koenigsegg',
  'pagani':        'pagani',
  'rimac':         'rimac',
  'rolls-royce':   'rolls-royce',
  'bentley':       'bentley',
  'astonmartin':   'aston-martin',
  'lotus':         'lotus',
  'maserati':      'maserati',
  'alfa-romeo':    'alfa-romeo',
  'ford':          'ford',
  'toyota':        'toyota',
  'lexus':         'lexus',
  'nissan':        'nissan',
  'honda':         'honda',
  'mazda':         'mazda',
  'volkswagen':    'volkswagen',
  'seat':          'seat',
  'skoda':         'skoda',
  'hennessey':     'hennessey',
  'ssc':           'ssc',
  'saleen':        'saleen',
  'gordon-murray': 'gordon-murray-automotive',
  'de-tomaso':     'de-tomaso',
  'morgan':        'morgan',
  'tvr':           'tvr',
  'caterham':      'caterham',
  'aspark':        'aspark',
  'pininfarina':   'pininfarina',
  'hispano-suiza': 'hispano-suiza',
  'zenvo':         'zenvo',
  'jaguar':        'jaguar',
  'land-rover':    'land-rover',
  // Расширено до всех брендов графа — А777 покрывает не только экзотику, часть
  // mainstream/EV-брендов реально может там найтись. Скрипт enrich-a777.js сам
  // отбрасывает то, что не найдено (404 / короткий ответ), риска нет.
  'dodge': 'dodge', 'chevrolet': 'chevrolet', 'subaru': 'subaru', 'citroen': 'citroen',
  'hyundai': 'hyundai', 'mitsubishi': 'mitsubishi', 'jeep': 'jeep', 'peugeot': 'peugeot',
  'pontiac': 'pontiac', 'cadillac': 'cadillac', 'kia': 'kia', 'volvo': 'volvo',
  'mini': 'mini', 'renault': 'renault', 'lincoln': 'lincoln', 'opel': 'opel',
  'genesis': 'genesis', 'rezvani': 'rezvani', 'lada': 'lada', 'byd': 'byd',
  'fiat': 'fiat', 'lancia': 'lancia', 'ram': 'ram', 'chrysler': 'chrysler',
  'gmc': 'gmc', 'suzuki': 'suzuki', 'saturn': 'saturn', 'gaz': 'gaz',
  'nio': 'nio', 'acura': 'acura', 'isuzu': 'isuzu', 'infiniti': 'infiniti',
  'tesla': 'tesla', 'saab': 'saab', 'scion': 'scion', 'ariel': 'ariel',
  'changan': 'changan', 'moskvich': 'moskvich', 'plymouth': 'plymouth', 'dacia': 'dacia',
  'geely': 'geely', 'alpine': 'alpine', 'smart': 'smart', 'xpeng': 'xpeng',
  'amc': 'amc', 'zeekr': 'zeekr', 'haval': 'haval', 'li-auto': 'li-auto',
  'cupra': 'cupra', 'uaz': 'uaz', 'lynk-co': 'lynk-co', 'polestar': 'polestar',
  'buick': 'buick', 'daihatsu': 'daihatsu', 'oldsmobile': 'oldsmobile', 'aito': 'aito',
  'denza': 'denza', 'gac': 'gac', 'aurus': 'aurus', 'rivian': 'rivian',
  'lucid': 'lucid', 'hummer': 'hummer', 'hiphi': 'hiphi', 'avatr': 'avatr',
  'ktm': 'ktm', 'bac': 'bac', 'hudson': 'hudson', 'mercury': 'mercury',
  'seres': 'seres', 'naran': 'naran', 'baic': 'baic', 'ds': 'ds',
  'mg': 'mg', 'gma': 'gma', 'czinger': 'czinger',
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Build candidate URLs to try in order
export function buildCandidateUrls(
  a777Brand: string,
  year: number,
  modelName: string,
  codeName?: string,
): string[] {
  const slug  = toSlug(modelName)
  const code  = codeName ? toSlug(codeName) : ''
  const base  = `https://www.a777aa77.ru`
  const pfx   = `${base}/${year}-${a777Brand}`

  const urls: string[] = [
    `${pfx}-${slug}.php`,
  ]
  if (code && code !== slug) {
    urls.push(`${pfx}-${slug}-${code}.php`)
    urls.push(`${pfx}-${code}.php`)
  }
  // try without the model slug (just year-brand.php for edge cases)
  // and try brand catalog as fallback for searching
  urls.push(`${base}/cars/${a777Brand}/`)

  const seen = new Set<string>()
  return urls.filter(u => { if (seen.has(u)) return false; seen.add(u); return true })
}

// ─── HTML → data ─────────────────────────────────────────────────────────────

function extract(html: string, ...patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/[\s,]/g, ''))
      if (!isNaN(n) && n > 0) return n
    }
  }
  return undefined
}

function sanity(val: number | undefined, min: number, max: number): number | undefined {
  return val != null && val >= min && val <= max ? val : undefined
}

export function parseA777Html(html: string): Omit<A777CarData, 'url' | 'found' | 'fetchedAt'> {
  // A777 pages are UTF-8. Key specs appear both in meta description and body tables.
  const raw = {
    topSpeed: extract(html,
      /скорост[ьи][^<]{0,60}(\d{2,3})\s*км\/ч/i,
      /(\d{2,3})\s*км\/ч/,
      /(\d{2,3})\s*km\/h/i,
    ),
    acceleration: extract(html,
      /разгон[^<]{0,80}?(\d+[.,]\d+)\s*сек/i,
      /разгон[^<]{0,80}?(\d+[.,]\d+)\s*с\b/i,
      /0[–\-−]100[^<]{0,40}?(\d+[.,]\d+)/i,
      /(\d+[.,]\d+)\s*сек/i,
    ),
    horsepower: extract(html,
      /мощност[ьи][^<]{0,60}(\d{3,5})\s*л\.с\./i,
      /(\d{3,5})\s*л\.с\./,
      /(\d{3,5})\s*hp\b/i,
    ),
    torque: extract(html,
      /Крутящий момент[^<]{0,60}?(\d{3,5})/i,
      /момент[^<]{0,40}(\d{3,5})/i,
      /(\d{3,5})\s*Нм/,
      /(\d{3,5})\s*Nm/i,
    ),
    displacementCc: extract(html,
      /объ[её]м[^<]{0,60}?(\d{4,5})/i,
      /(\d{4,5})\s*см³/,
      /(\d{4,5})\s*cm³/i,
    ),
    weightKg: extract(html,
      /(?:масс[аы]|вес)[^<]{0,80}?(\d{3,5})\s*кг/i,
      /(\d{3,5})\s*кг(?:\s|[.,<]|$)/,
      /(\d{3,5})\s*kg(?:\s|[.,<]|$)/i,
    ),
    priceUsd: extract(html,
      /\$\s*([\d,]{3,12})/,
      /цен[аы][^<$]{0,20}\$\s*([\d,]+)/i,
    ),
    hpPerTon: extract(html,
      /(\d{2,4})\s*л\.с\.\/т/,
      /(\d{2,4})\s*hp\/t/i,
    ),
    hpPerLiter: extract(html,
      /(\d{2,4})\s*л\.с\.\/л/,
      /(\d{2,4})\s*hp\/l/i,
    ),
  }
  return {
    topSpeed:       sanity(raw.topSpeed,       100,  600),
    acceleration:   sanity(raw.acceleration,   0.5,   30),
    horsepower:     sanity(raw.horsepower,      50, 3000),
    torque:         sanity(raw.torque,          50, 3000),
    displacementCc: sanity(raw.displacementCc, 500, 10000),
    weightKg:       sanity(raw.weightKg,       500,  5000),
    priceUsd:       sanity(raw.priceUsd,      1000, 50_000_000),
    hpPerTon:       sanity(raw.hpPerTon,        50,  2000),
    hpPerLiter:     sanity(raw.hpPerLiter,      20,   700),
  }
}

// Track URL slugs as they appear in A777 car pages
const TRACK_SLUG_MAP: Record<TrackKey, string> = {
  nurburgring: 'nurburgring-nordschleife',
  topgear:     'top-gear-track',
  hockenheim:  'hockenheim-short',
  tsukuba:     'tsukuba-circuit',
}

// Extract lap times from the car's own A777 page.
// A777 embeds each track's time in a "brands-year" span just before the track link.
export function parseTrackTimes(html: string): Partial<Record<TrackKey, string>> {
  const result: Partial<Record<TrackKey, string>> = {}
  for (const [key, slug] of Object.entries(TRACK_SLUG_MAP) as [TrackKey, string][]) {
    const idx = html.indexOf(slug)
    if (idx < 0) continue
    const before = html.slice(Math.max(0, idx - 200), idx)
    const m = before.match(/(\d+:\d{2}[.,]\d+)\s*</)
    if (m?.[1]) result[key] = m[1].replace(',', '.')
  }
  return result
}
