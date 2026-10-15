'use strict'
/**
 * add-pag-volvo.js — Ford PAG era (Jaguar/Lincoln) + Volvo P2 platform web
 *  • Jaguar X-Type ← Ford Mondeo Mk3 (DEW/CD132 платформа)
 *  • Jaguar S-Type ↔ Lincoln LS: DEW98 platform (Ford PAG era)
 *  • Jaguar XF X250 ↔ Ford Mondeo Mk4: EUCD связь
 *  • Volvo S60/XC90/S70: P2 platform family
 *  • Volvo XC60 Gen1 ↔ S60 Gen2: P3 platform
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
  // ── Lincoln LS Gen1 (2000) — DEW98 платформа: Jaguar S-Type близнец ──────
  N({ id:'lincoln-ls-1', label:'Lincoln LS Gen1 (2000)', year:2000,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-ls', familyKey:'lincoln-ls',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:252, engineType:'v8', codeName:'DEW98 / V8 Sport' }),

  // ── Ford Thunderbird 11th (2002) — DEW98, ретро-возрождение ─────────────
  N({ id:'ford-tbird-11', label:'Ford Thunderbird 11th (2002)', year:2002,
      brandId:'ford', brandName:'Ford', modelSlug:'ford-thunderbird', familyKey:'ford-thunderbird',
      type:'generation', bodyType:'roadster', segment:'luxury', zone:'open_top',
      hp:252, engineType:'v8', codeName:'DEW98 / 11th Gen' }),
]

const newEdges = [
  // ── PAG: Jaguar X-Type ← Ford Mondeo Mk3 (платформа CD132) ──────────────
  E('e-pag-xtype-mon3',  'ford-mondeo-3',   'jag-xtype',       'derived_from',  0.85),

  // ── PAG: DEW98 платформа (Jaguar S-Type / Lincoln LS / Thunderbird) ──────
  E('e-dew-stype-ls',    'jag-stype',       'lincoln-ls-1',    'shares_platform',0.90),
  E('e-dew-ls-tbird',    'lincoln-ls-1',    'ford-tbird-11',   'shares_platform',0.88),
  E('e-lin-town-ls',     'lincoln-town-car','lincoln-ls-1',    'inspired_by',    0.55),

  // ── EUCD: Jaguar XF X250 ↔ Ford Mondeo Mk4 ───────────────────────────────
  E('e-eucd-xf250-mon4', 'ford-mondeo-4',   'jag-xf-x250',     'shares_platform',0.78),

  // ── Volvo P2 платформа: S70/V70 ↔ S60 Gen1 ↔ XC90 Gen1 ──────────────────
  E('e-p2-s70-xc90',     'volvo-s70-v70',   'volvo-xc90-1',    'shares_platform',0.88),
  E('e-p2-s60-1-xc90',   'volvo-s60-1',     'volvo-xc90-1',    'shares_platform',0.85),

  // ── Volvo P3 платформа: S60 Gen2 ↔ XC60 Gen1 ────────────────────────────
  E('e-p3-s60-2-xc60',   'volvo-s60-2',     'volvo-xc60-1',    'shares_platform',0.90),

  // ── Volvo SPA (Scalable Product Architecture): XC90 Gen2 ↔ XC60 Gen2 ─────
  E('e-spa-xc90-2-xc60', 'volvo-xc90-2',    'volvo-xc60-2',    'shares_platform',0.92),
  E('e-spa-xc90-2-s60-3','volvo-xc90-2',    'volvo-s60-3',     'shares_platform',0.90),
]

// Проверяем якоря
;['jag-stype','jag-xtype','jag-xf-x250','ford-mondeo-3','ford-mondeo-4',
  'volvo-s60-1','volvo-s60-2','volvo-s60-3','volvo-xc90-1','volvo-xc90-2',
  'volvo-s70-v70','volvo-xc60-1','volvo-xc60-2','lincoln-town-car'].forEach(id => {
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
console.log('PAG+Volvo: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
