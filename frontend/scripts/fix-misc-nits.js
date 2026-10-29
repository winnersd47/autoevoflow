'use strict'
/**
 * fix-misc-nits.js — три мелких, но конкретных находки этой сессии:
 *
 * 1. alfa-sauber-f1 (Alfa Romeo F1 Team, Sauber) имел bodyType "coupe" —
 *    формульная машина, не купе; из-за этого на /brand/alfa-romeo попадала
 *    в категорию "GT Coupes". Меняю на "Race Car" — тот же код уже
 *    используется в графе (p911-gt3-cup-992, тот же segment:"racing").
 *
 * 2. Два Land Rover Defender node (Vertex, Dakar Concept) получили modelSlug
 *    с лишним токеном "rover-" (land-rover-ROVER-defender-...) — корень
 *    найден и исправлен в scrape-latest.js (brandSlug "land_rover" → 2 слова
 *    бренда, раньше бралось только первое слово текста, "Land" без "Rover",
 *    что и утекало дальше при построении modelSlug/brandName). Эти два узла —
 *    уже существующие данные, код их не перегенерирует сам, правлю руками.
 *
 * 3. ncs-land-rover-2027-rover-range-rover-electric — настоящий дубль
 *    lr-rr-electric (тот же Range Rover Electric: совпадают 0-100 4.3s,
 *    разгон 50-75mph 2.7s, цена). lr-rr-electric богаче текстом (офиц.
 *    характеристики JLR, батарея, зарядка, источники), но без картинки —
 *    забираю heroImageUrl/thumbnailUrl/sourceUrl из NCS-дубля, сам дубль и
 *    его edge удаляю (lr-rr-l460→lr-rr-electric уже есть как variant_of,
 *    дублирующий evolves_into от NCS-узла был бы лишней второй связью между
 *    теми же двумя узлами).
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const byId = id => g.nodes.find(n => n.id === id)

// ── 1. Alfa Romeo F1 bodyType ────────────────────────────────────────────
const alfaF1 = byId('alfa-sauber-f1')
if (alfaF1 && alfaF1.bodyType !== 'Race Car') {
  console.log(`alfa-sauber-f1: bodyType ${alfaF1.bodyType} → Race Car`)
  alfaF1.bodyType = 'Race Car'
}

// ── 2. Land Rover Defender modelSlug ─────────────────────────────────────
const defenderFixes = {
  'ncs-land-rover-2027-rover-defender-vertex': 'land-rover-defender-vertex',
  'ncs-land-rover-2026-rover-defender-dakar-concept': 'land-rover-defender-dakar-concept',
}
for (const [id, newSlug] of Object.entries(defenderFixes)) {
  const n = byId(id)
  if (n && n.modelSlug !== newSlug) {
    console.log(`${id}: modelSlug ${n.modelSlug} → ${newSlug}`)
    n.modelSlug = newSlug
  }
}

// ── 3. Range Rover Electric: merge дубля в lr-rr-electric ────────────────
const dupId = 'ncs-land-rover-2027-rover-range-rover-electric'
const dup = byId(dupId)
const keeper = byId('lr-rr-electric')
if (dup && keeper) {
  keeper.heroImageUrl  = keeper.heroImageUrl  || dup.heroImageUrl
  keeper.thumbnailUrl  = keeper.thumbnailUrl  || dup.thumbnailUrl
  keeper.sourceUrl     = keeper.sourceUrl     || dup.sourceUrl
  keeper.description   = keeper.description   || dup.description
  console.log(`lr-rr-electric: обогащён картинками из ${dupId}`)

  const before = g.nodes.length
  g.nodes = g.nodes.filter(n => n.id !== dupId)
  const edgesBefore = g.edges.length
  g.edges = g.edges.filter(e => e.source !== dupId && e.target !== dupId)
  console.log(`Удалён дубль-узел ${dupId} (${before}→${g.nodes.length} узлов) и его рёбра (${edgesBefore}→${g.edges.length})`)
} else {
  console.log(`Пропуск п.3 — узел(ы) не найдены (dup=${!!dup}, keeper=${!!keeper}), возможно уже обработано`)
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('\nTotal:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
