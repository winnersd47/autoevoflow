#!/usr/bin/env node
// Точечное добавление по запросу: у LX-поколения (2006-2010) была только
// голая база "Charger R/T (LX)" без собственной трим-лестницы, хотя у LD
// (2011-2023) уже есть полная SRT8 -> Hellcat -> Redeye. Реальные тримы LX:
//   - SRT8 (2006): 6.1L HEMI 425 л.с. — ДРУГОЙ мотор, чем у LD SRT8 (470 л.с.
//     6.4L) — это не дубль, а честно отдельный трим отдельного поколения.
//   - SRT8 Super Bee (2007): лимитированное издание на базе SRT8 — реальное
//     историческое звено имени Super Bee МЕЖДУ оригиналом 1968 года и
//     нынешним возрождением 2027 года, которое раньше в графе отсутствовало.
//   - Daytona R/T (2006): апперанс-пакет на базе R/T — тематически предвещает
//     имя "Charger Daytona EV" нового поколения.
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
  addedE++
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}
let addedE = 0

console.log('── Charger SRT8 (LX, 2006) ──')
addNode({
  id: 'dodge-charger-srt8-lx', label: 'Charger SRT8 (LX)', fullName: 'Dodge Charger SRT8',
  type: 'generation', year: 2006,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LX Charger SRT8',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 425, engineType: 'v8', engineCC: 6100,
  note: '6.1L HEMI, 425 л.с. — другой мотор, чем у LD SRT8 (470 л.с. 6.4L); первый Charger SRT вообще.',
})
addEdge('e-chargerrt-lx-srt8lx', 'dodge-charger-rt-lx', 'dodge-charger-srt8-lx', 'variant_of')

console.log('\n── Charger SRT8 Super Bee (2007) — звено между 1968 и 2027 ──')
addNode({
  id: 'dodge-charger-srt8-super-bee-2007', label: 'Charger SRT8 Super Bee', fullName: 'Dodge Charger SRT8 Super Bee',
  type: 'generation', year: 2007,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LX SRT8 Super Bee',
  modelSlug: 'dodge-super-bee', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 425, engineType: 'v8', engineCC: 6100, isLimited: true,
  note: 'Лимитированное издание на базе SRT8, чёрно-оранжевая ливрея в честь оригинала 1968 года.',
})
addEdge('e-srt8lx-superbee07', 'dodge-charger-srt8-lx', 'dodge-charger-srt8-super-bee-2007', 'variant_of')
addEdge('e-superbee68-superbee07', 'dodge-coronet-super-bee-1968', 'dodge-charger-srt8-super-bee-2007', 'inspired')

console.log('\n── Charger Daytona R/T (2006) — предвестник имени "Daytona EV" ──')
addNode({
  id: 'dodge-charger-daytona-rt-2006', label: 'Charger Daytona R/T', fullName: 'Dodge Charger Daytona R/T',
  type: 'generation', year: 2006,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LX Daytona R/T',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 340, engineType: 'v8', engineCC: 5700, isLimited: true,
  note: 'Апперанс-пакет на базе R/T (те же 340 л.с.) — то же имя "Daytona", что нынешний Charger Daytona EV возьмёт себе поколением позже.',
})
addEdge('e-chargerrt-lx-daytona06', 'dodge-charger-rt-lx', 'dodge-charger-daytona-rt-2006', 'variant_of')

console.log(`\nAdded ${addedE} edges.`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
