'use strict'
/**
 * add-vwgroup-platforms.js — платформенные связи внутри VW Group
 *  • PQ34 (Golf Mk4): Golf4 ↔ León Mk1 ↔ A3 8L ↔ TT 8N ↔ Octavia Mk1
 *  • PQ35 (Golf Mk5): Golf5 ↔ León Mk2 ↔ A3 8P ↔ TT 8J ↔ Octavia Mk2
 *  • MLB (A4 B8): A4B8 ↔ A5 8T ↔ Q5 8R + эволюция к 2nd gen
 *  • PQ24 (Polo era): Ibiza Mk3 ↔ Fabia Mk1 ↔ Polo Mk4
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))
const N = obj => obj
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newNodes = [
  // ── Audi A5 8T (2007) — первое поколение, MLB платформа ──────────────────
  N({ id:'audi-a5-8t', label:'Audi A5 8T (2007)', year:2007,
      brandId:'audi', brandName:'Audi', modelSlug:'audi-a5', familyKey:'audi-a5',
      type:'generation', bodyType:'coupe', segment:'exec', zone:'gt_coupe',
      hp:265, engineType:'v6', codeName:'8T / B8 MLB' }),

  // ── Audi Q5 8R (2008) — первое поколение, MLB платформа ──────────────────
  N({ id:'audi-q5-8r', label:'Audi Q5 8R (2008)', year:2008,
      brandId:'audi', brandName:'Audi', modelSlug:'audi-q5', familyKey:'audi-q5',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:270, engineType:'v6', codeName:'8R / MLB' }),

  // ── VW Polo Mk4 (2001) — PQ24 платформа ──────────────────────────────────
  N({ id:'vw-polo-mk4', label:'VW Polo Mk4 (2001)', year:2001,
      brandId:'volkswagen', brandName:'Volkswagen', modelSlug:'vw-polo', familyKey:'vw-polo',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:130, engineType:'i4t', codeName:'9N / GTI' }),
]

const newEdges = [
  // ── PQ34 платформа (Golf Mk4 1997) ────────────────────────────────────────
  // Golf4 ↔ Seat León Mk1: те же пороги, пол, передняя подвеска
  E('e-pq34-g4-leon1',  'vw-golf4',     'seat-leon-mk1',  'shares_platform', 0.95),
  // Golf4 ↔ Audi A3 8L: A3 первым вышел на PQ34, Golf4 за ним
  E('e-pq34-g4-a3-8l',  'vw-golf4',     'audi-a3-8l',     'shares_platform', 0.95),
  // Golf4 ↔ Audi TT 8N: родстер на платформе Golf
  E('e-pq34-g4-tt8n',   'vw-golf4',     'audi-tt-8n',     'shares_platform', 0.90),

  // ── PQ35 платформа (Golf Mk5 2003) ────────────────────────────────────────
  E('e-pq35-g5-leon2',  'vw-golf5',     'seat-leon-mk2',  'shares_platform', 0.95),
  E('e-pq35-g5-a3-8p',  'vw-golf5',     'audi-a3-8p',     'shares_platform', 0.95),
  E('e-pq35-g5-oct2',   'vw-golf5',     'skoda-oct-a5',   'shares_platform', 0.95),
  // Golf5 ↔ Audi TT 8J: TT переехал с PQ34 на PQ35
  E('e-pq35-g5-tt8j',   'vw-golf5',     'audi-tt-8j',     'shares_platform', 0.88),

  // ── MLB платформа (Audi A4 B8 2007) ──────────────────────────────────────
  // A4 B8 ↔ A5 8T: купе-вариант на той же платформе
  E('e-mlb-a4b8-a5-8t', 'audi-a4b8',   'audi-a5-8t',     'shares_platform', 0.97),
  // A4 B8 ↔ Q5 8R: первый MLB-кроссовер
  E('e-mlb-a4b8-q5-8r', 'audi-a4b8',   'audi-q5-8r',     'shares_platform', 0.92),
  // Эволюция A5 и Q5 к следующим поколениям
  E('e-audi-a5-8t-f5',  'audi-a5-8t',  'audi-a5-f5',     'evolves_into'),
  E('e-audi-q5-8r-fy',  'audi-q5-8r',  'audi-q5-fy',     'evolves_into'),

  // ── PQ24 платформа (Polo/Ibiza/Fabia) ────────────────────────────────────
  // Seat Ibiza Mk3 ↔ Skoda Fabia Mk1: параллельные субкомпакты VW Group
  E('e-pq24-ib3-fab1',  'seat-ibiza-mk3', 'skoda-fabia-1', 'shares_platform', 0.90),
  // VW Polo Mk4 ↔ Seat Ibiza Mk3: общий PQ24 кузов
  E('e-pq24-polo4-ib3', 'vw-polo-mk4',  'seat-ibiza-mk3', 'shares_platform', 0.92),
  // VW Polo Mk4 ↔ Skoda Fabia Mk1
  E('e-pq24-polo4-fab1','vw-polo-mk4',  'skoda-fabia-1',  'shares_platform', 0.90),
  // Polo Mk4 → Audi A1 (PQ25 — производная PQ24)
  E('e-pq25-polo4-a1',  'vw-polo-mk4',  'audi-a1-8x',     'inspired_by',  0.70),

  // ── Touareg Gen2 ↔ Cayenne Gen2 (PL71/MLB) ───────────────────────────────
  E('e-mlb-tou2-cay92', 'vw-touareg-2', 'porsche-cay9-92a','shares_platform', 0.88),
]

// Проверяем якоря
;['vw-golf4','vw-golf5','vw-golf7','seat-leon-mk1','seat-leon-mk2','skoda-oct-a4',
  'skoda-oct-a5','audi-a3-8l','audi-a3-8p','audi-tt-8n','audi-tt-8j','audi-a4b8',
  'audi-a5-f5','audi-q5-fy','seat-ibiza-mk3','skoda-fabia-1','audi-a1-8x',
  'vw-touareg-2','porsche-cay9-92a'].forEach(id => {
  const n = g.nodes.find(n => n.id === id)
  if (!n) console.log('ОТСУТСТВУЕТ:', id)
})

let addedN=0, addedE=0, skipN=0, skipE=0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node:', n.id); skipN++ }
}
for (const e of newEdges) {
  if (existE.has(e.id)) { console.log('  SKIP edge:', e.id); skipE++; continue }
  const s = g.nodes.find(n => n.id === e.source)
  const t = g.nodes.find(n => n.id === e.target)
  if (!s) { console.log('  SKIP '+e.id+': нет source '+e.source); skipE++; continue }
  if (!t) { console.log('  SKIP '+e.id+': нет target '+e.target); skipE++; continue }
  g.edges.push(e); addedE++
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('VW Group platforms: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
