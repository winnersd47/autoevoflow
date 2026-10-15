#!/usr/bin/env node
/**
 * add-hornet-lineage.js — полная история имени Hornet
 *
 * Hornet nameplate history (70+ лет):
 *   Hudson Hornet (1951) — NASCAR легенда
 *   AMC Hornet (1970)    — компактный наследник
 *   Dodge Hornet GT (2023) — современное возрождение
 *   Dodge Hornet R/T GLH Concept (2024) — "Goes Like Hell" tribute
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const NEW_NODES = [

  // ════════════════════════════════════════════════
  //  HUDSON HORNET (1951–1954)
  //  Оригинальный Hornet — NASCAR-легенда
  // ════════════════════════════════════════════════
  {
    id: 'hudson-hornet-1951', label: 'Hudson Hornet',
    type: 'generation', year: 1951, brandId: 'hudson', brandName: 'Hudson',
    codeName: 'Series 6A / Step-Down', modelSlug: 'hudson-hornet',
    bodyType: 'coupe', segment: 'full_size', zone: 'gt_coupe',
    hp: 145, engineType: 'i6', engineCC: 5050,
    note: 'Победитель 27 из 34 гонок NASCAR 1952; "step-down" кузов — ЦТ ниже конкурентов; прообраз PIXAR «Тачки»; Hudson Hornet 308 cu in i6',
  },

  // ════════════════════════════════════════════════
  //  AMC HORNET (1970–1977)
  //  Компактный наследник; AMC купил Chrysler в 1987
  // ════════════════════════════════════════════════
  {
    id: 'amc-hornet-1970', label: 'AMC Hornet',
    type: 'generation', year: 1970, brandId: 'amc', brandName: 'AMC',
    codeName: 'AMC Hornet', modelSlug: 'amc-hornet',
    bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed',
    hp: 128, engineType: 'i6', engineCC: 3274,
    note: 'Заменил Rambler American; хэтчбек/седан/универсал; AMC Hornet SC/360 = 245 л.с. V8; Chrysler купил AMC в 1987 — с именем',
  },
  {
    id: 'amc-hornet-sc360', label: 'AMC Hornet SC/360',
    type: 'generation', year: 1971, brandId: 'amc', brandName: 'AMC',
    codeName: 'SC/360', modelSlug: 'amc-hornet',
    bodyType: 'coupe', segment: 'muscle', zone: 'sports',
    hp: 245, engineType: 'v8', engineCC: 5899,
    note: 'AMC "Super Car" 360; 245–285 л.с.; мускул-вариант Hornet; конкурент Camaro SS и Mustang Mach 1',
  },

  // ════════════════════════════════════════════════
  //  DODGE HORNET — современный (2023–)
  //  Добавляем GT + GLH Concept (R/T PHEV уже есть)
  // ════════════════════════════════════════════════
  {
    id: 'dodge-hornet-gt', label: 'Dodge Hornet GT',
    type: 'generation', year: 2023, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'Hornet GT', modelSlug: 'dodge-hornet',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 268, engineType: 'i4t', engineCC: 2000,
    note: '2.0L turbo; AWD стандарт; 0-100 за 6.5s; база линейки; STLA Small платформа (= Alfa Romeo Tonale)',
  },
  {
    id: 'dodge-hornet-rt-glh', label: 'Dodge Hornet R/T GLH Concept',
    type: 'concept', year: 2024, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'Hornet R/T GLH', modelSlug: 'dodge-hornet-glh',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 315, engineType: 'phev',
    isLimited: true,
    note: '"Goes Like Hell" — tribute к Omni GLH (Carroll Shelby, 1984); Direct Connection тюнинг; +27 л.с. PowerShot буст; концепт 2024, продукция не объявлена',
  },
]

// ── Рёбра ─────────────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // ── Историческая цепочка названия Hornet ────────────────────────────────────
  // Hudson Hornet (1951) вдохновил AMC возродить имя в 1970
  {
    id: 'hudson-hornet-inspired-amc-hornet',
    source: 'hudson-hornet-1951', target: 'amc-hornet-1970',
    type: 'inspired', strength: 0.80,
  },
  // AMC Hornet SC/360 — мышечный вариант базовой модели
  {
    id: 'amc-hornet-1970-variant-sc360',
    source: 'amc-hornet-sc360', target: 'amc-hornet-1970',
    type: 'variant_of', strength: 0.90,
  },
  // AMC → Dodge: Chrysler купил AMC (1987), имя Hornet лежало до 2023
  {
    id: 'amc-hornet-inspired-dodge-hornet-gt',
    source: 'amc-hornet-1970', target: 'dodge-hornet-gt',
    type: 'inspired', strength: 0.72,
  },

  // ── Современная линейка Dodge Hornet ────────────────────────────────────────
  // R/T PHEV — вариант базового GT
  {
    id: 'dodge-hornet-rt-variant-gt',
    source: 'dodge-hornet-rt-phev', target: 'dodge-hornet-gt',
    type: 'variant_of', strength: 0.92,
  },
  // GLH Concept — вариант R/T PHEV с Direct Connection тюнингом
  {
    id: 'dodge-hornet-glh-variant-rt',
    source: 'dodge-hornet-rt-glh', target: 'dodge-hornet-rt-phev',
    type: 'variant_of', strength: 0.90,
  },

  // ── Кросс-брендовые связи ────────────────────────────────────────────────────
  // AMC Hornet SC/360 (1971) конкурировал с Mustang Mach 1 и Camaro SS
  {
    id: 'ford-mustang1-influenced-amc-sc360',
    source: 'ford-mustang-1', target: 'amc-hornet-sc360',
    type: 'influenced_by', strength: 0.62,
  },
  // Hudson Hornet NASCAR (1951) → вдохновил всё американское мышечное движение
  {
    id: 'hudson-hornet-influenced-dodge-charger-1969',
    source: 'hudson-hornet-1951', target: 'dodge-charger-1969',
    type: 'influenced_by', strength: 0.50,
  },
]

// ── Обновление BRAND_WHITELIST ─────────────────────────────────────────────────
// Нужно добавить 'hudson', 'amc' в validate-graph.js вручную

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
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов (+${nA}), ${g.edges.length} рёбер (+${eA}), ${brands} брендов`)
