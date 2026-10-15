/**
 * scrape-latest.js — парсит новинки авто с нескольких источников
 *
 * Источники:
 *   1.  netcarshow.com/latest-cars.html              — официальные новинки (HTML)
 *   2.  netcarshow.com/explore/concept/              — концепт-кары (HTML)
 *   3.  thedrive.com/feed                            — RSS
 *   6.  jalopnik.com/rss                             — RSS
 *   7.  carscoops.com/feed/                          — RSS
 *   8.  caranddriver.com/rss/all.xml                 — RSS
 *   9.  motor1.com/rss/news/all/                     — RSS
 *   10. roadandtrack.com/rss/all.xml                 — RSS
 *   11. autoevolution.com/rss/news.xml               — RSS (исторические модели)
 *   12. benztuning.com/feeds/posts/default?alt=rss   — RSS (редкие AMG/Brabus/Kicherer)
 *   15. insideevs.com/rss/articles/all/              — RSS (EV-специализация)
 *   16. electrek.co/feed/                            — RSS (EV/clean energy, тесла-тяжёлый)
 *   17. autoweek.com/rss/all.xml/                    — RSS
 *   18. torquenews.com/rss.xml                       — RSS
 *
 * Проверено вручную 2026-08-24: autocar.co.uk, topgear.com, greencarreports.com,
 * motorauthority.com, motortrend.com, carthrottle.com — все либо 403 (Cloudflare/
 * бот-защита), либо 404/недействительный feed URL при обычном fetch с браузерным
 * User-Agent. Не добавлены — не работают без headless-браузера, отдельная и
 * значительно более тяжёлая задача.
 *
 * Убраны из SOURCES 2026-09-07 (см. scripts/*.js git history для функций —
 * оставлены нетронутыми на случай починки):
 *   - carbuzz.com/cars/rss/    — "fetch failed", 0% успех за 190 прогонов подряд.
 *   - classicdriver.com/en/rss — HTTP 403, 0% успех за 190 прогонов подряд.
 *   - hagerty.com/media/feed   — HTTP 403, 0% успех за 190 прогонов подряд.
 *   - driving.ca/feed          — убран по решению пользователя, не по поломке.
 *
 * Запуск: node scripts/scrape-latest.js
 * Результат: public/data/latest-cars.json
 * После: автоматически запускает sync + enrich-graph-hp + enrich-a777 --new
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const OUT  = path.join(__dirname, '../public/data/latest-cars.json')
const ROOT = path.join(__dirname, '..')

// ─── Fetch helper (Node 18+ native fetch) ─────────────────────────────────────
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Accept': 'text/html,application/xml,application/rss+xml,*/*;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

async function fetchText(url, timeoutMs = 20000) {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
    return await res.text()
  } catch (e) {
    throw new Error(e.message || String(e))
  }
}

// ─── Brand patterns for RSS title matching ────────────────────────────────────
const BRAND_RE = /\b(BMW|Mercedes[\s-]?Benz|Mercedes|Audi|Porsche|Ferrari|Lamborghini|Toyota|Honda|Ford|Chevrolet|Dodge|Jeep|Cadillac|Tesla|Rivian|Lucid|Volkswagen|Volvo|Jaguar|Range Rover|Land Rover|Bentley|Rolls[\s-]?Royce|Bugatti|McLaren|Aston Martin|Koenigsegg|Pagani|Nissan|Mazda|Subaru|Hyundai|Kia|Genesis|Lexus|Infiniti|Acura|Alfa Romeo|Maserati|Fiat|Lotus|Mini|Peugeot|Renault|Citroën|Skoda|Seat|Opel|GMC|Ram|Lincoln|Buick|Hennessey|SSC|Saleen|Rimac|Gordon Murray|Zenvo|Hispano Suiza|BAIC|Geely|BYD|NIO|Xpeng|Li Auto|Changan|Haval|Great Wall|Zeekr|Lynk|Avatr|HiPhi|Denza|Aito|Seres|Rezvani|Ariel|Caterham|Lotus|Radical|BAC|KTM|Brabus|Alpina|RUF|Gemballa|Hamann|Mansory|ABT|AC Schnitzer|Lorinser|Koenig|Startech|TechArt|MTM|Hartge|Heico|Irmscher|Oettinger|Prior Design|Lumma|G-Power|Edo Competition)\b/i

const SKIP_PATTERNS = [
  /\bsales figure\b|\bmonthly sales\b|\bannual sales\b/i,
  /\brecall\b|\bcrash\b|\baccident\b|\bcollision\b/i,
  /\blawsuit\b|\bfined\b|\bpenalty\b|\btax\b/i,
  /\bGPS led\b|\bfollowed.*GPS\b|\bsunroof.*fl[ew]\b/i,
  /\bCDL\b|\bdriver.*licen\b/i,
  /\bphone\b|\bgadget\b|\btiktok\b/i,
  /\bshut.*plant\b|\blayoff\b|\bdealer.*pric\b/i,
]

const REQUIRE_CAR_WORDS = [
  /\b(reveal|debut|launch|introduce|unveil|spy|concept|production|facelift|refresh|successor|replacement|next.gen|first look|preview|leaked|rendered)\b/i,
  /\b(19|20)\d{2}\s+\w/,
  /\bnew\s+\w+\s+(coupe|sedan|suv|roadster|hatchback|wagon|crossover|pickup)\b/i,
  /\b(limited|edition|bespoke|exclusive|one.?off|anniversary|collector|heritage|auction|rare|coachbuilt|atelier|tuner|tuning|widebody|biturbo)\b/i,
]

function isRelevantTitle(title) {
  if (SKIP_PATTERNS.some(p => p.test(title))) return false
  return REQUIRE_CAR_WORDS.some(p => p.test(title))
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Извлекает чистое название модели из заголовка RSS-статьи.
// "Tested: 2027 Ram 1500 TRX SRT—the Beast Is Back" → "2027 Ram 1500 TRX SRT"
// "2027 Audi RS Q8" → "2027 Audi RS Q8"  (уже чистое)
// "Ruf's Next Car Will Have 1000 HP"      → null (нет года — не модель)
const STOP_VERBS = /(\s+(Is|Are|Has|Have|Gets?|Got|Will|Goes?|Makes?|Debuts?|Returns?|Arrives?|Reveals?|Launches?|Brings?|Sets?|Combines?|Ditches?|Drops?|Adds?|Loses?|Gains?|Swaps?|Receives?|Adopts?|Features?|Packs?|Offers?|Wants?|Celebrates?|Drives?|Driven|Starts?|Costs?|Pricing|Ups|Production|Delayed|Recall|Review|Tested|Spied|Vs\.|Push|With\s|And\s|The\s|At\s|Of\s|From\s|,|\?|!)|\s*[–—]).*/i

// Структурный обрыв на маркерах, после которых заведомо идёт редакционный
// текст, а не имя модели — двоеточие, точка с запятой, $ (цена), апостроф
// сокращения (не только притяжательное 's, но и wasn't/isn't/here's/it's —
// любое сокращение сигналит, что дальше идёт предложение, не имя), тире,
// инфинитивное "to" ("2028 Dodge Charger to Get Hemi V8" — всё после "to"
// неизбежно глагол/сказуемое, живой найденный баг: без этого маркера имя
// обрывалось на самом "to", оставляя "2028 Dodge Charger to").
// Живой урок этой же сессии из a777-lib.js: список конкретных "плохих слов"
// (STOP_VERBS выше) в принципе не может быть полным — каждый новый заголовок
// приносит новый глагол ("Wants", "Celebrates" добавлены выше по факту утечки,
// не заранее; "Wasn't" в исходном мотивирующем примере всё ещё не ловился бы
// одним только списком глаголов, потому что это сокращение, а не глагол).
// Обрыв по СТРУКТУРЕ, а не по словарю, ловит любой ещё не встреченный случай
// того же типа сразу, а не по одному слову за раз.
const HARD_STOP_RE = /[:;?!$]|\S*'(s|t|re|ll|ve|d)\b|[–—]|\s+to\b/i

function extractCarName(raw) {
  const title = raw.replace(/&#\d+;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()

  // Убираем типичные статейные префиксы СНАЧАЛА — некоторые сами содержат 's
  // ("Here's the New…"), иначе структурный обрыв ниже отрежет сам префикс
  // раньше, чем мы успеем его снять. Раньше здесь стояло "Watch\b[^:]*" /
  // "See\b[^:]+" — жадные квантификаторы БЕЗ колонки в заголовке съедали
  // вообще всё до конца строки (реальный найденный баг: "Here's the New 2027
  // BMW M3 CS" превращалось в голое "CS", а не "2027 BMW M3 CS", потому что
  // [^:]* при отсутствии ':' жадно захватывал всё до последнего пробела).
  // Теперь снимаем ТОЛЬКО само служебное слово + опциональную ':' + пробелы —
  // не больше.
  let t = title.replace(
    /^(Tested|Reviewed?|Revealed?|Spied|First (?:Look|Drive|Ride)|Preview|Exclusive|Watch|See|Here'?s?|Video|New Model)\s*:?\s+/i, ''
  ).trim()

  t = t.split(HARD_STOP_RE)[0].trim()

  // Уже чистое: год в начале, короткое, без стоп-глаголов, содержит известный бренд
  if (/^(19|20)\d\d [A-Z]/.test(t) && t.length <= 52 && !STOP_VERBS.test(t) && BRAND_RE.test(t)) return t

  // Находим год — с него начинается название (19XX и 20XX)
  const yi = t.search(/\b(19|20)\d\d\b/)
  if (yi === -1) return null
  t = t.slice(yi).replace(STOP_VERBS, '').trim()

  // Обязательно должен быть известный бренд
  const brandMatch = t.match(BRAND_RE)
  if (!brandMatch) return null

  // Живой баг: "Toyota's New MR2 Might Arrive In 2028 Without A Single Toyota
  // Badge" — найденный по regex год ("2028") тут не модельный год, а просто
  // упоминание внутри предложения ("arrive IN 2028"), и срез от него ловит
  // хвост фразы, а не имя. Бренд "Toyota" формально в срезе ЕСТЬ (в самом
  // конце, "Toyota Badge"), но проверка BRAND_RE.test(t) выше это не различает.
  // Настоящее "Год Бренд Модель" всегда начинает бренд сразу после года (плюс
  // максимум пара служебных слов вроде "New") — если бренд заметно дальше,
  // найденный год не тот, и весь срез — не имя, а обрывок предложения.
  const beforeBrand = t.slice(0, brandMatch.index).trim()
  const nonYearWordsBeforeBrand = beforeBrand.split(/\s+/).filter(w => w && !/^(19|20)\d\d$/.test(w))
  if (nonYearWordsBeforeBrand.length > 2) return null

  // Страховка от ещё не встреченного глагола/маркера, который не поймали ни
  // HARD_STOP_RE, ни STOP_VERBS: реальное имя модели после года — максимум
  // несколько токенов трима/поколения ("M5 Competition xDrive", "911 GT3 RS",
  // "Defender 130 V8 Carpathian Edition"). Длиннее — почти наверняка уже
  // предложение, а не название.
  const tokens = t.split(/\s+/)
  if (tokens.length > 8) t = tokens.slice(0, 8).join(' ')

  return (t.length >= 8 && t.length <= 56) ? t : null
}

// Сборщик car-объекта из RSS-item с очисткой имени
function buildRssCar(prefix, sourceId, sourceLabel, i) {
  const name = extractCarName(i.title)
  if (!name) return null
  const slug = i.link.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '').replace(/\//g, '-')
  return {
    id:          `${prefix}-${slug.substring(0, 60)}`,
    source:      sourceId,
    sourceLabel,
    brand:       i.brand,
    brandSlug:   slugify(i.brand),
    name,
    fullName:    name,
    year:        i.year,
    description: i.description,
    pageUrl:     i.link,
    thumbUrl:    i.imageUrl,
    imageUrl:    i.imageUrl,
    scrapedAt:   new Date().toISOString(),
  }
}

// ─── Source 1 & 2: NetCarShow HTML ───────────────────────────────────────────
async function scrapeNetCarShowPage(url, sourceTag) {
  const html = await fetchText(url, 30000)
  const cars = []
  const blockRe = /<li\s+class="swSBE">([\s\S]*?)<\/li>/gi
  let m
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1]
    const imgM  = block.match(/src="(\/R\/[^"]+thb\.jpg)"/)
    const yearM = block.match(/class="swTL">\s*(20\d{2}|19\d{2})\s*<\/div>/)
    const descM = block.match(/<p>([\s\S]*?)<\/p>/)
    const nameM = block.match(/class="swLB"><a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!imgM || !nameM) continue

    const thumbRelPath = imgM[1]
    const pageRelPath  = nameM[1]
    const fullLinkText = nameM[2].trim()
    const year         = yearM ? parseInt(yearM[1]) : null
    const description  = descM ? descM[1].replace(/<[^>]+>/g, '').trim() : ''

    const hrefParts = pageRelPath.replace(/^\/|\/$/g, '').split('/')
    const brandSlug = hrefParts[0] || ''
    const modelSlug = hrefParts[1] || ''
    if (!brandSlug || !modelSlug) continue

    const thumbUrl = 'https://www.netcarshow.com' + thumbRelPath
    const baseKey  = thumbRelPath.replace('/R/', '').replace(/-thb\.jpg$/, '')
    const imageUrl = `https://www.netcarshow.com/${baseKey}-wallpaper.jpg`

    cars.push({
      id: `ncs-${brandSlug}-${modelSlug}`,
      source: sourceTag,
      sourceLabel: 'NetCarShow',
      brand: fullLinkText.split(' ')[0],
      brandSlug,
      name: fullLinkText,
      fullName: year ? `${year} ${fullLinkText}` : fullLinkText,
      year,
      description,
      pageUrl: 'https://www.netcarshow.com' + pageRelPath,
      thumbUrl,
      imageUrl,
      scrapedAt: new Date().toISOString(),
    })
  }
  return cars
}

async function scrapeNetCarShowLatest() {
  console.log('[netcarshow/latest] Fetching…')
  const cars = await scrapeNetCarShowPage('https://www.netcarshow.com/latest-cars.html', 'netcarshow')
  console.log(`[netcarshow/latest] ${cars.length} cars`)
  return cars
}

async function scrapeNetCarShowConcepts() {
  console.log('[netcarshow/concepts] Fetching…')
  const cars = await scrapeNetCarShowPage('https://www.netcarshow.com/explore/concept/', 'netcarshow-concept')
  console.log(`[netcarshow/concepts] ${cars.length} concepts`)
  return cars
}

// ─── RSS generic parser ───────────────────────────────────────────────────────
function parseRssItems(xml) {
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/gi
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const block  = m[1]
    const titleM = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                   block.match(/<title>([^<]+)<\/title>/)
    const linkM  = block.match(/<link>([^<]+)<\/link>/) ||
                   block.match(/<link\s+href="([^"]+)"/)
    const dateM  = block.match(/<pubDate>([^<]+)<\/pubDate>/)
    const descM  = block.match(/<description><!\[CDATA\[([^\]]{10,400})/) ||
                   block.match(/<description>([^<]{10,400})/)
    const imgM   = block.match(/https?:\/\/[^\s"'<>]+?(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/i)

    if (!titleM || !linkM) continue

    const title = titleM[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const link  = linkM[1].trim()
    const date  = dateM ? new Date(dateM[1]) : new Date()
    const year  = (title.match(/\b((19|20)\d{2})\b/) || [null, String(date.getFullYear())])[1]
    const brandM = title.match(BRAND_RE)
    const brand  = brandM ? brandM[1] : 'Other'
    const desc   = descM
      ? descM[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 200)
      : ''

    items.push({ title, link, brand, year: parseInt(year), description: desc, imageUrl: imgM?.[0] || '', date })
  }
  return items
}

// ─── Source 3: Carscoops RSS ──────────────────────────────────────────────────
async function scrapeCarscoopsRSS() {
  console.log('[carscoops/rss] Fetching…')
  const xml  = await fetchText('https://www.carscoops.com/feed/')
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('carscoops', 'carscoops', 'Carscoops', i)).filter(Boolean)
  console.log(`[carscoops/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 4: Car and Driver RSS ─────────────────────────────────────────────
async function scrapeCarAndDriverRSS() {
  console.log('[caranddriver/rss] Fetching…')
  const xml  = await fetchText('https://www.caranddriver.com/rss/all.xml', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('cad', 'caranddriver', 'Car and Driver', i)).filter(Boolean)
  console.log(`[caranddriver/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 5: Motor1 RSS ─────────────────────────────────────────────────────
async function scrapeMotor1RSS() {
  console.log('[motor1/rss] Fetching…')
  const xml  = await fetchText('https://www.motor1.com/rss/news/all/', 20000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('motor1', 'motor1', 'Motor1', i)).filter(Boolean)
  console.log(`[motor1/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 6: Road & Track RSS ───────────────────────────────────────────────
async function scrapeRoadAndTrackRSS() {
  console.log('[roadandtrack/rss] Fetching…')
  const xml  = await fetchText('https://www.roadandtrack.com/rss/all.xml', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('rat', 'roadandtrack', 'Road & Track', i)).filter(Boolean)
  console.log(`[roadandtrack/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 7: The Drive RSS ──────────────────────────────────────────────────
async function scrapeTheDriveRSS() {
  console.log('[thedrive/rss] Fetching…')
  const xml  = await fetchText('https://www.thedrive.com/feed', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('td', 'thedrive', 'The Drive', i)).filter(Boolean)
  console.log(`[thedrive/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 8: Carbuzz RSS ────────────────────────────────────────────────────
async function scrapeCarbuzzRSS() {
  console.log('[carbuzz/rss] Fetching…')
  const xml  = await fetchText('https://carbuzz.com/cars/rss/', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('cb', 'carbuzz', 'CarBuzz', i)).filter(Boolean)
  console.log(`[carbuzz/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 9: Driving.ca RSS (Canadian, European + North American coverage) ──
async function scrapeDrivingRSS() {
  console.log('[driving.ca/rss] Fetching…')
  const xml  = await fetchText('https://driving.ca/feed', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('drv', 'driving', 'Driving.ca', i)).filter(Boolean)
  console.log(`[driving.ca/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 10: Speedhunters / Jalopnik RSS ────────────────────────────────────
async function scrapeJalopnikRSS() {
  console.log('[jalopnik/rss] Fetching…')
  const xml  = await fetchText('https://jalopnik.com/rss', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('jlp', 'jalopnik', 'Jalopnik', i)).filter(Boolean)
  console.log(`[jalopnik/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 11: AutoEvolution RSS (надёжный, охватывает тюнинг / лимитки) ─────
async function scrapeAutoEvolutionRSS() {
  console.log('[autoevolution/rss] Fetching…')
  const xml  = await fetchText('https://www.autoevolution.com/rss/news.xml', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('ae', 'autoevolution', 'AutoEvolution', i)).filter(Boolean)
  console.log(`[autoevolution/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 12: ClassicDriver RSS (коллекционные, ателье, исторические) ────────
async function scrapeClassicDriverRSS() {
  console.log('[classicdriver/rss] Fetching…')
  const xml = await fetchText('https://www.classicdriver.com/en/rss', 25000)
  const items = parseRssItems(xml)
  // ClassicDriver освещает коллекционные авто — ослабляем фильтр: достаточно BRAND_RE
  const cars = items
    .filter(i => BRAND_RE.test(i.title))
    .map(i => buildRssCar('cd', 'classicdriver', 'ClassicDriver', i)).filter(Boolean)
  console.log(`[classicdriver/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 13: Hagerty RSS (оценка раритетов, ателье, аукционы) ─────────────
async function scrapeHagertyRSS() {
  console.log('[hagerty/rss] Fetching…')
  const xml = await fetchText('https://www.hagerty.com/media/feed', 25000)
  const items = parseRssItems(xml)
  const cars = items
    .filter(i => BRAND_RE.test(i.title) && isRelevantTitle(i.title))
    .map(i => buildRssCar('hag', 'hagerty', 'Hagerty', i)).filter(Boolean)
  console.log(`[hagerty/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 13: A777 (a777aa77.ru) — Russian supercar rating, unique exotica ──
// Покрывает ультрарарные модели: Naran, GMA, Fenomeno, SC40, Koenigsegg one-offs
async function scrapeA777News() {
  console.log('[a777/news] Fetching…')
  const html = await fetchText('https://www.a777aa77.ru/news/', 25000)

  const cars  = []
  // Each news block: year in heading, name in link, description in paragraph
  // Pattern: <h2 ...><a href="/cars/...">YEAR Brand Model</a></h2>
  const blockRe = /<article[\s\S]*?<\/article>/gi
  const altBlock = /<div[^>]+class="[^"]*(?:entry|post|news|item)[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*(?:entry|post|news|item)|<article|$)/gi

  // Try article tags first, fall back to year+name detection
  let m
  // Tighter pattern: no quotes/= to avoid matching HTML attributes like title="2025 Ferrari SC40"
  const yearNameRe = /\b(20\d{2}|19\d{2})\s+((?:[A-Z][a-zA-Z]+[\s-]*){1,4}[A-Za-z0-9]{1,20})/g
  const seen = new Set()

  // Strip scripts/styles AND HTML tag attributes to prevent title="..." captures
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')   // strip all HTML tags (including attributes)
  while ((m = yearNameRe.exec(stripped)) !== null) {
    const year = parseInt(m[1])
    let rawName = m[2].replace(/\s+/g, ' ').trim()
    // Reject if any HTML attribute artifacts remain
    if (/[="'<>]/.test(rawName)) continue
    // Remove repeated word sequences: "Ferrari Amalfi Ferrari Amalfi" → "Ferrari Amalfi"
    const words = rawName.split(' ')
    const half = Math.floor(words.length / 2)
    if (half >= 2 && words.slice(0, half).join(' ') === words.slice(half).join(' '))
      rawName = words.slice(0, half).join(' ')
    if (!BRAND_RE.test(rawName)) continue
    if (rawName.length < 6 || rawName.length > 60) continue
    if (seen.has(rawName)) continue
    seen.add(rawName)

    const brandM = rawName.match(BRAND_RE)
    const brand  = brandM ? brandM[1] : ''
    const slug   = `${slugify(brand)}-${slugify(rawName.replace(/^[\d\s]+/, '').trim())}`

    // Grab description snippet near this position
    const pos    = m.index
    const snippet = stripped.slice(pos, pos + 600).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const desc   = snippet.slice(0, 200)

    cars.push({
      id:          `a777-${year}-${slug.substring(0, 55)}`,
      source:      'a777',
      sourceLabel: 'A777 Суперкары',
      brand,
      brandSlug:   slugify(brand),
      name:        rawName,
      fullName:    `${year} ${rawName}`,
      year,
      description: desc,
      pageUrl:     'https://www.a777aa77.ru/news/',
      thumbUrl:    null,
      imageUrl:    null,
      scrapedAt:   new Date().toISOString(),
    })
    if (cars.length >= 40) break
  }

  console.log(`[a777/news] ${cars.length} models`)
  return cars
}

// ─── Source 14: A777 Catalog — full supercar database ────────────────────────
async function scrapeA777Catalog() {
  console.log('[a777/catalog] Fetching…')
  const html  = await fetchText('https://www.a777aa77.ru/catalog/', 25000)
  const cars  = []
  const seen  = new Set()
  const re    = /href="\/cars\/([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const slug    = m[1].replace(/\/$/, '')
    const rawText = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!rawText || seen.has(slug) || rawText.length < 5) continue
    seen.add(slug)
    const yearM = rawText.match(/\b(20\d{2}|19\d{2})\b/)
    if (!yearM || !BRAND_RE.test(rawText)) continue
    const brand = (rawText.match(BRAND_RE) || [''])[0]
    cars.push({
      id:          `a777cat-${slug.substring(0, 60)}`,
      source:      'a777',
      sourceLabel: 'A777 Каталог',
      brand,
      brandSlug:   slugify(brand),
      name:        rawText,
      fullName:    rawText,
      year:        parseInt(yearM[1]),
      description: '',
      pageUrl:     `https://www.a777aa77.ru/cars/${slug}/`,
      thumbUrl:    null,
      imageUrl:    null,
      scrapedAt:   new Date().toISOString(),
    })
    if (cars.length >= 60) break
  }
  console.log(`[a777/catalog] ${cars.length} models`)
  return cars
}

// ─── Source 12: BenzTuning RSS (rare/special Mercedes builds, Kicherer, AMG) ──
async function scrapeBenzTuningRSS() {
  console.log('[benztuning/rss] Fetching…')
  // Blogger Atom feed — request RSS format via ?alt=rss
  const xml  = await fetchText('https://www.benztuning.com/feeds/posts/default?alt=rss', 20000)
  const cars = parseRssItems(xml)
    .filter(i => BRAND_RE.test(i.title))   // brand filter only, no new-car keywords required
    .map(i => buildRssCar('bzt', 'benztuning', 'BenzTuning', i)).filter(Boolean)
  console.log(`[benztuning/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 15: InsideEVs RSS (EV-специализация) ─────────────────────────────
async function scrapeInsideEVsRSS() {
  console.log('[insideevs/rss] Fetching…')
  const xml  = await fetchText('https://insideevs.com/rss/articles/all/', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('iev', 'insideevs', 'InsideEVs', i)).filter(Boolean)
  console.log(`[insideevs/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 16: Electrek RSS (EV/clean energy — фильтруем не-авто контент) ────
async function scrapeElectrekRSS() {
  console.log('[electrek/rss] Fetching…')
  const xml  = await fetchText('https://electrek.co/feed/', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('elk', 'electrek', 'Electrek', i)).filter(Boolean)
  console.log(`[electrek/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 17: Autoweek RSS ──────────────────────────────────────────────────
async function scrapeAutoweekRSS() {
  console.log('[autoweek/rss] Fetching…')
  const xml  = await fetchText('https://www.autoweek.com/rss/all.xml/', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('aw', 'autoweek', 'Autoweek', i)).filter(Boolean)
  console.log(`[autoweek/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source 18: Torque News RSS ───────────────────────────────────────────────
async function scrapeTorqueNewsRSS() {
  console.log('[torquenews/rss] Fetching…')
  const xml  = await fetchText('https://www.torquenews.com/rss.xml', 25000)
  const cars = parseRssItems(xml).filter(i => isRelevantTitle(i.title))
    .map(i => buildRssCar('tn', 'torquenews', 'Torque News', i)).filter(Boolean)
  console.log(`[torquenews/rss] ${cars.length} relevant articles`)
  return cars
}

// ─── Source Health Tracking ───────────────────────────────────────────────────
const HEALTH_FILE = path.join(__dirname, '../public/data/source-health.json')

function loadHealth() {
  try { return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf-8')) } catch { return { sources: {} } }
}

function saveHealth(health) {
  fs.mkdirSync(path.dirname(HEALTH_FILE), { recursive: true })
  fs.writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2), 'utf-8')
}

function updateHealth(health, id, name, ok, count, error) {
  const now  = new Date().toISOString()
  const prev = health.sources[id] || { totalRuns: 0, successRuns: 0, consecutiveFails: 0 }
  health.sources[id] = {
    id, name,
    ok,
    lastCheck:         now,
    lastSuccess:       ok ? now : (prev.lastSuccess || null),
    lastFail:          ok ? (prev.lastFail || null) : now,
    count:             ok ? count : (prev.count || 0),
    error:             ok ? null : String(error || ''),
    totalRuns:         (prev.totalRuns || 0) + 1,
    successRuns:       (prev.successRuns || 0) + (ok ? 1 : 0),
    consecutiveFails:  ok ? 0 : (prev.consecutiveFails || 0) + 1,
    uptimePct: Math.round(
      ((prev.successRuns || 0) + (ok ? 1 : 0)) /
      ((prev.totalRuns  || 0) + 1) * 100
    ),
  }
}

// ─── Дедупликация по модели, а не только по id ────────────────────────────────
// RSS-фиды показывают «последние N» — один реальный релиз почти всегда попадает
// несколькими статьями разных источников (reveal / test drive / exterior gallery /
// interior gallery), и то же самое повторяется между запусками скрапера. Дедуп
// только по id (ниже) ловит точный повтор ссылки, но не повтор МОДЕЛИ под новым
// id — отсюда по 3-4 карточки одного релиза на /latest. Группируем по модели и
// сливаем в одну запись: дата публикации подтягивается к самой свежей статье,
// пропущенные поля (описание/картинка) дозаполняются из других статей группы.
const NOISE_WORDS_LATEST = /\b(all[-\s]new|new|updated|refreshed|first\s*look|official|revealed|debuts|launch(ed)?|configurator|review|test|drive|specs|price|preview|exclusive|leaked|rendered|rendering|spy\s*shots?|spied|feature|gallery|interior|exterior|sedan|suv|hatchback|coupe|wagon|convertible|pickup|crossover)\b/gi

function modelKeyLatest(car) {
  const brand = (car.brandSlug || car.brand || 'unknown').toString().toLowerCase()
  const year  = String(car.year || '').match(/\d{4}/)?.[0] || ''
  let name = (car.name || car.fullName || '').toLowerCase()
  name = name.replace(/^\d{4}\s+/, '').replace(NOISE_WORDS_LATEST, ' ').replace(/\s+/g, ' ').trim()
  const tokens = name.split(/\s+/).filter(w => w.length > 1 && !/^\d+$/.test(w)).slice(0, 3)
  return `${brand}__${tokens.join('-')}__${year}`
}

const SOURCE_PRIORITY_LATEST = [
  'netcarshow', 'netcarshow-concept', 'motor1', 'caranddriver', 'carbuzz',
  'carscoops', 'roadandtrack', 'thedrive', 'jalopnik', 'driving', 'a777',
  'autoevolution', 'classicdriver', 'hagerty', 'benztuning',
  'insideevs', 'electrek', 'autoweek', 'torquenews',
]

function mergeCarsByModel(cars) {
  const groups = new Map()
  for (const car of cars) {
    const key = modelKeyLatest(car)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(car)
  }
  const out = []
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      const pa = SOURCE_PRIORITY_LATEST.indexOf(a.source), pb = SOURCE_PRIORITY_LATEST.indexOf(b.source)
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    })
    const merged = { ...sorted[0] }
    for (const c of sorted.slice(1)) {
      if (!merged.description && c.description) merged.description = c.description
      if (!merged.thumbUrl?.startsWith('http') && c.thumbUrl?.startsWith('http')) merged.thumbUrl = c.thumbUrl
      if (!merged.imageUrl?.startsWith('http') && c.imageUrl?.startsWith('http')) merged.imageUrl = c.imageUrl
    }
    merged.scrapedAt = sorted.map(c => c.scrapedAt).sort().pop() // самая свежая дата в группе
    out.push(merged)
  }
  return out
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const SOURCES = [
    { id: 'netcarshow',         name: 'NetCarShow Latest',   fn: scrapeNetCarShowLatest   },
    { id: 'netcarshow-concept', name: 'NetCarShow Concepts', fn: scrapeNetCarShowConcepts },
    { id: 'a777',               name: 'A777 Суперкары',      fn: scrapeA777News           },
    { id: 'thedrive',           name: 'The Drive RSS',       fn: scrapeTheDriveRSS        },
    { id: 'jalopnik',           name: 'Jalopnik RSS',        fn: scrapeJalopnikRSS        },
    { id: 'autoevolution',      name: 'AutoEvolution RSS',   fn: scrapeAutoEvolutionRSS   },
    { id: 'carscoops',          name: 'Carscoops RSS',       fn: scrapeCarscoopsRSS       },
    { id: 'caranddriver',       name: 'Car and Driver RSS',  fn: scrapeCarAndDriverRSS    },
    { id: 'motor1',             name: 'Motor1 RSS',          fn: scrapeMotor1RSS          },
    { id: 'roadandtrack',       name: 'Road & Track RSS',    fn: scrapeRoadAndTrackRSS    },
    { id: 'benztuning',         name: 'BenzTuning RSS',      fn: scrapeBenzTuningRSS      },
    { id: 'insideevs',          name: 'InsideEVs RSS',       fn: scrapeInsideEVsRSS       },
    { id: 'electrek',           name: 'Electrek RSS',        fn: scrapeElectrekRSS        },
    { id: 'autoweek',           name: 'Autoweek RSS',        fn: scrapeAutoweekRSS        },
    { id: 'torquenews',         name: 'Torque News RSS',     fn: scrapeTorqueNewsRSS      },
  ]

  const health  = loadHealth()
  const run     = { sources: [], cars: [], updatedAt: new Date().toISOString() }
  const results = await Promise.allSettled(SOURCES.map(s => s.fn()))

  results.forEach((r, i) => {
    const s  = SOURCES[i]
    const ok = r.status === 'fulfilled'
    const cnt = ok ? r.value.length : 0
    const err = ok ? null : (r.reason?.message || String(r.reason))

    if (ok) {
      run.cars.push(...r.value)
    } else {
      console.error(`[${s.id}] ❌ ${err}`)
    }
    const entry = { id: s.id, name: s.name, count: cnt, ok, checkedAt: new Date().toISOString() }
    if (!ok) entry.error = err
    run.sources.push(entry)
    updateHealth(health, s.id, s.name, ok, cnt, err)
  })

  saveHealth(health)

  // Uptime summary
  const downs = Object.values(health.sources).filter(s => s.consecutiveFails >= 2)
  if (downs.length) {
    console.log(`\n⚠️  Источники недоступны ${downs.map(s => `${s.name} (${s.consecutiveFails}x)`).join(', ')}`)
  }

  // Дедупликация по id
  const seen = new Set()
  run.cars = run.cars.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })

  // Подмешиваем предыдущий снимок: latest-cars.json раньше пересобирался с нуля
  // каждый запуск (фиды показывают только последние N статей), поэтому модель,
  // чьи статьи выпали из окна фидов, просто исчезала с /latest вместо того, чтобы
  // остаться с уже накопленными данными. Держим предыдущие карточки в пуле — ниже
  // они пройдут через тот же merge по модели и обновятся, если появилась новая статья.
  let previous = []
  try {
    if (fs.existsSync(OUT)) previous = JSON.parse(fs.readFileSync(OUT, 'utf8')).cars || []
  } catch { /* нет предыдущего снимка или он повреждён — начинаем с чистого пула */ }

  // Дедуп модели: несколько статей (reveal/test/exterior gallery/…) про одну
  // машину — как в рамках одного запуска, так и накопленные из прошлых —
  // сливаем в одну карточку. Дата подтягивается к самой свежей статье группы.
  run.cars = mergeCarsByModel([...previous, ...run.cars])

  // Сортировка: новейший год → дата скрапинга
  run.cars.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.scrapedAt.localeCompare(a.scrapedAt))

  // Лимит: не более 120 новинок
  run.cars = run.cars.slice(0, 120)

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(run, null, 2), 'utf8')

  const ok  = run.sources.filter(s => s.ok)
  const err = run.sources.filter(s => !s.ok)
  console.log(`\n✅ ${run.cars.length} новинок → public/data/latest-cars.json`)
  console.log(`   Источники: ${ok.map(s => s.name + ' (' + s.count + ')').join(', ')}`)
  if (err.length) console.log(`   ❌ Ошибки: ${err.map(s => s.name + ': ' + s.error).join(' | ')}`)
}

const { execFileSync } = require('child_process')

main()
  .then(async () => {
    console.log('\n🔄 Синхронизация в проект…')
    // execFileSync (не require!) — main() внутри теперь async (точечный лукап
    // A777 для новых нод, см. syncToGraph), а require() не дождался бы её
    // промиса и следующие шаги читали бы graph.json ДО фактической записи.
    try {
      execFileSync('node', [path.join(__dirname, 'sync-latest-to-project.js')], {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 5 * 60 * 1000,
      })
    } catch (e) {
      console.error('[sync-latest-to-project] ошибка:', e.message)
    }

    console.log('\n📊 Обогащение hp из A777…')
    require('./enrich-graph-hp.js')

    console.log('\n🔎 Обогащение новых узлов данными A777…')
    try {
      execFileSync('node', [path.join(__dirname, 'enrich-a777.js'), '--new'], {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 5 * 60 * 1000,
      })
    } catch (e) {
      console.error('[enrich-a777 --new] ошибка:', e.message)
    }

    console.log('\n📢 Публикация новых моделей в Telegram…')
    try {
      execFileSync('node', [path.join(__dirname, 'publish-new-stories.js')], {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 3 * 60 * 1000,
      })
    } catch (e) {
      console.error('[publish-stories] ошибка:', e.message)
    }
  })
  .catch(e => { console.error(e); process.exit(1) })
