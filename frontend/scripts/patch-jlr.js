#!/usr/bin/env node
/**
 * patch-jlr.js — добавляет Jaguar и Land Rover в AutoEvoFlow
 *
 * Создаёт:
 *   public/data/brands/jaguar.json
 *   public/data/brands/land_rover.json
 *   Узлы + рёбра в graph.json
 *   Записи в brands.json (глобальный индекс)
 *
 * Запуск: node scripts/patch-jlr.js
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const ROOT       = path.join(__dirname, '..')
const GRAPH_FILE = path.join(ROOT, 'public/data/evolution/graph.json')
const BRANDS_IDX = path.join(ROOT, 'public/data/brands.json')
const BRANDS_DIR = path.join(ROOT, 'public/data/brands')

// ─── JAGUAR nodes ─────────────────────────────────────────────────────────────
const JAGUAR_NODES = [
  // ── XK sports cars ────────────────────────────────────────────────────────
  { id:'jag-xk120',     label:'XK120',          year:1948, codeName:'XK120',   modelSlug:'jaguar-xk',       bodyType:'coupe',       segment:'sports_coupe', zone:'gt_coupe',    hp:160, engineType:'i6' },
  { id:'jag-xk140',     label:'XK140',          year:1954, codeName:'XK140',   modelSlug:'jaguar-xk',       bodyType:'coupe',       segment:'sports_coupe', zone:'gt_coupe',    hp:190, engineType:'i6' },
  { id:'jag-xk150',     label:'XK150',          year:1957, codeName:'XK150',   modelSlug:'jaguar-xk',       bodyType:'coupe',       segment:'sports_coupe', zone:'gt_coupe',    hp:210, engineType:'i6' },

  // ── E-Type ────────────────────────────────────────────────────────────────
  { id:'jag-etype-s1',  label:'E-Type Series 1', year:1961, codeName:'OTS S1', modelSlug:'jaguar-e-type',   bodyType:'coupe',       segment:'supercar',    zone:'supercar',    hp:265, engineType:'i6' },
  { id:'jag-etype-s2',  label:'E-Type Series 2', year:1968, codeName:'OTS S2', modelSlug:'jaguar-e-type',   bodyType:'coupe',       segment:'supercar',    zone:'supercar',    hp:265, engineType:'i6' },
  { id:'jag-etype-s3',  label:'E-Type Series 3', year:1971, codeName:'OTS S3', modelSlug:'jaguar-e-type',   bodyType:'coupe',       segment:'supercar',    zone:'supercar',    hp:272, engineType:'v12' },

  // ── XJ-S / XK modern ──────────────────────────────────────────────────────
  { id:'jag-xjs',       label:'XJ-S',            year:1975, codeName:'XJ-S',   modelSlug:'jaguar-xjs',      bodyType:'coupe',       segment:'gt',          zone:'gt_coupe',    hp:295, engineType:'v12' },
  { id:'jag-xk8',       label:'XK8 / XKR',       year:1996, codeName:'X100',   modelSlug:'jaguar-xk8',      bodyType:'coupe',       segment:'gt',          zone:'gt_coupe',    hp:294, engineType:'v8' },
  { id:'jag-xk-x150',   label:'XK X150',          year:2006, codeName:'X150',   modelSlug:'jaguar-xk',       bodyType:'coupe',       segment:'gt',          zone:'gt_coupe',    hp:385, engineType:'v8' },

  // ── XJ flagship sedans ────────────────────────────────────────────────────
  { id:'jag-xj-s1',     label:'XJ Series 1',     year:1968, codeName:'XJ S1',  modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:245, engineType:'i6' },
  { id:'jag-xj-s2',     label:'XJ Series 2',     year:1973, codeName:'XJ S2',  modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:165, engineType:'i6' },
  { id:'jag-xj-s3',     label:'XJ Series 3',     year:1979, codeName:'XJ S3',  modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:165, engineType:'i6' },
  { id:'jag-xj40',      label:'XJ XJ40',          year:1986, codeName:'XJ40',   modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:176, engineType:'i6' },
  { id:'jag-xj-x300',   label:'XJ X300',          year:1994, codeName:'X300',   modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:237, engineType:'i6' },
  { id:'jag-xj-x308',   label:'XJ X308',          year:1997, codeName:'X308',   modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:290, engineType:'v8' },
  { id:'jag-xj-x350',   label:'XJ X350',          year:2003, codeName:'X350',   modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:294, engineType:'v8' },
  { id:'jag-xj-x351',   label:'XJ X351',          year:2010, codeName:'X351',   modelSlug:'jaguar-xj',       bodyType:'sedan',       segment:'flagship',    zone:'flagship_sed',hp:385, engineType:'v8' },

  // ── Executive / compact sedans ────────────────────────────────────────────
  { id:'jag-stype',     label:'S-Type',           year:1999, codeName:'X200',   modelSlug:'jaguar-s-type',   bodyType:'sedan',       segment:'executive',   zone:'exec_sed',    hp:240, engineType:'v6' },
  { id:'jag-xtype',     label:'X-Type',           year:2001, codeName:'X400',   modelSlug:'jaguar-x-type',   bodyType:'sedan',       segment:'compact',     zone:'midsize_sed', hp:156, engineType:'v6' },
  { id:'jag-xf-x250',   label:'XF X250',          year:2007, codeName:'X250',   modelSlug:'jaguar-xf',       bodyType:'sedan',       segment:'executive',   zone:'exec_sed',    hp:385, engineType:'v8' },
  { id:'jag-xf-x260',   label:'XF X260',          year:2015, codeName:'X260',   modelSlug:'jaguar-xf',       bodyType:'sedan',       segment:'executive',   zone:'exec_sed',    hp:300, engineType:'v6' },
  { id:'jag-xe',        label:'XE',               year:2015, codeName:'X760',   modelSlug:'jaguar-xe',       bodyType:'sedan',       segment:'compact',     zone:'midsize_sed', hp:197, engineType:'i4t' },

  // ── Sports cars ───────────────────────────────────────────────────────────
  { id:'jag-ftype',     label:'F-Type',           year:2012, codeName:'X152',   modelSlug:'jaguar-f-type',   bodyType:'coupe',       segment:'sports',      zone:'supercar',    hp:380, engineType:'v8' },

  // ── SUVs ──────────────────────────────────────────────────────────────────
  { id:'jag-fpace',     label:'F-Pace',           year:2016, codeName:'X761',   modelSlug:'jaguar-f-pace',   bodyType:'suv',         segment:'mid_suv',     zone:'suv_mid',     hp:250, engineType:'i4t' },
  { id:'jag-epace',     label:'E-Pace',           year:2018, codeName:'X540',   modelSlug:'jaguar-e-pace',   bodyType:'suv',         segment:'compact_suv', zone:'suv_compact', hp:180, engineType:'i4t' },
  { id:'jag-ipace',     label:'I-Pace',           year:2018, codeName:'X590',   modelSlug:'jaguar-i-pace',   bodyType:'suv',         segment:'electric_suv',zone:'electric',    hp:400, engineType:'ev' },

  // ── Halo / Hypercar ───────────────────────────────────────────────────────
  { id:'jag-xj220',     label:'XJ220',            year:1992, codeName:'XJ220',  modelSlug:'jaguar-xj220',    bodyType:'coupe',       segment:'hypercar',    zone:'hypercar',    hp:542, engineType:'v6t' },
  { id:'jag-cx75',      label:'C-X75 Concept',    year:2010, codeName:'C-X75',  modelSlug:'jaguar-cx75',     bodyType:'coupe',       segment:'hypercar',    zone:'hypercar',    hp:850, engineType:'ev' },
]

// ─── JAGUAR edges ─────────────────────────────────────────────────────────────
const JAGUAR_EDGES = [
  // XK lineage
  { id:'jag-ev-xk120-xk140',   source:'jag-xk120',    target:'jag-xk140',    type:'evolves_into', strength:0.95 },
  { id:'jag-ev-xk140-xk150',   source:'jag-xk140',    target:'jag-xk150',    type:'evolves_into', strength:0.95 },
  { id:'jag-ev-xk150-etype',   source:'jag-xk150',    target:'jag-etype-s1', type:'evolves_into', strength:0.7  },
  { id:'jag-ev-xks-xk8',       source:'jag-xjs',      target:'jag-xk8',      type:'evolves_into', strength:0.8  },
  { id:'jag-ev-xk8-xk150',     source:'jag-xk8',      target:'jag-xk-x150',  type:'evolves_into', strength:0.95 },
  { id:'jag-ev-xk150-ftype',   source:'jag-xk-x150',  target:'jag-ftype',    type:'evolves_into', strength:0.8  },
  // E-Type lineage
  { id:'jag-ev-etype-s1-s2',   source:'jag-etype-s1', target:'jag-etype-s2', type:'evolves_into', strength:0.98 },
  { id:'jag-ev-etype-s2-s3',   source:'jag-etype-s2', target:'jag-etype-s3', type:'evolves_into', strength:0.98 },
  { id:'jag-ev-etype-xjs',     source:'jag-etype-s3', target:'jag-xjs',      type:'evolves_into', strength:0.7  },
  // XJ lineage
  { id:'jag-ev-xj-s1-s2',      source:'jag-xj-s1',   target:'jag-xj-s2',    type:'evolves_into', strength:0.95 },
  { id:'jag-ev-xj-s2-s3',      source:'jag-xj-s2',   target:'jag-xj-s3',    type:'evolves_into', strength:0.95 },
  { id:'jag-ev-xj-s3-xj40',    source:'jag-xj-s3',   target:'jag-xj40',     type:'evolves_into', strength:0.9  },
  { id:'jag-ev-xj40-x300',     source:'jag-xj40',    target:'jag-xj-x300',  type:'evolves_into', strength:0.9  },
  { id:'jag-ev-x300-x308',     source:'jag-xj-x300', target:'jag-xj-x308',  type:'evolves_into', strength:0.9  },
  { id:'jag-ev-x308-x350',     source:'jag-xj-x308', target:'jag-xj-x350',  type:'evolves_into', strength:0.9  },
  { id:'jag-ev-x350-x351',     source:'jag-xj-x350', target:'jag-xj-x351',  type:'evolves_into', strength:0.95 },
  // XF lineage
  { id:'jag-ev-stype-xf',      source:'jag-stype',   target:'jag-xf-x250',  type:'evolves_into', strength:0.8  },
  { id:'jag-ev-xf-x250-x260',  source:'jag-xf-x250', target:'jag-xf-x260',  type:'evolves_into', strength:0.95 },
  // Cross-model
  { id:'jag-ev-xtype-xe',      source:'jag-xtype',   target:'jag-xe',       type:'evolves_into', strength:0.7  },
]

// ─── LAND ROVER nodes ─────────────────────────────────────────────────────────
const LR_NODES = [
  // ── Series / Defender ─────────────────────────────────────────────────────
  { id:'lr-series1',        label:'Series I',           year:1948, codeName:'Series I',   modelSlug:'land-rover-series',     bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:52,  engineType:'i4' },
  { id:'lr-series2',        label:'Series II',          year:1958, codeName:'Series II',  modelSlug:'land-rover-series',     bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:77,  engineType:'i4' },
  { id:'lr-series2a',       label:'Series IIA',         year:1961, codeName:'Series IIA', modelSlug:'land-rover-series',     bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:77,  engineType:'i4' },
  { id:'lr-series3',        label:'Series III',         year:1971, codeName:'Series III', modelSlug:'land-rover-series',     bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:91,  engineType:'i4' },
  { id:'lr-def-1983',       label:'Defender 90/110',    year:1983, codeName:'Defender 1', modelSlug:'land-rover-defender',   bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:122, engineType:'i4t' },
  { id:'lr-def-l663-90',    label:'Defender 90',        year:2020, codeName:'L663 90',    modelSlug:'land-rover-defender',   bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:300, engineType:'i4t' },
  { id:'lr-def-l663-110',   label:'Defender 110',       year:2020, codeName:'L663 110',   modelSlug:'land-rover-defender',   bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:300, engineType:'i4t' },
  { id:'lr-def-l663-130',   label:'Defender 130',       year:2022, codeName:'L663 130',   modelSlug:'land-rover-defender',   bodyType:'suv', segment:'offroad', zone:'suv_large',  hp:300, engineType:'i4t' },

  // ── Range Rover ───────────────────────────────────────────────────────────
  { id:'lr-rr-classic',     label:'Range Rover Classic', year:1970, codeName:'Classic',   modelSlug:'land-rover-range-rover', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:135, engineType:'v8' },
  { id:'lr-rr-p38a',        label:'Range Rover P38a',    year:1994, codeName:'P38a',      modelSlug:'land-rover-range-rover', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:185, engineType:'v8' },
  { id:'lr-rr-l322',        label:'Range Rover L322',    year:2001, codeName:'L322',      modelSlug:'land-rover-range-rover', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:282, engineType:'v8' },
  { id:'lr-rr-l405',        label:'Range Rover L405',    year:2012, codeName:'L405',      modelSlug:'land-rover-range-rover', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:375, engineType:'v8' },
  { id:'lr-rr-l460',        label:'Range Rover L460',    year:2022, codeName:'L460',      modelSlug:'land-rover-range-rover', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:530, engineType:'v8t' },
  { id:'lr-rr-electric',    label:'Range Rover Electric', year:2025, codeName:'EMA',      modelSlug:'land-rover-range-rover', bodyType:'suv', segment:'luxury_suv', zone:'electric',  hp:493, engineType:'ev' },

  // ── Range Rover Sport ─────────────────────────────────────────────────────
  { id:'lr-rrs-l320',       label:'Range Rover Sport L320', year:2005, codeName:'L320',  modelSlug:'land-rover-range-rover-sport', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:390, engineType:'v8' },
  { id:'lr-rrs-l494',       label:'Range Rover Sport L494', year:2013, codeName:'L494',  modelSlug:'land-rover-range-rover-sport', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:340, engineType:'v8' },
  { id:'lr-rrs-l461',       label:'Range Rover Sport L461', year:2022, codeName:'L461',  modelSlug:'land-rover-range-rover-sport', bodyType:'suv', segment:'luxury_suv', zone:'suv_large', hp:395, engineType:'i6t' },

  // ── Discovery ─────────────────────────────────────────────────────────────
  { id:'lr-disco1',         label:'Discovery 1',        year:1989, codeName:'LJ',         modelSlug:'land-rover-discovery',  bodyType:'suv', segment:'mid_suv',    zone:'suv_large',  hp:134, engineType:'v8' },
  { id:'lr-disco2',         label:'Discovery 2',        year:1998, codeName:'LT',         modelSlug:'land-rover-discovery',  bodyType:'suv', segment:'mid_suv',    zone:'suv_large',  hp:182, engineType:'v8' },
  { id:'lr-disco3',         label:'Discovery 3 / LR3',  year:2004, codeName:'LA',         modelSlug:'land-rover-discovery',  bodyType:'suv', segment:'mid_suv',    zone:'suv_large',  hp:216, engineType:'v6' },
  { id:'lr-disco4',         label:'Discovery 4 / LR4',  year:2009, codeName:'LA facelift',modelSlug:'land-rover-discovery',  bodyType:'suv', segment:'mid_suv',    zone:'suv_large',  hp:271, engineType:'v8' },
  { id:'lr-disco5',         label:'Discovery 5',        year:2017, codeName:'LR',         modelSlug:'land-rover-discovery',  bodyType:'suv', segment:'mid_suv',    zone:'suv_large',  hp:258, engineType:'i4t' },

  // ── Range Rover Evoque ────────────────────────────────────────────────────
  { id:'lr-evoque-l538',    label:'Range Rover Evoque L538', year:2011, codeName:'L538',  modelSlug:'land-rover-range-rover-evoque', bodyType:'suv', segment:'compact_suv', zone:'suv_compact', hp:240, engineType:'i4t' },
  { id:'lr-evoque-l551',    label:'Range Rover Evoque L551', year:2018, codeName:'L551',  modelSlug:'land-rover-range-rover-evoque', bodyType:'suv', segment:'compact_suv', zone:'suv_compact', hp:200, engineType:'i4t' },

  // ── Range Rover Velar ─────────────────────────────────────────────────────
  { id:'lr-velar',          label:'Range Rover Velar',  year:2017, codeName:'L560',        modelSlug:'land-rover-range-rover-velar', bodyType:'suv', segment:'mid_suv', zone:'suv_mid', hp:247, engineType:'i4t' },

  // ── Discovery Sport ───────────────────────────────────────────────────────
  { id:'lr-disco-sport',    label:'Discovery Sport',    year:2015, codeName:'L550',        modelSlug:'land-rover-discovery-sport', bodyType:'suv', segment:'compact_suv', zone:'suv_compact', hp:180, engineType:'i4t' },

  // ── Freelander ────────────────────────────────────────────────────────────
  { id:'lr-freelander1',    label:'Freelander 1',       year:1997, codeName:'L314',        modelSlug:'land-rover-freelander', bodyType:'suv', segment:'compact_suv', zone:'suv_compact', hp:118, engineType:'i4t' },
  { id:'lr-freelander2',    label:'Freelander 2 / LR2', year:2006, codeName:'L359',        modelSlug:'land-rover-freelander', bodyType:'suv', segment:'compact_suv', zone:'suv_compact', hp:177, engineType:'i4t' },
]

// ─── LAND ROVER edges ─────────────────────────────────────────────────────────
const LR_EDGES = [
  // Defender lineage
  { id:'lr-ev-s1-s2',       source:'lr-series1',      target:'lr-series2',      type:'evolves_into', strength:0.95 },
  { id:'lr-ev-s2-s2a',      source:'lr-series2',      target:'lr-series2a',     type:'evolves_into', strength:0.95 },
  { id:'lr-ev-s2a-s3',      source:'lr-series2a',     target:'lr-series3',      type:'evolves_into', strength:0.95 },
  { id:'lr-ev-s3-def83',    source:'lr-series3',      target:'lr-def-1983',     type:'evolves_into', strength:0.9  },
  { id:'lr-ev-def83-90',    source:'lr-def-1983',     target:'lr-def-l663-90',  type:'evolves_into', strength:0.85 },
  { id:'lr-ev-def83-110',   source:'lr-def-1983',     target:'lr-def-l663-110', type:'evolves_into', strength:0.85 },
  { id:'lr-ev-90-130',      source:'lr-def-l663-110', target:'lr-def-l663-130', type:'evolves_into', strength:0.8  },

  // Range Rover lineage
  { id:'lr-ev-rrc-p38',     source:'lr-rr-classic',   target:'lr-rr-p38a',      type:'evolves_into', strength:0.9  },
  { id:'lr-ev-p38-l322',    source:'lr-rr-p38a',      target:'lr-rr-l322',      type:'evolves_into', strength:0.9  },
  { id:'lr-ev-l322-l405',   source:'lr-rr-l322',      target:'lr-rr-l405',      type:'evolves_into', strength:0.95 },
  { id:'lr-ev-l405-l460',   source:'lr-rr-l405',      target:'lr-rr-l460',      type:'evolves_into', strength:0.95 },
  { id:'lr-ev-l460-ev',     source:'lr-rr-l460',      target:'lr-rr-electric',  type:'evolves_into', strength:0.8  },

  // Range Rover Sport lineage
  { id:'lr-ev-rrs-l320-494',source:'lr-rrs-l320',     target:'lr-rrs-l494',     type:'evolves_into', strength:0.95 },
  { id:'lr-ev-rrs-494-461', source:'lr-rrs-l494',     target:'lr-rrs-l461',     type:'evolves_into', strength:0.95 },

  // Discovery lineage
  { id:'lr-ev-d1-d2',       source:'lr-disco1',       target:'lr-disco2',       type:'evolves_into', strength:0.9  },
  { id:'lr-ev-d2-d3',       source:'lr-disco2',       target:'lr-disco3',       type:'evolves_into', strength:0.85 },
  { id:'lr-ev-d3-d4',       source:'lr-disco3',       target:'lr-disco4',       type:'evolves_into', strength:0.95 },
  { id:'lr-ev-d4-d5',       source:'lr-disco4',       target:'lr-disco5',       type:'evolves_into', strength:0.95 },

  // Evoque
  { id:'lr-ev-evq-l538-551',source:'lr-evoque-l538',  target:'lr-evoque-l551',  type:'evolves_into', strength:0.95 },

  // Freelander → Discovery Sport
  { id:'lr-ev-fl1-fl2',     source:'lr-freelander1',  target:'lr-freelander2',  type:'evolves_into', strength:0.95 },
  { id:'lr-ev-fl2-ds',      source:'lr-freelander2',  target:'lr-disco-sport',  type:'evolves_into', strength:0.85 },

  // Range Rover → Range Rover Sport (sibling)
  { id:'lr-sib-rrc-rrs320', source:'lr-rr-classic',   target:'lr-rrs-l320',     type:'platform_sibling', strength:0.6 },

  // Discovery from Range Rover Classic (same platform D1)
  { id:'lr-sib-rrc-d1',     source:'lr-rr-classic',   target:'lr-disco1',       type:'platform_sibling', strength:0.7 },
]

// ─── Cross-brand edges ────────────────────────────────────────────────────────
// Range Rover L322 used BMW Magna Steyr architecture
const CROSS_EDGES = [
  { id:'jlr-cross-rrl322-bmwe53', source:'lr-rr-l322', target:'bmw-x5-e53', type:'platform_sibling', strength:0.5 },
]

// ─── Build nodes ──────────────────────────────────────────────────────────────
function makeNode(data, brandId, brandName) {
  return {
    id:          data.id,
    label:       data.label,
    type:        'generation',
    year:        data.year,
    brandId,
    brandName,
    codeName:    data.codeName,
    modelSlug:   data.modelSlug,
    bodyType:    data.bodyType,
    segment:     data.segment,
    zone:        data.zone,
    hp:          data.hp,
    engineType:  data.engineType,
  }
}

// ─── Brand JSON files ─────────────────────────────────────────────────────────
const JAGUAR_BRAND = {
  id: 'brand-jaguar',
  slug: 'jaguar',
  name: 'Jaguar',
  fullName: 'Jaguar Land Rover Ltd.',
  country: 'UK',
  countryCode: 'GB',
  foundingYear: 1922,
  logoUrl: '',
  logoWhiteUrl: '',
  headerImageUrl: 'https://images.caricos.com/j/jaguar/2024_jaguar_f-type/images/1920x1080/2024_jaguar_f-type_1_1920x1080.jpg',
  description: `Jaguar began life in 1922 as the Swallow Sidecar Company — a manufacturer of motorcycle sidecars in Blackpool — before William Lyons pivoted to building stylish coachwork on Austin Seven chassis. The name "SS Jaguar" appeared on the 1935 2.5-litre saloon, and by 1945, post-war sensitivity to the SS initials led to the straightforward renaming: Jaguar Cars Ltd.\n\nThe company's technical identity was forged by William Heynes' twin-overhead-cam XK six-cylinder engine, debuted in 1948 in the XK120 roadster. That engine, in progressively refined forms, powered every significant Jaguar for the next 40 years — from the record-breaking C-Type and D-Type at Le Mans to the civilised Mk II saloon that Scotland Yard purchased in quantity. Its most celebrated application was the 1961 E-Type: a car so beautiful that Enzo Ferrari is said to have called it "the most beautiful car ever made," and one that Jaguar sold for £2,097 — less than a Triumph TR4.\n\nThe decades between the E-Type's retirement in 1975 and Ford's acquisition in 1990 were difficult: the XJ-S was unloved at launch, Lucas electrics earned the brand a reliability reputation it struggled to shed, and British Leyland's management made coherent product strategy impossible. Ford's ownership brought discipline and engineering investment (the all-aluminium XK8, the Mondeo-derived X-Type, the S-Type's Lincoln LS platform), then Tata Motors' 2008 acquisition brought something more valuable: strategic patience.\n\nUnder JLR, Jaguar produced its most technically ambitious cars — the all-aluminium XJ X351 that weighed 150 kg less than the steel X350, the F-Type that restored the brand's sporting soul, and the I-Pace that won the 2019 World Car of the Year ahead of every German competitor. The current 2025 rebrand — "Copy Nothing," a radical design language break — is either the boldest or most reckless move in British automotive history, depending on how the Type 00 concept translates to production.`,
  parentCompany: 'Tata Motors / JLR',
  headquarters: 'Coventry, UK',
  modelCount: 8,
  generationCount: JAGUAR_NODES.length,
  tags: ['uk', 'luxury', 'sports', 'le-mans', 'e-type', 'jlr', 'electric'],
  aiAnalysisAvailable: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
  dna: {
    id: 'dna-jaguar',
    brandId: 'brand-jaguar',
    overallScore: 88,
    dimensions: [
      {
        key: 'design_beauty',
        label: 'Design Beauty',
        score: 98,
        description: 'The E-Type is the definitive evidence: Jaguar\'s design language — long bonnet, cat-like haunches, minimal overhangs — has produced more objects of lasting beauty per decade than any other British manufacturer. The XJ X351\'s fastback silhouette, the F-Type\'s taut proportions, and even the unloved XJ-S\'s flying buttresses are retrospectively celebrated.',
        trend: 'stable',
      },
      {
        key: 'engineering_ambition',
        label: 'Engineering Ambition',
        score: 92,
        description: 'The twin-cam XK engine in 1948, the world\'s first production all-aluminium unibody luxury car (XJ X350, 2003), and the I-Pace\'s ground-up EV architecture (2018) — Jaguar has consistently produced engineering achievements that arrive ahead of competitors and then take decades to be properly appreciated.',
        trend: 'rising',
      },
      {
        key: 'motorsport',
        label: 'Motorsport Heritage',
        score: 85,
        description: 'Five Le Mans victories between 1951 and 1990 (C-Type ×2, D-Type ×3, XJR-9), a Formula 1 programme (2000–2004), and the current Formula E championship campaign. Jaguar\'s racing record is distinguished but concentrated — the company has never sustained a continuous motorsport programme the way Porsche or Ferrari has.',
        trend: 'stable',
      },
      {
        key: 'reliability',
        label: 'Build Reliability',
        score: 64,
        description: 'Lucas electrics ("Prince of Darkness") defined Jaguar\'s reliability reputation through the 1970s–1990s. Ford ownership improved build quality dramatically, and JLR\'s quality has been inconsistent — the I-Pace and F-Pace have received mixed long-term ownership reports, though the aluminium-intensive models have proven more durable than feared.',
        trend: 'rising',
      },
      {
        key: 'brand_identity',
        label: 'Brand Coherence',
        score: 72,
        description: 'The 2025 "Copy Nothing" rebrand — obliterating the leaping cat logo, moving upmarket to £100k+ EVs — is a gamble without precedent in the premium segment. It may create a genuinely distinctive luxury EV brand, or it may alienate the remaining customer base while failing to attract new buyers unfamiliar with Jaguar\'s heritage.',
        trend: 'declining',
      },
    ],
    dominantStyle: 'Beautiful Precision',
    colorPalette: ['#1a1a2e', '#c8a951', '#ffffff', '#2d5a8e'],
    keyElements: ['long bonnet', 'cat stance', 'twin-cam six', 'Le Mans', 'E-Type silhouette'],
    influencedBy: ['Italian coachbuilding', 'pre-war British sports cars', 'aeronautical design'],
    hasInfluenced: ['British sports car segment', 'aluminium body construction', 'affordable supercar concept'],
    temporalEvolution: [
      { year: 1948, score: 72, milestone: 'XK120 — XK twin-cam engine and the modern Jaguar formula' },
      { year: 1961, score: 96, milestone: 'E-Type — peak design, Enzo Ferrari\'s "most beautiful car"' },
      { year: 1975, score: 55, milestone: 'XJ-S — beautiful but unloved, Lucas electrics reputation' },
      { year: 1992, score: 70, milestone: 'XJ220 — 217 mph production car, V6t surprise' },
      { year: 2003, score: 80, milestone: 'XJ X350 — world\'s first production aluminium monocoque' },
      { year: 2012, score: 87, milestone: 'F-Type — spiritual E-Type successor, V8 supercharged' },
      { year: 2018, score: 91, milestone: 'I-Pace — World Car of the Year, beats German EVs' },
      { year: 2025, score: 68, milestone: '"Copy Nothing" rebrand — bold pivot to ultra-luxury EV' },
    ],
  },
}

const LR_BRAND = {
  id: 'brand-land_rover',
  slug: 'land_rover',
  name: 'Land Rover',
  fullName: 'Jaguar Land Rover Ltd.',
  country: 'UK',
  countryCode: 'GB',
  foundingYear: 1948,
  logoUrl: '',
  logoWhiteUrl: '',
  headerImageUrl: 'https://images.caricos.com/l/land_rover/2024_land_rover_defender/images/1920x1080/2024_land_rover_defender_1_1920x1080.jpg',
  description: `Land Rover was born of necessity, not aspiration. In 1947, Rover chief designer Maurice Wilks needed a utility vehicle for his Anglesey farm. He borrowed a war-surplus Willys Jeep as a template, fitted it with a lightweight aluminium body (steel was rationed, aluminium was not), and put a Rover P3 engine under the bonnet. The 1948 Amsterdam Motor Show prototype drew such interest that Rover launched it as a production model — expecting to sell it for a few years until the car division recovered.\n\nSeventy-six years later, Land Rover is the most profitable single brand in the Jaguar Land Rover portfolio, responsible for the majority of JLR's £5.5 billion profit in FY2024. The Range Rover is the definitive British luxury SUV — preferred by the British Royal Family, the Saudi royal household, and celebrities who need to be seen in something simultaneously expensive and practical.\n\nThe Defender's story is the most improbable in automotive history: a vehicle designed in 1948, with chassis architecture essentially unchanged through 2016, became a status symbol so powerful that its 2020 replacement had to carry the same nameplate despite sharing nothing with its ancestor. The new L663 Defender won the World Car of the Year in 2021 — a utilitarian working vehicle from the 1940s had become a luxury lifestyle object that people bought for £70,000.\n\nThe Range Rover's trajectory is equally remarkable: launched in 1970 as a dual-purpose vehicle (equally at home in a muddy field and at Harrods), it invented the luxury SUV segment twenty years before anyone used that phrase. The L460 of 2022 starts at £94,350 and reaches £180,000 in Long Wheelbase SV Serenity specification — prices that overlap with Bentley Bentayga and Rolls-Royce Cullinan.\n\nUnder Tata ownership since 2008, Land Rover has invested heavily in aluminium architecture (MLA platform for the 2022 Range Rover and Defender), electrification (MHEV and PHEV variants across the range, BEV Range Rover for 2025), and capability technology (Terrain Response, ClearSight Ground View, Wade Sensing). The tension between off-road authenticity and luxury-market positioning is Land Rover's defining challenge — and its most commercially successful paradox.`,
  parentCompany: 'Tata Motors / JLR',
  headquarters: 'Solihull, UK',
  modelCount: 7,
  generationCount: LR_NODES.length,
  tags: ['uk', 'luxury', 'offroad', 'suv', 'jlr', 'range-rover', 'defender', 'electric'],
  aiAnalysisAvailable: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
  dna: {
    id: 'dna-land_rover',
    brandId: 'brand-land_rover',
    overallScore: 89,
    dimensions: [
      {
        key: 'offroad_capability',
        label: 'Off-Road Capability',
        score: 97,
        description: 'Land Rover\'s terrain capability is legendary: Camel Trophy victories, trans-continental expeditions, military service in every major conflict since Korea. Terrain Response (2004), ClearSight Ground View (2019), and the Defender\'s 900mm wading depth define the state of the art in production vehicle off-road technology.',
        trend: 'stable',
      },
      {
        key: 'luxury_positioning',
        label: 'Luxury Positioning',
        score: 91,
        description: 'The Range Rover invented the luxury SUV segment and remains its benchmark. L460 pricing overlaps Bentley Bentayga; Range Rover SV Serenity at £180,000 exceeds Rolls-Royce Cullinan base price. No other manufacturer has successfully combined genuine off-road capability with this level of interior luxury.',
        trend: 'rising',
      },
      {
        key: 'engineering_innovation',
        label: 'Engineering Innovation',
        score: 85,
        description: 'The all-aluminium MLA platform (2022 Range Rover and Defender) reduced weight by up to 150 kg versus steel equivalents. Air suspension with Automatic Terrain Response, electronically controlled differentials, and wade sensing represent 30 years of continuous off-road technology development.',
        trend: 'rising',
      },
      {
        key: 'reliability',
        label: 'Build Reliability',
        score: 58,
        description: 'JLR reliability has historically been below segment average — the 2019 Defender and Range Rover L405 both had significant early ownership issues. The L460 has improved but remains below German competitors in long-term reliability surveys. Electrical system complexity is the primary failure mode.',
        trend: 'rising',
      },
      {
        key: 'brand_heritage',
        label: 'Heritage & Legacy',
        score: 96,
        description: 'Series I in 1948, Range Rover in 1970, Camel Trophy 1980–1998, Royal Family transport since 1951, Defender in continuous production 1983–2016. Land Rover\'s heritage in exploration, military, and luxury is unmatched by any other SUV manufacturer.',
        trend: 'stable',
      },
    ],
    dominantStyle: 'Rugged Luxury',
    colorPalette: ['#006b3c', '#c8a951', '#1a1a1a', '#e8e8e8'],
    keyElements: ['Terrain Response', 'aluminium body', 'air suspension', 'wading capability', 'Defender silhouette'],
    influencedBy: ['Willys Jeep', 'British colonial utility vehicle', 'agricultural machinery'],
    hasInfluenced: ['luxury SUV segment creation', 'terrain management technology', 'urban SUV culture'],
    temporalEvolution: [
      { year: 1948, score: 60, milestone: 'Series I — aluminium body, Rover P3 engine, farm necessity' },
      { year: 1970, score: 78, milestone: 'Range Rover — invented the luxury SUV category' },
      { year: 1983, score: 72, milestone: 'Defender name established — the definitive utility 4x4' },
      { year: 1989, score: 76, milestone: 'Discovery — family off-roader, Range Rover technology downstream' },
      { year: 2001, score: 79, milestone: 'L322 — BMW co-developed platform, air suspension standard' },
      { year: 2005, score: 83, milestone: 'Range Rover Sport — performance SUV before that was a category' },
      { year: 2012, score: 87, milestone: 'L405 — all-aluminium lightweight luxury flagship' },
      { year: 2020, score: 91, milestone: 'L663 Defender — World Car of the Year, 72 years after Series I' },
      { year: 2022, score: 93, milestone: 'L460 Range Rover — MLA platform, overlaps Bentley pricing' },
    ],
  },
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  // 1. Patch graph.json
  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
  const existingIds  = new Set(graph.nodes.map(n => n.id))
  const existingEdge = new Set(graph.edges.map(e => e.id))

  let addedNodes = 0, addedEdges = 0

  const allNodes = [
    ...JAGUAR_NODES.map(n => makeNode(n, 'jaguar', 'Jaguar')),
    ...LR_NODES.map(n => makeNode(n, 'land-rover', 'Land Rover')),
  ]
  const allEdges = [...JAGUAR_EDGES, ...LR_EDGES, ...CROSS_EDGES]

  for (const node of allNodes) {
    if (existingIds.has(node.id)) { console.log(`  skip node: ${node.id}`); continue }
    graph.nodes.push(node)
    existingIds.add(node.id)
    addedNodes++
  }

  for (const edge of allEdges) {
    if (existingEdge.has(edge.id)) continue
    // Validate both endpoints exist
    if (!existingIds.has(edge.source)) { console.warn(`  warn: source missing ${edge.source}`); continue }
    if (!existingIds.has(edge.target)) { console.warn(`  warn: target missing ${edge.target}`); continue }
    graph.edges.push(edge)
    existingEdge.add(edge.id)
    addedEdges++
  }

  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
  console.log(`[graph] +${addedNodes} nodes, +${addedEdges} edges → total ${graph.nodes.length} nodes, ${graph.edges.length} edges`)

  // 2. Write brand files
  fs.mkdirSync(BRANDS_DIR, { recursive: true })
  fs.writeFileSync(path.join(BRANDS_DIR, 'jaguar.json'), JSON.stringify(JAGUAR_BRAND, null, 2), 'utf8')
  fs.writeFileSync(path.join(BRANDS_DIR, 'land_rover.json'), JSON.stringify(LR_BRAND, null, 2), 'utf8')
  console.log('[brands] jaguar.json + land_rover.json written')

  // 3. Update brands.json global index
  const brandsIdx = JSON.parse(fs.readFileSync(BRANDS_IDX, 'utf8'))
  const existingSlugs = new Set(brandsIdx.map(b => b.slug))

  const newBrandEntries = [
    {
      id: 'brand-jaguar',
      slug: 'jaguar',
      name: 'Jaguar',
      fullName: 'Jaguar Land Rover Ltd.',
      country: 'UK',
      countryCode: 'GB',
      foundingYear: 1922,
      logoUrl: '',
      logoWhiteUrl: '',
      headerImageUrl: '',
      description: 'Jaguar is a UK luxury and sports car manufacturer, part of JLR (Tata Motors), founded in 1922.',
      parentCompany: 'Tata Motors / JLR',
      headquarters: 'Coventry, UK',
      modelCount: 8,
      generationCount: JAGUAR_NODES.length,
      tags: ['uk', 'luxury', 'sports', 'jlr'],
      aiAnalysisAvailable: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'brand-land_rover',
      slug: 'land_rover',
      name: 'Land Rover',
      fullName: 'Jaguar Land Rover Ltd.',
      country: 'UK',
      countryCode: 'GB',
      foundingYear: 1948,
      logoUrl: '',
      logoWhiteUrl: '',
      headerImageUrl: '',
      description: 'Land Rover is a UK SUV and off-road vehicle manufacturer, part of JLR (Tata Motors), founded in 1948.',
      parentCompany: 'Tata Motors / JLR',
      headquarters: 'Solihull, UK',
      modelCount: 7,
      generationCount: LR_NODES.length,
      tags: ['uk', 'luxury', 'suv', 'offroad', 'jlr'],
      aiAnalysisAvailable: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ]

  let addedBrands = 0
  for (const b of newBrandEntries) {
    if (!existingSlugs.has(b.slug)) {
      brandsIdx.push(b)
      addedBrands++
    }
  }
  if (addedBrands > 0) {
    brandsIdx.sort((a, b) => a.name.localeCompare(b.name))
    fs.writeFileSync(BRANDS_IDX, JSON.stringify(brandsIdx, null, 2), 'utf8')
    console.log(`[brands.json] +${addedBrands} entries`)
  }

  console.log('\n✅ JLR добавлен успешно:')
  console.log(`   Jaguar: ${JAGUAR_NODES.length} поколений, ${JAGUAR_EDGES.length} рёбер`)
  console.log(`   Land Rover: ${LR_NODES.length} поколений, ${LR_EDGES.length} рёбер`)
}

main()
