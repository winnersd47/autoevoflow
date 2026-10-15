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
  // ══ BYD ═══════════════════════════════════════════════════════════════════

  // ── BYD F3 (2005) — первый массовый BYD, клон Toyota Corolla E120 ─────────
  N({ id:'byd-f3', label:'BYD F3 (2005)', year:2005,
      brandId:'byd', brandName:'BYD', modelSlug:'byd-f3', familyKey:'byd-f3',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:100, engineType:'i4', codeName:'F3 / F3R' }),

  // ── BYD Qin (2013) — первый PHEV-седан BYD, старт DM-эпохи ──────────────
  N({ id:'byd-qin', label:'BYD Qin (2013)', year:2013,
      brandId:'byd', brandName:'BYD', modelSlug:'byd-qin', familyKey:'byd-dynasty',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:217, engineType:'i4t', codeName:'DM / QIN 1.5TI' }),

  // ── BYD Song Pro PHEV (2018) — флагман «Династии» ──────────────────────
  N({ id:'byd-song-pro', label:'BYD Song Pro PHEV (2018)', year:2018,
      brandId:'byd', brandName:'BYD', modelSlug:'byd-song-pro', familyKey:'byd-dynasty',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv_compact',
      hp:249, engineType:'i4t', codeName:'DM-i / Song Pro' }),

  // ── BYD Blade Battery Era: BYD EV platform 3.0 flagship ──────────────────
  N({ id:'byd-sea-lion7', label:'BYD Sea Lion 7 (2024)', year:2024,
      brandId:'byd', brandName:'BYD', modelSlug:'byd-sea-lion7', familyKey:'byd-ocean',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:390, engineType:'BEV', codeName:'e-Platform 3.0 / CTB' }),

  // ══ NIO ════════════════════════════════════════════════════════════════════

  // ── NIO ES6 (2019) — midsize SUV, доступнее ES8 ──────────────────────────
  N({ id:'nio-es6', label:'NIO ES6 (2019)', year:2019,
      brandId:'nio', brandName:'NIO', modelSlug:'nio-es6', familyKey:'nio-suv',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:544, engineType:'BEV', codeName:'ES6 / 100kWh BPS' }),

  // ── NIO EC6 (2020) — купе-SUV ────────────────────────────────────────────
  N({ id:'nio-ec6', label:'NIO EC6 (2020)', year:2020,
      brandId:'nio', brandName:'NIO', modelSlug:'nio-ec6', familyKey:'nio-suv',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:483, engineType:'BEV', codeName:'EC6 Coupe SUV' }),

  // ── NIO ET5 Touring (2022) — электрический универсал ─────────────────────
  N({ id:'nio-et5t', label:'NIO ET5 Touring (2022)', year:2022,
      brandId:'nio', brandName:'NIO', modelSlug:'nio-et5t', familyKey:'nio-sedan',
      type:'generation', bodyType:'wagon', segment:'midsize', zone:'estate',
      hp:489, engineType:'BEV', codeName:'ET5T / Touring' }),

  // ══ XPENG ══════════════════════════════════════════════════════════════════

  // ── Xpeng P5 (2021) — первый серийный LiDAR-автомобиль ───────────────────
  N({ id:'xpeng-p5', label:'Xpeng P5 (2021)', year:2021,
      brandId:'xpeng', brandName:'Xpeng', modelSlug:'xpeng-p5', familyKey:'xpeng-sedan',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:196, engineType:'BEV', codeName:'P5 / SEPA2.0' }),

  // ── Xpeng G6 (2023) — среднеразмерный кроссовер на 800В ──────────────────
  N({ id:'xpeng-g6', label:'Xpeng G6 (2023)', year:2023,
      brandId:'xpeng', brandName:'Xpeng', modelSlug:'xpeng-g6', familyKey:'xpeng-suv',
      type:'generation', bodyType:'suv', segment:'midsize', zone:'suv_mid',
      hp:295, engineType:'BEV', codeName:'G6 / 800V SEPA2.0' }),

  // ══ ZEEKR ══════════════════════════════════════════════════════════════════

  // ── Zeekr X (2023) — городской кроссовер на SEA-платформе ─────────────────
  N({ id:'zeekr-x', label:'Zeekr X (2023)', year:2023,
      brandId:'zeekr', brandName:'Zeekr', modelSlug:'zeekr-x', familyKey:'zeekr-suv',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv_compact',
      hp:272, engineType:'BEV', codeName:'SEA-S / ME11' }),

  // ── Zeekr 007 (2024) — спортивный 800В-седан ─────────────────────────────
  N({ id:'zeekr-007', label:'Zeekr 007 (2024)', year:2024,
      brandId:'zeekr', brandName:'Zeekr', modelSlug:'zeekr-007', familyKey:'zeekr-sedan',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:536, engineType:'BEV', codeName:'SEA-M / 800V' }),

  // ══ LYNK & CO ══════════════════════════════════════════════════════════════

  // ── Lynk & Co 05 (2019) — купе-кроссовер на CMA ──────────────────────────
  N({ id:'lynk-co-05', label:'Lynk & Co 05 (2019)', year:2019,
      brandId:'lynk-co', brandName:'Lynk & Co', modelSlug:'lynk-co-05', familyKey:'lynk-co',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv_compact',
      hp:265, engineType:'i4t', codeName:'CMA / 05' }),

  // ── Lynk & Co Z10 (2024) — флагман на SEA-платформе ──────────────────────
  N({ id:'lynk-co-z10', label:'Lynk & Co Z10 (2024)', year:2024,
      brandId:'lynk-co', brandName:'Lynk & Co', modelSlug:'lynk-co-z10', familyKey:'lynk-co',
      type:'generation', bodyType:'sedan', segment:'flagship', zone:'flagship_sed',
      hp:748, engineType:'BEV', codeName:'SEA / Z10' }),
]

const newEdges = [
  // BYD эволюция
  E('e-byd-f3-qin',       'byd-f3',        'byd-qin',        'inspired_by', 0.60),
  E('e-byd-qin-songpro',  'byd-qin',       'byd-song-pro',   'inspired_by', 0.55),
  E('e-byd-seal-lion7',   'byd-seal',      'byd-sea-lion7',  'inspired_by', 0.72),
  // BYD Song Plus → Song Pro (семейная связь)
  E('e-byd-songp-songpro','byd-song-plus-phev','byd-song-pro','evolves_into'),

  // NIO семейство
  E('e-nio-es8-es6',      'nio-es8',       'nio-es6',        'inspired_by', 0.70),
  E('e-nio-es6-ec6',      'nio-es6',       'nio-ec6',        'derived_from', 0.85),
  E('e-nio-et7-et5t',     'nio-et7',       'nio-et5t',       'inspired_by', 0.65),

  // Xpeng линия
  E('e-xpeng-p7-p5',      'xpeng-p7',      'xpeng-p5',       'inspired_by', 0.65),
  E('e-xpeng-g9-g6',      'xpeng-g9',      'xpeng-g6',       'inspired_by', 0.70),

  // Zeekr линия (производный от Geely SEA)
  E('e-zeekr-001-x',      'zeekr-001',     'zeekr-x',        'inspired_by', 0.65),
  E('e-zeekr-001-007',    'zeekr-001',     'zeekr-007',      'inspired_by', 0.70),

  // Lynk & Co линия
  E('e-lco-01-05',        'lynk-co-01',    'lynk-co-05',     'inspired_by', 0.60),
  E('e-lco-08-z10',       'lynk-co-08',    'lynk-co-z10',    'evolves_into'),

  // Кросс-брендовые: Geely SEA-платформа объединяет Zeekr и Lynk
  E('e-zeekr-x-z10',      'zeekr-x',       'lynk-co-z10',    'shares_platform', 0.88),
  E('e-zeekr007-z10',     'zeekr-007',     'lynk-co-z10',    'shares_platform', 0.85),
]

// Проверяем якоря
;['byd-seal','byd-song-plus-phev','nio-es8','nio-et7','xpeng-p7','xpeng-g9',
  'zeekr-001','lynk-co-01','lynk-co-08'].forEach(id => {
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
    if (!s) { console.log('  SKIP '+e.id+': нет source '+e.source); skipE++; continue }
    if (!t) { console.log('  SKIP '+e.id+': нет target '+e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge:', e.id); skipE++ }
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('China expansion: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
