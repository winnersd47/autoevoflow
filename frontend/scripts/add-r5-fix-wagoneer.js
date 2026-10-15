#!/usr/bin/env node
// Очередь: R5 (Renault) + попутный фикс Wagoneer, найденный тем же способом.
//  1. R5 — был только Gen.1 (1972). Добавляем Supercinq (1984, GT Turbo-спек
//     115hp) через evolves_into, и электрический ревайвл 2024 через inspired
//     ОТ Gen.1 напрямую (не от Supercinq) — дизайн 2024-го явно отсылает к
//     круглым фарам оригинала 1972-го, не к аэродинамике Supercinq 80-х.
//     Тот же паттерн независимых ревайвлов, что у Dodge Super Bee.
//  2. Wagoneer SJ(1962) -> WS(2021): 59 лет одним evolves_into. Имя реально
//     было мёртвым десятилетиями и возродилось — тот же случай, что
//     Charger B-body/Challenger E-body, которые для ТАКИХ разрывов везде
//     используют inspired, не evolves_into. Меняем тип ребра на inspired.
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

console.log('── Renault R5 Supercinq (1984) + E-Tech (2024) ──')
addNode({
  id: 'renault-r5-2-supercinq', label: 'R5 Supercinq', fullName: 'Renault 5 Supercinq (GT Turbo)',
  type: 'generation', year: 1984,
  brandId: 'renault', brandName: 'Renault', codeName: 'Supercinq GT Turbo',
  modelSlug: 'renault-r5', familyKey: 'renault-r5', bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 115, engineType: 'i4t',
  note: 'GT Turbo (1985) — легендарный раллийный хот-хэтч этого поколения; базовые версии слабее.',
})
addEdge('e-r5-1-supercinq', 'renault-r5-1', 'renault-r5-2-supercinq', 'evolves_into')

addNode({
  id: 'renault-r5-3-etech', label: 'R5 E-Tech', fullName: 'Renault 5 E-Tech Electric',
  type: 'generation', year: 2024,
  brandId: 'renault', brandName: 'Renault', codeName: 'AmpR Small',
  modelSlug: 'renault-r5', familyKey: 'renault-r5', bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 150, engineType: 'electric',
  note: 'Ретро-дизайн отсылает к круглым фарам оригинала 1972-го, а не к Supercinq; European Car of the Year 2025.',
})
addEdge('e-r5-1-etech', 'renault-r5-1', 'renault-r5-3-etech', 'inspired')

console.log('\n── Фикс Wagoneer SJ -> WS: evolves_into -> inspired (59 лет разрыва) ──')
const wagE = g.edges.find(e => e.id === 'jwag-sj-ws')
wagE.type = 'inspired'
console.log(`FIX  jwag-sj-ws: evolves_into -> inspired`)

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
