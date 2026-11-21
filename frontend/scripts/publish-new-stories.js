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
 *
 * Качество текста: пост уходит только если он прошёл isWellFormedStory (язык, длина,
 * название модели) И checkStoryFacts (каждая цифра с единицей и каждое название
 * латиницей есть в данных, которые видела модель). Не прошёл — одна повторная попытка
 * с перечнем выдуманного, затем следующий провайдер, затем пропуск до следующего прогона.
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
  // Название обязано содержать МОДЕЛЬ, а не только год и бренд. "2028 Subaru" и
  // "2027 Chevrolet" проходили проверку позиции бренда ниже (бренд сразу после
  // года), и пост уходил в канал с заголовком без модели (11.11.2026).
  if (!hasModelName(car)) return false
  const brand = (car.brand || car.brandName || '').trim()
  if (!brand) return true // нет данных о бренде — нечем проверить, пропускаем как есть
  const brandIdx = name.toLowerCase().indexOf(brand.toLowerCase())
  if (brandIdx === -1) return false // бренда нет в названии вообще — подозрительно
  const before = name.slice(0, brandIdx).trim()
  if (!before) return true // бренд — первое слово, всё чисто
  const nonYearWords = before.split(/\s+/).filter(w => w && !/^(19|20)\d\d$/.test(w))
  return nonYearWords.length <= 2
}

// Остаток названия после вычета года, бренда и служебных слов (то, что и есть
// модель). В отличие от extractModelKey цифровые модели ("911", "Smart 2") тут
// сохраняются — иначе их пришлось бы считать безымянными.
function modelRemainder(car) {
  const brand = (car.brand || car.brandName || '').toLowerCase()
  let n = (car.name || car.fullName || '').toLowerCase().split(':')[0]
  n = n.replace(/\b(19|20)\d{2}\b/g, ' ')
  for (const w of brand.split(/\s+/).filter(Boolean)) {
    n = n.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ')
  }
  n = n.replace(NOISE_WORDS, ' ')
  return n.replace(/[^a-z0-9а-яё#\- ]/gi, ' ').replace(/\s+/g, ' ').trim()
}
// Достаточно хотя бы одного буквенно-цифрового символа: "Smart 2", "Nissan Z"
// — настоящие названия из одного знака, пустой остаток ("2028 Subaru") — нет.
function hasModelName(car) {
  return /[a-z0-9а-яё]/i.test(modelRemainder(car))
}

// Пост обязан быть про ТУ машину, что в заголовке: хотя бы один отличительный
// токен модели должен встретиться в тексте. Служебные слова ("Series", "Class")
// и одиночные цифры не считаем: легитимный пост про "3-Series" называет её
// "M350"/"Neue Klasse" и слова Series не содержит — такие названия проверить
// по тексту нечем, пропускаем. Остальное замерено: 56 из 56 нормальных постов.
const GENERIC_MODEL_WORDS = /^(series|serie|class|klasse|line|range|edition|sport|model|models)$/i
function storyMentionsModel(plainText, car) {
  const distinctive = (s) => s.split(/[^a-z0-9а-яё#]+/i).filter(t => t.length >= 2 && !GENERIC_MODEL_WORDS.test(t))
  const rem = modelRemainder(car)
  // Нет отличительного идентификатора ("3-Series", "C-Class", "Smart 2") —
  // проверить по тексту нечем, не придираемся.
  if (!distinctive(rem.split(' ')[0] || '').length) return true
  // Любой отличительный токен названия (хвост-хук заголовка лишь добавляет шансов
  // совпасть, не отнимает). Сравнение без пробелов/дефисов: "GLE 53" ↔ "gle53".
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9а-яё#]+/g, '')
  const text = norm(plainText)
  return distinctive(rem).some(t => text.includes(norm(t)))
}

// Для доборных текстов из поиска (DDG): страница должна упоминать ВСЕ отличительные токены названия. Мягкое
// «любой токен» из storyMentionsModel тут не годится: страница про T-Roc R упоминает «Golf R» и проходила бы
// для «Golf GTI Rabbit Edition» — в пост про Rabbit Edition (21.11.2026) попали цифры 245 кВт / 333 PS / 420 Н·м
// от Golf R / T-Roc R. Нет отличительных токенов — проверить нечем, пропускаем.
function textCoversModel(text, car) {
  const distinctive = (s) => s.split(/[^a-z0-9а-яё#]+/i).filter(t => t.length >= 2 && !GENERIC_MODEL_WORDS.test(t))
  const toks = distinctive(modelRemainder(car))
  if (!toks.length) return true
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9а-яё#]+/g, '')
  const hay = norm(text)
  return toks.every(t => hay.includes(norm(t)))
}

// Очистка названия от редакционного хука — общий модуль (его же использует sync-latest-to-project.js)
const { cleanModelName, withCleanName } = require('./lib/clean-model-name')

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
      // Только страницы, где упомянута именно эта модель (см. textCoversModel): поиск часто отдаёт соседние модели.
      const extraTexts = extraResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value).filter(t => textCoversModel(t, car))
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
    snippets:           (ddg.snippets || []).filter(s => textCoversModel(s, car)),   // сниппеты про соседние модели не берём
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
        res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body, signal: AbortSignal.timeout(60_000) })
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
// 2026-11-11: nemotron-3-super-120b и laguna-s-2.1 сняты с каталога (404 "no
// longer available"), из-за чего весь пул молча отваливался и публикация
// стояла с 31 октября. Замена проверена живым русскоязычным вызовом:
// gemma-4-31b-it — 200 за ~1.3с, хороший русский (бывает 429 shared-pool на
// upstream Google); openrouter/free — роутер по любой живой free-модели;
// nemotron-3.5-* НЕ годятся — reasoning, при max_tokens 1800 content пустой.
// Слабые/непредсказуемые модели (LFM2.5 2.6B, роутер openrouter/free) для ПУБЛИЧНЫХ
// постов сознательно исключены: на русский промпт они отвечали по-английски и
// выдумывали факты ("8 колёсных арок против 6") — 9–11.11.2026 три таких поста
// ушли в канал. Лучше пропустить публикацию, чем отправить мусор.
const OPENROUTER_FREE_MODELS = [
  'google/gemma-4-31b-it:free',          // Google AI Studio — лучший русский из живых
  'google/gemma-4-26b-a4b-it:free',      // тот же upstream, но свой rate-limit бакет
]

async function callOpenRouter(messages) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || key.startsWith('your_')) return null

  // Копим причины по КАЖДОЙ модели: раньше в лог попадала только последняя, и
  // сбой первых моделей пула (429/404/таймаут) оставался невидимым — именно
  // так список успел молча протухнуть.
  const errors = []
  for (const model of OPENROUTER_FREE_MODELS) {
    // До 2 попыток на модель: "temporarily rate-limited upstream" (429) —
    // перегрузка общего free-пула Google, обычно проходит через несколько секунд.
    for (let attempt = 1; attempt <= 2; attempt++) {
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
          // max_tokens с запасом + reasoning low: reasoning-модели (openrouter/free
          // часто маршрутизирует на них, LFM2.5 тоже) раньше выедали весь лимит 1800
          // на скрытые "размышления" и отдавали пустой content (finish=length).
          body: JSON.stringify({ model, messages, max_tokens: 4500, temperature: 0.72, reasoning: { effort: 'low' } }),
          signal: AbortSignal.timeout(60_000),
        })
        if (res.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 8000)); continue }
        if (!res.ok) { errors.push(`${model} ${res.status}: ${(await res.text()).replace(/\s+/g, ' ').slice(0, 170)}`); break }
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (content) return content
        errors.push(`${model}: empty response (finish=${data.choices?.[0]?.finish_reason ?? '?'})`)
        break
      } catch (e) { errors.push(`${model}: ${e.message}`); break }
    }
  }
  throw new Error(`OpenRouter: ${errors.join(' | ') || 'all free models unavailable'}`)
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

// ── Groq (openai/gpt-oss-120b) ───────────────────────────────────────────────
// Бесплатный и быстрый, но с рабочей/офисной сети Groq отдаёт 403 (блокировка на
// уровне сети) — реально работает из GitHub Actions, где теперь и живёт публикация.
// gpt-oss — reasoning-модель: скрытые «размышления» идут в тот же лимит max_tokens.
// Тот же вызов (эндпоинт/модель) в src/app/api/nextgen/route.ts уже проверен на проде.
// Живой лог CI 16.11.2026 (пять запросов подряд, ни одного поста):
//  • 3 из 5 отбиты 429 по TPM: на бесплатном тарифе (on_demand) у gpt-oss-120b 8000 токенов
//    в минуту на ВСЮ организацию (делится с nextgen-прогнозами и другими проектами), причём
//    Groq закладывает в расход prompt + max_tokens ещё до ответа ("Used 4031/7152/6646");
//  • 2 прошедших вернули пустой content без ошибки: reasoning среднего уровня выедал max_tokens
//    на подсчёт «ровно 90–110 слов» и проверку ограничений, до самого текста дело не доходило.
// Поэтому: reasoning_effort low (как reasoning.effort в OpenRouter ниже), max_tokens по размеру
// поста (≈100 слов), на 429 ждём время, которое подсказал Groq, и повторяем, а пустой ответ — это
// ошибка с причиной в логе (finish/usage), а не тихий null, после которого пост молча пропадал.
function groqRetryDelayMs(res, bodyText) {
  let sec = Number(res.headers.get('retry-after'))
  if (!(sec > 0)) {
    const m = /try again in\s+(?:(\d+)m)?\s*([\d.]+)\s*(ms|s)\b/i.exec(bodyText || '')
    if (m) sec = Number(m[1] || 0) * 60 + (m[3].toLowerCase() === 'ms' ? Number(m[2]) / 1000 : Number(m[2]))
  }
  if (!(sec > 0)) sec = 15 // Groq не подсказал: окно TPM скользящее, 15 с обычно хватает
  if (sec > 70) return null // суточный лимит (TPD): ждать десятки минут внутри прогона бессмысленно
  return Math.max(2000, Math.round(sec * 1000) + 1000)
}

async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY
  if (!key || key.startsWith('your_')) return null
  const payload = { model: 'openai/gpt-oss-120b', messages, max_tokens: 2500, temperature: 0.5, reasoning_effort: 'low' }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    })
    if (res.status === 429 && attempt < 3) {
      const text = await res.text()
      const wait = groqRetryDelayMs(res, text)
      if (wait == null) throw new Error(`Groq 429 (суточный лимит, ждать бессмысленно): ${text.replace(/\s+/g, ' ').slice(0, 160)}`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) {
      const text = (await res.text()).replace(/\s+/g, ' ')
      // reasoning_effort не принят (модель/API изменились): пробуем без него, а не теряем весь вызов
      if (res.status === 400 && payload.reasoning_effort && /reasoning/i.test(text)) { delete payload.reasoning_effort; continue }
      throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    const choice = data.choices?.[0]
    const content = choice?.message?.content
    if (content && content.trim()) return content
    throw new Error(`Groq: пустой ответ (finish=${choice?.finish_reason ?? '?'}, completion_tokens=${data.usage?.completion_tokens ?? '?'})`)
  }
  throw new Error('Groq: попытки исчерпаны')
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE POST GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

// Два фактологических формата — выбираются детерминировано по id ноды.
// До 20.11.2026 было четыре «нарративных» (провокатор, историк эпохи, инженер, культурный критик) и правило
// «каждый раздел отталкивается от последнего числа предыдущего»: модель с низким reasoning выдумывала
// «эпоху пост-социалистических перемен», «запрос молодёжи», «инженерные вызовы», «скачки мощности»
// 88→124→107→138→148 л.с. (Hyundai Elantra), а в данных этого не было. Теперь — сводка фактов без «духа эпохи».
const POST_FORMATS = [
  {
    id: 'news',
    systemRole: 'Ты — автожурналист-новостник. Пишешь сводку фактами: что показано или изменено, какие цифры и даты названы, что уже объявлено, а что пока нет. Никаких догадок о мотивах, «духа эпохи» и запросов общества.',
    opening: 'ПОДАЧА: начни с главной новости из данных — одним конкретным фактом (что именно показано, изменено или объявлено). Историю подавай как короткую датированную справку.',
  },
  {
    id: 'history',
    systemRole: 'Ты — автомобильный историк-фактолог. Опираешься только на даты, поколения и названия из данных; не объясняешь «почему» там, где данные этого прямо не говорят.',
    opening: 'ПОДАЧА: начни с датированной предыстории модели из данных (когда появилась, какое поколение, что было до новинки), затем переходи к новости. Дат в данных нет — одна короткая фраза без дат.',
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

// Связь графа → обычная фраза. Служебные метки (derived_from, shares_platform…) модель раньше пересказывала
// дословно («дизайн-язык был inspired_by G70», 19.11.2026), поэтому переводим их в слова; inspired_by не
// передаём вовсе: это слабая догадка графа, а не факт.
function describeGraphLink(matchLabel, l) {
  const other = `${l.node.label} (${l.node.brandName})`
  switch (l.type) {
    case 'derived_from':          return l.dir === '→' ? `${matchLabel} построена на базе ${other}` : `${other} построена на базе ${matchLabel}`
    case 'shares_platform':       return `${matchLabel} и ${other} делят платформу`
    case 'concept_to_production': return l.dir === '→' ? `${matchLabel} — концепт, серийная версия: ${other}` : `${matchLabel} — серийная версия концепта ${other}`
    default:                      return null
  }
}

// Числа (л.с.) из графа в промпт НЕ идут. У узлов бывают чужие данные: «660 л.с.» у i7 G70 — это версия M70
// (у xDrive60 — 536), «88→124→107→138→148 л.с.» у Elantra — разные рынки и версии; модель пересказывала их как
// «скачки мощности». Числа берутся только из текста статьи и описания: к ним применяется проверка фактов.
function buildGraphContext(ctx) {
  const { matchedNode, ancestorChain, descendants, crossBrandLinks, siblingLinks, variants } = ctx
  const parts = []

  if (matchedNode) {
    const chain = [...ancestorChain, matchedNode, ...descendants]
    parts.push(
      `ЦЕПОЧКА ЭВОЛЮЦИИ (${chain.length} пок.; только названия и годы — числа брать ТОЛЬКО из текста статьи и описания):\n` +
      chain.map(n =>
        `  ${n.year}  ${n.label}` +
        (n.codeName ? `  [${n.codeName}]`   : '') +
        (n.bodyType ? `  ${n.bodyType}`     : '')
      ).join('\n')
    )
    if (variants?.length) {
      parts.push(`ВАРИАНТЫ В ГРАФЕ: ${variants.map(v => v.label).join(' | ')}`)
    }
    const links = [...(crossBrandLinks || []), ...(siblingLinks || [])]
      .map(l => describeGraphLink(matchedNode.label, l)).filter(Boolean)
    if (links.length) {
      parts.push(`СВЯЗИ В ГРАФЕ (справочно; упоминай, только если это подтверждает текст статьи):\n${links.map(s => `  ${s}`).join('\n')}`)
    }
  }
  // Без узла графа НЕ подмешиваем «ИСТОРИЯ БРЕНДА (выборка)» (6 самых старых моделей марки): это не предки
  // машины, а модель выстраивает из них выдуманную родословную. Живые случаи: Lexus ES 18.11.2026 («ES300
  // 1992/1996» как её история) и Honda CR-V 19.11.2026 («линия компактных кроссоверов, начатая с NSX NA1»).
  // Нет узла — история строится только из текста статьи и источников; нет и их — раздел короткий и без цифр.

  return parts.join('\n\n')
}

function buildAIMessages(car, ctx, research, format) {
  const graphCtx    = buildGraphContext(ctx)
  const researchCtx = buildResearchContext(research)
  const hasResearch = !!(researchCtx)

  const multiSrc = car._mergedCount > 1
    ? `\nСОБРАНО ИЗ ${car._mergedCount} ИСТОЧНИКОВ: ${car._sources?.join(', ')}. Синтезируй УНИКАЛЬНУЮ информацию — не повторяй одинаковые факты.\n`
    : ''

  // До 20.11.2026 здесь были «ОСОБЫЙ АКЦЕНТ» на кросс-брендовых и родственных связях графа («сделай их
  // главным содержанием истории»): слабые догадки графа (inspired_by и т.п.) превращались в «факты» поста.
  // Теперь связи идут в контекст справочно (см. buildGraphContext), без требования выпячивать их.

  const userPrompt = `АВТОМОБИЛЬ: ${car.brand} ${car.name || car.fullName} (${car.year || '?'})
${car.description ? `КРАТКОЕ ОПИСАНИЕ: ${car.description}\n` : ''}${multiSrc}
${graphCtx ? `ДАННЫЕ AUTOEVOFLOW (граф эволюции):\n${graphCtx}\n` : ''}
${hasResearch ? `ДАННЫЕ ИЗ ОТКРЫТЫХ ИСТОЧНИКОВ:\n${researchCtx}\n` : ''}
${format.opening}

СТРУКТУРА — заголовки дословно, без изменений:
🏛 ИСТОРИЯ
🧬 ЭВОЛЮЦИЯ
⚡ ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ
🔮 ПРОГНОЗ

КАК ПИСАТЬ РАЗДЕЛЫ — каждый это короткий блок фактов из данных; склеивать их в «единый рассказ» не нужно:
ИСТОРИЯ — датированная предыстория модели из данных: когда появилась, какое поколение, что было до новинки. Дат в данных нет — одна короткая фраза без дат.
ЭВОЛЮЦИЯ — что изменилось в новой версии по сравнению с предыдущей, только названное в данных. Не пересказывай рост мощности по поколениям цепочкой цифр.
ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ — главная новость: характеристики, цена, сроки, оснащение из статьи или описания.
ПРОГНОЗ — 1–2 осторожные фразы о том, что объявлено дальше (сроки, версии) или что пока не объявлено. Не гадай о влиянии на рынок.
Связывать факты словами «поэтому», «в результате», «отражало» можно, только если такая связь прямо названа в данных. Мотивы, «дух эпохи», запросы общества или молодёжи, «инженерные вызовы», «символ свободы» и подобное не пиши: этого в данных нет, и программа такой текст отклонит.

ГЛАВНОЕ ПРАВИЛО — ТОЛЬКО ФАКТЫ ИЗ ДАННЫХ ВЫШЕ. Текст проверяет программа: пост, в котором есть что-то лишнее, не будет опубликован.
— Каждое число с единицей (л.с., кВт, Н·м, секунды, км/ч, цена, запас хода, проценты, тираж) и каждое название латиницей (платформа, технология, двигатель, конкурент) обязаны БУКВАЛЬНО присутствовать в блоках данных выше. Нет в данных — не пиши. Не подставляй «похожие» цифры из памяти, не пересчитывай единицы, не придумывай названия систем и рекорды.
— Каждый год и каждый срок («через 125 лет», «за 22 года», «к 75-летию») тоже должны быть названы в данных выше. Сроки сам не вычисляй (разность двух годов — не факт), годы из памяти не называй: нет года в данных — пиши без него.
— С конкурентом сравнивай, только если он и его цифры названы в данных. Иначе не сравнивай. Цепочка эволюции — это названия и годы без цифр: мощность и другие характеристики предыдущих поколений бери только из текста статьи или описания.
— Мало данных — пиши короче: лучше 50 слов точных фактов, чем 110 слов с догадками. Раздел без фактов — одна короткая фраза без цифр.

ЖЁСТКИЕ ТРЕБОВАНИЯ — нарушение = плохой пост:
ДЛИНА: от 50 до 110 слов суммарно. Короткие предложения, никакой воды.
ФАКТЫ: каждое предложение опирается на факт из данных — год, цифра, имя, цена, модель.
ЗАПРЕЩЕНО: "является", "представляет собой", "позиционируется", "делает ставку", "переосмысленный", "новая точка отсчёта", "продолжает развивать", "твист", "фора".
ЗАПРЕЩЕНЫ ПОЛНОСТЬЮ (программа отклоняет текст с ними, даже если в данных есть похожее): «первый/первая/впервые», «самый …», «рекорд», «вдвое/втрое», «единственный», «лучший», «быстрейший», «мощнейший». Пиши факт без оценки: не «первая электрическая модель», а «электрический хэтчбек».
ЦИФРЫ ТОЙ ВЕРСИИ: если в данных несколько версий модели (например Q7 и SQ7, GTI и Golf R), бери цифры только той, о которой пост, и проверяй подпись у каждой цифры.
ЯЗЫК: связный русский текст; единицы по-русски (л.с., кВт, Н·м, км/ч); без цепочек слов через дефис и без обрывков английских фраз.
ФОРМАТИРОВАНИЕ: <b>ключевые числа и факты из данных</b>, <i>технические названия и кодовые имена</i>. Тегов <b> столько, сколько реальных фактов: не добавляй факты ради тегов.
ПРОГНОЗ: 1–2 предложения. Осторожный сценарий ("вероятно", "ожидаем"), вытекающий из ОСОБЕННОСТИ. Без новых цифр, годов и названий, которых нет в данных.
ИСТОРИЯ: короткая датированная справка из данных — без "бренд основан в..." и без общих слов.
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
  // matchedNode.id (не modelSlug) — несколько постов про РАЗНЫЕ поколения одной
  // модели (MK1 2007, MK49 2027...) иначе вели бы на ОДИН и тот же /model/{slug},
  // и Telegram кэширует превью по URL — разные машины показывали бы одну и ту же
  // ссылку/превью. /api/models/[id] понимает id конкретного узла (резолвит в его
  // modelSlug-группу) так же, как и голый modelSlug — см. route.ts.
  if (matchedNode) return `${siteUrl}/model/${matchedNode.id}`
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
// → null, если текст годен, иначе короткая причина отказа (идёт в лог: прогон #40 «не прошёл проверку
// (формат/язык/модель)» не говорил, какая именно из трёх).
function whyNotWellFormed(text, car) {
  const plain = sanitizeStory(text)
    .replace(SECTION_HEADER_RE, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Нормальный разбор — от ~430 знаков (замер по 58 опубликованным); 300 — запас.
  if (plain.length < 300) return `короче 300 знаков (${plain.length})`
  // Канал русскоязычный. Слабые free-модели (LFM2.5 2.6B и т.п.) на русский
  // промпт отвечают ПО-АНГЛИЙСКИ, оставляя русскими только заголовки секций —
  // структурную проверку это проходило, и 9–10.11.2026 такие тексты (0% кириллицы)
  // ушли в канал, один — поверх уже опубликованного поста. У нормальных постов
  // доля кириллицы среди букв ≥ 0.63 (много латиницы в названиях моделей), у
  // английских ≈ 0 — порог 0.5 разделяет их с запасом.
  const letters  = plain.match(/\p{L}/gu) || []
  const cyrillic = plain.match(/[А-Яа-яЁё]/g) || []
  if (letters.length === 0 || cyrillic.length / letters.length < 0.5) return `мало кириллицы (${Math.round(100 * cyrillic.length / Math.max(1, letters.length))}%)`
  // Бессмыслица из трёх и более кириллических слов через дефис: 21.11.2026 пост про Toyota Tundra начинался с
  // «Трудно‑мало‑мало, третье поколение…». В нормальном русском такие цепочки не встречаются (бывает «кое-как», «по-русски» — два звена).
  const hyphenChain = /(?<![а-яё])[а-яё]{2,}[-‐‑‒–][а-яё]{2,}[-‐‑‒–][а-яё]{2,}(?![а-яё])/i.exec(plain)
  if (hyphenChain) return `бессмыслица через дефис («${hyphenChain[0]}»)`
  // Пост про другую машину (галлюцинация) — тоже брак: 11.11.2026 под заголовком
  // "2028 Subaru" ушёл текст про Impreza WRX GC 1992 и выдуманные цифры.
  return (!car || storyMentionsModel(plain, car)) ? null : 'в тексте нет названия модели'
}
function isWellFormedStory(text, car) { return whyNotWellFormed(text, car) === null }

// ─── Нормализация форматирования для Telegram HTML ───────────────────────────
function storyMarkdownToHtml(text) {
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

// Telegram (parse_mode=HTML) понимает лишь небольшой набор тегов и требует экранировать < > &. Живые случаи
// прогона #40 (18.11.2026): модель вставила <br> — «Unsupported start tag "br"», пост Honda CR-V не ушёл;
// «голый» < в тексте («<5 с») — «Unsupported start tag ""», правка VW Atlas не прошла. Оба кандидата терялись
// и пробовались заново каждый прогон. В сюжете допустимы только <b> и <i>: <br> → перенос строки,
// <strong>/<em> → <b>/<i>, прочие теги убираем (текст внутри остаётся), < > & экранируем, вложенность чиним.
const HTML_NAMED_ENTITIES = { nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', quot: '"', apos: "'", times: '×', deg: '°', minus: '−' }
function normalizeTelegramHtml(s) {
  // Именованные сущности, которых Telegram не знает, — в сами символы (&amp; &lt; &gt; оставляем как есть)
  s = s.replace(/&([a-z]+);/gi, (m, n) => {
    const k = n.toLowerCase()
    return (k === 'amp' || k === 'lt' || k === 'gt') ? m : (k in HTML_NAMED_ENTITIES ? HTML_NAMED_ENTITIES[k] : m)
  })
  const out = []
  const stack = []   // открытые <b>/<i>
  // Пробел внутри тега («< b>4.8 сек», «</ b>») — тоже тег: 21.11.2026 такой «< b>» ушёл в канал в посте про Audi SQ7 видимым мусором.
  const re = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9]*)\b[^<>]*>|(&(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)|([<>&])/g
  let last = 0, m
  while ((m = re.exec(s))) {
    out.push(s.slice(last, m.index))
    last = m.index + m[0].length
    if (m[2] !== undefined) {                       // тег
      const name = m[2].toLowerCase(), closing = m[1] === '/'
      const tag = (name === 'b' || name === 'strong') ? 'b' : (name === 'i' || name === 'em') ? 'i' : null
      if (name === 'br') out.push('\n')
      else if (tag && !closing) { stack.push(tag); out.push(`<${tag}>`) }
      else if (tag && closing) {
        const idx = stack.lastIndexOf(tag)
        if (idx >= 0) { while (stack.length > idx + 1) out.push(`</${stack.pop()}>`); out.push(`</${stack.pop()}>`) }
        // закрывающий тег без открывающего — выбрасываем
      } else if (closing && /^(?:p|div|li|h[1-6]|ul|ol)$/.test(name)) out.push('\n')
      // остальные теги (p, div, span, a, …) — только убираем
    } else if (m[3] !== undefined) out.push(m[3])    // корректная сущность
    else out.push(m[4] === '<' ? '&lt;' : m[4] === '>' ? '&gt;' : '&amp;')
  }
  out.push(s.slice(last))
  while (stack.length) out.push(`</${stack.pop()}>`)
  return out.join('')
}

function sanitizeStory(text) {
  return normalizeTelegramHtml(storyMarkdownToHtml(text)).replace(/\n{3,}/g, '\n\n').trim()
}

// ─── Проверка фактов: ни цифр, ни названий «из воздуха» ───────────────────────
// Живой случай 18.11.2026: правкой старого поста в общий канал ушёл текст про Lexus ES
// с «TNGA‑F», «Lidar‑2027», «автономностью 3 уровня» и «6,2 с против 7,1 с у Mercedes
// C‑Class» — ничего из этого не было в данных, которые получила модель (промпт ТРЕБОВАЛ
// сравнение с соперником цифрой и ≥8 выделенных фактов, а данных не хватало).
// isWellFormedStory смотрит на форму (язык, длина, название модели), но не на факты.
//
// Здесь замкнутый мир: каждое число с единицей измерения (л.с., кВт, Н·м, секунды, км/ч,
// цена, %, запас хода, тираж…) и каждое название латиницей (платформа, технология,
// конкурент) должны БУКВАЛЬНО встречаться в блоках данных, которые видела модель
// (граф + ресерч + описание). Число сверяется с числами ТОЙ ЖЕ единицы (или без распознанной
// единицы) с допуском 2,5%; пересчёт между единицами (кВт→л.с., мили→км, фунт-футы→Н·м…)
// берётся только из чисел, помеченных исходной единицей, — иначе совпадения случайны
// (156 л.с. × 1,34 ≈ 210 «подтвердило бы» выдуманные 210 л.с.). Годы (1900–2099) и сроки в годах
// («через 125 лет», «за 22 года», «к 75-летию», от 5 лет) тоже должны стоять в данных — см. checkYearsAndSpans.
// Раньше годы не проверялись (историю поколений модель берёт из цепочки графа, ПРОГНОЗ — про будущее), и
// 19.11.2026 неверные годы и сроки прошли в канал: «через 127 лет, в 2028 году» (GTD 1901: в статье 125 лет,
// 2026 год), «в 2022 году уже стал самым мощным» (Spectre), «Civic EG 1991» и «начатая в 1990‑х» (CR-V).

// Нормализация для сравнения: без неразрывных пробелов и «умных» дефисов, нижний регистр.
function normFactText(s) {
  return String(s || '')
    .replace(/[    ]/g, ' ')
    .replace(/­/g, '')
    .replace(/[‐-―−]/g, '-')
    .toLowerCase()
}

// «45 000» | «45,000» | «6,2» | «6.2» | «340»
const FACT_NUM  = String.raw`(\d{1,3}(?:[ ,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)`
// Множитель после числа: «45 тыс.», «45k», «1,2 млн»
const FACT_MULT = String.raw`(?:\s*(тыс(?:яч\w*)?\.?|млн\.?|миллион\w*|млрд\.?|thousand|million|k|m)(?![a-zа-яё]))?`

function factMultiplier(w) {
  if (!w) return 1
  if (/^(тыс|thousand$|k$)/.test(w)) return 1e3
  if (/^(млн|миллион|million$|m$)/.test(w)) return 1e6
  if (/^млрд/.test(w)) return 1e9
  return 1
}

// Возможные значения записи числа. «1,500» — это 1500 (запятая как разделитель тысяч)
// или 1,5; «45.000» — 45000 или 45. Берём оба прочтения, чтобы формат записи не ломал сверку.
function factNumVariants(raw) {
  const s = raw.replace(/ /g, '')
  let m
  if ((m = /^(\d{1,3}(?:,\d{3})+)(\.\d+)?$/.exec(s))) {
    const v = [Number(s.replace(/,/g, ''))]
    if (!m[2] && /^\d{1,3},\d{3}$/.test(s)) v.push(Number(s.replace(',', '.')))
    return v
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    const v = [Number(s.replace(/\./g, ''))]
    if (/^\d{1,3}\.\d{3}$/.test(s)) v.push(Number(s))
    return v
  }
  return [Number(s.replace(',', '.'))]
}

// [класс, единицы] — русские и английские (источники в основном английские). Порядок важен:
// специфичные раньше общих (кВт·ч раньше кВт, км/ч раньше км, л/100 км раньше литров,
// фунт-футы раньше фунтов) — одно число принадлежит ровно одному классу, первому подошедшему.
const FACT_UNITS = [
  ['energy', String.raw`квт\s*[·⋅.\-]?\s*ч|kwh|kilowatt[\s\-]?hours?`],
  ['hp',     String.raw`л\.?\s?с\.?|лс|лошадин\w*\s+сил\w*|hp|ps|bhp|horse\s?power`],
  ['kw',     String.raw`квт|kw|kilowatts?`],
  ['lbft',   String.raw`lb[\s\-]?ft|pounds?[\s\-]?feet`],
  ['nm',     String.raw`н\s*[·⋅.]?\s*м|нм|n\s*[·⋅.]?\s*m|newton[\s\-]?met(?:er|re)s?`],
  ['kmh',    String.raw`км\s*/\s*ч|км в час|km\s*/\s*h|kph`],
  ['mph',    String.raw`mph|миль\s*/\s*ч|миль в час|miles per hour`],
  ['l100',   String.raw`л\s*/\s*100\s*км|l\s*/\s*100\s*km`],
  ['mpg',    String.raw`mpg|миль на галлон`],
  ['sec',    String.raw`сек\w*|seconds?|secs?|с(?![а-яёa-z])|s(?![a-z])`],
  ['km',     String.raw`км|km|kilomet(?:er|re)s?`],
  ['mi',     String.raw`миль|miles?|mi(?![a-z])`],
  ['kg',     String.raw`кг|kg|kilograms?`],
  ['lb',     String.raw`lbs?|фунт\w*|pounds?`],
  ['mm',     String.raw`мм|mm|millimet(?:er|re)s?`],
  ['in',     String.raw`дюйм\w*|inch\w*`],
  ['pct',    String.raw`%|процент\w*|percent`],
  ['money',  String.raw`\$|€|£|¥|₽|руб\w*|долл\w*|dollars?|euros?|usd|eur|евро|юан\w*`],
  ['liter',  String.raw`литр\w*|liters?|litres?|л(?![а-яёa-z.])|l(?![a-z.])`],
  ['count',  String.raw`экз\w*|штук\w*|шт(?![а-яёa-z])|машин\w*|автомобил\w*|units?|vehicles?`],
]

// Эталоны замера и служебные случаи — не заявленные характеристики (только для текста поста).
function skipFactClaim(cls, m, value, normText) {
  const before = normText.slice(Math.max(0, m.index - 8), m.index)
  const after  = normText.slice(m.index + m[0].length, m.index + m[0].length + 12)
  // Одинокая «с»/«s» — предлог/буква, а не секунды: секунды — это десятичное («6,2 с»)
  // или после «за»/«до» («за 5 с»); «в 2,5 с половиной раза» — не секунды.
  if (cls === 'sec' && m[3].length === 1 && !/[.,]/.test(m[1]) && !/(?:за|до)\s*$/.test(before)) return true
  if (cls === 'sec' && /^\s*(половин|лишн|небольш)/.test(after)) return true
  // «разгон до 100 км/ч», «до 60 mph», «расход на 100 км» — эталон замера
  if (cls === 'kmh' && value === 100) return true
  if (cls === 'mph' && (value === 60 || value === 62)) return true
  if (cls === 'km' && value === 100 && /на\s*$/.test(before)) return true
  // Мелкие количества («3 автомобиля») — не статистика; проверяем тиражи и объёмы.
  if (cls === 'count' && value < 100) return true
  return false
}

// Числа с единицами из текста → { claims: [{ cls, start, raw, values }], claimed: Set(начал чисел) }.
// forCorpus — для текста ДАННЫХ: без пропусков, чтобы ничего не терять.
function extractFactClaims(normText, forCorpus = false) {
  const claims = []
  const claimed = new Set()
  const claimedCls = new Map()   // начало числа → класс единицы (нужно проверке годов: «2027 с гибридом» — не секунды)
  for (const [cls, unit] of FACT_UNITS) {
    const re = new RegExp(FACT_NUM + FACT_MULT + String.raw`[\s\-]*(` + unit + ')', 'g')
    let m
    while ((m = re.exec(normText))) {
      if (claimed.has(m.index)) continue
      claimed.add(m.index)   // число «принадлежит» первому подошедшему классу, даже если оно пропущено
      claimedCls.set(m.index, cls)
      const k = factMultiplier(m[2])
      const values = factNumVariants(m[1]).map(v => v * k)
      if (!forCorpus && skipFactClaim(cls, m, values[0], normText)) continue
      // «фунт»/«pound» — и вес, и валюта («1,4 млн фунтов»): засчитываем числа обоих классов
      const alt = cls === 'lb' && /^(фунт|pound)/.test(m[3]) ? ['money'] : null
      claims.push({ cls, start: m.index, raw: m[0].trim(), values, alt })
    }
  }
  // «$45 000», «€1,2 млн» — знак валюты перед числом
  const pre = new RegExp(String.raw`[$€£¥₽]\s*` + FACT_NUM + FACT_MULT, 'g')
  let pm
  while ((pm = pre.exec(normText))) {
    const start = pm.index + pm[0].search(/\d/)
    if (claimed.has(start)) continue
    claimed.add(start)
    claimedCls.set(start, 'money')
    const k = factMultiplier(pm[2])
    claims.push({ cls: 'money', start, raw: pm[0].trim(), values: factNumVariants(pm[1]).map(v => v * k) })
  }
  return { claims, claimed, claimedCls }
}

// Корпус данных: числа с распознанной единицей (по классам) + «голые» числа (единица не распознана:
// годы, коды, непонятные слова) — последние годятся для прямого сравнения с любым классом.
function buildFactCorpus(grounding) {
  const norm = normFactText(grounding)
  const { claims, claimed } = extractFactClaims(norm, true)
  const bare = []
  const re = new RegExp(FACT_NUM + FACT_MULT, 'g')
  let m
  while ((m = re.exec(norm))) {
    if (claimed.has(m.index)) continue
    const k = factMultiplier(m[2])
    for (const v of factNumVariants(m[1])) { bare.push(v); if (k !== 1) bare.push(v * k) }
  }
  return { norm, claims, bare }
}

// «Достаточно близко»: до 20 — совпадение в пределах 0,05 (6,2 ≠ 6,3), дальше — округление до 2,5%.
function numClose(a, b) {
  const hi = Math.max(Math.abs(a), Math.abs(b))
  return Math.abs(a - b) <= (hi < 20 ? 0.05 : Math.max(0.05, hi * 0.025))
}

// заявлено = исходное × k, исходное берётся ТОЛЬКО из чисел класса from
const FACT_CONV = {
  hp:   [['kw', 1.341], ['kw', 1.36]],
  kw:   [['hp', 1 / 1.341], ['hp', 1 / 1.36]],
  nm:   [['lbft', 1.3558]],
  lbft: [['nm', 1 / 1.3558]],
  kmh:  [['mph', 1.609]],
  mph:  [['kmh', 1 / 1.609]],
  km:   [['mi', 1.609]],
  mi:   [['km', 1 / 1.609]],
  kg:   [['lb', 0.4536]],
  lb:   [['kg', 2.2046]],
  mm:   [['in', 25.4]],
  in:   [['mm', 1 / 25.4]],
}

function factClaimGrounded(claim, corpus) {
  const same = corpus.bare.slice()
  for (const c of corpus.claims) if (c.cls === claim.cls || (claim.alt && claim.alt.includes(c.cls))) same.push(...c.values)
  for (const v of claim.values) {
    if (same.some(n => numClose(v, n))) return true
    for (const [from, k] of FACT_CONV[claim.cls] || []) {
      for (const c of corpus.claims) {
        if (c.cls === from && c.values.some(n => numClose(v, n * k))) return true
      }
    }
    if (claim.cls === 'l100') {   // из mpg: л/100 км = 235,2 / mpg (US) или 282,5 / mpg (UK)
      for (const c of corpus.claims) {
        if (c.cls === 'mpg' && c.values.some(n => n > 0 && (numClose(v, 235.215 / n) || numClose(v, 282.481 / n)))) return true
      }
    }
  }
  return false
}

// Общеизвестные сокращения, которые не считаются «названием технологии из воздуха».
const FACT_NAME_ALLOW = new Set([
  'awd', 'fwd', 'rwd', 'suv', 'bev', 'phev', 'hev', 'mhev', 'erev', 'ice', 'led', 'oled',
  'dct', 'cvt', 'abs', 'esp', 'adas', 'ota', 'wltp', 'epa', 'nedc', 'ncap', 'usb', 'gps',
  'nfc', 'hud', 'vin', 'kwh', 'mph', 'kmh', 'rpm', 'mpg', 'lbft',
])

// Названия латиницей из текста поста: с заглавной, с цифрой или camelCase; короче 3 знаков не берём.
function extractFactNames(plain) {
  const names = []
  const seen = new Set()
  const re = /[A-Za-z][A-Za-z0-9]*(?:[-‐-―−][A-Za-z0-9]+)*/g
  let m
  while ((m = re.exec(plain))) {
    const t  = m[0]
    const sq = t.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (sq.length < 3 || seen.has(sq)) continue
    if (!(/^[A-Z]/.test(t) || /\d/.test(t) || /[a-z][A-Z]/.test(t))) continue
    if (FACT_NAME_ALLOW.has(sq) || /^[vw]\d{1,2}$/.test(sq)) continue
    seen.add(sq)
    names.push({ text: t.replace(/[‐-―−]/g, '-'), sq })
  }
  return names
}

// Громкие слова, которые модель любит добавлять «для красоты»: «впервые», «самый…», «рекорд», «вдвое»…
// До 21.11.2026 каждое допускалось, если в данных было «то же» (first / most / record / double…) — слабая
// проверка: хватало слова «first» где угодно в данных, и 20.11.2026 про Audi A2 e-tron ушло «первая
// полностью электрическая модель в истории марки» (данные говорили лишь «first deliveries…»). Теперь эти слова
// запрещены ПОЛНОСТЬЮ (data = NEVER): точную формулировку с контекстом проверить механически нельзя, а пост
// без «первый/самый» теряет немного, зато не врёт. Живые случаи 19.11.2026: «282 л.с., что вдвое превышает
// мощность предшественников» (VW Atlas), «стал самым мощным электроседаном в линейке» (BMW i7).
// «Первое поколение/серия», «первый раз» — не утверждение, их пропускаем. \b с кириллицей не работает —
// границы слов задаются через (?<![а-яё]) / (?![а-яё]).
const NEVER = /(?!)/   // никогда не совпадает
const CLAIM_CUES = [
  { ru: /(?<![а-яё])(?:впервые|перв(?:ый|ая|ое|ые|ым|ой|ого|ому|ом|ых|ыми)(?!\s+(?:поколен|генерац|серии|выпуск|раз)))(?![а-яё])/,
    data: NEVER },
  { ru: /(?<![а-яё])сам(?:ый|ая|ое|ые|ым|ой|ого|ому|ом|ых|ыми)\s+[а-яё]+(?:ый|ая|ое|ые|ым|ой|ого|ому|ом|ых|ыми|ий|ее|ие|им|их)(?![а-яё])/,
    data: NEVER },
  { ru: /(?<![а-яё])рекорд/, data: NEVER },
  { ru: /(?<![а-яё])(?:вдвое|втрое|вчетверо)(?![а-яё])|(?<![а-яё])в\s+(?:два|три|четыре|пять|\d+)\s+раза?(?![а-яё])/,
    data: NEVER },
  { ru: /(?<![а-яё])единственн/, data: NEVER },
  { ru: /(?<![а-яё])(?:лучш(?:ий|ая|ее|ие|им|ей|его)|наилучш|быстрейш|мощнейш)/, data: NEVER },
  // Выдуманный «контекст» вместо фактов. Живые случаи 19.11.2026 (Hyundai Elantra N и Elantra): «в эпоху
  // пост-социалистических перемен», «спрос молодёжи», «каждый скачок отражал стремление к динамике»,
  // «символ личной свободы»; Silverado: «вынуждает инженеров решать задачу». «Эпоха» допустима, только если
  // то же слово есть в данных; «дух времени», «запрос общества» и т.п. — не допускаются никогда (data никогда не совпадает).
  { ru: /(?<![а-яё])эпох[а-яё]*/, data: /\bera\b|\beras\b|epoch|эпох/ },
  { ru: /(?<![а-яё])(?:дух[а-яё]*\s+(?:времени|эпох[а-яё]*)|запрос[а-яё]*\s+(?:общества|молод[её]ж[а-яё]*|потребител[а-яё]*|рынка)|спрос[а-яё]*\s+(?:молод[её]ж[а-яё]*|общества)|отража(?:л|ет|ла|ли|ло)[а-яё]*\s+(?:стремлен[а-яё]*|запрос[а-яё]*|требован[а-яё]*|желан[а-яё]*)|инженерн[а-яё]+\s+(?:вызов[а-яё]*|задач[а-яё]*)|вынужда[а-яё]+\s+инженер[а-яё]*|символ[а-яё]*\s+(?:[а-яё]+\s+)?(?:свобод[а-яё]*|статус[а-яё]*|эпох[а-яё]*|времени))/, data: /(?!)/ },
]

// Годы и сроки. Год — четырёхзначное 1900–2099, не принадлежащее единице («2000 фунтов», «1998 см³» — не годы;
// «2027 с гибридом» — год, а не секунды): он должен стоять в данных. Срок — «N лет / N года / N-летие»
// (N ≥ 5; четыре цифры — уже год): N должно быть названо в данных («125 years», «75-year», «75th anniversary»,
// «22 лет»). Срок, который модель посчитала сама, не проходит даже при верной арифметике: «через 127 лет,
// в 2028 году» = 2028 − 1901, а в статье событие — 125 лет назад, 2026-й; модельный год в названии машины —
// не год события. Прогноз вида «к 2030 году» без этого года в данных тоже отклоняется: промпт и так
// требует «без новых цифр». Лишнее модель убирает при повторном запросе, пост от этого только короче.
const FACT_YEAR_RE  = /(?<![\d.,])((?:19|20)\d{2})(?!\d)(?![.,]\d)/g
const STORY_SPAN_RE = /(?<![\d.,])(\d{1,3})(?![\d.,])[\s-]*(?:лет(?![а-яё])|года(?![а-яё])|год(?![а-яё])|лети\w*|летн\w*)/g
const DATA_SPAN_RE  = /(?<![\d.,])(\d{1,3})(?:st|nd|rd|th)?[\s-]*(?:years?|yrs?|anniversar\w*|лет(?![а-яё])|года(?![а-яё])|год(?![а-яё])|лети\w*|летн\w*)/g
const FACT_SPAN_MIN = 5
// Единицы, которых нет в FACT_UNITS, но с которыми 4-значное число — не год («2000 об/мин», «1998 см³», «1500 Вт»)
const NON_YEAR_UNIT_RE = /^\s*(?:об\s*\/\s*мин|rpm|оборот|см[³3]|куб|cc(?![a-z])|cm[³3]|мл(?![а-яё])|ml(?![a-z])|вт(?![а-яё])|w(?![a-z])|ккал)/

function checkYearsAndSpans(normStory, claimedCls, corpus) {
  const out = []
  const dataYears = new Set([...corpus.norm.matchAll(FACT_YEAR_RE)].map(m => m[1]))
  for (const m of normStory.matchAll(FACT_YEAR_RE)) {
    const cls = claimedCls.get(m.index)
    if (cls && cls !== 'sec' && cls !== 'liter') continue                       // число с единицей (одинокие «с»/«л» — предлоги)
    if (NON_YEAR_UNIT_RE.test(normStory.slice(m.index + 4, m.index + 16))) continue
    if (!dataYears.has(m[1])) out.push({ kind: 'год', text: m[1] })
  }
  const dataSpans = new Set([...corpus.norm.matchAll(DATA_SPAN_RE)].map(m => Number(m[1])))
  for (const m of normStory.matchAll(STORY_SPAN_RE)) {
    const n = Number(m[1])
    if (n >= FACT_SPAN_MIN && !dataSpans.has(n)) out.push({ kind: 'срок', text: m[0].trim() })
  }
  return out
}

// → { ok, issues: [{ kind: 'число'|'название'|'утверждение'|'год'|'срок', text }] }. grounding — текст блоков
// данных, которые видела модель (см. buildGroundingText).
function checkStoryFacts(story, grounding) {
  const plain = sanitizeStory(story)
    .replace(SECTION_HEADER_RE, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  const normStory = normFactText(plain).replace(/\s+/g, ' ')
  const corpus = buildFactCorpus(grounding)
  const issues = []
  const add = (kind, text) => { if (!issues.some(i => i.text === text)) issues.push({ kind, text }) }

  const ex = extractFactClaims(normStory)
  for (const c of ex.claims) {
    if (!factClaimGrounded(c, corpus)) add('число', c.raw)
  }
  const groundSq = corpus.norm.replace(/[^a-z0-9а-яё]/g, '')
  for (const n of extractFactNames(plain)) {
    if (!groundSq.includes(n.sq)) add('название', n.text)
  }
  // Служебные метки графа (inspired_by, shares_platform…) в тексте поста быть не могут: 19.11.2026 в Genesis G80 ушло «inspired_by G70»
  for (const m of plain.matchAll(/\b[A-Za-z]+(?:_[A-Za-z]+)+\b/g)) add('название', m[0])
  for (const i of checkYearsAndSpans(normStory, ex.claimedCls, corpus)) add(i.kind, i.text)
  for (const c of CLAIM_CUES) {
    const cm = c.ru.exec(normStory)
    if (cm && !c.data.test(corpus.norm)) add('утверждение', cm[0].trim())
  }
  return { ok: issues.length === 0, issues }
}

function formatFactIssues(issues, max = 6) {
  const shown = issues.slice(0, max).map(i => `«${i.text}»`).join(', ')
  return shown + (issues.length > max ? ` и ещё ${issues.length - max}` : '')
}

// Данные, на которые модель имела право опираться (то же, что вошло в промпт).
function buildGroundingText(car, ctx, research) {
  return [
    `${car.brand || ''} ${car.name || car.fullName || ''} ${car.year || ''}`,
    car.description || '',
    (car._sources || []).join(' '),
    buildGraphContext(ctx) || '',
    buildResearchContext(research) || '',
  ].join('\n')
}

// Сколько в данных реальной «фактуры»: узел графа и длина его цепочки, числа с единицами (без тиражей),
// текст статьи. Нужна, чтобы НЕ просить модель писать про машину, о которой почти ничего не известно:
// 18.11.2026 про Lexus ES было шесть строк «истории бренда» и пять рекламных сниппетов — модель
// заполнила пустоту выдумками, а правка ещё и затёрла старый пост.
// car (если передан) включает «новостные» числа: считаются ТОЛЬКО из текста о самой новинке — описание карточки
// и текст статьи-источника. Цепочка графа, wiki (история прошлых поколений) и рекламные сниппеты ими не
// считаются: 19.11.2026 Hyundai Elantra N прошла порог «данных достаточно» из-за мощности по поколениям в
// цепочке, хотя о новой машине не было ни одного факта, и модель написала «историю» из воздуха.
function describeGrounding(grounding, ctx, research, car) {
  const uniq = claims => new Set(claims.filter(c => c.cls !== 'count').map(c => `${c.cls}:${Math.round(c.values[0])}`)).size
  const facts = uniq(buildFactCorpus(grounding).claims)
  const node  = !!ctx?.matchedNode
  const chain = node ? (ctx.ancestorChain?.length || 0) + 1 + (ctx.descendants?.length || 0) : 0
  const d = { node, chain, facts, article: (research?.article || '').length, wiki: !!research?.wiki, snippets: research?.snippets?.length || 0 }
  if (car) d.newsFacts = uniq(buildFactCorpus([car.description || '', research?.article || ''].join('\n')).claims)
  return d
}

// С 20.11.2026 для нового поста нужен реальный текст о новинке: статья ≥800 знаков, или ≥2 числа с единицами
// в описании/статье, или статья ≥400 знаков и хотя бы одно число. Цепочка, wiki и сниппеты сами по себе —
// мало (писать не о чем, выходит выдуманная «история»). Для ПРАВКИ уже опубликованного (она затирает текст)
// планка выше: статья ≥1200 знаков или ≥3 числа. Без car (старые вызовы) — прежние пороги.
function hasEnoughData(d, forEdit) {
  if (d.newsFacts !== undefined) {
    if (forEdit) return d.article >= 1200 || d.newsFacts >= 3
    return d.article >= 800 || d.newsFacts >= 2 || (d.article >= 400 && d.newsFacts >= 1)
  }
  if (forEdit) return (d.node && d.chain >= 2) || d.facts >= 3 || d.article >= 800
  return (d.node && d.chain >= 2) || d.facts >= 1 || d.article >= 400 || d.wiki
}

function formatGroundingStats(d) {
  return `узел графа ${d.node ? `да (цепочка ${d.chain})` : 'нет'}, чисел с единицами ${d.facts}` +
    (d.newsFacts !== undefined ? ` (о новинке: ${d.newsFacts})` : '') +
    `, статья ${d.article ? d.article + ' зн.' : 'нет'}, wiki ${d.wiki ? 'да' : 'нет'}, сниппетов ${d.snippets}`
}

// Повторный запрос: тот же промпт + перечень того, чего нет в данных. Дописываем в ПОЛЬЗОВАТЕЛЬСКОЕ
// сообщение (а не добавляем реплики): Gemini/Yandex берут только system+user.
function buildRepairMessages(messages, issues) {
  const list = issues.slice(0, 14).map(i => `«${i.text}»`).join(', ')
  const note = `\n\nПРЕДЫДУЩИЙ ВАРИАНТ ОТКЛОНЁН ПРОВЕРКОЙ ФАКТОВ: в нём есть цифры, годы, сроки («через N лет»), названия, которых нет в данных выше, или запрещённые слова («первый», «впервые», «самый», «рекорд», «вдвое» и т.п. — они запрещены совсем): ${list}.` +
    'Перепиши пост целиком: убери их и всё, что на них опирается, используй только факты из данных (годы и сроки — только названные в данных, сроки сам не считай). Не хватает данных — пиши короче, без цифр.'
  return messages.map(m => m.role === 'user' ? { ...m, content: m.content + note } : m)
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

// ─── Цепочка AI-провайдеров ───────────────────────────────────────────────────
// Пробуются по порядку приоритета (пустой/placeholder-ключ пропускается). Побеждает первый,
// чей текст прошёл ВСЕ проверки: isWellFormedStory (форма/язык/модель) и checkStoryFacts
// (факты). Текст с выдуманными цифрами/названиями получает ОДНУ повторную попытку у того же
// провайдера (с перечнем выдуманного), потом цепочка идёт дальше. Единая реализация для
// generateStory (боевой путь) и dryRun — раньше это были два набора по 9 копий одного блока.
const AI_PROVIDERS = [
  { name: 'Gemini',     label: 'Gemini 2.5 Flash',                env: 'GEMINI_API_KEY',     call: m => callGemini(m) },
  { name: 'Groq',       label: 'Groq (gpt-oss-120b)',             env: 'GROQ_API_KEY',       call: m => callGroq(m) },
  { name: 'DeepSeek',   label: 'DeepSeek',                        env: 'DEEPSEEK_API_KEY',   call: m => callDeepSeek(m) },
  { name: 'YandexGPT',  label: 'YandexGPT',                       env: 'YANDEX_API_KEY',     call: m => callYandex(m) },
  { name: 'Qwen',       label: 'Qwen Plus',                       env: 'QWEN_API_KEY',       call: m => callQwen(m) },
  { name: 'OpenRouter', label: 'OpenRouter (неск. free-моделей)', env: 'OPENROUTER_API_KEY', call: m => callOpenRouter(m) },
  { name: 'Cerebras',   label: 'Cerebras (Llama 3.3 70B)',        env: 'CEREBRAS_API_KEY',   call: m => callCerebras(m) },
  { name: 'NVIDIA',     label: 'NVIDIA NIM (Llama 3.3 70B)',      env: 'NVIDIA_API_KEY',     call: m => callNvidia(m) },
  { name: 'Mistral',    label: 'Mistral Small',                   env: 'MISTRAL_API_KEY',    call: m => callMistral(m) },
]

// Предохранитель: провайдер, который падает (таймаут, перегрузка, квота), отключается до конца прогона —
// иначе каждый кандидат ждал бы его таймаут заново. Прогон #40: Gemini трижды по 90 с «aborted due to
// timeout», затем 429 «exceeded your current quota» на каждом кандидате — 4,5 из 8,5 минут впустую.
// Квота/суточный лимит — отключаем сразу; прочие сбои — после AI_MAX_FAILS подряд. Ответ, не прошедший
// проверки, сбоем НЕ считается (провайдер работает, просто текст плохой).
const AI_MAX_FAILS = 2
const AI_HEALTH = {}   // имя провайдера → { fails, dead } (живёт один запуск процесса)
function resetAiHealth() { for (const k of Object.keys(AI_HEALTH)) delete AI_HEALTH[k] }

// → { story, provider } | null. onReject({ provider, story, issues }) — для dry-run: показать забракованный текст.
async function generateWithProviders(messages, car, grounding, { indent = '  ', onReject } = {}) {
  for (const p of AI_PROVIDERS) {
    const key = process.env[p.env]
    if (!key || key.startsWith('your_')) continue
    const health = (AI_HEALTH[p.name] = AI_HEALTH[p.name] || { fails: 0, dead: false })
    if (health.dead) continue
    let msgs = messages
    for (let attempt = 1; attempt <= 2; attempt++) {
      process.stdout.write(`${indent}🤖 ${p.label}${attempt > 1 ? ', повтор с поправкой' : ''}... `)
      let story
      try { story = await p.call(msgs); health.fails = 0 } catch (e) {
        health.fails++
        if (/quota|суточный лимит/i.test(e.message) || health.fails >= AI_MAX_FAILS) {
          health.dead = true
          console.log(`⚠️  ${e.message} — ${p.name} отключён до конца прогона`)
        } else console.log(`⚠️  ${e.message}`)
        break
      }
      if (!story) { console.log('⚠️  пустой ответ, пробуем дальше'); break }
      const why = whyNotWellFormed(story, car)
      if (why) { console.log(`⚠️  не прошёл проверку формы: ${why}, пробуем дальше`); break }
      const facts = checkStoryFacts(story, grounding)
      if (facts.ok) { console.log('✅'); return { story, provider: p.name } }
      console.log(`⚠️  в тексте есть то, чего нет в данных: ${formatFactIssues(facts.issues)}`)
      if (onReject) onReject({ provider: p.name, story, issues: facts.issues })
      if (attempt === 2) break
      msgs = buildRepairMessages(messages, facts.issues)
    }
  }
  return null
}

// Общий шаг для publishCar/editCarPost: веб-ресерч + AI-генерация (цепочка AI_PROVIDERS,
// проверка формата и фактов). Вынесено отдельно, чтобы editCarPost не дублировал всю
// цепочку фолбэков — она пересобирает историю с учётом НОВОЙ статьи в research.
async function generateStory(car, ctx, format, { forEdit = false } = {}) {
  // Последний рубеж "при оформлении публикации": даже если машина как-то обошла
  // фильтр на входе, пост без названия модели не уходит (см. looksLikeRealModelName).
  // Бросаем ошибку — вызывающий код не помечает машину опубликованной.
  if (!hasModelName(car)) {
    throw new Error(`Нет названия модели в «${car.name || car.fullName}» (только год/бренд) — публикация пропущена`)
  }

  // ── Веб-ресерч (параллельно: Wikipedia + DDG + статья) ────────────────────
  process.stdout.write(`  🔍 Исследование [${format.id}]... `)
  const research = await researchCar(car)
  const srcCount = [research.wiki, research.snippets.length, research.article].filter(Boolean).length
  console.log(`${srcCount} источник(а)`)

  // ── Хватает ли данных? Если нет — модель не зовём (она бы выдумала недостающее) ──
  const grounding = buildGroundingText(car, ctx, research)
  const data = describeGrounding(grounding, ctx, research, car)
  console.log(`  📊 Данные: ${formatGroundingStats(data)}`)
  if (!hasEnoughData(data, forEdit)) {
    // thin = «мало данных»: такой кандидат не тратит попытку цикла main() (модель не звали, в Telegram не писали)
    const err = new Error(forEdit
      ? 'Данных слишком мало, чтобы переписывать уже опубликованный пост — пост не трогаю'
      : 'Нет данных о самой новинке (текста статьи или описания с характеристиками) — публикация отложена до появления данных')
    err.thin = true
    throw err
  }

  // ── AI-генерация: цепочка провайдеров + проверка формата и фактов ──────────
  const messages = buildAIMessages(car, ctx, research, format)
  const result   = await generateWithProviders(messages, car, grounding)

  // Живой случай: все настроенные провайдеры легли одновременно (Gemini 429
  // квота, DeepSeek 402 баланс, YandexGPT 403 права) — раньше это тихо уходило
  // в generateTemplatePost() ("BYD выводит BYD Shark — новую модель в своей
  // линейке...") и публиковалось как обычный пост. По явному решению
  // пользователя: лучше пропустить публикацию и повторить в следующий
  // прогон (когда какой-то из провайдеров отойдёт), чем разослать пустой
  // шаблон вместо текста. Так же с выдумками: текст, не прошедший проверку фактов
  // (см. checkStoryFacts), не публикуется и НЕ перезаписывает уже опубликованный пост.
  // Бросаем ошибку — вызывающий код (publishCar/editCarPost, цикл в main())
  // уже ловит её через try/catch и НЕ помечает машину как опубликованную, так что
  // она корректно останется в очереди.
  // Qwen и OpenRouter добавлены именно как независимые запасные варианты для
  // такого сценария — не завязаны на те же аккаунты/биллинг, что первые три.
  if (!result) throw new Error('Ни один AI-провайдер не дал годный текст (недоступны, пустой ответ или не прошли проверку фактов) — публикация отложена до следующего прогона')

  return { story: sanitizeStory(result.story), research, provider: result.provider }
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
  // forEdit: правка ЗАТИРАЕТ опубликованный текст — планка по данным выше, чем для нового поста
  const { story, provider } = await generateStory(car, ctx, format, { forEdit: true })

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
// → true, если данных хватило бы для боевого поста. skipThin: «пустую» машину не отдавать модели
// (как в боевом прогоне) — нужно, когда превью перебирает несколько кандидатов подряд.
async function dryRun(car, graph, { skipThin = false } = {}) {
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

  const messages  = buildAIMessages(car, ctx, research, format)
  const grounding = buildGroundingText(car, ctx, research)
  let story, provider

  const data = describeGrounding(grounding, ctx, research, car)
  console.log(`\n─── ДАННЫЕ ───\n${formatGroundingStats(data)}`)
  const enough = hasEnoughData(data, false)
  console.log(enough
    ? `Для нового поста данных достаточно${hasEnoughData(data, true) ? ' (и для правки уже опубликованного)' : ' (для ПРАВКИ уже опубликованного — мало)'}`
    : skipThin
      ? '⚠️  Данных слишком мало: в реальном прогоне этот пост был бы ПРОПУЩЕН (модель не вызывалась бы) — генерацию пропускаю.'
      : '⚠️  Данных слишком мало: в реальном прогоне этот пост был бы ПРОПУЩЕН (модель не вызывалась бы). Ниже — что получилось бы, если всё же вызвать.')
  if (!enough && skipThin) return false

  console.log('\n─── ГЕНЕРАЦИЯ ───')
  const result = await generateWithProviders(messages, car, grounding, {
    indent: '',
    // В dry-run показываем и забракованный проверкой фактов текст — чтобы можно было оценить строгость проверки.
    onReject: ({ provider: rejectedBy, story: rejected }) => {
      const preview = sanitizeStory(rejected).replace(/<[^>]+>/g, '').replace(/\n{2,}/g, '\n')
      console.log(`   ↳ отклонённый текст (${rejectedBy}):\n${preview.split('\n').map(l => '     ' + l).join('\n')}`)
    },
  })
  if (!result) {
    console.log('❌ ни один провайдер не дал годный текст (недоступны, пустой ответ или не прошли проверку фактов)')
    console.log('\n⚠️  В реальном прогоне эта модель была бы ПРОПУЩЕНА (не опубликована),')
    console.log('   а не отправлена шаблоном — см. generateStory(). Повтор в следующий прогон.')
    return enough
  }
  story = result.story
  provider = result.provider

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
  return enough
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
    const rawCar = cars.find(c => c.id === carId)
    if (!rawCar) { console.error(`[publish-stories] Машина не найдена: ${carId}`); process.exit(1) }
    const car = withCleanName(rawCar) // та же очистка названия от хука, что в автоматическом режиме
    console.log(`[publish-stories] Режим --car-id: ${car.name || car.fullName}${car._rawName ? `  (было: «${car._rawName}»)` : ''}`)
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

    // Превью не одной машины, а до 2 с достаточными данными (из первых 6 кандидатов): первая в очереди
    // бывает «пустой» и ничего не говорит о том, как генерация работает на нормальном материале.
    // «Пустых» пропускаем без вызова модели — так же, как боевой прогон.
    const pool = isForce
      ? cars.slice(0, 1)
      : cars.filter(c => !publishedIds.has(c.id)).map(withCleanName).filter(looksLikeRealModelName).slice(0, 6)
    if (!pool.length) { console.log('Нет новых моделей для превью'); return }

    const graph = loadGraph()
    let shown = 0, looked = 0
    for (const [i, car] of pool.entries()) {
      if (shown >= 2) break
      if (i > 0) console.log('\n' + '═'.repeat(70))
      looked++
      if (await dryRun(isForce ? withCleanName(car) : car, graph, { skipThin: !isForce })) shown++
    }
    console.log(`\n[dry-run] кандидатов просмотрено: ${looked}, с достаточными данными показано: ${shown}`)
    return
  }

  // ── Обычный автоматический режим (из scrape-latest.js) ────────────────────
  // Автопубликацией владеет GitHub Actions (.github/workflows/publish-stories.yml):
  // оттуда Gemini/Groq доступны без геоблока, не нужен включённый ноутбук, а
  // состояние (published-*.json) коммитится в git, и сайт обновляется сам.
  // PUBLISH_OWNER=ci в .env.local гасит ЛОКАЛЬНЫЙ авторежим — два публикатора с
  // разным состоянием дают дубли. Ручные режимы (--car-id/--model/--dry-run) не затронуты.
  if (process.env.PUBLISH_OWNER === 'ci' && process.env.GITHUB_ACTIONS !== 'true') {
    console.log('[publish-stories] автопубликацию ведёт GitHub Actions (PUBLISH_OWNER=ci) — локально пропускаю')
    return
  }

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

  // Заголовок-предложение → чистое название модели. СТРОГО после фильтров кликбейта/ретро
  // (им хук как раз нужен) и ДО проверки имени и группировки: одна модель из разных
  // статей получает один ключ и один пост ("Silverado HD" и "Silverado HD, a Gorilla-Strong…").
  const cleanedCars = genuineOnly.map(withCleanName)
  const renamed = cleanedCars.filter(c => c._rawName)
  if (renamed.length) {
    console.log(`[publish-stories] Очищено ${renamed.length} названий от редакционного хвоста:`)
    renamed.slice(0, 6).forEach(c => console.log(`    «${c._rawName}» → «${c.name}»`))
  }

  // Имя должно быть настоящим названием модели, а не обрывком предложения —
  // применяем ко ВСЕМ источникам (в т.ч. NCS: дефект другого рода, но проверка та же)
  const qualityCars = cleanedCars.filter(looksLikeRealModelName)
  const badNameSkipped = cleanedCars.length - qualityCars.length
  if (badNameSkipped > 0) console.log(`[publish-stories] Пропущено ${badNameSkipped} статей — имя не похоже на реальную модель (нет названия модели или бренд не сразу после года)`)

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

  const MAX_NEW_POSTS = 3   // максимум 3 новых поста за запуск
  // …но кандидатов пробуем до 6: тот, кого забраковала проверка фактов или у кого мало данных,
  // не должен вечно занимать первые места очереди и не пускать остальных (раньше брались ровно 3).
  const MAX_ATTEMPTS  = 6
  // Кандидат, у которого «мало данных о новинке» (ужесточено 20.11.2026), модель не зовёт и в Telegram не пишет:
  // попытку не тратит, считается отдельно (но не бесконечно — на каждого идёт веб-ресерч).
  const MAX_THIN_SKIPS = 12
  const toEdit    = enrichGroups.slice(0, 2)  // максимум 2 правки за запуск
  const graph     = loadGraph()
  let published = 0
  let attempts  = 0
  let thinSkips = 0
  let touchedTelegram = false   // задержка от флуд-лимита нужна только после попытки, которая могла писать в Telegram
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

  for (const car of newGroups) {
    if (published >= MAX_NEW_POSTS || attempts >= MAX_ATTEMPTS || thinSkips >= MAX_THIN_SKIPS) break
    if (touchedTelegram) await new Promise(r => setTimeout(r, 3500))
    attempts++
    touchedTelegram = true
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
      if (e.thin) { attempts--; thinSkips++; touchedTelegram = false }
    }
  }

  // Правим уже опубликованные посты, для которых нашлась статья с уникальной
  // инфой — та же задержка от флуд-лимита, что и у новых публикаций.
  for (let i = 0; i < toEdit.length; i++) {
    if (i > 0 || attempts) await new Promise(r => setTimeout(r, 3500))
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

  console.log(`[publish-stories] ✅ Опубликовано ${published}/${MAX_NEW_POSTS} (кандидатов пробовали: ${attempts}, пропущено из-за нехватки данных: ${thinSkips}), отредактировано ${edited}/${toEdit.length}`)
  if (newGroups.length > attempts + thinSkips)
    console.log(`  ℹ️  Ещё ${newGroups.length - attempts - thinSkips} новых — в следующем запуске`)
  if (enrichGroups.length > toEdit.length)
    console.log(`  ℹ️  Ещё ${enrichGroups.length - toEdit.length} правок — в следующем запуске`)
}

main().catch(e => {
  console.error('[publish-stories] ОШИБКА:', e.message)
  process.exit(0)  // exit 0 чтобы не прерывать цепочку scrape-latest
})
