#!/usr/bin/env node
// Bertone × Lamborghini — знаковые концепты/one-off (аналог Zagato-спецверсий).
// Подтверждено веб-поиском (Wikipedia/motor1/supercars.net/conceptcarz/
// classicdriver/LamboCARS, 2026-08-31):
//
//   Marzal (1967, Женева) — culler-двери, 2.0Л I6 (буквально ПОЛОВИНА V12
//     от Miura, тот же ход/диаметр поршня, инженер Джампаоло Дальяра),
//     175hp. Связь с Espada — СТИЛИСТИЧЕСКОЕ вдохновение (стеклянная теплица,
//     низкая линия крыши), НЕ прямая инженерная эволюция (разные компоновки:
//     задний поперечный I6 vs передний V12) → inspired_by, не evolves_into.
//   Bravo (1974, Турин) — дизайн-студия преемника Urraco на укороченном
//     (-175мм базы) шасси Urraco P300, 3.0Л V8 ~300hp. По задумке вёл к
//     Silhouette (1976) → Jalpa (1981) — НО вся линейка Urraco/Silhouette/
//     Jalpa ОТСУТСТВУЕТ в графе (отдельная историческая дыра, не относится к
//     Bertone-задаче) → оставляем корневым узлом, честно отмечено в note.
//   Athon (1980, Турин) — ПЕРВЫЙ концепт Bertone после ухода Гандини (дизайн
//     Марка Дешама), на шасси Silhouette (тоже отсутствует), чистый родстер
//     без крыши вообще, 3.0Л V8, 260hp. Тоже корневой узел.
//   Miura Roadster (1968, Брюссель) — one-off без крыши/окон на БАЗЕ
//     СЕРИЙНОЙ Miura (не концепт с нуля) — проверка спроса на открытую Miura,
//     отклонена из-за проблем с жёсткостью лобового стекла. derived_from Miura.
//   Bertone Genesis (1988, Турин, дизайн Марка Дешама) — гигантский
//     gullwing-концепт-минивэн на V12 Quattrovalvole от Countach, 455hp. Без
//     прямых потомков (Urus десятилетия спустя — не связан, другая
//     платформа/эпоха). derived_from Countach.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. Marzal (1967) — inspired_by → Espada ===')
const marzal = {
  id: 'lambo-marzal', label: 'Marzal', fullName: 'Lamborghini Marzal',
  type: 'generation', year: 1967, brandId: 'lamborghini', brandName: 'Lamborghini',
  modelSlug: 'lamborghini-marzal', bodyType: 'concept', segment: 'gt_coupe', zone: 'concept',
  hp: 175, engineType: 'i6', isConcept: true,
  note: 'Концепт Bertone (Марчелло Гандини) — Женева, март 1967. Двери-ножницы (первые у Bertone/Lamborghini), 2.0Л I6 — буквально половина V12 от Miura (тот же ход/диаметр поршня, инж. Джампаоло Дальяра), задний поперечный, 175hp. Использовался как пейс-кар на Гран-при Монако 1967 (Ренье III и Грейс Келли). Повлиял на Espada СТИЛИСТИЧЕСКИ (стеклянная теплица, низкая линия крыши) — НЕ прямая инженерная эволюция, у Espada иная компоновка (передний V12).',
}
graph.nodes.push(marzal)
graph.edges.push({ id: 'lambo-marzal-to-espada', source: 'lambo-marzal', target: 'lambo-espada', type: 'inspired_by', strength: 0.7 })
console.log('  ✅ добавлен Marzal, lambo-marzal --[inspired_by]--> lambo-espada')

console.log('\n=== 2. Bravo (1974) — корневой узел (база Urraco/Silhouette отсутствует) ===')
const bravo = {
  id: 'lambo-bravo', label: 'Bravo', fullName: 'Lamborghini Bravo',
  type: 'generation', year: 1974, brandId: 'lamborghini', brandName: 'Lamborghini',
  modelSlug: 'lamborghini-bravo', bodyType: 'concept', segment: 'sports', zone: 'concept',
  hp: 300, engineType: 'v8', isConcept: true,
  note: 'Дизайн-студия Bertone (Гандини) — Турин 1974, на укороченном (-175мм базы) шасси Urraco P300, 3.0Л V8, ~300hp. Клиновидный язык форм задумывался как преемник Urraco → лёг в основу серийного Silhouette (1976) → Jalpa (1981). ⚠️ Urraco/Silhouette/Jalpa ОТСУТСТВУЮТ в графе (отдельная историческая дыра) — оставлен корневым узлом до их добавления.',
}
graph.nodes.push(bravo)
console.log('  ✅ добавлен Bravo (без входящего/исходящего ребра — см. note)')

console.log('\n=== 3. Athon (1980) — корневой узел (база Silhouette отсутствует) ===')
const athon = {
  id: 'lambo-athon', label: 'Athon', fullName: 'Lamborghini Athon',
  type: 'generation', year: 1980, brandId: 'lamborghini', brandName: 'Lamborghini',
  modelSlug: 'lamborghini-athon', bodyType: 'concept', segment: 'sports', zone: 'concept',
  hp: 260, engineType: 'v8', isConcept: true,
  note: 'Первый концепт Bertone ПОСЛЕ ухода Гандини (дизайн Марка Дешама) — Турин, апр. 1980. На шасси Silhouette (тоже отсутствует в графе), чистый родстер вообще без крыши, 3.0Л V8, 260hp, до 260 км/ч.',
}
graph.nodes.push(athon)
console.log('  ✅ добавлен Athon (без входящего/исходящего ребра — см. note)')

console.log('\n=== 4. Miura Roadster (1968) — derived_from Miura ===')
const miuraRoadster = {
  id: 'lambo-miura-roadster', label: 'Miura Roadster', fullName: 'Lamborghini Miura Roadster',
  type: 'generation', year: 1968, brandId: 'lamborghini', brandName: 'Lamborghini',
  modelSlug: 'lamborghini-miura', bodyType: 'roadster', segment: 'supercar', zone: 'open_top',
  hp: 350, engineType: 'v12', isConcept: true,
  note: 'One-off Bertone на базе СЕРИЙНОЙ Miura (не концепт с нуля) — Брюссель, 1968. Без крыши и боковых стёкол, доработанный хвост — проверка спроса на открытую Miura. Отклонена из-за проблем с жёсткостью лобового стекла на такой скорости. Продана ILZRO (переименована "ZN75"), позже реставрирована в исходный вид.',
}
graph.nodes.push(miuraRoadster)
graph.edges.push({ id: 'lambo-miura-to-roadster', source: 'lamborghini-miura', target: 'lambo-miura-roadster', type: 'derived_from', strength: 0.8 })
console.log('  ✅ добавлен Miura Roadster, lamborghini-miura --[derived_from]--> lambo-miura-roadster')

console.log('\n=== 5. Bertone Genesis (1988) — derived_from Countach ===')
const genesis = {
  id: 'lambo-bertone-genesis', label: 'Bertone Genesis', fullName: 'Lamborghini Bertone Genesis',
  type: 'generation', year: 1988, brandId: 'lamborghini', brandName: 'Lamborghini',
  modelSlug: 'lamborghini-genesis', bodyType: 'concept', segment: 'other', zone: 'concept',
  hp: 455, engineType: 'v12', isConcept: true,
  note: 'Огромный gullwing-концепт-минивэн Bertone (Марк Дешам) — Турин 1988. V12 Quattrovalvole от Countach, 455hp. Без прямых серийных потомков — Urus (десятилетия спустя) построен на совсем другой платформе/эпохе, не связан.',
}
graph.nodes.push(genesis)
graph.edges.push({ id: 'lambo-cnt-to-genesis', source: 'lamborghini-cnt', target: 'lambo-bertone-genesis', type: 'derived_from', strength: 0.6 })
console.log('  ✅ добавлен Bertone Genesis, lamborghini-cnt --[derived_from]--> lambo-bertone-genesis')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
