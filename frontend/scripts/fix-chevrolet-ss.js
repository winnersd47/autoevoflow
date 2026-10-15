#!/usr/bin/env node
// "Больше нет никаких SS?" — проверил, нашлось два реальных пробела:
//  - Chevelle/Malibu SS 396 (1966) и SS 454 LS6 (1970, легендарный
//    one-year-only пакет) — были только упомянуты в note базовых узлов,
//    без собственных узлов/рёбер, хотя это одни из самых культово
//    значимых маслкаров в истории бренда.
//  - Blazer EV SS (2025) — совсем новый, ещё не отслеживался.
// Проверено и НЕ добавлено: K5/S-10 Blazer SS никогда не существовал
// (источники явно подтверждают отсутствие такого пакета) — не выдумываем.
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
  id: 'chev-malibu1-ss396', label: 'Chevelle SS 396', fullName: 'Chevrolet Chevelle SS 396 (L78)',
  type: 'generation', year: 1966, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'L78', modelSlug: 'chev-malibu1-ss396',
  bodyType: 'coupe', segment: 'muscle', zone: 'muscle',
  hp: 375, engineType: 'v8', engineCC: 6489, familyKey: 'chev-malibu',
  note: 'Топ-версия L78 396ci V8 — 375hp/415lb-ft (базовый 396 — 325hp, средний L34 — 360hp). Один из культовых маслкаров эпохи наравне с Chevelle SS 454.',
}, 'chev-malibu-1', 'variant_of', 0.7)

addNode({
  id: 'chev-malibu2-ss454', label: 'Chevelle SS 454 LS6', fullName: 'Chevrolet Chevelle SS 454 LS6',
  type: 'generation', year: 1970, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'LS6', modelSlug: 'chev-malibu2-ss454',
  bodyType: 'coupe', segment: 'muscle', zone: 'muscle',
  hp: 450, engineType: 'v8', engineCC: 7440, isLimited: true, familyKey: 'chev-malibu',
  note: 'Пакет только для 1970г. — solid-lifter 454ci V8, официально (заниженно) заявлено 450hp/500lb-ft. На момент выпуска — самый мощный серийный автомобиль в истории Chevrolet. Один из самых легендарных маслкаров эры вообще.',
}, 'chev-malibu-2', 'variant_of', 0.75)

addNode({
  id: 'chev-blazer-ev-ss', label: 'Blazer EV SS', fullName: 'Chevrolet Blazer EV SS',
  type: 'generation', year: 2025, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'SS', modelSlug: 'chev-blazer-ev-ss',
  bodyType: 'suv', segment: 'exec', zone: 'electric',
  hp: 615, engineType: 'ev', familyKey: 'chev-blazer',
  note: '615hp/650lb-ft, полный привод, запас хода 302мили EPA, от $62062. Первое применение бейджа SS на электромобиле Chevrolet — и первый SS вообще в текущей линейке Blazer.',
}, 'chev-blazer-ev', 'variant_of', 0.8)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
