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
  // ── Isuzu Gemini Gen.1 (1974) — GM T-car, ребейдж Opel Kadett C ──────────
  N({ id:'isuzu-gemini-1', label:'Isuzu Gemini Gen.1 (1974)', year:1974,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-gemini', familyKey:'isuzu-gemini',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:80, engineType:'i4', codeName:'PF50 / Florian' }),

  // ── Isuzu Gemini Gen.2 (1985) — ребейдж Opel Kadett E / Astra F ─────────
  N({ id:'isuzu-gemini-2', label:'Isuzu Gemini Gen.2 (1985)', year:1985,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-gemini-2', familyKey:'isuzu-gemini',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:115, engineType:'i4', codeName:'JT150 / ZZR' }),

  // ── Isuzu Piazza (1981) — дизайн Джуджаро, GT-купе ──────────────────────
  N({ id:'isuzu-piazza', label:'Isuzu Piazza (1981)', year:1981,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-piazza', familyKey:'isuzu-piazza',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe',
      hp:150, engineType:'i4t', codeName:'JR130 / Impulse' }),

  // ── Isuzu Trooper Gen.1 (1981) — рамный SUV ──────────────────────────────
  N({ id:'isuzu-trooper-1', label:'Isuzu Trooper Gen.1 (1981)', year:1981,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-trooper', familyKey:'isuzu-trooper',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:95, engineType:'i4', codeName:'UBS14 / Bighorn' }),

  // ── Isuzu Trooper Gen.2 (1991) — Opel Monterey / Honda Horizon ───────────
  N({ id:'isuzu-trooper-2', label:'Isuzu Trooper Gen.2 (1991)', year:1991,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-trooper-2', familyKey:'isuzu-trooper',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:175, engineType:'v6', codeName:'UBS26 / UBS73' }),

  // ── Isuzu Rodeo (1990) — платформа с Honda Passport ──────────────────────
  N({ id:'isuzu-rodeo-1', label:'Isuzu Rodeo Gen.1 (1990)', year:1990,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-rodeo', familyKey:'isuzu-rodeo',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:175, engineType:'v6', codeName:'UES / Amigo' }),

  // ── Isuzu D-Max Gen.1 (2002) — глобальный пикап ──────────────────────────
  N({ id:'isuzu-dmax-1', label:'Isuzu D-Max Gen.1 (2002)', year:2002,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-dmax', familyKey:'isuzu-dmax',
      type:'generation', bodyType:'pickup', segment:'midsize', zone:'pickup',
      hp:130, engineType:'i4', codeName:'TFR / TFS' }),

  // ── Isuzu D-Max Gen.2 (2011) ─────────────────────────────────────────────
  N({ id:'isuzu-dmax-2', label:'Isuzu D-Max Gen.2 (2011)', year:2011,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-dmax-2', familyKey:'isuzu-dmax',
      type:'generation', bodyType:'pickup', segment:'midsize', zone:'pickup',
      hp:163, engineType:'i4', codeName:'RT50 / 4JJ1-TC' }),

  // ── Isuzu D-Max Gen.3 (2019) ─────────────────────────────────────────────
  N({ id:'isuzu-dmax-3', label:'Isuzu D-Max Gen.3 (2019)', year:2019,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-dmax-3', familyKey:'isuzu-dmax',
      type:'generation', bodyType:'pickup', segment:'midsize', zone:'pickup',
      hp:190, engineType:'i4', codeName:'RG / 4JJ3-TCX' }),

  // ── Isuzu MU-X Gen.1 (2013) — SUV на базе D-Max ─────────────────────────
  N({ id:'isuzu-mux-1', label:'Isuzu MU-X Gen.1 (2013)', year:2013,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-mux', familyKey:'isuzu-mux',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:163, engineType:'i4', codeName:'TF-series' }),

  // ── Isuzu MU-X Gen.2 (2020) ──────────────────────────────────────────────
  N({ id:'isuzu-mux-2', label:'Isuzu MU-X Gen.2 (2020)', year:2020,
      brandId:'isuzu', brandName:'Isuzu', modelSlug:'isuzu-mux-2', familyKey:'isuzu-mux',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:190, engineType:'i4', codeName:'RG-series' }),
]

const newEdges = [
  // Gemini линия
  E('e-isu-gem1-gem2', 'isuzu-gemini-1', 'isuzu-gemini-2', 'evolves_into'),
  // Trooper линия
  E('e-isu-tro1-tro2', 'isuzu-trooper-1', 'isuzu-trooper-2', 'evolves_into'),
  // D-Max линия
  E('e-isu-dmax1-2',   'isuzu-dmax-1', 'isuzu-dmax-2', 'evolves_into'),
  E('e-isu-dmax2-3',   'isuzu-dmax-2', 'isuzu-dmax-3', 'evolves_into'),
  // MU-X на базе D-Max
  E('e-isu-dmax1-mux1','isuzu-dmax-1',  'isuzu-mux-1',  'derived_from', 0.88),
  E('e-isu-dmax3-mux2','isuzu-dmax-3',  'isuzu-mux-2',  'derived_from', 0.88),
  E('e-isu-mux1-mux2', 'isuzu-mux-1',   'isuzu-mux-2',  'evolves_into'),
  // Rodeo → Trooper (похожие SUV в линейке)
  E('e-isu-rod-tro2',  'isuzu-rodeo-1', 'isuzu-trooper-2','inspired_by', 0.55),

  // ── Кросс-брендовые ────────────────────────────────────────────────────────
  // Gemini Gen.1 — GM T-car платформа (= Opel Kadett C / Chevrolet Chevette)
  E('e-isu-gem1-kadc', 'isuzu-gemini-1', 'opel-kadett-c', 'shares_platform', 0.95),
  // Gemini Gen.2 — Opel Kadett E / J-body
  E('e-isu-gem2-kade', 'isuzu-gemini-2', 'opel-kadett-e', 'shares_platform', 0.92),
  // Trooper Gen.2 вдохновил Chevrolet Blazer (RHD-рынки = ребейдж)
  E('e-isu-tro2-blaz', 'isuzu-trooper-2','chevy-blazer-k5-2','inspired_by', 0.75),
]

// Проверяем якоря
;['opel-kadett-c','opel-kadett-e','chevy-blazer-k5-2'].forEach(id => {
  const n = g.nodes.find(n => n.id === id)
  console.log(id, '→', n ? `ЕСТЬ (${n.year})` : 'ОТСУТСТВУЕТ')
})

let addedN=0, addedE=0, skipN=0, skipE=0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node:', n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n => n.id === e.source)
    const t = g.nodes.find(n => n.id === e.target)
    if (!s) { console.log('  SKIP edge '+e.id+': нет source '+e.source); skipE++; continue }
    if (!t) { console.log('  SKIP edge '+e.id+': нет target '+e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge:', e.id); skipE++ }
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Isuzu: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
