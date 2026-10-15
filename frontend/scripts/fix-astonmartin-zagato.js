#!/usr/bin/env node
// Полная (широкая) история сотрудничества Aston Martin × Zagato — по запросу
// пользователя (2026-08-27, "Делай широкий"). Подтверждено веб-поиском
// (sportscardigest/petrolicious/retromotor/Wikipedia/automobile-catalog/
// carfolio/gtspirit/motor1/motorauthority, 2026-08-27):
//
//   DB4 GT Zagato (1960-63, 20 экз.) — начало партнёрства (Женева 1960,
//     встреча Джанни Дзагато и Дэвида Брауна). 3.7Л I6, 314hp.
//   V8 Zagato (1986) — Coupe+Volante, 5.3Л V8, 432hp. База — классический
//     "AM V8" (1972-89) — ОТСУТСТВУЕТ в графе (отдельная, более глубокая
//     историческая дыра эры DBS V8/Virage, не относится к Zagato-задаче) →
//     оставляем корневым узлом, как Vulcan/MC12 были до недавнего времени.
//   DB7 Zagato / DB7 Vantage Zagato (2002-03, 99 экз.) + DB AR1 (American
//     Roadster, тот же тираж, открытая пара) — 6.0Л V12, 435/~437hp.
//   V12 Zagato (2011) — база: V12-версия платформы Vantage (2005+), 6.0Л V12,
//     510hp, на ~100кг легче стандартного V12 Vantage.
//   Vanquish Zagato (2016-18, 99 экз. купе) — Coupe/Volante/Shooting Brake
//     (все три ~99 экз.) + Speedster (28 экз.) — 5.9Л V12 NA, 592hp/600PS.
//   DBS GT Zagato + DB4 GT Zagato Continuation (2019, "DBZ Centenary
//     Collection", парный релиз к 106-летию бренда) — DBS GT Zagato: 5.2Т V12,
//     760hp. DB4 GT Zagato Continuation — новодел оригинала 1960г. под
//     историческую спецификацию, 4.7Л I6 (крупнее оригинального 3.7Л), 390+hp,
//     4-ступ. механика, ~4500 человеко-часов на экземпляр, трек-only (не
//     сертифицирован для дорог по совр. нормам).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. DB4 GT Zagato (1960) + континьюейшен-новодел (2019) ===')
const db4gtz = {
  id: 'am-db4-gt-zagato', label: 'DB4 GT Zagato', fullName: 'Aston Martin DB4 GT Zagato',
  type: 'generation', year: 1960, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db4-gt-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 314, engineType: 'i6', isLimited: true,
  note: 'Начало партнёрства Aston Martin × Zagato — встреча техдиректора Дзагато Джанни Дзагато и главы Aston Мартина Дэвида Брауна на Женевском автосалоне 1960г. Облегчённый гоночный вариант DB4 GT с кузовом Zagato — 3.7Л I6, 314hp, 4-ступ. механика. Всего 20 экземпляров (1960-63) — один из самых ценных классических Aston Martin в истории.',
}
const db4gtzContinuation = {
  id: 'am-db4-gt-zagato-continuation', label: 'DB4 GT Zagato Continuation', fullName: 'Aston Martin DB4 GT Zagato Continuation',
  type: 'generation', year: 2019, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db4-gt-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 390, engineType: 'i6', isLimited: true,
  note: 'Новодел оригинала 1960г. под историческую спецификацию — часть парного релиза "DBZ Centenary Collection" к 106-летию бренда (вместе с DBS GT Zagato). 4.7Л I6 с двумя свечами на цилиндр (как в оригинале, но крупнее объёмом), 390+hp, 4-ступ. механика, ~4500 человеко-часов на экземпляр. Трек-only — не сертифицирован для дорог по современным нормам.',
}
graph.nodes.push(db4gtz, db4gtzContinuation)
console.log('  ✅ добавлен:', db4gtz.label, '(' + db4gtz.year + ', ' + db4gtz.hp + 'hp, 20 экз.)')
console.log('  ✅ добавлен:', db4gtzContinuation.label, '(' + db4gtzContinuation.year + ', ' + db4gtzContinuation.hp + 'hp)')
graph.edges.push(
  { id: 'am-db4-to-gtzagato', source: 'am-db4', target: 'am-db4-gt-zagato', type: 'derived_from', strength: 0.85 },
  { id: 'am-db4gtzagato-to-continuation', source: 'am-db4-gt-zagato', target: 'am-db4-gt-zagato-continuation', type: 'derived_from', strength: 0.9 },
)
console.log('  ✅ am-db4 --[derived_from]--> am-db4-gt-zagato')
console.log('  ✅ am-db4-gt-zagato --[derived_from]--> am-db4-gt-zagato-continuation (новодел оригинала)')

console.log('\n=== 2. V8 Zagato (1986) — корневой узел (база "классический AM V8" 1972-89 отсутствует в графе) ===')
const v8zagato = {
  id: 'am-v8-zagato', label: 'V8 Zagato', fullName: 'Aston Martin V8 Zagato',
  type: 'generation', year: 1986, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-v8-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 432, engineType: 'v8', isLimited: true,
  note: 'На базе классического "Aston Martin V8" (1972-89, сам по себе отсутствует в графе — отдельная историческая дыра эры DBS V8/Virage). Cutch-кузов Zagato, 5.3Л V8 (4 распредвала), 432hp, до 300 км/ч — самый быстрый серийный Aston Martin своего времени. Coupe + открытая Volante.',
}
graph.nodes.push(v8zagato)
console.log('  ✅ добавлен:', v8zagato.label, '(' + v8zagato.year + ', ' + v8zagato.hp + 'hp) — без входящего ребра, см. note')

console.log('\n=== 3. DB7 Zagato (2002) + DB AR1 (2003) ===')
const db7zagato = {
  id: 'am-db7-zagato', label: 'DB7 Zagato', fullName: 'Aston Martin DB7 Vantage Zagato',
  type: 'generation', year: 2002, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db7-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 435, engineType: 'v12', isLimited: true,
  note: 'Первый Aston Martin новой (пост-DB4) эры в кузове Zagato — вернул фирменную "double bubble" крышу и решётку. 6.0Л V12, 435hp. 99 экземпляров + 1 оставшийся у самого Aston Martin.',
}
const dbAr1 = {
  id: 'am-db-ar1', label: 'DB AR1', fullName: 'Aston Martin DB AR1',
  type: 'generation', year: 2003, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db7-zagato', bodyType: 'roadster', segment: 'gt_coupe', zone: 'open_top',
  hp: 437, engineType: 'v12', isLimited: true,
  note: '"American Roadster" — открытая пара к DB7 Zagato, создана специально для рынка США. Тот же 6.0Л V12 (~434-440hp по разным источникам), 99 экземпляров.',
}
graph.nodes.push(db7zagato, dbAr1)
console.log('  ✅ добавлен:', db7zagato.label, '(' + db7zagato.hp + 'hp)')
console.log('  ✅ добавлен:', dbAr1.label, '(' + dbAr1.hp + 'hp)')
graph.edges.push(
  { id: 'am-db7-to-zagato', source: 'am-db7', target: 'am-db7-zagato', type: 'derived_from', strength: 0.85 },
  { id: 'am-db7zagato-to-ar1', source: 'am-db7-zagato', target: 'am-db-ar1', type: 'variant_of', strength: 0.85 },
)
console.log('  ✅ am-db7 --[derived_from]--> am-db7-zagato')
console.log('  ✅ am-db7-zagato --[variant_of]--> am-db-ar1')

console.log('\n=== 4. V12 Zagato (2011) ===')
const v12zagato = {
  id: 'am-v12-zagato', label: 'V12 Zagato', fullName: 'Aston Martin V12 Zagato',
  type: 'generation', year: 2011, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-v12-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 510, engineType: 'v12', isLimited: true,
  note: 'На базе V12-версии платформы Vantage (2005+) — bonded aluminium шасси + 6.0Л V12, 510hp, на ~100кг легче стандартного V12 Vantage (алюминий+карбон кузов ручной сборки). Самый быстрый и мощный Zagato-Aston на момент выхода.',
}
graph.nodes.push(v12zagato)
console.log('  ✅ добавлен:', v12zagato.label, '(' + v12zagato.hp + 'hp)')
graph.edges.push({ id: 'am-vantage-to-v12zagato', source: 'am-vantage', target: 'am-v12-zagato', type: 'derived_from', strength: 0.75 })
console.log('  ✅ am-vantage --[derived_from]--> am-v12-zagato (база — V12-трим той же платформы, отдельно не смоделирован)')

console.log('\n=== 5. Vanquish Zagato (2016-18) — 4 кузова ===')
const vqz = {
  id: 'am-vanquish-zagato', label: 'Vanquish Zagato', fullName: 'Aston Martin Vanquish Zagato',
  type: 'generation', year: 2016, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 592, engineType: 'v12', isLimited: true,
  note: 'На базе Vanquish II (2012г. поколение) — 5.9Л V12 атмо, 592hp/600PS. Купе — базовый кузов серии, 99 экземпляров.',
}
const vqzVolante = {
  id: 'am-vanquish-zagato-volante', label: 'Vanquish Zagato Volante', fullName: 'Aston Martin Vanquish Zagato Volante',
  type: 'generation', year: 2017, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish-zagato', bodyType: 'convertible', segment: 'gt_coupe', zone: 'open_top',
  hp: 592, engineType: 'v12', isLimited: true,
  note: 'Открытая версия Vanquish Zagato, тот же 5.9Л V12 592hp. 99 экземпляров.',
}
const vqzShootingBrake = {
  id: 'am-vanquish-zagato-shooting-brake', label: 'Vanquish Zagato Shooting Brake', fullName: 'Aston Martin Vanquish Zagato Shooting Brake',
  type: 'generation', year: 2017, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish-zagato', bodyType: 'wagon', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 592, engineType: 'v12', isLimited: true,
  note: 'Универсал-купе версия Vanquish Zagato — редчайший кузов в современной линейке Aston Martin. Тот же 5.9Л V12 592hp. 99 экземпляров.',
}
const vqzSpeedster = {
  id: 'am-vanquish-zagato-speedster', label: 'Vanquish Zagato Speedster', fullName: 'Aston Martin Vanquish Zagato Speedster',
  type: 'generation', year: 2017, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish-zagato', bodyType: 'roadster', segment: 'gt_coupe', zone: 'open_top',
  hp: 592, engineType: 'v12', isLimited: true,
  note: 'Без крыши и лобового стекла (чистый родстер) — самый эксклюзивный кузов серии, всего 28 экземпляров (против 99 у остальных трёх). Тот же 5.9Л V12 592hp.',
}
graph.nodes.push(vqz, vqzVolante, vqzShootingBrake, vqzSpeedster)
console.log('  ✅ добавлены: Coupe/Volante/Shooting Brake/Speedster (592hp)')
graph.edges.push(
  { id: 'am-vanquish2-to-zagato', source: 'am-vanquish2', target: 'am-vanquish-zagato', type: 'derived_from', strength: 0.85 },
  { id: 'am-vqz-to-volante', source: 'am-vanquish-zagato', target: 'am-vanquish-zagato-volante', type: 'variant_of', strength: 0.9 },
  { id: 'am-vqz-to-shootingbrake', source: 'am-vanquish-zagato', target: 'am-vanquish-zagato-shooting-brake', type: 'variant_of', strength: 0.9 },
  { id: 'am-vqz-to-speedster', source: 'am-vanquish-zagato', target: 'am-vanquish-zagato-speedster', type: 'variant_of', strength: 0.9 },
)
console.log('  ✅ am-vanquish2 --[derived_from]--> am-vanquish-zagato')
console.log('  ✅ am-vanquish-zagato --[variant_of]--> {volante, shooting-brake, speedster}')

console.log('\n=== 6. DBS GT Zagato (2019) — вторая половина "DBZ Centenary Collection" ===')
const dbsGtZagato = {
  id: 'am-dbs-gt-zagato', label: 'DBS GT Zagato', fullName: 'Aston Martin DBS GT Zagato',
  type: 'generation', year: 2019, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbs-gt-zagato', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 760, engineType: 'v12t', isLimited: true,
  note: 'Современная половина парного релиза "DBZ Centenary Collection" (к 106-летию бренда, продавался только В ПАРЕ с DB4 GT Zagato Continuation). На базе DBS Superleggera — 5.2Т V12, доработан до 760hp. Крыша из цельного куска карбона, продолжающаяся до заднего стекла (заднего стекла как такового нет).',
}
graph.nodes.push(dbsGtZagato)
console.log('  ✅ добавлен:', dbsGtZagato.label, '(' + dbsGtZagato.hp + 'hp)')
graph.edges.push({ id: 'am-dbs-to-gtzagato', source: 'am-dbs-superleggera', target: 'am-dbs-gt-zagato', type: 'derived_from', strength: 0.85 })
console.log('  ✅ am-dbs-superleggera --[derived_from]--> am-dbs-gt-zagato')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
