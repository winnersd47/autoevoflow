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
  // ── Pathfinder Gen.1 (WD21, 1986) — первый японский конкурент Bronco/Blazer
  N({ id:'nissan-pathfinder-wd21', label:'Nissan Pathfinder Gen.1 (1986)', year:1986,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-pathfinder', familyKey:'nissan-pathfinder',
      type:'generation', bodyType:'suv', segment:'off_road', zone:'suv',
      hp:120, engineType:'v6', codeName:'WD21 Terrano' }),

  // ── Pathfinder Gen.2 (R50, 1996) — переход на несущий кузов
  N({ id:'nissan-pathfinder-r50', label:'Nissan Pathfinder Gen.2 (1996)', year:1996,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-pathfinder-r50', familyKey:'nissan-pathfinder',
      type:'generation', bodyType:'suv', segment:'mid_suv', zone:'suv',
      hp:168, engineType:'v6', codeName:'R50' }),

  // ── Pathfinder Gen.3 (R51, 2004) — возврат к рамной конструкции
  N({ id:'nissan-pathfinder-r51', label:'Nissan Pathfinder Gen.3 (2004)', year:2004,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-pathfinder-r51', familyKey:'nissan-pathfinder',
      type:'generation', bodyType:'suv', segment:'mid_suv', zone:'suv',
      hp:265, engineType:'v6', codeName:'R51' }),

  // ── Pathfinder Gen.4 (R52, 2013) — унификация с Altima (CVT)
  N({ id:'nissan-pathfinder-r52', label:'Nissan Pathfinder Gen.4 (2013)', year:2013,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-pathfinder-r52', familyKey:'nissan-pathfinder',
      type:'generation', bodyType:'suv', segment:'mid_suv', zone:'suv',
      hp:284, engineType:'v6', codeName:'R52' }),
]

const newEdges = [
  // Цепочка Pathfinder
  E('e-pf-wd21-r50',  'nissan-pathfinder-wd21', 'nissan-pathfinder-r50', 'evolves_into'),
  E('e-pf-r50-r51',   'nissan-pathfinder-r50',  'nissan-pathfinder-r51', 'evolves_into'),
  E('e-pf-r51-r52',   'nissan-pathfinder-r51',  'nissan-pathfinder-r52', 'evolves_into'),
  // WD21 базировался на Patrol Y60 (общая рамная платформа)
  E('e-pf-patrol-wd21','nissan-patrol-y60',      'nissan-pathfinder-wd21','derived_from', 0.85),
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
console.log('Nissan Pathfinder: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
