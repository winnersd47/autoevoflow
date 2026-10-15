#!/usr/bin/env node
// Точечное добавление: "SRT 392" по всей Chrysler Group — кроме Charger и
// Challenger (уже сделаны), бейдж реально носил только Durango (475 л.с.,
// 6.4L). Jeep Grand Cherokee называл свои тримы просто "SRT"/"Trackhawk"
// (без "392"), Chrysler 300 SRT8 закончился в 2014 без преемника, Ram
// "SRT 392" никогда не использовал — этим трём ничего не добавляем.
//
// ВАЖНО: у Durango порядок ДРУГОЙ, чем у Charger/Challenger. Там 392 и
// Hellcat стартовали ОДНОВРЕМЕННО в 2015 как параллельные сиблинги. У
// Durango SRT 392 вышел в 2018-м, Hellcat — только в 2021-м как ДАЛЬНЕЙШАЯ
// эскалация, а не параллельно. Поэтому здесь — последовательная цепочка,
// не разветвление, и родителя Hellcat нужно переставить на 392.
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

addNode({
  id: 'dodge-durango-srt-392', label: 'Durango SRT 392', fullName: 'Dodge Durango SRT 392',
  type: 'generation', year: 2018,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'WD SRT 392',
  modelSlug: 'dodge-durango', bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
  hp: 475, engineType: 'v8', engineCC: 6400,
  note: 'Первый по-настоящему высокопроизводительный Durango — 6.4L HEMI, 475 л.с. Hellcat (2021) вышел позже как ДАЛЬНЕЙШАЯ эскалация этого трима, не одновременный сиблинг (в отличие от Charger/Challenger, где 392 и Hellcat стартовали в один год).',
})
addEdge('e-durango3-392', 'dodge-durango-gen3', 'dodge-durango-srt-392', 'variant_of')
retargetSource('e-durango-g3-srt', 'dodge-durango-srt-392')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
