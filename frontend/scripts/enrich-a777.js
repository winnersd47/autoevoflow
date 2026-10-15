#!/usr/bin/env node
/**
 * enrich-a777.js — Pre-cache A777 performance data for all nodes in graph.json
 *
 * Usage:
 *   node scripts/enrich-a777.js               # all nodes
 *   node scripts/enrich-a777.js --brand ferrari  # single brand
 *   node scripts/enrich-a777.js --new             # only nodes added in last 7 days
 *
 * Output: public/data/a777-cache.json
 * The runtime API route uses this file as a warm cache seed on first request.
 *
 * Run this after every model-addition patch script:
 *   node scripts/patch-new-models.js && node scripts/enrich-a777.js --new
 */

const fs      = require('fs')
const path    = require('path')
// Node 18+ has native fetch and TextDecoder globally

const GRAPH_FILE  = path.join(__dirname, '../public/data/evolution/graph.json')
const CACHE_FILE  = path.join(__dirname, '../public/data/a777-cache.json')
const CONCURRENCY = 8

// Общий источник правды с crawl-a777.js (раньше был инлайновый дубль — уже разошёлся
// со src/lib/a777.ts один раз, вынесено в отдельный модуль чтобы не разъезжалось снова)
const BRAND_MAP = require('./a777-brand-map.js')

const TRACK_SLUGS = {
  nurburgring: 'nurburgring-nordschleife',
  topgear:     'top-gear-track',
  hockenheim:  'hockenheim-short',
  tsukuba:     'tsukuba-circuit',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function buildCandidates(a777Brand, year, label) {
  const slug = toSlug(label)
  const base = 'https://www.a777aa77.ru'
  return [
    `${base}/${year}-${a777Brand}-${slug}.php`,
    `${base}/${year - 1}-${a777Brand}-${slug}.php`,
    `${base}/${year + 1}-${a777Brand}-${slug}.php`,
  ]
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
  'Accept': 'text/html',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  'Referer': 'https://www.a777aa77.ru/',
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(9000),
    })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new TextDecoder('utf-8').decode(buf)
  } catch { return null }
}

function extract(html, ...patterns) {
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) { const n = parseFloat(m[1].replace(/[\s,]/g, '')); if (!isNaN(n) && n > 0) return n }
  }
}

function sanity(val, min, max) {
  return (val != null && val >= min && val <= max) ? val : undefined
}

function parse(html) {
  const raw = {
    topSpeed:      extract(html, /скорост[ьи][^<]{0,60}(\d{2,3})\s*км\/ч/i, /(\d{2,3})\s*км\/ч/, /(\d{2,3})\s*km\/h/i),
    acceleration:  extract(html, /разгон[^<]{0,80}?(\d+[.,]\d+)\s*сек/i, /разгон[^<]{0,80}?(\d+[.,]\d+)\s*с\b/i, /0[–\-−]100[^<]{0,40}?(\d+[.,]\d+)/i, /(\d+[.,]\d+)\s*сек/i),
    horsepower:    extract(html, /мощност[ьи][^<]{0,60}(\d{3,5})\s*л\.с\./i, /(\d{3,5})\s*л\.с\./, /(\d{3,5})\s*hp\b/i),
    torque:        extract(html, /Крутящий момент[^<]{0,60}?(\d{3,5})/i, /момент[^<]{0,40}(\d{3,5})/i, /(\d{3,5})\s*Нм/, /(\d{3,5})\s*Nm/i),
    displacementCc:extract(html, /объ[её]м[^<]{0,60}?(\d{4,5})/i, /(\d{4,5})\s*см³/, /(\d{4,5})\s*cm³/i),
    weightKg:      extract(html, /(?:масс[аы]|вес)[^<]{0,80}?(\d{3,5})\s*кг/i, /(\d{3,5})\s*кг(?:\s|[.,<]|$)/, /(\d{3,5})\s*kg(?:\s|[.,<]|$)/i),
    priceUsd:      extract(html, /\$\s*([\d,]{3,12})/),
    hpPerTon:      extract(html, /(\d{2,4})\s*л\.с\.\/т/, /(\d{2,4})\s*hp\/t/i),
    hpPerLiter:    extract(html, /(\d{2,4})\s*л\.с\.\/л/, /(\d{2,4})\s*hp\/l/i),
  }
  return {
    topSpeed:      sanity(raw.topSpeed,      100, 600),
    acceleration:  sanity(raw.acceleration,  0.5,  30),
    horsepower:    sanity(raw.horsepower,     50,3000),
    torque:        sanity(raw.torque,          50,3000),
    displacementCc:sanity(raw.displacementCc, 500,10000),
    weightKg:      sanity(raw.weightKg,       500,5000),
    priceUsd:      sanity(raw.priceUsd,      1000,50000000),
    hpPerTon:      sanity(raw.hpPerTon,        50, 2000),
    hpPerLiter:    sanity(raw.hpPerLiter,      20,  700),
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

// ─── Process one node ─────────────────────────────────────────────────────────
async function processNode(node) {
  const a777Brand = BRAND_MAP[node.brandId]
  if (!a777Brand) return null

  const candidates = buildCandidates(a777Brand, node.year, node.label)
  let html = null, foundUrl = ''

  for (const url of candidates) {
    const h = await fetchHtml(url)
    if (h && h.length > 5000) { html = h; foundUrl = url; break }
  }

  if (!html) return { id: node.id, url: candidates[0], found: false }

  const specs = parse(html)
  const trackTimes = parseTrackTimes(html)

  return {
    id: node.id,
    url: foundUrl,
    found: true,
    ...specs,
    ...(Object.keys(trackTimes).length ? { trackTimes } : {}),
    fetchedAt: Date.now(),
  }
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────
async function runPool(items, fn, concurrency) {
  const results = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2)
  const brand   = args[args.indexOf('--brand') + 1] ?? null
  const newOnly = args.includes('--new')

  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

  // Load existing cache
  let existing = {}
  if (fs.existsSync(CACHE_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } catch {}
  }

  const ONE_WEEK = 7 * 24 * 3600 * 1000
  let nodes = graph.nodes.filter(n => BRAND_MAP[n.brandId])
  if (brand) nodes = nodes.filter(n => n.brandId === brand)
  if (newOnly) {
    const cutoff = Date.now() - ONE_WEEK
    nodes = nodes.filter(n => !existing[n.id] || (existing[n.id].fetchedAt && existing[n.id].fetchedAt < cutoff))
  }

  // Skip already cached found entries (unless --new)
  if (!newOnly) {
    nodes = nodes.filter(n => !existing[n.id]?.found)
  }

  console.log(`Обработка ${nodes.length} узлов (concurrency=${CONCURRENCY})…`)
  if (!nodes.length) { console.log('Нечего делать.'); return }

  let done = 0
  const results = await runPool(nodes, async (node) => {
    process.stdout.write(`  [${++done}/${nodes.length}] ${node.label} (${node.year})…`)
    const r = await processNode(node)
    console.log(r?.found ? ` ✓ (${r.url})` : ' ✗ не найдено')
    return r
  }, CONCURRENCY)

  const cache = { ...existing }
  for (const r of results) {
    if (r) cache[r.id] = r
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8')
  const found = results.filter(r => r?.found).length
  console.log(`\nГотово. Найдено: ${found}/${nodes.length}. Кэш записан → ${CACHE_FILE}`)
}

main().catch(e => { console.error(e); process.exit(1) })
