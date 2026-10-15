#!/usr/bin/env node
// Продолжение аудита пустот Pontiac: Bonneville, Catalina, Tempest, Sunbird/
// Sunfire/G5, Aztek, Vibe, Torrent, 6000 — целые модели отсутствовали.
// Tempest -> derived_from -> GTO: GTO реально начинался как перформанс-пакет
// Tempest в 1964-м, потом стал отдельной моделью — тот же паттерн, что
// Cayman/Boxster и Gladiator/Wrangler (общая платформа, свой нейминг).
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

console.log('── Bonneville (1957 оригинал + SSEi 1992) ──')
addNode({ id: 'pontiac-bonneville-1957', label: 'Bonneville', fullName: 'Pontiac Bonneville',
  type: 'generation', year: 1957, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'Fuel Injection',
  modelSlug: 'pontiac-bonneville', bodyType: 'convertible', segment: 'full-size', zone: 'gt_coupe',
  hp: 310, engineType: 'v8',
  note: 'Первый в мире серийный V8 с механическим впрыском топлива (Rochester); всего 630 экз. в 1957-м.' })
addNode({ id: 'pontiac-bonneville-ssei', label: 'Bonneville SSEi', fullName: 'Pontiac Bonneville SSEi',
  type: 'generation', year: 1992, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'H-body SSEi',
  modelSlug: 'pontiac-bonneville', bodyType: 'sedan', segment: 'full-size', zone: 'gt_coupe',
  hp: 240, engineType: 'v6s',
  note: 'Наддувный 3.8L V6 — топ-трим последних поколений (до 2005-го, конца модели).' })
addEdge('e-bonn57-ssei92', 'pontiac-bonneville-1957', 'pontiac-bonneville-ssei', 'evolves_into', { strength: 0.55 })

console.log('\n── Catalina (1959) ──')
addNode({ id: 'pontiac-catalina-1959', label: 'Catalina', fullName: 'Pontiac Catalina',
  type: 'generation', year: 1959, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'Wide-Track',
  modelSlug: 'pontiac-catalina', bodyType: 'sedan', segment: 'full-size', zone: 'gt_coupe',
  hp: 215, engineType: 'v8',
  note: 'Более доступный full-size, чем Bonneville; "Wide-Track" маркетинг определил дизайн Pontiac на десятилетие.' })

console.log('\n── Tempest (1961) -> derived_from -> GTO ──')
addNode({ id: 'pontiac-tempest-1961', label: 'Tempest', fullName: 'Pontiac Tempest',
  type: 'generation', year: 1961, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'Y-body',
  modelSlug: 'pontiac-tempest', bodyType: 'sedan', segment: 'compact', zone: 'compact_sed',
  hp: 110, engineType: 'i4',
  note: 'GTO родился в 1964-м как перформанс-пакет именно Tempest, только потом стал отдельной моделью.' })
addEdge('e-tempest-gto', 'pontiac-tempest-1961', 'pontiac-gto-1', 'derived_from')

console.log('\n── Sunbird(1976) -> Sunfire(1995) -> G5(2007) ──')
addNode({ id: 'pontiac-sunbird-1976', label: 'Sunbird', fullName: 'Pontiac Sunbird',
  type: 'generation', year: 1976, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'H-body',
  modelSlug: 'pontiac-sunbird', bodyType: 'coupe', segment: 'compact', zone: 'compact_sed',
  hp: 88, engineType: 'i4' })
addNode({ id: 'pontiac-sunfire-1995', label: 'Sunfire', fullName: 'Pontiac Sunfire',
  type: 'generation', year: 1995, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'J-body',
  modelSlug: 'pontiac-sunbird', bodyType: 'coupe', segment: 'compact', zone: 'compact_sed',
  hp: 150, engineType: 'i4' })
addNode({ id: 'pontiac-g5-2007', label: 'G5', fullName: 'Pontiac G5',
  type: 'generation', year: 2007, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'Delta',
  modelSlug: 'pontiac-sunbird', bodyType: 'coupe', segment: 'compact', zone: 'compact_sed',
  hp: 148, engineType: 'i4' })
addEdge('e-sunbird-sunfire', 'pontiac-sunbird-1976', 'pontiac-sunfire-1995', 'evolves_into')
addEdge('e-sunfire-g5', 'pontiac-sunfire-1995', 'pontiac-g5-2007', 'evolves_into')

console.log('\n── Aztek (2001) ──')
addNode({ id: 'pontiac-aztek-2001', label: 'Aztek', fullName: 'Pontiac Aztek',
  type: 'generation', year: 2001, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'U-body',
  modelSlug: 'pontiac-aztek', bodyType: 'crossover', segment: 'compact_suv', zone: 'suv_mid',
  hp: 185, engineType: 'v6',
  note: 'Печально известный дизайн при жизни, но культовый после "Breaking Bad" — машина Уолтера Уайта.' })

console.log('\n── Vibe (2002, NUMMI-близнец Toyota Matrix) ──')
addNode({ id: 'pontiac-vibe-2002', label: 'Vibe', fullName: 'Pontiac Vibe',
  type: 'generation', year: 2002, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'NUMMI',
  modelSlug: 'pontiac-vibe', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 130, engineType: 'i4',
  note: 'Инженерный близнец Toyota Matrix — совместное производство GM/Toyota на заводе NUMMI.' })

console.log('\n── Torrent (2005, близнец Chevrolet Equinox) ──')
addNode({ id: 'pontiac-torrent-2005', label: 'Torrent', fullName: 'Pontiac Torrent',
  type: 'generation', year: 2005, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'Theta',
  modelSlug: 'pontiac-torrent', bodyType: 'crossover', segment: 'compact_suv', zone: 'suv_mid',
  hp: 185, engineType: 'v6',
  note: 'Инженерный близнец Chevrolet Equinox на платформе Theta.' })

console.log('\n── 6000 (1982, A-body) ──')
addNode({ id: 'pontiac-6000-1982', label: '6000', fullName: 'Pontiac 6000',
  type: 'generation', year: 1982, brandId: 'pontiac', brandName: 'Pontiac', codeName: 'A-body',
  modelSlug: 'pontiac-6000', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 92, engineType: 'i4',
  note: 'A-body сиблинг Chevrolet Celebrity/Buick Century/Olds Ciera; STE-версия — первый Pontiac с полным приводом.' })

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
