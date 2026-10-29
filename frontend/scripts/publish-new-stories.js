/**
 * publish-new-stories.js — генерирует и публикует историю новых моделей в Telegram
 *
 * Нужны в .env.local:
 *   TELEGRAM_BOT_TOKEN=    — токен бота (BotFather → /newbot)
 *   TELEGRAM_CHANNEL_ID=   — @username или -100xxxxxxxxxx
 *
 * Для генерации текста — цепочка провайдеров, пробуются по порядку, первый
 * успешный побеждает. Все опциональны (пустой/placeholder-ключ просто
 * пропускается), но если ВСЕ окажутся недоступны одновременно — публикация
 * этой модели откладывается до следующего прогона (см. generateStory()),
 * шаблон-заглушка больше не рассылается:
 *   GEMINI_API_KEY=        — Google AI Studio, generativelanguage.googleapis.com
 *   DEEPSEEK_API_KEY=      — api.deepseek.com
 *   YANDEX_API_KEY= + YANDEX_FOLDER_ID=  — Yandex Cloud
 *   QWEN_API_KEY=          — Alibaba DashScope (dashscope-intl.aliyuncs.com), qwen-plus
 *   OPENROUTER_API_KEY=    — openrouter.ai, бесплатные модели (:free)
 *   CEREBRAS_API_KEY=      — cloud.cerebras.ai, бесплатный тариф, быстрый Llama 3.3 70B
 *   NVIDIA_API_KEY=        — build.nvidia.com (NIM), бесплатный доступ к каталогу моделей
 *
 * Запуск вручную: node scripts/publish-new-stories.js
 * Авто: цепочка в scrape-latest.js после enrich-a777
 *
 * Публикует не более 3 новых моделей за запуск.
 * Хранит список опубликованных ID в public/data/published-ids.json.
 */
'use strict'
const fs   = require('fs')
const path = require('path')

// ─── Загрузка .env.local ──────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

const LATEST_JSON      = path.join(__dirname, '../public/data/latest-cars.json')
const GRAPH_JSON       = path.join(__dirname, '../public/data/evolution/graph.json')
const PUBLISHED_IDS    = path.join(__dirname, '../public/data/published-ids.json')
const PUBLISHED_STORIES = path.join(__dirname, '../public/data/published-stories.json')
// Реестр "какая реальная модель графа уже получала пост" — отдельно от
// publishedKeys/records (те ключуются по modelKey СТАТЬИ, который у разных
// источников про одну и ту же машину может не совпасть, напр. "q9-first-" у
// The Drive против "q9" у NCS — поэтому не ловит межисточниковые дубли).
// Этот реестр ключуется по ctx.matchedNode (реальный узел графа) — надёжнее.
const MODEL_LINK_REGISTRY = path.join(__dirname, '../public/data/model-link-registry.json')
const MAX_PUBLISHED_STORIES = 60 // с запасом перекрывает окно между 6-часовыми прогонами

// Второй (свободный/тизерный) канал — опционально
const SECONDARY_CH = process.env.TELEGRAM_CHANNEL_SECONDARY || ''

// Источники, чьи новости идут в общий канал вместо VIP (не тизером — публикуются
// туда ЦЕЛИКОМ, полным постом). Car and Driver демотирован сюда: его /photos/
// галереи дают скудный текст-источник даже после fetchArticleText-фиксов, и это
// систематическая слабость источника, а не разовый брак одного поста.
const GENERAL_CHANNEL_SOURCES = new Set(['caranddriver'])

// Шаблонная генерация (без внешнего AI — использует данные графа)

function tgBase() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
}

// ─── Нормализация бренда (scraper slug → graph brandId) ──────────────────────
const BRAND_MAP = {
  'mercedes-benz': 'mercedes', 'mercedes': 'mercedes',
  'bmw': 'bmw', 'audi': 'audi', 'volkswagen': 'volkswagen',
  'porsche': 'porsche', 'ferrari': 'ferrari', 'lamborghini': 'lamborghini',
  'mclaren': 'mclaren', 'aston-martin': 'astonmartin', 'aston martin': 'astonmartin',
  'bugatti': 'bugatti', 'pagani': 'pagani', 'koenigsegg': 'koenigsegg', 'rimac': 'rimac',
  'toyota': 'toyota', 'lexus': 'lexus', 'honda': 'honda', 'nissan': 'nissan',
  'mazda': 'mazda', 'subaru': 'subaru', 'mitsubishi': 'mitsubishi',
  'alfa-romeo': 'alfa-romeo', 'alfa romeo': 'alfa-romeo', 'maserati': 'maserati',
  'lotus': 'lotus', 'jaguar': 'jaguar',
  'land-rover': 'land-rover', 'land rover': 'land-rover', 'range rover': 'land-rover',
  'kia': 'kia', 'hyundai': 'hyundai', 'genesis': 'genesis',
  'acura': 'acura', 'infiniti': 'infiniti',
  'ford': 'ford', 'chevrolet': 'chevrolet', 'dodge': 'dodge', 'cadillac': 'cadillac',
  'peugeot': 'peugeot', 'renault': 'renault', 'seat': 'seat', 'skoda': 'skoda',
  'rolls-royce': 'rolls-royce', 'rolls royce': 'rolls-royce', 'bentley': 'bentley',
  'hennessey': 'hennessey', 'ssc': 'ssc', 'saleen': 'saleen',
  'volvo': 'volvo', 'gmc': 'gmc', 'ram': 'ram',
}

function normBrand(slug) {
  return BRAND_MAP[slug?.toLowerCase()] || slug?.toLowerCase()
}

// ─── Дедупликация: нормализация ключа модели ──────────────────────────────────
// Несколько статей от разных источников об одной машине → один ключ
const NOISE_WORDS = /\b(all[-\s]new|new|updated|refreshed|first\s*look|official|revealed|debuts|launch(ed)?|archive|test|drive|configurator|review|specs|price|preview|exclusive|leaked|rendered|rendering|spy\s*shots?|spied|feature|gallery|interior|exterior|sedan|suv|hatchback|coupe|wagon|convertible|pickup|crossover)\b/gi

// ─── Фильтр «это реально новинка, а не ретроспектива» ─────────────────────────
// NetCarShow (/latest, /explore/concept) — секции сайта САМИ по себе только про
// новые модели, ему доверяем полностью. Остальные источники (Car and Driver и
// т.п.) мешают в одной ленте анонсы новых моделей И архивные/юбилейные статьи
// про машины прошлых десятилетий — год из заголовка/данных надёжнее любых слов
// в названии: "1994 Lexus GS300", "1977 BMW 320i", "2001 Hartge H50" никакие не
// новинки, а "2027 Audi SQ9" или концепт без года — новинки. Слово "archive" в
// самом NOISE_WORDS не помогает тут: у Car and Driver оно в id/URL даже у
// свежих статей (формат галереи), а не признак возраста машины.
const RETRO_PHRASES = /\b(retrospective|throwback|anniversary of|\d+\s*years?\s*later|remembering|looking?\s+back|history of|reunion|barn find)\b/i
function isGenuineNewRelease(car) {
  const year = parseInt(String(car.year || '').match(/\d{4}/)?.[0] || '0', 10)
  const currentYear = new Date().getFullYear()
  if (year && year < currentYear - 1) return false
  const text = `${car.name || ''} ${car.fullName || ''} ${car.description || ''}`
  if (RETRO_PHRASES.test(text)) return false
  return true
}

// ─── Фильтр «заголовок = факт о модели, а не редакционный кликбейт» ──────────
// Car and Driver /news/ статьи иногда озаглавлены как история, а не факт
// ("2027 Porsche 911 Carrera S Wasn't Supposed to Happen") — car.name/fullName
// берутся из <h1> статьи как есть, без нормализации. Такой заголовок ломает
// подпись поста (кликбейт-фраза вместо названия модели) даже когда ЭВОЛЮЦИЯ
// матчится по токенам корректно — сам факт для читателя нечитаем.
const CLICKBAIT_PHRASES = /\b(wasn.t (supposed|meant|ready) to|you won.t believe|here.s (why|what|how)|this is why|isn.t what (it|you) (seems|think)|is not what (it|you) (seems|think)|will (shock|surprise) you|the truth about|everything you need to know|what happened (next|when)|nobody (expected|saw)|no one (expected|saw)|why .+ (matters|changes everything)|changes everything)\b/i
function isClickbaitHeadline(car) {
  const text = `${car.name || ''} ${car.fullName || ''}`
  return CLICKBAIT_PHRASES.test(text)
}

// ─── Фильтр «имя = реальное название модели, а не обрывок предложения» ───────
// Живой случай: Carscoops "Toyota's New MR2 Might Arrive In 2028 Without A
// Single Toyota Badge" — извлечение имени зацепилось за упоминание года
// в середине фразы ("...In 2028 Without...", а не модельный год) и вместо
// имени машины в car.name осел хвост предложения "2028 Without A Single
// Toyota Badge". Слово "Toyota" в этом тексте формально ЕСТЬ (в конце,
// "Toyota Badge") — проверка "бренд встречается где-то в названии" такое
// не ловит. Настоящее "Год Бренд Модель" всегда начинает бренд сразу (плюс
// максимум пара служебных слов вроде "New"/"All-New") сразу после года —
// если бренд находится значительно дальше, это почти наверняка случайное
// упоминание в середине предложения, а не начало имени модели.
function looksLikeRealModelName(car) {
  const name = (car.name || car.fullName || '').trim()
  if (!name) return false
  const brand = (car.brand || car.brandName || '').trim()
  if (!brand) return true // нет данных о бренде — нечем проверить, пропускаем как есть
  const brandIdx = name.toLowerCase().indexOf(brand.toLowerCase())
  if (brandIdx === -1) return false // бренда нет в названии вообще — подозрительно
  const before = name.slice(0, brandIdx).trim()
  if (!before) return true // бренд — первое слово, всё чисто
  const nonYearWords = before.split(/\s+/).filter(w => w && !/^(19|20)\d\d$/.test(w))
  return nonYearWords.length <= 2
}

function extractModelKey(car) {
  const brand = normBrand(car.brandSlug || (car.brand || '').toLowerCase().replace(/\s+/g, '-')) || 'unknown'
  const year  = String(car.year || '').match(/\d{4}/)?.[0] || ''
  let name = (car.name || car.fullName || '').toLowerCase()
  name = name.replace(/^\d{4}\s+/, '')        // "2027 Audi Q9" → "Audi Q9"
  // Заголовки статей часто идут по схеме "Модель Test: тизер-фраза, Локация" —
  // всё после ПЕРВОГО двоеточия это редакционный хук произвольной длины, не
  // часть модели. Раньше и без обрезки: "GS300 Test: Watch Your Back, Germany"
  // после вычитания шумовых слов оставлял "gs300 watch" — третье слово тизера
  // "watch" вытесняло третий токен ключа, и та же модель без хука ("GS300")
  // получала ДРУГОЙ ключ → два реальных поста об одном Lexus GS300 1994 года.
  name = name.split(':')[0]
  name = name.replace(/[,;!?]/g, ' ')
  name = name.replace(NOISE_WORDS, ' ')
  name = name.replace(/\s+/g, ' ').trim()
  // Бренд бывает то отдельным полем (netcarshow: brand="Cadillac", name="V-One
  // Concept"), то запечённым в заголовке другим источником (name="Cadillac V-One
  // Concept") — без вычитания слов бренда из name один и тот же реальный автомобиль
  // получал ДВА разных ключа ("cadillac__v-one-concept" vs
  // "cadillac__cadillac-v-one-concept"), дедуп между источниками не срабатывал и
  // Cadillac V-One Concept опубликовался дважды подряд в соседних прогонах. Та же
  // логика, что уже применена в getGraphContext() выше по файлу.
  const brandWords = (car.brand || car.brandName || '').toLowerCase().split(/\s+/).filter(Boolean)
  // Use first 3 significant tokens as key
  const tokens = name.split(/\s+/).filter(w => w.length > 1 && !/^\d+$/.test(w) && !brandWords.includes(w)).slice(0, 3)
  return `${brand}__${tokens.join('-')}__${year}`
}

// Группировка scraped cars по ключу модели
function groupByModel(cars) {
  const groups = new Map()
  for (const car of cars) {
    const key = extractModelKey(car)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(car)
  }
  return groups
}

// Слияние группы в один агрегированный объект
const SOURCE_PRIORITY = ['netcarshow', 'netcarshow-concept', 'motor1', 'caranddriver', 'carbuzz', 'carscoops', 'roadandtrack', 'thedrive', 'jalopnik', 'driving', 'autoevolution', 'classicdriver', 'hagerty', 'benztuning', 'insideevs', 'electrek', 'autoweek', 'torquenews']
function mergeGroup(cars) {
  const sorted = [...cars].sort((a, b) => {
    const pa = SOURCE_PRIORITY.indexOf(a.source)
    const pb = SOURCE_PRIORITY.indexOf(b.source)
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
  })
  const lead = sorted[0]
  return {
    ...lead,
    thumbUrl:     sorted.map(c => c.thumbUrl).find(u => u?.startsWith('http')) || null,
    _mergedIds:   sorted.map(c => c.id),
    _sourceUrls:  sorted.map(c => c.url || c.sourceUrl || c.pageUrl).filter(Boolean),
    _sources:     [...new Set(sorted.map(c => c.source).filter(Boolean))],
    _mergedCount: sorted.length,
  }
}

// ─── Загрузка графа ───────────────────────────────────────────────────────────
function loadGraph() {
  try { return JSON.parse(fs.readFileSync(GRAPH_JSON, 'utf-8')) }
  catch { return { nodes: [], edges: [] } }
}

// ─── Контекст из графа для конкретного автомобиля ────────────────────────────
function getGraphContext(car, graph) {
  const brandId = normBrand(car.brandSlug || car.brand?.toLowerCase().replace(/\s+/g, '-'))
  // Слова бренда исключаем из токенов: "cadillac" входит в label КАЖДОЙ ноды Cadillac,
  // так что новая модель без единого реального совпадения (напр. "V-ONE Concept") всё
  // равно получала score=1 на ВСЕХ нодах бренда и "побеждала" по порядку в массиве —
  // например, спекулятивно матчилась на CTS Gen.1 (2003) просто потому что та шла первой.
  const brandWords = (car.brand || car.brandName || '').toLowerCase().split(/\s+/).filter(Boolean)
  // Буква+цифра (q9, x3, m3, i4, rs3...) пропускаем даже при длине 2 — иначе
  // "2027 Audi Q9 First-Drive" терял единственный значимый токен ("q9" короче
  // порога >2), совпадений не находилось вообще, и пост уходил на /latest/
  // вместо /model/audi-q9, хотя узел в графе есть (живой случай, 28.10.2026).
  const SHORT_MODEL_CODE = /^[a-z]+\d+$/
  const tokens  = (car.name || car.fullName || '')
    .toLowerCase().split(/\s+/)
    .filter(t => (t.length > 2 || SHORT_MODEL_CODE.test(t)) && !/^\d{4}$/.test(t) && !/^the|and|new$/.test(t))
    .filter(t => !brandWords.includes(t))

  const byId   = Object.fromEntries(graph.nodes.map(n => [n.id, n]))
  const brand  = graph.nodes.filter(n => n.brandId === brandId)

  // Находим ноду с наибольшим совпадением по имени.
  // Живой найденный баг: "Hyundai Tucson N Line [EU]" матчился на узел "Sonata
  // N Line" — токен "tucson" не совпал ни с одним узлом (Tucson в графе нет),
  // но общее трим-слово "line" (от "N Line") дало score=1 и "выиграло" за
  // неимением конкурентов. "N Line"/"Sport"/"GT"/"SE" и т.п. — короткие
  // трим-суффиксы, общие для ДЕСЯТКОВ не связанных моделей одного бренда,
  // их одиночное совпадение не означает совпадение модели. Требуем score≥2,
  // либо единственный совпавший токен должен быть достаточно длинным (≥5
  // символов) — короткие общие слова так совпасть в одиночку не могут, а
  // настоящие названия моделей (tucson, sonata, telluride…) проходят свободно.
  const scored = brand.map(n => {
    const lbl = n.label.toLowerCase()
    const matchedTokens = tokens.filter(t => lbl.includes(t))
    return { node: n, score: matchedTokens.length, matchedTokens }
  }).filter(x => x.score >= 2 || (x.score === 1 && (x.matchedTokens[0].length >= 5 || SHORT_MODEL_CODE.test(x.matchedTokens[0]))))
    .sort((a, b) => b.score - a.score)

  const match = scored[0]?.node

  if (!match) {
    return {
      matchedNode: null, ancestorChain: [], descendants: [],
      crossBrandLinks: [], siblingLinks: [], brandSample: brand.sort((a, b) => (a.year || 0) - (b.year || 0)).slice(0, 6),
    }
  }

  // Цепочка предков (идём назад по evolves_into)
  const ancestorChain = []
  const seen = new Set([match.id])
  let cur = match
  for (let i = 0; i < 12; i++) {
    const e = graph.edges.find(e => e.target === cur.id && e.type === 'evolves_into')
    if (!e) break
    const prev = byId[e.source]
    if (!prev || seen.has(prev.id)) break
    ancestorChain.unshift(prev)
    seen.add(prev.id)
    cur = prev
  }

  // Потомки
  const descendants = []
  cur = match
  for (let i = 0; i < 4; i++) {
    const e = graph.edges.find(e => e.source === cur.id && e.type === 'evolves_into')
    if (!e) break
    const next = byId[e.target]
    if (!next || seen.has(next.id)) break
    descendants.push(next)
    seen.add(next.id)
    cur = next
  }

  // Варианты
  const variants = graph.edges
    .filter(e => e.source === match.id && e.type === 'variant_of')
    .map(e => byId[e.target]).filter(Boolean)

  // Кросс-брендовые связи
  const crossBrandLinks = graph.edges
    .filter(e =>
      (e.source === match.id || e.target === match.id) &&
      ['inspired_by', 'derived_from', 'concept_to_production', 'shares_platform'].includes(e.type)
    )
    .map(e => {
      const otherId  = e.source === match.id ? e.target : e.source
      const other    = byId[otherId]
      if (!other || other.brandId === brandId) return null
      return { node: other, type: e.type, dir: e.source === match.id ? '→' : '←' }
    })
    .filter(Boolean).slice(0, 4)

  // Родственные связи ВНУТРИ бренда (derived_from/inspired_by/concept_to_production/
  // shares_platform), которых нет в ЭВОЛЮЦИИ — та строится только по evolves_into.
  // Пример: V-ONE Concept derived_from гоночный V-Series.R — тот же бренд Cadillac,
  // поэтому в crossBrandLinks не попадает (там принципиально другой акцент — контраст
  // ДВУХ РАЗНЫХ брендов), но по факту это самый интересный факт о модели, просто без
  // межбрендового твиста. seen уже содержит все ноды chain — не дублируем их здесь.
  const siblingLinks = graph.edges
    .filter(e =>
      (e.source === match.id || e.target === match.id) &&
      ['inspired_by', 'derived_from', 'concept_to_production', 'shares_platform'].includes(e.type)
    )
    .map(e => {
      const otherId  = e.source === match.id ? e.target : e.source
      const other    = byId[otherId]
      if (!other || other.brandId !== brandId || seen.has(other.id)) return null
      return { node: other, type: e.type, dir: e.source === match.id ? '→' : '←' }
    })
    .filter(Boolean).slice(0, 4)

  return { matchedNode: match, ancestorChain, descendants, crossBrandLinks, siblingLinks, variants, brandSample: [] }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEB RESEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error('timeout')) }, timeoutMs)
    const done  = (val, err) => { clearTimeout(timer); err ? reject(err) : resolve(val) }
    try {
      const mod    = url.startsWith('https') ? require('https') : require('http')
      const parsed = new (require('url').URL)(url)
      const req = mod.get({
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AutoEvoFlow/2.0)', Accept: 'text/html,*/*' },
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpGet(res.headers.location, timeoutMs).then(v => done(v)).catch(e => done('', e))
          res.resume(); return
        }
        res.setEncoding('utf8')
        let buf = ''
        // destroy() эмитит error("aborted") на response — если просто вызвать destroy(),
        // done() ловит его первым и РЕДЖЕКТИТ промис, теряя весь уже накопленный буфер.
        // Резолвим partial-буфер СИНХРОННО до этого — Promise settle необратим, поэтому
        // поздний done('', abortErr) из res.on('error') станет no-op.
        res.on('data', c => { buf += c; if (buf.length > 150_000) { req.destroy(); done(buf) } })
        res.on('end',   () => done(buf))
        res.on('close', () => done(buf))
        res.on('error', e => done('', e))
      })
      req.on('error', e => done('', e))
      req.end()
    } catch (e) { done('', e) }
  })
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim()
}

async function fetchWikiSummary(brand, name) {
  try {
    const q = encodeURIComponent(`${brand} ${name}`)
    const searchRes = await httpGet(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=3&namespace=0&format=json`
    )
    const [, titles] = JSON.parse(searchRes)
    if (!titles?.length) return null
    const slug = encodeURIComponent(titles[0].replace(/ /g, '_'))
    const extRes = await httpGet(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${slug}&prop=extracts&exintro=1&exchars=2500&format=json`
    )
    const pages = JSON.parse(extRes).query?.pages
    const page = pages && Object.values(pages)[0]
    return page?.extract ? stripHtml(page.extract).slice(0, 2200) : null
  } catch { return null }
}

async function fetchDDGResults(query) {
  try {
    const q = encodeURIComponent(query)
    const html = await httpGet(`https://html.duckduckgo.com/html/?q=${q}`)
    const snippets = [], urls = []
    // Snippets
    const snRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/[as]/g
    let m
    while ((m = snRe.exec(html)) !== null) {
      const text = stripHtml(m[1]).trim()
      if (text.length > 40 && text.length < 500) snippets.push(text)
      if (snippets.length >= 5) break
    }
    // Article URLs (DuckDuckGo encodes them as ?uddg=URL). Каждый результат на странице
    // отдаёт uddg= несколько раз (заголовок + превью-картинка ведут на один и тот же URL) —
    // без дедупа лимит в 4 забивался 4 копиями ПЕРВОГО результата, а остальные 9 разных
    // ссылок (motortrend/edmunds/autoblog/…) не попадали в выдачу вообще.
    const urlRe = /uddg=([^"&\s]+)/g
    const seenUrls = new Set()
    while ((m = urlRe.exec(html)) !== null) {
      try {
        const url = decodeURIComponent(m[1])
        if (url.startsWith('http') && !url.includes('duckduckgo') && !url.includes('google.com') && !seenUrls.has(url)) {
          seenUrls.add(url)
          urls.push(url)
          if (urls.length >= 4) break
        }
      } catch {}
    }
    return { snippets, urls }
  } catch { return { snippets: [], urls: [] } }
}

async function fetchOGImage(articleUrl) {
  if (!articleUrl?.startsWith('http')) return null
  try {
    const html = await httpGet(articleUrl, 8000)
    const patterns = [
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]?.startsWith('http')) return m[1]
    }
  } catch {}
  return null
}

async function fetchArticleText(url, brand) {
  if (!url || !url.startsWith('http')) return null
  try {
    const html = await httpGet(url)
    const paras = []
    const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const t = stripHtml(m[1]).trim()
      if (t.length > 80 && !/cookie|privacy|subscribe|newsletter/i.test(t)) {
        // На агрегаторах типа netcarshow среди <p> проскакивают короткие тизеры
        // ДРУГИХ машин из виджета "последние модели" на той же странице (проверено
        // руками — первые совпадения regex оказались про Maybach S680/GLC53/
        // Hennessey Blackbird на странице Audi Q9). Настоящая статья про машину
        // упоминает её бренд по всему тексту — держим только такие абзацы.
        if (!brand || t.toLowerCase().includes(brand.toLowerCase())) paras.push(t)
      }
      if (paras.length >= 8) break
    }
    return paras.join(' ').slice(0, 2000) || null
  } catch { return null }
}

async function researchCar(car) {
  const brand = car.brand || car.brandName || ''
  const name  = car.name || car.fullName || car.label || ''
  const year  = car.year || ''

  // Если это агрегированная группа — читаем текст из нескольких URL
  const sourceUrls = car._sourceUrls?.length ? car._sourceUrls : [car.url || car.sourceUrl || car.pageUrl].filter(Boolean)

  const [wikiRes, ddgRes, ...articleResults] = await Promise.allSettled([
    fetchWikiSummary(brand, name),
    fetchDDGResults(`${brand} ${name} ${year} specs review`),
    ...sourceUrls.slice(0, 3).map(u => fetchArticleText(u, brand)),
  ])

  // Объединяем тексты статей из всех источников, убирая дубли
  let articleTexts = articleResults
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)

  const ddg = ddgRes.status === 'fulfilled' ? ddgRes.value : { snippets: [], urls: [] }

  // Основной источник иногда оказывается фотогалереей (напр. caranddriver.com/photos/.../gallery/) —
  // там почти нет текста, только подписи к фото (car.description тоже куцый в этом случае).
  // Если после парсинга sourceUrls текста набралось мало — добираем со страниц из DDG
  // (часто это полноценный обзор того же или другого издания).
  const thinArticle = articleTexts.join(' ').length < 400
  if (thinArticle && ddg.urls.length) {
    const extraUrls = ddg.urls.filter(u => !sourceUrls.includes(u)).slice(0, 2)
    if (extraUrls.length) {
      const extraResults = await Promise.allSettled(extraUrls.map(u => fetchArticleText(u, brand)))
      const extraTexts = extraResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
      articleTexts = articleTexts.concat(extraTexts)
    }
  }

  const articleRes = { status: 'fulfilled', value: articleTexts.join('\n\n').slice(0, 3000) || null }

  // Try og:image from top article URLs — parallel, first non-null wins
  const ogResults = await Promise.allSettled(ddg.urls.slice(0, 3).map(u => fetchOGImage(u)))
  let pressImage = null, pressImageSourceUrl = null
  for (let i = 0; i < Math.min(3, ddg.urls.length); i++) {
    const r = ogResults[i]
    if (r?.status === 'fulfilled' && r.value) {
      pressImage = r.value
      pressImageSourceUrl = ddg.urls[i]  // the article page URL (has OG tags) → use for Telegram preview
      break
    }
  }

  return {
    wiki:               wikiRes.status === 'fulfilled' ? wikiRes.value : null,
    snippets:           ddg.snippets,
    articleUrls:        ddg.urls,
    article:            articleRes.status === 'fulfilled' ? articleRes.value : null,
    pressImage,
    pressImageSourceUrl,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── DeepSeek (primary) ────────────────────────────────────────────────────────
async function callDeepSeek(messages) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 1800,
      temperature: 0.72,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ── Google Gemini (primary — working key) ─────────────────────────────────────
async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.startsWith('your_')) return null
  const system = messages.find(m => m.role === 'system')?.content || ''
  const user   = messages.find(m => m.role === 'user')?.content   || ''
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.72, maxOutputTokens: 16000 },
  })

  // Try two models: flash-latest → pro-latest
  const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-pro-latest']
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    let lastErr
    // Single retry on 503
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 6000))
      let res
      try {
        res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body, signal: AbortSignal.timeout(90_000) })
      } catch (e) { lastErr = e; break }
      if (res.status === 503) { lastErr = new Error(`Gemini 503 overloaded`); continue }
      if (!res.ok) { lastErr = new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0,150)}`); break }
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts ?? []
      const text = parts.filter(p => !p.thought).map(p => p.text || '').join('')
      if (text) return text
      lastErr = new Error(`Gemini ${model}: empty response`)
      break
    }
    // If 503 after retry, try next model; otherwise throw
    if (lastErr?.message?.includes('503') || lastErr?.message?.includes('overloaded')) continue
    if (lastErr) throw lastErr
  }
  throw new Error('Gemini: all models unavailable')
}

// ── YandexGPT Pro (secondary — works when IAM role is set) ───────────────────
async function callYandex(messages) {
  const apiKey   = process.env.YANDEX_API_KEY
  const folderId = process.env.YANDEX_FOLDER_ID
  if (!apiKey || apiKey === 'your_yandex_api_key_here' || !folderId) return null
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: { Authorization: `Api-Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/yandexgpt-pro/latest`,
      completionOptions: { stream: false, temperature: '0.7', maxTokens: '1800' },
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', text: m.content })),
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`YandexGPT ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.result?.alternatives?.[0]?.message?.text ?? null
}

// ── Qwen (Alibaba DashScope, OpenAI-совместимый режим) ────────────────────────
// Добавлен 2026-08-26 как независимый запасной вариант после инцидента, когда
// ВСЕ ТРИ существующих провайдера легли одновременно (Gemini квота 429,
// DeepSeek баланс 402, Yandex права 403) — не завязан на те же аккаунты/биллинг.
// Международный endpoint (dashscope-intl) — если ключ выпущен на материковом
// аккаунте Alibaba Cloud, может понадобиться сменить на dashscope.aliyuncs.com
// (без -intl).
async function callQwen(messages) {
  const key = process.env.QWEN_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages,
      max_tokens: 1800,
      temperature: 0.72,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Qwen ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ── OpenRouter (агрегатор — доступ к нескольким бесплатным моделям через один
// API и один ключ, ещё один независимый запасной вариант) ────────────────────
// Список актуальных :free-моделей взят напрямую из openrouter.ai/api/v1/models,
// а не из возможно устаревшего поиска/документации (DeepSeek v3.1:free уже снят
// с бесплатного каталога, отвечал 404). Живые найденные причины сбоя ОДНОЙ
// конкретной модели не означают, что OpenRouter в целом недоступен — свободный
// пул нестабилен по-разному для разных моделей/бэкендов в разное время (видел:
// Nemotron 3 Ultra 550B — таймаут от размера; Gemma 4 31B — 429 shared-pool
// rate-limit именно на upstream Google AI Studio; Nemotron Nano "reasoning" —
// тоже таймаут, т.к. reasoning-модели сперва генерируют скрытые токены
// размышления; LFM2.5 2.6B — иногда 200 OK с пустым content без ошибки).
// Поэтому пробуем НЕСКОЛЬКО моделей С РАЗНЫХ бэкендов подряд за один вызов —
// не только разный размер, но и разный upstream-пул, чтобы один перегруженный
// провайдер не валил всю попытку.
const OPENROUTER_FREE_MODELS = [
  'liquid/lfm-2.5-2.6b:free',            // LiquidAI — свой бэкенд
  'nvidia/nemotron-3-super-120b-a12b:free', // NVIDIA — свой бэкенд, НЕ reasoning-вариант
  'poolside/laguna-s-2.1:free',          // Poolside — ещё один независимый бэкенд
]

async function callOpenRouter(messages) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || key.startsWith('your_')) return null

  let lastErr
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          // Требуют OpenRouter для бесплатных моделей — без них могут резать лимиты сильнее.
          'HTTP-Referer': 'https://autoevoflow.local',
          'X-Title': 'AutoEvoFlow',
        },
        body: JSON.stringify({ model, messages, max_tokens: 1800, temperature: 0.72 }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) { lastErr = new Error(`OpenRouter ${model} ${res.status}: ${await res.text()}`); continue }
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content) return content
      lastErr = new Error(`OpenRouter ${model}: empty response`)
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('OpenRouter: all free models unavailable')
}

// ── Cerebras (бесплатный тариф, быстрый инференс Llama) ───────────────────────
async function callCerebras(messages) {
  const key = process.env.CEREBRAS_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages,
      max_tokens: 1800,
      temperature: 0.72,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Cerebras ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ── NVIDIA NIM (build.nvidia.com — бесплатный доступ к каталогу открытых
// моделей через один ключ, ещё одна независимая от остальных инфраструктура) ──
async function callNvidia(messages) {
  const key = process.env.NVIDIA_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages,
      max_tokens: 1800,
      temperature: 0.72,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`NVIDIA NIM ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ── Mistral AI (La Plateforme, бесплатный тариф Experiment) — европейская
// инфраструктура, независимый аккаунт/биллинг от всех остальных ───────────────
async function callMistral(messages) {
  const key = process.env.MISTRAL_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      max_tokens: 1800,
      temperature: 0.72,
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE POST GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

// 4 нарративных формата — выбираются детерминировано по id ноды
const POST_FORMATS = [
  {
    id: 'provocateur',
    systemRole: 'Ты — провокационный автожурналист. Твой фирменный приём: начинать с неожиданного факта или парадокса, который ломает ожидания читателя.',
    opening: 'НАЧАЛО: первые два предложения — неожиданный факт или контринтуитивное утверждение. НЕ называй модель в первом предложении. Создай интригу, заставь читать дальше.',
  },
  {
    id: 'historian',
    systemRole: 'Ты — автомобильный историк, специализирующийся на скрытых связях между эпохами и маркетинговых решениях, изменивших отрасль.',
    opening: 'НАЧАЛО: начни с исторического контекста эпохи — что происходило в индустрии или в мире, когда появились предшественники этой машины. Конкретные события, имена, цифры.',
  },
  {
    id: 'engineer',
    systemRole: 'Ты — бывший инженер-конструктор, ставший журналистом. Смотришь на каждый автомобиль через призму инженерных вызовов и компромиссов.',
    opening: 'НАЧАЛО: сформулируй главный инженерный вызов, который стоял перед командой разработчиков. Не мощность, не дизайн — а конкретная техническая проблема, которую надо было решить.',
  },
  {
    id: 'culturalist',
    systemRole: 'Ты — культурный критик, видящий автомобили как символы эпохи и зеркало общественных настроений.',
    opening: 'НАЧАЛО: начни с культурного или социального контекста. Почему именно сейчас? Какой запрос общества отвечает эта машина? Свяжи технику с духом времени.',
  },
]

function pickFormat(carId) {
  // Детерминированный выбор формата по id — разные посты всегда разные
  const hash = (carId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return POST_FORMATS[hash % POST_FORMATS.length]
}

function buildResearchContext(research) {
  const parts = []
  if (research.wiki) {
    parts.push(`WIKIPEDIA:\n${research.wiki.slice(0, 1500)}`)
  }
  if (research.snippets.length) {
    parts.push(`НОВОСТНЫЕ ИСТОЧНИКИ:\n${research.snippets.map((s, i) => `${i+1}. ${s}`).join('\n')}`)
  }
  if (research.article) {
    parts.push(`ПОЛНЫЙ ТЕКСТ СТАТЬИ-ИСТОЧНИКА:\n${research.article.slice(0, 1200)}`)
  }
  return parts.length ? parts.join('\n\n') : null
}

function buildGraphContext(ctx) {
  const { matchedNode, ancestorChain, descendants, crossBrandLinks, siblingLinks, variants, brandSample } = ctx
  const parts = []

  if (matchedNode) {
    const chain = [...ancestorChain, matchedNode, ...descendants]
    parts.push(
      `ЦЕПОЧКА ЭВОЛЮЦИИ (${chain.length} пок.):\n` +
      chain.map(n =>
        `  ${n.year}  ${n.label}` +
        (n.hp       ? `  ${n.hp}л.с.`       : '') +
        (n.codeName ? `  [${n.codeName}]`   : '') +
        (n.bodyType ? `  ${n.bodyType}`     : '')
      ).join('\n')
    )
    if (variants?.length) {
      parts.push(`ВАРИАНТЫ: ${variants.map(v => v.label + (v.hp ? ` ${v.hp}л.с.` : '')).join(' | ')}`)
    }
    if (crossBrandLinks.length) {
      const crossText = crossBrandLinks.map(l =>
        `  ${matchedNode.label} ${l.dir} ${l.node.label} (${l.node.brandName}, ${l.type})`
      ).join('\n')
      parts.push(`КРОСС-БРЕНДОВЫЕ СВЯЗИ:\n${crossText}`)
    }
    if (siblingLinks?.length) {
      const sibText = siblingLinks.map(l =>
        `  ${matchedNode.label} ${l.dir} ${l.node.label} (${l.type})`
      ).join('\n')
      parts.push(`СВЯЗЬ С ДРУГОЙ МОДЕЛЬЮ ТОГО ЖЕ БРЕНДА (не прямая эволюция):\n${sibText}`)
    }
  } else if (brandSample.length) {
    parts.push(`ИСТОРИЯ БРЕНДА (выборка):\n${brandSample.map(n => `  ${n.year} ${n.label}`).join('\n')}`)
  }

  return parts.join('\n\n')
}

function buildAIMessages(car, ctx, research, format) {
  const graphCtx    = buildGraphContext(ctx)
  const researchCtx = buildResearchContext(research)
  const hasResearch = !!(researchCtx)

  const multiSrc = car._mergedCount > 1
    ? `\nСОБРАНО ИЗ ${car._mergedCount} ИСТОЧНИКОВ: ${car._sources?.join(', ')}. Синтезируй УНИКАЛЬНУЮ информацию — не повторяй одинаковые факты.\n`
    : ''

  // Кросс-брендовые связи по умолчанию тонут в ЭВОЛЮЦИИ как одна строчка среди
  // характеристик — если они есть, это обычно САМЫЙ интересный факт о модели
  // (общая платформа/донор-двигатель под кузовами противоположных по духу
  // марок), и его надо подавать как твист, а не проходную деталь.
  const crossBrandBoost = ctx.crossBrandLinks?.length
    ? `\nОСОБЫЙ АКЦЕНТ: смотри КРОСС-БРЕНДОВЫЕ СВЯЗИ в данных графа — сделай их главным содержанием истории, а не технической деталью. Прямо назови другой бренд/модель как неожиданность (в ИСТОРИИ или ЭВОЛЮЦИИ), подчеркни контраст характера/цены/имиджа марок при технической близости.\n`
    : ''

  // Как crossBrandBoost, но БЕЗ "контраста брендов" — донор тут той же марки
  // (напр. трек-концепт технически = гоночный прототип того же бренда под другим
  // именем). Акцент на самом факте родства, а не на межбрендовом твисте.
  const siblingBoost = ctx.siblingLinks?.length
    ? `\nОСОБЫЙ АКЦЕНТ: смотри СВЯЗЬ С ДРУГОЙ МОДЕЛЬЮ ТОГО ЖЕ БРЕНДА в данных графа — назови эту модель прямо и объясни связь (донор шасси/платформы, гоночный прототип и т.п.) как ключевой факт истории, а не проходную деталь.\n`
    : ''

  const userPrompt = `АВТОМОБИЛЬ: ${car.brand} ${car.name || car.fullName} (${car.year || '?'})
${car.description ? `КРАТКОЕ ОПИСАНИЕ: ${car.description}\n` : ''}${multiSrc}${crossBrandBoost}${siblingBoost}
${graphCtx ? `ДАННЫЕ AUTOEVOFLOW (граф эволюции):\n${graphCtx}\n` : ''}
${hasResearch ? `ДАННЫЕ ИЗ ОТКРЫТЫХ ИСТОЧНИКОВ:\n${researchCtx}\n` : ''}
НАРРАТИВНЫЙ УГОЛ: ${format.id.toUpperCase()}
${format.opening}

СТРУКТУРА — заголовки дословно, без изменений:
🏛 ИСТОРИЯ
🧬 ЭВОЛЮЦИЯ
⚡ ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ
🔮 ПРОГНОЗ

СВЯЗНОСТЬ — читать как ОДИН непрерывный рассказ, не 4 независимых карточки:
Каждый раздел обязан явно оттолкнуться от ПОСЛЕДНЕГО факта/числа предыдущего —
подхватом, продолжением сравнения или прямой отсылкой ("от этих X л.с. до...",
"тот же вызов решили иначе...", "результат этого скачка —..."). Запрещено
открывать раздел с нуля, будто предыдущего не было. Проверка: если поменять
местами два раздела местами, текст должен сломаться — это и значит, что связь
настоящая, а не косметическая.
ИСТОРИЯ → ЭВОЛЮЦИЯ: последнее число/факт ИСТОРИИ — стартовая точка первого
предложения ЭВОЛЮЦИИ (не повторяй его заново как новый факт — продолжай счёт).
ЭВОЛЮЦИЯ → ОСОБЕННОСТЬ: то, чем закончилась эволюция (последнее поколение/
цифра), должно быть ПРИЧИНОЙ, по которой возникла особенность — не два разных
предмета разговора.
ОСОБЕННОСТЬ → ПРОГНОЗ: прогноз отвечает на вопрос "и что дальше будет именно
с этой особенностью", а не открывает произвольную новую тему.

ЖЁСТКИЕ ТРЕБОВАНИЯ — нарушение = плохой пост:
ДЛИНА: ровно 90–110 слов суммарно. Короткие предложения, никакой воды.
ФАКТЫ: каждое предложение содержит ≥1 конкретного факта — год, цифра, имя, цена, модель.
ЗАПРЕЩЕНО: "является", "представляет собой", "позиционируется", "делает ставку", "переосмысленный", "новая точка отсчёта", "продолжает развивать", "твист", "фора".
ФОРМАТИРОВАНИЕ: <b>все ключевые числа и факты</b>, <i>технические названия и кодовые имена</i>. Не менее 8 тегов <b> в посте.
КОНКУРЕНТ: в разделе "ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ" — конкретное сравнение с главным соперником (цифра vs цифра), встроенное в связку с ЭВОЛЮЦИЕЙ, а не отдельной репликой.
ПРОГНОЗ: ровно 2 предложения. Конкретный год + технология или рыночный сценарий, вытекающий из ОСОБЕННОСТИ, а не с чистого листа.
ИСТОРИЯ: начни с самого неожиданного факта — не с "бренд основан в...".
HTML: только <b> и <i>. Запрещены * # _ ~ [ ] ( ).`

  return [
    { role: 'system', content: format.systemRole },
    { role: 'user',   content: userPrompt },
  ]
}

// ─── Аварийный шаблонный генератор (без внешнего AI) ─────────────────────────
async function generateTemplatePost(car, ctx) {
  const { matchedNode, ancestorChain, descendants, crossBrandLinks, siblingLinks } = ctx
  const chain  = matchedNode ? [...ancestorChain, matchedNode, ...descendants] : []
  const brand  = car.brand || matchedNode?.brandName || '?'
  const name   = car.name || car.fullName || matchedNode?.label || '?'
  const year   = car.year || matchedNode?.year || '?'
  const hp     = matchedNode?.hp
  const engine = matchedNode?.engineType
  const code   = matchedNode?.codeName

  let history = chain.length >= 2
    ? `Марка <b>${brand}</b> строит эту линейку с <b>${chain[0].year} года</b> — ${chain.length} поколений, каждое из которых меняло стандарты класса.`
    : `<b>${brand}</b> выводит <b>${name}</b> — новую модель в своей линейке.`

  let evolution = chain.length >= 3
    ? chain.map(n =>
        `<b>${n.year}</b> · ${n.label}` +
        (n.hp ? ` — <b>${n.hp} л.с.</b>` : '') +
        (n.codeName ? ` <i>[${n.codeName}]</i>` : '')
      ).join('\n')
    : `<b>${name}</b> — ${hp ? `${hp} л.с.` : 'новая страница'} в истории бренда.`

  const specParts = [hp && `<b>${hp} л.с.</b>`, engine && `<i>${engine}</i>`, code && `[<i>${code}</i>]`].filter(Boolean)
  let special = specParts.length ? `Технически: ${specParts.join(', ')}.` : `<b>${name}</b> устанавливает новую планку класса.`
  if (crossBrandLinks?.length) {
    const l = crossBrandLinks[0]
    special += ` Делит платформу с <b>${l.node.label}</b> (${l.node.brandName}).`
  } else if (siblingLinks?.length) {
    const l = siblingLinks[0]
    const verb = l.type === 'derived_from' ? 'Построена на базе' :
                 l.type === 'shares_platform' ? 'Делит платформу с' :
                 l.type === 'concept_to_production' ? 'Выросла из концепта' : 'Вдохновлена моделью'
    special += ` ${verb} <b>${l.node.label}</b>.`
  }

  const isEV = engine && /ev|electric|bev/i.test(engine)
  const next  = Math.max((parseInt(year) || 2025) + 6, 2028)
  const forecast = isEV
    ? `Электрификация <b>${brand}</b> продолжается. Следующий шаг — расширенный запас хода и быстрая зарядка нового поколения.`
    : `Следующее поколение ожидается около <b>${next} года</b>. Тренд — электрификация и рост мощности.`

  return [
    `🏛 <b>ИСТОРИЯ</b>\n\n${history}`,
    `🧬 <b>ЭВОЛЮЦИЯ</b>\n\n${evolution}`,
    `⚡ <b>ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ</b>\n\n${special}`,
    `🔮 <b>ПРОГНОЗ</b>\n\n${forecast}`,
  ].join('\n\n')
}

// ─── Wikipedia image (CC-лицензия) ───────────────────────────────────────────
const VEHICLE_RE = /\b(car|vehicle|automobile|truck|pickup|suv|sedan|van|electric|hybrid|motorcycle|bus|tractor|automotive|manufacturer|model|brand)\b/i
// Returns { src, articleUrl } so Telegram can use the article page (has OG tags) for link preview
async function wikiImageByQuery(query) {
  try {
    const q = encodeURIComponent(query)
    const searchRaw = await httpGet(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=4&namespace=0&format=json`
    )
    const [, titles] = JSON.parse(searchRaw)
    if (!titles?.length) return null
    for (const title of titles.slice(0, 4)) {
      try {
        const slug = encodeURIComponent(title.replace(/ /g, '_'))
        const raw  = await httpGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)
        const data = JSON.parse(raw)
        const desc = `${data.description || ''} ${(data.extract || '').slice(0, 200)}`
        if (!VEHICLE_RE.test(desc)) continue
        // Use originalimage (full res) or scale thumbnail to max 1280px (Wikimedia allowed size)
        let src = data.originalimage?.source
        if (!src && data.thumbnail?.source) {
          src = data.thumbnail.source.replace(/\/\d+px-/, '/1280px-')
        }
        if (src) {
          const fname = src.split('/').pop() || ''
          if (!/logo|badge|emblem|symbol|flag|seal|coat_of/i.test(fname)) {
            return {
              src,
              articleUrl: `https://en.wikipedia.org/wiki/${slug}`,
            }
          }
        }
      } catch {}
    }
  } catch {}
  return null
}

// Returns { imageUrl, articleUrl } — articleUrl is the Wikipedia page (has OG tags for Telegram preview)
async function fetchWikipediaImage(label, brand) {
  const b = (brand || '').replace(/[^\w\s]/g, ' ').trim()
  // Strip leading 4-digit year ("2027 Toyota RAV4" → "Toyota RAV4")
  const l = label.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
                 .replace(/^\d{4}\s+/, '')
  // If label already contains brand, use it directly; otherwise prepend
  const hasB = l.toLowerCase().startsWith(b.toLowerCase())
  const fullQ = hasB ? l : `${b} ${l}`.trim()
  // Keep model letters (Y, X, S), drop pure numbers (25, 4)
  const words = fullQ.split(/\s+/).filter(w => w.length > 0 && !/^\d+$/.test(w))
  // Try from longest to shortest: "Toyota RAV4" → "Toyota" → "Toyota Trucks" …
  const seen = new Set()
  const queries = []
  for (let n = words.length; n >= 1; n--) {
    const q = words.slice(0, n).join(' ')
    if (q && !seen.has(q)) { seen.add(q); queries.push(q) }
  }
  for (const suffix of ['Trucks', 'automobile', '']) {
    const q = suffix ? `${b} ${suffix}` : b
    if (q && !seen.has(q)) { seen.add(q); queries.push(q) }
  }

  for (const q of queries) {
    const result = await wikiImageByQuery(q)
    if (result) return { imageUrl: result.src, articleUrl: result.articleUrl }
  }
  return null
}

// ─── Telegram API ─────────────────────────────────────────────────────────────
// НЕ ретраим сетевые таймауты/обрывы сами по себе — Telegram может уже принять
// и отправить сообщение до того, как ответ дойдёт до нас (sendPhoto/sendMessage
// не идемпотентны, повторный вызов = реальный дубль в канале, именно так уже
// предположительно случилось один раз). Единственный случай, где повтор
// безопасен и ожидаем протоколом — явный ответ Telegram {ok:false, error_code:429}
// с retry_after: здесь Telegram точно НЕ обработал запрос, значит отправки не было.
async function tgRequest(method, body, _retried = false) {
  let res
  try {
    res = await fetch(`${tgBase()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch (e) {
    // Явная метка в сообщении об ошибке — чтобы при разборе логов было видно,
    // что сообщение МОГЛО уйти (Telegram мог принять запрос раньше обрыва),
    // в отличие от чёткого отказа Telegram (неверный chat_id, бан и т.п.).
    throw new Error(`TG ${method}: сеть оборвалась ДО получения ответа (мог(ло) уйти, не уйти — неизвестно): ${e.message}`)
  }
  const data = await res.json()
  if (!data.ok) {
    if (!_retried && data.error_code === 429 && data.parameters?.retry_after) {
      const waitMs = (data.parameters.retry_after + 1) * 1000
      console.warn(`  ⏳ TG ${method}: flood control, жду ${waitMs / 1000}s и пробую ещё раз`)
      await new Promise(r => setTimeout(r, waitMs))
      return tgRequest(method, body, true)
    }
    throw new Error(`TG ${method}: ${data.description}`)
  }
  return data
}

// Скачивает изображение и отправляет в Telegram как multipart/form-data (обход anti-hotlink)
async function tgSendPhotoBuffer(params, imageUrl) {
  const imgRes = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(20000),
  })
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const ext  = imageUrl.split('?')[0].split('.').pop().toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

  const form = new FormData()
  for (const [key, val] of Object.entries(params)) form.append(key, String(val))
  form.append('photo', new Blob([buffer], { type: mime }), `photo.${ext}`)

  const res = await fetch(`${tgBase()}/sendPhoto`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30000),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`TG sendPhoto (buffer): ${data.description}`)
  return data
}

// Slice HTML by VISIBLE char count, closing any open tags to avoid parse errors
function closeOpenTags(fragment) {
  const stack = []
  let i = 0
  while (i < fragment.length) {
    if (fragment[i] === '<') {
      const end = fragment.indexOf('>', i); if (end === -1) break
      const tag = fragment.slice(i + 1, end).trim()
      if (!tag.startsWith('/') && !tag.endsWith('/')) stack.push(tag.split(/\s/)[0])
      else if (tag.startsWith('/')) stack.pop()
      i = end + 1
    } else i++
  }
  let out = fragment
  while (stack.length) out += `</${stack.pop()}>`
  return out
}

// Режет HTML по видимым символам (игнорируя теги при подсчёте), но НЕ посреди
// слова/предложения. Живой найденный баг: прежний прямой character-cut рвал
// текст ровно на maxVisible символе вне зависимости от границы слова ("Это
// це" вместо "Это цена..."), т.к. слабые бесплатные AI-модели (см. цепочку
// провайдеров в generateStory()) часто игнорируют инструкцию про длину поста
// и выдают текст заметно длиннее лимита Telegram. Теперь откатываемся назад до
// ближайшего конца предложения, а если такого нет в разумных пределах — до
// границы слова, и добавляем "…", чтобы обрыв был явным, а не выглядел багом.
function safeSliceHTML(html, maxVisible) {
  let vis = 0, i = 0
  let lastSentenceEnd = -1
  let lastWordBreak = -1
  let truncated = false
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i); if (end === -1) break
      i = end + 1
    } else {
      if (vis >= maxVisible) { truncated = true; break }
      const ch = html[i]
      if ('.!?…'.includes(ch)) lastSentenceEnd = i + 1
      else if (/\s/.test(ch)) lastWordBreak = i
      vis++; i++
    }
  }
  if (!truncated) return html
  const lookback = Math.floor(maxVisible * 0.4)
  let cut = i
  if (lastSentenceEnd > 0 && lastSentenceEnd >= cut - lookback) cut = lastSentenceEnd
  else if (lastWordBreak > 0 && lastWordBreak >= cut - lookback) cut = lastWordBreak
  return closeOpenTags(html.slice(0, cut).trimEnd()) + '…'
}

// Раньше у скрейпленных (не из графа) машин pageUrl всегда оставался null —
// их некуда было вести ни на карточке /latest, ни из подписи в Telegram
// (фолбэк шёл на общий раздел "Новинки", а не на страницу ИМЕННО этой
// модели). Теперь у каждой публикации есть конкретная страница: /model/{id}
// для реального узла графа (там богаче — таймлайн, граф эволюции), иначе —
// собственная /latest/{id} (см. src/app/latest/[id]/page.tsx).
function resolvePageUrl(car, matchedNode) {
  const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  if (car.source === 'graph' && car.pageUrl) return car.pageUrl
  // matchedNode — результат getGraphContext(car, graph).matchedNode, найденный
  // соответствующий узел графа (если есть). Раньше сюда ничего не передавалось,
  // и функция реально никогда не возвращала /model/* для скрейпленных статей
  // (car.source у них никогда не 'graph') — несмотря на комментарий выше,
  // буквально обещающий именно такое поведение.
  if (matchedNode) return `${siteUrl}/model/${matchedNode.modelSlug || matchedNode.id}`
  return `${siteUrl}/latest/${car.id}`
}

// Сохраняет готовый пост (тот же текст/картинка, что ушли в Telegram) в
// public/data/published-stories.json — отдельно от published-ids.json
// (который хранит только служебные id/ключи дедупликации, без самого контента).
// Нужно, чтобы страница /latest на сайте могла показывать РЕАЛЬНО
// опубликованные в VIP-канале посты (с AI-текстом и картинкой), а не сырой
// нефильтрованный дамп скрапера без всякой связи с тем, что реально ушло в канал.
// Идемпотентность тизера во SECONDARY_CH по modelKey — защита от повторного
// "🚗 ..." в AutoEvoFlowGraphs, даже если publishCar по какой-то причине
// отработает для одной и той же модели дважды (конкретную причину одного
// такого случая — Cadillac Escalade-V 125th, 23.10.2026 — лог не объяснил:
// планировщик отработал ровно один раз, в published-stories.json всего одна
// запись, второго вызова publishTeaser в логе нет; раз причину не нашли,
// подстраховываемся на уровне симптома).
// ─── Реестр ссылок /model/{id} — одна реальная модель не должна получать
// несколько постов от разных источников (напр. NetCarShow + The Drive про
// один и тот же Audi Q9). NCS в приоритете: её материал всегда проходит,
// остальные источники блокируются, если модель уже занята ЛЮБЫМ источником;
// NCS блокируется, только если модель уже занята ДРУГОЙ публикацией NCS.
function getModelLinkOwner(modelLinkKey) {
  if (!modelLinkKey || !fs.existsSync(MODEL_LINK_REGISTRY)) return null
  try {
    const reg = JSON.parse(fs.readFileSync(MODEL_LINK_REGISTRY, 'utf-8'))
    return reg[modelLinkKey] || null
  } catch { return null }
}

function registerModelLink(modelLinkKey, car) {
  if (!modelLinkKey) return
  let reg = {}
  if (fs.existsSync(MODEL_LINK_REGISTRY)) {
    try { reg = JSON.parse(fs.readFileSync(MODEL_LINK_REGISTRY, 'utf-8')) } catch {}
  }
  reg[modelLinkKey] = {
    source: car.source,
    articleId: car.id,
    articleTitle: car.name || car.fullName,
    usedAt: new Date().toISOString(),
  }
  fs.mkdirSync(path.dirname(MODEL_LINK_REGISTRY), { recursive: true })
  fs.writeFileSync(MODEL_LINK_REGISTRY, JSON.stringify(reg, null, 2))
}

function wasTeaserSent(modelKey) {
  if (!modelKey) return false
  if (!fs.existsSync(PUBLISHED_STORIES)) return false
  try {
    const list = JSON.parse(fs.readFileSync(PUBLISHED_STORIES, 'utf-8')).stories || []
    return !!list.find(s => s.modelKey === modelKey)?.teaserSentAt
  } catch { return false }
}

function markTeaserSent(modelKey) {
  if (!modelKey || !fs.existsSync(PUBLISHED_STORIES)) return
  try {
    const data = JSON.parse(fs.readFileSync(PUBLISHED_STORIES, 'utf-8'))
    const entry = (data.stories || []).find(s => s.modelKey === modelKey)
    if (!entry) return
    entry.teaserSentAt = new Date().toISOString()
    fs.writeFileSync(PUBLISHED_STORIES, JSON.stringify(data, null, 2))
  } catch {}
}

function savePublishedStory(car, story, matchedNode) {
  const modelKey = car._modelKey
  if (!modelKey) return // нет ключа модели — нечего связывать с историей публикаций
  let list = []
  if (fs.existsSync(PUBLISHED_STORIES)) {
    try { list = JSON.parse(fs.readFileSync(PUBLISHED_STORIES, 'utf-8')).stories || [] } catch {}
  }
  const idx = list.findIndex(s => s.modelKey === modelKey)
  const prev = idx >= 0 ? list[idx] : null
  // editCarPost НЕ трогает car.imageUrl/pageUrl (Telegram не даёт сменить тип
  // сообщения через edit-методы) — без фолбэка на прежнюю запись правка поста
  // стирала бы уже сохранённую картинку/ссылку на null.
  const entry = {
    modelKey,
    id:          car.id,
    brand:       car.brand,
    brandSlug:   car.brandSlug,
    name:        car.name || car.fullName,
    fullName:    car.fullName || car.name,
    year:        car.year || null,
    story,                                               // тот же HTML (<b>/<i>), что в Telegram
    imageUrl:    car.imageUrl || prev?.imageUrl || null,
    pageUrl:     resolvePageUrl(car, matchedNode) || prev?.pageUrl || null,
    source:      car.source,
    sourceLabel: car.sourceLabel,
    publishedAt: new Date().toISOString(),
  }
  if (idx >= 0) list[idx] = entry   // editCarPost — обновляем запись на месте
  else list.unshift(entry)          // новая публикация — свежее сверху
  list = list.slice(0, MAX_PUBLISHED_STORIES)
  fs.mkdirSync(path.dirname(PUBLISHED_STORIES), { recursive: true })
  fs.writeFileSync(PUBLISHED_STORIES, JSON.stringify({ stories: list, updatedAt: new Date().toISOString() }, null, 2))
}

function buildCaption(car, story, matchedNode) {
  const header = `<b>🚗 ${car.name || car.fullName}</b>\n` +
                 (car.year ? `<i>${car.year} · ${car.brand}</i>\n\n` : `<i>${car.brand}</i>\n\n`)

  // Никогда не кредитуем внешний источник в посте — только ссылка на свой же
  // проект, и всегда на страницу ИМЕННО этой модели (не на общий раздел
  // "Новинки") — см. resolvePageUrl().
  const footerLink = `🔗 <a href="${resolvePageUrl(car, matchedNode)}">Открыть в AutoEvoFlow</a>`
  const footer = `\n\n${footerLink}`

  return header + story + footer
}

// Публикует новый пост. Возвращает { messageId, hasPhoto } — нужно для
// последующего editCarPost, если по этой же модели найдётся уникальная инфа.
async function publishToTelegram(car, story, channelId, matchedNode) {
  const rawCaption = buildCaption(car, story, matchedNode)

  if (car.imageUrl?.startsWith('http')) {
    // sendPhoto: try direct CDN URL first; if CDN blocks Telegram (anti-hotlink), download and upload buffer
    const photoParams = { chat_id: channelId, caption: safeSliceHTML(rawCaption, 1000), parse_mode: 'HTML' }
    try {
      const res = await tgRequest('sendPhoto', { ...photoParams, photo: car.imageUrl })
      return { messageId: res.result.message_id, hasPhoto: true }
    } catch (e) {
      if (/wrong type|Bad Request/i.test(e.message)) {
        try {
          const res = await tgSendPhotoBuffer(photoParams, car.imageUrl)
          return { messageId: res.result.message_id, hasPhoto: true }
        } catch (e2) {
          // Both failed — fall back to text only
          const res = await tgRequest('sendMessage', {
            chat_id: channelId, text: safeSliceHTML(rawCaption, 4000),
            parse_mode: 'HTML', disable_web_page_preview: true,
          })
          return { messageId: res.result.message_id, hasPhoto: false }
        }
      } else {
        throw e
      }
    }
  } else {
    // No image at all
    const res = await tgRequest('sendMessage', {
      chat_id:                  channelId,
      text:                     safeSliceHTML(rawCaption, 4000),
      parse_mode:               'HTML',
      disable_web_page_preview: true,
    })
    return { messageId: res.result.message_id, hasPhoto: false }
  }
}

// Редактирует УЖЕ опубликованный пост новым (переработанным ИИ) текстом —
// без смены картинки (Telegram не позволяет менять тип сообщения через edit,
// и это не нужно: цель — дополнить факты, а не подменить фото).
async function editTelegramPost(car, story, channelId, messageId, hasPhoto, matchedNode) {
  const rawCaption = buildCaption(car, story, matchedNode)
  if (hasPhoto) {
    await tgRequest('editMessageCaption', {
      chat_id: channelId, message_id: messageId,
      caption: safeSliceHTML(rawCaption, 1000), parse_mode: 'HTML',
    })
  } else {
    await tgRequest('editMessageText', {
      chat_id: channelId, message_id: messageId,
      text: safeSliceHTML(rawCaption, 4000), parse_mode: 'HTML',
      disable_web_page_preview: true,
    })
  }
}

// Эмодзи однозначно определяет, какой из 4 заголовков тут должен быть — не
// полагаемся на то, что модель воспроизведёт его дословно без опечаток (живой
// найденный баг: слабая бесплатная модель выдала "ЭВОЛЪЮЦИЯ" вместо
// "ЭВОЛЮЦИЯ"). Вместо подстраховки regex'ом под конкретную опечатку — просто
// принудительно подставляем канонический текст по эмодзи, какой бы текст
// модель ни сгенерировала рядом с ним.
const SECTION_HEADERS = {
  '🏛': 'ИСТОРИЯ',
  '🧬': 'ЭВОЛЮЦИЯ',
  '⚡': 'ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ',
  '🔮': 'ПРОГНОЗ',
}

// Живой найденный баг: модель иногда склеивает заголовок секции прямо в
// предложение без переноса строки и жирного начертания — например
// "🏛 ИСТОРИЕЙ ID.Tiguan стала попытка..." вместо "🏛 <b>ИСТОРИЯ</b>\nВ ...".
// Безобидно само по себе, НО если это происходит сразу во ВСЕХ 4 секциях
// (каждая — одна строка без внутренних переносов), то storyPreview() на
// фронтенде (который вырезает строки-шапки целиком по шаблону
// /^(emoji)\s+[^\n]+\n*/) вырезает ВСЕ 4 строки без остатка — карточка на
// /latest оказывается полностью пустой. Эта же функция и regex (см.
// SECTION_HEADER_RE ниже) продублированы из storyPreview() в
// src/app/latest/page.tsx, т.к. это отдельный CLI-скрипт без общего модуля
// с Next.js приложением — держать в синхроне при правках с обеих сторон.
// Проверяем не "идеальна ли разметка" (жирные ⟨b⟩-шапки — это косметика,
// не обязаны совпадать 1:1, см. разбор случая BMW 3-Series, где шапки без
// жирного начертания прекрасно рендерятся), а именно РЕАЛЬНЫЙ симптом:
// остаётся ли после вырезания шапок содержательный текст.
const SECTION_HEADER_RE = /^(🏛|🧬|⚡|🔮)\s*(?:<[bi]>)?(?:ИСТОРИ[ЕЙЯИ]{1,2}|ЭВОЛ[ЮЪ]ЦИ[ЕЙЯИ]{1,2}|ЧТО\s+ДЕЛАЕТ\s+Е[ЁE]\s+ОСОБЕННОЙ|ПРОГНОЗ)(?:<\/[bi]>)?:?\s*/gmu
function isWellFormedStory(text) {
  const plain = sanitizeStory(text)
    .replace(SECTION_HEADER_RE, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length >= 80
}

// ─── Нормализация форматирования для Telegram HTML ───────────────────────────
function sanitizeStory(text) {
  return text
    // Markdown bold → <b>
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    // Markdown italic (single *) → <i>, skip existing HTML
    .replace(/(?<!<[^>]*)\*(?!\*)(.+?)(?<!\*)\*(?![^<]*>)/g, '<i>$1</i>')
    // Markdown __bold__ → <b>
    .replace(/__(.+?)__/g, '<b>$1</b>')
    // Markdown _italic_ → <i>
    .replace(/_(?!_)(.+?)(?<!_)_/g, '<i>$1</i>')
    // Markdown ## headers → bold line
    .replace(/^#{1,3}\s+(.+)$/gm, '<b>$1</b>')
    // Section headers → канонический текст по эмодзи (не то, что написала модель)
    .replace(/^(🏛|🧬|⚡|🔮)\s+([А-ЯЁA-Z][А-ЯЁA-Z\s]{2,40})$/gm, (_, emoji) =>
      `${emoji} <b>${SECTION_HEADERS[emoji]}</b>`
    )
    // Strip forbidden chars outside of tags: ~ [ ] ( ) only if clearly markdown
    .replace(/~~(.+?)~~/g, '$1')  // strikethrough
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Тизер для второго (свободного) канала ───────────────────────────────────
// НЕ раскрывает полный текст истории (только заголовок + CTA в основной канал).
// Раньше сюда же добавлялись строки цепочки/л.с./типа мотора, но ТОЛЬКО когда
// getGraphContext() находил совпадение в графе — отсюда разная длина/структура
// карточки от поста к посту (живой найденный баг, замечен визуально: одни
// тизеры короче, другие длиннее). Хуже того, ошибка сопоставления (см. фикс в
// getGraphContext выше) могла протащить сюда данные ЧУЖОЙ модели. Теперь тизер
// всегда одного вида, независимо от источника и наличия графового совпадения.
async function publishTeaser(car, ctx) {
  if (!SECONDARY_CH) return
  const name  = car.name || car.fullName || ctx.matchedNode?.label || '?'
  const brand = car.brand || ctx.matchedNode?.brandName || '?'
  const year  = car.year  || ctx.matchedNode?.year || ''

  const lines = [
    `🚗 <b>${name}</b>  ${year ? `<i>${year} · ${brand}</i>` : `<i>${brand}</i>`}`,
    '',
    '<i>Полный разбор + хронология эволюции — в основном канале AutoEvoFlow</i>',
  ]

  const text = lines.join('\n')
  try {
    if (car.imageUrl?.startsWith('http')) {
      // Тизерная картинка: никаких premium данных в подписи
      await tgRequest('sendPhoto', {
        chat_id:    SECONDARY_CH,
        photo:      car.imageUrl,
        caption:    text.slice(0, 1000),
        parse_mode: 'HTML',
      })
    } else {
      await tgRequest('sendMessage', {
        chat_id:                  SECONDARY_CH,
        text,
        parse_mode:               'HTML',
        disable_web_page_preview: true,
      })
    }
    console.log(`  ✅ Тизер → secondary (${SECONDARY_CH})`)
  } catch (e) {
    console.warn(`  ⚠️  Тизер secondary failed: ${e.message}`)
  }
}

// Общий шаг для publishCar/editCarPost: веб-ресерч + AI-генерация (DeepSeek →
// Yandex → шаблон). Вынесено отдельно, чтобы editCarPost не дублировал всю
// цепочку фолбэков — она пересобирает историю с учётом НОВОЙ статьи в research.
async function generateStory(car, ctx, format) {
  // ── Веб-ресерч (параллельно: Wikipedia + DDG + статья) ────────────────────
  process.stdout.write(`  🔍 Исследование [${format.id}]... `)
  const research = await researchCar(car)
  const srcCount = [research.wiki, research.snippets.length, research.article].filter(Boolean).length
  console.log(`${srcCount} источник(а)`)

  // ── AI генерация: Gemini → DeepSeek → Yandex → шаблон ─────────────────────
  const messages = buildAIMessages(car, ctx, research, format)
  let story, provider

  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 Gemini 2.5 Flash... ')
    try {
      story = await callGemini(messages)
      if (story && isWellFormedStory(story)) { provider = 'Gemini'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 DeepSeek... ')
    try {
      story = await callDeepSeek(messages)
      if (story && isWellFormedStory(story)) { provider = 'DeepSeek'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.YANDEX_API_KEY && !process.env.YANDEX_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 YandexGPT... ')
    try {
      story = await callYandex(messages)
      if (story && isWellFormedStory(story)) { provider = 'YandexGPT'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.QWEN_API_KEY && !process.env.QWEN_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 Qwen Plus... ')
    try {
      story = await callQwen(messages)
      if (story && isWellFormedStory(story)) { provider = 'Qwen'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 OpenRouter (неск. free-моделей)... ')
    try {
      story = await callOpenRouter(messages)
      if (story && isWellFormedStory(story)) { provider = 'OpenRouter'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.CEREBRAS_API_KEY && !process.env.CEREBRAS_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 Cerebras (Llama 3.3 70B)... ')
    try {
      story = await callCerebras(messages)
      if (story && isWellFormedStory(story)) { provider = 'Cerebras'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 NVIDIA NIM (Llama 3.3 70B)... ')
    try {
      story = await callNvidia(messages)
      if (story && isWellFormedStory(story)) { provider = 'NVIDIA'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  if (!story && process.env.MISTRAL_API_KEY && !process.env.MISTRAL_API_KEY.startsWith('your_')) {
    process.stdout.write('  🤖 Mistral Small... ')
    try {
      story = await callMistral(messages)
      if (story && isWellFormedStory(story)) { provider = 'Mistral'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined }
    } catch (e) { console.log(`⚠️  ${e.message}`) }
  }

  // Живой случай: все настроенные провайдеры легли одновременно (Gemini 429
  // квота, DeepSeek 402 баланс, YandexGPT 403 права) — раньше это тихо уходило
  // в generateTemplatePost() ("BYD выводит BYD Shark — новую модель в своей
  // линейке...") и публиковалось как обычный пост. По явному решению
  // пользователя: лучше пропустить публикацию и повторить в следующий
  // прогон (когда какой-то из провайдеров отойдёт), чем разослать пустой
  // шаблон вместо текста. Бросаем ошибку — вызывающий код (publishCar/
  // editCarPost, цикл в main()) уже ловит её через try/catch и НЕ помечает
  // машину как опубликованную, так что она корректно останется в очереди.
  // Qwen и OpenRouter добавлены именно как независимые запасные варианты для
  // такого сценария — не завязаны на те же аккаунты/биллинг, что первые три.
  if (!story) throw new Error('Все AI-провайдеры недоступны — публикация отложена до следующего прогона')

  return { story: sanitizeStory(story), research, provider }
}

// ─── Публикация одного автомобиля ─────────────────────────────────────────────
async function publishCar(car, graph, channelId) {
  const label = car.name || car.fullName
  console.log(`  📝 ${label}`)

  const ctx    = getGraphContext(car, graph)

  // Межисточниковая защита от дублей по реальной модели графа (см. комментарий
  // у getModelLinkOwner) — проверяем ДО генерации текста, чтобы не тратить
  // AI-вызов на статью, которую всё равно отбросим.
  const modelLinkKey = ctx.matchedNode ? (ctx.matchedNode.modelSlug || ctx.matchedNode.id) : null
  const linkOwner = modelLinkKey ? getModelLinkOwner(modelLinkKey) : null
  if (linkOwner && !(car.source === 'netcarshow' && linkOwner.source !== 'netcarshow')) {
    throw new Error(`Модель уже публиковалась (источник: ${linkOwner.source}, /model/${modelLinkKey}) — пропуск, не дублируем контент про одну машину (приоритет у NCS)`)
  }

  const format = pickFormat(car.id || label)
  const { story, research, provider } = await generateStory(car, ctx, format)

  // ── 3. Картинка ───────────────────────────────────────────────────────────
  // thumbUrl/pressImage → sendPhoto (надёжно). Wikipedia → link_preview (OG-теги).
  process.stdout.write('  🖼  Картинка... ')
  // ВАЖНО: netcarshow.com отдаёт 403 на превью /R/*-thb.jpg (thumbUrl) при ЛЮБЫХ
  // заголовках — hotlink-защита именно на превьюшках, проверено вручную. Полный
  // -wallpaper.jpg (imageUrl) отдаётся 200 без каких-либо заголовков. Раньше код
  // ВСЕГДА перезатирал уже корректный car.imageUrl блокируемым thumbUrl — отсюда
  // "нет картинки" на каждом посте с этого источника.
  const scraperImage = car.imageUrl?.startsWith('http') ? car.imageUrl
    : car.thumbUrl?.startsWith('http') ? car.thumbUrl : null
  car.imageUrl   = null   // direct image for sendPhoto
  if (scraperImage) {
    car.imageUrl = scraperImage
    console.log(`✅ скрапер`)
  } else if (research.pressImage) {
    car.imageUrl = research.pressImage
    console.log(`✅ пресс-фото`)
  } else {
    // Раньше шло через previewUrl+link_preview_options ("Telegram сам подтянет
    // og:image статьи") — визуально это рисует карточку с бейджем "Wikipedia",
    // описанием и синим уголком ссылки НАД текстом, чего пользователь не хотел
    // видеть. wikiResult.imageUrl — прямая ссылка на файл, шлём как sendPhoto
    // (та же ветка, что скрапер/пресс-фото) — фото без чужого брендинга.
    const wikiResult = await fetchWikipediaImage(label, car.brand)
    if (wikiResult) {
      car.imageUrl = wikiResult.imageUrl
      console.log(`✅ Wikipedia (${wikiResult.articleUrl.split('/').pop()})`)
    } else {
      console.log(`(не найдена)`)
    }
  }

  const sent = await publishToTelegram(car, story, channelId, ctx.matchedNode)
  console.log(`  ✅ Опубликовано [${provider}]`)

  // Живой найденный баг: пост в Telegram УЖЕ ушёл (необратимо) в момент вызова
  // выше — всё, что ниже, это второстепенные шаги (локальный кэш для /latest,
  // тизер во второй канал). Раньше исключение в ЛЮБОМ из них улетало вызывающему
  // коду НЕ ПОЙМАННЫМ — тот видел "publishCar упал" и пропускал пометку модели
  // как опубликованной (publishedIds.add/persistPublishedIds в main()), хотя
  // реальный пост в канале уже существовал. На следующем прогоне модель снова
  // считалась новой и публиковалась повторно с заново сгенерированным (другим)
  // текстом — отсюда дубли с разным содержанием в канале. Теперь сбой здесь
  // только логируется, не мешая вызывающему коду корректно зафиксировать то,
  // что публикация уже состоялась.
  try {
    savePublishedStory(car, story, ctx.matchedNode)
  } catch (e) {
    console.error(`  ⚠️  savePublishedStory упал (пост в Telegram уже отправлен, не влияет на дедупликацию): ${e.message}`)
  }
  if (modelLinkKey) registerModelLink(modelLinkKey, car)

  // Тизер во второй канал (с задержкой флуд-лимита) — но не когда полный пост И ТАК
  // ушёл в SECONDARY_CH (GENERAL_CHANNEL_SOURCES): тизер на самого себя же дублирует пост.
  // wasTeaserSent — идемпотентность по modelKey, см. комментарий у её определения.
  if (SECONDARY_CH && channelId !== SECONDARY_CH && !wasTeaserSent(car._modelKey)) {
    try {
      await new Promise(r => setTimeout(r, 1500))
      await publishTeaser(car, ctx)
      markTeaserSent(car._modelKey)
    } catch (e) {
      console.error(`  ⚠️  publishTeaser упал (основной пост уже отправлен, не влияет на дедупликацию): ${e.message}`)
    }
  }

  return sent
}

// ─── Обновление уже опубликованного поста ─────────────────────────────────────
// Вызывается, когда по модели, что уже была опубликована, нашлась статья с
// НОВЫМ id (например, тест-драйв после анонса). research увидит текст новой
// статьи наравне со старыми источниками — story получается заново, ИИ сводит
// старые и новые факты в один текст ("переработано ИИ"), картинка и factsполя
// не трогаются — Telegram не даёт сменить тип сообщения через edit-методы.
async function editCarPost(car, graph, channelId, record) {
  const label = car.name || car.fullName
  console.log(`  ✏️  ${label} (дополняю уже опубликованный пост)`)

  const ctx    = getGraphContext(car, graph)
  const format = pickFormat(car.id || label)
  const { story, provider } = await generateStory(car, ctx, format)

  await editTelegramPost(car, story, channelId, record.messageId, record.hasPhoto, ctx.matchedNode)
  console.log(`  ✅ Отредактировано [${provider}]`)
  try {
    savePublishedStory(car, story, ctx.matchedNode)
  } catch (e) {
    console.error(`  ⚠️  savePublishedStory упал (правка в Telegram уже применена, не влияет на дедупликацию): ${e.message}`)
  }
  return true
}

// ─── Вспомогательные функции для режима --model ───────────────────────────────

// Преобразует ноду графа в объект формата "scraped car"
function nodeToCarObject(node) {
  const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return {
    id:          node.id,
    source:      'graph',
    sourceLabel: 'AutoEvoFlow',
    brand:       node.brandName || node.brandId,
    brandSlug:   node.brandId,
    name:        node.label,
    fullName:    node.label,
    year:        node.year,
    description: [
      node.hp        ? `${node.hp} л.с.`   : '',
      node.engineType ? node.engineType     : '',
      node.codeName   ? `[${node.codeName}]`: '',
      node.bodyType   ? node.bodyType       : '',
      node.segment    ? node.segment        : '',
    ].filter(Boolean).join(' · '),
    pageUrl:  `${siteUrl}/model/${node.id}`,
    thumbUrl: null,
    imageUrl: null,
  }
}

// ─── Dry-run: вывод истории в консоль без публикации ─────────────────────────
async function dryRun(car, graph) {
  const label = car.name || car.fullName
  console.log(`\n🔍 DRY RUN: ${label}\n`)

  const ctx    = getGraphContext(car, graph)
  const format = pickFormat(car.id || label)

  console.log(`─── ФОРМАТ: ${format.id.toUpperCase()} ───`)
  console.log(format.systemRole)

  console.log('\n─── КОНТЕКСТ ГРАФА ───')
  if (ctx.matchedNode) {
    const chain = [...ctx.ancestorChain, ctx.matchedNode, ...ctx.descendants]
    console.log('Цепочка:', chain.map(n => `${n.year} ${n.label}`).join(' → '))
    if (ctx.crossBrandLinks.length)
      console.log('Кросс-брендовые связи:', ctx.crossBrandLinks.map(l => `${l.node.label}(${l.type})`).join(', '))
    if (ctx.siblingLinks?.length)
      console.log('Связи внутри бренда:', ctx.siblingLinks.map(l => `${l.node.label}(${l.type})`).join(', '))
  } else {
    console.log('(нода не найдена — только данные скрапера)')
  }

  console.log('\n─── ВЕБ-РЕСЕРЧ ───')
  process.stdout.write('Исследую... ')
  const research = await researchCar(car)
  console.log(`Wiki: ${research.wiki ? research.wiki.slice(0, 120) + '…' : 'нет'}`)
  console.log(`DDG сниппеты: ${research.snippets.length} шт.`)
  if (research.snippets.length) research.snippets.forEach((s, i) => console.log(`  ${i+1}. ${s.slice(0,100)}`))
  console.log(`Статья: ${research.article ? research.article.slice(0, 120) + '…' : 'нет'}`)

  const messages = buildAIMessages(car, ctx, research, format)
  let story, provider

  console.log('\n─── ГЕНЕРАЦИЯ ───')
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('your_')) {
    process.stdout.write('Gemini 2.5 Flash... ')
    try { story = await callGemini(messages); if (story && isWellFormedStory(story)) { provider = 'Gemini'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.startsWith('your_')) {
    process.stdout.write('DeepSeek... ')
    try { story = await callDeepSeek(messages); if (story && isWellFormedStory(story)) { provider = 'DeepSeek'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.YANDEX_API_KEY && !process.env.YANDEX_API_KEY.startsWith('your_')) {
    process.stdout.write('YandexGPT... ')
    try { story = await callYandex(messages); if (story && isWellFormedStory(story)) { provider = 'YandexGPT'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.QWEN_API_KEY && !process.env.QWEN_API_KEY.startsWith('your_')) {
    process.stdout.write('Qwen Plus... ')
    try { story = await callQwen(messages); if (story && isWellFormedStory(story)) { provider = 'Qwen'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your_')) {
    process.stdout.write('OpenRouter (неск. free-моделей)... ')
    try { story = await callOpenRouter(messages); if (story && isWellFormedStory(story)) { provider = 'OpenRouter'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.CEREBRAS_API_KEY && !process.env.CEREBRAS_API_KEY.startsWith('your_')) {
    process.stdout.write('Cerebras (Llama 3.3 70B)... ')
    try { story = await callCerebras(messages); if (story && isWellFormedStory(story)) { provider = 'Cerebras'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY.startsWith('your_')) {
    process.stdout.write('NVIDIA NIM (Llama 3.3 70B)... ')
    try { story = await callNvidia(messages); if (story && isWellFormedStory(story)) { provider = 'NVIDIA'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story && process.env.MISTRAL_API_KEY && !process.env.MISTRAL_API_KEY.startsWith('your_')) {
    process.stdout.write('Mistral Small... ')
    try { story = await callMistral(messages); if (story && isWellFormedStory(story)) { provider = 'Mistral'; console.log('✅') }
      else if (story) { console.log('⚠️  плохой формат заголовков, пробуем дальше'); story = undefined } }
    catch (e) { console.log(`⚠️  ${e.message}`) }
  }
  if (!story) {
    console.log('❌ все провайдеры недоступны')
    console.log('\n⚠️  В реальном прогоне эта модель была бы ПРОПУЩЕНА (не опубликована),')
    console.log('   а не отправлена шаблоном — см. generateStory(). Повтор в следующий прогон.')
    return
  }
  story = sanitizeStory(story)

  const plain = story
    .replace(/<b>(.*?)<\/b>/g, '\x1b[1m$1\x1b[0m')
    .replace(/<i>(.*?)<\/i>/g, '\x1b[3m$1\x1b[0m')
    .replace(/<a href="[^"]*">(.*?)<\/a>/g, '$1')
    .replace(/<[^>]+>/g, '')
  console.log('\n' + plain + '\n')

  process.stdout.write('─── КАРТИНКА ───\n')
  const wikiResult = await fetchWikipediaImage(label, car.brand)
  if (wikiResult) {
    console.log(`✅ ${wikiResult.imageUrl}`)
    console.log(`   preview: ${wikiResult.articleUrl}`)
  } else {
    console.log('(не найдена)')
  }

  console.log('\n─── ИТОГ ───')
  console.log(`Провайдер: ${provider} | Формат: ${format.id} | Символов: ${story.length} | Слов: ~${story.split(/\s+/).length}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2)
  const isDry   = args.includes('--dry-run')
  const isForce = args.includes('--force')
  const modelIdx = args.indexOf('--model')
  const modelId  = modelIdx !== -1 ? args[modelIdx + 1] : null
  const carIdx   = args.indexOf('--car-id')
  const carId    = carIdx !== -1 ? args[carIdx + 1] : null

  // ── Режим --car-id <id>: публикуем конкретную машину из latest-cars.json ─────
  if (carId) {
    if (!fs.existsSync(LATEST_JSON)) { console.error('latest-cars.json не найден'); process.exit(1) }
    const latest = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf-8'))
    const cars   = latest.cars || []
    const car    = cars.find(c => c.id === carId)
    if (!car) { console.error(`[publish-stories] Машина не найдена: ${carId}`); process.exit(1) }
    console.log(`[publish-stories] Режим --car-id: ${car.name || car.fullName}`)
    const graph = loadGraph()
    if (isDry) { await dryRun(car, graph); return }
    const token = process.env.TELEGRAM_BOT_TOKEN, channelId = process.env.TELEGRAM_CHANNEL_ID
    if (!token || token === 'your_bot_token_here') { console.error('TELEGRAM_BOT_TOKEN не задан'); process.exit(1) }
    await publishCar(car, graph, channelId)
    // Сохраняем ID в published-ids.json
    const savedPub = fs.existsSync(PUBLISHED_IDS) ? JSON.parse(fs.readFileSync(PUBLISHED_IDS, 'utf-8')) : { ids: [] }
    if (!savedPub.ids.includes(car.id)) {
      savedPub.ids.push(car.id)
      savedPub.updatedAt = new Date().toISOString()
      savedPub.total = savedPub.ids.length
      fs.writeFileSync(PUBLISHED_IDS, JSON.stringify(savedPub, null, 2))
    }
    return
  }

  // ── Режим --model <nodeId>: публикуем конкретную ноду из графа ──────────────
  if (modelId) {
    const graph = loadGraph()
    const node  = graph.nodes.find(n => n.id === modelId || n.modelSlug === modelId)
    if (!node) {
      console.error(`[publish-stories] Нода не найдена: ${modelId}`)
      console.error('  Используй точный id (например: gen-g80-2) или modelSlug')
      process.exit(1)
    }
    const car = nodeToCarObject(node)
    console.log(`[publish-stories] Режим --model: ${node.label} (${node.year})`)

    if (isDry) {
      await dryRun(car, graph)
      return
    }

    const token     = process.env.TELEGRAM_BOT_TOKEN
    const channelId = process.env.TELEGRAM_CHANNEL_ID
    if (!token || token === 'your_bot_token_here') { console.error('TELEGRAM_BOT_TOKEN не задан'); process.exit(1) }
    if (!channelId || channelId === 'your_channel_id_here') { console.error('TELEGRAM_CHANNEL_ID не задан'); process.exit(1) }

    const sent = await publishCar(car, graph, channelId)
    // Сохраняем ID + ключ + messageId (та же схема, что в автоматическом режиме) —
    // иначе будущий скрапнутый дубль этой же модели не поймается по ключу, и
    // этот пост нельзя будет дополнить через editCarPost.
    const savedPub2 = fs.existsSync(PUBLISHED_IDS) ? JSON.parse(fs.readFileSync(PUBLISHED_IDS, 'utf-8')) : { ids: [], keys: [], records: {} }
    if (!savedPub2.ids.includes(car.id)) {
      savedPub2.ids.push(car.id)
      const key = extractModelKey(car)
      savedPub2.keys = [...new Set([...(savedPub2.keys || []), key])]
      savedPub2.records = savedPub2.records || {}
      if (sent?.messageId) {
        savedPub2.records[key] = { messageId: sent.messageId, hasPhoto: !!sent.hasPhoto, ids: [car.id], updatedAt: new Date().toISOString() }
      }
      savedPub2.updatedAt = new Date().toISOString()
      savedPub2.total = savedPub2.ids.length
      fs.writeFileSync(PUBLISHED_IDS, JSON.stringify(savedPub2, null, 2))
    }
    return
  }

  // ── Режим dry-run без --model: превью первой новой модели из скрапера ────────
  if (isDry) {
    if (!fs.existsSync(LATEST_JSON)) { console.error('latest-cars.json не найден'); process.exit(1) }
    const latest = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf-8'))
    const cars   = latest.cars || []

    let publishedIds = new Set()
    if (!isForce && fs.existsSync(PUBLISHED_IDS)) {
      try { publishedIds = new Set(JSON.parse(fs.readFileSync(PUBLISHED_IDS, 'utf-8')).ids || []) } catch {}
    }

    const target = isForce ? cars[0] : cars.find(c => !publishedIds.has(c.id))
    if (!target) { console.log('Нет новых моделей для превью'); return }

    const graph = loadGraph()
    await dryRun(target, graph)
    return
  }

  // ── Обычный автоматический режим (из scrape-latest.js) ────────────────────
  const token     = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.TELEGRAM_CHANNEL_ID

  if (!token || token === 'your_bot_token_here') {
    console.log('[publish-stories] TELEGRAM_BOT_TOKEN не задан — пропускаю')
    return
  }
  if (!channelId || channelId === 'your_channel_id_here') {
    console.log('[publish-stories] TELEGRAM_CHANNEL_ID не задан — пропускаю')
    return
  }
  if (!fs.existsSync(LATEST_JSON)) {
    console.log('[publish-stories] latest-cars.json не найден')
    return
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf-8'))
  const cars   = latest.cars || []

  let publishedIds = new Set()
  let publishedKeys = new Set()
  let records = {}   // modelKey → { messageId, hasPhoto, ids: [...], updatedAt } — нужно для editCarPost
  if (fs.existsSync(PUBLISHED_IDS)) {
    try {
      const saved = JSON.parse(fs.readFileSync(PUBLISHED_IDS, 'utf-8'))
      publishedIds = new Set(saved.ids || [])
      publishedKeys = new Set(saved.keys || [])
      records = saved.records || {}
    } catch {}
  }

  // Источники с чистыми именами: netcarshow + RSS после extractCarName-фильтрации
  const GOOD_SOURCES = new Set([
    'netcarshow', 'netcarshow-concept',
    'thedrive', 'carbuzz', 'driving', 'jalopnik',
    'carscoops', 'caranddriver', 'motor1', 'roadandtrack',
    // Эти 4 уже давно скрапятся в scrape-latest.js той же extractCarName-очисткой,
    // что источники выше, но их забыли добавить сюда — статьи копились в
    // latest-cars.json и никогда не публиковались. 2026-08-24.
    'autoevolution', 'classicdriver', 'hagerty', 'benztuning',
    // Новые источники, добавленные в scrape-latest.js 2026-08-24.
    'insideevs', 'electrek', 'autoweek', 'torquenews',
    // a777 сознательно НЕ включён: своя нестандартная regex-экстракция имени
    // (не extractCarName), русскоязычные description — не то же качество данных,
    // что у остальных источников. Остаётся только для обогащения графа (lap-time/specs).
  ])
  const NCS_SOURCES = new Set(['netcarshow', 'netcarshow-concept'])
  const goodCars = cars.filter(c => GOOD_SOURCES.has(c.source))
  const clickbaitSkipped = goodCars.filter(isClickbaitHeadline).length
  if (clickbaitSkipped > 0) console.log(`[publish-stories] Пропущено ${clickbaitSkipped} статей с кликбейт-заголовком вместо факта о модели`)
  const nonClickbait = goodCars.filter(c => !isClickbaitHeadline(c))
  // NCS публикуем как есть, остальные источники — только реальные новинки
  const genuineOnly = nonClickbait.filter(c => NCS_SOURCES.has(c.source) || isGenuineNewRelease(c))
  const retroSkipped = nonClickbait.length - genuineOnly.length
  if (retroSkipped > 0) console.log(`[publish-stories] Пропущено ${retroSkipped} архивных/ретро статей (не новинки) из прочих источников`)

  // Имя должно быть настоящим названием модели, а не обрывком предложения —
  // применяем ко ВСЕМ источникам (в т.ч. NCS: дефект другого рода, но проверка та же)
  const qualityCars = genuineOnly.filter(looksLikeRealModelName)
  const badNameSkipped = genuineOnly.length - qualityCars.length
  if (badNameSkipped > 0) console.log(`[publish-stories] Пропущено ${badNameSkipped} статей — имя не похоже на реальную модель (бренд не сразу после года)`)

  // Группируем по модели → один пост на модель, независимо от числа источников
  const groups = groupByModel(qualityCars)
  const newGroups    = []
  const enrichGroups = []  // модель уже публиковалась, но нашлась статья с НОВЫМ id
  for (const [key, group] of groups) {
    // ID-проверка ловит только точный повтор той же статьи. Ключ-проверка ловит
    // ту же модель, всплывшую ПОЗЖЕ под новым id (новая галерея/статья того же
    // релиза в следующем скрейпе) — раньше это проходило как "новая модель" и
    // публиковалось повторно с другим сгенерированным текстом (напр. Audi C Concept).
    const anyPublished = group.some(c => publishedIds.has(c.id)) || publishedKeys.has(key)
    if (!anyPublished || isForce) {
      const merged = mergeGroup(group)
      merged._modelKey = key
      newGroups.push(merged)
      continue
    }
    // Уже публиковали эту модель — правим существующий пост, только если у нас
    // есть его messageId (записи до этой фичи его не содержат — тогда просто
    // пропускаем, редактировать нечего) И статья реально новая (иначе будем
    // без толку переписывать пост на каждый повторный скрейп той же статьи).
    const record = records[key]
    if (!record?.messageId) continue
    const recordedIds = new Set(record.ids || [])
    const hasNewArticle = group.some(c => !publishedIds.has(c.id) && !recordedIds.has(c.id))
    if (!hasNewArticle) continue
    const merged = mergeGroup(group)
    merged._modelKey = key
    merged._record = record
    enrichGroups.push(merged)
  }

  console.log(`[publish-stories] Групп моделей: ${groups.size} всего, ${newGroups.length} новых, ${enrichGroups.length} с уникальной инфой к уже опубликованным`)
  newGroups.forEach(g => {
    const srcInfo = g._mergedCount > 1 ? ` [${g._mergedCount} источника: ${g._sources.join(', ')}]` : ''
    console.log(`  • ${g.brand} ${g.name || g.fullName} (${g.year || '?'})${srcInfo}`)
  })
  enrichGroups.forEach(g => console.log(`  ✏️  ${g.brand} ${g.name || g.fullName} (${g.year || '?'}) — обновлю пост`))

  if (!newGroups.length && !enrichGroups.length) {
    console.log('[publish-stories] Нет новых моделей и нечего дополнять — пропускаю')
    return
  }

  const toPublish = newGroups.slice(0, 3)     // максимум 3 новых поста за запуск
  const toEdit    = enrichGroups.slice(0, 2)  // максимум 2 правки за запуск
  const graph     = loadGraph()
  let published = 0
  let edited     = 0

  // Сохраняем дедупликацию сразу после КАЖДОГО успешного поста/правки, а не
  // одним файлом в самом конце всего прогона. Живой найденный баг: при записи
  // только в конце — если процесс оборвётся/убьётся по таймауту где-то в
  // середине цикла (что стало вероятнее с цепочкой из нескольких free-моделей
  // OpenRouter по 60с каждая на один вызов), уже реально отправленные в
  // Telegram посты теряли отметку "опубликовано" и уходили в повторную
  // публикацию на следующем прогоне — отсюда дубли в канале.
  const persistPublishedIds = () => {
    fs.mkdirSync(path.dirname(PUBLISHED_IDS), { recursive: true })
    fs.writeFileSync(PUBLISHED_IDS, JSON.stringify({
      ids: [...publishedIds],
      keys: [...publishedKeys],
      records,
      updatedAt: new Date().toISOString(),
      total: publishedIds.size,
    }, null, 2))
  }

  for (let i = 0; i < toPublish.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 3500))
    const car = toPublish[i]
    try {
      // Источники из GENERAL_CHANNEL_SOURCES едут в общий канал целиком, а не в VIP —
      // если общий канал ещё не настроен (SECONDARY_CH пуст), тихо остаёмся на VIP.
      const targetChannel = (GENERAL_CHANNEL_SOURCES.has(car.source) && SECONDARY_CH) ? SECONDARY_CH : channelId
      const sent = await publishCar(car, graph, targetChannel)
      const mergedIds = car._mergedIds || [car.id]
      // Помечаем ВСЕ id группы как опубликованные + модельный ключ (см. выше)
      for (const id of mergedIds) publishedIds.add(id)
      if (car._modelKey) {
        publishedKeys.add(car._modelKey)
        if (sent?.messageId) {
          records[car._modelKey] = {
            messageId: sent.messageId, hasPhoto: !!sent.hasPhoto, channelId: targetChannel,
            ids: mergedIds, updatedAt: new Date().toISOString(),
          }
        }
      }
      published++
      persistPublishedIds()
    } catch (e) {
      console.error(`  ❌ ${car.name || car.id}: ${e.message}`)
    }
  }

  // Правим уже опубликованные посты, для которых нашлась статья с уникальной
  // инфой — та же задержка от флуд-лимита, что и у новых публикаций.
  for (let i = 0; i < toEdit.length; i++) {
    if (i > 0 || toPublish.length) await new Promise(r => setTimeout(r, 3500))
    const car = toEdit[i]
    try {
      // Правим пост в канале, где он РЕАЛЬНО лежит (старые записи без channelId — VIP по умолчанию),
      // а не пересчитываем канал заново из текущего car.source — иначе смена состава источников
      // между скрейпами могла бы отправить editMessage в чужой канал.
      const editChannel = car._record.channelId || channelId
      await editCarPost(car, graph, editChannel, car._record)
      const mergedIds = car._mergedIds || [car.id]
      for (const id of mergedIds) publishedIds.add(id)
      records[car._modelKey] = {
        ...car._record,
        channelId: editChannel,
        ids: [...new Set([...(car._record.ids || []), ...mergedIds])],
        updatedAt: new Date().toISOString(),
      }
      edited++
      persistPublishedIds()
    } catch (e) {
      console.error(`  ❌ ${car.name || car.id}: ${e.message}`)
    }
  }

  console.log(`[publish-stories] ✅ Опубликовано ${published}/${toPublish.length}, отредактировано ${edited}/${toEdit.length}`)
  if (newGroups.length > toPublish.length)
    console.log(`  ℹ️  Ещё ${newGroups.length - toPublish.length} новых — в следующем запуске`)
  if (enrichGroups.length > toEdit.length)
    console.log(`  ℹ️  Ещё ${enrichGroups.length - toEdit.length} правок — в следующем запуске`)
}

main().catch(e => {
  console.error('[publish-stories] ОШИБКА:', e.message)
  process.exit(0)  // exit 0 чтобы не прерывать цепочку scrape-latest
})
