const fs = require('fs')
const g = JSON.parse(fs.readFileSync('public/data/evolution/graph.json','utf-8'))
let removed = 0, addedEdges = 0, addedNodes = 0, updated = 0

// ── REMOVE WRONG-DIRECTION EDGES ────────────────────────────────────────────
const toRemove = new Set()
g.edges.forEach(e => {
  if (e.source === 'ncs-bmw-2026-bmw-vision-alpina-concept' && e.type === 'inspired') toRemove.add(e.id)
  if (e.source === 'ncs-subaru-2026-subaru-trailseeker' && e.type === 'inspired') toRemove.add(e.id)
  if (e.source === 'ncs-subaru-2026-subaru-uncharted' && e.type === 'inspired') toRemove.add(e.id)
})
g.edges = g.edges.filter(e => !toRemove.has(e.id))
removed = toRemove.size
console.log('Removed wrong edges:', removed, [...toRemove])

// ── SET isConcept: true ──────────────────────────────────────────────────────
const conceptIds = new Set([
  'ncs-bmw-2024-skytop-concept',
  'ncs-bmw-2024-vision-neue-klasse-x-concept',
  'ncs-bmw-2025-speedtop-concept',
  'ncs-bmw-2026-bmw-vision-alpina-concept',
  'ncs-bmw-2026-m-neue-klasse-concept',
  'ncs-bentley-2025-exp-15-concept',
  'ncs-ferrari-2027-ferrari-luce',
  'ncs-honda-2025-0-suv-concept',
  'ncs-lotus-2024-theory-1-concept',
  'ncs-nissan-2024-epic-concept',
  'ncs-nissan-2026-terrano-suv-phev-concept',
  'ncs-rolls-royce-2026-project-nightingale-concept',
  'ncs-audi-2025-c-concept',
])
g.nodes.forEach(n => {
  if (conceptIds.has(n.id) && !n.isConcept) { n.isConcept = true; updated++ }
})

// ── ADD NISSAN FRONTIER D41 BASE NODE ───────────────────────────────────────
if (!g.nodes.find(n => n.id === 'nissan-frontier-d41')) {
  g.nodes.push({
    id: 'nissan-frontier-d41', label: 'Frontier D41',
    type: 'generation', year: 2022,
    brandId: 'nissan', brandName: 'Nissan',
    codeName: 'D41', modelSlug: 'nissan-frontier',
    hp: 270, engineType: 'v6',
    bodyType: 'pickup', segment: 'pickup', zone: 'workhorse'
  })
  addedNodes++
}

// ── ADD PARENT EDGES ─────────────────────────────────────────────────────────
const newEdges = [
  { id: 'bmw-z4-to-skytop',     source: 'bmw-z4-g29',           target: 'ncs-bmw-2024-skytop-concept',                     type: 'derived_from',        strength: 0.7  },
  { id: 'bmw-x3fl-to-nklx',     source: 'bmw-x3-g01-fl',        target: 'ncs-bmw-2024-vision-neue-klasse-x-concept',        type: 'derived_from',        strength: 0.8  },
  { id: 'bmw-nklx-to-ix3nkl',   source: 'ncs-bmw-2024-vision-neue-klasse-x-concept', target: 'ncs-bmw-2027-ix3-long-wheelbase', type: 'concept_to_production', strength: 0.85 },
  { id: 'bmw-z4-to-speedtop',   source: 'bmw-z4-g29',           target: 'ncs-bmw-2025-speedtop-concept',                   type: 'derived_from',        strength: 0.7  },
  { id: 'bmw-7g70-to-alpina',   source: 'bmw-7-g70',            target: 'ncs-bmw-2026-bmw-vision-alpina-concept',           type: 'derived_from',        strength: 0.8  },
  { id: 'bmw-m3g80-to-mnkl',    source: 'bmw-m3-g80',           target: 'ncs-bmw-2026-m-neue-klasse-concept',               type: 'derived_from',        strength: 0.85 },
  { id: 'ferrari-f8sp-hc25',    source: 'ferrari-f8-spider',    target: 'ncs-ferrari-2026-ferrari-hc25',                    type: 'derived_from',        strength: 0.8  },
  { id: 'ferrari-12cil-luce',   source: 'ferrari-12cil',        target: 'ncs-ferrari-2027-ferrari-luce',                    type: 'derived_from',        strength: 0.8  },
  { id: 'bentley-cgt4-exp15',   source: 'bentley-conti-gt4',    target: 'ncs-bentley-2025-exp-15-concept',                  type: 'derived_from',        strength: 0.75 },
  { id: 'mclaren-750s-788hs',   source: 'mclaren-750s',         target: 'ncs-mclaren-2027-788hs',                           type: 'evolves_into',        strength: 0.9  },
  { id: 'mb-vle-to-vle27',      source: 'mb-vle',               target: 'ncs-mercedes-2027-vle',                            type: 'facelifted_to',       strength: 0.8  },
  { id: 'morgan-plus6-midsumr', source: 'morgan-plus6',         target: 'ncs-morgan-2026-midsummer-coupe',                  type: 'variant_of',          strength: 0.8  },
  { id: 'lotus-emira-theory1',  source: 'lotus-emira',          target: 'ncs-lotus-2024-theory-1-concept',                  type: 'derived_from',        strength: 0.7  },
  { id: 'lotus-exige-evija',    source: 'lotus-exige-s3',       target: 'ncs-lotus-2025-lotus-evija',                       type: 'derived_from',        strength: 0.75 },
  { id: 'honda-crv-0suv',       source: 'honda-crv-rn1',        target: 'ncs-honda-2025-0-suv-concept',                     type: 'derived_from',        strength: 0.75 },
  { id: 'honda-civic-supern',   source: 'honda-civic-fl5',      target: 'ncs-honda-2026-super-n',                           type: 'derived_from',        strength: 0.75 },
  { id: 'audi-a6etron-cconcpt', source: 'audi-a6-etron-c9',     target: 'ncs-audi-2025-c-concept',                          type: 'derived_from',        strength: 0.75 },
  { id: 'nissan-patrol-epic',   source: 'nissan-patrol-y62-fl', target: 'ncs-nissan-2024-epic-concept',                     type: 'derived_from',        strength: 0.7  },
  { id: 'nissan-patrol-trno',   source: 'nissan-patrol-y62',    target: 'ncs-nissan-2026-terrano-suv-phev-concept',         type: 'derived_from',        strength: 0.7  },
  { id: 'nissan-d41-frontier',  source: 'nissan-frontier-d41',  target: 'ncs-nissan-2027-nissan-frontier-sport-edition',    type: 'variant_of',          strength: 0.9  },
  { id: 'rr-spectre-nightngl',  source: 'rr-spectre',           target: 'ncs-rolls-royce-2026-project-nightingale-concept', type: 'derived_from',        strength: 0.75 },
  { id: 'subaru-forfl-trailsk', source: 'subaru-forester-sk-fl', target: 'ncs-subaru-2026-subaru-trailseeker',              type: 'evolves_into',        strength: 0.85 },
  { id: 'subaru-forsk-unchtd',  source: 'subaru-forester-sk',   target: 'ncs-subaru-2026-subaru-uncharted',                 type: 'derived_from',        strength: 0.75 },
]

const nodeIds = new Set(g.nodes.map(n => n.id))
const existingEdgeIds = new Set(g.edges.map(e => e.id))
newEdges.forEach(e => {
  if (!nodeIds.has(e.source)) { console.log('MISSING source:', e.source); return }
  if (!nodeIds.has(e.target)) { console.log('MISSING target:', e.target); return }
  if (existingEdgeIds.has(e.id)) return
  g.edges.push(e)
  addedEdges++
})

fs.writeFileSync('public/data/evolution/graph.json', JSON.stringify(g, null, 2))

// Validate
const broken = g.edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target))
const finalOrphans = g.nodes.filter(n => n.id.startsWith('ncs-')).filter(n => {
  const edges = g.edges.filter(e => e.source === n.id || e.target === n.id)
  return !edges.some(e => e.target === n.id && ['evolves_into','variant_of','facelifted_to','derived_from'].includes(e.type))
})

console.log('\n✅ Done!')
console.log('  removed wrong edges:', removed)
console.log('  added nodes:', addedNodes)
console.log('  added edges:', addedEdges)
console.log('  set isConcept:', updated)
console.log('  broken edges:', broken.length)
console.log('  nodes:', g.nodes.length, '| edges:', g.edges.length)
console.log('  Remaining orphan NCS:', finalOrphans.length)
if (finalOrphans.length) finalOrphans.forEach(n => console.log('    -', n.year, n.brandId, n.label))
