/**
 * Полное дополнение Genesis + суббренд Genesis Magma
 *
 * Добавляет:
 * - G90 Gen1 (2015), G80 Gen1 (2017) — недостающие ранние поколения
 * - GV60 (2022) — отдельная EV-модель на E-GMP
 * - GV80 Coupe (2024) — вариант GV80 с фастбэк-кузовом
 * - GV90 (2026) — флагманский EV SUV
 * - G80 Magma (2025) — 525hp V6T, Ближний Восток
 * - GV60 Magma (2026) — 641hp ev, первый серийный Magma
 * - GMR-001 Hypercar (2026) — LMDh раёр FIA WEC / IMSA
 * - X Gran Berlinetta VGT (2023) — 1071hp Vision Gran Turismo concept
 * - Magma GT Concept (2024) — ~800hp суперкар-концепт
 *
 * Источники:
 * - genesis.com/worldwide/en/magma
 * - carbuzz.com/genesis-g80-magma-specs-525-hp
 * - autoevolution.com genesis GV60 Magma specs
 * - wikipedia.org/wiki/Genesis_GMR-001
 * - carscoops.com X Gran Berlinetta 1017HP
 * - motor1.com GV80 Coupe debut 409hp
 * - gearpatrol.com GV90 2026
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

const newNodes = [
  // ─── Ранние поколения (недостающие) ───────────────────────────────────────

  // G90 Gen1 (EQ900) — 2015, первый флагман Genesis
  {
    id: 'gen-g90-1',
    label: 'G90 (EQ900) Gen1 (2015)',
    year: 2015,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-g90', familyKey: 'gen-g90',
    type: 'generation', bodyType: 'sedan',
    segment: 'ultra_luxury', zone: 'flagship_sed',
    hp: 365, engineType: 'v6t', codeName: 'HI',
  },
  // G90 Gen1 V8 — вариант флагмана с 5.0 V8
  {
    id: 'gen-g90-1-v8',
    label: 'G90 5.0 V8 (2016)',
    year: 2016,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-g90-v8', familyKey: 'gen-g90',
    type: 'generation', bodyType: 'sedan',
    segment: 'ultra_luxury', zone: 'flagship_sed',
    hp: 420, engineType: 'v8', codeName: 'HI V8',
  },

  // G80 Gen1 (2017) — первое поколение после ребрендинга из Hyundai Genesis
  {
    id: 'gen-g80-1',
    label: 'G80 Gen1 (2017)',
    year: 2016,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-g80', familyKey: 'gen-g80',
    type: 'generation', bodyType: 'sedan',
    segment: 'exec', zone: 'flagship_sed',
    hp: 365, engineType: 'v6t', codeName: 'DH',
  },

  // ─── GV60 — отдельный EV на E-GMP ─────────────────────────────────────────
  // Платформа общая с Hyundai IONIQ 5 и Kia EV6
  {
    id: 'gen-gv60-1',
    label: 'GV60 Performance (2022)',
    year: 2021,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-gv60', familyKey: 'gen-gv60',
    type: 'generation', bodyType: 'suv',
    segment: 'exec', zone: 'suv_compact',
    hp: 429, engineType: 'ev',
    codeName: 'JW', a777Accel: 4.0,
  },

  // ─── GV80 Coupe (2024) — фастбэк-вариант GV80 ─────────────────────────────
  {
    id: 'gen-gv80-coupe',
    label: 'GV80 Coupe (2024)',
    year: 2024,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-gv80-coupe', familyKey: 'gen-gv80',
    type: 'generation', bodyType: 'suv',
    segment: 'exec', zone: 'suv_large',
    hp: 409, engineType: 'v6t',
    codeName: 'JX1 Coupe',
  },

  // ─── GV90 (2026) — флагманский EV SUV ─────────────────────────────────────
  {
    id: 'gen-gv90-1',
    label: 'GV90 (2026)',
    year: 2026,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-gv90', familyKey: 'gen-gv90',
    type: 'generation', bodyType: 'suv',
    segment: 'ultra_luxury', zone: 'suv_large',
    hp: 500, engineType: 'ev',
    codeName: 'IMA platform',
  },

  // ─── GENESIS MAGMA — суббренд (аналог AMG/M) ──────────────────────────────

  // G80 Magma (2025) — 525hp V6T, ограниченный выпуск (только 20 авто),
  // эксклюзивно Ближний Восток
  {
    id: 'gen-g80-magma',
    label: 'G80 Magma (2025)',
    year: 2025,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-g80-magma', familyKey: 'gen-g80',
    type: 'generation', bodyType: 'sedan',
    segment: 'exec_sports', zone: 'flagship_sed',
    hp: 525, engineType: 'v6t',
    codeName: 'RG3 Magma',
    a777Accel: 3.9,
  },

  // GV60 Magma (2026) — первый серийный Magma
  // 601hp нормальный режим / 641hp Boost Mode (10 сек)
  {
    id: 'gen-gv60-magma',
    label: 'GV60 Magma (2026)',
    year: 2026,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-gv60-magma', familyKey: 'gen-gv60',
    type: 'generation', bodyType: 'suv',
    segment: 'exec_sports', zone: 'suv_compact',
    hp: 641, engineType: 'ev',
    codeName: 'JW Magma',
    a777Accel: 3.4, a777TopSpeed: 264,
  },

  // GMR-001 Hypercar (2026) — LMDh раёр, V8tt hybrid ~670hp
  // Конкурирует в FIA WEC Hypercar + IMSA GTP с 2026/2027
  {
    id: 'gen-gmr001',
    label: 'GMR-001 Hypercar (2026)',
    year: 2026,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-gmr-001', familyKey: 'gen-magma-racing',
    type: 'generation', bodyType: 'coupe',
    segment: 'hypercar', zone: 'hypercar',
    hp: 670, engineType: 'v8h',
    codeName: 'GMR-001 LMDh',
    a777TopSpeed: 340,
  },

  // X Gran Berlinetta Vision Gran Turismo (2023) — концепт/VGT
  // V6 870hp + YASA E-motor 201hp = 1071hp combined
  {
    id: 'gen-x-gran-berlinetta',
    label: 'X Gran Berlinetta VGT (2023)',
    year: 2023,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-x-gran-berlinetta', familyKey: 'gen-magma-concepts',
    type: 'generation', bodyType: 'coupe',
    segment: 'hypercar', zone: 'hypercar',
    hp: 1071, engineType: 'v6h',
    codeName: 'Lambda III VGT',
    a777TopSpeed: 320, a777Accel: 2.1,
  },

  // Magma GT Concept (2024) — дорожный суперкар-концепт Magma, ~800hp
  {
    id: 'gen-magma-gt',
    label: 'Magma GT Concept (2024)',
    year: 2024,
    brandId: 'genesis', brandName: 'Genesis',
    modelSlug: 'genesis-magma-gt', familyKey: 'gen-magma-concepts',
    type: 'generation', bodyType: 'coupe',
    segment: 'supercar', zone: 'supercar',
    hp: 800, engineType: 'hybrid',
    codeName: 'Magma GT',
  },
]

const newEdges = [
  // ─── G-серия история ────────────────────────────────────────────────────────
  // G90 Gen1 → G90 Gen2
  { id:'e-gen-g90-1-3', source:'gen-g90-1', target:'gen-g90-3', type:'evolves_into', strength:0.85 },
  // G90 V8 — вариант Gen1
  { id:'e-gen-g90-1-v8', source:'gen-g90-1', target:'gen-g90-1-v8', type:'variant_of', strength:0.85 },
  // G80 Gen1 → Gen2
  { id:'e-gen-g80-1-2', source:'gen-g80-1', target:'gen-g80-2', type:'evolves_into', strength:0.9 },
  // G80 Gen2 → Magma (вариант)
  { id:'e-gen-g80-2-magma', source:'gen-g80-2', target:'gen-g80-magma', type:'variant_of', strength:0.95 },

  // ─── GV-серия ───────────────────────────────────────────────────────────────
  // GV80 → GV80 Coupe (фастбэк-вариант)
  { id:'e-gen-gv80-coupe', source:'gen-gv80-1', target:'gen-gv80-coupe', type:'variant_of', strength:0.9 },
  // GV60 → GV60 Magma
  { id:'e-gen-gv60-magma', source:'gen-gv60-1', target:'gen-gv60-magma', type:'variant_of', strength:0.95 },
  // GV70 → GV90 (флагманская линейка, вдохновение)
  { id:'e-gen-gv80-gv90', source:'gen-gv80-1', target:'gen-gv90-1', type:'inspired_by', strength:0.6 },
  // IONIQ 5 E-GMP → GV60 (общая платформа)
  { id:'e-hyu-ioniq5-gv60', source:'hyu-ioniq5', target:'gen-gv60-1', type:'inspired_by', strength:0.7 },

  // ─── Magma DNA ────────────────────────────────────────────────────────────
  // X Gran Berlinetta → GMR-001 (гоночная ДНК концепта → реальный LMDh)
  { id:'e-gen-xgb-gmr001', source:'gen-x-gran-berlinetta', target:'gen-gmr001', type:'inspired_by', strength:0.7 },
  // X Gran Berlinetta → Magma GT (концепт вдохновил дорожный суперкар)
  { id:'e-gen-xgb-mgt', source:'gen-x-gran-berlinetta', target:'gen-magma-gt', type:'inspired_by', strength:0.65 },
  // GV60 Magma → Magma GT (эскалация Magma ДНК от SUV к суперкару)
  { id:'e-gen-gv60mg-mgt', source:'gen-gv60-magma', target:'gen-magma-gt', type:'inspired_by', strength:0.55 },
  // G80 Gen1 ← G90 Gen1 вдохновил (общая платформа)
  { id:'e-gen-g90-1-g80-1', source:'gen-g90-1', target:'gen-g80-1', type:'inspired_by', strength:0.55 },
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
console.log(`Genesis + Magma: +${addedN} nodes (${skipN} skipped), +${addedE} edges (${skipE} skipped)`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
