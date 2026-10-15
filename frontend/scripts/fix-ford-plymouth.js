'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))
const existingIds = new Set(g.nodes.map(n => n.id))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addNode(node) {
  if (existingIds.has(node.id)) { console.log('  = skip:', node.id); return false }
  g.nodes.push(node)
  existingIds.add(node.id)
  console.log('  + node:', node.id, '|', node.label)
  return true
}
function addEdge(e) {
  if (g.edges.some(x => x.source === e.source && x.target === e.target)) {
    console.log('  = skip edge:', e.source.split('-').slice(-2).join('-'), '->', e.target.split('-').slice(-2).join('-')); return false
  }
  if (!existingIds.has(e.source)) { console.log('  ✗ source missing:', e.source); return false }
  if (!existingIds.has(e.target)) { console.log('  ✗ target missing:', e.target); return false }
  g.edges.push(e)
  console.log('  + edge:', e.source.split('-').slice(-2).join('-'), '-['+e.type+']->', e.target.split('-').slice(-2).join('-'))
  return true
}
function fixEdge(src, tgt, newType) {
  const e = g.edges.find(x => x.source === src && x.target === tgt)
  if (e) { console.log('  ~ edge:', src.split('-').slice(-2).join('-'), e.type, '→', newType); e.type = newType; return true }
  console.log('  ✗ edge not found:', src, '->', tgt); return false
}
function removeEdge(src, tgt) {
  const i = g.edges.findIndex(x => x.source === src && x.target === tgt)
  if (i !== -1) { g.edges.splice(i, 1); console.log('  - removed:', src.split('-').slice(-2).join('-'), '->', tgt.split('-').slice(-2).join('-')); return true }
  console.log('  ✗ not found to remove:', src, '->', tgt); return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// ▌FORD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Label fixes ─────────────────────────────────────────────────────────
const FORD_LABELS = {
  'ford-mustang-1':     'Mustang Gen.1',
  'ford-bronco-1':      'Bronco Gen.1',
  'ford-taurus-1':      'Taurus Gen.1',
  'ford-explorer-1':    'Explorer Gen.1',
  'ford-mondeo-2':      'Mondeo Mk2',
  'ford-mondeo-3':      'Mondeo Mk3',
  'ford-mondeo-4':      'Mondeo Mk4',
  'ford-tbird-11':      'T-Bird 2002',
  'ford-gt-2005':       'Ford GT 2005',
  'ford-gt-2017':       'Ford GT 2017',
  'ford-f150-13':       'F-150 Gen.13',
  'ford-f150-14':       'F-150 Gen.14',
  'ford-explorer-6':    'Explorer Gen.6',
  'ford-taurus-6':      'Taurus Gen.6',
  'ford-mustang-s650-gt500': 'GT500 S650',
}

let labelFixed = 0
for (const node of g.nodes) {
  if (FORD_LABELS[node.id]) {
    console.log('label:', JSON.stringify(node.label), '→', FORD_LABELS[node.id])
    node.label = FORD_LABELS[node.id]
    labelFixed++
  }
}
console.log('Ford labels fixed:', labelFixed)

// ─── 2. Edge type fixes ──────────────────────────────────────────────────────
console.log('\n[Ford edge fixes]')
// Wrong inspired_by direction (old→new should be "inspired")
fixEdge('ford-mustang-s550', 'ford-mustang-mache',  'inspired')
fixEdge('ford-ranger-t5',    'ford-maverick',        'inspired')
// GT40→GT2005 is a tribute car, not direct evolution
fixEdge('ford-gt40',         'ford-gt-2005',         'inspired')
// Mondeo-1 → Mondeo-5 duplicate (full chain Mk1→2→3→4→5 already exists)
removeEdge('ford-mondeo-1', 'ford-mondeo-5')
// Sierra RS Cosworth is NOT derived from Escort — it's a variant of Sierra
removeEdge('ford-escort', 'ford-sierra-cosworth')
addEdge({ id: 'e-sierra-cosworth', source: 'ford-sierra', target: 'ford-sierra-cosworth', type: 'variant_of', strength: 0.9 })
// RS200 is a standalone Group B car, not derived from Escort — just inspired by rally program
fixEdge('ford-escort', 'ford-rs200', 'inspired')

// ─── 3. Add Mustang performance variants (pentagons) ────────────────────────
console.log('\n[Mustang variants]')
// Shelby GT350 — iconic Mustang variant, Gen.1 era and S550 era
addNode({ id: 'ford-shelby-gt350-1965', label: 'Shelby GT350', type: 'generation', year: 1965, brandId: 'ford', brandName: 'Ford', modelSlug: 'shelby-gt350', bodyType: 'coupe', segment: 'sports_car', zone: 'performance', hp: 306, engineType: 'petrol_v8' })
addNode({ id: 'ford-shelby-gt350-s550', label: 'GT350 S550', type: 'generation', year: 2015, brandId: 'ford', brandName: 'Ford', modelSlug: 'shelby-gt350', bodyType: 'coupe', segment: 'sports_car', zone: 'performance', hp: 526, engineType: 'petrol_v8_flat_plane' })
// Boss 302 — 1969 and 2012 revival
addNode({ id: 'ford-mustang-boss302', label: 'Boss 302', type: 'generation', year: 1969, brandId: 'ford', brandName: 'Ford', modelSlug: 'mustang-boss', bodyType: 'coupe', segment: 'muscle_car', zone: 'performance', hp: 290, engineType: 'petrol_v8' })
addNode({ id: 'ford-mustang-boss302-2012', label: 'Boss 302 2012', type: 'generation', year: 2012, brandId: 'ford', brandName: 'Ford', modelSlug: 'mustang-boss', bodyType: 'coupe', segment: 'muscle_car', zone: 'performance', hp: 444, engineType: 'petrol_v8' })

addEdge({ id: 'e-mustang1-gt350-65', source: 'ford-mustang-1', target: 'ford-shelby-gt350-1965', type: 'variant_of', strength: 0.9 })
addEdge({ id: 'e-mustang1-boss302',  source: 'ford-mustang-1', target: 'ford-mustang-boss302',  type: 'variant_of', strength: 0.9 })
addEdge({ id: 'e-s197-boss302-12',   source: 'ford-mustang-s197', target: 'ford-mustang-boss302-2012', type: 'variant_of', strength: 0.9 })
addEdge({ id: 'e-s550-gt350',        source: 'ford-mustang-s550', target: 'ford-shelby-gt350-s550',    type: 'variant_of', strength: 0.9 })
// Lineage GT350 1965 → GT350 S550
addEdge({ id: 'e-gt350-legacy',      source: 'ford-shelby-gt350-1965', target: 'ford-shelby-gt350-s550', type: 'inspired', strength: 0.75 })

// ─── 4. Add Explorer Gen.2-5 ─────────────────────────────────────────────────
console.log('\n[Explorer chain]')
addNode({ id: 'ford-explorer-2', label: 'Explorer Gen.2', type: 'generation', year: 1995, brandId: 'ford', brandName: 'Ford', modelSlug: 'explorer', bodyType: 'suv', segment: 'midsize_suv', zone: 'utility', hp: 210, engineType: 'petrol_v6' })
addNode({ id: 'ford-explorer-3', label: 'Explorer Gen.3', type: 'generation', year: 2002, brandId: 'ford', brandName: 'Ford', modelSlug: 'explorer', bodyType: 'suv', segment: 'midsize_suv', zone: 'utility', hp: 239, engineType: 'petrol_v6' })
addNode({ id: 'ford-explorer-4', label: 'Explorer Gen.4', type: 'generation', year: 2006, brandId: 'ford', brandName: 'Ford', modelSlug: 'explorer', bodyType: 'suv', segment: 'midsize_suv', zone: 'utility', hp: 292, engineType: 'petrol_v6' })
addNode({ id: 'ford-explorer-5', label: 'Explorer Gen.5', type: 'generation', year: 2011, brandId: 'ford', brandName: 'Ford', modelSlug: 'explorer', bodyType: 'suv', segment: 'midsize_suv', zone: 'utility', hp: 290, engineType: 'petrol_v6' })
// Rewire explorer-1 → explorer-6 through chain
removeEdge('ford-explorer-1', 'ford-explorer-6')
addEdge({ id: 'e-expl-1-2', source: 'ford-explorer-1', target: 'ford-explorer-2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-expl-2-3', source: 'ford-explorer-2', target: 'ford-explorer-3', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-expl-3-4', source: 'ford-explorer-3', target: 'ford-explorer-4', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-expl-4-5', source: 'ford-explorer-4', target: 'ford-explorer-5', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-expl-5-6', source: 'ford-explorer-5', target: 'ford-explorer-6', type: 'evolves_into', strength: 0.9 })

// ─── 5. Add Kuga Mk2 ─────────────────────────────────────────────────────────
console.log('\n[Kuga]')
addNode({ id: 'ford-kuga-2', label: 'Kuga Mk2', type: 'generation', year: 2013, brandId: 'ford', brandName: 'Ford', modelSlug: 'kuga', bodyType: 'suv', segment: 'compact_suv', zone: 'mainstream', hp: 182, engineType: 'petrol_i4_turbo' })
removeEdge('ford-kuga-1', 'ford-kuga-3')
addEdge({ id: 'e-kuga-1-2', source: 'ford-kuga-1', target: 'ford-kuga-2', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-kuga-2-3', source: 'ford-kuga-2', target: 'ford-kuga-3', type: 'evolves_into', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// ▌PLYMOUTH
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Plymouth expansion]')

// Plymouth Valiant (1960) — compact, parent of Barracuda
addNode({ id: 'plymouth-valiant-1960', label: 'Valiant 1960', type: 'generation', year: 1960, brandId: 'plymouth', brandName: 'Plymouth', modelSlug: 'plymouth-valiant', bodyType: 'sedan', segment: 'compact', zone: 'mainstream', hp: 101, engineType: 'petrol_i6' })
// Plymouth Barracuda Gen.2 — missing middle generation (1967, E-body transition)
addNode({ id: 'plymouth-barracuda-2', label: 'Barracuda Gen.2', type: 'generation', year: 1967, brandId: 'plymouth', brandName: 'Plymouth', modelSlug: 'barracuda', bodyType: 'coupe', segment: 'pony_car', zone: 'performance', hp: 280, engineType: 'petrol_v8' })
// Plymouth GTX (1967) — muscle car on B-body, paired with Road Runner as upscale variant
addNode({ id: 'plymouth-gtx', label: 'Plymouth GTX', type: 'generation', year: 1967, brandId: 'plymouth', brandName: 'Plymouth', modelSlug: 'plymouth-gtx', bodyType: 'coupe', segment: 'muscle_car', zone: 'performance', hp: 375, engineType: 'petrol_v8' })
// Plymouth Duster (1970) — popular budget muscle car
addNode({ id: 'plymouth-duster', label: 'Duster 340', type: 'generation', year: 1970, brandId: 'plymouth', brandName: 'Plymouth', modelSlug: 'plymouth-duster', bodyType: 'coupe', segment: 'muscle_car', zone: 'performance', hp: 240, engineType: 'petrol_v8' })
// Plymouth Fury (1956) — early flagship, classic American
addNode({ id: 'plymouth-fury-1956', label: 'Fury 1956', type: 'generation', year: 1956, brandId: 'plymouth', brandName: 'Plymouth', modelSlug: 'plymouth-fury', bodyType: 'coupe', segment: 'full_size', zone: 'mainstream', hp: 240, engineType: 'petrol_v8' })

// Barracuda chain: Gen1 ← Valiant → Gen2 → Gen3
addEdge({ id: 'e-valiant-barra1', source: 'plymouth-valiant-1960', target: 'plymouth-barracuda-1', type: 'evolves_into', strength: 0.9 })
addEdge({ id: 'e-barra-1-2',     source: 'plymouth-barracuda-1',   target: 'plymouth-barracuda-2', type: 'evolves_into', strength: 0.9 })
// Fix Gen1→Gen3 skip (remove old edge, rewire through Gen2)
removeEdge('plymouth-barracuda-1', 'plymouth-barracuda-3')
addEdge({ id: 'e-barra-2-3', source: 'plymouth-barracuda-2', target: 'plymouth-barracuda-3', type: 'evolves_into', strength: 0.9 })

// GTX and Road Runner: B-body siblings
addEdge({ id: 'e-gtx-rr',        source: 'plymouth-gtx',           target: 'plymouth-roadrunner', type: 'inspired',       strength: 0.7 })
// Superbird is a NASCAR variant of Road Runner (not just derived_from)
fixEdge('plymouth-roadrunner', 'plymouth-superbird', 'derived_from') // keep as derived_from — correct
// Road Runner → GTX (B-body platform siblings)
addEdge({ id: 'e-gtx-barcuda3',  source: 'plymouth-gtx',           target: 'plymouth-barracuda-3', type: 'inspired',       strength: 0.6 })
// Duster is derived from Valiant platform (A-body)
addEdge({ id: 'e-valiant-duster', source: 'plymouth-valiant-1960',  target: 'plymouth-duster',     type: 'evolves_into',   strength: 0.8 })
// Cross-brand: GTX shares B-body with Dodge Charger
addEdge({ id: 'e-gtx-charger',   source: 'plymouth-gtx',           target: 'dodge-charger-1969',  type: 'shares_platform', strength: 0.9 })
// Barracuda Gen.2 was inspiration for Dodge Challenger development
addEdge({ id: 'e-barra2-chall',  source: 'plymouth-barracuda-2',   target: 'dodge-challenger-1970', type: 'inspired',      strength: 0.7 })

// ─── Save ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
