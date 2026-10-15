#!/usr/bin/env node
// Тот же аудит, что для Dodge, применён к Jeep и Chrysler:
//  1. Grand Cherokee WL (2022) был неверно закодирован codeName="Trackhawk" —
//     Trackhawk принадлежит WK2 (2018-2021), а не WL. У WK2 при этом не было
//     ни SRT8, ни Trackhawk узлов вообще — тот же пробел, что чинили у Dodge.
//  2. Wrangler Rubicon 392 (2021, 470hp 6.4L HEMI) отсутствовал целиком.
//  3. Chrysler 300 — тот же LX->LD сплит, что у Charger (2004/2005 LX,
//     2011 LD), но графе всего одна нода "Chrysler 300 (2004)", и SRT8
//     (2012, явно LD-спек) висел прямо на ней — тот же пробел, что был у
//     Charger до сегодняшних правок.
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

console.log('── 1. Grand Cherokee WK2: SRT8 + Trackhawk, фикс мисс-лейбла на WL ──')
const wl = byId['jeep-grand-cherokee-wl']
console.log(`FIX  jeep-grand-cherokee-wl: codeName "${wl.codeName}" -> убран (Trackhawk принадлежит WK2, не WL)`)
delete wl.codeName

addNode({
  id: 'jeep-grand-cherokee-wk2-srt8', label: 'Grand Cherokee SRT8', fullName: 'Jeep Grand Cherokee SRT8',
  type: 'generation', year: 2012,
  brandId: 'jeep', brandName: 'Jeep', codeName: 'WK2 SRT8',
  modelSlug: 'jeep-grand-cherokee-wk2', bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
  hp: 470, engineType: 'v8', engineCC: 6400,
  note: 'Первый SRT-Grand Cherokee; топ-трим WK2 до появления Trackhawk в 2018-м.',
})
addEdge('e-wk2-srt8', 'jeep-grand-cherokee-wk2', 'jeep-grand-cherokee-wk2-srt8', 'variant_of')

addNode({
  id: 'jeep-grand-cherokee-wk2-trackhawk', label: 'Grand Cherokee Trackhawk', fullName: 'Jeep Grand Cherokee Trackhawk',
  type: 'generation', year: 2018,
  brandId: 'jeep', brandName: 'Jeep', codeName: 'WK2 Trackhawk',
  modelSlug: 'jeep-grand-cherokee-wk2', bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
  hp: 707, engineType: 'v8s', engineCC: 6162,
  note: 'Тот же 6.2L supercharged HEMI, что у Hellcat — самый мощный Grand Cherokee до 2018 года, эскалация от SRT8.',
})
addEdge('e-wk2-srt8-trackhawk', 'jeep-grand-cherokee-wk2-srt8', 'jeep-grand-cherokee-wk2-trackhawk', 'variant_of')

console.log('\n── 2. Wrangler Rubicon 392 (2021) ──')
addNode({
  id: 'jeep-wrangler-rubicon-392', label: 'Wrangler Rubicon 392', fullName: 'Jeep Wrangler Rubicon 392',
  type: 'generation', year: 2021,
  brandId: 'jeep', brandName: 'Jeep', codeName: 'JL Rubicon 392',
  modelSlug: 'jeep-wrangler-jl', bodyType: 'suv', segment: 'offroad', zone: 'offroad',
  hp: 470, engineType: 'v8', engineCC: 6400, isLimited: true,
  note: '6.4L HEMI V8 — впервые V8 в Wrangler за десятилетия; ограниченный тираж, финальное издание в 2025-м.',
})
addEdge('e-wranglerjl-392', 'jeep-wrangler-jl', 'jeep-wrangler-rubicon-392', 'variant_of')

console.log('\n── 3. Chrysler 300: LX -> LD сплит (тот же паттерн, что Charger) ──')
addNode({
  id: 'chrysler-300-ld', label: 'Chrysler 300 (LD)', fullName: 'Chrysler 300',
  type: 'generation', year: 2011,
  brandId: 'chrysler', brandName: 'Chrysler', codeName: 'LD Chrysler 300',
  modelSlug: 'chrysler-300', bodyType: 'sedan', segment: 'full-size', zone: 'gt_coupe',
  hp: 292, engineType: 'v6',
  note: 'Второе поколение (LD-платформа) — тот же переход, что у Charger LX->LD в 2011-м.',
})
addEdge('e-chrysler300-lx-ld', 'chrysler-300-lx', 'chrysler-300-ld', 'evolves_into')
retargetSource('e-chr-300lx-srt8', 'chrysler-300-ld')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
