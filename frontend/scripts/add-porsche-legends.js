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
  // ── 550 Spyder (1953) — машина Джеймса Дина, первый гоночный Porsche ─────
  N({ id:'porsche-550-spyder', label:'Porsche 550 Spyder (1953)', year:1953,
      brandId:'porsche', brandName:'Porsche', modelSlug:'porsche-550', familyKey:'porsche-550',
      type:'generation', bodyType:'roadster', segment:'racing', zone:'open_top',
      hp:110, engineType:'flat4', codeName:'550 Spyder' }),

  // ── 718 RSK (1957) — преемник 550 ─────────────────────────────────────────
  N({ id:'porsche-718-rsk', label:'Porsche 718 RSK (1957)', year:1957,
      brandId:'porsche', brandName:'Porsche', modelSlug:'porsche-718-rsk', familyKey:'porsche-550',
      type:'generation', bodyType:'roadster', segment:'racing', zone:'open_top',
      hp:142, engineType:'flat4' }),

  // ── 904 GTS (1963) — первый серийный Porsche для омологации ──────────────
  N({ id:'porsche-904-gts', label:'Porsche 904 GTS (1963)', year:1963,
      brandId:'porsche', brandName:'Porsche', modelSlug:'porsche-904', familyKey:'porsche-904',
      type:'generation', bodyType:'coupe', segment:'racing', zone:'supercar',
      hp:185, engineType:'flat6' }),

  // ── 917 (1970) — Ле-Ман, Стив МакКуин ───────────────────────────────────
  N({ id:'porsche-917', label:'Porsche 917 (1970)', year:1970,
      brandId:'porsche', brandName:'Porsche', modelSlug:'porsche-917', familyKey:'porsche-917',
      type:'generation', bodyType:'coupe', segment:'racing', zone:'hypercar',
      hp:580, engineType:'flat12', codeName:'917K / 917LH' }),

  // ── 911 Carrera RS 2.7 (1973) — культовый лёгкий 911 ────────────────────
  N({ id:'porsche-911-rs27', label:'Porsche 911 Carrera RS 2.7 (1973)', year:1973,
      brandId:'porsche', brandName:'Porsche', modelSlug:'porsche-911-rs27', familyKey:'porsche-911',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:210, engineType:'flat6', codeName:'RS 2.7' }),

  // ── Panamera 971 Phase II / 972 (2021) ───────────────────────────────────
  N({ id:'porsche-panamera-972', label:'Porsche Panamera 971.2 / 972 (2021)', year:2021,
      brandId:'porsche', brandName:'Porsche', modelSlug:'porsche-panamera-972', familyKey:'porsche-panamera',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'gt_coupe',
      hp:630, engineType:'v8t' }),
]

const newEdges = [
  // 550 Spyder цепочка
  E('e-por-356a-550',   'porsche-356-a',      'porsche-550-spyder', 'derived_from', 0.85),
  E('e-por-550-718',    'porsche-550-spyder', 'porsche-718-rsk',    'evolves_into'),
  E('e-por-718-904',    'porsche-718-rsk',    'porsche-904-gts',    'evolves_into'),
  // 917 — вершина гоночной программы
  E('e-por-904-917',    'porsche-904-gts',    'porsche-917',        'inspired_by', 0.85),
  // 917 → Carrera GT (гоночное ДНК Porsche)
  E('e-por-917-cgt',    'porsche-917',        'porsche-carrera-gt', 'inspired_by', 0.75),
  // Carrera RS 2.7 — ответвление от G-Body
  E('e-por-g-rs27',     'p911-g',             'porsche-911-rs27',   'derived_from', 0.92),
  // RS 2.7 → 930 Turbo (RS → Racing → Turbo программа)
  E('e-por-rs27-930',   'porsche-911-rs27',   'p911-turbo-930',     'inspired_by', 0.82),
  // Panamera 971 → 972
  E('e-por-pan971-972', 'porsche-panamera-971','porsche-panamera-972','evolves_into'),
]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n => n.id === e.source)
    const t = g.nodes.find(n => n.id === e.target)
    if (!s) { console.log('  SKIP edge ' + e.id + ': нет source ' + e.source); skipE++; continue }
    if (!t) { console.log('  SKIP edge ' + e.id + ': нет target ' + e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Porsche legends: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
