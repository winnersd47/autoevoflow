#!/usr/bin/env node
// Точечная правка: пользователь заметил, что перед EV-поколением было ДВА
// поколения седана, а не одно. Проверка подтвердила: существующие "Charger
// R/T" (2006, codeName "LX Charger R/T") и "Charger SRT8" (2011, codeName
// "LD Charger SRT8") УЖЕ были правильно датированы как разные платформы
// (LX 2006-2010 и LD 2011-2023, отдельные, официально различаемые Dodge
// поколения) — но были соединены variant_of так, будто это один и тот же
// трим-ряд одного поколения. Добавляем недостающую базу LD (её место в
// цепочке занимал сам SRT8, хотя SRT8 всегда был верхним тримом, не базой —
// та же ошибка, что раньше нашли и исправили для 2011 vs 2015/2021).
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

// Уточняем label существующей LX-ноды для однозначности на графе
byId['dodge-charger-rt-lx'].label = 'Charger R/T (LX)'
console.log('FIX  dodge-charger-rt-lx: label -> "Charger R/T (LX)"')

console.log('\n── Charger R/T (LD, 2011) — недостающая база следующего поколения ──')
addNode({
  id: 'dodge-charger-rt-ld', label: 'Charger R/T (LD)', fullName: 'Dodge Charger R/T',
  type: 'generation', year: 2011,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LD Charger R/T',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 370, engineType: 'v8', engineCC: 5700,
  note: '5.7L HEMI, обновлённый под LD; настоящая база поколения 2011–2023 — SRT8/Hellcat/Redeye выросли из него, а не наоборот.',
})

addEdge('e-chargerrt-lx-ld', 'dodge-charger-rt-lx', 'dodge-charger-rt-ld', 'evolves_into')
retargetSource('e-chargerrt-srt8', 'dodge-charger-rt-ld')
retargetSource('charger-hellcat-ev', 'dodge-charger-rt-ld')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
