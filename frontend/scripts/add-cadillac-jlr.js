#!/usr/bin/env node
/**
 * add-cadillac-jlr.js
 *
 * 1. Chevrolet: C4 (1984) + C4 ZR1 (1990) — закрываем разрыв C3→C5
 * 2. Cadillac: CTS/V-Series → CT5-V Blackwing + Escalade + Lyriq + Celestiq
 * 3. JLR (Jaguar/Land Rover): SVR + SV + V8 варианты
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const NEW_NODES = [

  // ════════════════════════════════════════════════
  //  CHEVROLET — Corvette C4 (заполняем пробел C3→C5)
  // ════════════════════════════════════════════════
  {
    id: 'chevy-corvette-c4', label: 'Corvette C4',
    type: 'generation', year: 1984, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C4 / Y-body', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 205, engineType: 'v8',
    note: 'Первый Corvette с цифровым приборным щитком; 1984-1996; база для ZR1 "King of the Hill"; рестайлинг 1991 (LT1 300hp)',
  },
  {
    id: 'chevy-corvette-c4-zr1', label: 'Corvette C4 ZR1',
    type: 'generation', year: 1990, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C4 ZR1 / King of the Hill', modelSlug: 'corvette-zr1',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 375, engineType: 'v8',
    note: '"King of the Hill" — LT5 5.7L DOHC (Lotus-разработка); 375→405 л.с. к 1993; шире кузов (+3"), скорость 288 км/ч; первый современный американский суперкар',
  },

  // ════════════════════════════════════════════════
  //  CADILLAC — эволюция производительного седана
  // ════════════════════════════════════════════════
  {
    id: 'cadillac-cts-gen1', label: 'Cadillac CTS',
    type: 'generation', year: 2003, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CTS Gen.1 / Sigma', modelSlug: 'cadillac-cts',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 255, engineType: 'v6',
    note: 'Sigma RWD платформа; "Art & Science" дизайн; дебют Cadillac как BMW-конкурента; заменил Catera; база для CTS-V',
  },
  {
    id: 'cadillac-cts-v1', label: 'Cadillac CTS-V Gen.1',
    type: 'generation', year: 2004, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CTS-V Gen.1 / LS6', modelSlug: 'cadillac-cts-v',
    bodyType: 'sedan', segment: 'exec', zone: 'supercar',
    hp: 400, engineType: 'v8',
    note: 'LS6 5.7L V8 из Corvette Z06; 400 л.с.; ручная КПП; Нюрбургринг 8:19 (2004) — быстрее M5 E39; первый американский суперседан',
  },
  {
    id: 'cadillac-cts-gen2', label: 'Cadillac CTS Gen.2',
    type: 'generation', year: 2008, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CTS Gen.2 / Sigma II', modelSlug: 'cadillac-cts',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 304, engineType: 'v6',
    note: 'Sigma II платформа; MotorTrend Car of the Year 2008; доступен купе и универсал; база для легендарного CTS-V Gen.2',
  },
  {
    id: 'cadillac-cts-v2', label: 'Cadillac CTS-V Gen.2',
    type: 'generation', year: 2009, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CTS-V Gen.2 / LSA', modelSlug: 'cadillac-cts-v',
    bodyType: 'sedan', segment: 'exec', zone: 'supercar',
    hp: 556, engineType: 'v8s',
    note: 'LSA 6.2L supercharged (из Camaro ZL1); 556 л.с.; Нюрбургринг 7:59 — первый седан до 8 минут; Brembo Carbon-ceramic; легенда',
  },
  {
    id: 'cadillac-cts-gen3', label: 'Cadillac CTS Gen.3',
    type: 'generation', year: 2014, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CTS Gen.3 / Alpha', modelSlug: 'cadillac-cts',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 272, engineType: 'v6t',
    note: 'Alpha RWD платформа (лёгкая, 52/48 развесовка); будущая база ATS/CT4/CT5; MotorTrend COTY 2014',
  },
  {
    id: 'cadillac-cts-v3', label: 'Cadillac CTS-V Gen.3',
    type: 'generation', year: 2016, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CTS-V Gen.3 / LT4', modelSlug: 'cadillac-cts-v',
    bodyType: 'sedan', segment: 'exec', zone: 'supercar',
    hp: 640, engineType: 'v8s',
    note: 'LT4 6.2L supercharged (из Corvette Z06 C7); 640 л.с.; Нюрбургринг 7:38 (2016) — рекорд производственного седана; 320 км/ч',
  },
  {
    id: 'cadillac-ct5', label: 'Cadillac CT5',
    type: 'generation', year: 2020, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CT5 / Alpha 2', modelSlug: 'cadillac-ct5',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 237, engineType: 'v6t',
    note: 'Наследник CTS; Alpha II RWD; будущая платформа для нового Camaro (2027); CT5-Premium Luxury = флагман',
  },
  {
    id: 'cadillac-ct5-v-blackwing', label: 'CT5-V Blackwing',
    type: 'generation', year: 2022, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CT5-V Blackwing / LT4', modelSlug: 'cadillac-ct5-v-blackwing',
    bodyType: 'sedan', segment: 'exec', zone: 'supercar',
    hp: 668, engineType: 'v8s',
    note: 'LT4 6.2L supercharged; 668 л.с.; ручная 6-ст. КПП доступна; Нюрбургринг 7:25.848 (2021); финальный аргумент GM в войне суперседанов',
  },
  {
    id: 'cadillac-ct4-v-blackwing', label: 'CT4-V Blackwing',
    type: 'generation', year: 2022, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'CT4-V Blackwing / LT4', modelSlug: 'cadillac-ct4-v-blackwing',
    bodyType: 'sedan', segment: 'compact_exec', zone: 'sports',
    hp: 472, engineType: 'v6t',
    note: 'TT 3.6L V6; 472 л.с.; компактный суперседан; конкурент BMW M3 Compact / AMG C 63; лучший рулевой Cadillac по мнению автопрессы',
  },
  {
    id: 'cadillac-escalade-gen1', label: 'Cadillac Escalade',
    type: 'generation', year: 1999, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'Escalade Gen.1 / GMT400', modelSlug: 'cadillac-escalade',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 255, engineType: 'v8',
    note: 'Первый Escalade = Chevy Tahoe/GMC Yukon с luxury отделкой; ответ на Lincoln Navigator; мгновенно стал символом статуса в рэп-культуре',
  },
  {
    id: 'cadillac-escalade-gen5', label: 'Cadillac Escalade Gen.5',
    type: 'generation', year: 2021, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'Escalade Gen.5 / T1XX', modelSlug: 'cadillac-escalade',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 420, engineType: 'v8',
    note: '38" OLED изогнутый дисплей; Air Ride адаптивная подвеска; 6.2L V8 / 3.0L diesel / 6.2L PHEV (2024); 36% рынка полноразмерных luxury SUV США',
  },
  {
    id: 'cadillac-lyriq', label: 'Cadillac Lyriq',
    type: 'generation', year: 2023, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'Lyriq / Ultium', modelSlug: 'cadillac-lyriq',
    bodyType: 'suv', segment: 'mid_suv', zone: 'electric',
    hp: 340, engineType: 'ev',
    note: 'Первый электрический Cadillac; Ultium платформа (GM); 100 кВтч; 530 км запас; начало перехода Cadillac в EV-премиум',
  },
  {
    id: 'cadillac-celestiq', label: 'Cadillac Celestiq',
    type: 'generation', year: 2024, brandId: 'cadillac', brandName: 'Cadillac',
    codeName: 'Celestiq / Ultium', modelSlug: 'cadillac-celestiq',
    bodyType: 'sedan', segment: 'ultra_luxury', zone: 'ultra-luxury',
    hp: 600, engineType: 'ev',
    isLimited: true,
    note: '$340k+; ручная сборка; 4 зоны Smart Glass крыши; 111 кВтч; AWD 600 л.с.; флагман GM; конкурент Rolls-Royce Spectre и Mercedes EQS Maybach',
  },

  // ════════════════════════════════════════════════
  //  JAGUAR — SVR / SV Project 8 варианты
  // ════════════════════════════════════════════════
  {
    id: 'jaguar-f-type-svr', label: 'F-Type SVR',
    type: 'generation', year: 2016, brandId: 'jaguar', brandName: 'Jaguar',
    codeName: 'F-Type SVR / AJ133', modelSlug: 'jaguar-f-type-svr',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 575, engineType: 'v8s',
    note: 'AJ133 5.0L supercharged 575 л.с.; 322 км/ч; Active exhaust (режим мотоцикла); аэродинамический обвес; легче F-Type R на 25 кг; последний SVR Jaguar',
  },
  {
    id: 'jaguar-f-pace-svr', label: 'F-Pace SVR',
    type: 'generation', year: 2018, brandId: 'jaguar', brandName: 'Jaguar',
    codeName: 'F-Pace SVR', modelSlug: 'jaguar-f-pace-svr',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 550, engineType: 'v8s',
    note: '5.0L SC 550 л.с. (2021: рестайлинг → 575 л.с.); самый быстрый серийный SUV Jaguar; 0-100 за 4.3s; гоночное шасси, Brembo',
  },
  {
    id: 'jaguar-xe-sv-project8', label: 'XE SV Project 8',
    type: 'generation', year: 2018, brandId: 'jaguar', brandName: 'Jaguar',
    codeName: 'XE SV Project 8', modelSlug: 'jaguar-xe-project8',
    bodyType: 'sedan', segment: 'exec', zone: 'supercar',
    hp: 600, engineType: 'v8s',
    isLimited: true,
    note: 'AJ133 5.0L SC 600 л.с.; 300 экз. мировые + 8 гоночных; Нюрбургринг 7:21.23 (2017) — рекорд седана; карбоновые панели кузова; трек-пакет с клетью безопасности',
  },

  // ════════════════════════════════════════════════
  //  LAND ROVER — SVR / SV / V8 варианты
  // ════════════════════════════════════════════════
  {
    id: 'lr-rrs-svr', label: 'Range Rover Sport SVR',
    type: 'generation', year: 2015, brandId: 'land-rover', brandName: 'Land Rover',
    codeName: 'RRS SVR / L494', modelSlug: 'range-rover-sport-svr',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 550, engineType: 'v8s',
    note: 'AJ133 5.0L SC 550 л.с.; первый SUV Land Rover с трёк-фокусом; Goodwood Hill Climb рекорд SUV (2014); 0-100 за 4.5s; 280 км/ч',
  },
  {
    id: 'lr-rrs-sv', label: 'Range Rover Sport SV',
    type: 'generation', year: 2023, brandId: 'land-rover', brandName: 'Cadillac',
    codeName: 'RRS SV / L461', modelSlug: 'range-rover-sport-sv',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 626, engineType: 'v8t',
    note: '4.4L twin-turbo BMW V8; 626 л.с.; пришёл на смену SVR; 0-100 за 3.8s; предустановлен трек-режим с подъёмом подвески на старте',
  },
  {
    id: 'lr-defender-v8', label: 'Defender V8',
    type: 'generation', year: 2021, brandId: 'land-rover', brandName: 'Land Rover',
    codeName: 'Defender 110 V8 / L663', modelSlug: 'land-rover-defender-v8',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 518, engineType: 'v8s',
    note: '5.0L SC 518 л.с.; серийный внедорожник 0-100 за 4.9s; ограниченный тираж; Defender V8 Carpathian Edition — самая редкая версия',
  },
]

// ── РЁБРА ─────────────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // ── Corvette C4 ─────────────────────────────────────────────────────────────
  { id: 'corvette-c3-evolves-c4',
    source: 'chevy-corvette-c3', target: 'chevy-corvette-c4',
    type: 'evolves_into', strength: 0.95 },
  { id: 'corvette-c4-evolves-c5',
    source: 'chevy-corvette-c4', target: 'chevy-corvette-c5',
    type: 'evolves_into', strength: 0.95 },
  { id: 'corvette-c4-variant-zr1',
    source: 'chevy-corvette-c4', target: 'chevy-corvette-c4-zr1',
    type: 'variant_of', strength: 0.90 },
  // C4 ZR1 → вдохновил C5 ZR1 концепцию (преемственность "King of the Hill")
  { id: 'corvette-c4zr1-inspired-c5',
    source: 'chevy-corvette-c4-zr1', target: 'chevy-corvette-c5',
    type: 'inspired', strength: 0.70 },

  // ── Cadillac CTS эволюция ────────────────────────────────────────────────────
  { id: 'cadillac-cts1-evolves-cts2',
    source: 'cadillac-cts-gen1', target: 'cadillac-cts-gen2',
    type: 'evolves_into', strength: 0.95 },
  { id: 'cadillac-cts2-evolves-cts3',
    source: 'cadillac-cts-gen2', target: 'cadillac-cts-gen3',
    type: 'evolves_into', strength: 0.95 },
  { id: 'cadillac-cts3-evolves-ct5',
    source: 'cadillac-cts-gen3', target: 'cadillac-ct5',
    type: 'evolves_into', strength: 0.90 },

  // ── Cadillac V-Series варианты ───────────────────────────────────────────────
  { id: 'cadillac-cts1-variant-v1',
    source: 'cadillac-cts-gen1', target: 'cadillac-cts-v1',
    type: 'variant_of', strength: 0.92 },
  { id: 'cadillac-cts2-variant-v2',
    source: 'cadillac-cts-gen2', target: 'cadillac-cts-v2',
    type: 'variant_of', strength: 0.92 },
  { id: 'cadillac-cts3-variant-v3',
    source: 'cadillac-cts-gen3', target: 'cadillac-cts-v3',
    type: 'variant_of', strength: 0.92 },
  { id: 'cadillac-ct5-variant-blackwing',
    source: 'cadillac-ct5', target: 'cadillac-ct5-v-blackwing',
    type: 'variant_of', strength: 0.92 },
  // CT4-V Blackwing — брат CT5 (та же Alpha II платформа, компактный класс)
  { id: 'cadillac-ct5-inspired-ct4-blackwing',
    source: 'cadillac-ct5', target: 'cadillac-ct4-v-blackwing',
    type: 'inspired', strength: 0.80 },

  // ── CTS-V → CTS-V эволюция ───────────────────────────────────────────────────
  { id: 'cadillac-ctsv1-evolves-v2',
    source: 'cadillac-cts-v1', target: 'cadillac-cts-v2',
    type: 'evolves_into', strength: 0.92 },
  { id: 'cadillac-ctsv2-evolves-v3',
    source: 'cadillac-cts-v2', target: 'cadillac-cts-v3',
    type: 'evolves_into', strength: 0.92 },
  { id: 'cadillac-ctsv3-evolves-ct5bw',
    source: 'cadillac-cts-v3', target: 'cadillac-ct5-v-blackwing',
    type: 'evolves_into', strength: 0.90 },

  // ── Escalade эволюция ────────────────────────────────────────────────────────
  { id: 'cadillac-escalade1-evolves-5',
    source: 'cadillac-escalade-gen1', target: 'cadillac-escalade-gen5',
    type: 'evolves_into', strength: 0.90 },

  // ── Lyriq + Celestiq ─────────────────────────────────────────────────────────
  { id: 'cadillac-lyriq-evolves-celestiq',
    source: 'cadillac-lyriq', target: 'cadillac-celestiq',
    type: 'inspired', strength: 0.70 },

  // ── Corvette → Cadillac V-Series (LT4/LSA engine transfer) ──────────────────
  { id: 'corvette-c7z06-inspired-ctsv3',
    source: 'chevy-corvette-c7-z06', target: 'cadillac-cts-v3',
    type: 'inspired', strength: 0.85 },
  // LSA: Camaro ZL1 → CTS-V Gen.2 (тот же мотор)
  { id: 'camarozl1-inspired-ctsv2',
    source: 'chevy-camaro-gen5', target: 'cadillac-cts-v2',
    type: 'inspired', strength: 0.72 },

  // ── JAGUAR SVR рёбра ─────────────────────────────────────────────────────────
  { id: 'jaguar-ftype-variant-svr',
    source: 'jaguar-f-type', target: 'jaguar-f-type-svr',
    type: 'variant_of', strength: 0.92 },
  { id: 'jaguar-fpace-variant-svr',
    source: 'jaguar-f-pace', target: 'jaguar-f-pace-svr',
    type: 'variant_of', strength: 0.92 },
  { id: 'jaguar-xe-variant-project8',
    source: 'jaguar-xe', target: 'jaguar-xe-sv-project8',
    type: 'variant_of', strength: 0.90 },

  // ── LAND ROVER SVR / SV / V8 рёбра ──────────────────────────────────────────
  { id: 'lr-rrs-l494-variant-svr',
    source: 'lr-range-rover-sport-l494', target: 'lr-rrs-svr',
    type: 'variant_of', strength: 0.92 },
  { id: 'lr-rrs-l461-variant-sv',
    source: 'lr-range-rover-sport-l461', target: 'lr-rrs-sv',
    type: 'variant_of', strength: 0.92 },
  { id: 'lr-defender110-variant-v8',
    source: 'lr-defender-110', target: 'lr-defender-v8',
    type: 'variant_of', strength: 0.90 },
  // SVR → SV: технологическая преемственность
  { id: 'lr-rrs-svr-evolves-sv',
    source: 'lr-rrs-svr', target: 'lr-rrs-sv',
    type: 'evolves_into', strength: 0.85 },
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
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов (+${nA}), ${g.edges.length} рёбер (+${eA}), ${brands} брендов`)
console.log(`   пропущено: ${nS} узлов, ${eS} рёбер`)
