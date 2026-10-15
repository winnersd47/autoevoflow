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
  // ══ PONTIAC ═══════════════════════════════════════════════════════════════

  // ── Pontiac Firebird Gen.2 (1970) — «банановый нос», икона ───────────────
  N({ id:'pontiac-firebird-2', label:'Pontiac Firebird Gen.2 (1970)', year:1970,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-firebird-2', familyKey:'pontiac-firebird',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'sports',
      hp:335, engineType:'v8', codeName:'F-body / Ram Air IV' }),

  // ── Pontiac Firebird Gen.4 (1993) — последнее поколение F-body ───────────
  N({ id:'pontiac-firebird-4', label:'Pontiac Firebird Gen.4 (1993)', year:1993,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-firebird-4', familyKey:'pontiac-firebird',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:305, engineType:'v8', codeName:'F-body / Firehawk' }),

  // ── Pontiac Grand Prix Gen.1 (1962) — «персональный люкс» ────────────────
  N({ id:'pontiac-grandprix-1', label:'Pontiac Grand Prix Gen.1 (1962)', year:1962,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-grandprix', familyKey:'pontiac-grandprix',
      type:'generation', bodyType:'coupe', segment:'gt', zone:'gt_coupe',
      hp:348, engineType:'v8', codeName:'GP' }),

  // ── Pontiac Solstice (2006) — родстер, последний Pontiac-спортcар ─────────
  N({ id:'pontiac-solstice', label:'Pontiac Solstice (2006)', year:2006,
      brandId:'pontiac', brandName:'Pontiac', modelSlug:'pontiac-solstice', familyKey:'pontiac-solstice',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:260, engineType:'i4t', codeName:'GXP Turbo' }),

  // ══ LINCOLN ════════════════════════════════════════════════════════════════

  // ── Lincoln Continental Mark II (1956) — два года, ручная сборка ─────────
  N({ id:'lincoln-mark2', label:'Lincoln Continental Mark II (1956)', year:1956,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-mark2', familyKey:'lincoln-continental',
      type:'generation', bodyType:'coupe', segment:'ultra-luxury', zone:'luxury',
      hp:285, engineType:'v8', codeName:'Mark II' }),

  // ── Lincoln Continental Mark V (1977) — «большой Линкольн» ──────────────
  N({ id:'lincoln-mark5', label:'Lincoln Continental Mark V (1977)', year:1977,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-mark5', familyKey:'lincoln-continental',
      type:'generation', bodyType:'coupe', segment:'luxury', zone:'luxury',
      hp:208, engineType:'v8', codeName:'Mark V Collector Series' }),

  // ── Lincoln MKZ Gen.1 (2006) — современный executive ─────────────────────
  N({ id:'lincoln-mkz-1', label:'Lincoln MKZ Gen.1 (2006)', year:2006,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-mkz', familyKey:'lincoln-mkz',
      type:'generation', bodyType:'sedan', segment:'premium_midsize', zone:'exec_sed',
      hp:263, engineType:'v6' }),

  // ── Lincoln Aviator Gen.1 (2003) — среднеразмерный SUV ──────────────────
  N({ id:'lincoln-aviator-1', label:'Lincoln Aviator Gen.1 (2003)', year:2003,
      brandId:'lincoln', brandName:'Lincoln', modelSlug:'lincoln-aviator', familyKey:'lincoln-aviator',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:302, engineType:'v8' }),

  // ══ AMC ════════════════════════════════════════════════════════════════════

  // ── AMC Javelin Gen.1 (1968) — pony car конкурент Mustang/Camaro ─────────
  N({ id:'amc-javelin-1', label:'AMC Javelin Gen.1 (1968)', year:1968,
      brandId:'amc', brandName:'AMC', modelSlug:'amc-javelin', familyKey:'amc-javelin',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'sports',
      hp:325, engineType:'v8', codeName:'Go Package' }),

  // ── AMC AMX (1968) — двухместный спортивный кузов Javelin ────────────────
  N({ id:'amc-amx-1968', label:'AMC AMX (1968)', year:1968,
      brandId:'amc', brandName:'AMC', modelSlug:'amc-amx', familyKey:'amc-amx',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'sports',
      hp:390, engineType:'v8', codeName:'AMX 390' }),

  // ── AMC Gremlin (1970) — первый американский субкомпакт ──────────────────
  N({ id:'amc-gremlin', label:'AMC Gremlin (1970)', year:1970,
      brandId:'amc', brandName:'AMC', modelSlug:'amc-gremlin', familyKey:'amc-gremlin',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:150, engineType:'i6', codeName:'Gremlin X' }),

  // ── AMC Pacer (1975) — «рыбий глаз», широкий субкомпакт ─────────────────
  N({ id:'amc-pacer', label:'AMC Pacer (1975)', year:1975,
      brandId:'amc', brandName:'AMC', modelSlug:'amc-pacer', familyKey:'amc-pacer',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:110, engineType:'i6', codeName:'Pacer D/L' }),

  // ── AMC Eagle Gen.1 (1980) — первый массовый AWD универсал ──────────────
  N({ id:'amc-eagle-1', label:'AMC Eagle (1980)', year:1980,
      brandId:'amc', brandName:'AMC', modelSlug:'amc-eagle', familyKey:'amc-eagle',
      type:'generation', bodyType:'wagon', segment:'compact', zone:'estate',
      hp:110, engineType:'i6', codeName:'Eagle AWD' }),
]

const newEdges = [
  // ── Pontiac ────────────────────────────────────────────────────────────────
  E('e-pon-fb1-fb2',   'pontiac-firebird-1', 'pontiac-firebird-2', 'evolves_into'),
  E('e-pon-fb3-fb4',   'pontiac-firebird-3', 'pontiac-firebird-4', 'evolves_into'),
  E('e-pon-tam-fb4',   'pontiac-trans-am-ws6','pontiac-firebird-4','variant_of', 0.85),
  E('e-pon-gto-gp',    'pontiac-gto-1',      'pontiac-grandprix-1','inspired_by', 0.60),
  // Firebird ↔ Camaro Gen1 — F-body платформа
  E('e-pon-fb1-cam1',  'pontiac-firebird-1', 'chevy-camaro-gen1',  'shares_platform', 0.97),
  E('e-pon-fb2-cam2',  'pontiac-firebird-2', 'chevy-camaro-gen2',  'shares_platform', 0.97),
  E('e-pon-fb4-cam4',  'pontiac-firebird-4', 'chevy-camaro-gen4',  'shares_platform', 0.97),
  // GTO 1964 → GTO 1969 Judge
  E('e-pon-gto1-j',    'pontiac-gto-1',      'pontiac-gto-judge',  'evolves_into'),

  // ── Lincoln ────────────────────────────────────────────────────────────────
  E('e-lin-m2-m5',     'lincoln-mark2',      'lincoln-mark5',      'evolves_into'),
  E('e-lin-m5-tc',     'lincoln-mark5',      'lincoln-town-car',   'inspired_by', 0.70),
  E('e-lin-tc-mkz',    'lincoln-town-car',   'lincoln-mkz-1',      'inspired_by', 0.55),
  E('e-lin-nav1-avi',  'lincoln-navigator-1','lincoln-aviator-1',  'inspired_by', 0.65),
  E('e-lin-cnt1-m2',   'lincoln-continental-1','lincoln-mark2',    'inspired_by', 0.80),

  // ── AMC ────────────────────────────────────────────────────────────────────
  E('e-amc-jav-amx',   'amc-javelin-1',      'amc-amx-1968',       'variant_of', 0.88),
  E('e-amc-grm-pac',   'amc-gremlin',        'amc-pacer',          'inspired_by', 0.65),
  E('e-amc-grm-eagle', 'amc-gremlin',        'amc-eagle-1',        'inspired_by', 0.55),
  // AMC Javelin ↔ Plymouth Barracuda: конкуренты по pony-car классу
  E('e-amc-jav-bar',   'amc-javelin-1',      'plymouth-barracuda-3','inspired_by', 0.58),
  // AMC Eagle → Subaru (AWD пионеры в разных нишах)
  E('e-amc-eagle-hor', 'amc-hornet-1970',    'amc-javelin-1',      'inspired_by', 0.55),
]

// Проверяем якоря
;['pontiac-firebird-1','pontiac-firebird-3','pontiac-gto-1','pontiac-trans-am-ws6',
  'chevy-camaro-gen1','chevy-camaro-gen2','chevy-camaro-gen4',
  'lincoln-continental-1','lincoln-navigator-1','lincoln-town-car',
  'amc-hornet-1970','plymouth-barracuda-3'].forEach(id => {
  const n = g.nodes.find(n => n.id === id)
  if (!n) console.log('ОТСУТСТВУЕТ:', id)
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
console.log('Pontiac+Lincoln+AMC: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
