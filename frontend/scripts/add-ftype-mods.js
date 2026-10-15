#!/usr/bin/env node
// Точечная правка F-Type: между базой (380hp) и SVR (575hp) отсутствовал
// промежуточный трим R — SVR висел прямо на базе, как будто это соседние
// тримы, хотя реально R был ступенью между ними. Тот же паттерн, что чинили
// у Dodge (SRT8/Hellcat вместо прямого R/T->топ-трим).
// Плюс два значимых лимитированных издания: Project 7 (2014, спидстер в
// честь D-Type, 250 экз., от шасси R) и F-Type 75 (2023, финальное издание
// перед полным снятием модели с производства в 2024-м).
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  if (g.edges.some(e => e.id === id)) { console.log(`SKIP edge (exists): ${id}`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}
const retargetSource = (edgeId, newSource) => {
  const e = g.edges.find(x => x.id === edgeId)
  const old = e.source
  e.source = newSource
  console.log(`RETARGET ${edgeId}: source ${byId[old].label} -> ${byId[newSource].label}`)
}

console.log('── F-Type R (2014) — недостающий промежуточный трим ──')
addNode({ id: 'jag-ftype-r-2014', label: 'F-Type R', fullName: 'Jaguar F-Type R',
  type: 'generation', year: 2014, brandId: 'jaguar', brandName: 'Jaguar', codeName: 'AJ133 R',
  modelSlug: 'jaguar-f-type-svr', bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 550, engineType: 'v8s',
  note: '5.0L supercharged V8 — топ-трим до появления SVR в 2016-м.' })
addEdge('e-ftype-r2014', 'jag-ftype', 'jag-ftype-r-2014', 'variant_of')
retargetSource('jaguar-ftype-variant-svr', 'jag-ftype-r-2014')

console.log('\n── F-Type Project 7 (2014) — лимитка от R, в честь D-Type ──')
addNode({ id: 'jag-ftype-project7', label: 'F-Type Project 7', fullName: 'Jaguar F-Type Project 7',
  type: 'generation', year: 2014, brandId: 'jaguar', brandName: 'Jaguar', codeName: 'Project 7',
  modelSlug: 'jaguar-f-type', bodyType: 'roadster', segment: 'supercar', zone: 'supercar',
  hp: 575, engineType: 'v8s', isLimited: true,
  note: 'Спидстер без крыши в честь гоночного D-Type "Project 7" 1964 года; тираж 250 экз. по всему миру.' })
addEdge('e-ftyper2014-project7', 'jag-ftype-r-2014', 'jag-ftype-project7', 'variant_of')

console.log('\n── F-Type 75 (2023) — финальное издание перед концом производства ──')
addNode({ id: 'jag-ftype-75', label: 'F-Type 75', fullName: 'Jaguar F-Type 75',
  type: 'generation', year: 2023, brandId: 'jaguar', brandName: 'Jaguar', codeName: 'AJ133 75th',
  modelSlug: 'jaguar-f-type-svr', bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 575, engineType: 'v8s', isLimited: true,
  note: 'Юбилейное издание к 75-летию Jaguar; последняя спецверсия перед полным снятием F-Type с производства в 2024-м.' })
addEdge('e-ftyper2021-75', 'jag-ftype-r-2021', 'jag-ftype-75', 'variant_of')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
