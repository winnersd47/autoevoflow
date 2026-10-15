'use strict'
const fs = require('fs')
const GRAPH = 'C:/Users/v.serdyuk/Documents/AIGrowth/AutoEvoFlow/frontend/public/data/evolution/graph.json'
const g = JSON.parse(fs.readFileSync(GRAPH,'utf-8'))
const existingIds = new Set(g.nodes.map(n=>n.id))
const existingEdges = (s,t,tp) => g.edges.some(e=>e.source===s&&e.target===t&&e.type===tp)

const nodes = [
  // Grand Cherokee: WJ и WK — пропущены между ZJ (1992) и WK2 (2010)
  { id:'jeep-grand-cherokee-wj', label:'Grand Cherokee WJ', type:'generation', year:1999, brandId:'jeep', brandName:'Jeep', codeName:'WJ', modelSlug:'jeep-grand-cherokee', bodyType:'suv', segment:'other', zone:'suv_mid', hp:235, engineType:'v8n' },
  { id:'jeep-grand-cherokee-wk', label:'Grand Cherokee WK', type:'generation', year:2005, brandId:'jeep', brandName:'Jeep', codeName:'WK', modelSlug:'jeep-grand-cherokee', bodyType:'suv', segment:'other', zone:'suv_mid', hp:325, engineType:'v8n' },
  // Cherokee (отдельная линейка): XJ -> KJ -> KK -> KL
  { id:'jeep-cherokee-kj', label:'Cherokee KJ', type:'generation', year:2002, brandId:'jeep', brandName:'Jeep', codeName:'KJ', modelSlug:'jeep-cherokee', bodyType:'suv', segment:'other', zone:'suv_compact', hp:210, engineType:'v6n' },
  { id:'jeep-cherokee-kk', label:'Cherokee KK', type:'generation', year:2008, brandId:'jeep', brandName:'Jeep', codeName:'KK', modelSlug:'jeep-cherokee', bodyType:'suv', segment:'other', zone:'suv_compact', hp:210, engineType:'v6n' },
  { id:'jeep-cherokee-kl', label:'Cherokee KL', type:'generation', year:2014, brandId:'jeep', brandName:'Jeep', codeName:'KL', modelSlug:'jeep-cherokee', bodyType:'suv', segment:'other', zone:'suv_compact', hp:271, engineType:'v6n' },
  // Compass: MK1 -> MP
  { id:'jeep-compass-mk1', label:'Compass MK1', type:'generation', year:2007, brandId:'jeep', brandName:'Jeep', codeName:'MK49', modelSlug:'jeep-compass', bodyType:'suv', segment:'other', zone:'suv_compact', hp:172, engineType:'i4n' },
  { id:'jeep-compass-mp',  label:'Compass MP',  type:'generation', year:2017, brandId:'jeep', brandName:'Jeep', codeName:'MP',   modelSlug:'jeep-compass', bodyType:'suv', segment:'other', zone:'suv_compact', hp:180, engineType:'i4t' },
  // Renegade (на платформе Fiat 500X)
  { id:'jeep-renegade-bu', label:'Renegade BU', type:'generation', year:2015, brandId:'jeep', brandName:'Jeep', codeName:'BU', modelSlug:'jeep-renegade', bodyType:'suv', segment:'other', zone:'suv_compact', hp:180, engineType:'i4t' },
  // Wagoneer классика + новый
  { id:'jeep-wagoneer-sj', label:'Wagoneer SJ',       type:'generation', year:1962, brandId:'jeep', brandName:'Jeep', codeName:'SJ',       modelSlug:'jeep-wagoneer',       bodyType:'suv', segment:'other', zone:'suv_large', hp:230, engineType:'v8n' },
  { id:'jeep-wagoneer-ws', label:'Wagoneer WS',        type:'generation', year:2021, brandId:'jeep', brandName:'Jeep', codeName:'WS',       modelSlug:'jeep-wagoneer',       bodyType:'suv', segment:'other', zone:'suv_large', hp:305, engineType:'v6n' },
  { id:'jeep-grand-wagoneer-ws', label:'Grand Wagoneer WS', type:'generation', year:2021, brandId:'jeep', brandName:'Jeep', codeName:'WS Grand', modelSlug:'jeep-grand-wagoneer', bodyType:'suv', segment:'other', zone:'suv_large', hp:471, engineType:'v8n' },
  // Commander XK (на базе Grand Cherokee WK)
  { id:'jeep-commander-xk', label:'Commander XK', type:'generation', year:2006, brandId:'jeep', brandName:'Jeep', codeName:'XK', modelSlug:'jeep-commander', bodyType:'suv', segment:'other', zone:'suv_large', hp:325, engineType:'v8n' },
  // Avenger (EV, Европа, 2023)
  { id:'jeep-avenger-1', label:'Avenger', type:'generation', year:2023, brandId:'jeep', brandName:'Jeep', codeName:'BV', modelSlug:'jeep-avenger', bodyType:'suv', segment:'other', zone:'electric', hp:156, engineType:'ev' },
]

let addedN = 0
for (const n of nodes) {
  if (!existingIds.has(n.id)) { g.nodes.push(n); existingIds.add(n.id); addedN++; console.log('+ нод:', n.year, n.label) }
}

// Удалить прямой ZJ->WK2 (теперь через WJ и WK)
const before = g.edges.length
g.edges = g.edges.filter(e => !(e.source==='jeep-grand-cherokee-zj' && e.target==='jeep-grand-cherokee-wk2'))
if (g.edges.length < before) console.log('x удалено ZJ->WK2 (прямой шорткат)')

const edges = [
  // Grand Cherokee полная цепочка
  { id:'jgc-zj-wj',   source:'jeep-grand-cherokee-zj',  target:'jeep-grand-cherokee-wj',  type:'evolves_into' },
  { id:'jgc-wj-wk',   source:'jeep-grand-cherokee-wj',  target:'jeep-grand-cherokee-wk',  type:'evolves_into' },
  { id:'jgc-wk-wk2',  source:'jeep-grand-cherokee-wk',  target:'jeep-grand-cherokee-wk2', type:'evolves_into' },
  // Commander — на базе Grand Cherokee WK
  { id:'jcmd-wk-xk',  source:'jeep-grand-cherokee-wk',  target:'jeep-commander-xk',       type:'shares_platform' },
  // Cherokee линейка
  { id:'jchr-xj-kj',  source:'jeep-cherokee-xj',        target:'jeep-cherokee-kj',        type:'evolves_into' },
  { id:'jchr-kj-kk',  source:'jeep-cherokee-kj',        target:'jeep-cherokee-kk',        type:'facelifted_to' },
  { id:'jchr-kk-kl',  source:'jeep-cherokee-kk',        target:'jeep-cherokee-kl',        type:'evolves_into' },
  // Compass линейка
  { id:'jcomp-mk-mp', source:'jeep-compass-mk1',        target:'jeep-compass-mp',         type:'evolves_into' },
  // Compass MK1 shares_platform с Patriot (и Dodge Caliber) — оставим просто нод
  // Wagoneer: классика -> новый (большой gap ~30 лет)
  { id:'jwag-sj-ws',  source:'jeep-wagoneer-sj',        target:'jeep-wagoneer-ws',        type:'evolves_into' },
  // Grand Wagoneer — premium вариант Wagoneer WS
  { id:'jwag-ws-gws', source:'jeep-wagoneer-ws',        target:'jeep-grand-wagoneer-ws',  type:'variant_of' },
  // Wrangler JL -> Wagoneer WS: inspired (модульная платформа T6)
  { id:'jwag-jl-ws',  source:'jeep-wrangler-jl',        target:'jeep-wagoneer-ws',        type:'shares_platform' },
]

let addedE = 0
for (const e of edges) {
  if (!existingEdges(e.source, e.target, e.type)) {
    g.edges.push(e); addedE++
    console.log('+', e.type.padEnd(15), e.source.replace('jeep-',''), '->', e.target.replace('jeep-',''))
  }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('\nИтого: нодов +' + addedN + ', рёбер +' + addedE)
console.log('Jeep в графе:', g.nodes.filter(n=>n.brandId==='jeep').length, 'нодов')
