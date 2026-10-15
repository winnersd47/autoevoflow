#!/usr/bin/env node
/**
 * add-american-latest.js — последние новинки американских брендов
 *
 * Chevrolet: Corvette E-Ray (2024), C8 ZR1 (2025)
 * Ford:      Mustang Dark Horse (2024), GTD (2025), GT500 S650 (2026)
 * Dodge:     Durango SRT Hellcat (2021), Hornet R/T PHEV (2023)
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const NEW_NODES = [

  // ════════════════════════════════════════════════
  //  CHEVROLET — финальные аккорды C8
  // ════════════════════════════════════════════════
  {
    id: 'chevy-corvette-e-ray', label: 'Corvette E-Ray',
    type: 'generation', year: 2024, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C8 E-Ray', modelSlug: 'corvette-e-ray',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 655, engineType: 'phev',
    note: 'Первый Corvette с eAWD; LT2 495 л.с. + HP1 эл. передний мотор = 655 л.с.; 0-100 за 2.5s — быстрее Z06 со светофора',
  },
  {
    id: 'chevy-corvette-c8-zr1', label: 'Corvette C8 ZR1',
    type: 'generation', year: 2025, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C8 ZR1 / LT7', modelSlug: 'corvette-zr1',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 1064, engineType: 'v8t',
    note: 'LT7 5.5L twin-turbo flat-plane; 1064 л.с. / 828 Нм; 215+ mph; <10s четверть мили; 1200 кг прижимной силы. Последнее слово в войне мощностей.',
  },

  // ════════════════════════════════════════════════
  //  FORD — линейка S650
  // ════════════════════════════════════════════════
  {
    id: 'ford-mustang-dark-horse', label: 'Mustang Dark Horse',
    type: 'generation', year: 2024, brandId: 'ford', brandName: 'Ford',
    codeName: 'S650 Dark Horse', modelSlug: 'ford-mustang-dark-horse',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 500, engineType: 'v8',
    note: 'Самый мощный атмосферный Coyote без Shelby; кованые шатуны, 7500 об/мин; заменил Mach 1 / GT350 в иерархии S650',
  },
  {
    id: 'ford-mustang-gtd', label: 'Mustang GTD',
    type: 'generation', year: 2025, brandId: 'ford', brandName: 'Ford',
    codeName: 'S650 GTD / Predator', modelSlug: 'ford-mustang-gtd',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 815, engineType: 'v8s',
    note: 'GT3-технологии в серийном авто; Predator 5.2L SC; $300k; Нюрбургринг 6:57.685 — первый американский серийник до 7 минут; 202 mph',
  },
  {
    id: 'ford-mustang-s650-gt500', label: 'Shelby GT500 (S650)',
    type: 'generation', year: 2026, brandId: 'ford', brandName: 'Ford',
    codeName: 'S650 GT500 / Legend', modelSlug: 'ford-shelby-gt500-s650',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 800, engineType: 'v8s',
    isLimited: false,
    note: 'Возвращение GT500 после паузы S550→S650; "Legend" 5.2L SC (из Raptor R / GTD); ~800 л.с.; анонс 2025, продажи 2026',
  },

  // ════════════════════════════════════════════════
  //  DODGE — последние HEMI + новый Hornet
  // ════════════════════════════════════════════════
  {
    id: 'dodge-durango-srt-hellcat', label: 'Dodge Durango SRT Hellcat',
    type: 'generation', year: 2021, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'WD Durango Hellcat', modelSlug: 'dodge-durango-srt-hellcat',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 710, engineType: 'v8s',
    note: '710 л.с. в 3-рядном SUV; самый мощный SUV Dodge; тягает 8700 фунтов; 180 mph TOP; выпускался 2021–2024',
  },
  {
    id: 'dodge-hornet-rt-phev', label: 'Dodge Hornet R/T PHEV',
    type: 'generation', year: 2023, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'Hornet R/T eHybrid', modelSlug: 'dodge-hornet',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 288, engineType: 'phev',
    note: 'STLA Small платформа (= Alfa Romeo Tonale); 2.0T + эл.мотор = 288 л.с.; PowerShot буст +25 л.с.; первый PHEV Dodge',
  },
]

// ── Рёбра ─────────────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // ── Corvette C8 семейство ───────────────────────────────────────────────────
  // E-Ray — боковой вариант C8 Stingray с eAWD
  { id: 'corvette-e-ray-variant-c8',
    source: 'chevy-corvette-e-ray', target: 'chevy-corvette-c8',
    type: 'variant_of', strength: 0.90 },

  // ZR1 — вершина над Z06 (LT7 twin-turbo базируется на LT6 flat-plane Z06)
  { id: 'corvette-c8-z06-evolves-zr1',
    source: 'chevy-corvette-c8-z06', target: 'chevy-corvette-c8-zr1',
    type: 'evolves_into', strength: 0.90 },

  // ── Ford Mustang S650 семейство ─────────────────────────────────────────────
  // Dark Horse — горячий вариант S650
  { id: 'mustang-dark-horse-variant-s650',
    source: 'ford-mustang-dark-horse', target: 'ford-mustang-s650',
    type: 'variant_of', strength: 0.95 },

  // GTD — ультимативный S650, за $300k, GT3-кит
  { id: 'mustang-gtd-variant-s650',
    source: 'ford-mustang-gtd', target: 'ford-mustang-s650',
    type: 'variant_of', strength: 0.80 },

  // GT500 S650 — эволюция GT500 S550
  { id: 'gt500-s550-evolves-s650-gt500',
    source: 'ford-shelby-gt500', target: 'ford-mustang-s650-gt500',
    type: 'evolves_into', strength: 0.88 },

  // GT500 S650 — вариант S650
  { id: 'mustang-s650-gt500-variant-s650',
    source: 'ford-mustang-s650-gt500', target: 'ford-mustang-s650',
    type: 'variant_of', strength: 0.92 },

  // Dark Horse → GTD: технологическая эскалация внутри S650
  { id: 'dark-horse-inspired-gtd',
    source: 'ford-mustang-dark-horse', target: 'ford-mustang-gtd',
    type: 'inspired', strength: 0.68 },

  // ── Dodge ───────────────────────────────────────────────────────────────────
  // Durango Hellcat — Hellcat-двигатель перекочевал из Challenger/Charger в SUV
  { id: 'charger-hellcat-inspired-durango-hellcat',
    source: 'dodge-charger-srt-hellcat', target: 'dodge-durango-srt-hellcat',
    type: 'inspired', strength: 0.82 },

  // Hornet — духовный преемник Dart (compact Dodge)
  { id: 'challenger-gen3-inspired-hornet',
    source: 'dodge-challenger-gen3', target: 'dodge-hornet-rt-phev',
    type: 'inspired', strength: 0.45 },

  // ── Кросс-брендовые: гонка мощностей ───────────────────────────────────────
  // Demon 170 (1025 hp, 2023) → подтолкнул GM к ZR1 (1064 hp, 2025)
  { id: 'demon170-influenced-corvette-zr1',
    source: 'dodge-challenger-srt-demon-170', target: 'chevy-corvette-c8-zr1',
    type: 'influenced_by', strength: 0.65 },

  // Camaro ZL1 (2017) → inspired → Dark Horse (2024): мышечная конкуренция
  { id: 'camaro-zl1-influenced-dark-horse',
    source: 'chevy-camaro-zl1', target: 'ford-mustang-dark-horse',
    type: 'influenced_by', strength: 0.60 },

  // GT500 S550 (2020) → inspired → GTD (2025): Ford взял собственный GT500 за базу для GTD
  { id: 'gt500-s550-inspired-gtd',
    source: 'ford-shelby-gt500', target: 'ford-mustang-gtd',
    type: 'inspired', strength: 0.75 },
]

// ── Запись ────────────────────────────────────────────────────────────────────
const ids  = new Set(g.nodes.map(n => n.id))
const eids = new Set(g.edges.map(e => e.id))
let nA = 0, eA = 0, nS = 0, eS = 0

for (const node of NEW_NODES) {
  if (ids.has(node.id)) { nS++; continue }
  g.nodes.push(node); ids.add(node.id); nA++
  console.log(`✅ [${node.brandId}] ${node.label} (${node.year}) — ${node.hp} л.с.`)
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
console.log(`   пропущено: ${nS} узлов, ${eS} рёбер`)
