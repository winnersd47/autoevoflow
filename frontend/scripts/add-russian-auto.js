#!/usr/bin/env node
/**
 * add-russian-auto.js — добавляет российский автопром в граф эволюции:
 *   GAZ/Волга  (8 нод, 1946–2010)
 *   Lada       (12 нод, 1970–2023)
 *   UAZ        (5 нод, 1972–2023)
 *   AURUS      (3 нода, 2018–2022)
 * Итого: 28 нод, ~30 рёбер
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// ── Nodes ─────────────────────────────────────────────────────────────────────

const NEW_NODES = [

  // ──────────────────────────────── GAZ / ВОЛГА ─────────────────────────────
  {
    id: 'gaz-pobeda-m20', label: 'Победа М-20', type: 'generation',
    year: 1946, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'M-20', modelSlug: 'gaz-pobeda', bodyType: 'sedan',
    segment: 'midsize', zone: 'midsize_sed', hp: 50, engineType: 'i4',
  },
  {
    id: 'gaz-volga-m21', label: 'Волга М-21', type: 'generation',
    year: 1956, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'М-21', modelSlug: 'gaz-volga-m21', bodyType: 'sedan',
    segment: 'midsize', zone: 'exec_sed', hp: 65, engineType: 'i4',
  },
  {
    id: 'gaz-volga-m22', label: 'Волга М-22', type: 'generation',
    year: 1962, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'М-22', modelSlug: 'gaz-volga-m22', bodyType: 'estate',
    segment: 'midsize', zone: 'exec_sed', hp: 75, engineType: 'i4',
  },
  {
    id: 'gaz-volga-m24', label: 'Волга ГАЗ-24', type: 'generation',
    year: 1970, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'ГАЗ-24', modelSlug: 'gaz-volga-24', bodyType: 'sedan',
    segment: 'exec', zone: 'exec_sed', hp: 85, engineType: 'i4',
  },
  {
    id: 'gaz-volga-24-10', label: 'Волга ГАЗ-24-10', type: 'generation',
    year: 1987, brandId: 'gaz', brandName: 'GAZ', isFacelift: true,
    codeName: 'ГАЗ-24-10', modelSlug: 'gaz-volga-24', bodyType: 'sedan',
    segment: 'exec', zone: 'exec_sed', hp: 90, engineType: 'i4',
  },
  {
    id: 'gaz-volga-3102', label: 'Волга ГАЗ-3102', type: 'generation',
    year: 1981, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'ГАЗ-3102', modelSlug: 'gaz-volga-3102', bodyType: 'sedan',
    segment: 'exec', zone: 'exec_sed', hp: 100, engineType: 'i4',
  },
  {
    id: 'gaz-volga-3110', label: 'Волга ГАЗ-3110', type: 'generation',
    year: 1997, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'ГАЗ-3110', modelSlug: 'gaz-volga-3110', bodyType: 'sedan',
    segment: 'exec', zone: 'exec_sed', hp: 100, engineType: 'i4',
  },
  {
    id: 'gaz-siber', label: 'Волга Сайбер', type: 'generation',
    year: 2008, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'Siber', modelSlug: 'gaz-siber', bodyType: 'sedan',
    segment: 'midsize', zone: 'midsize_sed', hp: 142, engineType: 'i4',
  },

  // ──────────────────────────────── LADA ────────────────────────────────────
  {
    id: 'lada-2101', label: 'ВАЗ-2101 Жигули', type: 'generation',
    year: 1970, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2101', modelSlug: 'lada-2101', bodyType: 'sedan',
    segment: 'compact', zone: 'midsize_sed', hp: 60, engineType: 'i4',
  },
  {
    id: 'lada-2103', label: 'ВАЗ-2103/2106', type: 'generation',
    year: 1972, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2103', modelSlug: 'lada-2103', bodyType: 'sedan',
    segment: 'compact', zone: 'midsize_sed', hp: 71, engineType: 'i4',
  },
  {
    id: 'lada-niva-2121', label: 'Нива ВАЗ-2121', type: 'generation',
    year: 1977, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2121', modelSlug: 'lada-niva', bodyType: 'suv',
    segment: 'suv_compact', zone: 'suv_compact', hp: 64, engineType: 'i4',
  },
  {
    id: 'lada-samara-2108', label: 'Самара ВАЗ-2108', type: 'generation',
    year: 1984, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2108', modelSlug: 'lada-samara', bodyType: 'hatchback',
    segment: 'compact', zone: 'hatchback', hp: 64, engineType: 'i4',
  },
  {
    id: 'lada-2110', label: 'ВАЗ-2110', type: 'generation',
    year: 1995, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2110', modelSlug: 'lada-2110', bodyType: 'sedan',
    segment: 'compact', zone: 'midsize_sed', hp: 79, engineType: 'i4',
  },
  {
    id: 'lada-niva-legend', label: 'Niva Legend (4x4)', type: 'generation',
    year: 2021, brandId: 'lada', brandName: 'Lada', isFacelift: true,
    codeName: 'ВАЗ-21214', modelSlug: 'lada-niva', bodyType: 'suv',
    segment: 'suv_compact', zone: 'suv_compact', hp: 83, engineType: 'i4',
  },
  {
    id: 'lada-kalina', label: 'Lada Kalina', type: 'generation',
    year: 2004, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-1117', modelSlug: 'lada-kalina', bodyType: 'hatchback',
    segment: 'supermini', zone: 'hatchback', hp: 75, engineType: 'i4',
  },
  {
    id: 'lada-granta', label: 'Lada Granta', type: 'generation',
    year: 2011, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2190', modelSlug: 'lada-granta', bodyType: 'sedan',
    segment: 'compact', zone: 'midsize_sed', hp: 87, engineType: 'i4',
  },
  {
    id: 'lada-priora', label: 'Lada Priora', type: 'generation',
    year: 2007, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2170', modelSlug: 'lada-priora', bodyType: 'sedan',
    segment: 'compact', zone: 'midsize_sed', hp: 97, engineType: 'i4',
  },
  {
    id: 'lada-vesta', label: 'Lada Vesta', type: 'generation',
    year: 2015, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2180', modelSlug: 'lada-vesta', bodyType: 'sedan',
    segment: 'compact', zone: 'midsize_sed', hp: 106, engineType: 'i4',
  },
  {
    id: 'lada-xray', label: 'Lada XRAY', type: 'generation',
    year: 2016, brandId: 'lada', brandName: 'Lada',
    codeName: 'XRAY', modelSlug: 'lada-xray', bodyType: 'suv',
    segment: 'suv_compact', zone: 'suv_compact', hp: 113, engineType: 'i4',
  },
  {
    id: 'lada-niva-travel', label: 'Niva Travel', type: 'generation',
    year: 2020, brandId: 'lada', brandName: 'Lada',
    codeName: 'ВАЗ-2123', modelSlug: 'lada-niva-travel', bodyType: 'suv',
    segment: 'suv_compact', zone: 'suv_compact', hp: 123, engineType: 'i4',
  },
  {
    id: 'lada-evesta', label: 'e-Vesta', type: 'generation',
    year: 2023, brandId: 'lada', brandName: 'Lada',
    codeName: 'e-Vesta', modelSlug: 'lada-evesta', bodyType: 'sedan',
    segment: 'electric', zone: 'electric', hp: 136, engineType: 'electric',
  },

  // ──────────────────────────────── UAZ ─────────────────────────────────────
  {
    id: 'uaz-469', label: 'УАЗ-469', type: 'generation',
    year: 1972, brandId: 'uaz', brandName: 'UAZ',
    codeName: 'UAZ-469', modelSlug: 'uaz-469', bodyType: 'suv',
    segment: 'suv_large', zone: 'suv_large', hp: 75, engineType: 'i4',
  },
  {
    id: 'uaz-452', label: 'УАЗ-452 Буханка', type: 'generation',
    year: 1965, brandId: 'uaz', brandName: 'UAZ',
    codeName: 'UAZ-452', modelSlug: 'uaz-452', bodyType: 'van',
    segment: 'suv_large', zone: 'suv_large', hp: 77, engineType: 'i4',
  },
  {
    id: 'uaz-hunter', label: 'UAZ Hunter', type: 'generation',
    year: 2003, brandId: 'uaz', brandName: 'UAZ',
    codeName: 'Hunter', modelSlug: 'uaz-hunter', bodyType: 'suv',
    segment: 'suv_large', zone: 'suv_large', hp: 112, engineType: 'i4',
  },
  {
    id: 'uaz-patriot', label: 'UAZ Patriot', type: 'generation',
    year: 2005, brandId: 'uaz', brandName: 'UAZ',
    codeName: 'Patriot', modelSlug: 'uaz-patriot', bodyType: 'suv',
    segment: 'suv_large', zone: 'suv_large', hp: 135, engineType: 'i4',
  },
  {
    id: 'uaz-patriot-fl', label: 'UAZ Patriot II', type: 'generation',
    year: 2022, brandId: 'uaz', brandName: 'UAZ', isFacelift: true,
    codeName: 'Patriot II', modelSlug: 'uaz-patriot', bodyType: 'suv',
    segment: 'suv_large', zone: 'suv_large', hp: 150, engineType: 'i4',
  },

  // ──────────────────────────────── AURUS ───────────────────────────────────
  {
    id: 'aurus-senat', label: 'Aurus Senat', type: 'generation',
    year: 2018, brandId: 'aurus', brandName: 'Aurus',
    codeName: 'L700', modelSlug: 'aurus-senat', bodyType: 'sedan',
    segment: 'flagship', zone: 'flagship_sed', hp: 598, engineType: 'v8-hybrid',
  },
  {
    id: 'aurus-komendant', label: 'Aurus Komendant', type: 'generation',
    year: 2022, brandId: 'aurus', brandName: 'Aurus',
    codeName: 'K4', modelSlug: 'aurus-komendant', bodyType: 'suv',
    segment: 'suv_large', zone: 'suv_large', hp: 598, engineType: 'v8-hybrid',
  },
  {
    id: 'aurus-arsen', label: 'Aurus Арсен', type: 'generation',
    year: 2021, brandId: 'aurus', brandName: 'Aurus',
    codeName: 'L783', modelSlug: 'aurus-arsen', bodyType: 'limousine',
    segment: 'flagship', zone: 'flagship_sed', hp: 598, engineType: 'v8-hybrid',
  },
]

// ── Edges ─────────────────────────────────────────────────────────────────────

const NEW_EDGES = [

  // ── GAZ/Волга ─────────────────────────────────────────────────────────────
  // Победа → Волга М-21 (прямое развитие)
  { id: 'gaz-pobeda-evolves-m21', source: 'gaz-pobeda-m20', target: 'gaz-volga-m21',
    type: 'evolves_into', strength: 0.85 },
  // М-21 → М-22 (универсал, вариант)
  { id: 'gaz-m21-variant-m22', source: 'gaz-volga-m22', target: 'gaz-volga-m21',
    type: 'variant_of', strength: 0.90 },
  // М-21 → ГАЗ-24 (следующее поколение)
  { id: 'gaz-m21-evolves-m24', source: 'gaz-volga-m21', target: 'gaz-volga-m24',
    type: 'evolves_into', strength: 0.88 },
  // ГАЗ-24 → ГАЗ-24-10 (рестайлинг)
  { id: 'gaz-m24-facelift-24-10', source: 'gaz-volga-m24', target: 'gaz-volga-24-10',
    type: 'facelifted_to', strength: 0.92 },
  // ГАЗ-24 → ГАЗ-3102 (правительственный вариант)
  { id: 'gaz-m24-derived-3102', source: 'gaz-volga-3102', target: 'gaz-volga-m24',
    type: 'derived_from', strength: 0.80 },
  // ГАЗ-24-10 → ГАЗ-3110 (финальная Волга)
  { id: 'gaz-24-10-evolves-3110', source: 'gaz-volga-24-10', target: 'gaz-volga-3110',
    type: 'evolves_into', strength: 0.82 },

  // ── Lada ──────────────────────────────────────────────────────────────────
  // ВАЗ-2101 → ВАЗ-2103/06 (более мощная версия)
  { id: 'lada-2101-evolves-2103', source: 'lada-2101', target: 'lada-2103',
    type: 'evolves_into', strength: 0.82 },
  // ВАЗ-2101 → ВАЗ-2110 (следующее поколение седана)
  { id: 'lada-2103-evolves-2110', source: 'lada-2103', target: 'lada-2110',
    type: 'evolves_into', strength: 0.78 },
  // ВАЗ-2108 Самара → Приора
  { id: 'lada-samara-evolves-priora', source: 'lada-samara-2108', target: 'lada-priora',
    type: 'evolves_into', strength: 0.75 },
  // ВАЗ-2108 Самара → Калина (хэтч)
  { id: 'lada-samara-evolves-kalina', source: 'lada-samara-2108', target: 'lada-kalina',
    type: 'evolves_into', strength: 0.72 },
  // Калина → Гранта (новая платформа)
  { id: 'lada-kalina-evolves-granta', source: 'lada-kalina', target: 'lada-granta',
    type: 'evolves_into', strength: 0.80 },
  // ВАЗ-2110 → Веста (современный седан)
  { id: 'lada-2110-evolves-vesta', source: 'lada-2110', target: 'lada-vesta',
    type: 'evolves_into', strength: 0.76 },
  // Нива 2121 → Niva Legend (обновление 2021)
  { id: 'lada-niva-facelift-legend', source: 'lada-niva-2121', target: 'lada-niva-legend',
    type: 'facelifted_to', strength: 0.88 },
  // Niva → Niva Travel (новая платформа)
  { id: 'lada-niva-2121-evolves-travel', source: 'lada-niva-2121', target: 'lada-niva-travel',
    type: 'evolves_into', strength: 0.80 },
  // Веста → e-Vesta (электро)
  { id: 'lada-vesta-evolves-evesta', source: 'lada-vesta', target: 'lada-evesta',
    type: 'evolves_into', strength: 0.85 },
  // Niva Travel → XRAY (кроссовер платформа)
  { id: 'lada-niva-travel-inspired-xray', source: 'lada-niva-travel', target: 'lada-xray',
    type: 'influenced_by', strength: 0.65 },

  // ── UAZ ───────────────────────────────────────────────────────────────────
  // УАЗ-469 → Hunter (прямой преемник)
  { id: 'uaz-469-evolves-hunter', source: 'uaz-469', target: 'uaz-hunter',
    type: 'evolves_into', strength: 0.90 },
  // Hunter → Patriot (современный SUV)
  { id: 'uaz-hunter-influenced-patriot', source: 'uaz-469', target: 'uaz-patriot',
    type: 'influenced_by', strength: 0.70 },
  // Patriot → Patriot II (рестайлинг)
  { id: 'uaz-patriot-facelift-fl', source: 'uaz-patriot', target: 'uaz-patriot-fl',
    type: 'facelifted_to', strength: 0.92 },

  // ── AURUS ─────────────────────────────────────────────────────────────────
  // Senat → Арсен (лимузин на той же платформе)
  { id: 'aurus-senat-variant-arsen', source: 'aurus-arsen', target: 'aurus-senat',
    type: 'variant_of', strength: 0.88 },
  // Senat → Komendant (SUV на той же платформе)
  { id: 'aurus-senat-variant-komendant', source: 'aurus-komendant', target: 'aurus-senat',
    type: 'derived_from', strength: 0.82 },

  // ── Кросс-брендовые влияния ───────────────────────────────────────────────
  // Победа вдохновила Волгу М-21 на международный дизайн
  { id: 'gaz-volga-m24-influenced-uaz-patriot', source: 'gaz-volga-m24',
    target: 'uaz-patriot', type: 'inspired', strength: 0.40 },
  // Niva повлияла на концепцию UAZ Patriot как доступного 4x4
  { id: 'lada-niva-inspired-uaz-patriot', source: 'lada-niva-2121',
    target: 'uaz-patriot', type: 'inspired', strength: 0.55 },
]

// ── Merge ─────────────────────────────────────────────────────────────────────

const existingIds     = new Set(g.nodes.map(n => n.id))
const existingEdgeIds = new Set(g.edges.map(e => e.id))

let addedN = 0, addedE = 0, skippedN = 0, skippedE = 0

for (const n of NEW_NODES) {
  if (existingIds.has(n.id)) { console.log(`⟳  node уже есть: ${n.id}`); skippedN++; continue }
  g.nodes.push(n); existingIds.add(n.id); addedN++
  console.log(`✅ node: ${n.id} (${n.label} ${n.year})`)
}

console.log()

for (const e of NEW_EDGES) {
  if (existingEdgeIds.has(e.id)) { console.log(`⟳  edge уже есть: ${e.id}`); skippedE++; continue }
  if (!existingIds.has(e.source)) { console.warn(`⚠  source нет: ${e.source}`); skippedE++; continue }
  if (!existingIds.has(e.target)) { console.warn(`⚠  target нет: ${e.target}`); skippedE++; continue }
  g.edges.push(e); addedE++
  console.log(`✅ edge: ${e.source} --[${e.type}]--> ${e.target}`)
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
console.log(`\n📦 graph.json: +${addedN} нод, +${addedE} рёбер`)
console.log(`   Итого: ${g.nodes.length} нод, ${g.edges.length} рёбер, нод пропущено: ${skippedN}, рёбер пропущено: ${skippedE}`)
