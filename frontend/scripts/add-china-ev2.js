'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existingIds = new Set(g.nodes.map(n => n.id))
const existingEdgeIds = new Set(g.edges.map(e => e.id))

// ─── Новые ноды ───────────────────────────────────────────────────────────────

const newNodes = [

  // ── Li Auto (理想汽车) — EREV-флагман Китая ──────────────────────────────
  {
    id: 'li-auto-one', label: 'Li One',
    type: 'generation', year: 2019,
    brandId: 'li-auto', brandName: 'Li Auto',
    modelSlug: 'li-auto-one', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 236, engineType: 'EREV',
  },
  {
    id: 'li-auto-l9', label: 'Li L9',
    type: 'generation', year: 2022,
    brandId: 'li-auto', brandName: 'Li Auto',
    modelSlug: 'li-auto-l9', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 449, engineType: 'EREV',
  },
  {
    id: 'li-auto-l8', label: 'Li L8',
    type: 'generation', year: 2023,
    brandId: 'li-auto', brandName: 'Li Auto',
    modelSlug: 'li-auto-l8', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 449, engineType: 'EREV',
  },
  {
    id: 'li-auto-l7', label: 'Li L7',
    type: 'generation', year: 2023,
    brandId: 'li-auto', brandName: 'Li Auto',
    modelSlug: 'li-auto-l7', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 449, engineType: 'EREV',
  },
  {
    id: 'li-auto-l6', label: 'Li L6',
    type: 'generation', year: 2024,
    brandId: 'li-auto', brandName: 'Li Auto',
    modelSlug: 'li-auto-l6', bodyType: 'suv',
    segment: 'compact_suv', zone: 'china_ev',
    hp: 400, engineType: 'EREV',
  },
  {
    id: 'li-auto-mega', label: 'Li Mega',
    type: 'generation', year: 2024,
    brandId: 'li-auto', brandName: 'Li Auto',
    modelSlug: 'li-auto-mega', bodyType: 'mpv',
    segment: 'mpv', zone: 'china_ev',
    hp: 640, engineType: 'BEV',
  },

  // ── HiPhi (高合) — ультра-люкс BEV ──────────────────────────────────────
  {
    id: 'hiphi-x', label: 'HiPhi X',
    type: 'generation', year: 2021,
    brandId: 'hiphi', brandName: 'HiPhi',
    modelSlug: 'hiphi-x', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 551, engineType: 'BEV',
  },
  {
    id: 'hiphi-z', label: 'HiPhi Z',
    type: 'generation', year: 2022,
    brandId: 'hiphi', brandName: 'HiPhi',
    modelSlug: 'hiphi-z', bodyType: 'coupe',
    segment: 'gt', zone: 'china_ev',
    hp: 597, engineType: 'BEV',
  },
  {
    id: 'hiphi-y', label: 'HiPhi Y',
    type: 'generation', year: 2023,
    brandId: 'hiphi', brandName: 'HiPhi',
    modelSlug: 'hiphi-y', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 476, engineType: 'BEV',
  },

  // ── Avatr (阿维塔) — Chery + Huawei + CATL ──────────────────────────────
  {
    id: 'avatr-11', label: 'Avatr 11',
    type: 'generation', year: 2022,
    brandId: 'avatr', brandName: 'Avatr',
    modelSlug: 'avatr-11', bodyType: 'suv',
    segment: 'crossover', zone: 'china_ev',
    hp: 425, engineType: 'BEV',
  },
  {
    id: 'avatr-12', label: 'Avatr 12',
    type: 'generation', year: 2023,
    brandId: 'avatr', brandName: 'Avatr',
    modelSlug: 'avatr-12', bodyType: 'sedan',
    segment: 'executive', zone: 'china_ev',
    hp: 578, engineType: 'BEV',
  },
  {
    id: 'avatr-07', label: 'Avatr 07',
    type: 'generation', year: 2024,
    brandId: 'avatr', brandName: 'Avatr',
    modelSlug: 'avatr-07', bodyType: 'sedan',
    segment: 'midsize', zone: 'china_ev',
    hp: 476, engineType: 'BEV',
  },

  // ── NIO новые модели ─────────────────────────────────────────────────────
  {
    id: 'nio-el8', label: 'NIO EL8',
    type: 'generation', year: 2023,
    brandId: 'nio', brandName: 'NIO',
    modelSlug: 'nio-el8', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 653, engineType: 'BEV',
  },
  {
    id: 'nio-ec7', label: 'NIO EC7',
    type: 'generation', year: 2023,
    brandId: 'nio', brandName: 'NIO',
    modelSlug: 'nio-ec7', bodyType: 'coupe_suv',
    segment: 'crossover', zone: 'china_ev',
    hp: 653, engineType: 'BEV',
  },
  {
    id: 'nio-et9', label: 'NIO ET9',
    type: 'generation', year: 2024,
    brandId: 'nio', brandName: 'NIO',
    modelSlug: 'nio-et9', bodyType: 'sedan',
    segment: 'ultra_luxury', zone: 'china_ev',
    hp: 900, engineType: 'BEV',
  },
  {
    id: 'nio-l60', label: 'NIO L60',
    type: 'generation', year: 2024,
    brandId: 'nio', brandName: 'NIO',
    modelSlug: 'nio-l60', bodyType: 'suv',
    segment: 'compact_suv', zone: 'china_ev',
    hp: 370, engineType: 'BEV',
  },

  // ── BYD новые модели ─────────────────────────────────────────────────────
  {
    id: 'byd-sea-lion9', label: 'BYD Sea Lion 9',
    type: 'generation', year: 2024,
    brandId: 'byd', brandName: 'BYD',
    modelSlug: 'byd-sea-lion9', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 579, engineType: 'PHEV',
  },
  {
    id: 'byd-destroyer05', label: 'BYD Destroyer 05',
    type: 'generation', year: 2022,
    brandId: 'byd', brandName: 'BYD',
    modelSlug: 'byd-destroyer05', bodyType: 'sedan',
    segment: 'compact', zone: 'china_ev',
    hp: 397, engineType: 'PHEV',
  },
  {
    id: 'byd-sea-hawk', label: 'BYD Sea Hawk',
    type: 'generation', year: 2024,
    brandId: 'byd', brandName: 'BYD',
    modelSlug: 'byd-sea-hawk', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 1200, engineType: 'PHEV',
  },

  // ── Xpeng новые модели ───────────────────────────────────────────────────
  {
    id: 'xpeng-x9-2024', label: 'Xpeng X9',
    type: 'generation', year: 2024,
    brandId: 'xpeng', brandName: 'Xpeng',
    codeName: 'X9 2024',
    modelSlug: 'xpeng-x9', bodyType: 'mpv',
    segment: 'mpv', zone: 'china_ev',
    hp: 551, engineType: 'BEV',
  },
  {
    id: 'xpeng-g9-2024', label: 'Xpeng G9 2024',
    type: 'generation', year: 2024,
    brandId: 'xpeng', brandName: 'Xpeng',
    codeName: 'G9 2024',
    modelSlug: 'xpeng-g9', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 551, engineType: 'BEV',
  },

  // ── Zeekr новые модели ───────────────────────────────────────────────────
  {
    id: 'zeekr-mix', label: 'Zeekr MIX',
    type: 'generation', year: 2024,
    brandId: 'zeekr', brandName: 'Zeekr',
    modelSlug: 'zeekr-mix', bodyType: 'mpv',
    segment: 'mpv', zone: 'china_ev',
    hp: 544, engineType: 'BEV',
  },
  {
    id: 'zeekr-7x', label: 'Zeekr 7X',
    type: 'generation', year: 2024,
    brandId: 'zeekr', brandName: 'Zeekr',
    modelSlug: 'zeekr-7x', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 475, engineType: 'BEV',
  },
]

// ─── Новые рёбра ──────────────────────────────────────────────────────────────

const newEdges = [
  // Li Auto — эволюция EREV
  { id: 'li-one-to-l9',        source: 'li-auto-one',    target: 'li-auto-l9',     type: 'evolves_into',    strength: 0.82 },
  { id: 'li-l9-to-l8',         source: 'li-auto-l9',     target: 'li-auto-l8',     type: 'derived_from',    strength: 0.88 },
  { id: 'li-l8-to-l7',         source: 'li-auto-l8',     target: 'li-auto-l7',     type: 'derived_from',    strength: 0.91 },
  { id: 'li-l7-to-l6',         source: 'li-auto-l7',     target: 'li-auto-l6',     type: 'derived_from',    strength: 0.85 },

  // HiPhi — линейка
  { id: 'hiphi-x-to-z',        source: 'hiphi-x',        target: 'hiphi-z',        type: 'derived_from',    strength: 0.74 },
  { id: 'hiphi-x-to-y',        source: 'hiphi-x',        target: 'hiphi-y',        type: 'derived_from',    strength: 0.78 },

  // Avatr — линейка
  { id: 'avatr-11-to-12',      source: 'avatr-11',       target: 'avatr-12',       type: 'derived_from',    strength: 0.71 },
  { id: 'avatr-12-to-07',      source: 'avatr-12',       target: 'avatr-07',       type: 'derived_from',    strength: 0.80 },

  // NIO — эволюция флагманов
  { id: 'nio-es8-to-el8',      source: 'nio-es8',        target: 'nio-el8',        type: 'evolves_into',    strength: 0.86 },
  { id: 'nio-et7-to-et9',      source: 'nio-et7',        target: 'nio-et9',        type: 'evolves_into',    strength: 0.83 },
  { id: 'nio-et5-to-l60',      source: 'nio-et5',        target: 'nio-l60',        type: 'derived_from',    strength: 0.72 },
  { id: 'nio-ec6-to-ec7',      source: 'nio-ec6',        target: 'nio-ec7',        type: 'evolves_into',    strength: 0.89 },

  // BYD — новые модели
  { id: 'byd-seal-to-sea-lion9', source: 'byd-seal-ev',  target: 'byd-sea-lion9',  type: 'derived_from',    strength: 0.76 },
  { id: 'byd-qin-to-destroyer',  source: 'byd-qin',      target: 'byd-destroyer05',type: 'derived_from',    strength: 0.82 },
  { id: 'byd-yw8-to-sea-hawk',   source: 'byd-yangwang-u8', target: 'byd-sea-hawk',type: 'derived_from',    strength: 0.80 },

  // Xpeng — версионирование
  { id: 'xpeng-x9-to-2024',    source: 'xpeng-x9',       target: 'xpeng-x9-2024', type: 'facelifted_to',   strength: 0.93 },
  { id: 'xpeng-g9-to-2024',    source: 'xpeng-g9',       target: 'xpeng-g9-2024', type: 'facelifted_to',   strength: 0.95 },

  // Zeekr — новые
  { id: 'zeekr-009-to-mix',    source: 'zeekr-009',      target: 'zeekr-mix',      type: 'derived_from',    strength: 0.75 },
  { id: 'zeekr-001-to-7x',     source: 'zeekr-001',      target: 'zeekr-7x',       type: 'derived_from',    strength: 0.70 },

  // ── Кросс-брендовые: платформы и вдохновение ─────────────────────────────
  // NIO ET9 → HiPhi Z (оба — ультра-люкс BEV GT/седан)
  { id: 'nio-et9-to-hiphi-z',  source: 'nio-et9',        target: 'hiphi-z',        type: 'shares_platform', strength: 0.65 },
  // Avatr 11 ← Huawei (как Aito/M5 — тот же Harmony Cockpit)
  { id: 'aito-m5-to-avatr11',  source: 'aito-m5',        target: 'avatr-11',       type: 'inspired_by',     strength: 0.68 },
  // Li Mega ← NIO ET9 (оба: ультра-BEV MPV/люкс 2024)
  { id: 'nio-et9-to-li-mega',  source: 'nio-et9',        target: 'li-auto-mega',   type: 'inspired_by',     strength: 0.61 },
  // BYD Sea Hawk вдохновлён Yangwang U8 (та же суперплатформа)
  { id: 'byd-yw8-inspires-seahawk', source: 'byd-yangwang-u8', target: 'byd-sea-hawk', type: 'inspired_by', strength: 0.85 },
]

// ─── Применяем ────────────────────────────────────────────────────────────────

let addedNodes = 0, addedEdges = 0, skippedNodes = 0, skippedEdges = 0

for (const node of newNodes) {
  if (existingIds.has(node.id)) { skippedNodes++; continue }
  g.nodes.push(node)
  existingIds.add(node.id)
  addedNodes++
}

for (const edge of newEdges) {
  if (existingEdgeIds.has(edge.id)) { skippedEdges++; continue }
  if (!existingIds.has(edge.source)) { console.log('⚠ MISSING source:', edge.source); continue }
  if (!existingIds.has(edge.target)) { console.log('⚠ MISSING target:', edge.target); continue }
  g.edges.push(edge)
  existingEdgeIds.add(edge.id)
  addedEdges++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))

console.log('✅ Done!')
console.log('  added nodes:', addedNodes, '| skipped:', skippedNodes)
console.log('  added edges:', addedEdges, '| skipped:', skippedEdges)
console.log('  total nodes:', g.nodes.length, '| total edges:', g.edges.length)

const broken = g.edges.filter(e => !existingIds.has(e.source) || !existingIds.has(e.target))
if (broken.length) {
  console.log('⚠ Broken edges:', broken.length)
  broken.forEach(e => console.log('  -', e.id))
} else {
  console.log('  graph integrity: ✅ no broken edges')
}
