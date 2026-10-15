'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))

const existingIds = new Set(g.nodes.map(n => n.id))

// ─── 1. Fix "Challenger Gen.3" label (it's the 2nd gen, not 3rd) ───
const challGen = g.nodes.find(n => n.id === 'dodge-challenger-gen3')
if (challGen) {
  challGen.label = "Challenger '08"
  console.log('+ renamed challenger gen3 label → "Challenger \'08"')
}

// ─── 2. Fix Ram HD Gen1: variant_of → derived_from (it's a separate truck class) ───
const ramHdEdge = g.edges.find(e => e.source === 'dodge-ram-2' && e.target === 'dodge-ram-hd-1')
if (ramHdEdge) {
  ramHdEdge.type = 'derived_from'
  console.log('+ fixed ram-2 → ram-hd-1: variant_of → derived_from')
}

// ─── 3. Remove wrong Neon SRT-4 → Dart 2013 edge (different platforms) ───
const wrongEdgeIdx = g.edges.findIndex(e => e.source === 'dodge-neon-srt4' && e.target === 'dodge-dart-2013')
if (wrongEdgeIdx !== -1) {
  g.edges.splice(wrongEdgeIdx, 1)
  console.log('- removed bogus neon-srt4 → dart-2013 (different platforms: Chrysler PL vs Alfa CUSW)')
}

// ─── 4. Add Dodge Caliber (2006–2012) — actual market successor to Neon ───
function addNode(node) {
  if (existingIds.has(node.id)) { console.log('  = skip node (exists):', node.id); return false }
  g.nodes.push(node)
  existingIds.add(node.id)
  console.log('+ node:', node.id, '|', node.label)
  return true
}

function addEdge(edge) {
  const key = edge.source + '→' + edge.target
  const exists = g.edges.some(e => e.source === edge.source && e.target === edge.target)
  if (exists) { console.log('  = skip edge (exists):', key); return false }
  if (!existingIds.has(edge.source)) { console.log('  ✗ edge source missing:', edge.source); return false }
  if (!existingIds.has(edge.target)) { console.log('  ✗ edge target missing:', edge.target); return false }
  g.edges.push(edge)
  console.log('+ edge:', edge.source, '->', edge.target, '|', edge.type)
  return true
}

addNode({
  id: 'dodge-caliber',
  label: 'Caliber',
  type: 'generation',
  year: 2006,
  brandId: 'dodge',
  brandName: 'Dodge',
  modelSlug: 'dodge-caliber',
  bodyType: 'hatchback',
  segment: 'compact',
  zone: 'mainstream',
  hp: 172,
  engineType: 'petrol_i4',
})

// ─── 5. Add Alfa Romeo Giulietta node (platform donor for Dart) ───
addNode({
  id: 'alfa-romeo-giulietta-2010',
  label: 'Giulietta',
  type: 'generation',
  year: 2010,
  brandId: 'alfa-romeo',
  brandName: 'Alfa Romeo',
  modelSlug: 'alfa-giulietta',
  bodyType: 'hatchback',
  segment: 'compact',
  zone: 'premium',
  hp: 170,
  engineType: 'petrol_i4_turbo',
})

// ─── 6. Reconnect compact succession chain properly ───
// Neon Gen2 → Caliber (market succession, different platform)
addEdge({ id: 'e-neon2-caliber', source: 'dodge-neon-gen2', target: 'dodge-caliber', type: 'inspired', strength: 0.6 })
// Neon SRT-4 did NOT lead to Dart — Caliber filled that market gap
// Caliber → Dart (market succession, different platform again)
addEdge({ id: 'e-caliber-dart', source: 'dodge-caliber', target: 'dodge-dart-2013', type: 'inspired', strength: 0.6 })
// Alfa Giulietta → Dart (shares_platform: CUSW derived from Giulietta chassis)
addEdge({ id: 'e-giulietta-dart', source: 'alfa-romeo-giulietta-2010', target: 'dodge-dart-2013', type: 'shares_platform', strength: 0.85 })
// Dart → Hornet: both Dodge compacts with Alfa DNA (Hornet is on Tonale/Stelvio platform)
// This edge already exists, keep it

// ─── Save ───
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
