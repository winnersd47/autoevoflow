'use strict'
/**
 * add-alliance-clar.js — Toyota-BMW CLAR + Renault-Nissan CMF Alliance
 *  • CLAR platform: GR Supra A90 ↔ BMW Z4 G29
 *  • CMF-B: Renault Clio 4/5 ↔ Nissan Micra K13/K14
 *  • CMF-C/D: Renault Megane 3/4 ↔ Nissan Qashqai J11
 *  • CMF-EV: Nissan Ariya ↔ Renault Megane E-Tech
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
  // ── Nissan Micra K13 (2010) — CMF-B партнёр Clio 4 ──────────────────────
  N({ id:'nissan-micra-k13', label:'Nissan Micra K13 (2010)', year:2010,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-micra', familyKey:'nissan-micra',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:98, engineType:'i4', codeName:'K13 / HR12DDR' }),

  // ── Nissan Micra K14 (2016) — CMF-B-платформа, совместно с Renault ───────
  N({ id:'nissan-micra-k14', label:'Nissan Micra K14 (2016)', year:2016,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-micra', familyKey:'nissan-micra',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:117, engineType:'i3t', codeName:'K14 / CMF-B' }),

  // ── Nissan Qashqai J11 (2013) — CMF-C/D, первый на Alliance-платформе ────
  N({ id:'nissan-qashqai-j11', label:'Nissan Qashqai J11 (2013)', year:2013,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-qashqai', familyKey:'nissan-qashqai',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv_compact',
      hp:163, engineType:'i4t', codeName:'J11 / CMF-C' }),

  // ── Nissan Juke F15 (2010) — субкомпактный кроссовер Alliance ───────────
  N({ id:'nissan-juke-f15', label:'Nissan Juke F15 (2010)', year:2010,
      brandId:'nissan', brandName:'Nissan', modelSlug:'nissan-juke', familyKey:'nissan-juke',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv_compact',
      hp:190, engineType:'i4t', codeName:'F15 / Nismo RS' }),
]

const newEdges = [
  // ── Toyota-BMW CLAR (GR Supra / Z4) ─────────────────────────────────────
  E('e-clar-supra-z4',     'toyota-supra-a90',   'bmw-z4-g29',        'shares_platform', 0.95),

  // ── Renault-Nissan CMF-B (субкомпакт) ────────────────────────────────────
  // Clio 4 ↔ Micra K13: раннее поколение платформы
  E('e-cmfb-clio4-k13',    'ren-clio-4',         'nissan-micra-k13',  'shares_platform', 0.82),
  // Clio 5 ↔ Micra K14: полная CMF-B унификация
  E('e-cmfb-clio5-k14',    'ren-clio-5',         'nissan-micra-k14',  'shares_platform', 0.90),
  // Micra K13 → K14
  E('e-nis-k13-k14',       'nissan-micra-k13',   'nissan-micra-k14',  'evolves_into'),

  // ── Renault-Nissan CMF-C/D (компакт/средний) ─────────────────────────────
  // Megane 3 ↔ Qashqai J11: CMF-C/D — первое крупное слияние платформ
  E('e-cmfc-meg3-qash',    'ren-megane-3',       'nissan-qashqai-j11','shares_platform', 0.85),
  // Megane 4 ↔ Qashqai J11: продолжение платформенной семьи
  E('e-cmfc-meg4-qash',    'ren-megane-4',       'nissan-qashqai-j11','shares_platform', 0.80),

  // ── Juke линия ───────────────────────────────────────────────────────────
  // Qashqai J11 вдохновил более компактный Juke F15 (оба Alliance)
  E('e-nis-juke-qash',     'nissan-juke-f15',    'nissan-qashqai-j11','inspired_by', 0.60),

  // ── Прочие кросс-брендовые связи с готовыми нодами ───────────────────────
  // Nissan Ariya ↔ Renault Megane E-Tech: CMF-EV — Ariya существует (2021)
  // Megane E-Tech (2021): нет ноды, пропускаем
  // Toyota Supra A80 (1993) ← BMW M (6-цилиндр): духовная связь до коллаборации
  E('e-xb-supra80-z4e85',  'toyota-supra-a80',   'bmw-z4-e85',        'inspired_by', 0.55),
  // BMW Z4 G29 → Z4 E89 (неправильный порядок — E89 старше G29, пропустить)
  // Toyota GR86 ZN8 ↔ Subaru BRZ ZD8: платформа ZD уже есть как rebadged_as
  // добавим shares_platform для явности
  E('e-zd-gr86-brz2',      'toyota-gr86-zn8',    'subaru-brz-zd8',    'shares_platform', 0.97),
  // Toyota GT86 ZN6 ↔ Subaru BRZ ZC6: аналогично
  E('e-zn-gt86-brz1',      'toyota-gt86-zn6',    'subaru-brz-zc6',    'shares_platform', 0.97),
]

// Проверяем якоря
;['toyota-supra-a90','bmw-z4-g29','ren-clio-4','ren-clio-5','ren-megane-3','ren-megane-4',
  'toyota-gr86-zn8','subaru-brz-zd8','toyota-gt86-zn6','subaru-brz-zc6',
  'toyota-supra-a80','bmw-z4-e85'].forEach(id => {
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
console.log('Alliance+CLAR: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
