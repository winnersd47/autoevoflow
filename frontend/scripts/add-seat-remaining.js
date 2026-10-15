#!/usr/bin/env node
// Дополнение SEAT: тот же аудит, что везде — 600 (основатель бренда), Ibiza
// Mk2/Mk4 (пропущены в цепочке Mk1->Mk3), Toledo (крупная линейка отсутствует
// целиком), Tarraco (текущая, продающаяся модель отсутствует целиком).
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

console.log('── SEAT 600 (1957) — машина-основатель бренда ──')
addNode({ id: 'seat-600', label: 'SEAT 600', fullName: 'SEAT 600',
  type: 'generation', year: 1957, brandId: 'seat', brandName: 'SEAT', codeName: 'Fiat 600 лицензия',
  modelSlug: 'seat-600', bodyType: 'hatchback', segment: 'microcar', zone: 'hatchback',
  hp: 22, engineType: 'i4',
  note: 'Первая массовая машина Испании — лицензионный Fiat 600; "600" буквально поставил страну на колёса.' })

console.log('\n── Ibiza Mk2 (1993) + Mk4 (2008) — заполняем разрыв Mk1->Mk3 ──')
addNode({ id: 'seat-ibiza-mk2', label: 'Ibiza Mk2', fullName: 'SEAT Ibiza Mk2',
  type: 'generation', year: 1993, brandId: 'seat', brandName: 'SEAT', codeName: '6K',
  modelSlug: 'seat-ibiza', bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 75, engineType: 'i4' })
addNode({ id: 'seat-ibiza-mk4', label: 'Ibiza Mk4', fullName: 'SEAT Ibiza Mk4',
  type: 'generation', year: 2008, brandId: 'seat', brandName: 'SEAT', codeName: '6J',
  modelSlug: 'seat-ibiza', bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 105, engineType: 'i4' })
const oldIbiza = g.edges.find(e => e.id === 'se-1')
g.edges = g.edges.filter(e => e.id !== 'se-1')
console.log('REMOVE se-1 (срезка Ibiza Mk1 -> Mk3)')
addEdge('e-ibiza-mk1-mk2', 'seat-ibiza-mk1', 'seat-ibiza-mk2', 'evolves_into')
addEdge('e-ibiza-mk2-mk3', 'seat-ibiza-mk2', 'seat-ibiza-mk3', 'evolves_into')
addEdge('e-ibiza-mk3-mk4', 'seat-ibiza-mk3', 'seat-ibiza-mk4', 'evolves_into')
addEdge('e-ibiza-mk4-mk5', 'seat-ibiza-mk4', 'seat-ibiza-mk5', 'evolves_into')

console.log('\n── Toledo (1991, возрождение 2012) ──')
addNode({ id: 'seat-toledo-mk1', label: 'Toledo Mk1', fullName: 'SEAT Toledo Mk1',
  type: 'generation', year: 1991, brandId: 'seat', brandName: 'SEAT', codeName: '1L',
  modelSlug: 'seat-toledo', bodyType: 'sedan', segment: 'compact', zone: 'compact_sed',
  hp: 90, engineType: 'i4',
  note: 'Первая полностью VW-Group-разработанная модель SEAT — платформа Golf Mk2/Passat.' })
addNode({ id: 'seat-toledo-2012', label: 'Toledo (2012)', fullName: 'SEAT Toledo',
  type: 'generation', year: 2012, brandId: 'seat', brandName: 'SEAT', codeName: 'NH (MQB)',
  modelSlug: 'seat-toledo', bodyType: 'sedan', segment: 'compact', zone: 'compact_sed',
  hp: 105, engineType: 'i4',
  note: 'Возрождение имени после 3-летнего перерыва (2009-2012); снят с производства в 2019-м окончательно.' })
addEdge('e-toledo1-2012', 'seat-toledo-mk1', 'seat-toledo-2012', 'inspired', { strength: 0.6 })

console.log('\n── Tarraco (2018) — текущая модель, отсутствовала целиком ──')
addNode({ id: 'seat-tarraco', label: 'SEAT Tarraco', fullName: 'SEAT Tarraco',
  type: 'generation', year: 2018, brandId: 'seat', brandName: 'SEAT', codeName: 'KH (MQB)',
  modelSlug: 'seat-tarraco', bodyType: 'suv', segment: 'midsize_suv', zone: 'suv_mid',
  hp: 190, engineType: 'i4t',
  note: 'Флагманский 7-местный SUV SEAT; общая платформа с Ateca/Tiguan.' })
addEdge('e-ateca-tarraco', 'seat-ateca', 'seat-tarraco', 'inspired_by', { strength: 0.65 })

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
