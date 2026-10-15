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
  // ── Chrysler LHS (1994) — LH платформа, флагман до 300M ──────────────────
  N({ id:'chrysler-lhs', label:'Chrysler LHS (1994)', year:1994,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-lhs', familyKey:'chrysler-lh',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:214, engineType:'v6', codeName:'LH / 3.5 V6' }),

  // ── Chrysler 300M (1998) — LH платформа, спортивный облик ────────────────
  N({ id:'chrysler-300m', label:'Chrysler 300M (1998)', year:1998,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-300m', familyKey:'chrysler-lh',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:253, engineType:'v6', codeName:'LHS / 300M' }),

  // ── Chrysler PT Cruiser (2001) — ретро-компакт, мировой феномен ──────────
  N({ id:'chrysler-pt-cruiser', label:'Chrysler PT Cruiser (2001)', year:2001,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-pt-cruiser', familyKey:'chrysler-pt',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:150, engineType:'i4t', codeName:'PT Turbo' }),

  // ── Chrysler Sebring Gen.1 (1995) — купе на платформе Mitsubishi ─────────
  N({ id:'chrysler-sebring-1', label:'Chrysler Sebring Gen.1 (1995)', year:1995,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-sebring', familyKey:'chrysler-sebring',
      type:'generation', bodyType:'coupe', segment:'compact', zone:'gt_coupe',
      hp:168, engineType:'v6', codeName:'JX / Galant platform' }),

  // ── Chrysler 200 Gen.1 (2011) — замена Sebring ───────────────────────────
  N({ id:'chrysler-200-1', label:'Chrysler 200 Gen.1 (2011)', year:2011,
      brandId:'chrysler', brandName:'Chrysler', modelSlug:'chrysler-200', familyKey:'chrysler-200',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:283, engineType:'v6' }),
]

const newEdges = [
  // LH-платформенная линия
  E('e-chr-lhs-300m',    'chrysler-lhs',      'chrysler-300m',     'evolves_into'),
  // 300M → 300 LX (духовный преемник)
  E('e-chr-300m-lx',     'chrysler-300m',     'chrysler-300-lx',   'inspired_by', 0.72),
  // LX платформа: DaimlerChrysler — Chrysler 300 использовал компоненты Merc E-Class W210
  E('e-chr-300lx-w210',  'chrysler-300-lx',   'merc-w210',         'derived_from', 0.70),
  // Sebring → 200 (прямой преемник)
  E('e-chr-seb-200',     'chrysler-sebring-1','chrysler-200-1',    'evolves_into'),
  // PT Cruiser вдохновлён ретро-стилем DeSoto/Chrysler 1940-х
  E('e-chr-c300-pt',     'chrysler-c300',     'chrysler-pt-cruiser','inspired_by', 0.50),
  // Sebring платформа ← Mitsubishi Galant (DSM партнёрство)
  E('e-chr-seb-gal',     'chrysler-sebring-1','mitsubishi-galant-6','shares_platform', 0.88),
]

// Проверяем якоря
;['chrysler-300-lx','chrysler-lhs','merc-w210','mitsubishi-galant-6'].forEach(id => {
  const n = g.nodes.find(n => n.id === id)
  console.log(id, '→', n ? `ЕСТЬ (${n.year})` : 'ОТСУТСТВУЕТ')
})

let addedN=0, addedE=0, skipN=0, skipE=0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node:', n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n => n.id === e.source)
    const t = g.nodes.find(n => n.id === e.target)
    if (!s) { console.log('  SKIP '+e.id+': нет source '+e.source); skipE++; continue }
    if (!t) { console.log('  SKIP '+e.id+': нет target '+e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge:', e.id); skipE++ }
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Chrysler+2: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
