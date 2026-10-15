#!/usr/bin/env node
// У Silverado не было ни одной модификации — только цепочка поколений.
// SS повисает на Gen.1 (2003, ещё в рамках его 1999-2006 цикла), ZR2/ZR2
// Bison/EV — на Gen.4 (2019+, реальные годы запуска), не на Gen.5 (2027,
// та ещё не вышла — рано вешать на неё конкретные тримы).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node, parentId, edgeType, strength) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  graph.nodes.push(node); byId.set(node.id, node)
  graph.edges.push({ id: `${parentId}-to-${node.id}`, source: parentId, target: node.id, type: edgeType, strength })
  console.log(`  ✅ ${node.id} (${node.hp} л.с.) ← ${edgeType} ← ${parentId}`)
}

addNode({
  id: 'chev-silverado-ss', label: 'Silverado SS', fullName: 'Chevrolet Silverado SS',
  type: 'generation', year: 2003, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-silverado-ss', bodyType: 'pickup', segment: 'truck', zone: 'sports',
  hp: 345, engineType: 'v8', familyKey: 'chev-silverado',
  note: 'Vortec 6.0L V8, 345hp/380lb-ft. Единственный полноприводный (AWD, не отключаемый 4WD) пикап Silverado — спортивная подвеска, 4-дисковые тормоза. 2003-2007гг.',
}, 'chev-silverado-1', 'variant_of', 0.75)

addNode({
  id: 'chev-silverado-zr2', label: 'Silverado ZR2', fullName: 'Chevrolet Silverado 1500 ZR2',
  type: 'generation', year: 2022, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-silverado-zr2', bodyType: 'pickup', segment: 'truck', zone: 'offroad',
  hp: 420, engineType: 'v8', familyKey: 'chev-silverado',
  note: '6.2L V8, 420hp/460lb-ft (есть и дизель 3.0L Duramax, 305hp). 33" внедорожные шины, электронные блокировки диффов, off-road режим. Конкурент Ford F-150 Raptor/Ram TRX.',
}, 'chev-silverado-4', 'variant_of', 0.75)

addNode({
  id: 'chev-silverado-zr2-bison', label: 'Silverado ZR2 Bison', fullName: 'Chevrolet Silverado ZR2 Bison',
  type: 'generation', year: 2023, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-silverado-zr2-bison', bodyType: 'pickup', segment: 'truck', zone: 'offroad',
  hp: 420, engineType: 'v8', isLimited: true, familyKey: 'chev-silverado',
  note: 'Заводская коллаборация с AEV (American Expedition Vehicles) — усиленные бамперы AEV с улучшенными углами въезда/съезда, доп. защита днища, передняя точка эвакуации. Тот же 6.2L V8, что у обычного ZR2.',
}, 'chev-silverado-zr2', 'variant_of', 0.8)

addNode({
  id: 'chev-silverado-ev', label: 'Silverado EV', fullName: 'Chevrolet Silverado EV',
  type: 'generation', year: 2024, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-silverado-ev', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
  hp: 510, engineType: 'ev', familyKey: 'chev-silverado',
  note: 'Платформа Ultium "с нуля" (не переделка ICE-версии). 510hp/615lb-ft стандартно, до 754hp/785lb-ft в форсированном режиме Wide Open Watts (First Edition RST). До 450 миль запаса хода EPA, зарядка до 350кВт, 0-60 менее 4.5с в макс.режиме.',
}, 'chev-silverado-4', 'variant_of', 0.8)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
