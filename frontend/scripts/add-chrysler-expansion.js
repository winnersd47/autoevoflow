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
  // ── Chrysler C-300 / Letter Series (1955) — первый американский мышечный GT
  N({ id:'chrysler-c300', label:'Chrysler C-300 Letter Series (1955)', year:1955,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-c300', familyKey:'chrysler-300',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:300, engineType:'v8', codeName:'C-300 / 300B / 300C...' }),

  // ── Chrysler 300 (LX) (2004) — возрождение 300 в современном виде
  N({ id:'chrysler-300-lx', label:'Chrysler 300 (2004)', year:2004,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-300-lx', familyKey:'chrysler-300',
      type:'generation', bodyType:'sedan', segment:'full-size', zone:'gt_coupe',
      hp:250, engineType:'v6' }),

  // ── Chrysler 300 SRT8 (2012) — flagship версия LX
  N({ id:'chrysler-300-srt8', label:'Chrysler 300 SRT8 (2012)', year:2012,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-300-srt8', familyKey:'chrysler-300',
      type:'generation', bodyType:'sedan', segment:'full-size', zone:'gt_coupe',
      hp:470, engineType:'v8' }),

  // ── Chrysler Crossfire (2003) — СП с Mercedes SLK (R170 платформа)
  N({ id:'chrysler-crossfire', label:'Chrysler Crossfire (2003)', year:2003,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-crossfire', familyKey:'chrysler-crossfire',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:215, engineType:'v6' }),
]

const newEdges = [
  // Исторический 300 → современный 300
  E('e-chr-c300-300lx',     'chrysler-c300',       'chrysler-300-lx',    'inspired_by', 0.78),
  // 300 LX → 300 SRT8 (вариант платформы)
  E('e-chr-300lx-srt8',     'chrysler-300-lx',     'chrysler-300-srt8',  'variant_of'),
  // 300 LX → Charger SRT8 (общая LX платформа)
  E('e-chr-300lx-charger',  'chrysler-300-lx',     'dodge-charger-srt8-2011', 'shares_platform', 0.95),
  // Crossfire базировался на Mercedes SLK R170 (кросс-брендовая платформа)
  E('e-chr-cross-slk',      'chrysler-crossfire',  'mercedes-slk-r170',  'derived_from', 0.82),
  // Chrysler Voyager → Pacifica (эволюция минивэна)
  E('e-chr-voyager-pac',    'chrysler-voyager-1',  'chrysler-pacifica',  'evolves_into'),
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
console.log('Chrysler expansion: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
