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
  // ── Toyota Hilux — одна из самых продаваемых машин в истории ─────────────
  N({ id:'toyota-hilux-n10', label:'Toyota Hilux N10 (1968)', year:1968,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:87, engineType:'i4' }),

  N({ id:'toyota-hilux-n30', label:'Toyota Hilux N30 (1972)', year:1972,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n30', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:97, engineType:'i4' }),

  N({ id:'toyota-hilux-n50', label:'Toyota Hilux N50 (1978)', year:1978,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n50', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:88, engineType:'i4' }),

  N({ id:'toyota-hilux-n60', label:'Toyota Hilux N60 (1983)', year:1983,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n60', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:116, engineType:'i4' }),

  // Шестое поколение — "неубиваемый" Hilux (Top Gear, ВВС)
  N({ id:'toyota-hilux-n80', label:'Toyota Hilux N80 (1988)', year:1988,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n80', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:150, engineType:'i4t', codeName:'Surf/4Runner platform' }),

  N({ id:'toyota-hilux-n100', label:'Toyota Hilux N100 (1997)', year:1997,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n100', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:150, engineType:'i4t' }),

  N({ id:'toyota-hilux-n120', label:'Toyota Hilux N120 (2005)', year:2005,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n120', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:171, engineType:'i4t' }),

  N({ id:'toyota-hilux-n210', label:'Toyota Hilux N210 (2015)', year:2015,
      brandId:'toyota', brandName:'Toyota', modelSlug:'toyota-hilux-n210', familyKey:'toyota-hilux',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:177, engineType:'i4t' }),
]

const newEdges = [
  // Основная цепочка эволюции
  E('e-hil-n10-n30',  'toyota-hilux-n10',  'toyota-hilux-n30',  'evolves_into'),
  E('e-hil-n30-n50',  'toyota-hilux-n30',  'toyota-hilux-n50',  'evolves_into'),
  E('e-hil-n50-n60',  'toyota-hilux-n50',  'toyota-hilux-n60',  'evolves_into'),
  E('e-hil-n60-n80',  'toyota-hilux-n60',  'toyota-hilux-n80',  'evolves_into'),
  E('e-hil-n80-n100', 'toyota-hilux-n80',  'toyota-hilux-n100', 'evolves_into'),
  E('e-hil-n100-n120','toyota-hilux-n100', 'toyota-hilux-n120', 'evolves_into'),
  E('e-hil-n120-n210','toyota-hilux-n120', 'toyota-hilux-n210', 'evolves_into'),
  // Hilux N80 → Toyota 4Runner Gen1 (общая платформа, 4Runner — производный)
  E('e-hil-n80-4run',  'toyota-hilux-n80', 'toyota-4runner-1',  'derived_from', 0.95),
  // Hilux N80 → Land Cruiser 80 (общая рамная платформа)
  E('e-hil-n80-lc80',  'toyota-hilux-n80', 'toyota-lc-80',      'inspired_by', 0.80),
  // Hilux → Tacoma Gen1 (Hilux был предшественником Tacoma в США)
  E('e-hil-n100-tac',  'toyota-hilux-n100','toyota-tacoma-1',   'derived_from', 0.90),
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
console.log('Toyota Hilux: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
