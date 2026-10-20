#!/usr/bin/env node
// Opel: бренд уже был на уровне "только топ-модели" (Kadett/Astra/Corsa/
// Vectra/Insignia/Omega/Manta/GT, без Calibra/Tigra/Meriva/Zafira/Mokka и
// т.п. — это осознанно не трогаем, см. общую политику "топ-только для
// остальных"). Но внутри уже отслеживаемых линеек нашлись реальные пропуски
// поколений:
//  - Kadett A(1962) --evolves_into--> Kadett C(1973) напрямую, пропущен
//    Kadett B (1965-1973) — а ребро Kadett A --derived_from--> Manta A(1970)
//    при этом явно перепутано: Manta A физически строилась на современной
//    ей платформе Kadett B, а не на уже снятой с производства в 1965г Kadett A.
//  - Astra обрывалась на K(2015), пропущено текущее 6-е поколение L(2021,
//    EMP2-платформа Stellantis — НЕ CMP, это отдельная платформа).
//  - Corsa обрывалась на C(2000) — пропущены сразу 3 поколения:
//    D(2006)/E(2014, официально фейслифт D, не новое поколение)/
//    F(2019, текущее, первое на платформе CMP, впервые с EV-версией Corsa-e).
// Проверил отдельно "возрождение" Manta GSe ElektroMOD (2021) — это НЕ новая
// серийная модель, а штучный шоу-кар/рестомод (оригинальный кузов Manta A,
// электропривод, 145hp) — в граф как узел-поколение не добавляю, это не тот
// же класс объекта.
// Источники: Wikipedia, automobile-catalog.com, cars-data.com, auto-data.net
// — проверено веб-поиском 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  g.nodes.push(node); byId.set(node.id, node)
  console.log(`  ✅ ${node.id} (${node.year}, ${node.hp} л.с.)`)
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function deleteEdge(id) {
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.id !== id)
  console.log(g.edges.length < before ? `  🗑️  удалено ребро ${id}` : `  ⚠️  ребро не найдено: ${id}`)
}
function retargetEdgeSource(id, newSource) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  console.log(`  🔀 ${id}: source ${e.source} → ${newSource}`)
  e.source = newSource
}

console.log('=== 1. Kadett B (1965): закрываем пропуск A→C ===')
addNode({
  id: 'opel-kadett-b', label: 'Kadett B (1965)',
  type: 'generation', year: 1965, brandId: 'opel', brandName: 'Opel',
  modelSlug: 'opel-kadett',
  bodyType: 'sedan', segment: 'compact', zone: 'hatchback',
  hp: 75, engineType: 'i4',
  note: 'Полный диапазон моторов 993-1897см³, 44-102hp (указан средний характерный трим ~75hp, как у соседних C/D). Кузова — седан/фастбек/купе/универсал (хэтчбек появится только с поколением C). Платформа — донор для Manta A (1970) — ребро с неё раньше ошибочно шло от уже снятой с производства в 1965г Kadett A.',
})
deleteEdge('e-op-ka-kc') // Kadett A --evolves_into--> Kadett C напрямую, пропуская B
addEdge('e-op-ka-kb', 'opel-kadett-a', 'opel-kadett-b', 'evolves_into', 0.9)
addEdge('e-op-kb-kc', 'opel-kadett-b', 'opel-kadett-c', 'evolves_into', 0.9)
retargetEdgeSource('e-op-ka-ma', 'opel-kadett-b') // Manta A (1970) донор — современная ей Kadett B, не Kadett A (сн. с произв. 1965)

console.log('\n=== 2. Astra L (2021): текущее 6-е поколение ===')
addNode({
  id: 'opel-astra-l', label: 'Astra L (2021)',
  type: 'generation', year: 2021, brandId: 'opel', brandName: 'Opel',
  codeName: 'C02', modelSlug: 'opel-astra',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 180, engineType: 'hybrid',
  note: '6-е (текущее) поколение — первая Astra на платформе EMP2 (Stellantis/PSA, НЕ CMP — та у меньшей Corsa F). Диапазон: 1.2 турбо-3 110hp, дизель 1.5 130hp, топ — PHEV 1.6 турбо 180hp (указан).',
})
addEdge('e-op-astk-astl', 'opel-astra-k', 'opel-astra-l', 'evolves_into', 0.9)

console.log('\n=== 3. Corsa D(2006)/E(2014)/F(2019): закрываем пропуск трёх поколений ===')
addNode({
  id: 'opel-corsa-d', label: 'Corsa D (2006)',
  type: 'generation', year: 2006, brandId: 'opel', brandName: 'Opel',
  modelSlug: 'opel-corsa',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 150, engineType: 'i4t',
  note: 'Диапазон 59-207hp (топ — OPC 1.6 турбо 207hp); указан средний спортивный трим 1.6 турбо ~150hp.',
})
addNode({
  id: 'opel-corsa-e', label: 'Corsa E (2014)',
  type: 'generation', year: 2014, brandId: 'opel', brandName: 'Opel',
  modelSlug: 'opel-corsa',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 115, engineType: 'i3t',
  note: 'Официально фейслифт D (та же платформа/поколение), а не новое поколение — добавлен новый мотор 1.0 турбо-3 (указан).',
})
addNode({
  id: 'opel-corsa-f', label: 'Corsa F (2019)',
  type: 'generation', year: 2019, brandId: 'opel', brandName: 'Opel',
  modelSlug: 'opel-corsa',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 136, engineType: 'ev',
  note: 'Текущее поколение — первое на платформе CMP (Stellantis), общей с Peugeot 208/DS3. Впервые есть полностью электрическая версия Corsa-e (указана: 136hp/50кВтч/330км WLTP) наравне с ДВС-линейкой.',
})
addEdge('e-op-cc-cd', 'opel-corsa-c', 'opel-corsa-d', 'evolves_into', 0.9)
addEdge('e-op-cd-ce', 'opel-corsa-d', 'opel-corsa-e', 'facelifted_to', 0.92)
addEdge('e-op-ce-cf', 'opel-corsa-e', 'opel-corsa-f', 'evolves_into', 0.9)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
