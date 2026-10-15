/**
 * add-ram-full-evolution.js
 * Полная история RAM: от Dodge Power Wagon 1945 до RAM 1500 REV 2025
 *
 * Новые ноды (dodge):
 *   Power Wagon (1945) · D-Series D100 (1961) · Ram Gen1-3 · Ram SRT-10
 *   Ram HD Gen1-2 · Dakota Gen1-3 · Power Wagon revival (2005)
 * Новые ноды (ram):
 *   HD Gen3-4 · Power Wagon (2019) · Rebel · 1500 Classic · 1500 REV · ProMaster
 *
 * Ключевые кросс-брендовые рёбра:
 *   dodge-ram-3 → ram-1500-4 (derived_from, бренд-сплит 2009)
 *   dodge-ram-hd-2 → ram-hd-3 (derived_from, бренд-сплит 2009)
 *   dodge-challenger-srt-hellcat → ram-1500-trx (inspired_by, Hellcat DNA)
 */
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

  // ═══════════════════════════════════════════════════════════════
  // DODGE — предыстория RAM (до бренд-сплита 2009)
  // ═══════════════════════════════════════════════════════════════

  // Dodge Power Wagon (1945) — военный полноприводник, родоначальник пикапа
  N({ id: 'dodge-power-wagon-orig', label: 'Dodge Power Wagon (1945)', year: 1945,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-power-wagon-orig', familyKey: 'dodge-power-wagon',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 93, engineType: 'i6' }),

  // Dodge D-Series / D100 (1961) — гражданский пикап, предок Ram
  N({ id: 'dodge-d100-1961', label: 'Dodge D100 (1961)', year: 1961,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-d100', familyKey: 'dodge-d100',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 130, engineType: 'v8' }),

  // Dodge Ram Gen1 (AD-body / D150, 1981) — первый Ram badge
  N({ id: 'dodge-ram-1', label: 'Dodge Ram Gen1 (1981)', year: 1981,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-ram-1', familyKey: 'dodge-ram',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 165, engineType: 'v8', codeName: 'AD-body' }),

  // Dodge Ram Gen2 (BR/BE, 1994) — революционный кабина-вперёд дизайн
  N({ id: 'dodge-ram-2', label: 'Dodge Ram Gen2 (1994)', year: 1994,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-ram-2', familyKey: 'dodge-ram',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 245, engineType: 'v8', codeName: 'BR' }),

  // Dodge Ram Gen3 (DR, 2002) — Mega Cab, новый дизайн
  N({ id: 'dodge-ram-3', label: 'Dodge Ram Gen3 (2002)', year: 2002,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-ram-3', familyKey: 'dodge-ram',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 345, engineType: 'v8', codeName: 'DR' }),

  // Dodge Ram SRT-10 (2004) — двигатель Viper V10 508 л.с.
  N({ id: 'dodge-ram-srt10', label: 'Dodge Ram SRT-10 (2004)', year: 2004,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-ram-srt10', familyKey: 'dodge-ram',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 508, engineType: 'v10', codeName: 'SRT-10',
      a777Accel: 5.3, a777TopSpeed: 257 }),

  // Dodge Ram HD Gen1 (BR, 1994) — тяжёлый 2500/3500
  N({ id: 'dodge-ram-hd-1', label: 'Dodge Ram 2500 HD Gen1 (1994)', year: 1994,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-ram-hd-1', familyKey: 'dodge-ram-hd',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 250, engineType: 'v8', codeName: 'BR' }),

  // Dodge Ram HD Gen2 (DR, 2003)
  N({ id: 'dodge-ram-hd-2', label: 'Dodge Ram 2500 HD Gen2 (2003)', year: 2003,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-ram-hd-2', familyKey: 'dodge-ram-hd',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 305, engineType: 'v8', codeName: 'DR' }),

  // Dodge Power Wagon возрождение (2005) — внедорожный 2500 HD с блокировками
  N({ id: 'dodge-power-wagon-2005', label: 'Dodge Power Wagon revival (2005)', year: 2005,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-power-wagon-2005', familyKey: 'dodge-power-wagon',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 345, engineType: 'v8' }),

  // Dodge Dakota Gen1 (1987) — средний пикап
  N({ id: 'dodge-dakota-1', label: 'Dodge Dakota Gen1 (1987)', year: 1987,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-dakota-1', familyKey: 'dodge-dakota',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 125, engineType: 'v6' }),

  // Dodge Dakota Gen2 (1997)
  N({ id: 'dodge-dakota-2', label: 'Dodge Dakota Gen2 (1997)', year: 1997,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-dakota-2', familyKey: 'dodge-dakota',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 175, engineType: 'v8' }),

  // Dodge Dakota Gen3 (2005) — последнее поколение, снят в 2011
  N({ id: 'dodge-dakota-3', label: 'Dodge Dakota Gen3 (2005)', year: 2005,
      brandId: 'dodge', brandName: 'Dodge', modelSlug: 'dodge-dakota-3', familyKey: 'dodge-dakota',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 230, engineType: 'v8' }),

  // ═══════════════════════════════════════════════════════════════
  // RAM (отдельный бренд с 2009)
  // ═══════════════════════════════════════════════════════════════

  // Ram HD Gen3 (D2, 2010) — после сплита от Dodge
  N({ id: 'ram-hd-3', label: 'Ram 2500 HD Gen3 (2010)', year: 2010,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-hd-3', familyKey: 'ram-hd',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 400, engineType: 'v8', codeName: 'D2' }),

  // Ram HD Gen4 (DH, 2019) — текущее поколение, 6.7L Cummins дизель опция
  N({ id: 'ram-hd-4', label: 'Ram 2500 HD Gen4 (2019)', year: 2019,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-hd-4', familyKey: 'ram-hd',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 410, engineType: 'v8', codeName: 'DH' }),

  // Ram Power Wagon (2019) — Ram-эра внедорожный HD 2500
  N({ id: 'ram-power-wagon', label: 'Ram Power Wagon (2019)', year: 2019,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-power-wagon', familyKey: 'ram-hd',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 410, engineType: 'v8' }),

  // Ram 1500 Rebel (2015) — off-road lifestyle вариант Gen4
  N({ id: 'ram-rebel-1', label: 'Ram 1500 Rebel (2015)', year: 2015,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-rebel', familyKey: 'ram-1500',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 395, engineType: 'v8' }),

  // Ram 1500 Classic (2019) — Gen4 кузов продолжали продавать рядом с Gen5
  N({ id: 'ram-1500-classic', label: 'Ram 1500 Classic (2019)', year: 2019,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-1500-classic', familyKey: 'ram-1500',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 305, engineType: 'v8' }),

  // Ram 1500 REV (2025) — полностью электрический, ~654 л.с.
  N({ id: 'ram-1500-rev', label: 'Ram 1500 REV (2025)', year: 2025,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-1500-rev', familyKey: 'ram-1500',
      type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
      hp: 654, engineType: 'ev',
      a777Accel: 4.4 }),

  // Ram ProMaster (2014) — коммерческий фургон на базе Fiat Ducato
  N({ id: 'ram-promaster-1', label: 'Ram ProMaster (2014)', year: 2014,
      brandId: 'ram', brandName: 'Ram', modelSlug: 'ram-promaster', familyKey: 'ram-promaster',
      type: 'generation', bodyType: 'van', segment: 'commercial', zone: 'pickup',
      hp: 178, engineType: 'i4t' }),

]

const newEdges = [

  // ── Dodge Power Wagon → D100 → Ram Gen1-2-3 ──────────────────
  E('e-dpw-d100',   'dodge-power-wagon-orig', 'dodge-d100-1961', 'evolves_into', 0.75),
  E('e-dd100-ram1', 'dodge-d100-1961',         'dodge-ram-1',    'evolves_into'),
  E('e-dram1-2',    'dodge-ram-1',              'dodge-ram-2',    'evolves_into'),
  E('e-dram2-3',    'dodge-ram-2',              'dodge-ram-3',    'evolves_into'),

  // Dodge Ram SRT-10 — вариант Gen3
  E('e-dram3-srt10', 'dodge-ram-3', 'dodge-ram-srt10', 'variant_of', 0.9),

  // Dodge Ram → Ram 1500 (бренд-сплит 2009)
  E('e-dram3-ram4', 'dodge-ram-3', 'ram-1500-4', 'derived_from', 0.95),

  // ── Dodge Ram HD Gen1 → Gen2 ─────────────────────────────────
  E('e-dhd1-2', 'dodge-ram-hd-1', 'dodge-ram-hd-2', 'evolves_into'),

  // Ram Gen2 и HD Gen1 — общая платформа BR (1994)
  E('e-dram2-hd1', 'dodge-ram-2', 'dodge-ram-hd-1', 'variant_of', 0.85),

  // Power Wagon revival — вариант HD Gen2
  E('e-dhd2-pw05', 'dodge-ram-hd-2', 'dodge-power-wagon-2005', 'variant_of', 0.85),

  // Dodge Ram HD → Ram HD (бренд-сплит 2009)
  E('e-dhd2-rhd3', 'dodge-ram-hd-2', 'ram-hd-3', 'derived_from', 0.95),

  // ── Ram HD Gen3 → Gen4 ───────────────────────────────────────
  E('e-rhd3-4',   'ram-hd-3', 'ram-hd-4', 'evolves_into'),

  // Ram Power Wagon — вариант HD Gen4
  E('e-rpw-rhd4', 'ram-hd-4', 'ram-power-wagon', 'variant_of', 0.85),

  // Power Wagon 1945 вдохновил возрождение 2005
  E('e-dpw45-05', 'dodge-power-wagon-orig', 'dodge-power-wagon-2005', 'inspired_by', 0.9),

  // Ram HD и Ram 1500 — общая платформа Gen4/Gen5
  E('e-rhd3-ram4', 'ram-hd-3', 'ram-1500-4', 'inspired_by', 0.7),

  // ── Ram 1500 Gen4 варианты ───────────────────────────────────
  E('e-ram4-rebel',   'ram-1500-4', 'ram-rebel-1',     'variant_of', 0.85),
  E('e-ram4-classic', 'ram-1500-4', 'ram-1500-classic', 'facelifted_to', 0.8),

  // ── Ram 1500 Gen5 → REV electric ────────────────────────────
  E('e-ram5-rev', 'ram-1500-5', 'ram-1500-rev', 'variant_of', 0.9),

  // ── Dodge Dakota Gen1 → Gen2 → Gen3 ─────────────────────────
  E('e-ddak1-2', 'dodge-dakota-1', 'dodge-dakota-2', 'evolves_into'),
  E('e-ddak2-3', 'dodge-dakota-2', 'dodge-dakota-3', 'evolves_into'),

  // Dakota и Ram 1500 — общая корпоративная платформа (вдохновение)
  E('e-ddak1-ram1', 'dodge-ram-1', 'dodge-dakota-1', 'inspired_by', 0.6),

  // Hellcat DNA → Ram TRX (cross-brand inspired_by)
  E('e-hellcat-trx', 'dodge-challenger-srt-hellcat', 'ram-1500-trx', 'inspired_by', 0.85),

]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0

for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) { g.edges.push(e); addedE++ }
  else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('RAM full evolution: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
