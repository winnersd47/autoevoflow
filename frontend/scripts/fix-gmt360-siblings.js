#!/usr/bin/env node
// 5 близнецов TrailBlazer на платформе GMT360 — все с одной линии в
// Морейне, Огайо (2002-2009). Замыкает кросс-брендовую находку по Blazer.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addSibling(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  graph.nodes.push(node); byId.set(node.id, node)
  graph.edges.push({ id: `e-trailblazer-${node.id}`, source: 'chev-trailblazer', target: node.id, type: 'shares_platform', strength: 0.9 })
  console.log(`  ✅ TrailBlazer <--shares_platform--> ${node.id} (${node.hp}hp, ${node.brandName})`)
}

addSibling({ id: 'olds-bravada-gmt360', label: 'Bravada', fullName: 'Oldsmobile Bravada (GMT360)',
  type: 'generation', year: 2002, brandId: 'oldsmobile', brandName: 'Oldsmobile',
  modelSlug: 'olds-bravada-gmt360', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
  hp: 270, engineType: 'i6',
  note: 'Первый из шести близнецов GMT360, представлен раньше остальных. 4.2L Atlas I6, 270hp — тот же мотор, что у TrailBlazer/Envoy. Первый заднеприводный Oldsmobile с 1992г. (Custom Cruiser). Бренд Oldsmobile закрыт в 2004г. — Bravada стала одной из последних его моделей.' })

addSibling({ id: 'gmc-envoy-1', label: 'Envoy', fullName: 'GMC Envoy',
  type: 'generation', year: 2002, brandId: 'gmc', brandName: 'GMC',
  modelSlug: 'gmc-envoy', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
  hp: 270, engineType: 'i6',
  note: '4.2L Atlas I6, 270hp, 4-АКПП. Более "премиальное" позиционирование внутри GM, чем TrailBlazer — прямая аналогия с парой Blazer/Jimmy поколением раньше.' })

addSibling({ id: 'buick-rainier', label: 'Rainier', fullName: 'Buick Rainier',
  type: 'generation', year: 2004, brandId: 'buick', brandName: 'Buick',
  modelSlug: 'buick-rainier', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
  hp: 290, engineType: 'v8',
  note: 'Топ-версия — 5.3L V8, 290hp/325lb-ft (база — 4.2L I6, 275hp). Самое "люксовое" позиционирование в семье GMT360 после Saab.' })

addSibling({ id: 'isuzu-ascender', label: 'Ascender', fullName: 'Isuzu Ascender',
  type: 'generation', year: 2003, brandId: 'isuzu', brandName: 'Isuzu',
  modelSlug: 'isuzu-ascender', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
  hp: 285, engineType: 'v8',
  note: '5.3L V8, 285hp/325lb-ft (база — 4.2L I6, 275hp). Самый редкий из шести близнецов GMT360 — Isuzu сворачивала присутствие на рынке легковых авто в США в этот период.' })

addSibling({ id: 'saab-9-7x', label: '9-7X', fullName: 'Saab 9-7X',
  type: 'generation', year: 2005, brandId: 'saab', brandName: 'Saab',
  modelSlug: 'saab-9-7x', bodyType: 'suv', segment: 'exec', zone: 'suv_large',
  hp: 300, engineType: 'v8',
  note: 'Последний и самый спорный из шести близнецов GMT360 — единственный в истории Saab внедорожник, воспринят фанатами марки как разбавление идентичности бренда под давлением GM. Топ-версия Arc — 5.3L V8, 300hp/330lb-ft (база Linear — 4.2L I6, 275-285hp).' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
