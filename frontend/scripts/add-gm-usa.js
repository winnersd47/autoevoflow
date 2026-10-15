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
  // ══ BUICK ════════════════════════════════════════════════════════════════

  // ── Buick Riviera Gen.1 (1963) — один из красивейших американских авто ──
  N({ id:'buick-riviera-1', label:'Buick Riviera Gen.1 (1963)', year:1963,
      brandId:'buick', brandName:'Buick', modelSlug:'buick-riviera', familyKey:'buick-riviera',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:325, engineType:'v8', codeName:'Riviera' }),
  N({ id:'buick-riviera-3', label:'Buick Riviera Gen.3 (1971)', year:1971,
      brandId:'buick', brandName:'Buick', modelSlug:'buick-riviera-3', familyKey:'buick-riviera',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:330, engineType:'v8', codeName:'Boat-tail' }),

  // ── Buick LeSabre (1959) — массовый полноразмерный ───────────────────────
  N({ id:'buick-lesabre-1', label:'Buick LeSabre Gen.1 (1959)', year:1959,
      brandId:'buick', brandName:'Buick', modelSlug:'buick-lesabre', familyKey:'buick-lesabre',
      type:'generation', bodyType:'sedan', segment:'full-size', zone:'sedan',
      hp:250, engineType:'v8' }),

  // ── Buick Skylark (1961) — компактный ────────────────────────────────────
  N({ id:'buick-skylark-1', label:'Buick Skylark Gen.1 (1961)', year:1961,
      brandId:'buick', brandName:'Buick', modelSlug:'buick-skylark', familyKey:'buick-skylark',
      type:'generation', bodyType:'coupe', segment:'compact', zone:'muscle',
      hp:155, engineType:'v8' }),

  // ── Buick Enclave (2008) — современный флагман SUV ────────────────────────
  N({ id:'buick-enclave-1', label:'Buick Enclave Gen.1 (2008)', year:2008,
      brandId:'buick', brandName:'Buick', modelSlug:'buick-enclave', familyKey:'buick-enclave',
      type:'generation', bodyType:'suv', segment:'large_suv', zone:'suv',
      hp:288, engineType:'v6' }),

  // ══ OLDSMOBILE ══════════════════════════════════════════════════════════

  // ── Oldsmobile Toronado (1966) — первый FWD с V8 в США ───────────────────
  N({ id:'olds-toronado-1', label:'Oldsmobile Toronado Gen.1 (1966)', year:1966,
      brandId:'oldsmobile', brandName:'Oldsmobile', modelSlug:'olds-toronado', familyKey:'olds-toronado',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:385, engineType:'v8', codeName:'Toronado' }),

  // ── Oldsmobile 442 (1964) — мышечный малыш ───────────────────────────────
  N({ id:'olds-442-1', label:'Oldsmobile 442 (1964)', year:1964,
      brandId:'oldsmobile', brandName:'Oldsmobile', modelSlug:'olds-442', familyKey:'olds-442',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:310, engineType:'v8', codeName:'4-4-2' }),

  // ── Oldsmobile Cutlass Supreme (1966) ────────────────────────────────────
  N({ id:'olds-cutlass-1', label:'Oldsmobile Cutlass (1966)', year:1966,
      brandId:'oldsmobile', brandName:'Oldsmobile', modelSlug:'olds-cutlass', familyKey:'olds-cutlass',
      type:'generation', bodyType:'coupe', segment:'mid', zone:'muscle',
      hp:350, engineType:'v8' }),

  // ── Oldsmobile Aurora (1994) — последний технологичный флагман ───────────
  N({ id:'olds-aurora-1', label:'Oldsmobile Aurora Gen.1 (1994)', year:1994,
      brandId:'oldsmobile', brandName:'Oldsmobile', modelSlug:'olds-aurora', familyKey:'olds-aurora',
      type:'generation', bodyType:'coupe', segment:'exec', zone:'gt_coupe',
      hp:250, engineType:'v8' }),

  // ══ PLYMOUTH ═════════════════════════════════════════════════════════════

  // ── Plymouth Barracuda (1964) — первый pony car ───────────────────────────
  N({ id:'plymouth-barracuda-1', label:'Plymouth Barracuda Gen.1 (1964)', year:1964,
      brandId:'plymouth', brandName:'Plymouth', modelSlug:'plymouth-barracuda', familyKey:'plymouth-barracuda',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:180, engineType:'i6', codeName:'Barracuda' }),
  N({ id:'plymouth-barracuda-3', label:'Plymouth Barracuda Gen.3 (1970)', year:1970,
      brandId:'plymouth', brandName:'Plymouth', modelSlug:'plymouth-barracuda-3', familyKey:'plymouth-barracuda',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:425, engineType:'v8', codeName:"'Cuda 440/426 Hemi" }),

  // ── Plymouth Road Runner (1968) — доступный мышечный ─────────────────────
  N({ id:'plymouth-roadrunner', label:"Plymouth Road Runner (1968)", year:1968,
      brandId:'plymouth', brandName:'Plymouth', modelSlug:'plymouth-roadrunner', familyKey:'plymouth-muscle',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:426, engineType:'v8', codeName:'Superbird' }),

  // ── Plymouth Superbird (1970) — NASCAR омологация ─────────────────────────
  N({ id:'plymouth-superbird', label:'Plymouth Superbird (1970)', year:1970,
      brandId:'plymouth', brandName:'Plymouth', modelSlug:'plymouth-superbird', familyKey:'plymouth-muscle',
      type:'generation', bodyType:'coupe', segment:'racing', zone:'muscle',
      hp:425, engineType:'v8', codeName:'Superbird / Daytona' }),
]

const newEdges = [
  // Buick
  E('e-bui-riv1-riv3', 'buick-riviera-1',    'buick-riviera-3',    'evolves_into'),
  // Riviera → Toronado (E-body / FWD платформа)
  E('e-bui-riv-toro',  'buick-riviera-1',    'olds-toronado-1',    'shares_platform', 0.88),
  // LeSabre → Riviera (один дивизион GM)
  E('e-bui-les-riv',   'buick-lesabre-1',    'buick-riviera-1',    'inspired_by', 0.65),
  // Skylark → 442 (A-body платформа)
  E('e-bui-sky-442',   'buick-skylark-1',    'olds-442-1',         'shares_platform', 0.85),

  // Oldsmobile
  E('e-olds-442-cut',  'olds-442-1',         'olds-cutlass-1',     'shares_platform', 0.80),
  // Toronado → Buick Riviera Gen3 (E-body)
  E('e-olds-toro-riv3','olds-toronado-1',    'buick-riviera-3',    'shares_platform', 0.90),
  // Aurora → Cadillac Seville (G-body/Aurora)
  E('e-olds-aur-cad',  'olds-aurora-1',      'cadillac-cts-v1',   'inspired_by', 0.65),

  // Plymouth
  E('e-ply-bar1-bar3', 'plymouth-barracuda-1','plymouth-barracuda-3','evolves_into'),
  E('e-ply-rr-sb',     'plymouth-roadrunner', 'plymouth-superbird', 'derived_from', 0.88),
  // Barracuda → Challenger (E-body платформа, одно поколение)
  E('e-ply-bar3-chal', 'plymouth-barracuda-3','dodge-challenger-1970','shares_platform', 0.95),
  // Road Runner вдохновил Dodge Charger Daytona (NASCAR wing cars)
  E('e-ply-rr-daytona','plymouth-superbird',  'dodge-charger-1969', 'inspired_by', 0.72),
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
console.log('Buick+Oldsmobile+Plymouth: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:',g.nodes.length,'nodes,',g.edges.length,'edges')
