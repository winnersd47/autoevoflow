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
  // ── Saab 92 (1950) — первый автомобиль Saab, самолётные корни ────────────
  N({ id:'saab-92', label:'Saab 92 (1950)', year:1950,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-92', familyKey:'saab-92',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'sedan',
      hp:25, engineType:'i2', codeName:'92 / 92A / 92B' }),

  // ── Saab 96 (1960) — ралли-легенда Эрика Карлссона ───────────────────────
  N({ id:'saab-96', label:'Saab 96 (1960)', year:1960,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-96', familyKey:'saab-92',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'sedan',
      hp:65, engineType:'v4', codeName:'96 / Monte Carlo 850' }),

  // ── Saab 99 (1968) — первый современный Saab, турбо 1977 ─────────────────
  N({ id:'saab-99', label:'Saab 99 (1968)', year:1968,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-99', familyKey:'saab-99',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'sedan',
      hp:145, engineType:'i4t', codeName:'99 Turbo' }),

  // ── Saab 900 Gen.1 (1978) — культовый переднеприводный ───────────────────
  N({ id:'saab-900-og', label:'Saab 900 Gen.1 (1978)', year:1978,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-900', familyKey:'saab-900',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:175, engineType:'i4t', codeName:'900 Turbo' }),

  // ── Saab 9000 (1984) — платформа Tipo Quattro с Alfa 164 ─────────────────
  N({ id:'saab-9000', label:'Saab 9000 (1984)', year:1984,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-9000', familyKey:'saab-9000',
      type:'generation', bodyType:'hatchback', segment:'exec', zone:'gt_coupe',
      hp:225, engineType:'i4t', codeName:'9000 Aero' }),

  // ── Saab 900 Gen.2 (1993) — первый на платформе GM/Opel Vectra A ─────────
  N({ id:'saab-900-gen2', label:'Saab 900 Gen.2 (1993)', year:1993,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-900-gen2', familyKey:'saab-900',
      type:'generation', bodyType:'convertible', segment:'compact', zone:'open_top',
      hp:185, engineType:'i4t', codeName:'900 SE Turbo' }),

  // ── Saab 9-5 Gen.1 (1997) — флагман, Epsilon I платформа ─────────────────
  N({ id:'saab-9-5-gen1', label:'Saab 9-5 Gen.1 (1997)', year:1997,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-9-5', familyKey:'saab-9-5',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:260, engineType:'i4t', codeName:'9-5 Aero' }),

  // ── Saab 9-3 Gen.1 (1998) — преемник 900, платформа GM2900/Astra G ───────
  N({ id:'saab-9-3-gen1', label:'Saab 9-3 Gen.1 (1998)', year:1998,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-9-3', familyKey:'saab-9-3',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:210, engineType:'i4t', codeName:'9-3 Viggen' }),

  // ── Saab 9-3 Gen.2 (2002) — Epsilon I, SportCombi ────────────────────────
  N({ id:'saab-9-3-gen2', label:'Saab 9-3 Gen.2 (2002)', year:2002,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-9-3-gen2', familyKey:'saab-9-3',
      type:'generation', bodyType:'sedan', segment:'mid', zone:'sedan',
      hp:250, engineType:'i4t', codeName:'Aero XWD' }),

  // ── Saab 9-5 Gen.2 (2010) — последний Saab перед банкротством ─────────────
  N({ id:'saab-9-5-gen2', label:'Saab 9-5 Gen.2 (2010)', year:2010,
      brandId:'saab', brandName:'Saab', modelSlug:'saab-9-5-gen2', familyKey:'saab-9-5',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:300, engineType:'i4t', codeName:'Aero XWD' }),
]

const newEdges = [
  // Основная цепочка Saab
  E('e-saab-92-96',    'saab-92',       'saab-96',       'evolves_into'),
  E('e-saab-96-99',    'saab-96',       'saab-99',       'evolves_into'),
  E('e-saab-99-900',   'saab-99',       'saab-900-og',   'evolves_into'),
  E('e-saab-900-9000', 'saab-900-og',   'saab-9000',     'inspired_by', 0.70),
  E('e-saab-900-900g2','saab-900-og',   'saab-900-gen2', 'evolves_into'),
  E('e-saab-900g2-93', 'saab-900-gen2', 'saab-9-3-gen1', 'evolves_into'),
  E('e-saab-93g1-93g2','saab-9-3-gen1', 'saab-9-3-gen2', 'evolves_into'),
  E('e-saab-95g1-95g2','saab-9-5-gen1', 'saab-9-5-gen2', 'evolves_into'),
  E('e-saab-9000-95',  'saab-9000',     'saab-9-5-gen1', 'evolves_into'),

  // ── Кросс-брендовые (платформы) ───────────────────────────────────────────
  // Saab 9000 — платформа Tipo Quattro совместно с Alfa Romeo 164 (1987)
  E('e-saab-9000-alfa164', 'saab-9000',     'alfa-164',      'shares_platform', 0.95),
  // Saab 900 Gen.2 базировался на Opel Vectra A (GM C-body)
  E('e-saab-900g2-vecta',  'opel-vectra-a', 'saab-900-gen2', 'derived_from',    0.88),
  // Saab 9-3 Gen.1 — GM2900 (Astra G)
  E('e-saab-93g1-astrag',  'opel-astra-g',  'saab-9-3-gen1', 'shares_platform', 0.90),
  // Saab 9-3 Gen.2 и 9-5 Gen.1 — GM Epsilon I (Vectra C)
  E('e-saab-93g2-vectc',   'opel-vectra-c', 'saab-9-3-gen2', 'shares_platform', 0.88),
  E('e-saab-95g1-vectb',   'opel-vectra-b', 'saab-9-5-gen1', 'shares_platform', 0.85),
]

let addedN=0, addedE=0, skipN=0, skipE=0
for(const n of newNodes){
  if(!existN.has(n.id)){g.nodes.push(n);addedN++}
  else{console.log('  SKIP node:',n.id);skipN++}
}
for(const e of newEdges){
  if(!existE.has(e.id)){
    const s=g.nodes.find(n=>n.id===e.source), t=g.nodes.find(n=>n.id===e.target)
    if(!s){console.log('  SKIP edge '+e.id+': нет source '+e.source);skipE++;continue}
    if(!t){console.log('  SKIP edge '+e.id+': нет target '+e.target);skipE++;continue}
    g.edges.push(e);addedE++
  }else{console.log('  SKIP edge:',e.id);skipE++}
}
fs.writeFileSync(GRAPH, JSON.stringify(g,null,2))
console.log('Saab: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:',g.nodes.length,'nodes,',g.edges.length,'edges')
