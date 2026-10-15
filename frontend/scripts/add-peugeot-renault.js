/**
 * Добавляет Peugeot (24 ноды) и расширяет Renault (15 нод: Clio, Megane, Alpine)
 * Запускать: node scripts/add-peugeot-renault.js
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

// ─── PEUGEOT ──────────────────────────────────────────────────────────────────

const peugeotNodes = [
  // 205 / 205 GTI
  { id:'peu-205', label:'205 (1983)', year:1983, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-205', familyKey:'peu-205', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:60, engineType:'i4' },
  { id:'peu-205-gti', label:'205 GTI (1984)', year:1984, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-205-gti', familyKey:'peu-205', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:130, engineType:'i4' },

  // 206 / 206 RC
  { id:'peu-206', label:'206 (1998)', year:1998, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-206', familyKey:'peu-206', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:75, engineType:'i4' },
  { id:'peu-206-rc', label:'206 RC (2003)', year:2003, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-206-rc', familyKey:'peu-206', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:177, engineType:'i4' },

  // 306 / 306 GTi-6
  { id:'peu-306', label:'306 (1993)', year:1993, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-306', familyKey:'peu-306', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:90, engineType:'i4' },
  { id:'peu-306-gti6', label:'306 GTi-6 (1996)', year:1996, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-306-gti6', familyKey:'peu-306', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:167, engineType:'i4' },

  // 307 / 308
  { id:'peu-307', label:'307 (2001)', year:2001, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-307', familyKey:'peu-308', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:110, engineType:'i4' },
  { id:'peu-308-1', label:'308 I (2007)', year:2007, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-308', familyKey:'peu-308', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:120, engineType:'i4' },
  { id:'peu-308-2', label:'308 II (2014)', year:2014, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-308', familyKey:'peu-308', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:130, engineType:'i4t' },
  { id:'peu-308-gti', label:'308 GTi 270 (2015)', year:2015, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-308-gti', familyKey:'peu-308', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:270, engineType:'i4t' },
  { id:'peu-308-3', label:'308 III (2021)', year:2021, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-308', familyKey:'peu-308', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:180, engineType:'i4t' },

  // 208 I / II / GTi / e-208
  { id:'peu-208-1', label:'208 I (2012)', year:2012, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-208', familyKey:'peu-208', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:100, engineType:'i4' },
  { id:'peu-208-gti', label:'208 GTi (2013)', year:2013, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-208-gti', familyKey:'peu-208', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:208, engineType:'i4t' },
  { id:'peu-208-2', label:'208 II (2019)', year:2019, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-208', familyKey:'peu-208', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:130, engineType:'i4t' },
  { id:'peu-e208', label:'e-208 (2019)', year:2019, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-e-208', familyKey:'peu-208', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:136, engineType:'ev' },

  // RCZ / RCZ R
  { id:'peu-rcz', label:'RCZ (2010)', year:2010, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-rcz', familyKey:'peu-rcz', type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe', hp:200, engineType:'i4t' },
  { id:'peu-rcz-r', label:'RCZ R (2013)', year:2013, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-rcz-r', familyKey:'peu-rcz', type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe', hp:270, engineType:'i4t' },

  // 3008 I / II / e-3008
  { id:'peu-3008-1', label:'3008 I (2009)', year:2009, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-3008', familyKey:'peu-3008', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:120, engineType:'i4' },
  { id:'peu-3008-2', label:'3008 II (2016)', year:2016, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-3008', familyKey:'peu-3008', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:180, engineType:'i4t' },
  { id:'peu-e3008', label:'e-3008 (2024)', year:2024, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-e-3008', familyKey:'peu-3008', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_compact', hp:213, engineType:'ev' },

  // 5008 I / II
  { id:'peu-5008-1', label:'5008 I (2009)', year:2009, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-5008', familyKey:'peu-5008', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:120, engineType:'i4' },
  { id:'peu-5008-2', label:'5008 II (2017)', year:2017, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-5008', familyKey:'peu-5008', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:180, engineType:'i4t' },

  // 508 I / II
  { id:'peu-508-1', label:'508 I (2011)', year:2011, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-508', familyKey:'peu-508', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:200, engineType:'i4t' },
  { id:'peu-508-2', label:'508 II (2018)', year:2018, brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-508', familyKey:'peu-508', type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed', hp:225, engineType:'i4t' },
]

const peugeotEdges = [
  // 205 chain
  { id:'e-peu-205-gti', source:'peu-205', target:'peu-205-gti', type:'variant_of', strength:0.9 },
  { id:'e-peu-205-206', source:'peu-205', target:'peu-206', type:'evolves_into', strength:0.75 },
  // 206 chain
  { id:'e-peu-206-rc', source:'peu-206', target:'peu-206-rc', type:'variant_of', strength:0.9 },
  { id:'e-peu-206-307', source:'peu-206', target:'peu-307', type:'inspired_by', strength:0.6 },
  // 306 chain
  { id:'e-peu-306-gti6', source:'peu-306', target:'peu-306-gti6', type:'variant_of', strength:0.9 },
  { id:'e-peu-306-307', source:'peu-306', target:'peu-307', type:'evolves_into', strength:0.75 },
  // 307 → 308
  { id:'e-peu-307-308', source:'peu-307', target:'peu-308-1', type:'evolves_into', strength:0.8 },
  { id:'e-peu-308-1-2', source:'peu-308-1', target:'peu-308-2', type:'evolves_into', strength:0.85 },
  { id:'e-peu-308-2-gti', source:'peu-308-2', target:'peu-308-gti', type:'variant_of', strength:0.9 },
  { id:'e-peu-308-2-3', source:'peu-308-2', target:'peu-308-3', type:'evolves_into', strength:0.85 },
  // 208 chain
  { id:'e-peu-206-208', source:'peu-206', target:'peu-208-1', type:'inspired_by', strength:0.5 },
  { id:'e-peu-208-1-gti', source:'peu-208-1', target:'peu-208-gti', type:'variant_of', strength:0.9 },
  { id:'e-peu-208-1-2', source:'peu-208-1', target:'peu-208-2', type:'evolves_into', strength:0.85 },
  { id:'e-peu-208-2-e', source:'peu-208-2', target:'peu-e208', type:'variant_of', strength:0.85 },
  // RCZ
  { id:'e-peu-rcz-r', source:'peu-rcz', target:'peu-rcz-r', type:'variant_of', strength:0.9 },
  // 3008 chain
  { id:'e-peu-3008-1-2', source:'peu-3008-1', target:'peu-3008-2', type:'evolves_into', strength:0.85 },
  { id:'e-peu-3008-2-e', source:'peu-3008-2', target:'peu-e3008', type:'evolves_into', strength:0.8 },
  // 5008 chain
  { id:'e-peu-5008-1-2', source:'peu-5008-1', target:'peu-5008-2', type:'evolves_into', strength:0.85 },
  // 508 chain
  { id:'e-peu-508-1-2', source:'peu-508-1', target:'peu-508-2', type:'evolves_into', strength:0.85 },
  // 3008/5008 shared platform
  { id:'e-peu-5008-3008', source:'peu-3008-2', target:'peu-5008-2', type:'inspired_by', strength:0.7 },
]

// ─── RENAULT expansion ────────────────────────────────────────────────────────

const renaultNodes = [
  // Clio I–V + Williams/RS
  { id:'ren-clio-1', label:'Clio I (1990)', year:1990, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:75, engineType:'i4' },
  { id:'ren-clio-williams', label:'Clio Williams (1993)', year:1993, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio-williams', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:150, engineType:'i4' },
  { id:'ren-clio-2', label:'Clio II (1998)', year:1998, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:75, engineType:'i4' },
  { id:'ren-clio-3', label:'Clio III (2005)', year:2005, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:101, engineType:'i4' },
  { id:'ren-clio-rs3', label:'Clio RS III 200 (2006)', year:2006, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio-rs', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:197, engineType:'i4' },
  { id:'ren-clio-4', label:'Clio IV (2012)', year:2012, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:90, engineType:'i4' },
  { id:'ren-clio-5', label:'Clio V (2019)', year:2019, brandId:'renault', brandName:'Renault', modelSlug:'renault-clio', familyKey:'ren-clio', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:130, engineType:'i4h' },

  // Megane I–IV + RS variants
  { id:'ren-megane-1', label:'Megane I (1995)', year:1995, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:90, engineType:'i4' },
  { id:'ren-megane-2', label:'Megane II (2002)', year:2002, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:115, engineType:'i4' },
  { id:'ren-megane-rs2', label:'Megane RS II 225 (2004)', year:2004, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane-rs', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:225, engineType:'i4t' },
  { id:'ren-megane-3', label:'Megane III (2009)', year:2009, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:130, engineType:'i4t' },
  { id:'ren-megane-rs3', label:'Megane RS III Trophy (2012)', year:2012, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane-rs', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:265, engineType:'i4t', a777Nurb:'7:54.36' },
  { id:'ren-megane-4', label:'Megane IV (2016)', year:2016, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'mainstream', zone:'midsize_sed', hp:130, engineType:'i4t' },
  { id:'ren-megane-rs4', label:'Megane RS Trophy-R (2019)', year:2019, brandId:'renault', brandName:'Renault', modelSlug:'renault-megane-rs-trophy-r', familyKey:'ren-megane', type:'generation', bodyType:'hatchback', segment:'sports', zone:'sports', hp:300, engineType:'i4t', a777Nurb:'7:40.10' },

  // Alpine A110
  { id:'ren-alpine-a110', label:'Alpine A110 (2017)', year:2017, brandId:'renault', brandName:'Renault', modelSlug:'renault-alpine-a110', familyKey:'ren-alpine-a110', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:249, engineType:'i4t', a777TopSpeed:250, a777Accel:4.5 },
  { id:'ren-alpine-a110s', label:'Alpine A110 S (2019)', year:2019, brandId:'renault', brandName:'Renault', modelSlug:'renault-alpine-a110-s', familyKey:'ren-alpine-a110', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:292, engineType:'i4t', a777TopSpeed:260, a777Accel:4.2 },
  { id:'ren-alpine-a110r', label:'Alpine A110 R (2022)', year:2022, brandId:'renault', brandName:'Renault', modelSlug:'renault-alpine-a110-r', familyKey:'ren-alpine-a110', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:300, engineType:'i4t', a777TopSpeed:260, a777Accel:3.9 },
]

const renaultEdges = [
  // Clio chain
  { id:'e-ren-clio1-w', source:'ren-clio-1', target:'ren-clio-williams', type:'variant_of', strength:0.9 },
  { id:'e-ren-clio1-2', source:'ren-clio-1', target:'ren-clio-2', type:'evolves_into', strength:0.85 },
  { id:'e-ren-clio2-3', source:'ren-clio-2', target:'ren-clio-3', type:'evolves_into', strength:0.85 },
  { id:'e-ren-clio3-rs', source:'ren-clio-3', target:'ren-clio-rs3', type:'variant_of', strength:0.9 },
  { id:'e-ren-clio3-4', source:'ren-clio-3', target:'ren-clio-4', type:'evolves_into', strength:0.85 },
  { id:'e-ren-clio4-5', source:'ren-clio-4', target:'ren-clio-5', type:'evolves_into', strength:0.85 },
  // Megane chain
  { id:'e-ren-meg1-2', source:'ren-megane-1', target:'ren-megane-2', type:'evolves_into', strength:0.85 },
  { id:'e-ren-meg2-rs2', source:'ren-megane-2', target:'ren-megane-rs2', type:'variant_of', strength:0.9 },
  { id:'e-ren-meg2-3', source:'ren-megane-2', target:'ren-megane-3', type:'evolves_into', strength:0.85 },
  { id:'e-ren-meg3-rs3', source:'ren-megane-3', target:'ren-megane-rs3', type:'variant_of', strength:0.9 },
  { id:'e-ren-meg3-4', source:'ren-megane-3', target:'ren-megane-4', type:'evolves_into', strength:0.85 },
  { id:'e-ren-meg4-rs4', source:'ren-megane-4', target:'ren-megane-rs4', type:'variant_of', strength:0.9 },
  // Alpine A110 chain
  { id:'e-ren-a110-s', source:'ren-alpine-a110', target:'ren-alpine-a110s', type:'facelifted_to', strength:0.85 },
  { id:'e-ren-a110s-r', source:'ren-alpine-a110s', target:'ren-alpine-a110r', type:'variant_of', strength:0.85 },
  // Williams inspired RS lineage
  { id:'e-ren-w-rs2', source:'ren-clio-williams', target:'ren-megane-rs2', type:'inspired_by', strength:0.6 },
]

// ─── Merge ────────────────────────────────────────────────────────────────────

const allNew = [...peugeotNodes, ...renaultNodes]
const allEdges = [...peugeotEdges, ...renaultEdges]

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
console.log(`Peugeot + Renault: +${addedN} nodes (${skipN} skipped), +${addedE} edges (${skipE} skipped)`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
