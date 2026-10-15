#!/usr/bin/env node
// Точечная правка: Viper ZB (2003) -> evolves_into -> Viper VX (2013) — 10 лет,
// одно ребро, тот же паттерн, что уже чинили у Challenger '08->'15 и
// merc-sl-r129 -> -fl. Реальный фейслифт был в 2008: тот же кузов ZB, но
// расточенный до 8.4L V10 (600 л.с. вместо 500), обновлённая внешность —
// традиционно называется ZB2 / "Gen4".
//
// Заодно: у самой Viper ZB engineCC=7994 (≈8.0L) противоречит её же note
// ("8.3L 500 л.с.") — реальный объём Gen3 Viper V10 8285cc (8.3L). Правим.
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

console.log('── Фикс engineCC у Viper ZB (7994 -> 8285, соответствует note "8.3L") ──')
byId['dodge-viper-gen3-srt10'].engineCC = 8285
console.log('FIX  dodge-viper-gen3-srt10: engineCC 7994 -> 8285')

console.log('\n── Viper ZB II (2008) — недостающий фейслифт ──')
addNode({
  id: 'dodge-viper-zb2', label: 'Viper ZB II', fullName: 'Dodge Viper SRT-10 (ZB II)',
  type: 'generation', year: 2008,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'SR III / SRT-10 II',
  modelSlug: 'dodge-viper', bodyType: 'roadster', segment: 'supercar', zone: 'supercar',
  hp: 600, engineType: 'v10', engineCC: 8390,
  note: 'Тот же кузов ZB, расточен до 8.4L (600 л.с. вместо 500) — обычно считается фейслифтом/Gen4, не отдельной генерацией.',
})
addEdge('e-viper-zb-zb2', 'dodge-viper-gen3-srt10', 'dodge-viper-zb2', 'facelifted_to')
retargetSource('viper-g3-g5', 'dodge-viper-zb2')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
