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
  // ── Концепт-предшественник i8 ────────────────────────────────────────────
  N({ id:'concept-bmw-vision-eff', label:'BMW Vision EfficientDynamics (2009)', year:2009,
      brandId:'bmw', brandName:'BMW', modelSlug:'bmw-vision-eff', familyKey:'bmw-i8',
      type:'generation', bodyType:'concept', segment:'sports', zone:'concept',
      hp:356, engineType:'hybrid', isConcept:true,
      codeName:'Vision EfficientDynamics' }),

  // ── BMW i8 производство ───────────────────────────────────────────────────
  N({ id:'bmw-i8', label:'BMW i8 (2014)', year:2014,
      brandId:'bmw', brandName:'BMW', modelSlug:'bmw-i8', familyKey:'bmw-i8',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:362, engineType:'hybrid' }),

  // ── i8 Roadster ───────────────────────────────────────────────────────────
  N({ id:'bmw-i8-roadster', label:'BMW i8 Roadster (2018)', year:2018,
      brandId:'bmw', brandName:'BMW', modelSlug:'bmw-i8-roadster', familyKey:'bmw-i8',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:374, engineType:'hybrid' }),
]

const newEdges = [
  // Концепт → серийный
  E('e-bmw-veff-i8',      'concept-bmw-vision-eff', 'bmw-i8',          'concept_to_production'),
  // i3 и i8 — близнецы одного поколения BMW i (LifeDrive платформа)
  E('e-bmw-i3-i8',        'bmw-i3-i01',             'bmw-i8',          'inspired_by', 0.82),
  // Родстер — вариант купе
  E('e-bmw-i8-roadster',  'bmw-i8',                 'bmw-i8-roadster', 'variant_of'),
  // i8 заложил спортивное ДНК BMW i → iX
  E('e-bmw-i8-ix',        'bmw-i8',                 'bmw-ix-i20',      'inspired_by', 0.68),
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
console.log('BMW i8: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
