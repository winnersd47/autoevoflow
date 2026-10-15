#!/usr/bin/env node
// По запросу пользователя (2026-08-31, скриншот кластера Fiat + "Проведи все
// проверки"). Подтверждено веб-поиском (Wikipedia/autoevolution/
// automobile-catalog/media.stellantis.com/motor1/carscoops, 2026-08-31).
// Найдено 13 реальных пропущенных узлов + 1 задвоенная цепочка (128→Uno без
// Ritmo/Strada посередине — тот же класс бага "пропуск поколения").
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. Fiat 126 (1972) — прямой преемник 500 Nuova, отсутствовал ===')
const f126 = {
  id: 'fiat-126', label: 'Fiat 126', fullName: 'Fiat 126',
  type: 'generation', year: 1972, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-126', bodyType: 'hatchback', segment: 'microcar', zone: 'hatchback',
  hp: 23, engineType: 'i2',
  note: 'Прямой преемник 500 Nuova в роли самого доступного авто Fiat. 594cc I2 (воздушное охлаждение), 23hp. Выпускался до 2000г. (Польша).',
}
graph.nodes.push(f126)
graph.edges.push({ id: 'fiat-500-1957-to-126', source: 'fiat-500-1957', target: 'fiat-126', type: 'evolves_into', strength: 0.85 })
console.log('  ✅ добавлен Fiat 126, fiat-500-1957 --[evolves_into]--> fiat-126')

console.log('\n=== 2. Ritmo/Strada (1978) — закрываем пропуск между 128 и Uno Gen.1 ===')
const ritmo = {
  id: 'fiat-ritmo', label: 'Fiat Ritmo', fullName: 'Fiat Ritmo / Strada',
  type: 'generation', year: 1978, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-ritmo', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 60, engineType: 'i4',
  note: 'Преемник 128 в среднем классе (на экспортных рынках продавался как "Strada"). Линейка моторов на старте: 1.1Л/60hp, 1.3Л/65hp, 1.5Л/75hp. Сменён Uno в 1988-м.',
}
graph.nodes.push(ritmo)
const skip128 = graph.edges.findIndex(e => e.source==='fiat-128' && e.target==='fiat-uno-1')
if (skip128 !== -1) graph.edges.splice(skip128, 1)
graph.edges.push(
  { id: 'fiat-128-to-ritmo', source: 'fiat-128', target: 'fiat-ritmo', type: 'evolves_into', strength: 0.9 },
  { id: 'fiat-ritmo-to-uno', source: 'fiat-ritmo', target: 'fiat-uno-1', type: 'evolves_into', strength: 0.9 },
)
console.log('  ✅ добавлен Ritmo/Strada, убран прыжок 128→Uno, встроена цепочка 128→Ritmo→Uno')

console.log('\n=== 3. Panda Gen.2 (2003), Gen.3 (2012), Grande Panda (2024) ===')
const panda2 = {
  id: 'fiat-panda-2', label: 'Fiat Panda Gen.2', fullName: 'Fiat Panda Gen.2',
  type: 'generation', year: 2003, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-panda', bodyType: 'hatchback', segment: 'city_car', zone: 'hatchback',
  hp: 60, engineType: 'i4',
  note: 'Полностью новое поколение (2003-2012). Бензин 1.1-1.4Л (54-100hp, вкл. заряженную Panda 100HP), дизель 1.2-1.3Л (70hp).',
}
const panda3 = {
  id: 'fiat-panda-3', label: 'Fiat Panda Gen.3', fullName: 'Fiat Panda Gen.3',
  type: 'generation', year: 2012, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-panda', bodyType: 'hatchback', segment: 'city_car', zone: 'hatchback',
  hp: 69, engineType: 'i4',
  note: 'Один из самых долгоживущих циклов в истории Fiat (2012-2024, с фейслифтом "Pandina" в 2024-м). 69-93hp в зависимости от мотора.',
}
const grandePanda = {
  id: 'fiat-grande-panda', label: 'Fiat Grande Panda', fullName: 'Fiat Grande Panda',
  type: 'generation', year: 2024, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-panda', bodyType: 'hatchback', segment: 'city_car', zone: 'hatchback',
  hp: 100, engineType: 'i3t',
  note: 'Полностью новая платформа (Stellantis Smart Car, общая с Citroën C3/ë-C3), крупнее прежней Panda, кроссоверный дизайн. Гибрид (MHEV) — 1.2Л турбо I3 48В, 100hp. Есть и электроверсия — 113hp, батарея 44кВтч, запас хода 320км.',
}
graph.nodes.push(panda2, panda3, grandePanda)
graph.edges.push(
  { id: 'fiat-panda1-to-panda2', source: 'fiat-panda-1', target: 'fiat-panda-2', type: 'evolves_into', strength: 0.9 },
  { id: 'fiat-panda2-to-panda3', source: 'fiat-panda-2', target: 'fiat-panda-3', type: 'evolves_into', strength: 0.9 },
  { id: 'fiat-panda3-to-grandepanda', source: 'fiat-panda-3', target: 'fiat-grande-panda', type: 'evolves_into', strength: 0.85 },
)
console.log('  ✅ добавлена цепочка Panda Gen.1 → Gen.2 → Gen.3 → Grande Panda')

console.log('\n=== 4. Grande Punto (2005) → Punto Evo (2009, ФЕЙСЛИФТ, не новое поколение) ===')
const grandePunto = {
  id: 'fiat-grande-punto', label: 'Fiat Grande Punto', fullName: 'Fiat Grande Punto',
  type: 'generation', year: 2005, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-punto', bodyType: 'hatchback', segment: 'supermini', zone: 'hatchback',
  hp: 65, engineType: 'i4',
  note: 'Поколение 3 — 65-120hp в зависимости от мотора (бензин/MultiJet дизель).',
}
const puntoEvo = {
  id: 'fiat-punto-evo', label: 'Fiat Punto Evo', fullName: 'Fiat Punto Evo',
  type: 'generation', year: 2009, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-punto', bodyType: 'hatchback', segment: 'supermini', zone: 'hatchback',
  hp: 65, engineType: 'i4',
  note: 'Крупный фейслифт Grande Punto (та же платформа-база не менялась, несмотря на новое имя) — обновлённые двигатели MultiAir, интерьер, экстерьер. Продавалась до 2018г. под именем "Punto".',
}
graph.nodes.push(grandePunto, puntoEvo)
graph.edges.push(
  { id: 'fiat-punto2-to-grandepunto', source: 'fiat-punto-2', target: 'fiat-grande-punto', type: 'evolves_into', strength: 0.9 },
  { id: 'fiat-grandepunto-to-evo', source: 'fiat-grande-punto', target: 'fiat-punto-evo', type: 'facelifted_to', strength: 0.9 },
)
console.log('  ✅ добавлены Grande Punto (evolves_into от Gen.2) и Punto Evo (facelifted_to от Grande Punto)')

console.log('\n=== 5. Abarth 500 (2008) → 595 (2012, переименование) → 695 (2022, текущий топ) ===')
const abarth500 = {
  id: 'fiat-abarth-500', label: 'Abarth 500', fullName: 'Abarth 500',
  type: 'generation', year: 2008, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-abarth-500', bodyType: 'hatchback', segment: 'hot_hatch', zone: 'hatchback',
  hp: 133, engineType: 'i4t',
  note: 'Возрождение спортивного суббренда Abarth на базе нового Fiat 500 (2007) — 1.4Т, 135PS/133hp (версия Esseesse — 158hp).',
}
const abarth595 = {
  id: 'fiat-abarth-595', label: 'Abarth 595', fullName: 'Abarth 595',
  type: 'generation', year: 2012, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-abarth-500', bodyType: 'hatchback', segment: 'hot_hatch', zone: 'hatchback',
  hp: 140, engineType: 'i4t',
  note: 'Переименование Abarth 500 — имя "595" отсылает к историческому Abarth 595 1963г. (тюнингованный классический 500, объём увеличен до 593cc). Фейслифт 2016г. — линейка 140-180PS.',
}
const abarth695 = {
  id: 'fiat-abarth-695', label: 'Abarth 695', fullName: 'Abarth 695',
  type: 'generation', year: 2022, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-abarth-500', bodyType: 'hatchback', segment: 'hot_hatch', zone: 'hatchback',
  hp: 178, engineType: 'i4t',
  note: 'Текущий топ линейки — 180PS/178hp база, до 190hp (Biposto). Имя тоже историческое — от классического Abarth 695 1960х.',
}
graph.nodes.push(abarth500, abarth595, abarth695)
graph.edges.push(
  { id: 'fiat-500-2007-to-abarth500', source: 'fiat-500-2007', target: 'fiat-abarth-500', type: 'derived_from', strength: 0.85 },
  { id: 'fiat-abarth500-to-595', source: 'fiat-abarth-500', target: 'fiat-abarth-595', type: 'evolves_into', strength: 0.85 },
  { id: 'fiat-abarth595-to-695', source: 'fiat-abarth-595', target: 'fiat-abarth-695', type: 'evolves_into', strength: 0.85 },
)
console.log('  ✅ добавлена цепочка Abarth 500 → 595 → 695, derived_from Fiat 500 (2007)')

console.log('\n=== 6. 500L (2012) и 500X (2014) — кузовные деривативы платформы 500 (2007) ===')
const f500l = {
  id: 'fiat-500l', label: 'Fiat 500L', fullName: 'Fiat 500L',
  type: 'generation', year: 2012, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-500l', bodyType: 'mpv', segment: 'compact_mpv', zone: 'mpv',
  hp: 104, engineType: 'i2',
  note: 'Увеличенный практичный кузов (мини-минивэн) на платформе 500 (2007). Базовый мотор — 0.9Т TwinAir, 105PS/104hp.',
}
const f500x = {
  id: 'fiat-500x', label: 'Fiat 500X', fullName: 'Fiat 500X',
  type: 'generation', year: 2014, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-500x', bodyType: 'suv', segment: 'suv_compact', zone: 'suv_compact',
  hp: 95, engineType: 'i4',
  note: 'Кроссовер-версия на платформе 500 (2007) — линейка 95-170hp в зависимости от мотора/привода (вкл. полноприводные версии Cross).',
}
graph.nodes.push(f500l, f500x)
graph.edges.push(
  { id: 'fiat-500-2007-to-500l', source: 'fiat-500-2007', target: 'fiat-500l', type: 'derived_from', strength: 0.8 },
  { id: 'fiat-500-2007-to-500x', source: 'fiat-500-2007', target: 'fiat-500x', type: 'derived_from', strength: 0.8 },
)
console.log('  ✅ добавлены 500L и 500X, оба derived_from fiat-500-2007')

console.log('\n=== 7. Bravo Gen.2 (2007) — возрождение имени после Stilo ===')
const bravo2 = {
  id: 'fiat-bravo-2', label: 'Fiat Bravo Gen.2', fullName: 'Fiat Bravo Gen.2',
  type: 'generation', year: 2007, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-bravo2', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 120, engineType: 'i4',
  note: 'Возрождение имени Bravo — сменил Stilo в модельном ряду, платформа связана с Alfa Romeo 147/GT. Бензин 90-150hp, дизель 120-150hp.',
}
graph.nodes.push(bravo2)
graph.edges.push({ id: 'fiat-stilo-to-bravo2', source: 'fiat-stilo', target: 'fiat-bravo-2', type: 'evolves_into', strength: 0.85 })
console.log('  ✅ добавлен Bravo Gen.2, fiat-stilo --[evolves_into]--> fiat-bravo-2')

console.log('\n=== 8. Croma Gen.2 (2005) — возрождение имени после ~10-летнего перерыва ===')
const croma2 = {
  id: 'fiat-croma-2', label: 'Fiat Croma Gen.2', fullName: 'Fiat Croma Gen.2',
  type: 'generation', year: 2005, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-croma2', bodyType: 'estate', segment: 'midsize_sed', zone: 'estate',
  hp: 147, engineType: 'i4',
  note: 'Возрождение имени Croma после ~10-летнего перерыва — универсал на платформе, связанной с Fiat Stilo. Бензин 140-147hp, дизель 120-200hp.',
}
graph.nodes.push(croma2)
graph.edges.push({ id: 'fiat-croma-to-croma2', source: 'fiat-croma', target: 'fiat-croma-2', type: 'evolves_into', strength: 0.7 })
console.log('  ✅ добавлен Croma Gen.2, fiat-croma --[evolves_into]--> fiat-croma-2')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
