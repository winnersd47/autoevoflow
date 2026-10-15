'use strict'
/**
 * add-hk-platforms.js — Hyundai-Kia-Genesis платформенная сеть
 *  • N3/N-Line ICE: Sonata ↔ K5 (все три поколения)
 *  • N-SUV: Tucson ↔ Sportage, Santa Fe ↔ Sorento
 *  • E-GMP: IONIQ 5/6/9 ↔ EV6/EV9 ↔ GV60
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existE = new Set(g.edges.map(e => e.id))
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newEdges = [
  // ── N3 платформа: Sonata ↔ Kia Optima/K5 ────────────────────────────────
  E('e-n3-son5-k5-1',   'hyu-sonata-5',    'kia-k5-1',       'shares_platform', 0.95),
  E('e-n3-son6-k5-2',   'hyu-sonata-6',    'kia-k5-2',       'shares_platform', 0.95),
  E('e-n3-son7-k5-3',   'hyu-sonata-7',    'kia-k5-3',       'shares_platform', 0.95),

  // ── N-SUV: Tucson ↔ Sportage ─────────────────────────────────────────────
  E('e-nsuv-tuc1-sp2',  'hyu-tucson-1',    'kia-sportage-2', 'shares_platform', 0.90),
  E('e-nsuv-tuc2-sp3',  'hyu-tucson-2',    'kia-sportage-3', 'shares_platform', 0.92),
  E('e-nsuv-tuc3-sp4',  'hyu-tucson-3',    'kia-sportage-4', 'shares_platform', 0.93),
  E('e-nsuv-tuc4-sp5',  'hyu-tucson-4',    'kia-sportage-5', 'shares_platform', 0.95),

  // ── N-Large SUV: Santa Fe ↔ Sorento ──────────────────────────────────────
  E('e-nlg-sf1-sor1',   'hyu-santa-fe-1',  'kia-sorento-1',  'shares_platform', 0.88),
  E('e-nlg-sf2-sor2',   'hyu-santa-fe-2',  'kia-sorento-2',  'shares_platform', 0.90),
  E('e-nlg-sf3-sor3',   'hyu-santa-fe-3',  'kia-sorento-3',  'shares_platform', 0.92),
  E('e-nlg-sf4-sor4',   'hyu-santa-fe-4',  'kia-sorento-4',  'shares_platform', 0.93),

  // ── E-GMP (Electric-Global Modular Platform) ─────────────────────────────
  // IONIQ 5 ↔ EV6: оба первые E-GMP седаны/кроссоверы
  E('e-egmp-ion5-ev6',  'hyu-ioniq5',      'kia-ev6-1',      'shares_platform', 0.97),
  // IONIQ 6 ↔ EV6: E-GMP «Stretch» вариант
  E('e-egmp-ion6-ev6',  'hyu-ioniq6',      'kia-ev6-1',      'shares_platform', 0.95),
  // Genesis GV60 ↔ IONIQ 5: E-GMP люкс
  E('e-egmp-gv60-ion5', 'gen-gv60-1',      'hyu-ioniq5',     'shares_platform', 0.95),
  // IONIQ 9 ↔ EV9: E-GMP большой вариант
  E('e-egmp-ion9-ev9',  'hyu-ioniq9',      'kia-ev9',        'shares_platform', 0.97),
]

// Проверяем якоря
;['hyu-sonata-5','hyu-sonata-6','hyu-sonata-7','kia-k5-1','kia-k5-2','kia-k5-3',
  'hyu-tucson-1','hyu-tucson-2','hyu-tucson-3','hyu-tucson-4',
  'kia-sportage-2','kia-sportage-3','kia-sportage-4','kia-sportage-5',
  'hyu-santa-fe-1','hyu-santa-fe-2','hyu-santa-fe-3','hyu-santa-fe-4',
  'kia-sorento-1','kia-sorento-2','kia-sorento-3','kia-sorento-4',
  'hyu-ioniq5','hyu-ioniq6','hyu-ioniq9','kia-ev6-1','kia-ev9','gen-gv60-1'].forEach(id => {
  const n = g.nodes.find(n => n.id === id)
  if (!n) console.log('ОТСУТСТВУЕТ:', id)
})

let addedE=0, skipE=0
for (const e of newEdges) {
  if (existE.has(e.id)) { console.log('  SKIP edge:', e.id); skipE++; continue }
  const s = g.nodes.find(n => n.id === e.source)
  const t = g.nodes.find(n => n.id === e.target)
  if (!s) { console.log('  SKIP '+e.id+': нет source '+e.source); skipE++; continue }
  if (!t) { console.log('  SKIP '+e.id+': нет target '+e.target); skipE++; continue }
  g.edges.push(e); addedE++
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Hyundai-Kia platforms: +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
