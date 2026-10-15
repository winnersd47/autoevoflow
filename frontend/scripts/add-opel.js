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
  // ── Kadett A/B (1962) — первый современный Opel ──────────────────────────
  N({ id:'opel-kadett-a', label:'Kadett A (1962)', year:1962,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-kadett-a', familyKey:'opel-kadett',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'hatchback',
      hp:40, engineType:'i4' }),
  N({ id:'opel-kadett-c', label:'Kadett C (1973)', year:1973,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-kadett-c', familyKey:'opel-kadett',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:75, engineType:'i4' }),
  N({ id:'opel-kadett-d', label:'Kadett D (1979)', year:1979,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-kadett-d', familyKey:'opel-kadett',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:75, engineType:'i4' }),
  N({ id:'opel-kadett-e', label:'Kadett E (1984)', year:1984,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-kadett-e', familyKey:'opel-kadett',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:115, engineType:'i4', codeName:'GSi 16V' }),

  // ── Astra F/G/H/J/K ──────────────────────────────────────────────────────
  N({ id:'opel-astra-f', label:'Astra F (1991)', year:1991,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-astra-f', familyKey:'opel-astra',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:136, engineType:'i4' }),
  N({ id:'opel-astra-g', label:'Astra G (1998)', year:1998,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-astra-g', familyKey:'opel-astra',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:147, engineType:'i4' }),
  N({ id:'opel-astra-h', label:'Astra H (2004)', year:2004,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-astra-h', familyKey:'opel-astra',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:200, engineType:'i4t', codeName:'OPC' }),
  N({ id:'opel-astra-j', label:'Astra J (2009)', year:2009,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-astra-j', familyKey:'opel-astra',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:280, engineType:'i4t', codeName:'OPC' }),
  N({ id:'opel-astra-k', label:'Astra K (2015)', year:2015,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-astra-k', familyKey:'opel-astra',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:200, engineType:'i4t' }),

  // ── Vectra A/B/C ──────────────────────────────────────────────────────────
  N({ id:'opel-vectra-a', label:'Vectra A (1988)', year:1988,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-vectra-a', familyKey:'opel-vectra',
      type:'generation', bodyType:'sedan', segment:'mid', zone:'sedan',
      hp:150, engineType:'i4' }),
  N({ id:'opel-vectra-b', label:'Vectra B (1995)', year:1995,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-vectra-b', familyKey:'opel-vectra',
      type:'generation', bodyType:'sedan', segment:'mid', zone:'sedan',
      hp:136, engineType:'i4' }),
  N({ id:'opel-vectra-c', label:'Vectra C (2002)', year:2002,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-vectra-c', familyKey:'opel-vectra',
      type:'generation', bodyType:'sedan', segment:'mid', zone:'sedan',
      hp:210, engineType:'v6' }),

  // ── Omega A/B ─────────────────────────────────────────────────────────────
  N({ id:'opel-omega-a', label:'Omega A (1986)', year:1986,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-omega-a', familyKey:'opel-omega',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:177, engineType:'i6' }),
  N({ id:'opel-omega-b', label:'Omega B (1994)', year:1994,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-omega-b', familyKey:'opel-omega',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:326, engineType:'v8', codeName:'Lotus Omega 377hp' }),

  // ── Corsa A/B/C ───────────────────────────────────────────────────────────
  N({ id:'opel-corsa-a', label:'Corsa A (1982)', year:1982,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-corsa-a', familyKey:'opel-corsa',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:75, engineType:'i4' }),
  N({ id:'opel-corsa-b', label:'Corsa B (1993)', year:1993,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-corsa-b', familyKey:'opel-corsa',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:85, engineType:'i4' }),
  N({ id:'opel-corsa-c', label:'Corsa C (2000)', year:2000,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-corsa-c', familyKey:'opel-corsa',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:125, engineType:'i4' }),

  // ── Manta (1970) — культовый спорт-купе ──────────────────────────────────
  N({ id:'opel-manta-a', label:'Manta A (1970)', year:1970,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-manta', familyKey:'opel-manta',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:90, engineType:'i4' }),
  N({ id:'opel-manta-b', label:'Manta B (1975)', year:1975,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-manta-b', familyKey:'opel-manta',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:105, engineType:'i4' }),

  // ── Insignia (2008) — преемник Vectra ─────────────────────────────────────
  N({ id:'opel-insignia-a', label:'Insignia A (2008)', year:2008,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-insignia', familyKey:'opel-insignia',
      type:'generation', bodyType:'sedan', segment:'mid', zone:'sedan',
      hp:325, engineType:'v6t', codeName:'OPC' }),
  N({ id:'opel-insignia-b', label:'Insignia B (2017)', year:2017,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-insignia-b', familyKey:'opel-insignia',
      type:'generation', bodyType:'sedan', segment:'mid', zone:'sedan',
      hp:260, engineType:'i4t', codeName:'GSi' }),
]

const newEdges = [
  // Kadett цепочка
  E('e-op-ka-kc',  'opel-kadett-a',  'opel-kadett-c',  'evolves_into'),
  E('e-op-kc-kd',  'opel-kadett-c',  'opel-kadett-d',  'evolves_into'),
  E('e-op-kd-ke',  'opel-kadett-d',  'opel-kadett-e',  'evolves_into'),
  // Kadett E → Astra F (переименование)
  E('e-op-ke-af',  'opel-kadett-e',  'opel-astra-f',   'facelifted_to', 0.95),
  // Astra цепочка
  E('e-op-af-ag',  'opel-astra-f',   'opel-astra-g',   'evolves_into'),
  E('e-op-ag-ah',  'opel-astra-g',   'opel-astra-h',   'evolves_into'),
  E('e-op-ah-aj',  'opel-astra-h',   'opel-astra-j',   'evolves_into'),
  E('e-op-aj-ak',  'opel-astra-j',   'opel-astra-k',   'evolves_into'),
  // Vectra цепочка
  E('e-op-va-vb',  'opel-vectra-a',  'opel-vectra-b',  'evolves_into'),
  E('e-op-vb-vc',  'opel-vectra-b',  'opel-vectra-c',  'evolves_into'),
  // Vectra C → Insignia A
  E('e-op-vc-ia',  'opel-vectra-c',  'opel-insignia-a','evolves_into'),
  E('e-op-ia-ib',  'opel-insignia-a','opel-insignia-b', 'evolves_into'),
  // Omega цепочка
  E('e-op-oa-ob',  'opel-omega-a',   'opel-omega-b',   'evolves_into'),
  // Corsa цепочка
  E('e-op-ca-cb',  'opel-corsa-a',   'opel-corsa-b',   'evolves_into'),
  E('e-op-cb-cc',  'opel-corsa-b',   'opel-corsa-c',   'evolves_into'),
  // Manta
  E('e-op-ma-mb',  'opel-manta-a',   'opel-manta-b',   'evolves_into'),
  E('e-op-ka-ma',  'opel-kadett-a',  'opel-manta-a',   'derived_from', 0.85),
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
console.log('Opel: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:',g.nodes.length,'nodes,',g.edges.length,'edges')
