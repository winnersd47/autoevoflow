/**
 * Добавляет Mitsubishi: Lancer Evolution I-X, Eclipse Gen1-4, Outlander Gen1-4, Pajero Gen1-4, 3000GT
 * Запускать: node scripts/add-mitsubishi.js
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

const newNodes = [
  // ── Lancer Evolution I–X ──────────────────────────────────────────────
  // Lancer base (CD9A) — root for Evo lineage
  { id:'mit-lancer-base', label:'Lancer (1992)', year:1992, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer', familyKey:'mit-lancer', type:'generation', bodyType:'sedan', segment:'mainstream', zone:'midsize_sed', hp:113, engineType:'i4' },
  { id:'mit-lancer-evo1', label:'Lancer Evolution I', year:1992, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:244, engineType:'i4t', codeName:'CD9A', a777Accel:5.8 },
  { id:'mit-lancer-evo2', label:'Lancer Evolution II', year:1994, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:260, engineType:'i4t', codeName:'CE9A', a777Accel:5.3 },
  { id:'mit-lancer-evo3', label:'Lancer Evolution III', year:1995, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:270, engineType:'i4t', codeName:'CE9A', a777Accel:5.1 },
  { id:'mit-lancer-evo4', label:'Lancer Evolution IV', year:1996, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:280, engineType:'i4t', codeName:'CN9A', a777Accel:5.1 },
  { id:'mit-lancer-evo5', label:'Lancer Evolution V', year:1998, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:280, engineType:'i4t', codeName:'CP9A', a777Accel:4.9 },
  { id:'mit-lancer-evo6', label:'Lancer Evolution VI TME', year:1999, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:280, engineType:'i4t', codeName:'CP9A TME', a777Accel:4.7 },
  { id:'mit-lancer-evo7', label:'Lancer Evolution VII', year:2001, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:280, engineType:'i4t', codeName:'CT9A', a777Accel:4.6 },
  { id:'mit-lancer-evo8', label:'Lancer Evolution VIII MR', year:2003, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:265, engineType:'i4t', codeName:'CT9A', a777Accel:4.5, a777Nurb:'8:00.00' },
  { id:'mit-lancer-evo9', label:'Lancer Evolution IX MR', year:2005, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:286, engineType:'i4t', codeName:'CT9A', a777Accel:4.3, a777Nurb:'7:57.00' },
  { id:'mit-lancer-evo10', label:'Lancer Evolution X Final Edition', year:2008, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-lancer-evolution', familyKey:'mit-lancer-evo', type:'generation', bodyType:'sedan', segment:'sports', zone:'sports', hp:295, engineType:'i4t', codeName:'CZ4A', a777Accel:4.2, a777TopSpeed:240, a777Nurb:'7:54.00' },

  // ── Eclipse ────────────────────────────────────────────────────────────
  { id:'mit-eclipse-1', label:'Eclipse 1G (1989)', year:1989, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-eclipse', familyKey:'mit-eclipse', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:195, engineType:'i4t', codeName:'1G/2G D27A' },
  { id:'mit-eclipse-2', label:'Eclipse GSX 2G (1994)', year:1994, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-eclipse', familyKey:'mit-eclipse', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:210, engineType:'i4t', codeName:'2G D32A' },
  { id:'mit-eclipse-3', label:'Eclipse GT 3G (1999)', year:1999, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-eclipse', familyKey:'mit-eclipse', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:210, engineType:'v6', codeName:'3G D53A' },
  { id:'mit-eclipse-4', label:'Eclipse GT 4G (2006)', year:2006, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-eclipse', familyKey:'mit-eclipse', type:'generation', bodyType:'coupe', segment:'sports', zone:'sports', hp:265, engineType:'v6', codeName:'4G D53A' },

  // ── Outlander ──────────────────────────────────────────────────────────
  { id:'mit-outlander-1', label:'Outlander I (2003)', year:2003, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-outlander', familyKey:'mit-outlander', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:140, engineType:'i4' },
  { id:'mit-outlander-2', label:'Outlander II (2006)', year:2006, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-outlander', familyKey:'mit-outlander', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:168, engineType:'i4t' },
  { id:'mit-outlander-3', label:'Outlander III (2012)', year:2012, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-outlander', familyKey:'mit-outlander', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:167, engineType:'i4' },
  { id:'mit-outlander-phev', label:'Outlander PHEV (2013)', year:2013, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-outlander-phev', familyKey:'mit-outlander', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:224, engineType:'phev' },
  { id:'mit-outlander-4', label:'Outlander IV (2022)', year:2022, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-outlander', familyKey:'mit-outlander', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_mid', hp:225, engineType:'i4h' },

  // ── Pajero ─────────────────────────────────────────────────────────────
  { id:'mit-pajero-1', label:'Pajero I (1982)', year:1982, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-pajero', familyKey:'mit-pajero', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_large', hp:110, engineType:'i4' },
  { id:'mit-pajero-2', label:'Pajero II (1991)', year:1991, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-pajero', familyKey:'mit-pajero', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_large', hp:200, engineType:'v6' },
  { id:'mit-pajero-3', label:'Pajero III (1999)', year:1999, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-pajero', familyKey:'mit-pajero', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_large', hp:177, engineType:'v6' },
  { id:'mit-pajero-4', label:'Pajero IV (2006)', year:2006, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-pajero', familyKey:'mit-pajero', type:'generation', bodyType:'suv', segment:'mainstream', zone:'suv_large', hp:250, engineType:'v6' },

  // ── 3000GT ─────────────────────────────────────────────────────────────
  { id:'mit-3000gt', label:'3000GT VR-4 (1990)', year:1990, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-3000gt', familyKey:'mit-3000gt', type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe', hp:296, engineType:'v6t', codeName:'Z16A', a777TopSpeed:249, a777Accel:5.1 },
  { id:'mit-3000gt-2', label:'3000GT VR-4 Final (1997)', year:1997, brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-3000gt', familyKey:'mit-3000gt', type:'generation', bodyType:'coupe', segment:'sports', zone:'gt_coupe', hp:320, engineType:'v6t', codeName:'Z16A final', a777TopSpeed:255, a777Accel:4.8 },
]

const newEdges = [
  // Lancer → Evo I (base inspired performance variant)
  { id:'e-mit-lanc-evo1', source:'mit-lancer-base', target:'mit-lancer-evo1', type:'variant_of', strength:0.9 },
  // Evo chain
  { id:'e-mit-evo1-2', source:'mit-lancer-evo1', target:'mit-lancer-evo2', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo2-3', source:'mit-lancer-evo2', target:'mit-lancer-evo3', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo3-4', source:'mit-lancer-evo3', target:'mit-lancer-evo4', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo4-5', source:'mit-lancer-evo4', target:'mit-lancer-evo5', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo5-6', source:'mit-lancer-evo5', target:'mit-lancer-evo6', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo6-7', source:'mit-lancer-evo6', target:'mit-lancer-evo7', type:'evolves_into', strength:0.9 },
  { id:'e-mit-evo7-8', source:'mit-lancer-evo7', target:'mit-lancer-evo8', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo8-9', source:'mit-lancer-evo8', target:'mit-lancer-evo9', type:'evolves_into', strength:0.95 },
  { id:'e-mit-evo9-10', source:'mit-lancer-evo9', target:'mit-lancer-evo10', type:'evolves_into', strength:0.9 },
  // Eclipse chain
  { id:'e-mit-ecl1-2', source:'mit-eclipse-1', target:'mit-eclipse-2', type:'evolves_into', strength:0.85 },
  { id:'e-mit-ecl2-3', source:'mit-eclipse-2', target:'mit-eclipse-3', type:'evolves_into', strength:0.8 },
  { id:'e-mit-ecl3-4', source:'mit-eclipse-3', target:'mit-eclipse-4', type:'evolves_into', strength:0.8 },
  // Outlander chain
  { id:'e-mit-out1-2', source:'mit-outlander-1', target:'mit-outlander-2', type:'evolves_into', strength:0.85 },
  { id:'e-mit-out2-3', source:'mit-outlander-2', target:'mit-outlander-3', type:'evolves_into', strength:0.85 },
  { id:'e-mit-out3-phev', source:'mit-outlander-3', target:'mit-outlander-phev', type:'variant_of', strength:0.85 },
  { id:'e-mit-out3-4', source:'mit-outlander-3', target:'mit-outlander-4', type:'evolves_into', strength:0.85 },
  // Pajero chain
  { id:'e-mit-paj1-2', source:'mit-pajero-1', target:'mit-pajero-2', type:'evolves_into', strength:0.85 },
  { id:'e-mit-paj2-3', source:'mit-pajero-2', target:'mit-pajero-3', type:'evolves_into', strength:0.85 },
  { id:'e-mit-paj3-4', source:'mit-pajero-3', target:'mit-pajero-4', type:'evolves_into', strength:0.9 },
  // 3000GT chain
  { id:'e-mit-3000gt-2', source:'mit-3000gt', target:'mit-3000gt-2', type:'evolves_into', strength:0.85 },
  // Eclipse inspired by Lancer Evo
  { id:'e-mit-ecl1-evo1', source:'mit-lancer-evo1', target:'mit-eclipse-1', type:'inspired_by', strength:0.5 },
]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0

for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else skipN++
}
for (const e of newEdges) {
  if (!existE.has(e.id)) { g.edges.push(e); addedE++ }
  else skipE++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`Mitsubishi: +${addedN} nodes (${skipN} skipped), +${addedE} edges (${skipE} skipped)`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
