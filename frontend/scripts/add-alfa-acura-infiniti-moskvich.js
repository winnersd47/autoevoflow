/**
 * Расширяет Alfa Romeo (10 нод) + добавляет Acura (10), Infiniti (10), Moskvich (9)
 * Запускать: node scripts/add-alfa-acura-infiniti-moskvich.js
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

// ─── ALFA ROMEO expansion ──────────────────────────────────────────────────────
// Currently: Montreal, 4C, 4C Spider, Giulia QV, Stelvio QV, Giulia GTAm, 33 Stradale
// Add: base Giulia/Stelvio (roots for QV), 8C, GTV, 156, 147, Brera, Tonale

const alfaNodes = [
  { id:'alfa-romeo-147', label:'147 (2001)', year:2001, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-147', familyKey:'alfa-147', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:150, engineType:'i4t', codeName:'937' },
  { id:'alfa-romeo-147-gta', label:'147 GTA (2002)', year:2002, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-147-gta', familyKey:'alfa-147', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:250, engineType:'v6', codeName:'937 GTA' },
  { id:'alfa-romeo-156', label:'156 (1997)', year:1997, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-156', familyKey:'alfa-156', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:155, engineType:'v6', codeName:'932' },
  { id:'alfa-romeo-156-gta', label:'156 GTA (2002)', year:2002, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-156-gta', familyKey:'alfa-156', type:'generation', bodyType:'sedan', segment:'exec_sports', zone:'exec_sed', hp:250, engineType:'v6', codeName:'932 GTA' },
  { id:'alfa-romeo-gtv', label:'GTV 916 (1994)', year:1994, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-gtv', familyKey:'alfa-gtv', type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe', hp:220, engineType:'v6', codeName:'916 GTV' },
  { id:'alfa-romeo-brera', label:'Brera (2005)', year:2005, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-brera', familyKey:'alfa-brera', type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe', hp:260, engineType:'v6', codeName:'939' },
  { id:'alfa-romeo-8c', label:'8C Competizione (2007)', year:2007, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-8c', familyKey:'alfa-8c', type:'generation', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:450, engineType:'v8', codeName:'920', a777TopSpeed:292, a777Accel:4.2 },
  // Base Giulia/Stelvio as roots for Quadrifoglio variants
  { id:'alfa-romeo-giulia', label:'Giulia (2016)', year:2016, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-giulia', familyKey:'alfa-giulia', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:200, engineType:'i4t', codeName:'952' },
  { id:'alfa-romeo-stelvio', label:'Stelvio (2017)', year:2017, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-stelvio', familyKey:'alfa-stelvio', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid', hp:200, engineType:'i4t', codeName:'949' },
  { id:'alfa-romeo-tonale', label:'Tonale (2022)', year:2022, brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-romeo-tonale', familyKey:'alfa-tonale', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:280, engineType:'phev', codeName:'965' },
]

const alfaEdges = [
  // 147 chain
  { id:'e-alfa-147-gta', source:'alfa-romeo-147', target:'alfa-romeo-147-gta', type:'variant_of', strength:0.9 },
  // 156 chain
  { id:'e-alfa-156-gta', source:'alfa-romeo-156', target:'alfa-romeo-156-gta', type:'variant_of', strength:0.9 },
  { id:'e-alfa-156-147', source:'alfa-romeo-156', target:'alfa-romeo-147', type:'inspired_by', strength:0.6 },
  // GTV → Brera
  { id:'e-alfa-gtv-brera', source:'alfa-romeo-gtv', target:'alfa-romeo-brera', type:'evolves_into', strength:0.7 },
  // 8C Competizione inspired Montreal
  { id:'e-alfa-montreal-8c', source:'alfa-romeo-montreal', target:'alfa-romeo-8c', type:'inspired_by', strength:0.55 },
  // Giulia base → Giulia QV (QV as variant_of base — base→variant direction)
  { id:'e-alfa-giulia-qv', source:'alfa-romeo-giulia', target:'alfa-romeo-giulia-qv', type:'variant_of', strength:0.95 },
  { id:'e-alfa-stelvio-qv', source:'alfa-romeo-stelvio', target:'alfa-romeo-stelvio-qv', type:'variant_of', strength:0.95 },
  // Giulia QV → GTAm
  { id:'e-alfa-gqv-gtam', source:'alfa-romeo-giulia-qv', target:'alfa-romeo-giulia-gtam', type:'variant_of', strength:0.9 },
  // 8C → 33 Stradale spiritual successor
  { id:'e-alfa-8c-33', source:'alfa-romeo-8c', target:'alfa-romeo-33-stradale', type:'inspired_by', strength:0.6 },
  // Tonale inspired Stelvio
  { id:'e-alfa-stelvio-tonale', source:'alfa-romeo-stelvio', target:'alfa-romeo-tonale', type:'inspired_by', strength:0.55 },
]

// ─── ACURA ────────────────────────────────────────────────────────────────────

const acuraNodes = [
  { id:'acura-nsx-1', label:'NSX Gen1 (1990)', year:1990, brandId:'acura', brandName:'Acura', modelSlug:'acura-nsx', familyKey:'acura-nsx', type:'generation', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:270, engineType:'v6', codeName:'NA1', a777TopSpeed:270, a777Accel:5.7 },
  { id:'acura-nsx-2', label:'NSX Gen2 (2017)', year:2017, brandId:'acura', brandName:'Acura', modelSlug:'acura-nsx', familyKey:'acura-nsx', type:'generation', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:573, engineType:'v6h', codeName:'NC1', a777TopSpeed:307, a777Accel:3.1, a777Nurb:'7:02.00' },
  { id:'acura-nsx-ts', label:'NSX Type S (2021)', year:2021, brandId:'acura', brandName:'Acura', modelSlug:'acura-nsx-type-s', familyKey:'acura-nsx', type:'generation', bodyType:'coupe', segment:'supercar', zone:'supercar', hp:600, engineType:'v6h', codeName:'NC1 Type S', a777TopSpeed:313, a777Accel:2.9 },
  { id:'acura-integra-dc2', label:'Integra Type R DC2 (1995)', year:1995, brandId:'acura', brandName:'Acura', modelSlug:'acura-integra', familyKey:'acura-integra', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:195, engineType:'i4', codeName:'DC2' },
  { id:'acura-integra-4', label:'Integra (2023)', year:2022, brandId:'acura', brandName:'Acura', modelSlug:'acura-integra', familyKey:'acura-integra', type:'generation', bodyType:'sedan', segment:'sports', zone:'midsize_sed', hp:200, engineType:'i4t', codeName:'DE5' },
  { id:'acura-integra-type-s', label:'Integra Type S (2023)', year:2023, brandId:'acura', brandName:'Acura', modelSlug:'acura-integra-type-s', familyKey:'acura-integra', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:320, engineType:'i4t', codeName:'DE5 Type S', a777Accel:4.5 },
  { id:'acura-mdx-1', label:'MDX Gen1 (2001)', year:2001, brandId:'acura', brandName:'Acura', modelSlug:'acura-mdx', familyKey:'acura-mdx', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large', hp:260, engineType:'v6' },
  { id:'acura-mdx-3', label:'MDX Gen3 (2014)', year:2014, brandId:'acura', brandName:'Acura', modelSlug:'acura-mdx', familyKey:'acura-mdx', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large', hp:290, engineType:'v6' },
  { id:'acura-mdx-4', label:'MDX Gen4 (2022)', year:2022, brandId:'acura', brandName:'Acura', modelSlug:'acura-mdx', familyKey:'acura-mdx', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large', hp:355, engineType:'v6h' },
  { id:'acura-rdx-3', label:'RDX Gen3 (2019)', year:2019, brandId:'acura', brandName:'Acura', modelSlug:'acura-rdx', familyKey:'acura-rdx', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_compact', hp:272, engineType:'i4t' },
]

const acuraEdges = [
  { id:'e-acura-nsx1-2', source:'acura-nsx-1', target:'acura-nsx-2', type:'evolves_into', strength:0.8 },
  { id:'e-acura-nsx2-ts', source:'acura-nsx-2', target:'acura-nsx-ts', type:'variant_of', strength:0.9 },
  { id:'e-acura-int-dc2-4', source:'acura-integra-dc2', target:'acura-integra-4', type:'inspired_by', strength:0.65 },
  { id:'e-acura-int4-ts', source:'acura-integra-4', target:'acura-integra-type-s', type:'variant_of', strength:0.9 },
  { id:'e-acura-mdx1-3', source:'acura-mdx-1', target:'acura-mdx-3', type:'evolves_into', strength:0.8 },
  { id:'e-acura-mdx3-4', source:'acura-mdx-3', target:'acura-mdx-4', type:'evolves_into', strength:0.85 },
]

// ─── INFINITI ─────────────────────────────────────────────────────────────────

const infinitiNodes = [
  { id:'infiniti-q45-1', label:'Q45 Gen1 (1990)', year:1990, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-q45', familyKey:'infiniti-q45', type:'generation', bodyType:'sedan', segment:'ultra_luxury', zone:'flagship_sed', hp:278, engineType:'v8' },
  { id:'infiniti-q45-2', label:'Q45 Gen2 (1997)', year:1997, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-q45', familyKey:'infiniti-q45', type:'generation', bodyType:'sedan', segment:'ultra_luxury', zone:'flagship_sed', hp:340, engineType:'v8' },
  { id:'infiniti-g35', label:'G35 (2003)', year:2003, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-g35', familyKey:'infiniti-g', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:280, engineType:'v6', codeName:'V35' },
  { id:'infiniti-g37', label:'G37 (2007)', year:2007, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-g37', familyKey:'infiniti-g', type:'generation', bodyType:'coupe', segment:'exec', zone:'exec_sed', hp:330, engineType:'v6', codeName:'V36' },
  { id:'infiniti-q50', label:'Q50 (2014)', year:2014, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-q50', familyKey:'infiniti-q50', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:208, engineType:'i4t' },
  { id:'infiniti-q50-rs', label:'Q50 Red Sport 400 (2016)', year:2016, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-q50-red-sport', familyKey:'infiniti-q50', type:'generation', bodyType:'sedan', segment:'exec_sports', zone:'exec_sed', hp:400, engineType:'v6t' },
  { id:'infiniti-q60', label:'Q60 (2017)', year:2017, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-q60', familyKey:'infiniti-q60', type:'generation', bodyType:'coupe', segment:'exec', zone:'gt_coupe', hp:300, engineType:'v6t' },
  { id:'infiniti-q60-rs', label:'Q60 Red Sport 400 (2017)', year:2017, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-q60-red-sport', familyKey:'infiniti-q60', type:'generation', bodyType:'coupe', segment:'exec_sports', zone:'gt_coupe', hp:400, engineType:'v6t' },
  { id:'infiniti-fx35', label:'FX35 (2003)', year:2003, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-fx35', familyKey:'infiniti-fx', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid', hp:280, engineType:'v6', codeName:'S50' },
  { id:'infiniti-qx70', label:'QX70 (2009)', year:2009, brandId:'infiniti', brandName:'Infiniti', modelSlug:'infiniti-qx70', familyKey:'infiniti-fx', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid', hp:325, engineType:'v6', codeName:'S51' },
]

const infinitiEdges = [
  { id:'e-inf-q45-1-2', source:'infiniti-q45-1', target:'infiniti-q45-2', type:'evolves_into', strength:0.85 },
  { id:'e-inf-g35-g37', source:'infiniti-g35', target:'infiniti-g37', type:'evolves_into', strength:0.85 },
  { id:'e-inf-g37-q50', source:'infiniti-g37', target:'infiniti-q50', type:'evolves_into', strength:0.8 },
  { id:'e-inf-q50-rs', source:'infiniti-q50', target:'infiniti-q50-rs', type:'variant_of', strength:0.9 },
  { id:'e-inf-g37-q60', source:'infiniti-g37', target:'infiniti-q60', type:'evolves_into', strength:0.8 },
  { id:'e-inf-q60-rs', source:'infiniti-q60', target:'infiniti-q60-rs', type:'variant_of', strength:0.9 },
  { id:'e-inf-fx35-qx70', source:'infiniti-fx35', target:'infiniti-qx70', type:'evolves_into', strength:0.85 },
]

// ─── MOSKVICH / АЗЛК ─────────────────────────────────────────────────────────

const moskvichNodes = [
  { id:'azlk-400', label:'Москвич-400 (1946)', year:1946, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-400', familyKey:'azlk-400', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:23, engineType:'i4', codeName:'400' },
  { id:'azlk-401', label:'Москвич-401 (1954)', year:1954, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-400', familyKey:'azlk-400', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:26, engineType:'i4', codeName:'401' },
  { id:'azlk-402', label:'Москвич-402 (1956)', year:1956, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-402', familyKey:'azlk-402', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:35, engineType:'i4', codeName:'402' },
  { id:'azlk-407', label:'Москвич-407 (1958)', year:1958, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-407', familyKey:'azlk-407', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:45, engineType:'i4', codeName:'407' },
  { id:'azlk-408', label:'Москвич-408 (1964)', year:1964, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-408', familyKey:'azlk-408', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:50, engineType:'i4', codeName:'408' },
  { id:'azlk-412', label:'Москвич-412 (1967)', year:1967, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-412', familyKey:'azlk-412', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:75, engineType:'i4', codeName:'412' },
  { id:'azlk-2140', label:'Москвич-2140 (1976)', year:1976, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-2140', familyKey:'azlk-412', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:75, engineType:'i4', codeName:'2140' },
  { id:'azlk-2141', label:'Москвич-2141 Алеко (1986)', year:1986, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-2141', familyKey:'azlk-2141', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:68, engineType:'i4', codeName:'2141 Aleko' },
  { id:'azlk-2141-20', label:'Москвич-2141 Svyatogor (1997)', year:1997, brandId:'moskvich', brandName:'Москвич / АЗЛК', modelSlug:'moskvich-2141', familyKey:'azlk-2141', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:90, engineType:'i4', codeName:'2141 Svyatogor' },
]

const moskvichEdges = [
  { id:'e-azlk-400-401', source:'azlk-400', target:'azlk-401', type:'facelifted_to', strength:0.9 },
  { id:'e-azlk-401-402', source:'azlk-401', target:'azlk-402', type:'evolves_into', strength:0.85 },
  { id:'e-azlk-402-407', source:'azlk-402', target:'azlk-407', type:'evolves_into', strength:0.85 },
  { id:'e-azlk-407-408', source:'azlk-407', target:'azlk-408', type:'evolves_into', strength:0.85 },
  { id:'e-azlk-408-412', source:'azlk-408', target:'azlk-412', type:'evolves_into', strength:0.85 },
  { id:'e-azlk-412-2140', source:'azlk-412', target:'azlk-2140', type:'facelifted_to', strength:0.9 },
  { id:'e-azlk-2140-2141', source:'azlk-2140', target:'azlk-2141', type:'evolves_into', strength:0.75 },
  { id:'e-azlk-2141-sv', source:'azlk-2141', target:'azlk-2141-20', type:'facelifted_to', strength:0.85 },
]

// ─── Merge ────────────────────────────────────────────────────────────────────

const allNew = [...alfaNodes, ...acuraNodes, ...infinitiNodes, ...moskvichNodes]
const allEdges = [...alfaEdges, ...acuraEdges, ...infinitiEdges, ...moskvichEdges]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0

for (const n of allNew) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else skipN++
}
for (const e of allEdges) {
  if (!existE.has(e.id)) { g.edges.push(e); addedE++ }
  else skipE++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`Alfa+Acura+Infiniti+Moskvich: +${addedN} nodes (${skipN} skipped), +${addedE} edges (${skipE} skipped)`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
