#!/usr/bin/env node
/**
 * Enrich graph.json with data sourced from a777aa77.ru
 *
 * Adds:
 *   • Alfa Romeo brand (Montreal, 4C, Giulia QV, Stelvio QV, GTAm, 33 Stradale)
 *   • McLaren Sport Series (570S, 675LT) + successors (750S, GTS, W1)
 *   • Lamborghini missing models (Siàn, Aventador SVJ, Huracán EVO, Temerario)
 *   • Bugatti specials (Centodieci, La Voiture Noire)
 *   • Fix: W16 Mistral ncs-node gets hp + zone correction
 *
 * Run: node scripts/enrich-from-a777.js
 */

'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g     = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const existingIds  = new Set(g.nodes.map(n => n.id))
const existingEdge = new Set(g.edges.map(e => `${e.source}|${e.target}|${e.type}`))

// ── helpers ─────────────────────────────────────────────────────────────────

function addNode(n) {
  if (existingIds.has(n.id)) {
    console.log(`  skip node (exists): ${n.id}`)
    return
  }
  g.nodes.push(n)
  existingIds.add(n.id)
  console.log(`  + node: [${n.brandId}] ${n.label} (${n.year}) ${n.hp}hp`)
}

function addEdge(e) {
  const key = `${e.source}|${e.target}|${e.type}`
  if (existingEdge.has(key)) {
    console.log(`  skip edge (exists): ${key}`)
    return
  }
  g.edges.push(e)
  existingEdge.add(key)
  console.log(`  + edge: ${e.source} --[${e.type}]--> ${e.target}`)
}

function patchNode(id, patch) {
  const node = g.nodes.find(n => n.id === id)
  if (!node) { console.log(`  WARN patch target not found: ${id}`); return }
  Object.assign(node, patch)
  console.log(`  ~ patch: ${id} →`, patch)
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ALFA ROMEO  (новый бренд)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Alfa Romeo ──')

const alfaNodes = [
  { id:'alfa-romeo-montreal',    label:'Montreal',             type:'generation', year:1970, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'105',       modelSlug:'alfa-romeo-montreal',              bodyType:'coupe',       segment:'grand_tourer', zone:'gt_coupe', hp:200, engineType:'v8'  },
  { id:'alfa-romeo-4c',          label:'4C',                   type:'generation', year:2013, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'960',       modelSlug:'alfa-romeo-4c',                    bodyType:'coupe',       segment:'sports',       zone:'sports',   hp:240, engineType:'i4t' },
  { id:'alfa-romeo-4c-spider',   label:'4C Spider',            type:'generation', year:2015, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'960S',      modelSlug:'alfa-romeo-4c',                    bodyType:'convertible', segment:'sports',       zone:'open_top', hp:240, engineType:'i4t' },
  { id:'alfa-romeo-giulia-qv',   label:'Giulia Quadrifoglio',  type:'generation', year:2016, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'952',       modelSlug:'alfa-romeo-giulia-quadrifoglio',   bodyType:'sedan',       segment:'exec_sports',  zone:'exec_sed', hp:510, engineType:'v6t' },
  { id:'alfa-romeo-stelvio-qv',  label:'Stelvio Quadrifoglio', type:'generation', year:2018, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'949',       modelSlug:'alfa-romeo-stelvio-quadrifoglio',  bodyType:'suv',         segment:'suv',          zone:'suv_mid',  hp:510, engineType:'v6t' },
  { id:'alfa-romeo-giulia-gtam', label:'Giulia GTAm',          type:'generation', year:2021, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'952 GTAm',  modelSlug:'alfa-romeo-giulia-gtam',           bodyType:'sedan',       segment:'supercar',     zone:'supercar', hp:540, engineType:'v6t' },
  { id:'alfa-romeo-33-stradale', label:'33 Stradale',          type:'generation', year:2023, brandId:'alfa-romeo', brandName:'Alfa Romeo', codeName:'33',        modelSlug:'alfa-romeo-33-stradale',           bodyType:'coupe',       segment:'supercar',     zone:'supercar', hp:620, engineType:'v6t' },
]
alfaNodes.forEach(addNode)

const alfaEdges = [
  { id:'ar-1', source:'alfa-romeo-4c',        target:'alfa-romeo-4c-spider',   type:'variant_of',    strength:0.92 },
  { id:'ar-2', source:'alfa-romeo-giulia-qv', target:'alfa-romeo-giulia-gtam', type:'variant_of',    strength:0.88 },
  { id:'ar-3', source:'alfa-romeo-giulia-qv', target:'alfa-romeo-stelvio-qv',  type:'shares_platform',strength:0.75 },
]
alfaEdges.forEach(addEdge)

// ═══════════════════════════════════════════════════════════════════════════
// 2. McLAREN — Sport Series + следующее поколение
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── McLaren ──')

const mclarenNodes = [
  { id:'mclaren-570s',  label:'570S',  type:'generation', year:2015, brandId:'mclaren', brandName:'McLaren', codeName:'570S',  modelSlug:'mclaren-570s',  bodyType:'coupe', segment:'supercar', zone:'supercar', hp:562, engineType:'v8t' },
  { id:'mclaren-675lt', label:'675LT', type:'generation', year:2015, brandId:'mclaren', brandName:'McLaren', codeName:'675LT',modelSlug:'mclaren-675lt', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:675, engineType:'v8t' },
  { id:'mclaren-750s',  label:'750S',  type:'generation', year:2023, brandId:'mclaren', brandName:'McLaren', codeName:'750S',  modelSlug:'mclaren-750s',  bodyType:'coupe', segment:'supercar', zone:'supercar', hp:750, engineType:'v8t' },
  { id:'mclaren-gts',   label:'GTS',   type:'generation', year:2024, brandId:'mclaren', brandName:'McLaren', codeName:'GTS',   modelSlug:'mclaren-gts',   bodyType:'coupe', segment:'supercar', zone:'supercar', hp:635, engineType:'v8t' },
  { id:'mclaren-w1',    label:'W1',    type:'generation', year:2025, brandId:'mclaren', brandName:'McLaren', codeName:'W1',    modelSlug:'mclaren-w1',    bodyType:'coupe', segment:'hypercar', zone:'hypercar', hp:1275,engineType:'v8h' },
]
mclarenNodes.forEach(addNode)

const mclarenEdges = [
  { id:'mc-a1', source:'mclaren-650s',    target:'mclaren-675lt',  type:'variant_of',   strength:0.85 },
  { id:'mc-a2', source:'mclaren-650s',    target:'mclaren-570s',   type:'variant_of',   strength:0.80 },
  { id:'mc-a3', source:'mclaren-720s',    target:'mclaren-750s',   type:'evolves_into', strength:0.92 },
  { id:'mc-a4', source:'mclaren-750s',    target:'mclaren-gts',    type:'variant_of',   strength:0.80 },
  { id:'mc-a5', source:'mclaren-speedtail',target:'mclaren-w1',    type:'evolves_into', strength:0.85 },
]
mclarenEdges.forEach(addEdge)

// ═══════════════════════════════════════════════════════════════════════════
// 3. LAMBORGHINI — недостающие варианты и преемники
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Lamborghini ──')

const lamboNodes = [
  { id:'lambo-aven-svj',    label:'Aventador SVJ',  type:'generation', year:2018, brandId:'lamborghini', brandName:'Lamborghini', codeName:'LP770-4',    modelSlug:'lamborghini-aventador-svj',       bodyType:'coupe', segment:'supercar', zone:'supercar', hp:770, engineType:'v12'  },
  { id:'lambo-sian',        label:'Siàn FKP 37',    type:'generation', year:2020, brandId:'lamborghini', brandName:'Lamborghini', codeName:'FKP 37',     modelSlug:'lamborghini-sian-fkp-37',         bodyType:'coupe', segment:'hypercar', zone:'hypercar', hp:819, engineType:'v12h' },
  { id:'lambo-huracan-evo', label:'Huracán EVO',    type:'generation', year:2019, brandId:'lamborghini', brandName:'Lamborghini', codeName:'EVO LP640-4',modelSlug:'lamborghini-huracan-lp-640-4-evo',bodyType:'coupe', segment:'supercar', zone:'supercar', hp:640, engineType:'v10'  },
  { id:'lambo-temerario',   label:'Temerario',      type:'generation', year:2025, brandId:'lamborghini', brandName:'Lamborghini', codeName:'LB764',      modelSlug:'lamborghini-temerario',           bodyType:'coupe', segment:'supercar', zone:'supercar', hp:920, engineType:'v8h'  },
]
lamboNodes.forEach(addNode)

const lamboEdges = [
  { id:'lb-a1', source:'lamborghini-aven',  target:'lambo-aven-svj',    type:'variant_of',   strength:0.90 },
  { id:'lb-a2', source:'lambo-aven-svj',    target:'lamborghini-revo',  type:'evolves_into', strength:0.90 },
  { id:'lb-a3', source:'lambo-huracan',     target:'lambo-huracan-evo', type:'facelifted_to',strength:0.92 },
  { id:'lb-a4', source:'lambo-huracan-evo', target:'lambo-temerario',   type:'evolves_into', strength:0.90 },
  { id:'lb-a5', source:'lamborghini-aven',  target:'lambo-sian',        type:'variant_of',   strength:0.80 },
]
lamboEdges.forEach(addEdge)

// ═══════════════════════════════════════════════════════════════════════════
// 4. BUGATTI — эксклюзивные выпуски
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Bugatti ──')

const bugattiNodes = [
  { id:'bugatti-lavnoire',    label:'La Voiture Noire', type:'generation', year:2019, brandId:'bugatti', brandName:'Bugatti', codeName:'LVN',         modelSlug:'bugatti-la-voiture-noire', bodyType:'coupe', segment:'hypercar', zone:'hypercar', hp:1479, engineType:'w16' },
  { id:'bugatti-centodieci',  label:'Centodieci',       type:'generation', year:2020, brandId:'bugatti', brandName:'Bugatti', codeName:'EB110 tribute',modelSlug:'bugatti-centodieci',       bodyType:'coupe', segment:'hypercar', zone:'hypercar', hp:1600, engineType:'w16' },
]
bugattiNodes.forEach(addNode)

const bugattiEdges = [
  { id:'bu-a1', source:'bugatti-chiron',   target:'bugatti-lavnoire',   type:'variant_of',   strength:0.85 },
  { id:'bu-a2', source:'bugatti-chiron',   target:'bugatti-centodieci', type:'variant_of',   strength:0.80 },
  { id:'bu-a3', source:'bugatti-eb110',    target:'bugatti-centodieci', type:'influenced_by', strength:0.90 },
]
bugattiEdges.forEach(addEdge)

// Fix: W16 Mistral ncs-node — добавляем hp и правим zone
const MISTRAL_ID = 'ncs-bugatti-2026-bugatti-w16-mistral-le-retour-du-jeune-prin'
patchNode(MISTRAL_ID, { hp: 1600, zone: 'hypercar', segment: 'hypercar', year: 2024 })
// Привязываем Mistral к Chiron как variant_of
addEdge({ id:'bu-a4', source:'bugatti-chiron', target: MISTRAL_ID, type:'variant_of', strength:0.85 })

// ═══════════════════════════════════════════════════════════════════════════
// 5. FERRARI — добавляем SF90 Stradale отдельным узлом если отсутствует
// (296 GTB уже есть, SF90 — старший)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Ferrari (patches) ──')

const ferrariNodes = [
  { id:'ferrari-sf90',    label:'SF90 Stradale',  type:'generation', year:2020, brandId:'ferrari', brandName:'Ferrari', codeName:'F173',   modelSlug:'ferrari-sf90-stradale',  bodyType:'coupe', segment:'hypercar', zone:'hypercar', hp:986, engineType:'v8h' },
  { id:'ferrari-f8',      label:'F8 Tributo',     type:'generation', year:2019, brandId:'ferrari', brandName:'Ferrari', codeName:'F142ML', modelSlug:'ferrari-f8-tributo',     bodyType:'coupe', segment:'supercar', zone:'supercar', hp:710, engineType:'v8t' },
  { id:'ferrari-12cilindri',label:'12Cilindri',   type:'generation', year:2024, brandId:'ferrari', brandName:'Ferrari', codeName:'F167',   modelSlug:'ferrari-12cilindri',     bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe', hp:830, engineType:'v12' },
]
ferrariNodes.forEach(addNode)

const ferrariEdges = [
  { id:'fe-a1', source:'ferrari-488',   target:'ferrari-f8',       type:'evolves_into', strength:0.92 },
  { id:'fe-a2', source:'ferrari-f8',    target:'ferrari-sf90',     type:'influenced_by',strength:0.75 },
  { id:'fe-a3', source:'ferrari-812sf', target:'ferrari-12cilindri',type:'evolves_into',strength:0.90 },
]
ferrariEdges.forEach(addEdge)

// ═══════════════════════════════════════════════════════════════════════════
// WRITE
// ═══════════════════════════════════════════════════════════════════════════
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')

const addedN = g.nodes.length
const addedE = g.edges.length
console.log(`\n✓ graph.json обновлён: ${addedN} узлов, ${addedE} рёбер`)
console.log(`  Бренды: ${new Set(g.nodes.map(n => n.brandId)).size}`)
