#!/usr/bin/env node
/**
 * add-chinese-auto.js
 * Добавляет:
 *   — новую Волгу (C40 / K30 / K40, 2024) под брендом gaz
 *   — Changan, BYD, Geely, NIO
 * Запуск: node scripts/add-chinese-auto.js
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// ── Новые узлы ────────────────────────────────────────────────────────────────
const NEW_NODES = [

  // ── Новая Волга (GAZ) ───────────────────────────────────────────────────────
  {
    id: 'gaz-volga-c40', label: 'Volga C40',
    type: 'generation', year: 2024, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'C40', modelSlug: 'gaz-volga-c40',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 188, engineType: 'i4t', engineCC: 1500,
    note: 'Возрождение бренда Волга; платформа Changan Raeton Plus; произв. Нижний Новгород',
  },
  {
    id: 'gaz-volga-k30', label: 'Volga K30',
    type: 'generation', year: 2024, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'K30', modelSlug: 'gaz-volga-k30',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 188, engineType: 'i4t', engineCC: 1500,
    note: 'Платформа Changan Oshan X5 Plus; 100к авт./год план',
  },
  {
    id: 'gaz-volga-k40', label: 'Volga K40',
    type: 'generation', year: 2024, brandId: 'gaz', brandName: 'GAZ',
    codeName: 'K40', modelSlug: 'gaz-volga-k40',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 188, engineType: 'i4t', engineCC: 1500,
    note: 'Платформа Changan Uni-Z; флагманский внедорожник новой Волги',
  },

  // ── CHANGAN (长安) ──────────────────────────────────────────────────────────
  {
    id: 'changan-cs35-plus', label: 'Changan CS35 Plus',
    type: 'generation', year: 2018, brandId: 'changan', brandName: 'Changan',
    codeName: 'CS35 Plus', modelSlug: 'changan-cs35-plus',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 136, engineType: 'i3t', engineCC: 1500,
  },
  {
    id: 'changan-cs55-plus', label: 'Changan CS55 Plus',
    type: 'generation', year: 2020, brandId: 'changan', brandName: 'Changan',
    codeName: 'CS55 Plus', modelSlug: 'changan-cs55-plus',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 177, engineType: 'i4t', engineCC: 1500,
  },
  {
    id: 'changan-cs75-plus', label: 'Changan CS75 Plus',
    type: 'generation', year: 2019, brandId: 'changan', brandName: 'Changan',
    codeName: 'CS75 Plus', modelSlug: 'changan-cs75-plus',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 224, engineType: 'i4t', engineCC: 2000,
  },
  {
    id: 'changan-eado-plus', label: 'Changan Eado Plus',
    type: 'generation', year: 2020, brandId: 'changan', brandName: 'Changan',
    codeName: 'Eado Plus', modelSlug: 'changan-eado-plus',
    bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
    hp: 197, engineType: 'i4t', engineCC: 1500,
  },
  {
    id: 'changan-raeton-plus', label: 'Changan Raeton Plus',
    type: 'generation', year: 2022, brandId: 'changan', brandName: 'Changan',
    codeName: 'Raeton Plus', modelSlug: 'changan-raeton-plus',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 188, engineType: 'i4t', engineCC: 1500,
    note: 'D-класс; база для Volga C40; 4786mm',
  },
  {
    id: 'changan-oshan-x5-plus', label: 'Changan Oshan X5 Plus',
    type: 'generation', year: 2022, brandId: 'changan', brandName: 'Changan',
    codeName: 'Oshan X5 Plus', modelSlug: 'changan-oshan-x5-plus',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 197, engineType: 'i4t', engineCC: 1500,
    note: 'C-класс кроссовер; база для Volga K30',
  },
  {
    id: 'changan-uni-v', label: 'Changan Uni-V',
    type: 'generation', year: 2022, brandId: 'changan', brandName: 'Changan',
    codeName: 'Uni-V', modelSlug: 'changan-uni-v',
    bodyType: 'hatchback', segment: 'sports', zone: 'hatchback',
    hp: 254, engineType: 'i4t', engineCC: 2000,
  },
  {
    id: 'changan-uni-k', label: 'Changan Uni-K',
    type: 'generation', year: 2021, brandId: 'changan', brandName: 'Changan',
    codeName: 'Uni-K', modelSlug: 'changan-uni-k',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 254, engineType: 'i4t', engineCC: 2000,
  },
  {
    id: 'changan-uni-z', label: 'Changan Uni-Z',
    type: 'generation', year: 2023, brandId: 'changan', brandName: 'Changan',
    codeName: 'Uni-Z', modelSlug: 'changan-uni-z',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 197, engineType: 'i4t', engineCC: 1500,
    note: 'D-класс SUV; база для Volga K40',
  },

  // ── BYD (比亚迪) ─────────────────────────────────────────────────────────────
  {
    id: 'byd-tang-phev', label: 'BYD Tang PHEV',
    type: 'generation', year: 2018, brandId: 'byd', brandName: 'BYD',
    codeName: 'Tang DM', modelSlug: 'byd-tang',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 505, engineType: 'phev', engineCC: 2000,
    note: '505 л.с. PHEV; пионер plug-in SUV в Китае',
  },
  {
    id: 'byd-han-ev', label: 'BYD Han EV',
    type: 'generation', year: 2020, brandId: 'byd', brandName: 'BYD',
    codeName: 'Han EV', modelSlug: 'byd-han',
    bodyType: 'sedan', segment: 'flagship', zone: 'flagship_sed',
    hp: 517, engineType: 'electric',
    note: 'Флагман BYD; Blade-батарея; первый премиум-конкурент Tesla Model S от BYD',
  },
  {
    id: 'byd-dolphin-ev', label: 'BYD Dolphin',
    type: 'generation', year: 2021, brandId: 'byd', brandName: 'BYD',
    codeName: 'Dolphin', modelSlug: 'byd-dolphin',
    bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
    hp: 177, engineType: 'electric',
    note: 'e-Platform 3.0; доступный электрохэтч; топ продаж в 2023',
  },
  {
    id: 'byd-atto3-ev', label: 'BYD Atto 3',
    type: 'generation', year: 2021, brandId: 'byd', brandName: 'BYD',
    codeName: 'Atto 3 / Yuan Plus', modelSlug: 'byd-atto3',
    bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
    hp: 204, engineType: 'electric',
  },
  {
    id: 'byd-seal-ev', label: 'BYD Seal',
    type: 'generation', year: 2022, brandId: 'byd', brandName: 'BYD',
    codeName: 'Seal / Sea Lion 4', modelSlug: 'byd-seal',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 523, engineType: 'electric',
    note: 'e-Platform 3.0; конкурент Tesla Model 3; AWD 3.8s 0-100',
  },
  {
    id: 'byd-seagull-ev', label: 'BYD Seagull',
    type: 'generation', year: 2023, brandId: 'byd', brandName: 'BYD',
    codeName: 'Seagull / Changdi EV5', modelSlug: 'byd-seagull',
    bodyType: 'hatchback', segment: 'mini', zone: 'hatchback',
    hp: 74, engineType: 'electric',
    note: 'Самый доступный EV BYD; от $10k; хит продаж',
  },

  // ── GEELY (吉利) ─────────────────────────────────────────────────────────────
  {
    id: 'geely-emgrand-ec7', label: 'Geely Emgrand EC7',
    type: 'generation', year: 2009, brandId: 'geely', brandName: 'Geely',
    codeName: 'EC7', modelSlug: 'geely-emgrand-ec7',
    bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
    hp: 132, engineType: 'i4', engineCC: 1800,
    note: 'Первый флагманский седан Geely; 1 млн проданных',
  },
  {
    id: 'geely-atlas-nl3', label: 'Geely Atlas',
    type: 'generation', year: 2016, brandId: 'geely', brandName: 'Geely',
    codeName: 'NL-3', modelSlug: 'geely-atlas',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 184, engineType: 'i4t', engineCC: 2000,
  },
  {
    id: 'geely-tugella-fx11', label: 'Geely Tugella',
    type: 'generation', year: 2019, brandId: 'geely', brandName: 'Geely',
    codeName: 'FX11', modelSlug: 'geely-tugella',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 245, engineType: 'i4t', engineCC: 2000,
    note: 'CMA-платформа (совместно Volvo/Geely); флагманский SUV',
  },
  {
    id: 'geely-monjaro-kx11', label: 'Geely Monjaro',
    type: 'generation', year: 2022, brandId: 'geely', brandName: 'Geely',
    codeName: 'KX11 / Xingyue L', modelSlug: 'geely-monjaro',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 238, engineType: 'i4t', engineCC: 2000,
    note: 'CMA-платформа; конкурент VW Touareg; лауреат наград дизайна 2022',
  },
  {
    id: 'geely-galaxy-l7', label: 'Geely Galaxy L7',
    type: 'generation', year: 2023, brandId: 'geely', brandName: 'Geely',
    codeName: 'Galaxy L7', modelSlug: 'geely-galaxy-l7',
    bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
    hp: 218, engineType: 'phev',
    note: 'Новый суббренд Galaxy (электрифицированные); PHEV SUV, 1100km запас хода',
  },

  // ── NIO (蔚来) ───────────────────────────────────────────────────────────────
  {
    id: 'nio-ep9', label: 'NIO EP9',
    type: 'generation', year: 2016, brandId: 'nio', brandName: 'NIO',
    codeName: 'EP9', modelSlug: 'nio-ep9',
    bodyType: 'hypercar', segment: 'hypercar', zone: 'hypercar',
    hp: 1360, engineType: 'electric',
    note: 'Нюрбургринг-рекорд 6:45.9 (2016) для EV; 4 мотора; ~$1.2M; 45 экз.',
  },
  {
    id: 'nio-es8', label: 'NIO ES8',
    type: 'generation', year: 2018, brandId: 'nio', brandName: 'NIO',
    codeName: 'ES8', modelSlug: 'nio-es8',
    bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
    hp: 644, engineType: 'electric',
    note: 'Первый серийный автомобиль NIO; технология Battery Swap',
  },
  {
    id: 'nio-et7', label: 'NIO ET7',
    type: 'generation', year: 2022, brandId: 'nio', brandName: 'NIO',
    codeName: 'ET7', modelSlug: 'nio-et7',
    bodyType: 'sedan', segment: 'flagship', zone: 'flagship_sed',
    hp: 653, engineType: 'electric',
    note: 'Флагманский EV седан; 150кВт·ч NEMI-батарея; 1000+ km запас',
  },
  {
    id: 'nio-et5', label: 'NIO ET5',
    type: 'generation', year: 2022, brandId: 'nio', brandName: 'NIO',
    codeName: 'ET5', modelSlug: 'nio-et5',
    bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
    hp: 489, engineType: 'electric',
    note: 'Конкурент Tesla Model 3; второй по продажам седан NIO',
  },
]

// ── Новые рёбра ───────────────────────────────────────────────────────────────
const NEW_EDGES = [

  // GAZ: историческая линия → новая Волга
  {
    id: 'gaz-siber-evolves-volga-c40',
    source: 'gaz-siber', target: 'gaz-volga-c40',
    type: 'evolves_into', strength: 0.65,
  },
  {
    id: 'gaz-volga-c40-inspired-volga-k30',
    source: 'gaz-volga-c40', target: 'gaz-volga-k30',
    type: 'inspired', strength: 0.80,
  },
  {
    id: 'gaz-volga-c40-inspired-volga-k40',
    source: 'gaz-volga-c40', target: 'gaz-volga-k40',
    type: 'inspired', strength: 0.80,
  },

  // Новая Волга ← платформы Changan
  {
    id: 'gaz-volga-c40-derived-changan-raeton-plus',
    source: 'gaz-volga-c40', target: 'changan-raeton-plus',
    type: 'derived_from', strength: 0.95,
  },
  {
    id: 'gaz-volga-k30-derived-changan-oshan-x5-plus',
    source: 'gaz-volga-k30', target: 'changan-oshan-x5-plus',
    type: 'derived_from', strength: 0.95,
  },
  {
    id: 'gaz-volga-k40-derived-changan-uni-z',
    source: 'gaz-volga-k40', target: 'changan-uni-z',
    type: 'derived_from', strength: 0.95,
  },

  // Changan внутренние линии
  {
    id: 'changan-cs35plus-evolves-cs55plus',
    source: 'changan-cs35-plus', target: 'changan-cs55-plus',
    type: 'inspired', strength: 0.70,
  },
  {
    id: 'changan-cs55plus-evolves-cs75plus',
    source: 'changan-cs55-plus', target: 'changan-cs75-plus',
    type: 'inspired', strength: 0.65,
  },
  {
    id: 'changan-cs75plus-evolves-uni-k',
    source: 'changan-cs75-plus', target: 'changan-uni-k',
    type: 'evolves_into', strength: 0.75,
  },
  {
    id: 'changan-eado-plus-evolves-raeton-plus',
    source: 'changan-eado-plus', target: 'changan-raeton-plus',
    type: 'evolves_into', strength: 0.72,
  },
  {
    id: 'changan-cs55plus-inspired-oshan-x5plus',
    source: 'changan-cs55-plus', target: 'changan-oshan-x5-plus',
    type: 'inspired', strength: 0.65,
  },
  {
    id: 'changan-uni-k-inspired-uni-z',
    source: 'changan-uni-k', target: 'changan-uni-z',
    type: 'inspired', strength: 0.75,
  },

  // BYD внутренние линии
  {
    id: 'byd-tang-phev-inspired-han-ev',
    source: 'byd-tang-phev', target: 'byd-han-ev',
    type: 'inspired', strength: 0.70,
  },
  {
    id: 'byd-han-ev-inspired-seal-ev',
    source: 'byd-han-ev', target: 'byd-seal-ev',
    type: 'inspired', strength: 0.75,
  },
  {
    id: 'byd-dolphin-ev-evolves-seagull-ev',
    source: 'byd-dolphin-ev', target: 'byd-seagull-ev',
    type: 'inspired', strength: 0.65,
  },
  {
    id: 'byd-atto3-inspired-seal-ev',
    source: 'byd-atto3-ev', target: 'byd-seal-ev',
    type: 'inspired', strength: 0.60,
  },

  // Geely внутренние линии
  {
    id: 'geely-emgrand-ec7-inspired-atlas',
    source: 'geely-emgrand-ec7', target: 'geely-atlas-nl3',
    type: 'inspired', strength: 0.65,
  },
  {
    id: 'geely-atlas-evolves-tugella',
    source: 'geely-atlas-nl3', target: 'geely-tugella-fx11',
    type: 'evolves_into', strength: 0.75,
  },
  {
    id: 'geely-tugella-inspired-monjaro',
    source: 'geely-tugella-fx11', target: 'geely-monjaro-kx11',
    type: 'evolves_into', strength: 0.78,
  },
  {
    id: 'geely-monjaro-inspired-galaxy-l7',
    source: 'geely-monjaro-kx11', target: 'geely-galaxy-l7',
    type: 'inspired', strength: 0.70,
  },

  // Geely → Lotus (владение/платформа): Geely купил Lotus в 2017
  {
    id: 'geely-tugella-platform-lotus-eletre',
    source: 'geely-tugella-fx11', target: 'lotus-eletre',
    type: 'inspired', strength: 0.50,
  },

  // NIO внутренние линии
  {
    id: 'nio-ep9-inspired-es8',
    source: 'nio-ep9', target: 'nio-es8',
    type: 'inspired', strength: 0.72,
  },
  {
    id: 'nio-es8-inspired-et7',
    source: 'nio-es8', target: 'nio-et7',
    type: 'inspired', strength: 0.70,
  },
  {
    id: 'nio-et7-inspired-et5',
    source: 'nio-et7', target: 'nio-et5',
    type: 'inspired', strength: 0.75,
  },
]

// ── Запись ────────────────────────────────────────────────────────────────────
const existingIds  = new Set(g.nodes.map(n => n.id))
const existingEdge = new Set(g.edges.map(e => e.id))

let nAdded = 0, eAdded = 0, nSkip = 0, eSkip = 0

for (const node of NEW_NODES) {
  if (existingIds.has(node.id)) { console.log(`⟳  узел уже есть: ${node.id}`); nSkip++; continue }
  g.nodes.push(node); existingIds.add(node.id); nAdded++
  console.log(`✅ узел: ${node.label} (${node.year}) [${node.brandId}]`)
}

for (const edge of NEW_EDGES) {
  if (existingEdge.has(edge.id)) { console.log(`⟳  ребро уже есть: ${edge.id}`); eSkip++; continue }
  if (!existingIds.has(edge.source)) { console.warn(`⚠  source не найден: ${edge.source}`); eSkip++; continue }
  if (!existingIds.has(edge.target)) { console.warn(`⚠  target не найден: ${edge.target}`); eSkip++; continue }
  g.edges.push(edge); existingEdge.add(edge.id); eAdded++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: узлов ${g.nodes.length} (+${nAdded}), рёбер ${g.edges.length} (+${eAdded}), брендов ${brands}`)
console.log(`   пропущено: ${nSkip} узлов, ${eSkip} рёбер`)
