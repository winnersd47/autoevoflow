'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))
const existingIds = new Set(g.nodes.map(n => n.id))

// ─── 1. Fix labels ───────────────────────────────────────────────────────────
const LABEL_MAP = {
  // Remove "Chevrolet" prefix and year parentheses
  'chev-impala-1':       'Impala Gen.1',
  'chev-k5-blazer':      'K5 Blazer',
  'chev-tahoe-1':        'Tahoe Gen.1',
  'chev-trailblazer':    'TrailBlazer',
  'chevy-malibu-7':      'Malibu Gen.7',
  'chev-impala-9':       'Impala Gen.9',
  'chev-bolt-1':         'Bolt EV Gen.1',
  'chev-silverado-4':    'Silverado Gen.4',
  'chev-blazer-2019':    'Blazer 2019',
  'chev-tahoe-5':        'Tahoe Gen.5',
  'chev-blazer-ev':      'Blazer EV',
  'chev-bolt-2':         'Bolt EV Gen.2',
  'chev-silverado-5':    'Silverado Gen.5',
  'chevy-camaro-gen2':   'Camaro Gen.2',
  'chevy-camaro-gen3':   'Camaro Gen.3',
  'chevy-camaro-gen4':   'Camaro Gen.4',
  // Corvette — remove "Stingray" nickname from base generation nodes (variant info, too long)
  'chevy-corvette-c2':   'Corvette C2',
  'chevy-corvette-c3':   'Corvette C3',
  'chevy-corvette-c7':   'Corvette C7',
  'chevy-corvette-c8':   'Corvette C8',
}

let labelFixed = 0
for (const node of g.nodes) {
  if (LABEL_MAP[node.id]) {
    console.log('label:', node.label, '→', LABEL_MAP[node.id])
    node.label = LABEL_MAP[node.id]
    labelFixed++
  }
}
console.log('Labels fixed:', labelFixed, '\n')

// ─── 2. Fix inspired_by edge direction bugs ─────────────────────────────────
// Rule: inspired_by means SOURCE was inspired BY TARGET (i.e. arrow backward in time).
// When an old model points to a newer one with inspired_by it means "old was inspired by new" — WRONG.
// Fix: change to "inspired" (old inspired new, forward in time).
const EDGE_TYPE_FIXES = [
  // Chevy — old → new, should be "inspired" (source inspired target)
  ['chevy-camaro-gen4',         'chevy-camaro-gen5',         'inspired_by', 'inspired'],
  ['chev-impala-1',             'chev-impala-9',             'inspired_by', 'inspired'],
  ['chev-k5-blazer',            'chev-trailblazer',          'inspired_by', 'inspired'],
  ['chev-trailblazer',          'chev-blazer-2019',          'inspired_by', 'inspired'],
  ['chev-tahoe-1',              'cadillac-escalade-1',       'inspired_by', 'inspired'],
  ['chev-tahoe-5',              'cadillac-escalade-5',       'inspired_by', 'inspired'],
  ['pontiac-g8-gt',             'chevy-camaro-gen6',         'inspired_by', 'inspired'],
  // Silverado ↔ GMC Sierra — twins on same platform, not inspiration
  ['chev-silverado-4',          'gmc-sierra-4',              'inspired_by', 'shares_platform'],
  // Dodge (same bug pattern)
  ['dodge-ram-1',               'dodge-dakota-1',            'inspired_by', 'inspired'],
  ['dodge-power-wagon-orig',    'dodge-power-wagon-2005',    'inspired_by', 'inspired'],
]

let edgeFixed = 0
for (const [src, tgt, fromType, toType] of EDGE_TYPE_FIXES) {
  const edge = g.edges.find(e => e.source === src && e.target === tgt)
  if (edge) {
    console.log('edge:', src.split('-').pop(), '->', tgt.split('-').pop(), '|', edge.type, '→', toType)
    edge.type = toType
    edgeFixed++
  } else {
    console.log('NOT FOUND:', src, '->', tgt)
  }
}
console.log('Edges fixed:', edgeFixed, '\n')

// ─── 3. Remove duplicate C3→C5 edge (correct path goes C3→C4→C5) ───────────
const dupIdx = g.edges.findIndex(e => e.source === 'chevy-corvette-c3' && e.target === 'chevy-corvette-c5')
if (dupIdx !== -1) {
  g.edges.splice(dupIdx, 1)
  console.log('- removed duplicate edge: corvette-c3 → corvette-c5\n')
}

// ─── 4. Remove too-long Tahoe jump (Gen1→Gen5, 3 gens skipped) ──────────────
const tahoeJumpIdx = g.edges.findIndex(e => e.source === 'chev-tahoe-1' && e.target === 'chev-tahoe-5')
if (tahoeJumpIdx !== -1) {
  g.edges.splice(tahoeJumpIdx, 1)
  console.log('- removed edge: tahoe-gen1 → tahoe-gen5 (will reconnect through Gen2/3/4)\n')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addNode(node) {
  if (existingIds.has(node.id)) { console.log('  = skip (exists):', node.id); return false }
  g.nodes.push(node)
  existingIds.add(node.id)
  console.log('  + node:', node.id, '|', node.label)
  return true
}
function addEdge(edge) {
  if (g.edges.some(e => e.source === edge.source && e.target === edge.target)) {
    console.log('  = skip edge (exists):', edge.source.split('-').slice(-2).join('-'), '->', edge.target.split('-').slice(-2).join('-'))
    return false
  }
  if (!existingIds.has(edge.source)) { console.log('  ✗ source missing:', edge.source); return false }
  if (!existingIds.has(edge.target)) { console.log('  ✗ target missing:', edge.target); return false }
  g.edges.push(edge)
  console.log('  + edge:', edge.source.split('-').slice(-2).join('-'), '-['+edge.type+']->', edge.target.split('-').slice(-2).join('-'))
  return true
}

// ─── 5. Add Tahoe Gen2, Gen3, Gen4 ──────────────────────────────────────────
console.log('\n--- Tahoe ---')
addNode({ id: 'chev-tahoe-2', label: 'Tahoe Gen.2', type: 'generation', year: 2000, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'tahoe', bodyType: 'suv', segment: 'large_suv', zone: 'utility', hp: 285, engineType: 'petrol_v8' })
addNode({ id: 'chev-tahoe-3', label: 'Tahoe Gen.3', type: 'generation', year: 2007, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'tahoe', bodyType: 'suv', segment: 'large_suv', zone: 'utility', hp: 320, engineType: 'petrol_v8' })
addNode({ id: 'chev-tahoe-4', label: 'Tahoe Gen.4', type: 'generation', year: 2015, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'tahoe', bodyType: 'suv', segment: 'large_suv', zone: 'utility', hp: 355, engineType: 'petrol_v8' })

addEdge({ id: 'e-tahoe-1-2', source: 'chev-tahoe-1', target: 'chev-tahoe-2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-tahoe-2-3', source: 'chev-tahoe-2', target: 'chev-tahoe-3', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-tahoe-3-4', source: 'chev-tahoe-3', target: 'chev-tahoe-4', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-tahoe-4-5', source: 'chev-tahoe-4', target: 'chev-tahoe-5', type: 'evolves_into', strength: 0.9 })
// Cross-brand: Tahoe → Escalade (same platform, both years)
addEdge({ id: 'e-tahoe2-escalade1', source: 'chev-tahoe-1', target: 'cadillac-escalade-1', type: 'inspired', strength: 0.7 })

// ─── 6. Add Silverado Gen1, Gen2, Gen3 ──────────────────────────────────────
console.log('\n--- Silverado ---')
addNode({ id: 'chev-silverado-1', label: 'Silverado Gen.1', type: 'generation', year: 1999, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'silverado', bodyType: 'pickup', segment: 'full_size_truck', zone: 'utility', hp: 255, engineType: 'petrol_v8' })
addNode({ id: 'chev-silverado-2', label: 'Silverado Gen.2', type: 'generation', year: 2007, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'silverado', bodyType: 'pickup', segment: 'full_size_truck', zone: 'utility', hp: 315, engineType: 'petrol_v8' })
addNode({ id: 'chev-silverado-3', label: 'Silverado Gen.3', type: 'generation', year: 2014, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'silverado', bodyType: 'pickup', segment: 'full_size_truck', zone: 'utility', hp: 355, engineType: 'petrol_v8' })

addEdge({ id: 'e-silverado-1-2', source: 'chev-silverado-1', target: 'chev-silverado-2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-silverado-2-3', source: 'chev-silverado-2', target: 'chev-silverado-3', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-silverado-3-4', source: 'chev-silverado-3', target: 'chev-silverado-4', type: 'evolves_into', strength: 0.9 })
// Silverado shares platform with GMC Sierra across generations
addEdge({ id: 'e-silverado3-sierra3', source: 'chev-silverado-3', target: 'gmc-sierra-3', type: 'shares_platform', strength: 0.95 })

// ─── 7. Add Camaro SS variants (Gen5 and Gen6) ───────────────────────────────
console.log('\n--- Camaro SS ---')
addNode({ id: 'chevy-camaro-gen5-ss', label: 'Camaro SS', type: 'generation', year: 2010, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'camaro-ss', bodyType: 'coupe', segment: 'muscle_car', zone: 'performance', hp: 426, engineType: 'petrol_v8' })
addNode({ id: 'chevy-camaro-gen6-ss', label: 'Camaro SS', type: 'generation', year: 2016, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'camaro-ss', bodyType: 'coupe', segment: 'muscle_car', zone: 'performance', hp: 455, engineType: 'petrol_v8' })

addEdge({ id: 'e-camaro5-ss', source: 'chevy-camaro-gen5', target: 'chevy-camaro-gen5-ss', type: 'variant_of', strength: 0.9 })
addEdge({ id: 'e-camaro6-ss', source: 'chevy-camaro-gen6', target: 'chevy-camaro-gen6-ss', type: 'variant_of', strength: 0.9 })
// SS → ZL1 (ZL1 is the extreme performance escalation of SS heritage)
addEdge({ id: 'e-camaro5ss-6ss', source: 'chevy-camaro-gen5-ss', target: 'chevy-camaro-gen6-ss', type: 'evolves_into', strength: 0.85 })

// ─── 8. Add Corvette C7 Grand Sport ─────────────────────────────────────────
console.log('\n--- Corvette Grand Sport ---')
addNode({ id: 'chevy-corvette-c7-gs', label: 'C7 Grand Sport', type: 'generation', year: 2017, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'corvette-gs', bodyType: 'coupe', segment: 'sports_car', zone: 'performance', hp: 460, engineType: 'petrol_v8' })
addNode({ id: 'chevy-corvette-c8-gs', label: 'C8 Grand Sport', type: 'generation', year: 2024, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'corvette-gs', bodyType: 'coupe', segment: 'sports_car', zone: 'performance', hp: 495, engineType: 'petrol_v8' })

addEdge({ id: 'e-c7-gs', source: 'chevy-corvette-c7', target: 'chevy-corvette-c7-gs', type: 'variant_of', strength: 0.85 })
addEdge({ id: 'e-c8-gs', source: 'chevy-corvette-c8', target: 'chevy-corvette-c8-gs', type: 'variant_of', strength: 0.85 })
addEdge({ id: 'e-gs-c7-c8', source: 'chevy-corvette-c7-gs', target: 'chevy-corvette-c8-gs', type: 'evolves_into', strength: 0.85 })

// ─── 9. Add Impala Gen8 (2006) as bridge between Gen1 and Gen9 ──────────────
console.log('\n--- Impala ---')
addNode({ id: 'chev-impala-8', label: 'Impala Gen.8', type: 'generation', year: 2006, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'impala', bodyType: 'sedan', segment: 'full_size', zone: 'mainstream', hp: 242, engineType: 'petrol_v6' })
// Rewire: Gen1 → Gen8 → Gen9
const impalaEdge = g.edges.find(e => e.source === 'chev-impala-1' && e.target === 'chev-impala-9')
if (impalaEdge) { impalaEdge.target = 'chev-impala-8'; console.log('  ~ rewired impala-1 → impala-8') }
addEdge({ id: 'e-impala-8-9', source: 'chev-impala-8', target: 'chev-impala-9', type: 'evolves_into', strength: 0.9 })

// ─── Save ────────────────────────────────────────────────────────────────────
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
