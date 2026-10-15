#!/usr/bin/env node
// Точечное добавление: Renault Espace в графе был представлен только Gen.I
// (1984) и Gen.V (2023), соединёнными ОДНИМ прямым evolves_into через 39 лет —
// пропущены три реальных поколения (II 1991, III 1996, IV 2002). Добавляем их
// и перешиваем цепочку I → II → III → IV → V, убирая старый edge-«срезку».
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

let addedN = 0, addedE = 0, removedE = 0
const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n; addedN++
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  addedE++; console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}

console.log('── Убираю старую срезку Espace I -> Espace V ──')
const before = g.edges.length
g.edges = g.edges.filter(e => e.id !== 'e-espace1-5')
removedE = before - g.edges.length
console.log(`Removed ${removedE} edge(s)`)

console.log('── Espace II/III/IV ──')
addNode({
  id: 'renault-espace-2', label: 'Espace II', fullName: 'Renault Espace II',
  type: 'generation', year: 1991,
  brandId: 'renault', brandName: 'Renault', modelSlug: 'renault-espace-2', familyKey: 'renault-espace',
  bodyType: 'van', segment: 'mainstream', zone: 'suv_mid',
  hp: 167, engineType: 'v6',
  description: 'Всё ещё композитный кузов от Matra; топ-версия Quadra — 2.9 V6 с полным приводом.',
})
addNode({
  id: 'renault-espace-3', label: 'Espace III', fullName: 'Renault Espace III',
  type: 'generation', year: 1996,
  brandId: 'renault', brandName: 'Renault', modelSlug: 'renault-espace-3', familyKey: 'renault-espace',
  bodyType: 'van', segment: 'mainstream', zone: 'suv_mid',
  hp: 207, engineType: 'v6',
  description: 'Первый Espace на платформе, разделённой с Safrane; топ-мотор 3.0 V6 24V.',
})
addNode({
  id: 'renault-espace-4', label: 'Espace IV', fullName: 'Renault Espace IV',
  type: 'generation', year: 2002,
  brandId: 'renault', brandName: 'Renault', modelSlug: 'renault-espace-4', familyKey: 'renault-espace',
  bodyType: 'van', segment: 'mainstream', zone: 'suv_mid',
  hp: 245, engineType: 'v6',
  description: 'Самое долгое поколение (2002–2015); пиковый мотор — 3.5 V6 245 л.с. в топ-версии Initiale.',
})

addEdge('e-espace1-2', 'renault-espace-1', 'renault-espace-2', 'evolves_into')
addEdge('e-espace2-3', 'renault-espace-2', 'renault-espace-3', 'evolves_into')
addEdge('e-espace3-4', 'renault-espace-3', 'renault-espace-4', 'evolves_into')
addEdge('e-espace4-5', 'renault-espace-4', 'renault-espace-5', 'evolves_into')

console.log(`\nAdded ${addedN} nodes, ${addedE} edges. Removed ${removedE} edge.`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
