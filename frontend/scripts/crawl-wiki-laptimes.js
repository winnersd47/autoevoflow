#!/usr/bin/env node
/**
 * crawl-wiki-laptimes.js — дополняет A777 (crawl-a777.js) двумя списками
 * Википедии: Nürburgring Nordschleife lap times (production/street-legal) и
 * Top Gear test track Power Laps. Логика — wiki-laptime-lib.js.
 *
 * ТОЛЬКО дозаполняет пробелы — никогда не перезаписывает уже существующие
 * a777Nurb/a777TopGear (A777 при совпадении считается основным источником,
 * тут только то, чего у него нет — Википедия сильнее по mainstream/EV/muscle,
 * но координаты каждой отдельной записи не всегда так же выверены, как у A777).
 *
 * На практике покрытие этих списков сильно смещено в сторону топовых/N/JCW/
 * Performance-тримов почти по каждому бренду — если у наших нод в графе только
 * базовые версии без такого трима в имени, честный результат — "нет совпадения",
 * не выдумывать. Проверено вручную: реалистичный выход по mainstream-брендам —
 * единицы-десятки совпадений, не сотни.
 *
 * Usage:
 *   node scripts/crawl-wiki-laptimes.js          # весь граф
 *   node scripts/crawl-wiki-laptimes.js --dry    # без сохранения, только отчёт
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const CACHE_FILE = path.join(__dirname, '../public/data/wiki-laptime-cache.json')

const { fetchNurburgringEntries, fetchTopGearEntries, matchNodeToEntries } = require('./wiki-laptime-lib.js')

async function main() {
  const dryRun = process.argv.includes('--dry')
  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

  console.log('Загружаю списки кругов Википедии…')
  const [nurbEntries, tgEntries] = await Promise.all([fetchNurburgringEntries(), fetchTopGearEntries()])
  console.log(`  Нюрбургринг: ${nurbEntries.length} записей, Top Gear: ${tgEntries.length} записей`)

  // Только ноды, у которых ЕЩЁ НЕТ времени круга ни от A777, ни от предыдущего
  // запуска этого скрипта — дозаполнение, не пересмотр уже решённого.
  const candidates = graph.nodes.filter(n => !n.a777Nurb && !n.a777TopGear)
  console.log(`Кандидатов без времени круга: ${candidates.length}/${graph.nodes.length}`)

  const cache = {}
  let matchedNurb = 0, matchedTg = 0
  const byBrand = {}

  for (const node of candidates) {
    const nurbMatch = matchNodeToEntries(node, nurbEntries)
    const tgMatch = matchNodeToEntries(node, tgEntries)
    if (!nurbMatch && !tgMatch) continue

    const entry = { id: node.id }
    if (nurbMatch) { entry.nurb = nurbMatch.time; entry.nurbSource = nurbMatch.vehicle; matchedNurb++ }
    if (tgMatch)   { entry.topgear = tgMatch.time; entry.tgSource = tgMatch.vehicle; matchedTg++ }
    cache[node.id] = entry
    byBrand[node.brandId] = (byBrand[node.brandId] || 0) + 1
    console.log(`  [${node.brandId}] ${node.label} (${node.year}) -> ${nurbMatch ? 'DE ' + nurbMatch.time + ' "' + nurbMatch.vehicle + '"' : ''}${tgMatch ? ' GB ' + tgMatch.time + ' "' + tgMatch.vehicle + '"' : ''}`)
  }

  console.log(`\nИтого: Нюрбургринг ${matchedNurb}, Top Gear ${matchedTg}, всего нод затронуто ${Object.keys(cache).length}`)
  console.log('По брендам:', Object.entries(byBrand).sort((a, b) => b[1] - a[1]).map(([b, c]) => `${b}:${c}`).join(', '))

  if (dryRun) { console.log('(--dry: ничего не сохранено)'); return }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8')

  let merged = 0
  graph.nodes = graph.nodes.map(node => {
    const c = cache[node.id]
    if (!c) return node
    const updated = { ...node }
    if (c.nurb && !updated.a777Nurb) { updated.a777Nurb = c.nurb; merged++ }
    if (c.topgear && !updated.a777TopGear) updated.a777TopGear = c.topgear
    return updated
  })
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
  console.log(`\n✅ graph.json обновлён (${merged} нод), кэш → ${CACHE_FILE}`)
}

main().catch(e => { console.error(e); process.exit(1) })
