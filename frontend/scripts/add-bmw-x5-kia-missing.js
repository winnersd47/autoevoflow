/**
 * Добавляет:
 * - BMW X5 цепочку E53→E70→F15→G05→G65 (2027)
 * - BMW iX5 (электрический вариант G05)
 * - Kia Niro I/II (гибрид/EV хэтчбек)
 * - Kia XCeed (купе-кроссовер на базе Ceed)
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

const newNodes = [
  // ─── BMW X5 ────────────────────────────────────────────────────────────────
  {
    id: 'bmw-x5-e53', label: 'BMW X5 E53 (1999)', year: 1999,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-x5-e53', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
    hp: 286, engineType: 'v8', codeName: 'E53',
  },
  {
    id: 'bmw-x5-e70', label: 'BMW X5 E70 (2006)', year: 2006,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-x5-e70', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
    hp: 306, engineType: 'v8', codeName: 'E70',
  },
  {
    id: 'bmw-x5-f15', label: 'BMW X5 F15 (2013)', year: 2013,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-x5-f15', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
    hp: 313, engineType: 'i6t', codeName: 'F15',
  },
  {
    id: 'bmw-x5-g05', label: 'BMW X5 G05 (2018)', year: 2018,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-x5-g05', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
    hp: 340, engineType: 'i6t', codeName: 'G05',
  },
  {
    id: 'bmw-x5-g65', label: 'BMW X5 G65 (2027)', year: 2027,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-x5-g65', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
    hp: 393, engineType: 'i6t', codeName: 'G65',
  },
  // BMW iX5 (электрический X5)
  {
    id: 'bmw-ix5-g05e', label: 'BMW iX5 (2025)', year: 2025,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-ix5', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
    hp: 489, engineType: 'ev', codeName: 'G05E',
  },
  // BMW X5 M (высокопроизводительный вариант G05)
  {
    id: 'bmw-x5m-f95', label: 'BMW X5 M F95 (2020)', year: 2020,
    brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-x5m-f95', familyKey: 'bmw-x5',
    type: 'generation', bodyType: 'suv', segment: 'exec_sports', zone: 'suv_large',
    hp: 600, engineType: 'v8t', codeName: 'F95',
  },

  // ─── Kia Niro ──────────────────────────────────────────────────────────────
  {
    id: 'kia-niro-1', label: 'Kia Niro I (2016)', year: 2016,
    brandId: 'kia', brandName: 'Kia', modelSlug: 'kia-niro', familyKey: 'kia-niro',
    type: 'generation', bodyType: 'suv', segment: 'compact', zone: 'suv_compact',
    hp: 141, engineType: 'hybrid',
  },
  {
    id: 'kia-niro-2', label: 'Kia Niro II (2022)', year: 2022,
    brandId: 'kia', brandName: 'Kia', modelSlug: 'kia-niro-2', familyKey: 'kia-niro',
    type: 'generation', bodyType: 'suv', segment: 'compact', zone: 'suv_compact',
    hp: 204, engineType: 'ev',
  },

  // ─── Kia XCeed ─────────────────────────────────────────────────────────────
  {
    id: 'kia-xceed-1', label: 'Kia XCeed (2019)', year: 2019,
    brandId: 'kia', brandName: 'Kia', modelSlug: 'kia-xceed', familyKey: 'kia-xceed',
    type: 'generation', bodyType: 'suv', segment: 'compact', zone: 'suv_compact',
    hp: 160, engineType: 'i4t',
  },
  {
    id: 'kia-xceed-fl', label: 'Kia XCeed FL (2023)', year: 2023,
    brandId: 'kia', brandName: 'Kia', modelSlug: 'kia-xceed-fl', familyKey: 'kia-xceed',
    type: 'generation', bodyType: 'suv', segment: 'compact', zone: 'suv_compact',
    hp: 160, engineType: 'i4t',
  },
]

const newEdges = [
  // BMW X5 цепочка
  { id: 'e-x5-e53-e70', source: 'bmw-x5-e53', target: 'bmw-x5-e70', type: 'evolves_into', strength: 0.9 },
  { id: 'e-x5-e70-f15', source: 'bmw-x5-e70', target: 'bmw-x5-f15', type: 'evolves_into', strength: 0.9 },
  { id: 'e-x5-f15-g05', source: 'bmw-x5-f15', target: 'bmw-x5-g05', type: 'evolves_into', strength: 0.9 },
  { id: 'e-x5-g05-g65', source: 'bmw-x5-g05', target: 'bmw-x5-g65', type: 'evolves_into', strength: 0.9 },
  // iX5 — электрический вариант G05
  { id: 'e-x5-g05-ix5', source: 'bmw-x5-g05', target: 'bmw-ix5-g05e', type: 'variant_of', strength: 0.85 },
  // X5 M — спортвариант G05
  { id: 'e-x5-g05-xm',  source: 'bmw-x5-g05', target: 'bmw-x5m-f95', type: 'variant_of', strength: 0.9 },

  // Kia Niro цепочка
  { id: 'e-kia-niro-1-2', source: 'kia-niro-1', target: 'kia-niro-2', type: 'evolves_into', strength: 0.9 },

  // Kia XCeed — рестайлинг
  { id: 'e-kia-xceed-fl', source: 'kia-xceed-1', target: 'kia-xceed-fl', type: 'facelifted_to', strength: 0.85 },
]

// Добавляем только sync в SUCCESSORS — BMW X5 ключ в sync-latest
// (В sync-latest.js добавим ключи через отдельный патч)

let addedN = 0, addedE = 0, skipN = 0, skipE = 0

for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) { g.edges.push(e); addedE++ }
  else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('BMW X5 + Kia Niro/XCeed: +' + addedN + ' nodes (' + skipN + ' skipped), +' + addedE + ' edges (' + skipE + ' skipped)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
