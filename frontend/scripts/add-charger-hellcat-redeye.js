#!/usr/bin/env node
// Точечное добавление: аудит связей dodge-charger-srt8-2011 (по запросу
// пользователя) показал, что у самой SRT8 всё верно (inspired от B-body,
// variant_of на Hellcat, shares_platform с Chrysler 300), но у следующего
// трима — Charger Hellcat — не хватает ЕГО СОБСТВЕННОЙ модификации: во всём
// графе нет ни одного узла "Redeye" (проверено поиском по всем брендам).
// Charger SRT Hellcat Redeye (2021) — реальный, отдельно именованный трим
// выше базового Hellcat: тот же 6.2L supercharged HEMI, но 797 л.с. вместо 707.
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
  id: 'dodge-charger-srt-hellcat-redeye', label: 'Charger Hellcat Redeye', fullName: 'Dodge Charger SRT Hellcat Redeye',
  type: 'generation', year: 2021,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LD Hellcat Redeye',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 797, engineType: 'v8s', engineCC: 6162,
  note: 'Тот же 6.2L supercharged HEMI, что у базового Hellcat, но 797 л.с. вместо 707 — топ-трим седана LD-поколения.',
})
addEdge('e-hellcat-redeye', 'dodge-charger-srt-hellcat', 'dodge-charger-srt-hellcat-redeye', 'variant_of')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
