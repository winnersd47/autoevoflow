#!/usr/bin/env node
/**
 * crawl-a777.js — правильный двухуровневый краулер A777, вместо угадывания URL
 * по слагу label (старый enrich-a777.js так угадывал candidateUrl = `{year}-
 * {brand}-{slug(label)}.php` — дало только 47/2344, 2%: реальные страницы A777
 * часто используют полное маркетинговое имя ("458-italia", не просто "458")
 * или вообще другое кодовое имя ("m5-f90" вместо нашего "m5-g30").
 *
 * Реальная структура сайта (проверено вручную):
 *   /cars/{brand}/               → список ссылок на модельные семейства
 *   /cars/{brand}/{family}/      → список конкретных страниц год+трим
 *   /{year}-{brand}-{full-slug}.php → сама страница с спеками и треками
 *
 * Краулинг + fuzzy-матч + парсинг — в a777-lib.js (общий с точечным лукапом
 * для новых нод в sync-latest-to-project.js, чтобы логика не расходилась
 * второй раз — brand map уже разъезжалась один раз между a777.ts/enrich-a777.js).
 *
 * Кэширует список detail-URL по бренду отдельно (a777-catalog-cache.json), чтобы
 * повторные запуски (и точечный лукап для новых нод) не перекраулили страницы
 * брендов/семейств заново.
 *
 * Usage:
 *   node scripts/crawl-a777.js                # все бренды, все узлы без found=true
 *   node scripts/crawl-a777.js --brand dodge   # один бренд
 *   node scripts/crawl-a777.js --dry           # без сохранения, только отчёт
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_FILE   = path.join(__dirname, '../public/data/evolution/graph.json')
const CACHE_FILE   = path.join(__dirname, '../public/data/a777-cache.json')
const CATALOG_FILE = path.join(__dirname, '../public/data/a777-catalog-cache.json')
const CONCURRENCY  = 8

const A777_BRAND_MAP = require('./a777-brand-map.js')
const { crawlBrandCatalog, matchNode, parseSpecs, parseTrackTimes, fetchHtml } = require('./a777-lib.js')

// ─── Concurrency pool ─────────────────────────────────────────────────────────
async function runPool(items, fn, concurrency) {
  const results = []
  let i = 0
  async function worker() { while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx]) } }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2)
  const brand   = args[args.indexOf('--brand') + 1] ?? null
  const dryRun  = args.includes('--dry')

  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
  let existingCache = {}
  if (fs.existsSync(CACHE_FILE)) { try { existingCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } catch {} }
  let catalogCache = {}
  if (fs.existsSync(CATALOG_FILE)) { try { catalogCache = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8')) } catch {} }

  let brandIds = Object.keys(A777_BRAND_MAP)
  if (brand) brandIds = brandIds.filter(b => b === brand)

  const brandNodeCount = {}
  graph.nodes.forEach(n => { if (A777_BRAND_MAP[n.brandId]) brandNodeCount[n.brandId] = (brandNodeCount[n.brandId] || 0) + 1 })
  brandIds = brandIds.filter(b => brandNodeCount[b] > 0)

  console.log(`Краулю каталоги ${brandIds.length} брендов…`)
  let totalFound = 0, totalMatched = 0, totalNodes = 0
  const newCache = { ...existingCache }

  for (const brandId of brandIds) {
    const a777Brand = A777_BRAND_MAP[brandId]
    let catalog = catalogCache[brandId]?.catalog
    if (!catalog) {
      catalog = await crawlBrandCatalog(a777Brand)
      catalogCache[brandId] = { catalog, crawledAt: Date.now() }
    }
    const nodes = graph.nodes.filter(n => n.brandId === brandId && !existingCache[n.id]?.found)
    totalNodes += nodes.length
    if (!catalog.length || !nodes.length) {
      console.log(`  ${brandId}: каталог ${catalog.length} стр., узлов к матчу ${nodes.length}`)
      continue
    }

    const matches = nodes.map(n => ({ node: n, match: matchNode(n, catalog) })).filter(x => x.match)
    console.log(`  ${brandId}: каталог ${catalog.length} стр. → совпало ${matches.length}/${nodes.length}`)
    totalMatched += matches.length

    if (dryRun) continue

    const results = await runPool(matches, async ({ node, match }) => {
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
    }, CONCURRENCY)

    for (const r of results) { if (r) { newCache[r.id] = r; totalFound++ } }
  }

  console.log(`\nИтого: ${totalNodes} узлов без данных, ${totalMatched} совпало с каталогом, ${totalFound} реально скачано.`)
  if (!dryRun) {
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalogCache, null, 2), 'utf8')
    fs.writeFileSync(CACHE_FILE, JSON.stringify(newCache, null, 2), 'utf8')
    console.log(`Кэш каталогов → ${CATALOG_FILE}`)
    console.log(`Кэш узлов → ${CACHE_FILE}`)
  } else {
    console.log('(--dry: ничего не сохранено)')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
