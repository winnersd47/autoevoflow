'use strict'
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))
const N = obj => obj
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newNodes = [
  // ══ DACIA ════════════════════════════════════════════════════════════════

  // ── Dacia 1300 (1969) — советская эпоха, Renault 12 под лицензией ─────────
  N({ id:'dacia-1300', label:'Dacia 1300 (1969)', year:1969,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-1300', familyKey:'dacia-1300',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'sedan',
      hp:54, engineType:'i4', codeName:'1300 / 1310' }),

  // ── Dacia Logan Gen.1 (2004) — революция бюджетного авто ─────────────────
  N({ id:'dacia-logan-1', label:'Dacia Logan Gen.1 (2004)', year:2004,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-logan', familyKey:'dacia-logan',
      type:'generation', bodyType:'sedan', segment:'subcompact', zone:'sedan',
      hp:75, engineType:'i4', codeName:'B0 / Logan' }),
  N({ id:'dacia-logan-2', label:'Dacia Logan Gen.2 (2012)', year:2012,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-logan-2', familyKey:'dacia-logan',
      type:'generation', bodyType:'sedan', segment:'subcompact', zone:'sedan',
      hp:90, engineType:'i4' }),
  N({ id:'dacia-logan-3', label:'Dacia Logan Gen.3 (2020)', year:2020,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-logan-3', familyKey:'dacia-logan',
      type:'generation', bodyType:'sedan', segment:'subcompact', zone:'sedan',
      hp:101, engineType:'i3t' }),

  // ── Dacia Sandero (2008) — хэтч на базе Logan ────────────────────────────
  N({ id:'dacia-sandero-1', label:'Dacia Sandero Gen.1 (2008)', year:2008,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-sandero', familyKey:'dacia-sandero',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:75, engineType:'i4' }),
  N({ id:'dacia-sandero-3', label:'Dacia Sandero Gen.3 (2020)', year:2020,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-sandero-3', familyKey:'dacia-sandero',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:91, engineType:'i3t' }),

  // ── Dacia Duster (2010) — народный кроссовер ─────────────────────────────
  N({ id:'dacia-duster-1', label:'Dacia Duster Gen.1 (2010)', year:2010,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-duster', familyKey:'dacia-duster',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv',
      hp:105, engineType:'i4' }),
  N({ id:'dacia-duster-2', label:'Dacia Duster Gen.2 (2018)', year:2018,
      brandId:'dacia', brandName:'Dacia', modelSlug:'dacia-duster-2', familyKey:'dacia-duster',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv',
      hp:130, engineType:'i4t' }),

  // ══ DAIHATSU ═════════════════════════════════════════════════════════════

  // ── Daihatsu Charade Gen.1 (1977) — пионер малолитражек ──────────────────
  N({ id:'daihatsu-charade-1', label:'Daihatsu Charade Gen.1 (1977)', year:1977,
      brandId:'daihatsu', brandName:'Daihatsu', modelSlug:'daihatsu-charade', familyKey:'daihatsu-charade',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:55, engineType:'i3' }),
  N({ id:'daihatsu-charade-4', label:'Daihatsu Charade Gen.4 (1993)', year:1993,
      brandId:'daihatsu', brandName:'Daihatsu', modelSlug:'daihatsu-charade-4', familyKey:'daihatsu-charade',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:105, engineType:'i3t', codeName:'GTti' }),

  // ── Daihatsu Terios (1997) — компактный SUV ───────────────────────────────
  N({ id:'daihatsu-terios-1', label:'Daihatsu Terios Gen.1 (1997)', year:1997,
      brandId:'daihatsu', brandName:'Daihatsu', modelSlug:'daihatsu-terios', familyKey:'daihatsu-terios',
      type:'generation', bodyType:'suv', segment:'compact_suv', zone:'suv',
      hp:95, engineType:'i4' }),

  // ── Daihatsu Copen (2002) — kei roadster ─────────────────────────────────
  N({ id:'daihatsu-copen-1', label:'Daihatsu Copen Gen.1 (2002)', year:2002,
      brandId:'daihatsu', brandName:'Daihatsu', modelSlug:'daihatsu-copen', familyKey:'daihatsu-copen',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:64, engineType:'i3t', codeName:'L880K' }),
  N({ id:'daihatsu-copen-2', label:'Daihatsu Copen Gen.2 (2014)', year:2014,
      brandId:'daihatsu', brandName:'Daihatsu', modelSlug:'daihatsu-copen-2', familyKey:'daihatsu-copen',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:64, engineType:'i3t', codeName:'LA400K Robe/Cero' }),
]

const newEdges = [
  // Dacia
  // Dacia 1300 ← Renault 12 (лицензия)
  E('e-dac-1300-r12',  'dacia-1300',      'dacia-logan-1',   'inspired_by', 0.60),
  E('e-dac-log1-log2', 'dacia-logan-1',   'dacia-logan-2',   'evolves_into'),
  E('e-dac-log2-log3', 'dacia-logan-2',   'dacia-logan-3',   'evolves_into'),
  // Logan → Sandero (производный хэтч)
  E('e-dac-log1-san1', 'dacia-logan-1',   'dacia-sandero-1', 'derived_from', 0.90),
  E('e-dac-san1-san3', 'dacia-sandero-1', 'dacia-sandero-3', 'evolves_into'),
  E('e-dac-dus1-dus2', 'dacia-duster-1',  'dacia-duster-2',  'evolves_into'),
  // Logan платформа CMF-B ← Renault Clio
  E('e-dac-log3-clio',  'dacia-logan-3',   'renault-clio-5',  'shares_platform', 0.85),

  // Daihatsu
  E('e-dai-cha1-cha4', 'daihatsu-charade-1','daihatsu-charade-4','evolves_into'),
  E('e-dai-cop1-cop2', 'daihatsu-copen-1',  'daihatsu-copen-2', 'evolves_into'),
  // Terios → Toyota Rush (ребейдж)
  E('e-dai-ter-rush',  'daihatsu-terios-1', 'daihatsu-charade-4','inspired_by', 0.55),
  // Copen — близнец Suzuki Cappuccino по духу kei sports
  E('e-dai-cop-cap',   'daihatsu-copen-1',  'suzuki-cappuccino', 'influenced_by', 0.70),
]

// Проверяем anchor Renault Clio
const cl5=g.nodes.find(n=>n.id==='renault-clio-5')
console.log('Renault Clio 5:', cl5?'ЕСТЬ':'ОТСУТСТВУЕТ')
const cl=g.nodes.filter(n=>n.id&&n.id.includes('clio'))
cl.forEach(n=>console.log('  CLIO:',n.id,n.year))

let addedN=0, addedE=0, skipN=0, skipE=0
for(const n of newNodes){
  if(!existN.has(n.id)){g.nodes.push(n);addedN++}
  else{console.log('  SKIP node:',n.id);skipN++}
}
for(const e of newEdges){
  if(!existE.has(e.id)){
    const s=g.nodes.find(n=>n.id===e.source), t=g.nodes.find(n=>n.id===e.target)
    if(!s){console.log('  SKIP edge '+e.id+': нет source '+e.source);skipE++;continue}
    if(!t){console.log('  SKIP edge '+e.id+': нет target '+e.target);skipE++;continue}
    g.edges.push(e);addedE++
  }else{console.log('  SKIP edge:',e.id);skipE++}
}
fs.writeFileSync(GRAPH, JSON.stringify(g,null,2))
console.log('Dacia+Daihatsu: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:',g.nodes.length,'nodes,',g.edges.length,'edges')
