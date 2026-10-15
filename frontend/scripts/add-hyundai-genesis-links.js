/**
 * Связи Hyundai ↔ Genesis
 *
 * Три уровня:
 *
 * 1. ПРЯМОЕ ПРОИСХОЖДЕНИЕ (ребрендинг 2015 г.)
 *    Hyundai Genesis BH (2009) → DH (2014) → Genesis G80 Gen1 (2017)
 *    Hyundai Equus (2009)                   → Genesis G90 Gen1 (2015)
 *    Оба — evolves_into, т.к. физически те же автомобили до/после ребрендинга
 *
 * 2. ПЛАТФОРМЫ
 *    E-GMP (800V):   IONIQ 5 ─ GV60           [уже есть e-hyu-ioniq5-gv60]
 *    N3/Lambda RWD:  i30 N / Stinger ─ G70    [e-kia-stinger-g70 уже есть]
 *    H-platform:     Santa Fe DM ─ GV80
 *    i30/Tucson:     Tucson NX4 ─ GV70
 *
 * 3. ДНК ПРОИЗВОДИТЕЛЬНОСТИ
 *    Hyundai N (i30 N) → Genesis Magma (GV60 Magma, G80 Magma)
 *    Логика: N-division основала принципы, Magma их масштабировала
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

// ─── 1. Предшественники Genesis — модели под брендом Hyundai ──────────────────

const newNodes = [
  // Hyundai Genesis BH (1-е пок., 2008) — первый крупный заднеприводный Hyundai
  // V6 3.8 290hp / V8 4.6 375hp
  {
    id: 'hyu-genesis-bh',
    label: 'Hyundai Genesis (2009)',
    year: 2009,
    brandId: 'hyundai', brandName: 'Hyundai',
    modelSlug: 'hyundai-genesis-bh', familyKey: 'hyu-genesis',
    type: 'generation', bodyType: 'sedan',
    segment: 'exec', zone: 'flagship_sed',
    hp: 375, engineType: 'v8', codeName: 'BH',
  },
  // Hyundai Genesis DH (2-е пок., 2014) — он же первый Genesis G80 (2017 MY)
  // Продавался как Hyundai Genesis 2014-2016, затем ребрендирован в Genesis G80
  // V6T 3.3 365hp / V8 5.0 420hp
  {
    id: 'hyu-genesis-dh',
    label: 'Hyundai Genesis DH (2014)',
    year: 2014,
    brandId: 'hyundai', brandName: 'Hyundai',
    modelSlug: 'hyundai-genesis-dh', familyKey: 'hyu-genesis',
    type: 'generation', bodyType: 'sedan',
    segment: 'exec', zone: 'flagship_sed',
    hp: 365, engineType: 'v6t', codeName: 'DH',
  },
  // Hyundai Equus VI (2009) — ультра-люкс флагман, стал Genesis G90
  // V8 4.6 385hp / V8 5.0 429hp
  {
    id: 'hyu-equus',
    label: 'Hyundai Equus (2009)',
    year: 2009,
    brandId: 'hyundai', brandName: 'Hyundai',
    modelSlug: 'hyundai-equus', familyKey: 'hyu-equus',
    type: 'generation', bodyType: 'sedan',
    segment: 'ultra_luxury', zone: 'flagship_sed',
    hp: 429, engineType: 'v8', codeName: 'VI',
  },
]

// ─── 2. Рёбра ─────────────────────────────────────────────────────────────────

const newEdges = [
  // ── Прямое происхождение (ребрендинг) ───────────────────────────────────────

  // Hyundai Genesis BH → DH (эволюция поколений)
  {
    id: 'e-hyu-genesis-bh-dh',
    source: 'hyu-genesis-bh', target: 'hyu-genesis-dh',
    type: 'evolves_into', strength: 0.9,
  },
  // Hyundai Genesis DH → Genesis G80 Gen1
  // DH физически стал G80 при создании бренда Genesis в 2015/2017
  {
    id: 'e-hyu-dh-gen-g80-1',
    source: 'hyu-genesis-dh', target: 'gen-g80-1',
    type: 'evolves_into', strength: 0.95,
  },
  // Hyundai Equus → Genesis G90 Gen1
  // Equus был упразднён, G90 занял его место (новая платформа, то же позиционирование)
  {
    id: 'e-hyu-equus-gen-g90-1',
    source: 'hyu-equus', target: 'gen-g90-1',
    type: 'evolves_into', strength: 0.85,
  },
  // Hyundai Genesis BH вдохновил флагманскую линейку
  // (Sonata → Genesis → G80 → G90 — восходящая лестница)
  {
    id: 'e-hyu-son5-genesis-bh',
    source: 'hyu-sonata-5', target: 'hyu-genesis-bh',
    type: 'inspired_by', strength: 0.5,
  },

  // ── Платформы (H/N3/E-GMP) ───────────────────────────────────────────────────

  // Santa Fe DM (Gen3) ─ GV80 Gen1
  // Общая H-платформа, GV80 = премиальная версия Santa Fe-класса
  {
    id: 'e-hyu-santa-fe-3-gv80',
    source: 'hyu-santa-fe-3', target: 'gen-gv80-1',
    type: 'inspired_by', strength: 0.65,
  },
  // Tucson NX4 (Gen4) ─ GV70 Gen1
  // Общая platform architecture, GV70 = премиальный Tucson-класс
  {
    id: 'e-hyu-tuc4-gv70',
    source: 'hyu-tucson-4', target: 'gen-gv70-1',
    type: 'inspired_by', strength: 0.65,
  },
  // i30 N ─ Genesis G70 Gen1
  // N3 RWD платформа (N3: Hyundai/Kia/Genesis RWD architecture)
  // i30 N — FWD, G70 — RWD, но оба на N-performance DNA
  {
    id: 'e-hyu-i30n-g70',
    source: 'hyu-i30n', target: 'gen-g70-1',
    type: 'inspired_by', strength: 0.6,
  },

  // ── ДНК производительности: N → Magma ────────────────────────────────────────

  // Hyundai i30 N → Genesis GV60 Magma
  // N-division разработала принципы (лёгкость, отзывчивость, звук),
  // Magma масштабировала их на EVs с намного большей мощностью
  {
    id: 'e-hyu-i30n-gv60-magma',
    source: 'hyu-i30n', target: 'gen-gv60-magma',
    type: 'inspired_by', strength: 0.55,
  },
  // Hyundai IONIQ 5 N → Genesis GV60 Magma
  // IONIQ 5 N — прямой предшественник архитектуры EV-производительности Magma
  // (641hp GV60 Magma использует ту же E-GMP логику что 641hp IONIQ 5 N)
  {
    id: 'e-hyu-ioniq5n-gv60mg',
    source: 'hyu-ioniq5-n', target: 'gen-gv60-magma',
    type: 'inspired_by', strength: 0.8,
  },
  // Veloster N → Genesis G70 (горячий hatchback → спортивный седан, одна N ДНК)
  {
    id: 'e-hyu-veloster-n-g70',
    source: 'hyu-veloster-n', target: 'gen-g70-1',
    type: 'inspired_by', strength: 0.5,
  },
]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0

for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log(`  SKIP node: ${n.id}`); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) { g.edges.push(e); addedE++ }
  else { console.log(`  SKIP edge: ${e.id}`); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`\nHyundai ↔ Genesis links: +${addedN} nodes (${skipN} skipped), +${addedE} edges (${skipE} skipped)`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
