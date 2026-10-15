/**
 * Добавляет пропущенные модели в существующие бренды:
 * Toyota: Tacoma (Gen1/3/4), Tundra (Gen1/2/3), Crown (3 эпохи), 4Runner (Gen1/5), bZ4X, FJ Cruiser
 * Chevrolet: Impala, Tahoe (Gen1/5), K5 Blazer → TrailBlazer → Blazer EV chain
 * Hyundai: IONIQ 9, Palisade
 * Kia: EV9, EV3, K8
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
  // TOYOTA — пикапы и Crown
  // ══════════════════════════════════════════════════════════════
  N({ id:'toyota-tacoma-1', label:'Toyota Tacoma Gen1 (1995)', year:1995,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-tacoma', familyKey:'toyota-tacoma',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:190, engineType:'i4' }),
  N({ id:'toyota-tacoma-3', label:'Toyota Tacoma Gen3 (2015)', year:2015,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-tacoma-3', familyKey:'toyota-tacoma',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:278, engineType:'v6' }),
  N({ id:'toyota-tacoma-4', label:'Toyota Tacoma Gen4 (2024)', year:2024,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-tacoma-4', familyKey:'toyota-tacoma',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:326, engineType:'i4t' }),
  N({ id:'toyota-tundra-1', label:'Toyota Tundra Gen1 (2000)', year:2000,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-tundra', familyKey:'toyota-tundra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:245, engineType:'v8' }),
  N({ id:'toyota-tundra-2', label:'Toyota Tundra Gen2 (2007)', year:2007,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-tundra-2', familyKey:'toyota-tundra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:381, engineType:'v8' }),
  N({ id:'toyota-tundra-3', label:'Toyota Tundra Gen3 (2022)', year:2022,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-tundra-3', familyKey:'toyota-tundra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:437, engineType:'hybrid' }),
  N({ id:'toyota-crown-s30', label:'Toyota Crown S30 (1955)', year:1955,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-crown-s30', familyKey:'toyota-crown',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'flagship_sed',
      hp:60, engineType:'i4' }),
  N({ id:'toyota-crown-ms110', label:'Toyota Crown MS110 (1979)', year:1979,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-crown-ms110', familyKey:'toyota-crown',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'flagship_sed',
      hp:165, engineType:'i6' }),
  N({ id:'toyota-crown-crossover', label:'Toyota Crown Crossover (2022)', year:2022,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-crown-crossover', familyKey:'toyota-crown',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:236, engineType:'hybrid' }),
  N({ id:'toyota-4runner-1', label:'Toyota 4Runner Gen1 (1984)', year:1984,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-4runner', familyKey:'toyota-4runner',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:150, engineType:'i4' }),
  N({ id:'toyota-4runner-5', label:'Toyota 4Runner Gen5 (2009)', year:2009,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-4runner-5', familyKey:'toyota-4runner',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:270, engineType:'v6' }),
  N({ id:'toyota-bz4x', label:'Toyota bZ4X (2022)', year:2022,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-bz4x', familyKey:'toyota-bz4x',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:215, engineType:'ev' }),
  N({ id:'toyota-fj-cruiser', label:'Toyota FJ Cruiser (2006)', year:2006,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-fj-cruiser', familyKey:'toyota-fj',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:239, engineType:'v6' }),

  // ══════════════════════════════════════════════════════════════
  // CHEVROLET — Impala, Tahoe, Blazer
  // ══════════════════════════════════════════════════════════════
  N({ id:'chev-impala-1', label:'Chevrolet Impala Gen1 (1958)', year:1958,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-impala', familyKey:'chev-impala',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:290, engineType:'v8' }),
  N({ id:'chev-impala-9', label:'Chevrolet Impala Gen9 (2014)', year:2014,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-impala-9', familyKey:'chev-impala',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:305, engineType:'v6' }),
  N({ id:'chev-tahoe-1', label:'Chevrolet Tahoe Gen1 (1995)', year:1995,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-tahoe', familyKey:'chev-tahoe',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:210, engineType:'v8' }),
  N({ id:'chev-tahoe-5', label:'Chevrolet Tahoe Gen5 (2021)', year:2021,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-tahoe-5', familyKey:'chev-tahoe',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:420, engineType:'v8' }),
  N({ id:'chev-k5-blazer', label:'Chevrolet K5 Blazer (1969)', year:1969,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-k5-blazer', familyKey:'chev-blazer',
      type:'generation', bodyType:'suv', segment:'offroad', zone:'suv_large',
      hp:300, engineType:'v8' }),
  N({ id:'chev-trailblazer', label:'Chevrolet TrailBlazer (2002)', year:2002,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-trailblazer', familyKey:'chev-blazer',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:291, engineType:'i6' }),
  N({ id:'chev-blazer-2019', label:'Chevrolet Blazer (2019)', year:2019,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-blazer-2019', familyKey:'chev-blazer',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:308, engineType:'v6' }),
  N({ id:'chev-blazer-ev', label:'Chevrolet Blazer EV (2024)', year:2024,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-blazer-ev', familyKey:'chev-blazer',
      type:'generation', bodyType:'suv', segment:'exec', zone:'electric',
      hp:557, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // HYUNDAI — расширение
  // ══════════════════════════════════════════════════════════════
  N({ id:'hyu-ioniq9', label:'Hyundai IONIQ 9 (2024)', year:2024,
      brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyu-ioniq9', familyKey:'hyundai-ioniq',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:422, engineType:'ev' }),
  N({ id:'hyu-palisade-1', label:'Hyundai Palisade Gen1 (2019)', year:2019,
      brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyu-palisade', familyKey:'hyundai-palisade',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:291, engineType:'v6' }),
  N({ id:'hyu-palisade-2', label:'Hyundai Palisade Gen2 (2024)', year:2024,
      brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyu-palisade-2', familyKey:'hyundai-palisade',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:277, engineType:'hybrid' }),

  // ══════════════════════════════════════════════════════════════
  // KIA — расширение
  // ══════════════════════════════════════════════════════════════
  N({ id:'kia-ev9', label:'Kia EV9 (2023)', year:2023,
      brandId:'kia', brandName:'Kia', modelSlug:'kia-ev9', familyKey:'kia-ev9',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:379, engineType:'ev' }),
  N({ id:'kia-ev3', label:'Kia EV3 (2024)', year:2024,
      brandId:'kia', brandName:'Kia', modelSlug:'kia-ev3', familyKey:'kia-ev3',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:204, engineType:'ev' }),
  N({ id:'kia-k8', label:'Kia K8 (2021)', year:2021,
      brandId:'kia', brandName:'Kia', modelSlug:'kia-k8', familyKey:'kia-k8',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:295, engineType:'v6' }),
]

const newEdges = [
  // Toyota Tacoma
  E('e-toy-tac1-3', 'toyota-tacoma-1',  'toyota-tacoma-3',   'evolves_into'),
  E('e-toy-tac3-4', 'toyota-tacoma-3',  'toyota-tacoma-4',   'evolves_into'),
  // Tacoma inspired Hilux rivalry
  E('e-toy-tac-hilux', 'toyota-tacoma-1', 'toyota-tacoma-3', 'evolves_into'),

  // Toyota Tundra
  E('e-toy-tun1-2', 'toyota-tundra-1',  'toyota-tundra-2',   'evolves_into'),
  E('e-toy-tun2-3', 'toyota-tundra-2',  'toyota-tundra-3',   'evolves_into'),

  // Toyota Crown
  E('e-toy-crown-s30-ms', 'toyota-crown-s30',  'toyota-crown-ms110', 'evolves_into'),
  E('e-toy-crown-ms-cx',  'toyota-crown-ms110','toyota-crown-crossover','inspired_by', 0.75),

  // Toyota 4Runner
  E('e-toy-4run1-5', 'toyota-4runner-1', 'toyota-4runner-5', 'evolves_into'),
  // 4Runner shares DNA with Land Cruiser
  E('e-toy-4run-lc',  'toyota-lc-60',   'toyota-4runner-1',  'inspired_by', 0.85),
  // bZ4X inspired by RAV4
  E('e-toy-bz4x-rav4', 'toyota-rav4-5', 'toyota-bz4x',       'inspired_by', 0.85),
  // FJ Cruiser is spiritual successor to Land Cruiser FJ
  E('e-toy-fjc-lc80',  'toyota-lc-80',  'toyota-fj-cruiser', 'inspired_by', 0.78),

  // Chevrolet Impala
  E('e-chev-imp1-9',  'chev-impala-1',   'chev-impala-9',     'inspired_by', 0.65),

  // Chevrolet Tahoe
  E('e-chev-tah1-5',  'chev-tahoe-1',    'chev-tahoe-5',      'evolves_into'),

  // Chevrolet Blazer chain
  E('e-chev-k5-trail', 'chev-k5-blazer', 'chev-trailblazer',  'inspired_by', 0.75),
  E('e-chev-trail-19', 'chev-trailblazer','chev-blazer-2019',  'inspired_by', 0.70),
  E('e-chev-bl19-ev',  'chev-blazer-2019','chev-blazer-ev',    'evolves_into'),

  // Chevrolet Tahoe → Cadillac Escalade shared platform (cross-brand)
  E('e-chev-tah1-escl', 'chev-tahoe-1',  'cadillac-escalade-1','inspired_by', 0.92),

  // Hyundai IONIQ family
  E('e-hyu-i5-i9',    'hyu-ioniq5',      'hyu-ioniq9',          'inspired_by', 0.88),
  E('e-hyu-i6-i9',    'hyu-ioniq6',      'hyu-ioniq9',          'inspired_by', 0.75),
  E('e-hyu-pal1-2',   'hyu-palisade-1',  'hyu-palisade-2',      'evolves_into'),

  // Kia EV family
  E('e-kia-ev6-ev9',  'kia-ev6-1',       'kia-ev9',             'inspired_by', 0.85),
  E('e-kia-ev6-ev3',  'kia-ev6-1',       'kia-ev3',             'inspired_by', 0.80),
  // Kia K8 — замена K7/Optima flagship
  E('e-kia-k5-k8',    'kia-k5-3',        'kia-k8',              'inspired_by', 0.70),
  // Hyundai IONIQ 5 / Kia EV6 — одна платформа E-GMP
  E('e-hyu-i5-kia-ev6','hyu-ioniq5',     'kia-ev6-1',           'inspired_by', 0.95),
  E('e-kia-ev9-hyu-i9','kia-ev9',        'hyu-ioniq9',          'inspired_by', 0.90),
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
console.log('Toyota/Chevy expansion + Hyundai/Kia EV: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
