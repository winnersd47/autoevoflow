'use strict'
/**
 * fill-model-images.js — находит и подставляет реальные фото для моделей на
 * /evolution (hover-карточка читает public/data/models/<modelSlug>.json, см.
 * EvolutionGraph.tsx и sync-node-images-to-models.js для "бесплатной" фазы).
 *
 * Источник — Wikipedia (та же проверенная логика wikiImageByQuery/
 * fetchWikipediaImage, что уже используется в publish-new-stories.js для
 * пресс-фото): опенсёрч по названию, фильтр по описанию "это точно про
 * машину", full-res картинка без логотипов/гербов.
 *
 * Порядок — по убыванию числа поколений в группе: модели с длинной историей
 * (M3, 911, Golf...) считаются "базовыми/значимыми" и обрабатываются первыми;
 * одно-поколенческие варианты/лимитки — в конце очереди. Пользователь
 * попросил именно так: важное сейчас, остальное довешивается в фоне.
 *
 * Чекпоинт — пишет models/<slug>.json сразу при нахождении картинки, можно
 * прерывать и перезапускать, уже обработанные (есть файл с heroImageUrl)
 * пропускаются автоматически.
 *
 * Usage: node scripts/fill-model-images.js [--limit=N]
 */
const fs   = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const GRAPH_FILE = path.join(ROOT, 'public/data/evolution/graph.json')
const MODELS_DIR = path.join(ROOT, 'public/data/models')

const args = process.argv.slice(2)
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1] || Infinity)

// Живой найденный баг: фоновый прогон за ~100 запросов словил rate-limit
// Wikipedia ("You are making too many requests...") — это ПРОСТОЙ ТЕКСТ, не
// JSON, так что JSON.parse кидал исключение, try/catch в вызывающем коде его
// молча проглатывал как "картинка не найдена", и ВСЕ последующие сотни
// моделей тоже тихо проваливались (лимит не снимался сам, раз ничего не
// ждало) — процент находок обвалился с 50% до 7%. Теперь при обнаружении
// текста лимита выставляем глобальный "период охлаждения" — ПЕРЕД каждым
// запросом ждём его окончания, вместо того чтобы долбить API и копить лимит.
let rateLimitedUntil = 0
async function waitOutRateLimit() {
  const wait = rateLimitedUntil - Date.now()
  if (wait > 0) {
    console.log(`  ⏳ Wikipedia/Commons rate-limit — жду ${Math.ceil(wait / 1000)}s...`)
    await new Promise(r => setTimeout(r, wait))
  }
}

function httpGet(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    const done = (val, err) => { clearTimeout(timer); err ? reject(err) : resolve(val) }
    try {
      const mod = url.startsWith('https') ? require('https') : require('http')
      const parsed = new (require('url').URL)(url)
      const req = mod.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AutoEvoFlow/2.0)', Accept: 'application/json,*/*' },
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpGet(res.headers.location, timeoutMs).then(v => done(v)).catch(e => done('', e))
          res.resume(); return
        }
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          if (/too many requests/i.test(data)) {
            rateLimitedUntil = Date.now() + 60_000
          }
          done(data)
        })
      })
      req.on('error', err => done('', err))
    } catch (err) { done('', err) }
  })
}

const VEHICLE_RE = /\b(car|vehicle|automobile|truck|pickup|suv|sedan|van|electric|hybrid|motorcycle|bus|tractor|automotive|manufacturer|model|brand)\b/i

async function wikiImageByQuery(query) {
  try {
    await waitOutRateLimit()
    const q = encodeURIComponent(query)
    const searchRaw = await httpGet(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=4&namespace=0&format=json`)
    const [, titles] = JSON.parse(searchRaw)
    if (!titles?.length) return null
    for (const title of titles.slice(0, 4)) {
      try {
        await waitOutRateLimit()
        const slug = encodeURIComponent(title.replace(/ /g, '_'))
        const raw = await httpGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)
        const data = JSON.parse(raw)
        const desc = `${data.description || ''} ${(data.extract || '').slice(0, 200)}`
        if (!VEHICLE_RE.test(desc)) continue
        let src = data.originalimage?.source
        if (!src && data.thumbnail?.source) src = data.thumbnail.source.replace(/\/\d+px-/, '/1280px-')
        if (src) {
          const fname = src.split('/').pop() || ''
          if (!/logo|badge|emblem|symbol|flag|seal|coat_of/i.test(fname)) {
            return { src, articleUrl: `https://en.wikipedia.org/wiki/${slug}` }
          }
        }
      } catch { /* пробуем следующий title */ }
    }
  } catch { /* пробуем следующий query */ }
  return null
}

// ─── Источник 2: NetCarShow прямым угадыванием URL ────────────────────────────
// Та же схема имени файла, что уже используется по всему проекту (scrape-latest.js,
// десятки узлов этого графа): https://www.netcarshow.com/{Brand}-{Model}-{year}-wallpaper.jpg,
// пробелы → подчёркивания, каждое слово с большой буквы. Угадывание, не 100% —
// проверяем реальным запросом, а не просто конструируем ссылку вслепую.
function toNetCarShowSegment(s) {
  return s.split(/\s+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_')
}
async function guessNetCarShowImage(label, brand, year) {
  if (!year) return null
  const brandSeg = toNetCarShowSegment(brand)
  let modelLabel = label.replace(/^\d{4}\s+/, '')
  if (modelLabel.toLowerCase().startsWith(brand.toLowerCase())) {
    modelLabel = modelLabel.slice(brand.length).trim()
  }
  if (!modelLabel) return null
  const modelSeg = toNetCarShowSegment(modelLabel)
  const url = `https://www.netcarshow.com/${brandSeg}-${modelSeg}-${year}-wallpaper.jpg`
  try {
    const ok = await new Promise((resolve) => {
      const https = require('https')
      const req = https.request(url, { method: 'HEAD', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AutoEvoFlow/2.0)' } }, res => {
        resolve(res.statusCode === 200 && (res.headers['content-type'] || '').startsWith('image/'))
        res.resume()
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
      req.end()
    })
    if (ok) return { src: url, articleUrl: `https://www.netcarshow.com/` }
  } catch { /* ignore */ }
  return null
}

// ─── Источник 3: Wikimedia Commons, прямой поиск по файлам ────────────────────
// Шире, чем полноценная статья в Википедии — ловит случаи, когда у модели нет
// отдельной статьи, но есть категоризированные фото на Commons (часто бывает
// для трим-уровней/рестайлингов отдельно от базовой модели).
async function searchCommonsImage(query) {
  try {
    await waitOutRateLimit()
    const q = encodeURIComponent(`${query} car`)
    const raw = await httpGet(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime&format=json`)
    const data = JSON.parse(raw)
    const pages = Object.values(data?.query?.pages || {})
    for (const p of pages) {
      const info = p.imageinfo?.[0]
      if (!info?.url) continue
      if (!/^image\/(jpeg|png|webp)/.test(info.mime || '')) continue
      const fname = info.url.split('/').pop() || ''
      if (/logo|badge|emblem|symbol|flag|seal|coat_of|diagram|map|chart/i.test(fname)) continue
      return { src: info.url, articleUrl: `https://commons.wikimedia.org/wiki/${p.title}` }
    }
  } catch { /* ignore */ }
  return null
}

async function fetchWikipediaImage(label, brand) {
  const b = (brand || '').replace(/[^\w\s]/g, ' ').trim()
  const l = label.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\d{4}\s+/, '')
  const hasB = l.toLowerCase().startsWith(b.toLowerCase())
  const fullQ = hasB ? l : `${b} ${l}`.trim()
  const words = fullQ.split(/\s+/).filter(w => w.length > 0 && !/^\d+$/.test(w))
  const seen = new Set()
  const queries = []
  for (let n = words.length; n >= 1; n--) {
    const q = words.slice(0, n).join(' ')
    if (q && !seen.has(q)) { seen.add(q); queries.push(q) }
  }
  for (const q of queries) {
    const result = await wikiImageByQuery(q)
    if (result) return result
  }
  return null
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))
  const byModel = new Map()
  for (const n of g.nodes) {
    const key = n.modelSlug || n.id
    const arr = byModel.get(key) || []
    arr.push(n)
    byModel.set(key, arr)
  }

  // Приоритет — по числу поколений в группе (убывание): значимые долгоживущие
  // модели сначала, одноразовые варианты/лимитки — в хвост очереди.
  const groups = [...byModel.entries()]
    .map(([slug, nodes]) => ({ slug, nodes: [...nodes].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)) }))
    .sort((a, b) => b.nodes.length - a.nodes.length)

  let processed = 0, found = 0, skippedHasImage = 0, notFound = 0

  for (const { slug, nodes } of groups) {
    if (processed >= LIMIT) break
    const file = path.join(MODELS_DIR, `${slug}.json`)
    let data = null
    if (fs.existsSync(file)) {
      try { data = JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { data = null }
    }
    if (data?.heroImageUrl || data?.thumbnailUrl) { skippedHasImage++; continue }

    processed++
    const last = nodes[0]
    const label = (last.fullName || last.label || '').replace(/^\d{4}\s+/, '')
    const brandName = last.brandName || last.brandId

    process.stdout.write(`[${processed}] ${brandName} ${label} (${nodes.length} gen)... `)
    let result = null
    try { result = await guessNetCarShowImage(label, brandName, last.year) } catch { /* ignore */ }
    if (!result) { try { result = await fetchWikipediaImage(label, brandName) } catch { /* ignore */ } }
    if (!result) { try { result = await searchCommonsImage(`${brandName} ${label}`) } catch { /* ignore */ } }

    if (result) {
      const modelName = label.replace(/\s*\(\d{4}\)\s*$/, '')
      const years = nodes.map(n => n.year ?? 0)
      const brandId = last.brandId
      const entry = data || {
        id: `sync-${slug}`, slug, name: modelName, fullName: last.fullName || last.label,
        brandId, bodyType: last.bodyType || 'sedan', segment: last.segment || 'other',
        primaryMarket: 'global', startYear: Math.min(...years), isActive: true,
        description: last.note || last.description || '', generationCount: nodes.length,
        tags: [], aiAnalysisAvailable: false, createdAt: new Date().toISOString(),
      }
      entry.heroImageUrl = result.src
      entry.thumbnailUrl = result.src
      entry.updatedAt = new Date().toISOString()
      fs.mkdirSync(MODELS_DIR, { recursive: true })
      fs.writeFileSync(file, JSON.stringify(entry, null, 2))
      found++
      console.log('OK')
    } else {
      notFound++
      console.log('—')
    }
    await sleep(1200) // вежливая пауза — раньше 400ms, словили rate-limit через ~100 моделей
  }

  console.log(`\nГотово: обработано ${processed}, найдено картинок ${found}, не найдено ${notFound}, уже было ${skippedHasImage}`)
}

main().catch(e => { console.error('[fatal]', e); process.exit(1) })
