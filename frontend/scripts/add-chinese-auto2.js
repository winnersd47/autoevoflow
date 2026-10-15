#!/usr/bin/env node
/**
 * add-chinese-auto2.js
 *   — фикс разрыва ГАЗ-3110 → Сайбер
 *   — Haval (Great Wall), Li Auto, Xpeng, Zeekr, Lynk & Co
 *   — Geely Xingyue L (Star L) — популярный кроссовер Geely
 *   — BYD Song / Yangwang (суббренд ультра-люкс)
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const NEW_NODES = [

  // ── Geely — добавляю Xingyue L (Star L) и Zeekr ───────────────────────────
  {
    id: 'geely-xingyue-l', label: 'Geely Xingyue L',
    type: 'generation', year: 2021, brandId: 'geely', brandName: 'Geely',
    codeName: 'KX11 Star L', modelSlug: 'geely-xingyue-l',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 238, engineType: 'i4t', engineCC: 2000,
    note: 'CMA-платформа; бестселлер D-SUV в Китае 2022–23',
  },
  {
    id: 'zeekr-001', label: 'Zeekr 001',
    type: 'generation', year: 2021, brandId: 'zeekr', brandName: 'Zeekr',
    codeName: '001', modelSlug: 'zeekr-001',
    bodyType: 'estate', segment: 'exec', zone: 'exec_sed',
    hp: 544, engineType: 'electric',
    note: 'Geely EV-суббренд; SEA-платформа; 544 л.с., 0-100 за 3.8s; shooting brake',
  },
  {
    id: 'zeekr-009', label: 'Zeekr 009',
    type: 'generation', year: 2022, brandId: 'zeekr', brandName: 'Zeekr',
    codeName: '009', modelSlug: 'zeekr-009',
    bodyType: 'mpv', segment: 'luxury_mpv', zone: 'luxury',
    hp: 544, engineType: 'electric',
    note: 'Люксовый электро-минивэн; SEA-платформа; конкурент Lexus LM',
  },

  // ── Lynk & Co (премиум суббренд Geely, CMA) ────────────────────────────────
  {
    id: 'lynk-co-01', label: 'Lynk & Co 01',
    type: 'generation', year: 2017, brandId: 'lynk-co', brandName: 'Lynk & Co',
    codeName: 'Lynk & Co 01', modelSlug: 'lynk-co-01',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 187, engineType: 'i4t', engineCC: 2000,
    note: 'CMA-платформа (Volvo/Geely); первый Lynk & Co; подписная модель',
  },
  {
    id: 'lynk-co-03', label: 'Lynk & Co 03',
    type: 'generation', year: 2018, brandId: 'lynk-co', brandName: 'Lynk & Co',
    codeName: 'Lynk & Co 03', modelSlug: 'lynk-co-03',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 254, engineType: 'i4t', engineCC: 2000,
    note: 'CMA-седан; 03+ Cyan Racing — серийный «Нюрбургринг-рекорд» среди FWD',
  },
  {
    id: 'lynk-co-08', label: 'Lynk & Co 08',
    type: 'generation', year: 2022, brandId: 'lynk-co', brandName: 'Lynk & Co',
    codeName: 'Lynk & Co 08', modelSlug: 'lynk-co-08',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 507, engineType: 'phev',
    note: 'Флагман Lynk & Co; PHEV 507 л.с.; SEA/CMA гибридная платформа',
  },

  // ── HAVAL / Great Wall (哈弗 / 长城) ──────────────────────────────────────
  {
    id: 'haval-h6-gen1', label: 'Haval H6 Gen.1',
    type: 'generation', year: 2011, brandId: 'haval', brandName: 'Haval',
    codeName: 'H6 I', modelSlug: 'haval-h6',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 141, engineType: 'i4', engineCC: 2000,
    note: '#1 SUV в Китае с 2012 по 2022; Great Wall Motors суббренд',
  },
  {
    id: 'haval-h6-gen3', label: 'Haval H6 Gen.3',
    type: 'generation', year: 2021, brandId: 'haval', brandName: 'Haval',
    codeName: 'H6 III', modelSlug: 'haval-h6',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 184, engineType: 'i4t', engineCC: 1500,
    note: 'Lemon DHT-PHEV платформа Great Wall; топ-продажи 9 лет подряд',
  },
  {
    id: 'haval-jolion', label: 'Haval Jolion',
    type: 'generation', year: 2021, brandId: 'haval', brandName: 'Haval',
    codeName: 'Jolion', modelSlug: 'haval-jolion',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 147, engineType: 'i4t', engineCC: 1500,
    note: 'Lemon-платформа; хит экспорта (РФ, Австралия, Ближний Восток)',
  },
  {
    id: 'haval-h9', label: 'Haval H9',
    type: 'generation', year: 2014, brandId: 'haval', brandName: 'Haval',
    codeName: 'H9', modelSlug: 'haval-h9',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 218, engineType: 'i4t', engineCC: 2000,
    note: 'Рамный флагманский внедорожник Great Wall; конкурент Prado',
  },
  {
    id: 'tank-300', label: 'Tank 300',
    type: 'generation', year: 2021, brandId: 'haval', brandName: 'Haval',
    codeName: 'Tank 300', modelSlug: 'tank-300',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 220, engineType: 'i4t', engineCC: 2000,
    note: 'Great Wall Tank суббренд; рамный городской внедорожник; культовый дизайн',
  },
  {
    id: 'tank-500', label: 'Tank 500',
    type: 'generation', year: 2022, brandId: 'haval', brandName: 'Haval',
    codeName: 'Tank 500', modelSlug: 'tank-500',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 451, engineType: 'phev',
    note: 'Флагман Tank; PHEV 3-рядный SUV; конкурент Land Rover Defender 110',
  },

  // ── LI AUTO (理想, EREV) ────────────────────────────────────────────────────
  {
    id: 'li-auto-one', label: 'Li Auto One',
    type: 'generation', year: 2019, brandId: 'li-auto', brandName: 'Li Auto',
    codeName: 'ONE', modelSlug: 'li-auto-one',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 331, engineType: 'erev',
    note: 'Первый серийный EREV SUV Китая; 6-местный; 1000+ км запас; продано 180k',
  },
  {
    id: 'li-auto-l9', label: 'Li Auto L9',
    type: 'generation', year: 2022, brandId: 'li-auto', brandName: 'Li Auto',
    codeName: 'L9', modelSlug: 'li-auto-l9',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 449, engineType: 'erev',
    note: 'Флагман Li Auto; 6-местный EREV SUV; назван «лучшим семейным SUV» 2022',
  },
  {
    id: 'li-auto-l7', label: 'Li Auto L7',
    type: 'generation', year: 2023, brandId: 'li-auto', brandName: 'Li Auto',
    codeName: 'L7', modelSlug: 'li-auto-l7',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 449, engineType: 'erev',
    note: 'D-SUV 5-местный; топ продаж ~30k/месяц в 2023–24',
  },
  {
    id: 'li-auto-mega', label: 'Li Auto MEGA',
    type: 'generation', year: 2024, brandId: 'li-auto', brandName: 'Li Auto',
    codeName: 'MEGA', modelSlug: 'li-auto-mega',
    bodyType: 'mpv', segment: 'luxury_mpv', zone: 'luxury',
    hp: 400, engineType: 'electric',
    note: 'Первый чистый EV Li Auto; 800V суперзарядка; 12 мин до 500km; MPV',
  },

  // ── XPENG / XPENG (小鹏) ────────────────────────────────────────────────────
  {
    id: 'xpeng-p7', label: 'Xpeng P7',
    type: 'generation', year: 2020, brandId: 'xpeng', brandName: 'Xpeng',
    codeName: 'P7', modelSlug: 'xpeng-p7',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 316, engineType: 'electric',
    note: 'Конкурент Tesla Model 3; XNGP автопилот; 706 km CLTC запас хода',
  },
  {
    id: 'xpeng-g9', label: 'Xpeng G9',
    type: 'generation', year: 2022, brandId: 'xpeng', brandName: 'Xpeng',
    codeName: 'G9', modelSlug: 'xpeng-g9',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 551, engineType: 'electric',
    note: '800V 480kW зарядка (5 мин = 200km); флагман Xpeng; AWD 3.9s',
  },
  {
    id: 'xpeng-x9', label: 'Xpeng X9',
    type: 'generation', year: 2024, brandId: 'xpeng', brandName: 'Xpeng',
    codeName: 'X9', modelSlug: 'xpeng-x9',
    bodyType: 'mpv', segment: 'luxury_mpv', zone: 'luxury',
    hp: 551, engineType: 'electric',
    note: 'Электро-минивэн; 800V; конкурент Li MEGA; XNGP L3 автопилот',
  },

  // ── BYD — дополняю Song и Yangwang ─────────────────────────────────────────
  {
    id: 'byd-song-plus-phev', label: 'BYD Song Plus PHEV',
    type: 'generation', year: 2021, brandId: 'byd', brandName: 'BYD',
    codeName: 'Song Plus DM-i', modelSlug: 'byd-song-plus',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 197, engineType: 'phev',
    note: 'DM-i PHEV; #1 бестселлер BYD 2022; 1090km запас хода',
  },
  {
    id: 'byd-yangwang-u8', label: 'Yangwang U8',
    type: 'generation', year: 2023, brandId: 'byd', brandName: 'BYD',
    codeName: 'U8', modelSlug: 'yangwang-u8',
    bodyType: 'suv', segment: 'large_suv', zone: 'luxury',
    hp: 1196, engineType: 'phev',
    note: 'BYD ультра-люкс суббренд Yangwang; 1196 л.с., умеет плыть 30 мин',
  },
]

// ── Рёбра ─────────────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // ─── ФИХ: разрыв ГАЗ-3110 → Сайбер ──────────────────────────────────────
  {
    id: 'gaz-3110-evolves-siber',
    source: 'gaz-volga-3110', target: 'gaz-siber',
    type: 'evolves_into', strength: 0.70,
  },

  // ─── Geely internal: Xingyue L + Zeekr ───────────────────────────────────
  {
    id: 'geely-monjaro-inspired-xingyue-l',
    source: 'geely-monjaro-kx11', target: 'geely-xingyue-l',
    type: 'inspired', strength: 0.75,
  },
  // Zeekr — суббренд Geely на SEA-платформе
  {
    id: 'geely-galaxy-inspired-zeekr-001',
    source: 'geely-galaxy-l7', target: 'zeekr-001',
    type: 'inspired', strength: 0.68,
  },
  {
    id: 'zeekr-001-evolves-zeekr-009',
    source: 'zeekr-001', target: 'zeekr-009',
    type: 'inspired', strength: 0.72,
  },

  // ─── Lynk & Co: суббренд Geely (CMA платформа) ───────────────────────────
  {
    id: 'geely-tugella-inspired-lynk-co-01',
    source: 'geely-tugella-fx11', target: 'lynk-co-01',
    type: 'inspired', strength: 0.72,
  },
  {
    id: 'lynk-co-01-inspired-lynk-co-03',
    source: 'lynk-co-01', target: 'lynk-co-03',
    type: 'inspired', strength: 0.70,
  },
  {
    id: 'lynk-co-08-inspired-zeekr-009',
    source: 'lynk-co-08', target: 'zeekr-009',
    type: 'inspired', strength: 0.62,
  },
  {
    id: 'lynk-co-01-evolves-lynk-co-08',
    source: 'lynk-co-01', target: 'lynk-co-08',
    type: 'evolves_into', strength: 0.75,
  },

  // ─── Haval / Great Wall ───────────────────────────────────────────────────
  {
    id: 'haval-h6-gen1-evolves-gen3',
    source: 'haval-h6-gen1', target: 'haval-h6-gen3',
    type: 'evolves_into', strength: 0.90,
  },
  {
    id: 'haval-h6-gen3-inspired-jolion',
    source: 'haval-h6-gen3', target: 'haval-jolion',
    type: 'inspired', strength: 0.78,
  },
  {
    id: 'haval-h9-inspired-tank-300',
    source: 'haval-h9', target: 'tank-300',
    type: 'inspired', strength: 0.70,
  },
  {
    id: 'tank-300-evolves-tank-500',
    source: 'tank-300', target: 'tank-500',
    type: 'inspired', strength: 0.75,
  },

  // ─── Li Auto ─────────────────────────────────────────────────────────────
  {
    id: 'li-one-evolves-l9',
    source: 'li-auto-one', target: 'li-auto-l9',
    type: 'evolves_into', strength: 0.82,
  },
  {
    id: 'li-l9-inspired-l7',
    source: 'li-auto-l9', target: 'li-auto-l7',
    type: 'inspired', strength: 0.85,
  },
  {
    id: 'li-l7-inspired-mega',
    source: 'li-auto-l7', target: 'li-auto-mega',
    type: 'inspired', strength: 0.60,
  },

  // ─── Xpeng ───────────────────────────────────────────────────────────────
  {
    id: 'xpeng-p7-inspired-g9',
    source: 'xpeng-p7', target: 'xpeng-g9',
    type: 'inspired', strength: 0.65,
  },
  {
    id: 'xpeng-g9-inspired-x9',
    source: 'xpeng-g9', target: 'xpeng-x9',
    type: 'inspired', strength: 0.68,
  },

  // ─── BYD additions ───────────────────────────────────────────────────────
  {
    id: 'byd-tang-evolves-song-plus',
    source: 'byd-tang-phev', target: 'byd-song-plus-phev',
    type: 'inspired', strength: 0.72,
  },
  {
    id: 'byd-tang-inspired-yangwang-u8',
    source: 'byd-tang-phev', target: 'byd-yangwang-u8',
    type: 'inspired', strength: 0.65,
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
  if (!ids.has(edge.source)) { console.warn(`⚠  source: ${edge.source}`); eS++; continue }
  if (!ids.has(edge.target)) { console.warn(`⚠  target: ${edge.target}`); eS++; continue }
  g.edges.push(edge); eids.add(edge.id); eA++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов (+${nA}), ${g.edges.length} рёбер (+${eA}), ${brands} брендов`)
