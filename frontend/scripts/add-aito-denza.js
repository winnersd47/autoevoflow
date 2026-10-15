'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existingIds = new Set(g.nodes.map(n => n.id))
const existingEdgeIds = new Set(g.edges.map(e => e.id))

// ─── Новые ноды ───────────────────────────────────────────────────────────────

const newNodes = [
  // ── Seres (предшественник Aito) ──────────────────────────────────────────
  {
    id: 'seres-sf5', label: 'Seres SF5',
    type: 'generation', year: 2021,
    brandId: 'seres', brandName: 'Seres',
    modelSlug: 'seres-sf5', bodyType: 'suv',
    segment: 'crossover', zone: 'china_ev',
    hp: 551, engineType: 'PHEV',
  },

  // ── Aito (问界) — Huawei + Seres ─────────────────────────────────────────
  {
    id: 'aito-m5', label: 'Aito M5',
    type: 'generation', year: 2022,
    brandId: 'aito', brandName: 'Aito',
    modelSlug: 'aito-m5', bodyType: 'suv',
    segment: 'crossover', zone: 'china_ev',
    hp: 365, engineType: 'PHEV',
  },
  {
    id: 'aito-m7', label: 'Aito M7',
    type: 'generation', year: 2022,
    brandId: 'aito', brandName: 'Aito',
    modelSlug: 'aito-m7', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 330, engineType: 'PHEV',
  },
  {
    id: 'aito-m7-2023', label: 'Aito M7 Pro',
    type: 'generation', year: 2023,
    brandId: 'aito', brandName: 'Aito',
    codeName: 'M7 Pro', modelSlug: 'aito-m7',
    bodyType: 'suv', segment: 'midsize_suv', zone: 'china_ev',
    hp: 380, engineType: 'PHEV',
  },
  {
    id: 'aito-m9', label: 'Aito M9',
    type: 'generation', year: 2024,
    brandId: 'aito', brandName: 'Aito',
    modelSlug: 'aito-m9', bodyType: 'suv',
    segment: 'fullsize_suv', zone: 'china_ev',
    hp: 526, engineType: 'PHEV',
  },

  // ── Denza (腾势) — BYD + Mercedes-Benz ───────────────────────────────────
  {
    id: 'denza-d9', label: 'Denza D9',
    type: 'generation', year: 2022,
    brandId: 'denza', brandName: 'Denza',
    modelSlug: 'denza-d9', bodyType: 'mpv',
    segment: 'mpv', zone: 'china_ev',
    hp: 435, engineType: 'PHEV',
  },
  {
    id: 'denza-n7', label: 'Denza N7',
    type: 'generation', year: 2023,
    brandId: 'denza', brandName: 'Denza',
    modelSlug: 'denza-n7', bodyType: 'suv',
    segment: 'crossover', zone: 'china_ev',
    hp: 475, engineType: 'BEV',
  },
  {
    id: 'denza-n8', label: 'Denza N8',
    type: 'generation', year: 2023,
    brandId: 'denza', brandName: 'Denza',
    modelSlug: 'denza-n8', bodyType: 'suv',
    segment: 'midsize_suv', zone: 'china_ev',
    hp: 536, engineType: 'PHEV',
  },
  {
    id: 'denza-z9gt', label: 'Denza Z9 GT',
    type: 'generation', year: 2024,
    brandId: 'denza', brandName: 'Denza',
    modelSlug: 'denza-z9gt', bodyType: 'fastback',
    segment: 'sports_gt', zone: 'china_ev',
    hp: 952, engineType: 'PHEV',
  },
]

// ─── Новые рёбра ──────────────────────────────────────────────────────────────

const newEdges = [
  // Aito эволюционная цепочка
  { id: 'seres-sf5-to-aito-m5',    source: 'seres-sf5',   target: 'aito-m5',      type: 'evolves_into',    strength: 0.80 },
  { id: 'aito-m5-to-m7',           source: 'aito-m5',     target: 'aito-m7',      type: 'derived_from',    strength: 0.72 },
  { id: 'aito-m7-to-m7pro',        source: 'aito-m7',     target: 'aito-m7-2023', type: 'facelifted_to',   strength: 0.92 },
  { id: 'aito-m7pro-to-m9',        source: 'aito-m7-2023',target: 'aito-m9',      type: 'derived_from',    strength: 0.76 },

  // Denza внутренняя цепочка
  { id: 'denza-d9-to-n7',          source: 'denza-d9',    target: 'denza-n7',     type: 'derived_from',    strength: 0.70 },
  { id: 'denza-d9-to-n8',          source: 'denza-d9',    target: 'denza-n8',     type: 'derived_from',    strength: 0.74 },
  { id: 'denza-n8-to-z9gt',        source: 'denza-n8',    target: 'denza-z9gt',   type: 'derived_from',    strength: 0.80 },

  // Кросс-брендовые: Denza ← BYD (платформа)
  { id: 'byd-han-ev-to-denza-d9',  source: 'byd-han-ev',  target: 'denza-d9',     type: 'shares_platform', strength: 0.82 },
  { id: 'byd-tang-to-denza-n8',    source: 'byd-tang-phev',target: 'denza-n8',    type: 'shares_platform', strength: 0.88 },

  // Кросс-брендовые: Denza Z9 GT ← Mercedes AMG GT 4-door (дизайн-ДНК)
  { id: 'merc-amg-gt4-to-denza-z9', source: 'merc-amg-gt4-x290', target: 'denza-z9gt', type: 'inspired_by', strength: 0.73 },

  // Кросс-брендовые: Denza D9 ← Mercedes S-Class (интерьер/позиционирование)
  { id: 'merc-s223-to-denza-d9',   source: 'merc-s-w223', target: 'denza-d9',     type: 'inspired_by',     strength: 0.65 },
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

// Проверка битых рёбер
const broken = g.edges.filter(e => !existingIds.has(e.source) || !existingIds.has(e.target))
if (broken.length) {
  console.log('⚠ Broken edges:', broken.length)
  broken.forEach(e => console.log('  -', e.id))
} else {
  console.log('  graph integrity: ✅ no broken edges')
}
