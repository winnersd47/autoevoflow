#!/usr/bin/env node
// По запросу пользователя (2026-08-27, "Где все предыдущие поколения и
// проанализируй платформу и связи с другими моделями") — у am-vanquish-2024
// не было НИ ОДНОГО предка, хотя имя Vanquish имеет 20+-летнюю историю у
// Aston Martin. Подтверждено веб-поиском (evo.co.uk/Wikipedia/motor1/
// motorauthority/magnetomagazine/The Week, 2026-08-27):
//
//   Vanquish I (2001-2007, сменил Virage как V12-флагман) — 5.9Л V12 NA,
//     460hp на старте.
//   Vanquish II (2012-2018) — полностью новое поколение, эволюция от DBS
//     (2007-2012, "James Bond" DBS из Casino Royale — В ГРАФЕ ОТСУТСТВУЕТ,
//     не добавляем — отдельная, более глубокая историческая дыра, не
//     относящаяся к текущему запросу). Тот же 5.9Л V12 NA, 565hp на старте,
//     до 595-600hp в топ-версии Vanquish S (2017).
//   Имя Vanquish "ушло на пенсию" в 2018-м — DBS Superleggera (2018-2023)
//     явно описан индустрией как "духовный преемник Vanquish S": 5.2Т V12,
//     715hp/725PS. Volante (кабрио, 2019) и 770 Ultimate (финальная
//     прощальная серия, 2023, 770PS/759hp) — оба подтверждены.
//   Vanquish (2024/25) — ВОЗРОЖДЕНИЕ имени как нового V12-флагмана,
//     прямой преемник DBS Superleggera (824hp против 715 у DBS — рост
//     явно позиционируется индустрией как "против DBS 770 Ultimate").
//
//   ПЛАТФОРМА: Vanquish (2024) — тот же bonded-aluminium каркас, что у DB12
//     и НОВОГО Vantage (2024) — общая текущая архитектура Aston Martin.
//     НО: "completely different" по характеру от обоих — колёсная база
//     удлинена на 80мм, доработана нижняя часть кузова (+75% боковой
//     жёсткости против DBS 770 Ultimate), демпферы Bilstein DTX как у DB12,
//     собственный e-diff. → связь shares_platform (общая архитектура,
//     НЕ производная модель), а не derived_from/variant_of.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. Историческая цепочка: Vanquish I → Vanquish II → DBS Superleggera → Vanquish (2024) ===')
const vanquish1 = {
  id: 'am-vanquish1', label: 'Vanquish', fullName: 'Aston Martin Vanquish',
  type: 'generation', year: 2001, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish-classic', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 460, engineType: 'v12',
  note: 'Первое поколение — сменил Virage как V12-флагман Aston Martin. 5.9Л V12 атмосферный, 460hp на старте продаж 2001-го. Производство до 2007-го.',
}
const vanquish2 = {
  id: 'am-vanquish2', label: 'Vanquish', fullName: 'Aston Martin Vanquish (2012)',
  type: 'generation', year: 2012, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish-classic', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 565, engineType: 'v12',
  note: 'Полностью новое поколение (2012) — тот же 5.9Л V12 NA (доработанный), 565hp на старте, карбоновые панели кузова и воздухозаборники по мотивам One-77. Топ-версия Vanquish S (2017) — до ~595-600hp, финальная перед уходом имени на паузу в 2018-м.',
}
const dbsSuperleggera = {
  id: 'am-dbs-superleggera', label: 'DBS Superleggera', fullName: 'Aston Martin DBS Superleggera',
  type: 'generation', year: 2018, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbs-superleggera', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 715, engineType: 'v12t',
  note: 'Представлен июнь 2018 как духовный преемник Vanquish S (индустрия называет напрямую) — переход на 5.2Л твин-турбо V12, 715hp/725PS. Флагманский GT/суперкар-гибрид, макс. 211mph.',
}
const dbsSuperleggeraVolante = {
  id: 'am-dbs-superleggera-volante', label: 'DBS Superleggera Volante', fullName: 'Aston Martin DBS Superleggera Volante',
  type: 'generation', year: 2019, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbs-superleggera', bodyType: 'convertible', segment: 'gt_coupe', zone: 'open_top',
  hp: 715, engineType: 'v12t',
  note: 'Кабрио-версия DBS Superleggera (2019), тот же 5.2Т V12 715hp.',
}
const dbs770 = {
  id: 'am-dbs-770-ultimate', label: 'DBS 770 Ultimate', fullName: 'Aston Martin DBS 770 Ultimate',
  type: 'generation', year: 2023, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbs-superleggera', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 759, engineType: 'v12t', isLimited: true,
  note: 'Финальная прощальная серия перед снятием DBS Superleggera с производства — 770PS/759hp (имя — от мощности), самый мощный серийный Aston Martin на момент выхода. Ограниченный тираж.',
}
graph.nodes.push(vanquish1, vanquish2, dbsSuperleggera, dbsSuperleggeraVolante, dbs770)
console.log('  ✅ добавлен:', vanquish1.label, '(' + vanquish1.year + ', ' + vanquish1.hp + 'hp)')
console.log('  ✅ добавлен:', vanquish2.label, '(' + vanquish2.year + ', ' + vanquish2.hp + 'hp)')
console.log('  ✅ добавлен:', dbsSuperleggera.label, '(' + dbsSuperleggera.year + ', ' + dbsSuperleggera.hp + 'hp)')
console.log('  ✅ добавлен:', dbsSuperleggeraVolante.label)
console.log('  ✅ добавлен:', dbs770.label, '(limited)')

graph.edges.push(
  { id: 'am-vanquish1-to-2', source: 'am-vanquish1', target: 'am-vanquish2', type: 'evolves_into', strength: 0.9 },
  { id: 'am-vanquish2-to-dbs', source: 'am-vanquish2', target: 'am-dbs-superleggera', type: 'evolves_into', strength: 0.85 },
  { id: 'am-dbs-to-volante', source: 'am-dbs-superleggera', target: 'am-dbs-superleggera-volante', type: 'derived_from', strength: 0.9 },
  { id: 'am-dbs-to-770', source: 'am-dbs-superleggera', target: 'am-dbs-770-ultimate', type: 'variant_of', strength: 0.85 },
  { id: 'am-dbs-to-vanquish2024', source: 'am-dbs-superleggera', target: 'am-vanquish-2024', type: 'evolves_into', strength: 0.9 },
)
console.log('  ✅ am-vanquish1 --[evolves_into]--> am-vanquish2')
console.log('  ✅ am-vanquish2 --[evolves_into]--> am-dbs-superleggera (смена имени, прямая преемственность)')
console.log('  ✅ am-dbs-superleggera --[derived_from]--> am-dbs-superleggera-volante')
console.log('  ✅ am-dbs-superleggera --[variant_of]--> am-dbs-770-ultimate')
console.log('  ✅ am-dbs-superleggera --[evolves_into]--> am-vanquish-2024 (возрождение имени)')

console.log('\n=== 2. Платформа: shares_platform с DB12 и новым Vantage (та же bonded-aluminium архитектура) ===')
graph.edges.push(
  { id: 'am-vanquish2024-platform-db12', source: 'am-vanquish-2024', target: 'am-db12', type: 'shares_platform', strength: 0.7 },
  { id: 'am-vanquish2024-platform-vantage3', source: 'am-vanquish-2024', target: 'am-vantage3', type: 'shares_platform', strength: 0.7 },
)
console.log('  ✅ am-vanquish-2024 --[shares_platform]--> am-db12')
console.log('  ✅ am-vanquish-2024 --[shares_platform]--> am-vantage3')
console.log('  ℹ️  strength 0.7 (не 0.9+): характер "completely different" — общий каркас, но +80мм база,')
console.log('     своя подвеска/жёсткость/e-diff — не близнецы, а родственная платформа')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
