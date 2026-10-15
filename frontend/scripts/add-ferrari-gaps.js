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
  // ── Ferrari 250 GTO (1962) ── самый дорогой автомобиль в истории ─────────
  N({ id:'ferrari-250gto', label:'Ferrari 250 GTO (1962)', year:1962,
      brandId:'ferrari', brandName:'Ferrari', modelSlug:'ferrari-250gto', familyKey:'ferrari-250',
      type:'generation', bodyType:'coupe', segment:'racing', zone:'supercar',
      hp:302, engineType:'v12', codeName:'250 GTO' }),

  // ── Ferrari 275 GTB (1964) — мост между 250 GT и Daytona ─────────────────
  N({ id:'ferrari-275gtb', label:'Ferrari 275 GTB (1964)', year:1964,
      brandId:'ferrari', brandName:'Ferrari', modelSlug:'ferrari-275gtb', familyKey:'ferrari-275',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'supercar',
      hp:280, engineType:'v12' }),

  // ── Ferrari 456 GT (1992) — V12 2+2 GT ───────────────────────────────────
  N({ id:'ferrari-456gt', label:'Ferrari 456 GT (1992)', year:1992,
      brandId:'ferrari', brandName:'Ferrari', modelSlug:'ferrari-456gt', familyKey:'ferrari-456',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:436, engineType:'v12' }),

  // ── Ferrari 575M (2002) — между 550 и 599 ─────────────────────────────────
  N({ id:'ferrari-575m', label:'Ferrari 575M Maranello (2002)', year:2002,
      brandId:'ferrari', brandName:'Ferrari', modelSlug:'ferrari-575m', familyKey:'ferrari-550',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:515, engineType:'v12' }),

  // ── Ferrari 512 M (1994) — последняя Testarossa ────────────────────────────
  N({ id:'ferrari-512m', label:'Ferrari 512 M (1994)', year:1994,
      brandId:'ferrari', brandName:'Ferrari', modelSlug:'ferrari-512m', familyKey:'ferrari-testarossa',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:440, engineType:'flat12' }),
]

const newEdges = [
  // 250 GT → 250 GTO (гоночная версия)
  E('e-fer-250gt-gto',    'ferrari-250gt',     'ferrari-250gto',    'derived_from', 0.88),
  // 250 GT → 275 GTB (следующий шаг)
  E('e-fer-250gt-275',    'ferrari-250gt',     'ferrari-275gtb',    'evolves_into'),
  // 275 GTB → 365 Daytona
  E('e-fer-275-daytona',  'ferrari-275gtb',    'ferrari-daytona-365','evolves_into'),
  // Testarossa → 512 TR → 512 M → (конец серии) → 550 Maranello (духовный преемник)
  E('e-fer-512tr-512m',   'ferrari-512tr',     'ferrari-512m',      'evolves_into'),
  E('e-fer-512m-550',     'ferrari-512m',      'ferrari-550',       'inspired_by', 0.80),
  // 550 Maranello → 575M
  E('e-fer-550-575m',     'ferrari-550',       'ferrari-575m',      'evolves_into'),
  // 575M → 599 GTB
  E('e-fer-575m-599',     'ferrari-575m',      'ferrari-599gtb',    'evolves_into'),
  // 456 GT — отдельная 2+2 линия, связана с 612 Scaglietti
  E('e-fer-456-612',      'ferrari-456gt',     'ferrari-612',       'evolves_into'),
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
console.log('Ferrari gaps: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
