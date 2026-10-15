'use strict'
const fs = require('fs')
const path = require('path')

const latest = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/data/latest-cars.json'),'utf8'))
const graph  = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/data/evolution/graph.json'),'utf8'))

const BRAND_MAP = {
  'mercedes-benz':'mercedes','mercedes':'mercedes','bmw':'bmw','audi':'audi',
  'volkswagen':'volkswagen','porsche':'porsche','ferrari':'ferrari','lamborghini':'lamborghini',
  'mclaren':'mclaren','aston-martin':'astonmartin','aston martin':'astonmartin',
  'bugatti':'bugatti','pagani':'pagani','koenigsegg':'koenigsegg','rimac':'rimac',
  'toyota':'toyota','lexus':'lexus','honda':'honda','nissan':'nissan','mazda':'mazda',
  'subaru':'subaru','mitsubishi':'mitsubishi','alfa-romeo':'alfa-romeo','alfa romeo':'alfa-romeo',
  'maserati':'maserati','lotus':'lotus','jaguar':'jaguar','land-rover':'land-rover',
  'kia':'kia','hyundai':'hyundai','genesis':'genesis','acura':'acura','infiniti':'infiniti',
  'ford':'ford','chevrolet':'chevrolet','dodge':'dodge','cadillac':'cadillac',
  'peugeot':'peugeot','renault':'renault','seat':'seat','skoda':'skoda',
  'rolls-royce':'rolls-royce','rolls royce':'rolls-royce','bentley':'bentley',
  'alpine':'renault',
}
function normBrand(s){ return BRAND_MAP[s?.toLowerCase()] || s?.toLowerCase() }

// Индекс рёбер по id ноды
const edgeMap = {}
for (const e of graph.edges){
  if (!edgeMap[e.source]) edgeMap[e.source]=[]
  if (!edgeMap[e.target]) edgeMap[e.target]=[]
  edgeMap[e.source].push(e)
  edgeMap[e.target].push(e)
}
const byId = Object.fromEntries(graph.nodes.map(n=>[n.id,n]))

const cars  = (latest.cars || []).slice(0, 50)
const conn  = []   // есть chain-ребро
const part  = []   // нода есть, chain нет
const orph  = []   // ноды нет

for (const car of cars) {
  const brandId = normBrand(car.brandSlug || (car.brand||'').toLowerCase().replace(/\s+/g,'-'))
  const tokens  = (car.name||car.fullName||'').toLowerCase()
    .split(/\s+/)
    .filter(t => t.length>2 && !/^\d{4}$/.test(t) && !['the','new','and','for','all'].includes(t))

  const brandNodes = graph.nodes.filter(n => n.brandId === brandId)
  if (!brandNodes.length) { orph.push({car, brandId}); continue }

  const scored = brandNodes.map(n => ({
    node: n,
    score: tokens.filter(t => n.label.toLowerCase().includes(t)).length
  })).filter(x => x.score > 0).sort((a,b) => b.score - a.score)

  const match = scored[0]?.node
  if (!match) { orph.push({car, brandId}); continue }

  const edges = edgeMap[match.id] || []
  const chain = edges.filter(e => ['evolves_into','variant_of','facelifted_to'].includes(e.type))
  const cross = edges.filter(e => ['inspired_by','derived_from','concept_to_production'].includes(e.type))

  // Ближайший предок
  const prevEdge = graph.edges.find(e => e.target === match.id && e.type === 'evolves_into')
  const prev     = prevEdge ? byId[prevEdge.source] : null

  if (chain.length > 0) conn.push({car, match, chain: chain.length, cross: cross.length, prev})
  else                  part.push({car, match, cross: cross.length, prev})
}

console.log('=== СВЯЗАНЫ В ЭВОЛЮЦИОННОЙ ЦЕПОЧКЕ ===')
for (const r of conn) {
  const prevStr = r.prev ? '  <-- ' + r.prev.label + ' (' + r.prev.year + ')' : ''
  console.log('  [OK] ' + (r.car.name||r.car.fullName))
  console.log('       граф: ' + r.match.label + ' (' + r.match.year + ')' + prevStr)
  console.log('       chain:' + r.chain + '  cross:' + r.cross)
}

console.log('\n=== НОДА НАЙДЕНА, НО НЕ В ЦЕПОЧКЕ ===')
for (const r of part) {
  console.log('  [~] ' + (r.car.name||r.car.fullName))
  console.log('      граф: ' + r.match.label + ' (' + r.match.year + ')' + '  cross:' + r.cross)
}

console.log('\n=== НЕТ НОДЫ В ГРАФЕ (нет истории) ===')
for (const r of orph) {
  console.log('  [?] ' + (r.car.name||r.car.fullName) + '  brand=' + r.brandId)
}

console.log('\n--- ИТОГО: ' + conn.length + ' связаны | ' + part.length + ' частично | ' + orph.length + ' без нод ---')
