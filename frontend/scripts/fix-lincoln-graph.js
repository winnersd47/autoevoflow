'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const g          = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))
const existingIds = new Set(g.nodes.map(n => n.id))

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addNode(node) {
  if (existingIds.has(node.id)) { console.log('  = skip:', node.id); return false }
  g.nodes.push(node)
  existingIds.add(node.id)
  console.log('  + node:', node.id, '|', node.label)
  return true
}
function addEdge(e) {
  if (g.edges.some(x => x.source === e.source && x.target === e.target)) {
    console.log('  = skip edge:', e.source, '->', e.target); return false
  }
  if (!existingIds.has(e.source)) { console.log('  ✗ src missing:', e.source); return false }
  if (!existingIds.has(e.target)) { console.log('  ✗ tgt missing:', e.target); return false }
  g.edges.push(e)
  console.log('  + edge:', e.source.replace('lincoln-',''), '-['+e.type+']->', e.target.replace('lincoln-',''))
  return true
}
function fixEdge(src, tgt, newType) {
  const e = g.edges.find(x => x.source === src && x.target === tgt)
  if (e) { console.log('  ~ edge type:', src.replace('lincoln-',''), e.type, '→', newType); e.type = newType; return true }
  console.log('  ✗ edge not found:', src, '->', tgt); return false
}
function removeEdge(src, tgt) {
  const i = g.edges.findIndex(x => x.source === src && x.target === tgt)
  if (i !== -1) { g.edges.splice(i, 1); console.log('  - removed:', src.replace('lincoln-',''), '->', tgt.replace('lincoln-','')); return true }
  console.log('  ✗ not found:', src, '->', tgt); return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Label fixes — strip "Lincoln " prefix and "(year)" suffix
// ═══════════════════════════════════════════════════════════════════════════════
const LABEL_MAP = {
  'lincoln-mark2':          'Continental Mark II',
  'lincoln-continental-1':  'Continental Gen.1',
  'lincoln-mark5':          'Continental Mark V',
  'lincoln-town-car':       'Town Car',
  'lincoln-navigator-1':    'Navigator Gen.1',
  'lincoln-ls-1':           'LS Gen.1',
  'lincoln-aviator-1':      'Aviator Gen.1',
  'lincoln-mkz-1':          'MKZ Gen.1',
  'lincoln-continental-6':  'Continental Gen.6',
  'lincoln-navigator-4':    'Navigator Gen.4',
}

let fixed = 0
for (const node of g.nodes) {
  if (LABEL_MAP[node.id]) {
    console.log('label:', JSON.stringify(node.label), '→', LABEL_MAP[node.id])
    node.label = LABEL_MAP[node.id]
    fixed++
  }
}
console.log('Labels fixed:', fixed)

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Fix inspired_by direction errors
// Rule: inspired_by = source was inspired BY target (arrow points newer→older).
//       When older model points to newer with inspired_by it means impossible time travel.
//       Fix: change to "inspired" (older inspired newer).
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Edge direction fixes]')
// 1961 Continental Gen1 → 2017 Continental Gen6 (old inspired new)
fixEdge('lincoln-continental-1', 'lincoln-continental-6', 'inspired')
// 1977 Mark V → 1981 Town Car (Mark V luxury DNA influenced Town Car)
fixEdge('lincoln-mark5',        'lincoln-town-car',      'inspired')
// 1981 Town Car → 2006 MKZ (Town Car as Lincoln flagship inspired MKZ)
fixEdge('lincoln-town-car',     'lincoln-mkz-1',         'inspired')
// 1997 Navigator Gen1 → 2003 Aviator Gen1 (Navigator concept spawned Aviator SUV line)
fixEdge('lincoln-navigator-1',  'lincoln-aviator-1',     'inspired')

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Add Mark III and Mark IV (missing middle of the personal-luxury coupe chain)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Continental Mark series]')
addNode({ id: 'lincoln-mark3', label: 'Continental Mark III', type: 'generation', year: 1968, brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'lincoln-mark', bodyType: 'coupe', segment: 'personal_luxury', zone: 'luxury', hp: 365, engineType: 'petrol_v8' })
addNode({ id: 'lincoln-mark4', label: 'Continental Mark IV', type: 'generation', year: 1972, brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'lincoln-mark', bodyType: 'coupe', segment: 'personal_luxury', zone: 'luxury', hp: 219, engineType: 'petrol_v8' })

// Rewire: Mark II → Mark III → Mark IV → Mark V  (was Mark II → Mark V)
removeEdge('lincoln-mark2', 'lincoln-mark5')
addEdge({ id: 'e-mark2-3',  source: 'lincoln-mark2', target: 'lincoln-mark3', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-mark3-4',  source: 'lincoln-mark3', target: 'lincoln-mark4', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-mark4-5',  source: 'lincoln-mark4', target: 'lincoln-mark5', type: 'evolves_into', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Add Navigator Gen2 and Gen3 (was jumping Gen1 → Gen4)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Navigator chain]')
addNode({ id: 'lincoln-navigator-2', label: 'Navigator Gen.2', type: 'generation', year: 2003, brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'navigator', bodyType: 'suv', segment: 'large_suv', zone: 'luxury', hp: 300, engineType: 'petrol_v8' })
addNode({ id: 'lincoln-navigator-3', label: 'Navigator Gen.3', type: 'generation', year: 2007, brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'navigator', bodyType: 'suv', segment: 'large_suv', zone: 'luxury', hp: 310, engineType: 'petrol_v8' })

removeEdge('lincoln-navigator-1', 'lincoln-navigator-4')
addEdge({ id: 'e-nav-1-2', source: 'lincoln-navigator-1', target: 'lincoln-navigator-2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-nav-2-3', source: 'lincoln-navigator-2', target: 'lincoln-navigator-3', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-nav-3-4', source: 'lincoln-navigator-3', target: 'lincoln-navigator-4', type: 'evolves_into', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Add MKZ Gen2
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[MKZ]')
addNode({ id: 'lincoln-mkz-2', label: 'MKZ Gen.2', type: 'generation', year: 2013, brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'mkz', bodyType: 'sedan', segment: 'midsize_luxury', zone: 'luxury', hp: 240, engineType: 'petrol_i4_turbo' })
addEdge({ id: 'e-mkz-1-2', source: 'lincoln-mkz-1', target: 'lincoln-mkz-2', type: 'evolves_into', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Add Aviator Gen2 (2020 revival)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Aviator]')
addNode({ id: 'lincoln-aviator-2', label: 'Aviator Gen.2', type: 'generation', year: 2020, brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'aviator', bodyType: 'suv', segment: 'midsize_luxury_suv', zone: 'luxury', hp: 400, engineType: 'petrol_v6_turbo' })
// Gen1 discontinued 2005, Gen2 is a revival — "inspired" rather than direct evolution
addEdge({ id: 'e-aviator-1-2', source: 'lincoln-aviator-1', target: 'lincoln-aviator-2', type: 'inspired', strength: 0.75 })

// ═══════════════════════════════════════════════════════════════════════════════
// Save
// ═══════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
