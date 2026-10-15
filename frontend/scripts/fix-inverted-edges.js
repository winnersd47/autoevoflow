#!/usr/bin/env node
/**
 * fix-inverted-edges.js
 *
 * 1. М-21 → М-22: было variant_of (стрелка назад 1962→1956), стало inspired (вперёд 1956→1962)
 * 2. Lada Granta — тупик: добавляем Granta FL (2018) и Granta Cross (2018) как продолжение
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// ── 1. Удаляем инверсное ребро М-22 → variant_of → М-21 ───────────────────────
const before = g.edges.length
g.edges = g.edges.filter(e => e.id !== 'gaz-m21-variant-m22')
console.log(`🗑  Удалено рёбер: ${before - g.edges.length} (gaz-m21-variant-m22)`)

// ── Новые узлы ─────────────────────────────────────────────────────────────────
const NEW_NODES = [
  {
    id: 'lada-granta-fl', label: 'Lada Granta FL',
    type: 'generation', year: 2018, brandId: 'lada', brandName: 'Lada',
    codeName: 'Granta 2018', modelSlug: 'lada-granta',
    bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed',
    hp: 87, engineType: 'i4',
    note: 'Рестайлинг 2018: новый бампер, приборная панель от Vesta, обновлённый интерьер; с 2021 — второй рестайлинг с обновлённой мультимедиа',
  },
  {
    id: 'lada-granta-cross', label: 'Lada Granta Cross',
    type: 'generation', year: 2019, brandId: 'lada', brandName: 'Lada',
    codeName: 'Granta Cross', modelSlug: 'lada-granta-cross',
    bodyType: 'hatchback', segment: 'compact_suv', zone: 'suv_compact',
    hp: 106, engineType: 'i4',
    note: 'Приподнятый хэтчбек на базе Granta; клиренс 203 мм; полный привод опционально; отвечал на XRAY Cross; популярен на бездорожье',
  },
]

// ── Новые рёбра ────────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // 1. ИСПРАВЛЕНИЕ: М-21 → inspired → М-22
  //    Универсал М-22 создан на базе седана М-21 — стрелка вперёд (1956→1962)
  {
    id: 'gaz-m21-inspired-m22',
    source: 'gaz-volga-m21', target: 'gaz-volga-m22',
    type: 'inspired', strength: 0.90,
  },

  // 2. Granta → Granta FL (рестайлинг 2018)
  {
    id: 'lada-granta-facelift-fl',
    source: 'lada-granta', target: 'lada-granta-fl',
    type: 'facelifted_to', strength: 0.95,
  },

  // 3. Granta FL → Granta Cross (кроссовер на базе FL)
  {
    id: 'lada-granta-fl-variant-cross',
    source: 'lada-granta-cross', target: 'lada-granta-fl',
    type: 'variant_of', strength: 0.88,
  },

  // 4. XRAY inspired by Granta Cross concept
  {
    id: 'lada-granta-cross-inspired-xray',
    source: 'lada-granta-cross', target: 'lada-xray',
    type: 'inspired', strength: 0.60,
  },
]

// ── Запись ────────────────────────────────────────────────────────────────────
const ids  = new Set(g.nodes.map(n => n.id))
const eids = new Set(g.edges.map(e => e.id))
let nA = 0, eA = 0, nS = 0, eS = 0

for (const node of NEW_NODES) {
  if (ids.has(node.id)) { nS++; continue }
  g.nodes.push(node); ids.add(node.id); nA++
  console.log(`✅ [${node.brandId}] ${node.label} (${node.year})`)
}

for (const edge of NEW_EDGES) {
  if (eids.has(edge.id)) { eS++; continue }
  if (!ids.has(edge.source)) { console.warn(`⚠  source не найден: ${edge.source}`); eS++; continue }
  if (!ids.has(edge.target)) { console.warn(`⚠  target не найден: ${edge.target}`); eS++; continue }
  g.edges.push(edge); eids.add(edge.id); eA++
  console.log(`✅ [${edge.type}] ${edge.source} → ${edge.target}`)
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов (+${nA}), ${g.edges.length} рёбер (+${eA}), ${brands} брендов`)
console.log(`   пропущено: ${nS} узлов, ${eS} рёбер`)
