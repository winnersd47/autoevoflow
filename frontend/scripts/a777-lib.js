// a777-lib.js — общая библиотека для работы с A777 (a777aa77.ru): двухуровневый
// краулинг каталога бренда + fuzzy-матч ноды графа + парсинг specs/треков.
// Используется crawl-a777.js (массовый backfill) И sync-latest-to-project.js
// (точечный лукап для только что добавленных нод — см. lookupA777ForNode).
//
// Почему не угадывание URL по слагу label (старый enrich-a777.js): реальные
// страницы A777 часто используют полное маркетинговое имя ("458-italia", не
// просто "458") или другое кодовое имя ("m5-f90" вместо нашего "m5-g30") —
// угадывание давало 47/2344 (2%). Реальная структура сайта (проверено вручную):
//   /cars/{brand}/               → список ссылок на модельные семейства
//   /cars/{brand}/{family}/      → список конкретных страниц год+трим
//   /{year}-{brand}-{full-slug}.php → сама страница со specs и треками
'use strict'

const TRACK_SLUGS = {
  nurburgring: 'nurburgring-nordschleife',
  topgear:     'top-gear-track',
  hockenheim:  'hockenheim-short',
  tsukuba:     'tsukuba-circuit',
}

const TUNER_TOKENS = new Set([
  'mansory', 'novitec', 'hennessey', 'wheelsandmore', 'oakley', 'gemballa', 'techart',
  'vorsteiner', 'prior', 'mtm', 'abt', 'wald', 'rowen', 'larte', 'topcar', 'brabus',
  'renntech', 'lorinser', 'carlsson', 'hamann', 'startech', 'lumma', 'prior-design',
  'nimrod', 'katyusha', 'edo', 'ares', 'keyvany', 'mcchip', 'unicate', 'liberty',
])

// Слова, обозначающие БОЛЕЕ экстремальный трим, чем то, что реально просит нода —
// найдено вживую: голая "911 GT3 992" (без RS) утянула время именно 911 GT3 RS
// (992), которое реально быстрее и не совпадает с фактическим GT3. extraTokens
// раньше только слегка штрафовал такие "лишние" слова (-0.5) — этого мало, когда
// разница в лит-тайме реальна: если лишний токен из этого списка, кандидат
// отбрасывается целиком, а не просто теряет очки.
const ESCALATION_TOKENS = new Set([
  'rs', 'gts', 'trofeo', 'competizione', 'superleggera', 'speciale', 'pista', 'stradale',
  'nismo', 'sti', 'trackhawk', 'redeye', 'demon', 'hellcat', 'trx', 'raptor', 'black',
  'n', 'gr', 'trd', 'zr1', 'z06', 'zl1', 'ss', 'sto', 'performante', 'svj',
  'gt2', 'gt3', 'gt4', 'gt2rs', 'gt3rs',
])

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
  'Accept': 'text/html',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  'Referer': 'https://www.a777aa77.ru/',
}

async function fetchHtml(url, timeoutMs = 9000) {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new TextDecoder('utf-8').decode(buf)
  } catch { return null }
}

// ─── Уровень 1+2: каталог detail-страниц бренда ──────────────────────────────
async function crawlBrandCatalog(a777Brand) {
  const indexHtml = await fetchHtml(`https://www.a777aa77.ru/cars/${a777Brand}/`)
  if (!indexHtml || indexHtml.length < 3000) return []

  const famRe = new RegExp(`href="(https://www\\.a777aa77\\.ru/cars/${a777Brand}/[a-z0-9-]+/)"`, 'gi')
  const families = new Set()
  let m
  while ((m = famRe.exec(indexHtml)) !== null) families.add(m[1])

  const detailRe = /href="(https:\/\/www\.a777aa77\.ru\/(\d{4})-([a-z0-9-]+)\.php)"/gi
  const catalog = []
  const seen = new Set()
  const collectDetails = (html) => {
    let d
    const re = new RegExp(detailRe.source, detailRe.flags)
    while ((d = re.exec(html)) !== null) {
      if (seen.has(d[1])) continue
      seen.add(d[1])
      catalog.push({ url: d[1], year: parseInt(d[2], 10), slug: d[3] })
    }
  }
  collectDetails(indexHtml)

  const familyList = [...families]
  let i = 0
  async function worker() {
    while (i < familyList.length) {
      const url = familyList[i++]
      const html = await fetchHtml(url)
      if (html) collectDetails(html)
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, familyList.length) }, worker))

  return catalog
}

// ─── Fuzzy-матч ноды графа против каталога detail-страниц бренда ────────────
// Длину токенов НЕ фильтруем — короткие трим-коды (R/T -> "r","t") реально
// различают модели и раньше терялись как "шум". NFD+снятие диакритики ДО
// alnum-фильтра — иначе "Škoda"/"Citroën" рвутся на осколки (см. wiki-laptime-lib.js:
// живой баг, где обрубок "n" от "Citroën" случайно совпал с "N/A" в тексте
// другой машины и утянул чужие данные).
function tokenize(s) {
  return (s || '').normalize('NFD').replace(new RegExp('[̀-ͯ]', 'g'), '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
}
// НАША внутренняя бухгалтерия поколений/шасси (короткие коды в скобках "(LD)",
// римские цифры "II"/"III") — это разметка графа, у A777 её точно не будет.
// Не чистить — и "Charger R/T (LD)" требует буквального "ld" в слаге, теряя
// абсолютно правильный матч на голый "charger-r-t".
const GEN_SUFFIX_RE = /\([a-z]{1,3}\d{0,3}\)|\b(?:gen\.?\s?\d+|mk\s?\d+|\biii\b|\bii\b|\biv\b)\b/gi
function tokenizeLabel(label) {
  return tokenize((label || '').replace(GEN_SUFFIX_RE, ' '))
}
function matchNode(node, catalog) {
  const brandWords = tokenize(node.brandName)
  const nodeTokens = tokenizeLabel(node.label).filter(t => !brandWords.includes(t))
  if (!nodeTokens.length) return null
  // Первое слово ярлыка почти всегда САМА модель (Charger/Challenger/Viper/Ram…) —
  // без этого жёсткого условия общий трим-токен вроде "srt8" ложно сводил Charger
  // с Magnum (общая платформа LX), а "ram" — Ram HD с совершенно другим Ram SRT-10.
  const coreToken  = nodeTokens[0]
  const restTokens = nodeTokens.slice(1)

  let best = null, bestScore = -Infinity
  for (const entry of catalog) {
    const slugTokens = tokenize(entry.slug)
    const isTuner = slugTokens.some(t => TUNER_TOKENS.has(t))
    if (isTuner && !node.isTuning) continue
    if (!slugTokens.includes(coreToken)) continue

    const yearDiff = Math.abs(entry.year - node.year)
    if (yearDiff > 2) continue

    // ВСЕ оставшиеся токены (трим) обязаны совпасть буквально — не "хотя бы
    // половина". Живой баг на голой "911 GT3 992" (без RS): "gt3" не совпадало,
    // но общий "992" один давал ровно 50% от 2 токенов и проходил порог —
    // нода утянула время именно 911 GT3 RS, которое реально быстрее и не её.
    const restOverlap = restTokens.length
      ? restTokens.filter(t => slugTokens.includes(t)).length / restTokens.length
      : 1
    if (restOverlap < 1) continue

    // "Лишние" токены в слаге, которых нода не просила — иначе голый ярлык без
    // трима (напр. просто "Caliber", без указания SRT4) равнодушно хватает первую
    // попавшуюся трим-страницу вместо более простой/близкой. Если лишний токен —
    // известное обозначение БОЛЕЕ экстремального трима (RS/GT3/Hellcat/…), это не
    // просто "чуть менее точно" — это другая машина с другим временем круга,
    // кандидат отбрасывается целиком, а не теряет очки.
    const requested = new Set([coreToken, ...restTokens])
    const extraTokensList = slugTokens.filter(t => !requested.has(t))
    if (extraTokensList.some(t => ESCALATION_TOKENS.has(t))) continue

    const overlap = 1 + restTokens.filter(t => slugTokens.includes(t)).length
    const score = overlap * 10 - yearDiff - extraTokensList.length * 0.5
    if (score > bestScore) { bestScore = score; best = entry }
  }
  return best
}

// ─── Парсинг detail-страницы (specs + треки) ─────────────────────────────────
function extract(html, ...patterns) {
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) { const n = parseFloat(m[1].replace(/[\s,]/g, '')); if (!isNaN(n) && n > 0) return n }
  }
}
function sanity(val, min, max) { return (val != null && val >= min && val <= max) ? val : undefined }
function parseSpecs(html) {
  const raw = {
    topSpeed:     extract(html, /скорост[ьи][^<]{0,60}(\d{2,3})\s*км\/ч/i, /(\d{2,3})\s*км\/ч/),
    acceleration: extract(html, /разгон[^<]{0,80}?(\d+[.,]\d+)\s*сек/i, /0[–\-−]100[^<]{0,40}?(\d+[.,]\d+)/i),
    torque:       extract(html, /Крутящий момент[^<]{0,60}?(\d{3,5})/i, /(\d{3,5})\s*Нм/),
    weightKg:     extract(html, /(?:масс[аы]|вес)[^<]{0,80}?(\d{3,5})\s*кг/i, /(\d{3,5})\s*кг(?:\s|[.,<]|$)/),
    priceUsd:     extract(html, /\$\s*([\d,]{3,12})/),
    hpPerTon:     extract(html, /(\d{2,4})\s*л\.с\.\/т/),
    hpPerLiter:   extract(html, /(\d{2,4})\s*л\.с\.\/л/),
  }
  return {
    topSpeed:     sanity(raw.topSpeed,     100,  600),
    acceleration: sanity(raw.acceleration, 0.5,   30),
    torque:       sanity(raw.torque,        50, 3000),
    weightKg:     sanity(raw.weightKg,     500, 5000),
    priceUsd:     sanity(raw.priceUsd,    1000, 50_000_000),
    hpPerTon:     sanity(raw.hpPerTon,      50, 2000),
    hpPerLiter:   sanity(raw.hpPerLiter,    20,  700),
  }
}
function parseTrackTimes(html) {
  const result = {}
  for (const [key, slug] of Object.entries(TRACK_SLUGS)) {
    const idx = html.indexOf(slug)
    if (idx < 0) continue
    const before = html.slice(Math.max(0, idx - 200), idx)
    const m = before.match(/(\d+:\d{2}[.,]\d+)\s*</)
    if (m?.[1]) result[key] = m[1].replace(',', '.')
  }
  return result
}

// ─── Точечный лукап для ОДНОЙ ноды (используется при добавлении новых моделей) ─
// catalog — уже закэшированный список detail-страниц бренда (a777-catalog-cache.json),
// либо будет скраулен с нуля если для бренда каталога ещё нет.
async function lookupA777ForNode(node, catalog) {
  const match = matchNode(node, catalog)
  if (!match) return null
  const html = await fetchHtml(match.url)
  if (!html) return null
  const specs = parseSpecs(html)
  const trackTimes = parseTrackTimes(html)
  return {
    id: node.id, url: match.url, found: true,
    ...specs,
    ...(Object.keys(trackTimes).length ? { trackTimes } : {}),
    fetchedAt: Date.now(),
  }
}

module.exports = {
  fetchHtml, crawlBrandCatalog, tokenize, matchNode,
  parseSpecs, parseTrackTimes, lookupA777ForNode,
  TUNER_TOKENS, TRACK_SLUGS,
}
