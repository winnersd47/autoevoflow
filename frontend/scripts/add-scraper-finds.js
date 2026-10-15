#!/usr/bin/env node
// Точечные добавления по итогам отчёта "что скрапер нашёл, чего нет в графе":
//   1. Hartge H50 (2001) — тюнинг-ателье BMW, НЕ отдельный бренд (по решению
//      пользователя): brandId остаётся 'bmw', как у существующих AMG/Brabus
//      узлов (isTuning + atelierName, а не свой brandId).
//   2. Aston Martin DBR22 (2022) — трек-only лимитка, отсутствовавшая при
//      наличии 17 других нод бренда.
//   3. Mercedes-AMG GLC 63 S (2018) — в графе не было НИ ОДНОГО поколения GLC
//      вообще, поэтому точечно: только база X253 + вариант 63 S, без остальных
//      поколений/рестайлингов.
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

let addedN = 0, addedE = 0
const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n; addedN++
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  addedE++; console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}

console.log('── Hartge H50 (тюнинг BMW E46 M3, НЕ отдельный бренд) ──')
addNode({
  id: 'bmw-hartge-h50-e46', label: 'Hartge H50', type: 'generation', year: 2001,
  brandId: 'bmw', brandName: 'BMW', codeName: 'E46 Hartge H50',
  modelSlug: 'bmw-m3', bodyType: 'sedan', segment: 'premium_compact', zone: 'midsize_sed',
  hp: 400, engineType: 'v8', isTuning: true, isLimited: true, atelierName: 'Hartge',
})
addEdge('e-bmw-m3e46-hartge', 'bmw-m3-e46', 'bmw-hartge-h50-e46', 'derived_from')

console.log('── Aston Martin DBR22 (2022) ──')
addNode({
  id: 'am-dbr22', label: 'DBR22', type: 'generation', year: 2022,
  brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'DBR22',
  modelSlug: 'aston-martin-dbr22', bodyType: 'roadster', segment: 'hypercar', zone: 'hypercar',
  hp: 715, engineType: 'v12', isLimited: true,
})
addEdge('e-am-valkyrie-dbr22', 'am-valkyrie', 'am-dbr22', 'inspired_by')

console.log('── Mercedes-AMG GLC 63 S X253 (+ база GLC X253, которой не было вообще) ──')
addNode({
  id: 'merc-glc-x253', label: 'GLC X253', type: 'generation', year: 2015,
  brandId: 'mercedes', brandName: 'Mercedes-Benz', codeName: 'X253',
  modelSlug: 'mercedes-glc', bodyType: 'suv', segment: 'exec', zone: 'suv_mid',
  hp: 211, engineType: 'i4',
})
addNode({
  id: 'merc-glc63s-x253', label: 'AMG GLC 63 S', type: 'generation', year: 2018,
  brandId: 'mercedes', brandName: 'Mercedes-Benz', codeName: 'X253 AMG 63 S',
  modelSlug: 'mercedes-glc', bodyType: 'suv', segment: 'exec', zone: 'suv_mid',
  hp: 503, engineType: 'v8', isTuning: true, atelierName: 'AMG',
})
addEdge('e-merc-glc-63s', 'merc-glc-x253', 'merc-glc63s-x253', 'variant_of')

console.log(`\nAdded ${addedN} nodes, ${addedE} edges.`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
