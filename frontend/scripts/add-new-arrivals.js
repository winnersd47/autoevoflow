'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g     = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const nodeMap = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const edgeSet = new Set(g.edges.map(e => e.id || e.source + '→' + e.target))

let addedNodes = 0, addedEdges = 0, fixedEdges = 0

// ── helpers ───────────────────────────────────────────────────────────────────
function addNode(n) {
  if (nodeMap[n.id]) return false
  g.nodes.push(n)
  nodeMap[n.id] = n
  addedNodes++
  return true
}

function addEdge(e) {
  const key = e.id || e.source + '→' + e.target
  if (edgeSet.has(key)) return false
  if (!nodeMap[e.source]) { console.warn(`  SKIP edge ${e.source}→${e.target}: source missing`); return false }
  if (!nodeMap[e.target]) { console.warn(`  SKIP edge ${e.source}→${e.target}: target missing`); return false }
  g.edges.push(e)
  edgeSet.add(key)
  addedEdges++
  return true
}

function fixEdge(id, patch) {
  const e = g.edges.find(x => x.id === id)
  if (!e) { console.warn(`  SKIP fix: edge ${id} not found`); return false }
  Object.assign(e, patch)
  fixedEdges++
  return true
}

function removeEdge(id) {
  const i = g.edges.findIndex(x => x.id === id)
  if (i === -1) return false
  g.edges.splice(i, 1)
  fixedEdges++
  return true
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. FIX EXISTING EDGES
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── FIX existing edges ──')

// Toyota GRMN Corolla: wrong evolves_into from E210 → should be variant_of GR Corolla
removeEdge('sync-ev-toyota-corolla-e210-ncs-toyota-2026-toyota-grmn-corolla')
  && console.log('  ✓ Removed wrong E210→GRMN evolves_into edge')

addEdge({
  id:       'e-toy-gr-corolla-grmn',
  source:   'toyota-gr-corolla',
  target:   'ncs-toyota-2026-toyota-grmn-corolla',
  type:     'variant_of',
  strength: 0.92,
}) && console.log('  ✓ GR Corolla → GRMN (variant_of)')

// Dodge Copperhead: invisible inspired_by (0.45) → evolves_into Viper successor
fixEdge('dodge-viper-gen5-srt--dodge-copperhead', { type: 'evolves_into', strength: 0.80 })
  && console.log('  ✓ Viper VX → Copperhead (evolves_into 0.80)')

// ══════════════════════════════════════════════════════════════════════════════
// 2. AUDI Q9 / SQ9 (2027) — новый намеплейт, флагманский 3-рядный SUV
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Audi Q9 / SQ9 ──')

addNode({
  id: 'audi-q9-f9', label: 'Q9 F9', brandId: 'audi', brandName: 'Audi',
  year: 2027, hp: 450, engineType: 'V8 Biturbo',
  bodyType: 'SUV', segment: 'full_size_suv', codeName: 'F9',
  zone: 'midsize_sed',
}) && console.log('  + Audi Q9 F9 (2027)')

addNode({
  id: 'audi-sq9-f9', label: 'SQ9 F9', brandId: 'audi', brandName: 'Audi',
  year: 2027, hp: 591, engineType: 'V8 Biturbo',
  bodyType: 'SUV', segment: 'full_size_suv', codeName: 'F9',
  zone: 'midsize_sed',
}) && console.log('  + Audi SQ9 F9 (2027, 591 л.с.)')

addEdge({ id: 'e-audi-q8-q9-platform', source: 'audi-q8-f8', target: 'audi-q9-f9', type: 'shares_platform', strength: 0.72 })
  && console.log('  + Q8 F8 → Q9 F9 (shares_platform MLB Evo)')
addEdge({ id: 'e-audi-q9-sq9', source: 'audi-q9-f9', target: 'audi-sq9-f9', type: 'variant_of', strength: 0.92 })
  && console.log('  + Q9 → SQ9 (variant_of)')

// ══════════════════════════════════════════════════════════════════════════════
// 3. MERCEDES GLA chain (Gen.1–3 + EV variant)
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Mercedes GLA Gen.1–3 + EV ──')

addNode({
  id: 'merc-gla-x156', label: 'GLA X156', brandId: 'mercedes', brandName: 'Mercedes-Benz',
  year: 2013, hp: 211, engineType: 'I4 Turbo',
  bodyType: 'Compact SUV', segment: 'compact_suv', codeName: 'X156',
  zone: 'exec_sed',
}) && console.log('  + Mercedes GLA X156 (2013)')

addNode({
  id: 'merc-gla-x156-fl', label: 'GLA X156 Phase II', brandId: 'mercedes', brandName: 'Mercedes-Benz',
  year: 2017, hp: 211, engineType: 'I4 Turbo',
  bodyType: 'Compact SUV', segment: 'compact_suv', codeName: 'X156',
  zone: 'exec_sed',
}) && console.log('  + Mercedes GLA X156 Phase II (2017)')

addNode({
  id: 'merc-gla-h247', label: 'GLA H247', brandId: 'mercedes', brandName: 'Mercedes-Benz',
  year: 2020, hp: 224, engineType: 'I4 Turbo',
  bodyType: 'Compact SUV', segment: 'compact_suv', codeName: 'H247',
  zone: 'exec_sed',
}) && console.log('  + Mercedes GLA H247 (2020)')

addNode({
  id: 'merc-gla-3-ev', label: 'GLA EV (2028)', brandId: 'mercedes', brandName: 'Mercedes-Benz',
  year: 2028, hp: 272, engineType: 'EV',
  bodyType: 'Compact SUV', segment: 'compact_suv',
  zone: 'exec_sed',
}) && console.log('  + Mercedes GLA EV (2028)')

addEdge({ id: 'e-merc-gla-x156-fl', source: 'merc-gla-x156', target: 'merc-gla-x156-fl', type: 'facelifted_to', strength: 0.85 })
  && console.log('  + GLA X156 → X156 Phase II (facelifted_to)')
addEdge({ id: 'e-merc-gla-x156-h247', source: 'merc-gla-x156-fl', target: 'merc-gla-h247', type: 'evolves_into', strength: 0.88 })
  && console.log('  + GLA X156.II → H247 (evolves_into)')
addEdge({ id: 'e-merc-gla-h247-h2xx', source: 'merc-gla-h247', target: 'ncs-mercedes-2028-mercedes-benz-gla', type: 'evolves_into', strength: 0.88 })
  && console.log('  + GLA H247 → Gen.3 2028 (evolves_into)')
addEdge({ id: 'e-merc-gla-3-ev', source: 'ncs-mercedes-2028-mercedes-benz-gla', target: 'merc-gla-3-ev', type: 'variant_of', strength: 0.90 })
  && console.log('  + GLA Gen.3 → GLA EV (variant_of)')

// ══════════════════════════════════════════════════════════════════════════════
// 4. MERCEDES C-CLASS EV (2027) — C400 EV, без суббренда EQ
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Mercedes C-Class EV ──')

addNode({
  id: 'merc-c-w206-ev', label: 'C-Class EV W206', brandId: 'mercedes', brandName: 'Mercedes-Benz',
  year: 2027, hp: 408, engineType: 'EV',
  bodyType: 'Sedan', segment: 'premium_midsize', codeName: 'W206 EV',
  zone: 'exec_sed',
}) && console.log('  + Mercedes C-Class EV W206 (2027, 408 л.с.)')

addEdge({ id: 'e-merc-c-w206-ev', source: 'merc-c-w206', target: 'merc-c-w206-ev', type: 'variant_of', strength: 0.90 })
  && console.log('  + C-Class W206 → C-Class EV (variant_of)')

// ══════════════════════════════════════════════════════════════════════════════
// 5. MERCEDES-MAYBACH S680 V12 (2027)
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Mercedes-Maybach S680 V12 ──')

addNode({
  id: 'merc-maybach-s680-v12', label: 'Maybach S680 V12 (2027)', brandId: 'mercedes', brandName: 'Mercedes-Benz',
  year: 2027, hp: 612, engineType: 'V12 Biturbo',
  bodyType: 'Sedan', segment: 'ultra_luxury', codeName: 'V222/X223',
  zone: 'exec_sed',
}) && console.log('  + Maybach S680 V12 (2027, 612 л.с.)')

// ncs-mercedes-2027-s-class-maybach is already the Maybach S-Class W223 2027 base
addEdge({ id: 'e-merc-maybach-s680-v12', source: 'ncs-mercedes-2027-s-class-maybach', target: 'merc-maybach-s680-v12', type: 'variant_of', strength: 0.88 })
  && console.log('  + Maybach S-Class 2027 → S680 V12 (variant_of)')

// ══════════════════════════════════════════════════════════════════════════════
// 6. DODGE CHARGER SIXPACK R/T (2026) — ICE-версия нового Charger
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Dodge Charger Sixpack R/T ──')

addNode({
  id: 'dodge-charger-sixpack', label: 'Charger Sixpack R/T', brandId: 'dodge', brandName: 'Dodge',
  year: 2026, hp: 420, engineType: 'I6 Hurricane TT',
  bodyType: 'Muscle Car', segment: 'muscle', codeName: 'Sixpack',
  zone: 'gt_coupe',
}) && console.log('  + Dodge Charger Sixpack R/T (2026, 420 л.с. I6)')

addEdge({ id: 'e-dodge-charger-sixpack', source: 'dodge-charger-daytona-ev', target: 'dodge-charger-sixpack', type: 'variant_of', strength: 0.88 })
  && console.log('  + Charger Daytona EV → Sixpack R/T (variant_of)')

// ══════════════════════════════════════════════════════════════════════════════
// 7. GMC SIERRA EV (2024/2026) — Ultium-платформа
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── GMC Sierra EV ──')

addNode({
  id: 'gmc-sierra-ev', label: 'Sierra EV Denali', brandId: 'gmc', brandName: 'GMC',
  year: 2024, hp: 754, engineType: 'EV Ultium',
  bodyType: 'Pickup', segment: 'truck',
  zone: 'pickup',
}) && console.log('  + GMC Sierra EV Denali (2024, 754 л.с.)')

addEdge({ id: 'e-gmc-sierra4-ev', source: 'gmc-sierra-4', target: 'gmc-sierra-ev', type: 'derived_from', strength: 0.78 })
  && console.log('  + Sierra Gen4 → Sierra EV (derived_from)')
addEdge({ id: 'e-gmc-sierra-ev-hummer', source: 'gmc-sierra-ev', target: 'gmc-hummer-ev', type: 'shares_platform', strength: 0.85 })
  && console.log('  + Sierra EV → Hummer EV (shares_platform Ultium)')

// ══════════════════════════════════════════════════════════════════════════════
// 8. MAZDA CX-5 Gen.3 (2026)
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Mazda CX-5 Gen.3 ──')

addNode({
  id: 'mazda-cx5-2026', label: 'CX-5 Gen.3 (2026)', brandId: 'mazda', brandName: 'Mazda',
  year: 2026, hp: 227, engineType: 'I4 Turbo',
  bodyType: 'SUV', segment: 'compact_suv',
  zone: 'sports',
}) && console.log('  + Mazda CX-5 Gen.3 (2026)')

addEdge({ id: 'e-mazda-cx5-kf-fl-2026', source: 'mazda-cx5-kf-fl', target: 'mazda-cx5-2026', type: 'evolves_into', strength: 0.88 })
  && console.log('  + CX-5 KF Phase II → CX-5 Gen.3 (evolves_into)')

// ══════════════════════════════════════════════════════════════════════════════
// 9. PORSCHE GT3 RS (992) + GT3 CUP (992) — GT3 S/C
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Porsche GT3 RS + GT3 Cup ──')

addNode({
  id: 'p911-gt3-rs-992', label: '911 GT3 RS 992', brandId: 'porsche', brandName: 'Porsche',
  year: 2022, hp: 525, engineType: 'Flat-6 NA',
  bodyType: 'Coupe', segment: 'sports', codeName: '992 GT3 RS',
  zone: 'sports',
}) && console.log('  + Porsche 911 GT3 RS 992 (2022, 525 л.с.)')

addNode({
  id: 'p911-gt3-cup-992', label: '911 GT3 Cup 992', brandId: 'porsche', brandName: 'Porsche',
  year: 2021, hp: 510, engineType: 'Flat-6 NA',
  bodyType: 'Race Car', segment: 'racing', codeName: '992 GT3 Cup',
  zone: 'sports',
}) && console.log('  + Porsche 911 GT3 Cup 992 (2021, 510 л.с.)')

addEdge({ id: 'e-p911-gt3-992-rs', source: 'p911-gt3-992', target: 'p911-gt3-rs-992', type: 'variant_of', strength: 0.92 })
  && console.log('  + GT3 992 → GT3 RS 992 (variant_of)')
addEdge({ id: 'e-p911-gt3-992-cup', source: 'p911-gt3-992', target: 'p911-gt3-cup-992', type: 'variant_of', strength: 0.88 })
  && console.log('  + GT3 992 → GT3 Cup 992 (variant_of)')

// Historical GT3 RS chain
// Check if GT3 RS 997/991 exist and add if not
const prevRs = [
  { id: 'p911-gt3-rs-997', label: '911 GT3 RS 997', year: 2006, hp: 415 },
  { id: 'p911-gt3-rs-991', label: '911 GT3 RS 991', year: 2015, hp: 500 },
]
prevRs.forEach(n => {
  addNode({ ...n, brandId: 'porsche', brandName: 'Porsche', engineType: 'Flat-6 NA', bodyType: 'Coupe', segment: 'sports', zone: 'sports' })
    && console.log(`  + ${n.label}`)
})
// Connect RS chain
addEdge({ id: 'e-p911-gt3-rs-997-991', source: 'p911-gt3-rs-997', target: 'p911-gt3-rs-991', type: 'evolves_into', strength: 0.90 })
  && console.log('  + GT3 RS 997 → RS 991 (evolves_into)')
addEdge({ id: 'e-p911-gt3-rs-991-992', source: 'p911-gt3-rs-991', target: 'p911-gt3-rs-992', type: 'evolves_into', strength: 0.90 })
  && console.log('  + GT3 RS 991 → RS 992 (evolves_into)')
// Link GT3 997 to RS 997
addEdge({ id: 'e-p911-gt3-997-rs997', source: 'p911-gt3-997', target: 'p911-gt3-rs-997', type: 'variant_of', strength: 0.92 })
  && console.log('  + GT3 997 → GT3 RS 997 (variant_of)')
addEdge({ id: 'e-p911-gt3-991-rs991', source: 'p911-gt3-991', target: 'p911-gt3-rs-991', type: 'variant_of', strength: 0.92 })
  && console.log('  + GT3 991 → GT3 RS 991 (variant_of)')

// ══════════════════════════════════════════════════════════════════════════════
// SAVE
// ══════════════════════════════════════════════════════════════════════════════

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')

console.log(`\n✅ Done`)
console.log(`   Nodes: +${addedNodes}  |  Edges: +${addedEdges}  |  Fixed: ${fixedEdges}`)
console.log(`   Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
