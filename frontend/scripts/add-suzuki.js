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
  // ── Alto (1979) — первый массовый kei-car Suzuki ──────────────────────────
  N({ id:'suzuki-alto-1', label:'Suzuki Alto Gen.1 (1979)', year:1979,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-alto', familyKey:'suzuki-alto',
      type:'generation', bodyType:'hatchback', segment:'kei', zone:'hatchback',
      hp:28, engineType:'i3' }),
  N({ id:'suzuki-alto-5', label:'Suzuki Alto Gen.5 (1994)', year:1994,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-alto-5', familyKey:'suzuki-alto',
      type:'generation', bodyType:'hatchback', segment:'kei', zone:'hatchback',
      hp:58, engineType:'i3t', codeName:'Works' }),

  // ── Swift / Cultus (1983) — глобальный хэтч ──────────────────────────────
  N({ id:'suzuki-swift-1', label:'Suzuki Swift Gen.1 (1983)', year:1983,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-swift', familyKey:'suzuki-swift',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:101, engineType:'i4', codeName:'GTi' }),
  N({ id:'suzuki-swift-3', label:'Suzuki Swift Gen.3 (2005)', year:2005,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-swift-3', familyKey:'suzuki-swift',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:125, engineType:'i4', codeName:'Sport' }),
  N({ id:'suzuki-swift-4', label:'Suzuki Swift Gen.4 (2011)', year:2011,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-swift-4', familyKey:'suzuki-swift',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:136, engineType:'i4', codeName:'Sport' }),
  N({ id:'suzuki-swift-5', label:'Suzuki Swift Gen.5 (2017)', year:2017,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-swift-5', familyKey:'suzuki-swift',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:130, engineType:'i4', codeName:'Sport' }),

  // ── Jimny (1970) — культовый компактный внедорожник ──────────────────────
  N({ id:'suzuki-jimny-1', label:'Suzuki Jimny Gen.1 (1970)', year:1970,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-jimny', familyKey:'suzuki-jimny',
      type:'generation', bodyType:'suv', segment:'off_road', zone:'suv',
      hp:28, engineType:'i2', codeName:'LJ10' }),
  N({ id:'suzuki-jimny-3', label:'Suzuki Jimny Gen.3 (1998)', year:1998,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-jimny-3', familyKey:'suzuki-jimny',
      type:'generation', bodyType:'suv', segment:'off_road', zone:'suv',
      hp:85, engineType:'i3t', codeName:'JB23' }),
  N({ id:'suzuki-jimny-4', label:'Suzuki Jimny Gen.4 (2018)', year:2018,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-jimny-4', familyKey:'suzuki-jimny',
      type:'generation', bodyType:'suv', segment:'off_road', zone:'suv',
      hp:102, engineType:'i4', codeName:'JB64 / JB74' }),

  // ── Vitara (1988) — компактный кроссовер ─────────────────────────────────
  N({ id:'suzuki-vitara-1', label:'Suzuki Vitara Gen.1 (1988)', year:1988,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-vitara', familyKey:'suzuki-vitara',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv',
      hp:95, engineType:'i4', codeName:'SJ410 / Escudo' }),
  N({ id:'suzuki-vitara-4', label:'Suzuki Vitara Gen.4 (2015)', year:2015,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-vitara-4', familyKey:'suzuki-vitara',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv',
      hp:140, engineType:'i4t' }),

  // ── Cappuccino (1991) — kei sports car ───────────────────────────────────
  N({ id:'suzuki-cappuccino', label:'Suzuki Cappuccino (1991)', year:1991,
      brandId:'suzuki', brandName:'Suzuki', modelSlug:'suzuki-cappuccino', familyKey:'suzuki-sports',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:64, engineType:'i3t', codeName:'EA11R / EA21R' }),
]

const newEdges = [
  // Alto цепочка
  E('e-suz-alt1-alt5', 'suzuki-alto-1',   'suzuki-alto-5',   'evolves_into'),
  // Swift цепочка
  E('e-suz-sw1-sw3',   'suzuki-swift-1',  'suzuki-swift-3',  'evolves_into'),
  E('e-suz-sw3-sw4',   'suzuki-swift-3',  'suzuki-swift-4',  'evolves_into'),
  E('e-suz-sw4-sw5',   'suzuki-swift-4',  'suzuki-swift-5',  'evolves_into'),
  // Jimny цепочка
  E('e-suz-jim1-jim3', 'suzuki-jimny-1',  'suzuki-jimny-3',  'evolves_into'),
  E('e-suz-jim3-jim4', 'suzuki-jimny-3',  'suzuki-jimny-4',  'evolves_into'),
  // Vitara цепочка
  E('e-suz-vit1-vit4', 'suzuki-vitara-1', 'suzuki-vitara-4', 'evolves_into'),
  // Jimny вдохновлён духом Jeep (оба — компактные рамные внедорожники)
  E('e-suz-jimny-jeep','suzuki-jimny-4',  'jeep-wrangler-jl','influenced_by', 0.55),
  // Cappuccino → Honda Beat / MR2 (kei sports era)
  E('e-suz-cap-s2k',   'suzuki-cappuccino','honda-s2000-ap1', 'inspired_by', 0.60),
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
console.log('Suzuki: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:',g.nodes.length,'nodes,',g.edges.length,'edges')
