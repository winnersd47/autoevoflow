#!/usr/bin/env node
// Точечное добавление: копали переход "SRT8 -> просто SRT". Уточнение по
// источникам — "8" убрали из имени начиная с 2015 модельного года, ровно
// когда SRT вернули под Dodge (конец 2014, тот же момент, что стандарт-
// изация бренда). НО атмосферный 6.4L трим не исчез и не стал Hellcat —
// он переименовался в "SRT 392" (485 л.с.) и продолжил жить РЯДОМ с новым
// наддувным Hellcat как отдельная, младшая ступень, а не был им заменён.
// Structural: значит SRT8 -> facelifted_to -> SRT 392 (тот же трим,
// переименован на рестайлинге), а Hellcat — сиблинг SRT 392, оба variant_of
// от базы поколения, НЕ variant_of от SRT8 напрямую.
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
const retargetSource = (edgeId, newSource) => {
  const e = g.edges.find(x => x.id === edgeId)
  const old = e.source
  e.source = newSource
  console.log(`RETARGET ${edgeId}: source ${byId[old].label} -> ${byId[newSource].label}`)
}

const NOTE = '"8" убрали из имени с 2015 МГ (когда SRT вернули под Dodge) — тот же 6.4L HEMI, переименован в "SRT 392"; существовал РЯДОМ с новым наддувным Hellcat, не был им заменён.'

console.log('── Challenger SRT 392 (2015) ──')
addNode({
  id: 'dodge-challenger-srt-392', label: 'Challenger SRT 392', fullName: 'Dodge Challenger R/T Scat Pack / SRT 392',
  type: 'generation', year: 2015,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LC SRT 392',
  modelSlug: 'dodge-challenger-srt', bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
  hp: 485, engineType: 'v8', engineCC: 6400,
  note: NOTE,
})
addEdge('e-challenger-srt8-392', 'dodge-challenger-srt8', 'dodge-challenger-srt-392', 'facelifted_to')

console.log('\n── Charger SRT 392 (2015) + фикс родителя Hellcat ──')
addNode({
  id: 'dodge-charger-srt-392', label: 'Charger SRT 392', fullName: 'Dodge Charger R/T Scat Pack / SRT 392',
  type: 'generation', year: 2015,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LD SRT 392',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 485, engineType: 'v8', engineCC: 6400,
  note: NOTE,
})
addEdge('e-charger-srt8-392', 'dodge-charger-srt8-2011', 'dodge-charger-srt-392', 'facelifted_to')
retargetSource('charger-srt8-hellcat', 'dodge-charger-rt-ld')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
