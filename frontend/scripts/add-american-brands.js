/**
 * Добавляет американские бренды:
 * Jeep (Willys → CJ → Wrangler YJ/TJ/JK/JL → Cherokee → Grand Cherokee → Gladiator)
 * Pontiac (GTO, Firebird/Trans Am, G8 — бренд ликвидирован 2010)
 * Lincoln (Continental, Navigator)
 * Hummer original (H1 → H2 → H3 → GMC Hummer EV link)
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
  // JEEP
  // ══════════════════════════════════════════════════════════════
  N({ id:'jeep-willys-mb', label:'Willys MB (1941)', year:1941,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-willys', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:60, engineType:'i4' }),
  N({ id:'jeep-cj5', label:'Jeep CJ-5 (1954)', year:1954,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-cj5', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:90, engineType:'i6' }),
  N({ id:'jeep-cj7', label:'Jeep CJ-7 (1976)', year:1976,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-cj7', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:110, engineType:'i6' }),
  N({ id:'jeep-wrangler-yj', label:'Jeep Wrangler YJ (1987)', year:1987,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-wrangler-yj', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:115, engineType:'i6' }),
  N({ id:'jeep-wrangler-tj', label:'Jeep Wrangler TJ (1997)', year:1997,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-wrangler-tj', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:190, engineType:'i6' }),
  N({ id:'jeep-wrangler-jk', label:'Jeep Wrangler JK (2007)', year:2007,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-wrangler-jk', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:285, engineType:'v6' }),
  N({ id:'jeep-wrangler-jl', label:'Jeep Wrangler JL (2018)', year:2018,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-wrangler-jl', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:285, engineType:'i4t' }),
  N({ id:'jeep-wrangler-4xe', label:'Jeep Wrangler 4xe (2021)', year:2021,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-wrangler-4xe', familyKey:'jeep-wrangler',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:375, engineType:'hybrid' }),
  N({ id:'jeep-cherokee-xj', label:'Jeep Cherokee XJ (1984)', year:1984,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-cherokee-xj', familyKey:'jeep-cherokee',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_mid',
      hp:177, engineType:'i6' }),
  N({ id:'jeep-grand-cherokee-zj', label:'Jeep Grand Cherokee ZJ (1992)', year:1992,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-grand-cherokee-zj', familyKey:'jeep-grand-cherokee',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:215, engineType:'v8' }),
  N({ id:'jeep-grand-cherokee-wk2', label:'Jeep Grand Cherokee WK2 (2010)', year:2010,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-grand-cherokee-wk2', familyKey:'jeep-grand-cherokee',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:360, engineType:'v8' }),
  N({ id:'jeep-grand-cherokee-wl', label:'Jeep Grand Cherokee WL (2022)', year:2022,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-grand-cherokee-wl', familyKey:'jeep-grand-cherokee',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:510, engineType:'v8t', codeName:'Trackhawk' }),
  N({ id:'jeep-gladiator', label:'Jeep Gladiator (2019)', year:2019,
      brandId:'jeep', brandName:'Jeep', modelSlug:'jeep-gladiator', familyKey:'jeep-gladiator',
      type:'generation', bodyType:'pickup', segment:'offroad', zone:'pickup',
      hp:285, engineType:'i4t' }),

  // ══════════════════════════════════════════════════════════════
  // PONTIAC (discontinued 2010)
  // ══════════════════════════════════════════════════════════════
  N({ id:'pontiac-gto-1', label:'Pontiac GTO Gen1 (1964)', year:1964,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-gto', familyKey:'pontiac-gto',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:348, engineType:'v8' }),
  N({ id:'pontiac-gto-judge', label:'Pontiac GTO The Judge (1969)', year:1969,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-gto-judge', familyKey:'pontiac-gto',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:370, engineType:'v8' }),
  N({ id:'pontiac-gto-2004', label:'Pontiac GTO (2004)', year:2004,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-gto-2004', familyKey:'pontiac-gto',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:350, engineType:'v8' }),
  N({ id:'pontiac-firebird-1', label:'Pontiac Firebird Gen1 (1967)', year:1967,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-firebird', familyKey:'pontiac-firebird',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:325, engineType:'v8' }),
  N({ id:'pontiac-trans-am-1969', label:'Pontiac Trans Am (1969)', year:1969,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-trans-am', familyKey:'pontiac-firebird',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:335, engineType:'v8' }),
  N({ id:'pontiac-firebird-3', label:'Pontiac Firebird Gen3 (1982)', year:1982,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-firebird-3', familyKey:'pontiac-firebird',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:190, engineType:'v8' }),
  N({ id:'pontiac-trans-am-ws6', label:'Pontiac Trans Am WS6 (1999)', year:1999,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-trans-am-ws6', familyKey:'pontiac-firebird',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'gt_coupe',
      hp:325, engineType:'v8' }),
  N({ id:'pontiac-g8-gt', label:'Pontiac G8 GT (2008)', year:2008,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-g8', familyKey:'pontiac-g8',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:361, engineType:'v8' }),

  // ══════════════════════════════════════════════════════════════
  // LINCOLN
  // ══════════════════════════════════════════════════════════════
  N({ id:'lincoln-continental-1', label:'Lincoln Continental Gen1 (1961)', year:1961,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-continental', familyKey:'lincoln-continental',
      type:'generation', bodyType:'sedan', segment:'luxury', zone:'flagship_sed',
      hp:300, engineType:'v8' }),
  N({ id:'lincoln-continental-6', label:'Lincoln Continental Gen6 (2017)', year:2017,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-continental-6', familyKey:'lincoln-continental',
      type:'generation', bodyType:'sedan', segment:'luxury', zone:'flagship_sed',
      hp:400, engineType:'v6t' }),
  N({ id:'lincoln-town-car', label:'Lincoln Town Car (1981)', year:1981,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-town-car', familyKey:'lincoln-town-car',
      type:'generation', bodyType:'sedan', segment:'luxury', zone:'flagship_sed',
      hp:150, engineType:'v8' }),
  N({ id:'lincoln-navigator-1', label:'Lincoln Navigator Gen1 (1997)', year:1997,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-navigator', familyKey:'lincoln-navigator',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:230, engineType:'v8' }),
  N({ id:'lincoln-navigator-4', label:'Lincoln Navigator Gen4 (2018)', year:2018,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-navigator-4', familyKey:'lincoln-navigator',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:450, engineType:'v6t' }),

  // ══════════════════════════════════════════════════════════════
  // HUMMER (original brand, GM ликвидировал в 2010)
  // ══════════════════════════════════════════════════════════════
  N({ id:'hummer-h1', label:'Hummer H1 (1992)', year:1992,
      brandId:'hummer', brandName:'Hummer', modelSlug:'hummer-h1', familyKey:'hummer-h1',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:195, engineType:'v8' }),
  N({ id:'hummer-h2', label:'Hummer H2 (2002)', year:2002,
      brandId:'hummer', brandName:'Hummer', modelSlug:'hummer-h2', familyKey:'hummer-h2',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:316, engineType:'v8' }),
  N({ id:'hummer-h3', label:'Hummer H3 (2005)', year:2005,
      brandId:'hummer', brandName:'Hummer', modelSlug:'hummer-h3', familyKey:'hummer-h3',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_mid',
      hp:242, engineType:'i5' }),
]

const newEdges = [
  // Jeep Wrangler chain
  E('e-jeep-wb-cj5',   'jeep-willys-mb',      'jeep-cj5',            'evolves_into'),
  E('e-jeep-cj5-cj7',  'jeep-cj5',            'jeep-cj7',            'evolves_into'),
  E('e-jeep-cj7-yj',   'jeep-cj7',            'jeep-wrangler-yj',    'evolves_into'),
  E('e-jeep-yj-tj',    'jeep-wrangler-yj',    'jeep-wrangler-tj',    'evolves_into'),
  E('e-jeep-tj-jk',    'jeep-wrangler-tj',    'jeep-wrangler-jk',    'evolves_into'),
  E('e-jeep-jk-jl',    'jeep-wrangler-jk',    'jeep-wrangler-jl',    'evolves_into'),
  E('e-jeep-jl-4xe',   'jeep-wrangler-jl',    'jeep-wrangler-4xe',   'variant_of',  0.88),
  E('e-jeep-jl-glad',  'jeep-wrangler-jl',    'jeep-gladiator',      'variant_of',  0.85),
  // Jeep Cherokee → Grand Cherokee
  E('e-jeep-cher-gc',  'jeep-cherokee-xj',    'jeep-grand-cherokee-zj',   'inspired_by', 0.80),
  E('e-jeep-gc-zj-wk2','jeep-grand-cherokee-zj','jeep-grand-cherokee-wk2','evolves_into'),
  E('e-jeep-gc-wk2-wl','jeep-grand-cherokee-wk2','jeep-grand-cherokee-wl','evolves_into'),
  // Cross-brand: Jeep Wrangler <-> Land Rover Defender (параллельные иконы)
  E('e-jeep-lr-cross',  'jeep-wrangler-jl',   'jeep-cherokee-xj',    'inspired_by', 0.50),

  // Pontiac GTO
  E('e-pont-gto1-judge','pontiac-gto-1',       'pontiac-gto-judge',   'evolves_into'),
  E('e-pont-gto1-2004', 'pontiac-gto-1',       'pontiac-gto-2004',    'inspired_by', 0.70),
  // Pontiac Firebird / Trans Am
  E('e-pont-fb1-ta69',  'pontiac-firebird-1',  'pontiac-trans-am-1969','variant_of'),
  E('e-pont-fb1-fb3',   'pontiac-firebird-1',  'pontiac-firebird-3',  'evolves_into'),
  E('e-pont-fb3-ws6',   'pontiac-firebird-3',  'pontiac-trans-am-ws6','variant_of'),
  // Cross-brand: Pontiac G8 GT вдохновил Chevrolet SS (обе от Holden)
  E('e-pont-g8-chss',   'pontiac-g8-gt',       'chevy-camaro-gen6',   'inspired_by', 0.60),

  // Lincoln Continental
  E('e-linc-cont1-6',   'lincoln-continental-1','lincoln-continental-6','inspired_by', 0.65),
  // Lincoln Navigator
  E('e-linc-nav1-4',    'lincoln-navigator-1', 'lincoln-navigator-4', 'evolves_into'),
  // Cross-brand: Navigator shared platform with Ford Expedition
  E('e-linc-nav-ford',  'lincoln-navigator-1', 'lincoln-town-car',    'inspired_by', 0.55),

  // Hummer chain
  E('e-hum-h1-h2',      'hummer-h1',           'hummer-h2',           'inspired_by', 0.80),
  E('e-hum-h2-h3',      'hummer-h2',           'hummer-h3',           'inspired_by', 0.75),
  // GMC Hummer EV — духовный наследник H1 (cross-brand)
  E('e-hum-h1-gmc-ev',  'hummer-h1',           'gmc-hummer-ev',       'inspired_by', 0.70),
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
console.log('American Brands (Jeep/Pontiac/Lincoln/Hummer): +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
