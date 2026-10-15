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
  // ── Honda Prelude Gen.1 (1978) — SN AB, первый переднеприводный Honda купе
  N({ id:'honda-prelude-sn1', label:'Honda Prelude Gen.1 (1978)', year:1978,
      brandId:'honda', brandName:'Honda', modelSlug:'honda-prelude', familyKey:'honda-prelude',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:72, engineType:'i4', codeName:'SN / AB' }),

  // ── Honda Prelude Gen.2 (1982) — BA/BB 2nd gen
  N({ id:'honda-prelude-ba1', label:'Honda Prelude Gen.2 (1982)', year:1982,
      brandId:'honda', brandName:'Honda', modelSlug:'honda-prelude-ba1', familyKey:'honda-prelude',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:100, engineType:'i4', codeName:'BA/BB 2nd' }),

  // ── Honda Prelude Gen.3 (1987) — BA 3rd gen, первые 4WS
  N({ id:'honda-prelude-ba3', label:'Honda Prelude Gen.3 (1987)', year:1987,
      brandId:'honda', brandName:'Honda', modelSlug:'honda-prelude-ba3', familyKey:'honda-prelude',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:145, engineType:'i4', codeName:'BA3/BA4 3rd' }),

  // ── Honda Prelude Gen.4 (1992) — BB1/BB4, VTEC
  N({ id:'honda-prelude-bb1', label:'Honda Prelude Gen.4 (1992)', year:1992,
      brandId:'honda', brandName:'Honda', modelSlug:'honda-prelude-bb1', familyKey:'honda-prelude',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:190, engineType:'i4', codeName:'BB1/BB4 4th' }),

  // ── Honda Prelude Gen.5 (1997) — BB5/BB8, последнее классическое поколение
  N({ id:'honda-prelude-bb5', label:'Honda Prelude Gen.5 (1997)', year:1997,
      brandId:'honda', brandName:'Honda', modelSlug:'honda-prelude-bb5', familyKey:'honda-prelude',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:200, engineType:'i4', codeName:'BB5/BB8 5th' }),
]

const newEdges = [
  // Основная цепочка Prelude
  E('e-pre-1-2',  'honda-prelude-sn1', 'honda-prelude-ba1', 'evolves_into'),
  E('e-pre-2-3',  'honda-prelude-ba1', 'honda-prelude-ba3', 'evolves_into'),
  E('e-pre-3-4',  'honda-prelude-ba3', 'honda-prelude-bb1', 'evolves_into'),
  E('e-pre-4-5',  'honda-prelude-bb1', 'honda-prelude-bb5', 'evolves_into'),
  // Gen.5 → NCS 2026 Prelude revival
  E('e-pre-5-ncs','honda-prelude-bb5', 'ncs-honda-2026-honda-prelude-uk', 'inspired_by', 0.85),
  // Prelude Gen.4 / Gen.5 влиял на Accord купе (общая платформа)
  E('e-pre-bb1-acc','honda-prelude-bb1','honda-accord-cd', 'shares_platform', 0.80),
  // Integra DC2 и Prelude BB5 — конкурирующие купе Honda
  E('e-pre-bb5-dc2','honda-prelude-bb5','honda-integra-dc2','influenced_by', 0.72),
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
console.log('Honda Prelude: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
