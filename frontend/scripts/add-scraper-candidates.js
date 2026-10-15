'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const g          = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))
const existingIds = new Set(g.nodes.map(n => n.id))

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
  console.log('  + edge:', e.source, '-['+e.type+']->', e.target)
  return true
}
function fixEdge(src, tgt, newType) {
  const e = g.edges.find(x => x.source === src && x.target === tgt)
  if (e) { console.log('  ~ fix:', src, e.type, '→', newType); e.type = newType; return true }
  console.log('  ✗ not found:', src, '->', tgt); return false
}
function removeEdge(src, tgt) {
  const i = g.edges.findIndex(x => x.source === src && x.target === tgt)
  if (i !== -1) { g.edges.splice(i, 1); console.log('  - removed:', src, '->', tgt); return true }
  console.log('  ✗ not found:', src, '->', tgt); return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXES TO EXISTING NODES (found during scraper review)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Tesla Model Y ─────────────────────────────────────────────────────────
console.log('\n[Tesla Model Y — label + edge fix]')
// Label has "Tesla " prefix and "(2020)" suffix
const modelY = g.nodes.find(n => n.id === 'tesla-model-y-1')
if (modelY) {
  modelY.label = 'Model Y'
  console.log('  ~ label → Model Y')
}
// model-3 was inspired_by model-y — impossible (Y came after 3)
// Fix: model-3 INSPIRED model-y (forward in time)
fixEdge('tesla-model-3-1', 'tesla-model-y-1', 'inspired')

// ── 2. GMC Hummer EV ─────────────────────────────────────────────────────────
console.log('\n[GMC Hummer EV — edge direction fixes]')
// H1 (1992) -[inspired_by]-> Hummer EV (2021): means H1 was inspired BY 2021 car — impossible
fixEdge('hummer-h1', 'gmc-hummer-ev', 'inspired')
// Sierra Gen5 (2019) -[inspired_by]-> Hummer EV (2021): Sierra inspired by future car — impossible
fixEdge('gmc-sierra-5', 'gmc-hummer-ev', 'inspired')

// ── 3. Mercedes CLA EV ───────────────────────────────────────────────────────
console.log('\n[Mercedes CLA EV — reverse variant_of direction]')
// mb-cla-ev-iii -[variant_of]-> cla45-amg means CLA EV is a variant of CLA45 — backwards!
// CLA45 AMG is a performance VARIANT of the CLA EV base
removeEdge('mb-cla-ev-iii', 'ncs-mercedes-2027-cla45-amg-4matic')
addEdge({ id: 'e-cla-ev-45amg', source: 'ncs-mercedes-2027-cla45-amg-4matic', target: 'mb-cla-ev-iii', type: 'variant_of', strength: 0.9 })
// Fix brandId consistency
const claEV = g.nodes.find(n => n.id === 'mb-cla-ev-iii')
if (claEV && claEV.brandId === 'mercedes') {
  claEV.brandId = 'mercedes-benz'
  console.log('  ~ brandId: mercedes → mercedes-benz')
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW NODES FROM SCRAPER
// ═══════════════════════════════════════════════════════════════════════════════

// ── 4. Tesla Model Y Juniper (2024/2025 facelift) ────────────────────────────
// Significant refresh: new front fascia, interior redesign, updated powertrain
// Global launch: early 2025 (China late 2023)
console.log('\n[Tesla Model Y Juniper]')
addNode({
  id: 'tesla-model-y-juniper', label: 'Model Y Juniper', type: 'facelift', year: 2025,
  brandId: 'tesla', brandName: 'Tesla', modelSlug: 'tesla-model-y-juniper',
  bodyType: 'suv', segment: 'exec', zone: 'suv_compact',
  hp: 374, engineType: 'ev',
})
addEdge({ id: 'e-modely-juniper', source: 'tesla-model-y-1', target: 'tesla-model-y-juniper', type: 'evolves_into', strength: 0.95 })

// ── 5. GMC Hummer EV Icon 25 (2027) — 25th anniversary special edition ───────
// Celebrates 25 years since H2 debut at 2002 LA Auto Show
// Distinct exterior accents, special badging, unique color packages
// NOT a new generation — a limited variant of the existing Hummer EV
console.log('\n[GMC Hummer EV Icon 25]')
addNode({
  id: 'gmc-hummer-ev-icon25', label: 'Hummer EV Icon 25', type: 'generation', year: 2027,
  brandId: 'gmc', brandName: 'GMC', modelSlug: 'gmc-hummer-ev-icon25',
  bodyType: 'pickup', segment: 'luxury_truck', zone: 'performance',
  hp: 1000, engineType: 'ev',
})
// Icon 25 is a special edition variant of the base Hummer EV
addEdge({ id: 'e-hummer-icon25', source: 'gmc-hummer-ev', target: 'gmc-hummer-ev-icon25', type: 'variant_of', strength: 0.9 })

// ── 6. Mercedes-Benz CLA250+ (2026) — confirm it's the same as CLA EV ────────
// CLA250+ is just a powertrain trim of the new CLA EV platform (MMA)
// mb-cla-ev-iii already covers this — no separate node needed; it IS the CLA250+ base

// ── 7. Subaru WRX 2026 — model year update, NOT a facelift ──────────────────
// Scraper articles are spec/pricing updates for MY2026, not a design change.
// WRX VB (2021) remains the current generation. Skipping.

// ── 8. Hyundai Ioniq 5 N 2026 — pricing revision, already in graph ──────────
// hyu-ioniq5-n already in graph. Skipping.

// ── 9. Ram 1500 Roush 2027 — first Roush performance package ─────────────────
// Roush is a respected American performance tuner (Ford focus historically).
// First Ram partnership. Limited variant of Ram 1500 Gen.6
console.log('\n[Ram 1500 Roush]')
addNode({
  id: 'ram-1500-roush', label: 'Ram Roush', type: 'generation', year: 2027,
  brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-1500-roush',
  bodyType: 'pickup', segment: 'full_size_truck', zone: 'performance',
  hp: 540, engineType: 'petrol_v8_supercharged',
})
addEdge({ id: 'e-ram6-roush', source: 'ram-1500-6', target: 'ram-1500-roush', type: 'variant_of', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// Save
// ═══════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
