/**
 * Добавляет Hyundai (35 нод), Genesis (8 нод), расширяет Kia (17 нод)
 * Запускать: node scripts/add-korean-brands.js
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

// ─── HYUNDAI ──────────────────────────────────────────────────────────────────

const hyundaiNodes = [
  // Sonata
  { id:'hyu-sonata-1', label:'Sonata I (1985)', year:1985, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:98, engineType:'i4' },
  { id:'hyu-sonata-2', label:'Sonata II (1988)', year:1988, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:126, engineType:'i4' },
  { id:'hyu-sonata-3', label:'Sonata EF (1998)', year:1998, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:140, engineType:'v6' },
  { id:'hyu-sonata-4', label:'Sonata NF (2005)', year:2005, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:162, engineType:'v6' },
  { id:'hyu-sonata-5', label:'Sonata YF (2010)', year:2010, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:200, engineType:'i4t' },
  { id:'hyu-sonata-6', label:'Sonata LF (2015)', year:2015, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:180, engineType:'i4t' },
  { id:'hyu-sonata-7', label:'Sonata DN8 (2020)', year:2020, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:180, engineType:'i4t' },
  { id:'hyu-sonata-nline', label:'Sonata N Line', year:2021, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-sonata-n-line', familyKey:'hyu-sonata', type:'generation', bodyType:'sedan', segment:'exec_sports', zone:'exec_sed', hp:245, engineType:'i4t' },

  // Elantra
  { id:'hyu-elantra-1', label:'Elantra J1 (1990)', year:1990, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-elantra', familyKey:'hyu-elantra', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:88, engineType:'i4' },
  { id:'hyu-elantra-3', label:'Elantra XD (2000)', year:2000, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-elantra', familyKey:'hyu-elantra', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:107, engineType:'i4' },
  { id:'hyu-elantra-5', label:'Elantra MD (2011)', year:2011, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-elantra', familyKey:'hyu-elantra', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:148, engineType:'i4' },
  { id:'hyu-elantra-6', label:'Elantra AD (2016)', year:2016, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-elantra', familyKey:'hyu-elantra', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:150, engineType:'i4t' },
  { id:'hyu-elantra-7', label:'Elantra CN7 (2021)', year:2021, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-elantra', familyKey:'hyu-elantra', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:158, engineType:'i4t' },
  { id:'hyu-elantra-n', label:'Elantra N', year:2021, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-elantra-n', familyKey:'hyu-elantra', type:'generation', bodyType:'sedan', segment:'exec_sports', zone:'midsize_sed', hp:276, engineType:'i4t' },

  // Tucson
  { id:'hyu-tucson-1', label:'Tucson JM (2004)', year:2004, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-tucson', familyKey:'hyu-tucson', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:141, engineType:'i4' },
  { id:'hyu-tucson-2', label:'Tucson LM (2010)', year:2010, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-tucson', familyKey:'hyu-tucson', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:174, engineType:'i4t' },
  { id:'hyu-tucson-3', label:'Tucson TL (2015)', year:2015, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-tucson', familyKey:'hyu-tucson', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:177, engineType:'i4t' },
  { id:'hyu-tucson-4', label:'Tucson NX4 (2021)', year:2021, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-tucson', familyKey:'hyu-tucson', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:187, engineType:'i4t' },

  // Santa Fe
  { id:'hyu-santa-fe-1', label:'Santa Fe SM (2001)', year:2001, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-santa-fe', familyKey:'hyu-santa-fe', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:149, engineType:'v6' },
  { id:'hyu-santa-fe-2', label:'Santa Fe CM (2006)', year:2006, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-santa-fe', familyKey:'hyu-santa-fe', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:197, engineType:'v6' },
  { id:'hyu-santa-fe-3', label:'Santa Fe DM (2013)', year:2013, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-santa-fe', familyKey:'hyu-santa-fe', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:190, engineType:'i4t' },
  { id:'hyu-santa-fe-4', label:'Santa Fe TM (2019)', year:2019, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-santa-fe', familyKey:'hyu-santa-fe', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:235, engineType:'i4t' },

  // EV / N
  { id:'hyu-ioniq5', label:'IONIQ 5 (2021)', year:2021, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-ioniq-5', familyKey:'hyu-ioniq5', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:225, engineType:'ev' },
  { id:'hyu-ioniq5-n', label:'IONIQ 5 N (2024)', year:2023, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-ioniq-5-n', familyKey:'hyu-ioniq5', type:'generation', bodyType:'suv', segment:'exec_sports', zone:'suv_compact', hp:641, engineType:'ev', a777Accel:3.4 },
  { id:'hyu-ioniq6', label:'IONIQ 6 (2022)', year:2022, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-ioniq-6', familyKey:'hyu-ioniq6', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:239, engineType:'ev' },
  { id:'hyu-i30n', label:'i30 N (2017)', year:2017, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-i30-n', familyKey:'hyu-i30', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:275, engineType:'i4t', a777Accel:6.1 },
  { id:'hyu-veloster-n', label:'Veloster N (2019)', year:2019, brandId:'hyundai', brandName:'Hyundai', modelSlug:'hyundai-veloster-n', familyKey:'hyu-veloster', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:275, engineType:'i4t', a777Accel:5.9 },
]

const hyundaiEdges = [
  // Sonata chain
  { id:'e-hyu-son1-2', source:'hyu-sonata-1', target:'hyu-sonata-2', type:'evolves_into', strength:0.9 },
  { id:'e-hyu-son2-3', source:'hyu-sonata-2', target:'hyu-sonata-3', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-son3-4', source:'hyu-sonata-3', target:'hyu-sonata-4', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-son4-5', source:'hyu-sonata-4', target:'hyu-sonata-5', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-son5-6', source:'hyu-sonata-5', target:'hyu-sonata-6', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-son6-7', source:'hyu-sonata-6', target:'hyu-sonata-7', type:'evolves_into', strength:0.9 },
  { id:'e-hyu-son7-nline', source:'hyu-sonata-7', target:'hyu-sonata-nline', type:'variant_of', strength:0.85 },
  // Elantra chain
  { id:'e-hyu-ela1-3', source:'hyu-elantra-1', target:'hyu-elantra-3', type:'evolves_into', strength:0.8 },
  { id:'e-hyu-ela3-5', source:'hyu-elantra-3', target:'hyu-elantra-5', type:'evolves_into', strength:0.8 },
  { id:'e-hyu-ela5-6', source:'hyu-elantra-5', target:'hyu-elantra-6', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-ela6-7', source:'hyu-elantra-6', target:'hyu-elantra-7', type:'evolves_into', strength:0.9 },
  { id:'e-hyu-ela7-n', source:'hyu-elantra-7', target:'hyu-elantra-n', type:'variant_of', strength:0.9 },
  // Tucson chain
  { id:'e-hyu-tuc1-2', source:'hyu-tucson-1', target:'hyu-tucson-2', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-tuc2-3', source:'hyu-tucson-2', target:'hyu-tucson-3', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-tuc3-4', source:'hyu-tucson-3', target:'hyu-tucson-4', type:'evolves_into', strength:0.9 },
  // Santa Fe chain
  { id:'e-hyu-sf1-2', source:'hyu-santa-fe-1', target:'hyu-santa-fe-2', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-sf2-3', source:'hyu-santa-fe-2', target:'hyu-santa-fe-3', type:'evolves_into', strength:0.85 },
  { id:'e-hyu-sf3-4', source:'hyu-santa-fe-3', target:'hyu-santa-fe-4', type:'evolves_into', strength:0.9 },
  // IONIQ 5 N is variant of IONIQ 5
  { id:'e-hyu-ioniq5-n', source:'hyu-ioniq5', target:'hyu-ioniq5-n', type:'variant_of', strength:0.9 },
  // i30 N inspired Elantra N
  { id:'e-hyu-i30n-elan', source:'hyu-i30n', target:'hyu-elantra-n', type:'inspired_by', strength:0.7 },
]

// ─── GENESIS ──────────────────────────────────────────────────────────────────

const genesisNodes = [
  { id:'gen-g70-1', label:'G70 (2018)', year:2018, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-g70', familyKey:'gen-g70', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:255, engineType:'i4t' },
  { id:'gen-g70-2', label:'G70 (2022)', year:2022, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-g70', familyKey:'gen-g70', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:300, engineType:'i4t' },
  { id:'gen-g80-2', label:'G80 (2020)', year:2020, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-g80', familyKey:'gen-g80', type:'generation', bodyType:'sedan', segment:'exec', zone:'flagship_sed', hp:300, engineType:'i4t' },
  { id:'gen-g80-e', label:'G80 Electrified (2022)', year:2022, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-g80-electrified', familyKey:'gen-g80', type:'generation', bodyType:'sedan', segment:'exec', zone:'flagship_sed', hp:365, engineType:'ev' },
  { id:'gen-g90-3', label:'G90 (2023)', year:2022, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-g90', familyKey:'gen-g90', type:'generation', bodyType:'sedan', segment:'ultra_luxury', zone:'flagship_sed', hp:425, engineType:'v6t' },
  { id:'gen-gv70-1', label:'GV70 (2021)', year:2021, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-gv70', familyKey:'gen-gv70', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid', hp:300, engineType:'i4t' },
  { id:'gen-gv70-e', label:'GV70 Electrified (2023)', year:2023, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-gv70-electrified', familyKey:'gen-gv70', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid', hp:429, engineType:'ev' },
  { id:'gen-gv80-1', label:'GV80 (2021)', year:2021, brandId:'genesis', brandName:'Genesis', modelSlug:'genesis-gv80', familyKey:'gen-gv80', type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large', hp:300, engineType:'v6t' },
]

const genesisEdges = [
  { id:'e-gen-g70-1-2', source:'gen-g70-1', target:'gen-g70-2', type:'facelifted_to', strength:0.85 },
  { id:'e-gen-g80-2-e', source:'gen-g80-2', target:'gen-g80-e', type:'variant_of', strength:0.85 },
  { id:'e-gen-gv70-1-e', source:'gen-gv70-1', target:'gen-gv70-e', type:'variant_of', strength:0.85 },
  // G70 inspired by G80 platform
  { id:'e-gen-g80-g70', source:'gen-g80-2', target:'gen-g70-1', type:'inspired_by', strength:0.6 },
  // Hyundai Elantra N inspired Genesis G70 sport DNA
  { id:'e-gen-g70-sonata-insp', source:'hyu-elantra-n', target:'gen-g70-1', type:'inspired_by', strength:0.55 },
]

// ─── KIA expansion ────────────────────────────────────────────────────────────

const kiaNodes = [
  // Carnival fill-in (gens 2 and 3 between existing 1998 and 2021)
  { id:'kia-carnival-2', label:'Carnival II (2006)', year:2006, brandId:'kia', brandName:'Kia', modelSlug:'kia-carnival', familyKey:'kia-carnival', type:'generation', bodyType:'van', segment:'mainstream', zone:'suv_mid', hp:195, engineType:'v6' },
  { id:'kia-carnival-3', label:'Carnival III (2015)', year:2015, brandId:'kia', brandName:'Kia', modelSlug:'kia-carnival', familyKey:'kia-carnival', type:'generation', bodyType:'van', segment:'mainstream', zone:'suv_mid', hp:271, engineType:'v6' },

  // Sportage
  { id:'kia-sportage-1', label:'Sportage I (1993)', year:1993, brandId:'kia', brandName:'Kia', modelSlug:'kia-sportage', familyKey:'kia-sportage', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:95, engineType:'i4' },
  { id:'kia-sportage-2', label:'Sportage II (2004)', year:2004, brandId:'kia', brandName:'Kia', modelSlug:'kia-sportage', familyKey:'kia-sportage', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:141, engineType:'i4' },
  { id:'kia-sportage-3', label:'Sportage III (2010)', year:2010, brandId:'kia', brandName:'Kia', modelSlug:'kia-sportage', familyKey:'kia-sportage', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:163, engineType:'i4t' },
  { id:'kia-sportage-4', label:'Sportage IV (2016)', year:2016, brandId:'kia', brandName:'Kia', modelSlug:'kia-sportage', familyKey:'kia-sportage', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:177, engineType:'i4t' },
  { id:'kia-sportage-5', label:'Sportage V (2022)', year:2022, brandId:'kia', brandName:'Kia', modelSlug:'kia-sportage', familyKey:'kia-sportage', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:187, engineType:'i4t' },

  // Sorento
  { id:'kia-sorento-1', label:'Sorento I (2003)', year:2003, brandId:'kia', brandName:'Kia', modelSlug:'kia-sorento', familyKey:'kia-sorento', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:140, engineType:'v6' },
  { id:'kia-sorento-2', label:'Sorento II (2009)', year:2009, brandId:'kia', brandName:'Kia', modelSlug:'kia-sorento', familyKey:'kia-sorento', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:194, engineType:'v6' },
  { id:'kia-sorento-3', label:'Sorento III (2015)', year:2015, brandId:'kia', brandName:'Kia', modelSlug:'kia-sorento', familyKey:'kia-sorento', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:185, engineType:'i4t' },
  { id:'kia-sorento-4', label:'Sorento IV (2021)', year:2021, brandId:'kia', brandName:'Kia', modelSlug:'kia-sorento', familyKey:'kia-sorento', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:281, engineType:'i4h' },

  // K5 / Optima
  { id:'kia-k5-1', label:'Optima II (2011)', year:2011, brandId:'kia', brandName:'Kia', modelSlug:'kia-k5', familyKey:'kia-k5', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:197, engineType:'i4t' },
  { id:'kia-k5-2', label:'Optima III (2016)', year:2016, brandId:'kia', brandName:'Kia', modelSlug:'kia-k5', familyKey:'kia-k5', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:180, engineType:'i4t' },
  { id:'kia-k5-3', label:'K5 / Optima IV (2020)', year:2020, brandId:'kia', brandName:'Kia', modelSlug:'kia-k5', familyKey:'kia-k5', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'exec_sed', hp:180, engineType:'i4t' },

  // Stinger
  { id:'kia-stinger-1', label:'Stinger (2018)', year:2018, brandId:'kia', brandName:'Kia', modelSlug:'kia-stinger', familyKey:'kia-stinger', type:'generation', bodyType:'sedan', segment:'exec_sports', zone:'exec_sed', hp:370, engineType:'v6t' },

  // EV6
  { id:'kia-ev6-1', label:'EV6 (2022)', year:2022, brandId:'kia', brandName:'Kia', modelSlug:'kia-ev6', familyKey:'kia-ev6', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:225, engineType:'ev' },
  { id:'kia-ev6-gt', label:'EV6 GT (2023)', year:2023, brandId:'kia', brandName:'Kia', modelSlug:'kia-ev6-gt', familyKey:'kia-ev6', type:'generation', bodyType:'suv', segment:'exec_sports', zone:'suv_compact', hp:585, engineType:'ev', a777Accel:3.5 },
]

const kiaEdges = [
  // Carnival chain (fill gap)
  { id:'e-kia-car1-2', source:'kia-carnival-1', target:'kia-carnival-2', type:'evolves_into', strength:0.85 },
  { id:'e-kia-car2-3', source:'kia-carnival-2', target:'kia-carnival-3', type:'evolves_into', strength:0.85 },
  { id:'e-kia-car3-4', source:'kia-carnival-3', target:'kia-carnival-4', type:'evolves_into', strength:0.9 },
  // Sportage chain
  { id:'e-kia-sp1-2', source:'kia-sportage-1', target:'kia-sportage-2', type:'evolves_into', strength:0.8 },
  { id:'e-kia-sp2-3', source:'kia-sportage-2', target:'kia-sportage-3', type:'evolves_into', strength:0.85 },
  { id:'e-kia-sp3-4', source:'kia-sportage-3', target:'kia-sportage-4', type:'evolves_into', strength:0.85 },
  { id:'e-kia-sp4-5', source:'kia-sportage-4', target:'kia-sportage-5', type:'evolves_into', strength:0.9 },
  // Sorento chain
  { id:'e-kia-sor1-2', source:'kia-sorento-1', target:'kia-sorento-2', type:'evolves_into', strength:0.8 },
  { id:'e-kia-sor2-3', source:'kia-sorento-2', target:'kia-sorento-3', type:'evolves_into', strength:0.85 },
  { id:'e-kia-sor3-4', source:'kia-sorento-3', target:'kia-sorento-4', type:'evolves_into', strength:0.9 },
  // K5 chain
  { id:'e-kia-k5-1-2', source:'kia-k5-1', target:'kia-k5-2', type:'evolves_into', strength:0.85 },
  { id:'e-kia-k5-2-3', source:'kia-k5-2', target:'kia-k5-3', type:'evolves_into', strength:0.9 },
  // EV6 GT variant
  { id:'e-kia-ev6-gt', source:'kia-ev6-1', target:'kia-ev6-gt', type:'variant_of', strength:0.9 },
  // Stinger inspired G70
  { id:'e-kia-stinger-g70', source:'kia-stinger-1', target:'gen-g70-1', type:'inspired_by', strength:0.7 },
  // Hyundai Tucson platform shared with Sportage (cross-brand platform)
  { id:'e-hyu-tuc3-kia-sp4', source:'hyu-tucson-3', target:'kia-sportage-4', type:'inspired_by', strength:0.6 },
]

// ─── Merge ────────────────────────────────────────────────────────────────────

const allNew = [...hyundaiNodes, ...genesisNodes, ...kiaNodes]
const allEdges = [...hyundaiEdges, ...genesisEdges, ...kiaEdges]

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
console.log(`Korean brands: +${addedN} nodes (${skipN} skipped), +${addedE} edges (${skipE} skipped)`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
