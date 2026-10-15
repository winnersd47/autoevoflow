/**
 * Добавляет новые EV-бренды:
 * Tesla (Roadster → Model S/X/3/Y → Cybertruck → Roadster Gen2)
 * Polestar (1 → 2 → 3 → 4 → 6)
 * Rivian (R1T, R1S, R2)
 * Lucid (Air, Air Sapphire, Gravity)
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

const N = obj => obj
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newNodes = [

  // ══════════════════════════════════════════════════════════════
  // TESLA
  // ══════════════════════════════════════════════════════════════
  N({ id:'tesla-roadster-1', label:'Tesla Roadster (2008)', year:2008,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-roadster', familyKey:'tesla-roadster',
      type:'generation', bodyType:'sports', segment:'sports', zone:'sports',
      hp:248, engineType:'ev' }),
  N({ id:'tesla-model-s-1', label:'Tesla Model S (2012)', year:2012,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-model-s', familyKey:'tesla-model-s',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:670, engineType:'ev' }),
  N({ id:'tesla-model-s-plaid', label:'Tesla Model S Plaid (2021)', year:2021,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-model-s-plaid', familyKey:'tesla-model-s',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:1020, engineType:'ev' }),
  N({ id:'tesla-model-x-1', label:'Tesla Model X (2015)', year:2015,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-model-x', familyKey:'tesla-model-x',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:532, engineType:'ev' }),
  N({ id:'tesla-model-3-1', label:'Tesla Model 3 (2017)', year:2017,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-model-3', familyKey:'tesla-model-3',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'midsize_sed',
      hp:283, engineType:'ev' }),
  N({ id:'tesla-model-3-2', label:'Tesla Model 3 Highland (2023)', year:2023,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-model-3-highland', familyKey:'tesla-model-3',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'midsize_sed',
      hp:358, engineType:'ev' }),
  N({ id:'tesla-model-y-1', label:'Tesla Model Y (2020)', year:2020,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-model-y', familyKey:'tesla-model-y',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_compact',
      hp:358, engineType:'ev' }),
  N({ id:'tesla-cybertruck', label:'Tesla Cybertruck (2023)', year:2023,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-cybertruck', familyKey:'tesla-cybertruck',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:845, engineType:'ev' }),
  N({ id:'tesla-roadster-2', label:'Tesla Roadster Gen2 (2026)', year:2026,
      brandId:'tesla', brandName:'Tesla', modelSlug:'tesla-roadster-2', familyKey:'tesla-roadster',
      type:'generation', bodyType:'sports', segment:'sports', zone:'sports',
      hp:1000, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // POLESTAR (Volvo-spinoff)
  // ══════════════════════════════════════════════════════════════
  N({ id:'polestar-1', label:'Polestar 1 (2019)', year:2019,
      brandId:'polestar', brandName:'Polestar', modelSlug:'polestar-1', familyKey:'polestar-1',
      type:'generation', bodyType:'coupe', segment:'exec', zone:'gt_coupe',
      hp:600, engineType:'hybrid', codeName:'P1' }),
  N({ id:'polestar-2', label:'Polestar 2 (2020)', year:2020,
      brandId:'polestar', brandName:'Polestar', modelSlug:'polestar-2', familyKey:'polestar-2',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'midsize_sed',
      hp:300, engineType:'ev' }),
  N({ id:'polestar-3', label:'Polestar 3 (2023)', year:2023,
      brandId:'polestar', brandName:'Polestar', modelSlug:'polestar-3', familyKey:'polestar-3',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:517, engineType:'ev' }),
  N({ id:'polestar-4', label:'Polestar 4 (2023)', year:2023,
      brandId:'polestar', brandName:'Polestar', modelSlug:'polestar-4', familyKey:'polestar-4',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_compact',
      hp:544, engineType:'ev' }),
  N({ id:'polestar-6', label:'Polestar 6 (2026)', year:2026,
      brandId:'polestar', brandName:'Polestar', modelSlug:'polestar-6', familyKey:'polestar-6',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:884, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // RIVIAN
  // ══════════════════════════════════════════════════════════════
  N({ id:'rivian-r1t', label:'Rivian R1T (2022)', year:2022,
      brandId:'rivian', brandName:'Rivian', modelSlug:'rivian-r1t', familyKey:'rivian-r1',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:835, engineType:'ev' }),
  N({ id:'rivian-r1s', label:'Rivian R1S (2022)', year:2022,
      brandId:'rivian', brandName:'Rivian', modelSlug:'rivian-r1s', familyKey:'rivian-r1',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:835, engineType:'ev' }),
  N({ id:'rivian-r2', label:'Rivian R2 (2026)', year:2026,
      brandId:'rivian', brandName:'Rivian', modelSlug:'rivian-r2', familyKey:'rivian-r2',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:600, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // LUCID
  // ══════════════════════════════════════════════════════════════
  N({ id:'lucid-air', label:'Lucid Air (2021)', year:2021,
      brandId:'lucid', brandName:'Lucid', modelSlug:'lucid-air', familyKey:'lucid-air',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'flagship_sed',
      hp:819, engineType:'ev' }),
  N({ id:'lucid-air-sapphire', label:'Lucid Air Sapphire (2023)', year:2023,
      brandId:'lucid', brandName:'Lucid', modelSlug:'lucid-air-sapphire', familyKey:'lucid-air',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'flagship_sed',
      hp:1234, engineType:'ev' }),
  N({ id:'lucid-gravity', label:'Lucid Gravity (2024)', year:2024,
      brandId:'lucid', brandName:'Lucid', modelSlug:'lucid-gravity', familyKey:'lucid-gravity',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:828, engineType:'ev' }),
]

const newEdges = [
  // Tesla — внутренние цепочки
  E('e-tesla-road1-ms1',  'tesla-roadster-1',  'tesla-model-s-1',    'inspired_by', 0.8),
  E('e-tesla-ms1-msp',    'tesla-model-s-1',   'tesla-model-s-plaid','facelifted_to', 0.95),
  E('e-tesla-ms1-mx',     'tesla-model-s-1',   'tesla-model-x-1',    'inspired_by', 0.9),
  E('e-tesla-m3-1-2',     'tesla-model-3-1',   'tesla-model-3-2',    'facelifted_to', 0.95),
  E('e-tesla-m3-my',      'tesla-model-3-1',   'tesla-model-y-1',    'inspired_by', 0.92),
  E('e-tesla-road1-road2','tesla-roadster-1',  'tesla-roadster-2',   'evolves_into', 0.9),

  // Polestar — cross-brand с Volvo
  E('e-pst1-vs60',  'volvo-s60-3',   'polestar-1',  'inspired_by', 0.88),
  E('e-pst2-vxc40', 'volvo-xc40-1',  'polestar-2',  'inspired_by', 0.80),

  // Rivian внутри
  E('e-riv-r1t-r1s', 'rivian-r1t', 'rivian-r1s', 'inspired_by', 0.92),
  E('e-riv-r1t-r2',  'rivian-r1t', 'rivian-r2',  'inspired_by', 0.80),

  // Lucid внутри
  E('e-lucid-air-sap',  'lucid-air',  'lucid-air-sapphire', 'variant_of', 0.92),
  E('e-lucid-air-grav', 'lucid-air',  'lucid-gravity',      'inspired_by', 0.85),

  // Tesla — cross-brand heritage: Roadster был на шасси Lotus Elise
  E('e-tesla-road1-lotus', 'lotus-elise-s1', 'tesla-roadster-1', 'inspired_by', 0.78),

  // Polestar / Lucid конкурируют с Tesla Model S
  E('e-pst2-tesla-m3', 'tesla-model-3-1', 'polestar-2', 'inspired_by', 0.60),
]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n=>n.id===e.source)
    const t = g.nodes.find(n=>n.id===e.target)
    if (!s) { console.log('  SKIP edge ' + e.id + ': нет source ' + e.source); skipE++; continue }
    if (!t) { console.log('  SKIP edge ' + e.id + ': нет target ' + e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('EV Brands (Tesla/Polestar/Rivian/Lucid): +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
