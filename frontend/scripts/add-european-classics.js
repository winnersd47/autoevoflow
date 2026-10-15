/**
 * Добавляет европейские классические бренды:
 * Lancia (Fulvia → Stratos → 037 → Delta Integrale)
 * Alpine (A110 '62 → A310 → A610 → A110 revival → A290 EV)
 * Fiat (500 '57 → 500 revival → 500e; 124 Spider)
 * Mini (Classic 1959 → Mk3 → BMW revival 2001 → Cooper SE → Countryman EV)
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
  // LANCIA
  // ══════════════════════════════════════════════════════════════
  N({ id:'lancia-fulvia', label:'Lancia Fulvia (1963)', year:1963,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-fulvia', familyKey:'lancia-fulvia',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe',
      hp:115, engineType:'v4' }),
  N({ id:'lancia-stratos', label:'Lancia Stratos HF (1973)', year:1973,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-stratos', familyKey:'lancia-stratos',
      type:'generation', bodyType:'coupe', segment:'rally', zone:'sports',
      hp:190, engineType:'v6', codeName:'HF Stradale' }),
  N({ id:'lancia-beta-montecarlo', label:'Lancia Beta Montecarlo (1975)', year:1975,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-beta-montecarlo', familyKey:'lancia-beta',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe',
      hp:120, engineType:'i4' }),
  N({ id:'lancia-037', label:'Lancia 037 (1982)', year:1982,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-037', familyKey:'lancia-037',
      type:'generation', bodyType:'coupe', segment:'rally', zone:'sports',
      hp:205, engineType:'i4t', codeName:'Rally 037' }),
  N({ id:'lancia-delta-1', label:'Lancia Delta (1979)', year:1979,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-delta', familyKey:'lancia-delta',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:85, engineType:'i4' }),
  N({ id:'lancia-delta-integrale', label:'Lancia Delta HF Integrale (1987)', year:1987,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-delta-integrale', familyKey:'lancia-delta',
      type:'generation', bodyType:'hatchback', segment:'rally', zone:'sports',
      hp:185, engineType:'i4t', codeName:'HF Integrale' }),
  N({ id:'lancia-delta-evo2', label:'Lancia Delta HF Evo II (1993)', year:1993,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-delta-evo2', familyKey:'lancia-delta',
      type:'generation', bodyType:'hatchback', segment:'rally', zone:'sports',
      hp:215, engineType:'i4t', codeName:'Evo II' }),

  // ══════════════════════════════════════════════════════════════
  // ALPINE
  // ══════════════════════════════════════════════════════════════
  N({ id:'alpine-a110-1962', label:'Alpine A110 (1962)', year:1962,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a110-1962', familyKey:'alpine-a110',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:100, engineType:'i4' }),
  N({ id:'alpine-a110-1600s', label:'Alpine A110 1600S (1968)', year:1968,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a110-1600s', familyKey:'alpine-a110',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:125, engineType:'i4' }),
  N({ id:'alpine-a310', label:'Alpine A310 (1971)', year:1971,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a310', familyKey:'alpine-a310',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe',
      hp:140, engineType:'v6' }),
  N({ id:'alpine-a610', label:'Alpine A610 Turbo (1991)', year:1991,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a610', familyKey:'alpine-a610',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe',
      hp:250, engineType:'v6t' }),
  N({ id:'alpine-a110-2017', label:'Alpine A110 (2017)', year:2017,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a110-2017', familyKey:'alpine-a110-mod',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:252, engineType:'i4t' }),
  N({ id:'alpine-a110-r', label:'Alpine A110 R (2022)', year:2022,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a110-r', familyKey:'alpine-a110-mod',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:300, engineType:'i4t', codeName:'R' }),
  N({ id:'alpine-a290', label:'Alpine A290 (2024)', year:2024,
      brandId:'alpine', brandName:'Alpine', modelSlug:'alpine-a290', familyKey:'alpine-a290',
      type:'generation', bodyType:'hatchback', segment:'sports', zone:'hatchback',
      hp:218, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // FIAT
  // ══════════════════════════════════════════════════════════════
  N({ id:'fiat-500-1957', label:'Fiat 500 Nuova (1957)', year:1957,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-500-1957', familyKey:'fiat-500',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:13, engineType:'i2' }),
  N({ id:'fiat-500-2007', label:'Fiat 500 (2007)', year:2007,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-500-2007', familyKey:'fiat-500',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:100, engineType:'i4' }),
  N({ id:'fiat-500e', label:'Fiat 500e (2020)', year:2020,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-500e', familyKey:'fiat-500',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'electric',
      hp:118, engineType:'ev' }),
  N({ id:'fiat-124-spider-1966', label:'Fiat 124 Spider (1966)', year:1966,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-124-spider', familyKey:'fiat-124',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:89, engineType:'i4' }),
  N({ id:'fiat-tipo-1988', label:'Fiat Tipo (1988)', year:1988,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-tipo', familyKey:'fiat-tipo',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:80, engineType:'i4' }),
  N({ id:'fiat-punto-1993', label:'Fiat Punto (1993)', year:1993,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-punto', familyKey:'fiat-punto',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:75, engineType:'i4' }),
  N({ id:'fiat-abarth-124', label:'Abarth 124 Spider (2016)', year:2016,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-abarth-124', familyKey:'fiat-124',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:170, engineType:'i4t', codeName:'Abarth' }),

  // ══════════════════════════════════════════════════════════════
  // MINI
  // ══════════════════════════════════════════════════════════════
  N({ id:'mini-classic-mk1', label:'Mini Mk1 (1959)', year:1959,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-classic-mk1', familyKey:'mini-classic',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:34, engineType:'i4' }),
  N({ id:'mini-cooper-s-mk1', label:'Mini Cooper S (1963)', year:1963,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-cooper-s-mk1', familyKey:'mini-classic',
      type:'generation', bodyType:'hatchback', segment:'sports', zone:'hatchback',
      hp:70, engineType:'i4' }),
  N({ id:'mini-classic-mk3', label:'Mini Mk3 / 1000 (1969)', year:1969,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-classic-mk3', familyKey:'mini-classic',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:40, engineType:'i4' }),
  N({ id:'mini-cooper-2001', label:'BMW Mini Cooper (2001)', year:2001,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-cooper-2001', familyKey:'mini-bmw',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:115, engineType:'i4' }),
  N({ id:'mini-cooper-s-r53', label:'Mini Cooper S R53 (2002)', year:2002,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-cooper-s-r53', familyKey:'mini-bmw',
      type:'generation', bodyType:'hatchback', segment:'sports', zone:'hatchback',
      hp:163, engineType:'i4t', codeName:'R53' }),
  N({ id:'mini-jcw', label:'Mini JCW (2006)', year:2006,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-jcw', familyKey:'mini-bmw',
      type:'generation', bodyType:'hatchback', segment:'sports', zone:'hatchback',
      hp:211, engineType:'i4t', codeName:'JCW' }),
  N({ id:'mini-countryman-r60', label:'Mini Countryman R60 (2010)', year:2010,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-countryman-r60', familyKey:'mini-countryman',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:184, engineType:'i4t' }),
  N({ id:'mini-cooper-se', label:'Mini Cooper SE (2019)', year:2019,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-cooper-se', familyKey:'mini-ev',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'electric',
      hp:181, engineType:'ev' }),
  N({ id:'mini-aceman', label:'Mini Aceman (2024)', year:2024,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-aceman', familyKey:'mini-ev',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:204, engineType:'ev' }),
  N({ id:'mini-countryman-ev', label:'Mini Countryman EV (2024)', year:2024,
      brandId:'mini', brandName:'Mini', modelSlug:'mini-countryman-ev', familyKey:'mini-countryman',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:313, engineType:'ev' }),
]

const newEdges = [
  // Lancia
  E('e-lan-fulv-strat',    'lancia-fulvia',        'lancia-stratos',         'inspired_by', 0.75),
  E('e-lan-strat-037',     'lancia-stratos',       'lancia-037',             'inspired_by', 0.80),
  E('e-lan-beta-037',      'lancia-beta-montecarlo','lancia-037',            'inspired_by', 0.70),
  E('e-lan-dlt1-integ',    'lancia-delta-1',       'lancia-delta-integrale', 'evolves_into'),
  E('e-lan-integ-evo2',    'lancia-delta-integrale','lancia-delta-evo2',     'evolves_into'),
  // Cross-brand: Lancia Delta Integrale вдохновила Mitsubishi Evo
  E('e-lan-integ-mitevo',  'lancia-delta-integrale','mit-lancer-evo1',       'inspired_by', 0.80),
  // Cross-brand: Lancia Stratos использовала двигатель Ferrari Dino
  E('e-lan-strat-ferr-dino','ferrari-308-gtb',     'lancia-stratos',         'inspired_by', 0.65),

  // Alpine
  E('e-alp-a110-62-68',    'alpine-a110-1962',     'alpine-a110-1600s',      'evolves_into'),
  E('e-alp-a110-a310',     'alpine-a110-1600s',    'alpine-a310',            'evolves_into'),
  E('e-alp-a310-a610',     'alpine-a310',          'alpine-a610',            'evolves_into'),
  E('e-alp-a610-a110mod',  'alpine-a610',          'alpine-a110-2017',       'inspired_by', 0.85),
  E('e-alp-a110mod-r',     'alpine-a110-2017',     'alpine-a110-r',          'variant_of'),
  E('e-alp-a110mod-a290',  'alpine-a110-2017',     'alpine-a290',            'inspired_by', 0.72),
  // Cross-brand: Alpine была дочкой Renault
  E('e-alp-renault-link',  'alpine-a610',          'alpine-a110-2017',       'inspired_by', 0.85),

  // Fiat 500
  E('e-fiat-500-57-07',    'fiat-500-1957',        'fiat-500-2007',          'inspired_by', 0.90),
  E('e-fiat-500-07-e',     'fiat-500-2007',        'fiat-500e',              'evolves_into'),
  // Fiat 124 Spider → Abarth
  E('e-fiat-124-abarth',   'fiat-124-spider-1966', 'fiat-abarth-124',        'inspired_by', 0.85),
  // Cross-brand: Abarth 124 / Mazda MX-5 ND — общая платформа
  E('e-fiat-124-mx5',      'fiat-abarth-124',      'mazda-mx5-nd',           'inspired_by', 0.92),

  // Mini classic chain
  E('e-mini-mk1-cs63',     'mini-classic-mk1',     'mini-cooper-s-mk1',      'variant_of'),
  E('e-mini-mk1-mk3',      'mini-classic-mk1',     'mini-classic-mk3',       'facelifted_to'),
  // BMW-Revival: классический Mini → BMW Mini (духовное наследование)
  E('e-mini-mk3-bmw01',    'mini-classic-mk3',     'mini-cooper-2001',       'inspired_by', 0.88),
  E('e-mini-01-sr53',      'mini-cooper-2001',     'mini-cooper-s-r53',      'variant_of'),
  E('e-mini-01-jcw',       'mini-cooper-2001',     'mini-jcw',               'variant_of'),
  E('e-mini-01-ctry',      'mini-cooper-2001',     'mini-countryman-r60',    'inspired_by', 0.80),
  E('e-mini-01-se',        'mini-cooper-2001',     'mini-cooper-se',         'evolves_into'),
  E('e-mini-se-aceman',    'mini-cooper-se',        'mini-aceman',            'inspired_by', 0.80),
  E('e-mini-ctry-ev',      'mini-countryman-r60',  'mini-countryman-ev',     'evolves_into'),
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
console.log('European Classics (Lancia/Alpine/Fiat/Mini): +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
