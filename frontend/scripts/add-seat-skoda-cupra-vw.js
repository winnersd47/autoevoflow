/**
 * Добавляет расширение SEAT, Skoda, новый бренд Cupra, VW пробелы:
 * SEAT: Ibiza Mk5, Arona, Ateca
 * Cupra (новый бренд с 2018): Born EV, Formentor, Terramar
 * Skoda: Fabia (Gen1/4), Karoq, Kodiaq (Gen1/2), Enyaq EV
 * VW gaps: Passat B5, Tiguan Gen3, Touareg Gen2, Polo Mk3/5, Amarok Gen1
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
  // SEAT — расширение
  // ══════════════════════════════════════════════════════════════
  N({ id:'seat-ibiza-mk5', label:'SEAT Ibiza Mk5 (2017)', year:2017,
      brandId:'seat', brandName:'SEAT', modelSlug:'seat-ibiza-mk5', familyKey:'seat-ibiza',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:150, engineType:'i4t' }),
  N({ id:'seat-arona', label:'SEAT Arona (2017)', year:2017,
      brandId:'seat', brandName:'SEAT', modelSlug:'seat-arona', familyKey:'seat-arona',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:115, engineType:'i4t' }),
  N({ id:'seat-ateca', label:'SEAT Ateca (2016)', year:2016,
      brandId:'seat', brandName:'SEAT', modelSlug:'seat-ateca', familyKey:'seat-ateca',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:190, engineType:'i4t' }),
  N({ id:'seat-leon-mk4', label:'SEAT León Mk4 (2020)', year:2020,
      brandId:'seat', brandName:'SEAT', modelSlug:'seat-leon-mk4', familyKey:'seat-leon',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:245, engineType:'i4t' }),

  // ══════════════════════════════════════════════════════════════
  // CUPRA (отпочковался от SEAT в 2018)
  // ══════════════════════════════════════════════════════════════
  N({ id:'cupra-ateca', label:'Cupra Ateca (2018)', year:2018,
      brandId:'cupra', brandName:'Cupra', modelSlug:'cupra-ateca', familyKey:'cupra-ateca',
      type:'generation', bodyType:'suv', segment:'sports', zone:'suv_compact',
      hp:300, engineType:'i4t' }),
  N({ id:'cupra-formentor', label:'Cupra Formentor (2020)', year:2020,
      brandId:'cupra', brandName:'Cupra', modelSlug:'cupra-formentor', familyKey:'cupra-formentor',
      type:'generation', bodyType:'suv', segment:'sports', zone:'suv_compact',
      hp:310, engineType:'i4t' }),
  N({ id:'cupra-born', label:'Cupra Born (2021)', year:2021,
      brandId:'cupra', brandName:'Cupra', modelSlug:'cupra-born', familyKey:'cupra-born',
      type:'generation', bodyType:'hatchback', segment:'sports', zone:'hatchback',
      hp:231, engineType:'ev' }),
  N({ id:'cupra-terramar', label:'Cupra Terramar (2024)', year:2024,
      brandId:'cupra', brandName:'Cupra', modelSlug:'cupra-terramar', familyKey:'cupra-terramar',
      type:'generation', bodyType:'suv', segment:'sports', zone:'suv_compact',
      hp:300, engineType:'hybrid' }),

  // ══════════════════════════════════════════════════════════════
  // SKODA — расширение
  // ══════════════════════════════════════════════════════════════
  N({ id:'skoda-fabia-1', label:'Škoda Fabia Mk1 (1999)', year:1999,
      brandId:'skoda', brandName:'Škoda', modelSlug:'skoda-fabia-1', familyKey:'skoda-fabia',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:65, engineType:'i4' }),
  N({ id:'skoda-fabia-4', label:'Škoda Fabia Mk4 (2021)', year:2021,
      brandId:'skoda', brandName:'Škoda', modelSlug:'skoda-fabia-4', familyKey:'skoda-fabia',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:150, engineType:'i3t' }),
  N({ id:'skoda-karoq', label:'Škoda Karoq (2017)', year:2017,
      brandId:'skoda', brandName:'Škoda', modelSlug:'skoda-karoq', familyKey:'skoda-karoq',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:190, engineType:'i4t' }),
  N({ id:'skoda-kodiaq-1', label:'Škoda Kodiaq Gen1 (2016)', year:2016,
      brandId:'skoda', brandName:'Škoda', modelSlug:'skoda-kodiaq', familyKey:'skoda-kodiaq',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:240, engineType:'i4t' }),
  N({ id:'skoda-kodiaq-2', label:'Škoda Kodiaq Gen2 (2024)', year:2024,
      brandId:'skoda', brandName:'Škoda', modelSlug:'skoda-kodiaq-2', familyKey:'skoda-kodiaq',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:265, engineType:'i4t' }),
  N({ id:'skoda-enyaq', label:'Škoda Enyaq iV (2021)', year:2021,
      brandId:'skoda', brandName:'Škoda', modelSlug:'skoda-enyaq', familyKey:'skoda-enyaq',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:299, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // VW — пробелы в существующих цепочках
  // ══════════════════════════════════════════════════════════════
  N({ id:'vw-passat-b5', label:'VW Passat B5 (1996)', year:1996,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-passat-b5', familyKey:'vw-passat',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:150, engineType:'i4t' }),
  N({ id:'vw-polo-mk3', label:'VW Polo Mk3 (1994)', year:1994,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-polo-mk3', familyKey:'vw-polo',
      type:'generation', bodyType:'hatchback', segment:'city', zone:'hatchback',
      hp:90, engineType:'i4' }),
  N({ id:'vw-polo-mk5', label:'VW Polo Mk5 GTI (2009)', year:2009,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-polo-mk5', familyKey:'vw-polo',
      type:'generation', bodyType:'hatchback', segment:'sports', zone:'hatchback',
      hp:180, engineType:'i4t' }),
  N({ id:'vw-tiguan-3', label:'VW Tiguan Gen3 (2024)', year:2024,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-tiguan-3', familyKey:'vw-tiguan',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_compact',
      hp:265, engineType:'i4t' }),
  N({ id:'vw-touareg-2', label:'VW Touareg Gen2 (2010)', year:2010,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-touareg-2', familyKey:'vw-touareg',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:280, engineType:'v6t' }),
  N({ id:'vw-amarok-1', label:'VW Amarok Gen1 (2010)', year:2010,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-amarok-1', familyKey:'vw-amarok',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:163, engineType:'i4t' }),
]

const newEdges = [
  // SEAT
  E('e-seat-ibiza-mk3-5',  'seat-ibiza-mk3',    'seat-ibiza-mk5',     'evolves_into'),
  E('e-seat-ibiza5-arona', 'seat-ibiza-mk5',    'seat-arona',         'inspired_by', 0.82),
  E('e-seat-leon2-ateca',  'seat-leon-mk2',     'seat-ateca',         'inspired_by', 0.75),
  E('e-seat-leon3-mk4',    'seat-leon3',        'seat-leon-mk4',      'evolves_into'),
  // Ateca → Cupra Ateca (spin-off)
  E('e-seat-ateca-cupra',  'seat-ateca',        'cupra-ateca',        'derived_from', 0.92),

  // Cupra internal
  E('e-cupr-ateca-form',   'cupra-ateca',       'cupra-formentor',    'inspired_by', 0.80),
  E('e-cupr-born-terra',   'cupra-born',        'cupra-terramar',     'inspired_by', 0.75),
  // Cupra Born — EV on VW MEB platform
  E('e-cupr-born-id3',     'vw-id3',            'cupra-born',         'inspired_by', 0.90),

  // Skoda
  E('e-skod-fab1-4',       'skoda-fabia-1',     'skoda-fabia-4',      'evolves_into'),
  E('e-skod-oct-kar',      'skoda-oct-a4',      'skoda-karoq',        'inspired_by', 0.72),
  E('e-skod-kod1-2',       'skoda-kodiaq-1',    'skoda-kodiaq-2',     'evolves_into'),
  E('e-skod-kod1-enyaq',   'skoda-kodiaq-1',    'skoda-enyaq',        'inspired_by', 0.80),
  // Enyaq на VW MEB
  E('e-skod-enyaq-id4',    'vw-id4',            'skoda-enyaq',        'inspired_by', 0.88),
  // Kodiaq inspired by VW Tiguan (shared MQB platform)
  E('e-skod-kod-tig',      'vw-tiguan-2',       'skoda-kodiaq-1',     'inspired_by', 0.88),
  // Karoq inspired by VW Tiguan compact
  E('e-skod-kar-tig',      'vw-tiguan-1',       'skoda-karoq',        'inspired_by', 0.85),

  // VW Passat chain — заполняем пропуск B3→B5→B6
  E('e-vw-pass-b3-b5',     'vw-passat-b3',      'vw-passat-b5',       'evolves_into'),
  E('e-vw-pass-b5-b6',     'vw-passat-b5',      'vw-passat-b6',       'evolves_into'),

  // VW Polo chain — заполняем пропуск
  E('e-vw-polo-1-3',       'vw-polo-1',         'vw-polo-mk3',        'evolves_into'),
  E('e-vw-polo-3-5',       'vw-polo-mk3',       'vw-polo-mk5',        'evolves_into'),
  E('e-vw-polo-5-6',       'vw-polo-mk5',       'vw-polo-6',          'evolves_into'),

  // VW Tiguan chain
  E('e-vw-tig2-3',         'vw-tiguan-2',       'vw-tiguan-3',        'evolves_into'),

  // VW Touareg chain — заполняем Gen2
  E('e-vw-tour1-2',        'vw-touareg-1',      'vw-touareg-2',       'evolves_into'),
  E('e-vw-tour2-3',        'vw-touareg-2',      'vw-touareg-3',       'evolves_into'),

  // VW Amarok chain
  E('e-vw-amar1-2',        'vw-amarok-1',       'vw-amarok-2',        'evolves_into'),

  // Cross-brand: SEAT Ateca / Skoda Karoq / VW Tiguan — сёстры на MQB
  E('e-seat-ateca-tig',    'vw-tiguan-1',       'seat-ateca',         'inspired_by', 0.90),
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
console.log('SEAT/Skoda/Cupra/VW gaps: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
