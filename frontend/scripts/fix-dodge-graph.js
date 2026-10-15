'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))

// ─── 1. Fix existing Dodge labels (remove "Dodge " prefix, shorten long labels) ───
const LABEL_MAP = {
  'dodge-challenger-1970':          "Challenger 1970",
  'dodge-challenger-gen3':          "Challenger Gen.3",
  'dodge-challenger-srt-hellcat':   "Challenger Hellcat",
  'dodge-challenger-srt-demon':     "Challenger Demon",
  'dodge-challenger-srt-super-stock': "Challenger S.Stock",
  'dodge-challenger-srt-demon-170': "Challenger Demon 170",
  'dodge-charger-1969':             "Charger 1969",
  'dodge-charger-srt8-2011':        "Charger SRT8",
  'dodge-charger-srt-hellcat':      "Charger Hellcat",
  'dodge-charger-daytona-ev':       "Charger Daytona EV",
  'dodge-d100-1961':                "D-100 1961",
  'dodge-dakota-1':                 "Dakota Gen.1",
  'dodge-dakota-2':                 "Dakota Gen.2",
  'dodge-dakota-3':                 "Dakota Gen.3",
  'dodge-durango-srt-hellcat':      "Durango Hellcat",
  'dodge-hornet-rt-phev':           "Hornet R/T PHEV",
  'dodge-hornet-gt':                "Hornet GT",
  'dodge-hornet-rt-glh':            "Hornet GLH",
  'dodge-power-wagon-2005':         "Power Wagon '05",
  'dodge-power-wagon-orig':         "Power Wagon 1945",
  'dodge-ram-1':                    "Ram Gen.1",
  'dodge-ram-2':                    "Ram Gen.2",
  'dodge-ram-3':                    "Ram Gen.3",
  'dodge-ram-hd-1':                 "Ram HD Gen.1",
  'dodge-ram-hd-2':                 "Ram HD Gen.2",
  'dodge-ram-srt10':                "Ram SRT-10",
  'dodge-viper-gen1':               "Viper RT/10",
  'dodge-viper-gen3-srt10':         "Viper SRT-10",
  'dodge-viper-gen5-srt':           "Viper SRT",
  'dodge-viper-acr':                "Viper ACR",
}

let labelFixed = 0
for (const node of g.nodes) {
  if (LABEL_MAP[node.id]) {
    node.label = LABEL_MAP[node.id]
    labelFixed++
  }
}
console.log('Labels fixed:', labelFixed)

// ─── 2. Add missing Viper Gen2 GTS (1996–2002) ───
const existingIds = new Set(g.nodes.map(n => n.id))
const existingEdgeKeys = new Set(g.edges.map(e => e.source + '→' + e.target))

function addNode(node) {
  if (existingIds.has(node.id)) { console.log('  = skip node (exists):', node.id); return false }
  g.nodes.push(node)
  existingIds.add(node.id)
  console.log('  + node:', node.id, '|', node.label)
  return true
}

function addEdge(edge) {
  const key = edge.source + '→' + edge.target
  if (existingEdgeKeys.has(key)) { console.log('  = skip edge (exists):', key); return false }
  if (!existingIds.has(edge.source)) { console.log('  ✗ edge source missing:', edge.source); return false }
  if (!existingIds.has(edge.target)) { console.log('  ✗ edge target missing:', edge.target); return false }
  g.edges.push(edge)
  existingEdgeKeys.add(key)
  console.log('  + edge:', edge.source, '->', edge.target, '|', edge.type)
  return true
}

// Viper Gen2 GTS
addNode({
  id: 'dodge-viper-gen2-gts',
  label: 'Viper GTS',
  type: 'generation',
  year: 1996,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-viper',
  bodyType: 'coupe',
  segment: 'sports_car',
  zone: 'performance',
  hp: 450,
  engineType: 'petrol_v10',
})

// ─── 3. Add full Durango lineage ───
addNode({
  id: 'dodge-durango-gen1',
  label: 'Durango Gen.1',
  type: 'generation',
  year: 1998,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-durango',
  bodyType: 'suv',
  segment: 'midsize_suv',
  zone: 'utility',
  hp: 250,
  engineType: 'petrol_v8',
})
addNode({
  id: 'dodge-durango-gen2',
  label: 'Durango Gen.2',
  type: 'generation',
  year: 2004,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-durango',
  bodyType: 'suv',
  segment: 'midsize_suv',
  zone: 'utility',
  hp: 340,
  engineType: 'petrol_v8',
})
addNode({
  id: 'dodge-durango-gen3',
  label: 'Durango Gen.3',
  type: 'generation',
  year: 2011,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-durango',
  bodyType: 'suv',
  segment: 'midsize_suv',
  zone: 'utility',
  hp: 293,
  engineType: 'petrol_v6',
})

// ─── 4. Add Dodge Neon (1994–2005) ───
addNode({
  id: 'dodge-neon-gen1',
  label: 'Neon Gen.1',
  type: 'generation',
  year: 1994,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-neon',
  bodyType: 'sedan',
  segment: 'compact',
  zone: 'mainstream',
  hp: 132,
  engineType: 'petrol_i4',
})
addNode({
  id: 'dodge-neon-gen2',
  label: 'Neon Gen.2',
  type: 'generation',
  year: 2000,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-neon',
  bodyType: 'sedan',
  segment: 'compact',
  zone: 'mainstream',
  hp: 150,
  engineType: 'petrol_i4',
})
addNode({
  id: 'dodge-neon-srt4',
  label: 'Neon SRT-4',
  type: 'generation',
  year: 2003,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-neon-srt',
  bodyType: 'sedan',
  segment: 'hot_hatch',
  zone: 'performance',
  hp: 230,
  engineType: 'petrol_i4_turbo',
})

// ─── 5. Add Dodge Dart 2013 ───
addNode({
  id: 'dodge-dart-2013',
  label: 'Dart 2013',
  type: 'generation',
  year: 2013,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-dart',
  bodyType: 'sedan',
  segment: 'compact',
  zone: 'mainstream',
  hp: 184,
  engineType: 'petrol_i4_turbo',
})

// ─── EDGES ───
// Fix Viper chain: Gen1 → Gen2 → Gen3 (remove old Gen1→Gen3 shortcut)
g.edges = g.edges.filter(e => !(e.source === 'dodge-viper-gen1' && e.target === 'dodge-viper-gen3-srt10'))
console.log('  - removed edge: dodge-viper-gen1 -> dodge-viper-gen3-srt10')
addEdge({ id: 'e-viper-g1-g2', source: 'dodge-viper-gen1', target: 'dodge-viper-gen2-gts', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-viper-g2-g3', source: 'dodge-viper-gen2-gts', target: 'dodge-viper-gen3-srt10', type: 'evolves_into', strength: 0.9 })

// Durango chain
addEdge({ id: 'e-durango-g1-g2', source: 'dodge-durango-gen1', target: 'dodge-durango-gen2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-durango-g2-g3', source: 'dodge-durango-gen2', target: 'dodge-durango-gen3', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-durango-g3-srt', source: 'dodge-durango-gen3', target: 'dodge-durango-srt-hellcat', type: 'evolves_into', strength: 0.9 })
// Cross-ref: Charger Hellcat inspired Durango Hellcat
// (already exists: dodge-charger-srt-hellcat -> dodge-durango-srt-hellcat | inspired)

// Neon chain
addEdge({ id: 'e-neon-g1-g2', source: 'dodge-neon-gen1', target: 'dodge-neon-gen2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-neon-g2-srt4', source: 'dodge-neon-gen2', target: 'dodge-neon-srt4', type: 'evolves_into', strength: 0.8 })
// Neon SRT-4 inspired by Challenger performance heritage
addEdge({ id: 'e-challenger-neon', source: 'dodge-neon-srt4', target: 'dodge-dart-2013', type: 'inspired', strength: 0.6 })

// Dart 2013 — compact successor lineage
addEdge({ id: 'e-dart-hornet', source: 'dodge-dart-2013', target: 'dodge-hornet-gt', type: 'inspired', strength: 0.7 })

// ─── Save ───
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
