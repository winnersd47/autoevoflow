#!/usr/bin/env node
/**
 * add-american-auto.js
 *   — Chevrolet: Corvette C1→C8 (+ Z06/ZR1), Camaro Gen1/5/6/ZL1
 *   — Dodge: Charger 1969→Hellcat, Challenger 1970→Demon 170, Viper Gen1→ACR
 *   — SRT-линейка (варианты Dodge с SRT-тюнингом)
 *   — Кросс-брендовые рёбра на Ford Mustang / Thunderbird
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const NEW_NODES = [

  // ════════════════════════════════════════════════
  //  CHEVROLET — CORVETTE
  // ════════════════════════════════════════════════
  {
    id: 'chevy-corvette-c1', label: 'Corvette C1',
    type: 'generation', year: 1953, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C1', modelSlug: 'corvette',
    bodyType: 'roadster', segment: 'sports', zone: 'sports',
    hp: 150, engineType: 'i6', engineCC: 3800,
    note: 'Первый Corvette; стекловолокно кузов; 6-цил.; ответ GM на европейские родстеры',
  },
  {
    id: 'chevy-corvette-c2', label: 'Corvette C2 Sting Ray',
    type: 'generation', year: 1963, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C2 / Sting Ray', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 360, engineType: 'v8', engineCC: 5360,
    note: 'Sting Ray — культовый дизайн; первый Corvette с V8 327 cu; иконичный расщеплённый задний обтекатель',
  },
  {
    id: 'chevy-corvette-c3', label: 'Corvette C3 Stingray',
    type: 'generation', year: 1968, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C3', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 435, engineType: 'v8', engineCC: 6997,
    note: '"Shark" дизайн Мако Шарк II; пик мощности до кризиса; 435 л.с. в 1969',
  },
  {
    id: 'chevy-corvette-c5', label: 'Corvette C5',
    type: 'generation', year: 1997, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C5', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 345, engineType: 'v8', engineCC: 5700,
    note: 'LS1 V8; первый Corvette с задне-трансмиссионным коробом (50/50 развесовка); возрождение',
  },
  {
    id: 'chevy-corvette-c6', label: 'Corvette C6',
    type: 'generation', year: 2005, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C6', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 400, engineType: 'v8', engineCC: 6000,
    note: 'LS2/LS3 V8; первый Corvette без выдвижных фар; база для Z06 и ZR1',
  },
  {
    id: 'chevy-corvette-c6-z06', label: 'Corvette C6 Z06',
    type: 'generation', year: 2006, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C6 Z06', modelSlug: 'corvette-z06',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 505, engineType: 'v8', engineCC: 7008,
    note: 'LS7 7.0 V8; 505 л.с. атмо; суперкар за $65k; пощёчина Ferrari',
  },
  {
    id: 'chevy-corvette-c6-zr1', label: 'Corvette C6 ZR1',
    type: 'generation', year: 2009, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C6 ZR1 / Blue Devil', modelSlug: 'corvette-zr1',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 638, engineType: 'v8s', engineCC: 6162,
    note: 'LS9 supercharged 6.2L; 638 л.с.; "Blue Devil"; 330 km/h; обул Porsche и Ferrari',
  },
  {
    id: 'chevy-corvette-c7', label: 'Corvette C7 Stingray',
    type: 'generation', year: 2014, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C7 / Stingray', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 455, engineType: 'v8', engineCC: 6162,
    note: 'LT1 DI V8; возврат имени Stingray; MagneRide 2.0; 7-ст. мануал',
  },
  {
    id: 'chevy-corvette-c7-z06', label: 'Corvette C7 Z06',
    type: 'generation', year: 2015, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C7 Z06', modelSlug: 'corvette-z06',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 650, engineType: 'v8s', engineCC: 6162,
    note: 'LT4 supercharged 6.2L; 650 л.с.; 0-100 за 2.95s; первый Corvette с суперчаржером в Z06',
  },
  {
    id: 'chevy-corvette-c7-zr1', label: 'Corvette C7 ZR1',
    type: 'generation', year: 2019, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C7 ZR1', modelSlug: 'corvette-zr1',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 755, engineType: 'v8s', engineCC: 6162,
    note: 'LT5 supercharged; 755 л.с.; финальный переднемоторный ZR1 в истории',
  },
  {
    id: 'chevy-corvette-c8', label: 'Corvette C8 Stingray',
    type: 'generation', year: 2020, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C8 / Mid-Engine', modelSlug: 'corvette',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 495, engineType: 'v8', engineCC: 6162,
    note: 'LT2 среднемоторный — революция 67 лет спустя; 8DCT; 0-100 за 2.9s за $60k',
  },
  {
    id: 'chevy-corvette-c8-z06', label: 'Corvette C8 Z06',
    type: 'generation', year: 2023, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'C8 Z06', modelSlug: 'corvette-z06',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 670, engineType: 'v8', engineCC: 5500,
    note: 'LT6 flat-plane crank 5.5L атмо; 670 л.с. при 8600 rpm; формульный звук; 0-100 за 2.6s',
  },

  // ════════════════════════════════════════════════
  //  CHEVROLET — CAMARO
  // ════════════════════════════════════════════════
  {
    id: 'chevy-camaro-gen1', label: 'Camaro Gen.1',
    type: 'generation', year: 1967, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'F-body Gen1', modelSlug: 'camaro',
    bodyType: 'coupe', segment: 'pony', zone: 'sports',
    hp: 375, engineType: 'v8', engineCC: 6490,
    note: 'GM-ответ на Ford Mustang; SS350/SS396; основа pony car войн 60-х',
  },
  {
    id: 'chevy-camaro-gen5', label: 'Camaro Gen.5',
    type: 'generation', year: 2010, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'Gen5 / Zeta', modelSlug: 'camaro',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 426, engineType: 'v8', engineCC: 6162,
    note: 'Возрождение Camaro после 2002; ретро-дизайн Gen1; LS3 или V6; Zeta платформа',
  },
  {
    id: 'chevy-camaro-gen6', label: 'Camaro Gen.6',
    type: 'generation', year: 2016, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'Gen6 / Alpha', modelSlug: 'camaro',
    bodyType: 'coupe', segment: 'sports', zone: 'sports',
    hp: 455, engineType: 'v8', engineCC: 6162,
    note: 'Alpha-платформа (от Cadillac ATS); -90кг; улучшенный баланс; финальное поколение',
  },
  {
    id: 'chevy-camaro-zl1', label: 'Camaro ZL1',
    type: 'generation', year: 2017, brandId: 'chevrolet', brandName: 'Chevrolet',
    codeName: 'Gen6 ZL1', modelSlug: 'camaro-zl1',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 650, engineType: 'v8s', engineCC: 6162,
    note: 'LT4 supercharged; 650 л.с.; Nürburgring 7:29.60; конкурент Shelby GT500',
  },

  // ════════════════════════════════════════════════
  //  DODGE — CHARGER
  // ════════════════════════════════════════════════
  {
    id: 'dodge-charger-1969', label: 'Dodge Charger 1969',
    type: 'generation', year: 1969, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'B-body Gen2', modelSlug: 'dodge-charger',
    bodyType: 'fastback', segment: 'muscle', zone: 'gt_coupe',
    hp: 425, engineType: 'v8', engineCC: 6981,
    note: '"General Lee"; Daytona 500 победитель; 426 Hemi или 440 Magnum; классик американского масла',
  },
  {
    id: 'dodge-charger-srt8-2011', label: 'Dodge Charger SRT8',
    type: 'generation', year: 2011, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'LD Charger SRT8', modelSlug: 'dodge-charger',
    bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
    hp: 470, engineType: 'v8', engineCC: 6400,
    note: '6.4L HEMI; 4-дверный мускул-сед; первый современный Charger SRT',
  },
  {
    id: 'dodge-charger-srt-hellcat', label: 'Dodge Charger SRT Hellcat',
    type: 'generation', year: 2015, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'LD Charger Hellcat', modelSlug: 'dodge-charger',
    bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
    hp: 707, engineType: 'v8s', engineCC: 6162,
    note: '6.2L Hellcat HEMI supercharged; 707 л.с.; самый мощный серийный 4-дверный седан в истории на тот момент',
  },
  {
    id: 'dodge-charger-daytona-ev', label: 'Dodge Charger Daytona EV',
    type: 'generation', year: 2024, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'Charger Daytona / Banshee EV', modelSlug: 'dodge-charger-ev',
    bodyType: 'fastback', segment: 'electric_muscle', zone: 'electric',
    hp: 670, engineType: 'electric',
    note: '800V "Fratzonic" имитатор выхлопа; конец эпохи HEMI → начало Banshee EV платформы',
  },

  // ════════════════════════════════════════════════
  //  DODGE — CHALLENGER + SRT
  // ════════════════════════════════════════════════
  {
    id: 'dodge-challenger-1970', label: 'Dodge Challenger 1970',
    type: 'generation', year: 1970, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'E-body', modelSlug: 'dodge-challenger',
    bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
    hp: 425, engineType: 'v8', engineCC: 6981,
    note: 'E-body; 426 HEMI или 440; 1970 — пик мощности перед экологическими нормами',
  },
  {
    id: 'dodge-challenger-gen3', label: 'Dodge Challenger Gen.3',
    type: 'generation', year: 2008, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'LC Challenger', modelSlug: 'dodge-challenger',
    bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
    hp: 376, engineType: 'v8', engineCC: 5654,
    note: 'Ретро-возрождение 1970 дизайна; LX-платформа; SRT8 = 425 л.с.',
  },
  {
    id: 'dodge-challenger-srt-hellcat', label: 'Dodge Challenger SRT Hellcat',
    type: 'generation', year: 2015, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'LC Hellcat', modelSlug: 'dodge-challenger-srt',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 707, engineType: 'v8s', engineCC: 6162,
    note: '6.2L Hellcat supercharged; 707 л.с.; задал стандарт для мускул-войн; два ключа (красный = полная мощь)',
  },
  {
    id: 'dodge-challenger-srt-demon', label: 'Dodge Challenger SRT Demon',
    type: 'generation', year: 2018, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'LC SRT Demon', modelSlug: 'dodge-challenger-srt',
    bodyType: 'coupe', segment: 'drag', zone: 'supercar',
    hp: 840, engineType: 'v8s', engineCC: 6162,
    note: '840 л.с. на 91 OCT; первый серийный авто с wheelie при старте; 1/4 мили за 9.65s; запрещён NHRA',
  },
  {
    id: 'dodge-challenger-srt-super-stock', label: 'Challenger SRT Super Stock',
    type: 'generation', year: 2020, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'SRT Super Stock', modelSlug: 'dodge-challenger-srt',
    bodyType: 'coupe', segment: 'drag', zone: 'supercar',
    hp: 807, engineType: 'v8s', engineCC: 6162,
    note: '807 л.с.; Demon-мощь без ограничений; 1/4 мили 10.5s; без доп. оборудования Demon',
  },
  {
    id: 'dodge-challenger-srt-demon-170', label: 'Challenger SRT Demon 170',
    type: 'generation', year: 2023, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'SRT Demon 170', modelSlug: 'dodge-challenger-srt',
    bodyType: 'coupe', segment: 'drag', zone: 'supercar',
    hp: 1025, engineType: 'v8s', engineCC: 6162,
    note: '1025 л.с. на E85; 0-100 за 1.66s — рекорд серийного авто 2023; финальный газовый Mopar',
  },

  // ════════════════════════════════════════════════
  //  DODGE — VIPER
  // ════════════════════════════════════════════════
  {
    id: 'dodge-viper-gen1', label: 'Dodge Viper RT/10',
    type: 'generation', year: 1992, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'SR I / RT/10', modelSlug: 'dodge-viper',
    bodyType: 'roadster', segment: 'supercar', zone: 'supercar',
    hp: 400, engineType: 'v10', engineCC: 7994,
    note: '8.0L V10 (из грузовика Chrysler); без ABS, ESP, окон, замков; концепт AC Cobra для новой эпохи',
  },
  {
    id: 'dodge-viper-gen3-srt10', label: 'Dodge Viper SRT-10',
    type: 'generation', year: 2003, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'SR III / SRT-10', modelSlug: 'dodge-viper',
    bodyType: 'roadster', segment: 'supercar', zone: 'supercar',
    hp: 500, engineType: 'v10', engineCC: 7994,
    note: 'SRT-10: 8.3L 500 л.с.; первая SRT-марка на Viper; рекорд Нюрбургринга 7:12 (2008)',
  },
  {
    id: 'dodge-viper-gen5-srt', label: 'Dodge Viper SRT',
    type: 'generation', year: 2013, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'VX SRT', modelSlug: 'dodge-viper',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 640, engineType: 'v10', engineCC: 8382,
    note: '8.4L 640 л.с.; переименован из просто "Viper" в SRT Viper; ABS появился впервые',
  },
  {
    id: 'dodge-viper-acr', label: 'Dodge Viper ACR',
    type: 'generation', year: 2016, brandId: 'dodge', brandName: 'Dodge',
    codeName: 'VX ACR', modelSlug: 'dodge-viper-acr',
    bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
    hp: 645, engineType: 'v10', engineCC: 8382,
    note: 'American Club Racer; 13 рекордов трассы; Nürburgring 7:01.3; последний Viper; производство 2017',
  },
]

// ── Рёбра ─────────────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // ── CORVETTE линия ──────────────────────────────────────────────────────────
  { id: 'corvette-c1-c2',     source: 'chevy-corvette-c1',     target: 'chevy-corvette-c2',     type: 'evolves_into', strength: 0.88 },
  { id: 'corvette-c2-c3',     source: 'chevy-corvette-c2',     target: 'chevy-corvette-c3',     type: 'evolves_into', strength: 0.82 },
  { id: 'corvette-c3-c5',     source: 'chevy-corvette-c3',     target: 'chevy-corvette-c5',     type: 'evolves_into', strength: 0.72 },
  { id: 'corvette-c5-c6',     source: 'chevy-corvette-c5',     target: 'chevy-corvette-c6',     type: 'evolves_into', strength: 0.85 },
  { id: 'corvette-c6-z06',    source: 'chevy-corvette-c6-z06', target: 'chevy-corvette-c6',     type: 'variant_of',   strength: 0.95 },
  { id: 'corvette-c6-zr1v',   source: 'chevy-corvette-c6-zr1', target: 'chevy-corvette-c6-z06', type: 'evolves_into', strength: 0.90 },
  { id: 'corvette-c6-c7',     source: 'chevy-corvette-c6',     target: 'chevy-corvette-c7',     type: 'evolves_into', strength: 0.87 },
  { id: 'corvette-c7-z06v',   source: 'chevy-corvette-c7-z06', target: 'chevy-corvette-c7',     type: 'variant_of',   strength: 0.95 },
  { id: 'corvette-c7z06-zr1', source: 'chevy-corvette-c7-z06', target: 'chevy-corvette-c7-zr1', type: 'evolves_into', strength: 0.90 },
  { id: 'corvette-c7-c8',     source: 'chevy-corvette-c7',     target: 'chevy-corvette-c8',     type: 'evolves_into', strength: 0.85 },
  { id: 'corvette-c8-z06v',   source: 'chevy-corvette-c8-z06', target: 'chevy-corvette-c8',     type: 'variant_of',   strength: 0.95 },

  // ── CAMARO линия ────────────────────────────────────────────────────────────
  { id: 'camaro-g1-g5',    source: 'chevy-camaro-gen1', target: 'chevy-camaro-gen5', type: 'evolves_into', strength: 0.70 },
  { id: 'camaro-g5-g6',    source: 'chevy-camaro-gen5', target: 'chevy-camaro-gen6', type: 'evolves_into', strength: 0.88 },
  { id: 'camaro-zl1-var',  source: 'chevy-camaro-zl1',  target: 'chevy-camaro-gen6', type: 'variant_of',   strength: 0.95 },

  // ── CHARGER линия ───────────────────────────────────────────────────────────
  { id: 'charger-1969-srt8',     source: 'dodge-charger-1969',         target: 'dodge-charger-srt8-2011',   type: 'inspired',     strength: 0.65 },
  { id: 'charger-srt8-hellcat',  source: 'dodge-charger-srt8-2011',    target: 'dodge-charger-srt-hellcat', type: 'evolves_into', strength: 0.85 },
  { id: 'charger-hellcat-ev',    source: 'dodge-charger-srt-hellcat',  target: 'dodge-charger-daytona-ev',  type: 'evolves_into', strength: 0.72 },

  // ── CHALLENGER + SRT линия ──────────────────────────────────────────────────
  { id: 'challenger-1970-gen3',      source: 'dodge-challenger-1970',          target: 'dodge-challenger-gen3',         type: 'inspired',     strength: 0.78 },
  { id: 'challenger-gen3-hellcat',   source: 'dodge-challenger-gen3',          target: 'dodge-challenger-srt-hellcat',  type: 'evolves_into', strength: 0.82 },
  { id: 'challenger-hellcat-demon',  source: 'dodge-challenger-srt-hellcat',   target: 'dodge-challenger-srt-demon',    type: 'evolves_into', strength: 0.90 },
  { id: 'challenger-demon-ss',       source: 'dodge-challenger-srt-demon',     target: 'dodge-challenger-srt-super-stock', type: 'inspired',  strength: 0.85 },
  { id: 'challenger-ss-demon170',    source: 'dodge-challenger-srt-super-stock', target: 'dodge-challenger-srt-demon-170', type: 'evolves_into', strength: 0.88 },

  // ── VIPER линия ─────────────────────────────────────────────────────────────
  { id: 'viper-g1-g3',    source: 'dodge-viper-gen1',      target: 'dodge-viper-gen3-srt10', type: 'evolves_into', strength: 0.88 },
  { id: 'viper-g3-g5',    source: 'dodge-viper-gen3-srt10', target: 'dodge-viper-gen5-srt',  type: 'evolves_into', strength: 0.88 },
  { id: 'viper-acr-var',  source: 'dodge-viper-acr',       target: 'dodge-viper-gen5-srt',  type: 'variant_of',   strength: 0.95 },

  // ── Кросс-брендовые ─────────────────────────────────────────────────────────
  // Corvette C1 (1953) вдохновил Ford Thunderbird (1955) — прямой конкурент
  { id: 'corvette-c1-influenced-tbird',
    source: 'chevy-corvette-c1', target: 'ford-thunderbird',
    type: 'influenced_by', strength: 0.70 },

  // Ford Mustang Gen1 (1964) создал сегмент → GM ответил Camaro Gen1 (1967)
  { id: 'mustang-g1-influenced-camaro-g1',
    source: 'ford-mustang-1', target: 'chevy-camaro-gen1',
    type: 'influenced_by', strength: 0.85 },

  // Challenger SRT Demon (2018) → мышечная война → Ford Shelby GT500 (2020)
  { id: 'demon-influenced-gt500',
    source: 'dodge-challenger-srt-demon', target: 'ford-shelby-gt500',
    type: 'influenced_by', strength: 0.72 },

  // Camaro ZL1 (2017) vs Shelby GT500 (2020) — прямая война
  { id: 'camaro-zl1-influenced-gt500',
    source: 'chevy-camaro-zl1', target: 'ford-shelby-gt500',
    type: 'influenced_by', strength: 0.68 },
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
