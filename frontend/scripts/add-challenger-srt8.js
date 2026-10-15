#!/usr/bin/env node
// Точечное добавление: копая тему SRT глубже (по запросу "и всё, одна модель?"),
// нашёлся структурный, а не именной пробел — у Challenger вообще не было
// SRT8 (2011-2014, 6.4L 470 л.с. — тот же мотор, что у Charger SRT8 LD).
// Цепочка шла прямо '08 -> фейслифт '15 -> Hellcat, будто до Hellcat у
// Challenger вообще не было топ-трима. SRT8 существовал ТОЛЬКО на
// до-фейслифтовом кузове (2011-2014) — Hellcat заменил его собой ровно в
// момент фейслифта 2015-го, поэтому variant_of именно от '08, не от '15.
// Chrysler 300 SRT8 (2012) уже в графе и уже верно с "Chrysler" в имени —
// не трогаем, это подтверждает, что только Viper сбросил бренд-имя.
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

addNode({
  id: 'dodge-challenger-srt8', label: 'Challenger SRT8', fullName: 'Dodge Challenger SRT8',
  type: 'generation', year: 2011,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LC SRT8',
  modelSlug: 'dodge-challenger-srt', bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
  hp: 470, engineType: 'v8', engineCC: 6400,
  note: '6.4L HEMI, тот же мотор, что у Charger SRT8 (LD); топ-трим 2011-2014 на ДО-фейслифтовом кузове — Hellcat заменил его собой ровно в 2015-м, вместе с фейслифтом.',
})
addEdge('e-challenger08-srt8', 'dodge-challenger-gen3', 'dodge-challenger-srt8', 'variant_of')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
