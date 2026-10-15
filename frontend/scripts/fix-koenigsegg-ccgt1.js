#!/usr/bin/env node
// Koenigsegg CCGT1 (ncs-koenigsegg-2027-ccgt1) висел в графе без единой связи —
// исследовано вживую (Koenigsegg.com, Top Gear, Carscoops, Autoblog, PistonHeads):
// реальная, подтверждённая машина, показана 13 авг. 2026 на Monterey Car Week.
// Построена на платформе CC850, тот же 5.0T V8 (1280hp бензин / 1600hp E85),
// первый в истории Koenigsegg заводской Track Package (карбоновый каркас
// безопасности, ковши HANS, 6-точечные ремни, огнетушение, пневмодомкраты,
// трековая резина — съёмный комплект, не эксклюзивно трековая машина). 70 экз.,
// уже все распределены.
//
// Заодно нашли: engineType у узла был неверный (i4t — рядная турбочетвёрка),
// должен быть v8t как у остальной линейки CC850/Jesko.
//
// Историческая "CCGT1" 2007-2008 года на самом деле называлась просто "CCGT"
// (без единицы) — чистая гоночная машина для FIA GT1, так и не стартовавшая
// (регламент GT1 переписали посреди обкатки, омологация не состоялась).
// Единственный экземпляр. Добавляем отдельным узлом, не путать с новым CCGT1.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⏭  узел уже есть:', node.id); return }
  graph.nodes.push(node)
  byId.set(node.id, node)
  console.log('  ✅ узел:', node.id, '-', node.label)
}
function addEdge(id, source, target, type, extra = {}) {
  if (graph.edges.some(e => e.id === id)) { console.log('  ⏭  ребро уже есть:', id); return }
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  пропущено ребро (нет узла):', id); return }
  graph.edges.push({ id, source, target, type, strength: 0.8, ...extra })
  console.log('  ✅ ребро:', source, '--' + type + '-->', target)
}

console.log('=== Исправляю данные CCGT1 (2027) ===')
const ccgt1 = byId.get('ncs-koenigsegg-2027-ccgt1')
if (ccgt1) {
  ccgt1.engineType = 'v8t' // было i4t — ошибка
  ccgt1.hp = 1600 // E85, как у остальной линейки (Jesko/Jesko Absolut/Gemera тоже указаны по E85)
  ccgt1.isLimited = true
  ccgt1.codeName = 'CCGT1'
  ccgt1.note = 'Показан 13 авг. 2026 на Monterey Car Week. Построен на платформе CC850 (тот же 5.0T V8: 1280hp бензин/1600hp E85, 9-ступенчатая Light Speed Transmission со сцеплением и секвентальным рычагом). Первый в истории марки заводской Track Package — карбоновый каркас безопасности, ковши HANS, 6-точечные ремни, пневмодомкраты, трековая резина (съёмный комплект, машина остаётся дорожной). 70 экземпляров, уже распределены. Дань неудавшемуся гоночному CCGT 2007 года.'
  console.log('  ✅ обновлены engineType/hp/isLimited/note у ncs-koenigsegg-2027-ccgt1')
} else {
  console.log('  ⚠️  ncs-koenigsegg-2027-ccgt1 не найден')
}

console.log('\n=== Историческая Koenigsegg CCGT (2007) ===')
addNode({
  id: 'kgsegg-ccgt', label: 'CCGT', fullName: 'Koenigsegg CCGT', type: 'generation',
  year: 2007, brandId: 'koenigsegg', brandName: 'Koenigsegg', codeName: 'CCGT',
  modelSlug: 'koenigsegg-ccgt', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 600, engineType: 'v8', isLimited: true, isRacing: true,
  note: 'Единственный экземпляр — чистая гоночная машина для FIA GT1 World Championship, на базе шасси CCR с элементами CCX (передняя оптика). Атмосферный 5.0T V8 (600hp — потолок класса GT1), менее 1000кг. Регламент GT1 переписали посреди обкатки (запретили карбоновый монокок, подняли минимум серийного тиража с 20 до 350/год) — омологация не состоялась, машина так и не стартовала ни в одной гонке. Позже ушла с молотка на Goodwood (~$3.8-5М) и восстановлена для показательных заездов GT1 Historic.',
})
addEdge('kgsegg-ccgt-to-ccgt1', 'kgsegg-ccgt', 'ncs-koenigsegg-2027-ccgt1', 'inspired_by', { strength: 0.85 })
addEdge('kgsegg-cc850-to-ccgt1', 'kgsegg-cc850', 'ncs-koenigsegg-2027-ccgt1', 'derived_from', { strength: 0.85 })

console.log('\n=== Jesko Attack (пропущенный вариант рядом с Jesko Absolut) ===')
addNode({
  id: 'kgsegg-jesko-attack', label: 'Jesko Attack', fullName: 'Koenigsegg Jesko Attack', type: 'generation',
  year: 2019, brandId: 'koenigsegg', brandName: 'Koenigsegg', codeName: 'Attack',
  modelSlug: 'koenigsegg-jesko', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 1600, engineType: 'v8t', isLimited: true,
  note: 'Аэродинамическая версия Jesko с упором на прижимную силу и время круга (в противовес низкому Cx у Jesko Absolut для максимальной скорости) — тот же 5.0T V8. Установил рекорд трассы Top Gear среди дорожных машин. 125 экземпляров Jesko всего делятся между Attack и Absolut.',
})
addEdge('kgsegg-jesko-to-attack', 'kgsegg-jesko', 'kgsegg-jesko-attack', 'variant_of')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Всего узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
