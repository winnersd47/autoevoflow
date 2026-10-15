'use strict'
/**
 * add-fordmazda-gm.js — Ford-Mazda EUCD + GM Kappa платформы
 *  • Ford Mondeo Mk2/3/4 — заполняем разрыв Mk1→Mk5
 *  • Mondeo Mk3 ↔ Mazda 6 GG: CD3 платформа
 *  • Mondeo Mk4 ↔ Mazda 6 GH: EUCD платформа
 *  • Ford Focus Mk2 ↔ Kuga Mk1: C1 семейство
 *  • GM Kappa: Pontiac Solstice ↔ Saturn Sky ↔ Opel GT
 *  • Chevy Malibu на Epsilon-платформе
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
  // ── Ford Mondeo Mk2 (1996) ─────────────────────────────────────────────────
  N({ id:'ford-mondeo-2', label:'Ford Mondeo Mk2 (1996)', year:1996,
      brandId:'ford', brandName:'Ford', modelSlug:'ford-mondeo', familyKey:'ford-mondeo',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:200, engineType:'v6', codeName:'BWY / ST200' }),

  // ── Ford Mondeo Mk3 (2000) — CD3 платформа, Европа + Jaguar S-Type ────────
  N({ id:'ford-mondeo-3', label:'Ford Mondeo Mk3 (2000)', year:2000,
      brandId:'ford', brandName:'Ford', modelSlug:'ford-mondeo', familyKey:'ford-mondeo',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:220, engineType:'v6', codeName:'B4Y / ST220' }),

  // ── Ford Mondeo Mk4 (2007) — EUCD платформа, партнёрство Mazda ──────────
  N({ id:'ford-mondeo-4', label:'Ford Mondeo Mk4 (2007)', year:2007,
      brandId:'ford', brandName:'Ford', modelSlug:'ford-mondeo', familyKey:'ford-mondeo',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:240, engineType:'v6', codeName:'CA2 / Titanium' }),

  // ── Saturn Sky (2007) — Kappa платформа, Pontiac Solstice близнец ─────────
  N({ id:'saturn-sky', label:'Saturn Sky (2007)', year:2007,
      brandId:'saturn', brandName:'Saturn', modelSlug:'saturn-sky', familyKey:'saturn-sky',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:260, engineType:'i4t', codeName:'Kappa / Red Line' }),

  // ── Opel GT (2007) — Kappa платформа, европейский вариант ───────────────
  N({ id:'opel-gt-07', label:'Opel GT (2007)', year:2007,
      brandId:'opel', brandName:'Opel', modelSlug:'opel-gt', familyKey:'opel-gt',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:260, engineType:'i4t', codeName:'Kappa / Twin Turbo' }),

  // ── Chevrolet Malibu 7th Gen (2004) — Epsilon платформа (Saab/Opel) ──────
  N({ id:'chevy-malibu-7', label:'Chevrolet Malibu Gen7 (2004)', year:2004,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chevy-malibu', familyKey:'chevy-malibu',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:145, engineType:'i4', codeName:'Epsilon' }),
]

const newEdges = [
  // ── Ford Mondeo эволюция ───────────────────────────────────────────────────
  E('e-mon-1-2',        'ford-mondeo-1',   'ford-mondeo-2',  'evolves_into'),
  E('e-mon-2-3',        'ford-mondeo-2',   'ford-mondeo-3',  'evolves_into'),
  E('e-mon-3-4',        'ford-mondeo-3',   'ford-mondeo-4',  'evolves_into'),
  E('e-mon-4-5',        'ford-mondeo-4',   'ford-mondeo-5',  'evolves_into'),

  // ── Ford-Mazda CD3 платформа (Mondeo Mk3 эра) ────────────────────────────
  // Mondeo Mk3 ↔ Mazda 6 GG: оба на Ford CD3 (2000-2002)
  E('e-cd3-mon3-mz6gg', 'ford-mondeo-3',  'mazda-6-gg',     'shares_platform', 0.85),

  // ── Ford-Mazda EUCD платформа (Mondeo Mk4 эра) ────────────────────────────
  // Mondeo Mk4 ↔ Mazda 6 GH: EUCD 2007
  E('e-eucd-mon4-mz6gh','ford-mondeo-4',  'mazda-6-gh',     'shares_platform', 0.88),
  // Focus Mk2 ↔ Kuga Mk1: C1 платформа
  E('e-c1-foc2-kuga1',  'ford-focus-2',   'ford-kuga-1',    'shares_platform', 0.90),
  // Focus Mk3 ↔ Mazda 3 BL: C2 платформа — Mazda 3 BL 2008
  E('e-c2-foc3-mz3bl',  'ford-focus-3',   'mazda-3-bl',     'shares_platform', 0.82),

  // ── GM Kappa платформа ────────────────────────────────────────────────────
  // Pontiac Solstice ↔ Saturn Sky: близнецы на Kappa
  E('e-kappa-sol-sky',  'pontiac-solstice','saturn-sky',     'shares_platform', 0.97),
  // Pontiac Solstice ↔ Opel GT: европейский Kappa
  E('e-kappa-sol-opgt', 'pontiac-solstice','opel-gt-07',     'shares_platform', 0.95),

  // ── GM Epsilon платформа ─────────────────────────────────────────────────
  // Chevy Malibu 7 ↔ Saab 9-3 Gen2 ↔ Opel Vectra C — Epsilon family
  E('e-eps-mal7-93g2',  'chevy-malibu-7', 'saab-9-3-gen2',  'shares_platform', 0.88),
  E('e-eps-mal7-vc',    'chevy-malibu-7', 'opel-vectra-c',  'shares_platform', 0.90),
]

// Проверяем якоря
;['ford-mondeo-1','ford-mondeo-5','mazda-6-gg','mazda-6-gh','ford-focus-2','ford-focus-3',
  'ford-kuga-1','mazda-3-bl','mazda-3-bk','pontiac-solstice','saab-9-3-gen2','opel-vectra-c'].forEach(id => {
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
console.log('Ford-Mazda+GM: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
