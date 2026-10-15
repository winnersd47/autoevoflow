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
  // ══ FIAT ═════════════════════════════════════════════════════════════════

  // ── Fiat 128 (1969) — первый массовый поперечный FWD ─────────────────────
  N({ id:'fiat-128', label:'Fiat 128 (1969)', year:1969,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-128', familyKey:'fiat-128',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:55, engineType:'i4', codeName:'128 1100 / Rallye' }),

  // ── Fiat Panda Gen.1 (1980) ───────────────────────────────────────────────
  N({ id:'fiat-panda-1', label:'Fiat Panda Gen.1 (1980)', year:1980,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-panda', familyKey:'fiat-panda',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:45, engineType:'i4', codeName:'141 / 4x4' }),

  // ── Fiat Uno Gen.1 (1983) — Car of the Year 1984, Джуджаро ───────────────
  N({ id:'fiat-uno-1', label:'Fiat Uno Gen.1 (1983)', year:1983,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-uno', familyKey:'fiat-uno',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:105, engineType:'i4t', codeName:'Turbo ie' }),

  // ── Fiat Croma (1985) — Tipo Quattro флагман Fiat ────────────────────────
  N({ id:'fiat-croma', label:'Fiat Croma (1985)', year:1985,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-croma', familyKey:'fiat-croma',
      type:'generation', bodyType:'hatchback', segment:'exec', zone:'exec_sed',
      hp:155, engineType:'i4t', codeName:'Croma Turbo ie' }),

  // ── Fiat Punto Gen.2 (1999) ───────────────────────────────────────────────
  N({ id:'fiat-punto-2', label:'Fiat Punto Gen.2 (1999)', year:1999,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-punto-2', familyKey:'fiat-punto',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:130, engineType:'i4t', codeName:'GT / Abarth' }),

  // ── Fiat Bravo Gen.1 (1995) ───────────────────────────────────────────────
  N({ id:'fiat-bravo-1', label:'Fiat Bravo Gen.1 (1995)', year:1995,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-bravo', familyKey:'fiat-bravo',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:147, engineType:'i4t', codeName:'HGT' }),

  // ── Fiat Stilo (2001) — FIAT-A платформа ─────────────────────────────────
  N({ id:'fiat-stilo', label:'Fiat Stilo (2001)', year:2001,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-stilo', familyKey:'fiat-stilo',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:170, engineType:'i4t', codeName:'Abarth' }),

  // ── Fiat Tipo Gen.2 (2015) ────────────────────────────────────────────────
  N({ id:'fiat-tipo-2015', label:'Fiat Tipo Gen.2 (2015)', year:2015,
      brandId:'fiat', brandName:'Fiat', modelSlug:'fiat-tipo-2015', familyKey:'fiat-tipo',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:120, engineType:'i4t' }),

  // ══ LANCIA ════════════════════════════════════════════════════════════════

  // ── Lancia Aurelia B20 GT (1951) — первый GT купе с V6 в мире ────────────
  N({ id:'lancia-aurelia', label:'Lancia Aurelia B20 GT (1951)', year:1951,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-aurelia', familyKey:'lancia-aurelia',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:118, engineType:'v6', codeName:'B20 GT' }),

  // ── Lancia Flaminia (1957) — флагман Пининфарина ──────────────────────────
  N({ id:'lancia-flaminia', label:'Lancia Flaminia (1957)', year:1957,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-flaminia', familyKey:'lancia-flaminia',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:119, engineType:'v6', codeName:'GT 3C 2.8' }),

  // ── Lancia Thema (1984) — Tipo Quattro ───────────────────────────────────
  N({ id:'lancia-thema', label:'Lancia Thema (1984)', year:1984,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-thema', familyKey:'lancia-thema',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:210, engineType:'v8', codeName:'8.32 Ferrari V8' }),

  // ── Lancia Dedra (1989) ───────────────────────────────────────────────────
  N({ id:'lancia-dedra', label:'Lancia Dedra (1989)', year:1989,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-dedra', familyKey:'lancia-dedra',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'exec_sed',
      hp:165, engineType:'i4t', codeName:'Integrale' }),

  // ── Lancia Kappa (1994) — последний D-сегмент ────────────────────────────
  N({ id:'lancia-kappa', label:'Lancia Kappa (1994)', year:1994,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-kappa', familyKey:'lancia-kappa',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:220, engineType:'v6', codeName:'Coupé LS' }),

  // ── Lancia Ypsilon Gen.1 (1996) ───────────────────────────────────────────
  N({ id:'lancia-ypsilon-1', label:'Lancia Ypsilon Gen.1 (1996)', year:1996,
      brandId:'lancia', brandName:'Lancia', modelSlug:'lancia-ypsilon', familyKey:'lancia-ypsilon',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:115, engineType:'i4', codeName:'LX' }),
]

const newEdges = [
  // ── Fiat ──────────────────────────────────────────────────────────────────
  // 128 → Uno (FWD эволюция)
  E('e-fi-128-uno1',    'fiat-128',      'fiat-uno-1',     'inspired_by', 0.75),
  // Panda → Uno (параллельные субкомпакты Fiat)
  E('e-fi-pan1-uno1',   'fiat-panda-1',  'fiat-uno-1',     'inspired_by', 0.60),
  // Tipo 1988 → Bravo → Stilo (компактная гамма)
  E('e-fi-tipo-bravo',  'fiat-tipo-1988','fiat-bravo-1',   'evolves_into'),
  E('e-fi-bravo-stilo', 'fiat-bravo-1',  'fiat-stilo',     'evolves_into'),
  // Punto 1993 → Punto Gen.2
  E('e-fi-pun1-pun2',   'fiat-punto-1993','fiat-punto-2',  'evolves_into'),
  // Tipo 1988 → Tipo 2015 (перезапуск имени)
  E('e-fi-tipo-tipo2',  'fiat-tipo-1988', 'fiat-tipo-2015','inspired_by', 0.65),
  // 500 1957 → 500 2007 (heritage relaunch)
  E('e-fi-500-500new',  'fiat-500-1957',  'fiat-500-2007', 'inspired_by', 0.85),
  // 500 2007 → 500e (электрификация)
  E('e-fi-500new-500e', 'fiat-500-2007',  'fiat-500e',     'evolves_into'),

  // ── Lancia ────────────────────────────────────────────────────────────────
  // Aurelia → Flaminia (флагманская линия)
  E('e-lan-aur-fla',    'lancia-aurelia', 'lancia-flaminia','evolves_into'),
  // Fulvia → Stratos Zero → Stratos (уже есть эти узлы, добавим Fulvia→Aurelia?)
  E('e-lan-aur-ful',    'lancia-aurelia', 'lancia-fulvia', 'inspired_by', 0.70),
  // Thema → Dedra → Kappa (линия executive)
  E('e-lan-the-ded',    'lancia-thema',   'lancia-dedra',  'inspired_by', 0.65),
  E('e-lan-ded-kap',    'lancia-dedra',   'lancia-kappa',  'evolves_into'),
  // Delta → Dedra (параллельные компактные Lancia)
  E('e-lan-del-ded',    'lancia-delta-1', 'lancia-dedra',  'inspired_by', 0.55),

  // ── Кросс-брендовые: Tipo Quattro платформа ──────────────────────────────
  // Saab 9000 + Alfa 164 + Lancia Thema + Fiat Croma — 4 машины на одной платформе
  E('e-tq-croma-thema', 'fiat-croma',     'lancia-thema',  'shares_platform', 0.95),
  E('e-tq-thema-saab',  'lancia-thema',   'saab-9000',     'shares_platform', 0.95),
  E('e-tq-croma-alfa',  'fiat-croma',     'alfa-164',      'shares_platform', 0.95),
  E('e-tq-thema-alfa',  'lancia-thema',   'alfa-164',      'shares_platform', 0.95),

  // ── FIAT-A платформа (2001): Stilo + Alfa 147 ────────────────────────────
  E('e-fi-stilo-a147',  'fiat-stilo',     'alfa-romeo-147','shares_platform', 0.90),
]

// Проверяем ключевые якоря
;['fiat-tipo-1988','fiat-punto-1993','fiat-500-1957','fiat-500-2007',
  'lancia-delta-1','lancia-fulvia','alfa-164','saab-9000','alfa-romeo-147'].forEach(id => {
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
    if (!s) { console.log('  SKIP edge '+e.id+': нет source '+e.source); skipE++; continue }
    if (!t) { console.log('  SKIP edge '+e.id+': нет target '+e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge:', e.id); skipE++ }
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Fiat+Lancia: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
