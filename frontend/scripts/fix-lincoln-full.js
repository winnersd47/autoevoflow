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
    console.log('  = skip edge:', e.source.replace('lincoln-',''), '->', e.target.replace('lincoln-','')); return false
  }
  if (!existingIds.has(e.source)) { console.log('  ✗ src missing:', e.source); return false }
  if (!existingIds.has(e.target)) { console.log('  ✗ tgt missing:', e.target); return false }
  g.edges.push(e)
  console.log('  + edge:', e.source.replace('lincoln-',''), '-['+e.type+']->', e.target.replace('lincoln-',''))
  return true
}
function removeEdge(src, tgt) {
  const i = g.edges.findIndex(x => x.source === src && x.target === tgt)
  if (i !== -1) { g.edges.splice(i, 1); console.log('  - removed:', src, '->', tgt); return true }
  console.log('  ✗ not found:', src, '->', tgt); return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Real platform codes in labels
//    Sources: Lincoln production history, Ford platform designations
// ═══════════════════════════════════════════════════════════════════════════════
// Y-body (1961) — Lincoln's first unibody, unique to Continental
// Thunderbird platform (1968-1979) — shared Mark III/IV/V and Thunderbird
// Panther (1981-2011) — longest-lived Ford platform; Town Car, Crown Vic, Grand Marquis
// P38 (1997) — body-on-frame SUV, Navigator Gen.1 shares with Expedition Gen.1
// U222 (2003) — Navigator Gen.2 + Aviator Gen.1 share with Ford Expedition/Explorer
// UN93 (2007) — Navigator Gen.3, shared with Expedition Gen.3
// U553 (2018) — Navigator Gen.4, shared with Expedition Gen.4
// DEW98 (2000) — rear-wheel-drive luxury; LS, Jaguar S-Type, Ford Thunderbird 2002
// CD3 (2006) — front-drive/AWD; MKZ Gen.1, Ford Fusion Gen.1, Mazda 6
// CD4 (2013) — MKZ Gen.2, Ford Fusion Gen.2
// CD6 (2017) — Aviator Gen.2, Explorer Gen.6, Continental Gen.6 (stretched D6E variant)

const PLATFORM_LABELS = {
  'lincoln-mark3':         'Continental Mk III',    // Thunderbird platform
  'lincoln-mark4':         'Continental Mk IV',     // Thunderbird platform
  'lincoln-mark5':         'Continental Mk V',      // Thunderbird/Panther transition
  'lincoln-town-car':      'Town Car Panther',      // Ford Panther (1981–2011)
  'lincoln-navigator-1':   'Navigator P38',         // Ford P38A (Expedition Gen.1)
  'lincoln-navigator-2':   'Navigator U222',        // Ford U222 (Expedition Gen.2)
  'lincoln-navigator-3':   'Navigator UN93',        // Ford UN93 (Expedition Gen.3)
  'lincoln-navigator-4':   'Navigator U553',        // Ford U553 (Expedition Gen.4)
  'lincoln-ls-1':          'LS DEW98',              // DEW98 (shared Jag S-Type, T-Bird)
  'lincoln-aviator-1':     'Aviator U222',          // Ford U222 (Explorer Gen.3)
  'lincoln-aviator-2':     'Aviator CD6',           // Ford CD6 (Explorer Gen.6)
  'lincoln-mkz-1':         'MKZ CD3',               // Ford CD3 (Fusion Gen.1, Mazda 6)
  'lincoln-mkz-2':         'MKZ CD4',               // Ford CD4 (Fusion Gen.2)
  'lincoln-continental-6': 'Continental D6E',       // Stretched CD6/D6E, unique to Continental
}

let labelFixed = 0
for (const node of g.nodes) {
  if (PLATFORM_LABELS[node.id]) {
    console.log('label:', JSON.stringify(node.label), '→', PLATFORM_LABELS[node.id])
    node.label = PLATFORM_LABELS[node.id]
    labelFixed++
  }
}
console.log('Platform labels updated:', labelFixed)

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Add Continental Gen.2 (1970) — bridge the 1961→2017 gap
//    The Continental continued through 1969-2002 before revival
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Continental chain]')
addNode({
  id: 'lincoln-continental-2', label: 'Continental Gen.2', type: 'generation', year: 1970,
  brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'lincoln-continental',
  bodyType: 'sedan', segment: 'full_size_luxury', zone: 'luxury', hp: 212, engineType: 'petrol_v8',
})
// Remove continental-1 → continental-6 (across 56 years, needs chain)
removeEdge('lincoln-continental-1', 'lincoln-continental-6')
addEdge({ id: 'e-cont-1-2', source: 'lincoln-continental-1', target: 'lincoln-continental-2', type: 'evolves_into', strength: 0.9 })
// Continental was discontinued after 2002; Gen.6 is a revival
addEdge({ id: 'e-cont-2-6', source: 'lincoln-continental-2', target: 'lincoln-continental-6', type: 'inspired', strength: 0.7 })

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Navigator L — extended wheelbase variant (pentagon)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Navigator L]')
addNode({
  id: 'lincoln-navigator-l', label: 'Navigator L', type: 'generation', year: 2003,
  brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'navigator-l',
  bodyType: 'suv', segment: 'large_suv', zone: 'luxury', hp: 300, engineType: 'petrol_v8',
})
addEdge({ id: 'e-nav2-navL', source: 'lincoln-navigator-2', target: 'lincoln-navigator-l', type: 'variant_of', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MKX Gen.1 (2007) → Nautilus (2019) — midsize luxury crossover line
//    Platform: CD3 (Gen.1, shares with MKZ), CD6 (Nautilus)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[MKX/Nautilus]')
addNode({
  id: 'lincoln-mkx-1', label: 'MKX CD3', type: 'generation', year: 2007,
  brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'mkx',
  bodyType: 'suv', segment: 'midsize_luxury_suv', zone: 'luxury', hp: 265, engineType: 'petrol_v6',
})
addNode({
  id: 'lincoln-nautilus', label: 'Nautilus CD6', type: 'generation', year: 2019,
  brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'nautilus',
  bodyType: 'suv', segment: 'midsize_luxury_suv', zone: 'luxury', hp: 335, engineType: 'petrol_i4_turbo',
})
// MKZ and MKX share CD3 platform (Ford Fusion/Edge siblings)
addEdge({ id: 'e-mkz1-mkx1',    source: 'lincoln-mkz-1',    target: 'lincoln-mkx-1',    type: 'shares_platform', strength: 0.85 })
addEdge({ id: 'e-mkx1-nautilus', source: 'lincoln-mkx-1',   target: 'lincoln-nautilus',  type: 'evolves_into',   strength: 0.9  })

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MKC Gen.1 (2015) → Corsair (2020) — compact luxury crossover line
//    Platform: C1 (Ford EcoSport/Escape platform)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[MKC/Corsair]')
addNode({
  id: 'lincoln-mkc-1', label: 'MKC C1', type: 'generation', year: 2015,
  brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'mkc',
  bodyType: 'suv', segment: 'compact_luxury_suv', zone: 'luxury', hp: 285, engineType: 'petrol_i4_turbo',
})
addNode({
  id: 'lincoln-corsair', label: 'Corsair C2', type: 'generation', year: 2020,
  brandId: 'lincoln', brandName: 'Lincoln', modelSlug: 'corsair',
  bodyType: 'suv', segment: 'compact_luxury_suv', zone: 'luxury', hp: 250, engineType: 'petrol_i4_turbo',
})
addEdge({ id: 'e-mkc1-corsair', source: 'lincoln-mkc-1', target: 'lincoln-corsair', type: 'evolves_into', strength: 0.9 })
// MKC/Corsair and Nautilus are SUV siblings — MKC compact, MKX/Nautilus midsize
addEdge({ id: 'e-mkc-mkx-inspired', source: 'lincoln-mkc-1', target: 'lincoln-mkx-1', type: 'inspired', strength: 0.6 })

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Cross-brand platform edges (using Ford Explorer nodes added earlier)
//    Aviator Gen.1 (U222) = Explorer Gen.3 platform
//    Aviator Gen.2 (CD6)  = Explorer Gen.6 platform
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n[Cross-brand platform edges]')
addEdge({ id: 'e-aviator1-explorer3', source: 'lincoln-aviator-1', target: 'ford-explorer-3', type: 'shares_platform', strength: 0.9 })
addEdge({ id: 'e-aviator2-explorer6', source: 'lincoln-aviator-2', target: 'ford-explorer-6', type: 'shares_platform', strength: 0.9 })

// ═══════════════════════════════════════════════════════════════════════════════
// Save
// ═══════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2))
console.log('\nDone. Nodes:', g.nodes.length, '| Edges:', g.edges.length)
