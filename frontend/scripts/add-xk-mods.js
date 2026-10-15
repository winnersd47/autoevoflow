#!/usr/bin/env node
// Точечная правка XK: "XK8 / XKR" — одна нода на два разных трима (та же
// проблема, что чинили много раз). 294hp — это реально спек базового XK8;
// XKR был отдельным наддувным тримом (~370hp), никогда не был той же машиной.
// У второго поколения (X150, 2006) вообще нет ни XKR, ни финального XKR-S.
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  if (g.edges.some(e => e.id === id)) { console.log(`SKIP edge (exists): ${id}`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}

console.log('── X100: разводим "XK8 / XKR" на настоящие два трима ──')
byId['jag-xk8'].label = 'XK8'
byId['jag-xk8'].fullName = 'Jaguar XK8'
console.log('FIX  jag-xk8: label "XK8 / XKR" -> "XK8" (294hp — это база, не XKR)')
addNode({ id: 'jag-xkr-x100', label: 'XKR', fullName: 'Jaguar XKR',
  type: 'generation', year: 1998, brandId: 'jaguar', brandName: 'Jaguar', codeName: 'X100 XKR',
  modelSlug: 'jaguar-xk8', bodyType: 'coupe', segment: 'gt', zone: 'gt_coupe',
  hp: 370, engineType: 'v8s',
  note: 'Наддувный 4.0L V8 — отдельный топ-трим X100, не та же машина, что базовый XK8.' })
addEdge('e-xk8-xkr100', 'jag-xk8', 'jag-xkr-x100', 'variant_of')

console.log('\n── X150: добавляем XKR + финальный XKR-S ──')
addNode({ id: 'jag-xkr-x150', label: 'XKR', fullName: 'Jaguar XKR',
  type: 'generation', year: 2007, brandId: 'jaguar', brandName: 'Jaguar', codeName: 'X150 XKR',
  modelSlug: 'jaguar-xk', bodyType: 'coupe', segment: 'gt', zone: 'gt_coupe',
  hp: 420, engineType: 'v8s',
  note: 'Наддувный V8 — топ-трим X150 до появления XKR-S.' })
addEdge('e-xkx150-xkr150', 'jag-xk-x150', 'jag-xkr-x150', 'variant_of')

addNode({ id: 'jag-xkr-s-x150', label: 'XKR-S', fullName: 'Jaguar XKR-S',
  type: 'generation', year: 2011, brandId: 'jaguar', brandName: 'Jaguar', codeName: 'X150 XKR-S',
  modelSlug: 'jaguar-xk', bodyType: 'coupe', segment: 'gt', zone: 'gt_coupe',
  hp: 550, engineType: 'v8s',
  note: '5.0L supercharged, 550 л.с. — трек-ориентированный финальный флагман X150 перед снятием XK в 2014-м.' })
addEdge('e-xkr150-xkrs150', 'jag-xkr-x150', 'jag-xkr-s-x150', 'variant_of')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
