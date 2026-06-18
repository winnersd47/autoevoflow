#!/usr/bin/env node
/**
 * Enrich graph.json with missing Ferrari variants & special models.
 *
 * Source: a777aa77.ru/cars/ferrari/ — полный список сверен с текущим графом.
 * Добавляет ~28 моделей:
 *   360 Spider / Challenge Stradale
 *   F430 Scuderia
 *   599 GTO
 *   458 Spider / Speciale / Speciale A
 *   LaFerrari Aperta
 *   488 Spider / Pista / Pista Spider
 *   GTC4Lusso T
 *   Monza SP1 / SP2
 *   F8 Spider
 *   812 GTS / Competizione / Competizione A
 *   SF90 Spider / XX Stradale / XX Spider
 *   296 GTS / Speciale / Speciale A
 *   Daytona SP3
 *   12Cilindri Spider
 *   Amalfi (наследник Roma)
 *
 * Патчи:
 *   ferrari-california-node → label:'California' (не T), добавляет ребро к California T
 *
 * Run: node scripts/enrich-ferrari-variants.js
 */

'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g     = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const existingIds  = new Set(g.nodes.map(n => n.id))
const existingEdge = new Set(g.edges.map(e => `${e.source}|${e.target}|${e.type}`))

function addNode(n) {
  if (existingIds.has(n.id)) { console.log(`  skip node: ${n.id}`); return }
  g.nodes.push(n)
  existingIds.add(n.id)
  console.log(`  + [${n.year}] ${n.label}  ${n.hp}hp`)
}
function addEdge(e) {
  const key = `${e.source}|${e.target}|${e.type}`
  if (existingEdge.has(key)) { console.log(`  skip edge: ${key}`); return }
  g.edges.push(e)
  existingEdge.add(key)
  console.log(`  + edge: ${e.source} --[${e.type}]--> ${e.target}`)
}
function patchNode(id, patch) {
  const node = g.nodes.find(n => n.id === id)
  if (!node) { console.log(`  WARN: patch target not found: ${id}`); return }
  Object.assign(node, patch)
  console.log(`  ~ patch ${id}:`, patch)
}

const B = 'ferrari', BN = 'Ferrari'

// ═══════════════════════════════════════════════════════════════════════════
// 360 Modena family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 360 Modena variants ──')
addNode({ id:'ferrari-360-spider', label:'360 Spider',             year:2000, brandId:B, brandName:BN, type:'generation', codeName:'F131B',    modelSlug:'ferrari-360-spider',            bodyType:'convertible', segment:'sports',       zone:'open_top', hp:400, engineType:'v8'  })
addNode({ id:'ferrari-360-cs',     label:'360 Challenge Stradale', year:2003, brandId:B, brandName:BN, type:'generation', codeName:'F131 CS',  modelSlug:'ferrari-360-challenge-stradale', bodyType:'coupe',       segment:'supercar',    zone:'supercar', hp:425, engineType:'v8'  })
addEdge({ id:'fe-360-1', source:'ferrari-360', target:'ferrari-360-spider', type:'variant_of', strength:0.92 })
addEdge({ id:'fe-360-2', source:'ferrari-360', target:'ferrari-360-cs',     type:'variant_of', strength:0.85 })

// ═══════════════════════════════════════════════════════════════════════════
// F430 family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── F430 variants ──')
addNode({ id:'ferrari-f430-scuderia', label:'F430 Scuderia', year:2007, brandId:B, brandName:BN, type:'generation', codeName:'F131 Scuderia', modelSlug:'ferrari-f430-scuderia', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:510, engineType:'v8' })
addEdge({ id:'fe-f430-1', source:'ferrari-f430', target:'ferrari-f430-scuderia', type:'variant_of', strength:0.88 })

// ═══════════════════════════════════════════════════════════════════════════
// 599 GTB Fiorano family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 599 variants ──')
addNode({ id:'ferrari-599-gto', label:'599 GTO', year:2010, brandId:B, brandName:BN, type:'generation', codeName:'F141 GTO', modelSlug:'ferrari-599-gto', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:670, engineType:'v12' })
addEdge({ id:'fe-599-1', source:'ferrari-599', target:'ferrari-599-gto', type:'variant_of', strength:0.85 })

// ═══════════════════════════════════════════════════════════════════════════
// 458 Italia family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 458 variants ──')
addNode({ id:'ferrari-458-spider',     label:'458 Spider',     year:2011, brandId:B, brandName:BN, type:'generation', codeName:'F142 Spider',  modelSlug:'ferrari-458-spider',     bodyType:'convertible', segment:'sports',   zone:'open_top', hp:570, engineType:'v8' })
addNode({ id:'ferrari-458-speciale',   label:'458 Speciale',   year:2013, brandId:B, brandName:BN, type:'generation', codeName:'F142 Spec',    modelSlug:'ferrari-458-speciale',   bodyType:'coupe',       segment:'supercar', zone:'supercar', hp:605, engineType:'v8' })
addNode({ id:'ferrari-458-speciale-a', label:'458 Speciale A', year:2014, brandId:B, brandName:BN, type:'generation', codeName:'F142 Spec A',  modelSlug:'ferrari-458-speciale-a', bodyType:'convertible', segment:'supercar', zone:'open_top', hp:605, engineType:'v8' })
addEdge({ id:'fe-458-1', source:'ferrari-458', target:'ferrari-458-spider',     type:'variant_of', strength:0.92 })
addEdge({ id:'fe-458-2', source:'ferrari-458', target:'ferrari-458-speciale',   type:'variant_of', strength:0.88 })
addEdge({ id:'fe-458-3', source:'ferrari-458', target:'ferrari-458-speciale-a', type:'variant_of', strength:0.88 })

// ═══════════════════════════════════════════════════════════════════════════
// LaFerrari family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── LaFerrari Aperta ──')
addNode({ id:'ferrari-lafer-aperta', label:'LaFerrari Aperta', year:2016, brandId:B, brandName:BN, type:'generation', codeName:'F150 Aperta', modelSlug:'ferrari-laferrari-aperta', bodyType:'convertible', segment:'hypercar', zone:'hypercar', hp:963, engineType:'v12h' })
addEdge({ id:'fe-laf-1', source:'ferrari-lafer', target:'ferrari-lafer-aperta', type:'variant_of', strength:0.92 })

// ═══════════════════════════════════════════════════════════════════════════
// 488 GTB family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 488 variants ──')
addNode({ id:'ferrari-488-spider',       label:'488 Spider',       year:2016, brandId:B, brandName:BN, type:'generation', codeName:'F142M Spider',  modelSlug:'ferrari-488-spider',       bodyType:'convertible', segment:'supercar', zone:'open_top', hp:660, engineType:'v8t' })
addNode({ id:'ferrari-488-pista',        label:'488 Pista',        year:2018, brandId:B, brandName:BN, type:'generation', codeName:'F142MK',        modelSlug:'ferrari-488-pista',        bodyType:'coupe',       segment:'supercar', zone:'supercar', hp:720, engineType:'v8t' })
addNode({ id:'ferrari-488-pista-spider', label:'488 Pista Spider', year:2019, brandId:B, brandName:BN, type:'generation', codeName:'F142MK Spider', modelSlug:'ferrari-488-pista-spider', bodyType:'convertible', segment:'supercar', zone:'open_top', hp:720, engineType:'v8t' })
addEdge({ id:'fe-488-1', source:'ferrari-488', target:'ferrari-488-spider',       type:'variant_of', strength:0.92 })
addEdge({ id:'fe-488-2', source:'ferrari-488', target:'ferrari-488-pista',        type:'variant_of', strength:0.88 })
addEdge({ id:'fe-488-3', source:'ferrari-488', target:'ferrari-488-pista-spider', type:'variant_of', strength:0.88 })

// ═══════════════════════════════════════════════════════════════════════════
// GTC4Lusso T (V8T версия GTC4Lusso)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── GTC4Lusso T ──')
addNode({ id:'ferrari-gtc4l-t', label:'GTC4Lusso T', year:2017, brandId:B, brandName:BN, type:'generation', codeName:'F160 T', modelSlug:'ferrari-gtc4lusso-t', bodyType:'fastback', segment:'grand_tourer', zone:'gt_coupe', hp:610, engineType:'v8t' })
addEdge({ id:'fe-gtc-1', source:'ferrari-gtc4l-node', target:'ferrari-gtc4l-t', type:'variant_of', strength:0.82 })

// ═══════════════════════════════════════════════════════════════════════════
// Monza SP1 / SP2 — Icona series (812sf V12, 499+499 units)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Monza SP1 / SP2 ──')
addNode({ id:'ferrari-monza-sp1', label:'Monza SP1', year:2019, brandId:B, brandName:BN, type:'generation', codeName:'SP1', modelSlug:'ferrari-monza-sp1', bodyType:'convertible', segment:'hypercar', zone:'hypercar', hp:810, engineType:'v12' })
addNode({ id:'ferrari-monza-sp2', label:'Monza SP2', year:2019, brandId:B, brandName:BN, type:'generation', codeName:'SP2', modelSlug:'ferrari-monza-sp2', bodyType:'convertible', segment:'hypercar', zone:'hypercar', hp:810, engineType:'v12' })
addEdge({ id:'fe-msp-1', source:'ferrari-812sf',     target:'ferrari-monza-sp1', type:'shares_platform', strength:0.80 })
addEdge({ id:'fe-msp-2', source:'ferrari-monza-sp1', target:'ferrari-monza-sp2', type:'variant_of',      strength:0.92 })

// ═══════════════════════════════════════════════════════════════════════════
// F8 Tributo family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── F8 Spider ──')
addNode({ id:'ferrari-f8-spider', label:'F8 Spider', year:2020, brandId:B, brandName:BN, type:'generation', codeName:'F142ML Spider', modelSlug:'ferrari-f8-spider', bodyType:'convertible', segment:'supercar', zone:'open_top', hp:720, engineType:'v8t' })
addEdge({ id:'fe-f8-1', source:'ferrari-f8', target:'ferrari-f8-spider', type:'variant_of', strength:0.92 })

// ═══════════════════════════════════════════════════════════════════════════
// 812 Superfast family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 812 variants ──')
addNode({ id:'ferrari-812-gts',    label:'812 GTS',            year:2020, brandId:B, brandName:BN, type:'generation', codeName:'F152M GTS',   modelSlug:'ferrari-812-gts',            bodyType:'convertible', segment:'supercar', zone:'open_top', hp:800, engineType:'v12' })
addNode({ id:'ferrari-812-comp',   label:'812 Competizione',   year:2021, brandId:B, brandName:BN, type:'generation', codeName:'F152M Comp',  modelSlug:'ferrari-812-competizione',   bodyType:'coupe',       segment:'supercar', zone:'supercar', hp:830, engineType:'v12' })
addNode({ id:'ferrari-812-comp-a', label:'812 Competizione A', year:2022, brandId:B, brandName:BN, type:'generation', codeName:'F152M Comp A',modelSlug:'ferrari-812-competizione-a', bodyType:'convertible', segment:'supercar', zone:'open_top', hp:830, engineType:'v12' })
addEdge({ id:'fe-812-1', source:'ferrari-812sf',   target:'ferrari-812-gts',    type:'variant_of', strength:0.92 })
addEdge({ id:'fe-812-2', source:'ferrari-812sf',   target:'ferrari-812-comp',   type:'variant_of', strength:0.88 })
addEdge({ id:'fe-812-3', source:'ferrari-812-comp',target:'ferrari-812-comp-a', type:'variant_of', strength:0.92 })

// ═══════════════════════════════════════════════════════════════════════════
// SF90 Stradale family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── SF90 variants ──')
addNode({ id:'ferrari-sf90-spider',    label:'SF90 Spider',     year:2021, brandId:B, brandName:BN, type:'generation', codeName:'F173 Spider', modelSlug:'ferrari-sf90-spider',    bodyType:'convertible', segment:'hypercar', zone:'hypercar', hp:1000, engineType:'v8h' })
addNode({ id:'ferrari-sf90-xx',        label:'SF90 XX Stradale',year:2023, brandId:B, brandName:BN, type:'generation', codeName:'F173 XX',     modelSlug:'ferrari-sf90-xx',        bodyType:'coupe',       segment:'hypercar', zone:'hypercar', hp:1016, engineType:'v8h' })
addNode({ id:'ferrari-sf90-xx-spider', label:'SF90 XX Spider',  year:2023, brandId:B, brandName:BN, type:'generation', codeName:'F173 XX A',   modelSlug:'ferrari-sf90-xx-spider', bodyType:'convertible', segment:'hypercar', zone:'hypercar', hp:1016, engineType:'v8h' })
addEdge({ id:'fe-sf90-1', source:'ferrari-sf90',        target:'ferrari-sf90-spider',    type:'variant_of', strength:0.92 })
addEdge({ id:'fe-sf90-2', source:'ferrari-sf90',        target:'ferrari-sf90-xx',        type:'variant_of', strength:0.85 })
addEdge({ id:'fe-sf90-3', source:'ferrari-sf90-spider', target:'ferrari-sf90-xx-spider', type:'variant_of', strength:0.88 })

// ═══════════════════════════════════════════════════════════════════════════
// 296 GTB family
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 296 variants ──')
addNode({ id:'ferrari-296-gts',      label:'296 GTS',        year:2022, brandId:B, brandName:BN, type:'generation', codeName:'F171 GTS',   modelSlug:'ferrari-296-gts',        bodyType:'convertible', segment:'supercar', zone:'open_top', hp:654, engineType:'v6h' })
addNode({ id:'ferrari-296-speciale', label:'296 Speciale',   year:2025, brandId:B, brandName:BN, type:'generation', codeName:'F171 Spec',  modelSlug:'ferrari-296-speciale',   bodyType:'coupe',       segment:'supercar', zone:'supercar', hp:880, engineType:'v6h' })
addNode({ id:'ferrari-296-spec-a',   label:'296 Speciale A', year:2025, brandId:B, brandName:BN, type:'generation', codeName:'F171 Spec A',modelSlug:'ferrari-296-speciale-a', bodyType:'convertible', segment:'supercar', zone:'open_top', hp:880, engineType:'v6h' })
addEdge({ id:'fe-296-1', source:'ferrari-296',          target:'ferrari-296-gts',      type:'variant_of', strength:0.92 })
addEdge({ id:'fe-296-2', source:'ferrari-296',          target:'ferrari-296-speciale', type:'variant_of', strength:0.85 })
addEdge({ id:'fe-296-3', source:'ferrari-296-speciale', target:'ferrari-296-spec-a',   type:'variant_of', strength:0.92 })

// ═══════════════════════════════════════════════════════════════════════════
// Daytona SP3 — Icona series (V12 tribute to 330 P4 / 1967 Daytona prototype)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Daytona SP3 ──')
addNode({ id:'ferrari-daytona-sp3', label:'Daytona SP3', year:2022, brandId:B, brandName:BN, type:'generation', codeName:'SP3', modelSlug:'ferrari-daytona-sp3', bodyType:'coupe', segment:'hypercar', zone:'hypercar', hp:840, engineType:'v12' })
// NOTE: influenced_by от 365 GTB/4 → SP3 УДАЛЕНО — оба названы в честь гонки 1967 независимо,
//       SP3 не является производным от дорожного 365 GTB/4. Единственная реальная связь — платформа 812.
addEdge({ id:'fe-dsp3-2', source:'ferrari-812sf', target:'ferrari-daytona-sp3', type:'shares_platform', strength:0.75 })

// ═══════════════════════════════════════════════════════════════════════════
// 12Cilindri Spider
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 12Cilindri Spider ──')
addNode({ id:'ferrari-12cil-spider', label:'12Cilindri Spider', year:2024, brandId:B, brandName:BN, type:'generation', codeName:'F167 Spider', modelSlug:'ferrari-12cilindri-spider', bodyType:'convertible', segment:'grand_tourer', zone:'open_top', hp:830, engineType:'v12' })
addEdge({ id:'fe-12cil-1', source:'ferrari-12cil', target:'ferrari-12cil-spider', type:'variant_of', strength:0.92 })

// ═══════════════════════════════════════════════════════════════════════════
// Ferrari Amalfi (2025) — наследник Roma
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Amalfi ──')
addNode({ id:'ferrari-amalfi', label:'Amalfi', year:2025, brandId:B, brandName:BN, type:'generation', codeName:'F169M', modelSlug:'ferrari-amalfi', bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe', hp:640, engineType:'v8t' })
addEdge({ id:'fe-amalfi-1', source:'ferrari-roma-node', target:'ferrari-amalfi', type:'evolves_into', strength:0.88 })

// ═══════════════════════════════════════════════════════════════════════════
// Патч: Ferrari California 2008 — исправляем label (не T) + линк к California T
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Fix: California label + edge ──')
patchNode('ferrari-california-node', { label:'California', codeName:'F149', hp:460, engineType:'v8' })
addEdge({ id:'fe-cal-1', source:'ferrari-california-node', target:'ferrari-california-t', type:'evolves_into', strength:0.88 })

// ═══════════════════════════════════════════════════════════════════════════
// WRITE
// ═══════════════════════════════════════════════════════════════════════════
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n✓ graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
