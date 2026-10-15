#!/usr/bin/env node
// "Полная проверка" Aston Martin — часть 2: новое поколение Vantage (2024),
// DBX (с нуля), Vanquish Volante, обогащение узла Valen.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Vantage: новое поколение 2024 (было ТОЛЬКО "S Roadster" 2026, ошибочно на старой платформе 2018) ===')
const vantage3 = {
  id: 'am-vantage3', label: 'Vantage', fullName: 'Aston Martin Vantage',
  type: 'generation', year: 2024, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vantage', bodyType: 'coupe', segment: 'sports', zone: 'sports',
  hp: 655, engineType: 'v8t',
  note: 'Полностью новое поколение — анонс 12 февр. 2024. AMG-производный 4.0Т V8 доработан (крупнее турбины, новые кулачки/степень сжатия) — 665PS/655hp/800Nm (+155PS/+115Nm к предыдущему поколению), 0-60 за 3.4с, 202mph. Подтверждено напрямую на astonmartin.com + пресс-релиз.',
}
const vantage3S = {
  id: 'am-vantage3-s', label: 'Vantage S', fullName: 'Aston Martin Vantage S',
  type: 'generation', year: 2025, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vantage', bodyType: 'coupe', segment: 'sports', zone: 'sports',
  hp: 671, engineType: 'v8t',
  note: 'Более мощная трим-версия купе — 680PS/671hp (база — 655hp), 0-60 за 3.3с, 202mph. Подтверждено на astonmartin.com.',
}
const vantage3Roadster = {
  id: 'am-vantage3-roadster', label: 'Vantage Roadster', fullName: 'Aston Martin Vantage Roadster',
  type: 'generation', year: 2025, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vantage', bodyType: 'convertible', segment: 'sports', zone: 'open_top',
  hp: 655, engineType: 'v8t',
  note: 'Кабрио-версия нового поколения Vantage, тот же 4.0Т V8 655hp, что у купе.',
}
graph.nodes.push(vantage3, vantage3S, vantage3Roadster)
console.log('  ✅ добавлен:', vantage3.label, '(' + vantage3.year + ', ' + vantage3.hp + 'hp)')
console.log('  ✅ добавлен:', vantage3S.label, '(' + vantage3S.hp + 'hp)')
console.log('  ✅ добавлен:', vantage3Roadster.label, '(' + vantage3Roadster.hp + 'hp)')

// Перецепляем существующий Vantage S Roadster со старой платформы (am-vantage2,
// 2018г.) на новую (am-vantage3-roadster) — та же ошибка "новый трим повешен на
// устаревшее поколение", что чинили у Koenigsegg/Bugatti/Grecale/Maserati ранее.
const vsrIdx = graph.edges.findIndex(e => e.target === 'am-vantage-s-roadster' && e.type === 'variant_of')
if (vsrIdx === -1) throw new Error('Не найдено ребро -> am-vantage-s-roadster')
console.log('  ⚠️  было:', graph.edges[vsrIdx].source, '--[variant_of]--> am-vantage-s-roadster (СТАРОЕ поколение 2018г.!)')
graph.edges[vsrIdx].source = 'am-vantage3-roadster'
console.log('  ✅ перецеплено: am-vantage3-roadster --[variant_of]--> am-vantage-s-roadster')

graph.edges.push(
  { id: 'am-vantage2-to-vantage3', source: 'am-vantage2', target: 'am-vantage3', type: 'evolves_into', strength: 0.9 },
  { id: 'am-vantage3-to-s', source: 'am-vantage3', target: 'am-vantage3-s', type: 'variant_of', strength: 0.9 },
  { id: 'am-vantage3-to-roadster', source: 'am-vantage3', target: 'am-vantage3-roadster', type: 'derived_from', strength: 0.9 },
)
console.log('  ✅ am-vantage2 --[evolves_into]--> am-vantage3 (смена поколения)')
console.log('  ✅ am-vantage3 --[variant_of]--> am-vantage3-s')
console.log('  ✅ am-vantage3 --[derived_from]--> am-vantage3-roadster (кросс-кузовной мост)')

console.log('\n=== 2. DBX: строим линейку с нуля (в графе не было ВООБЩЕ) ===')
const dbx = {
  id: 'am-dbx', label: 'DBX', fullName: 'Aston Martin DBX',
  type: 'generation', year: 2020, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbx', bodyType: 'suv', segment: 'premium_suv', zone: 'suv_large',
  hp: 542, engineType: 'v8t',
  note: 'Первый в истории Aston Martin внедорожник — старт продаж 2020. AMG-производный 4.0Т V8, 542hp/700 Нм. Снят с производства к MY2025 после огромного успеха DBX707 (см. facelifted_to) — базовая версия перестала заказываться.',
}
const dbx707 = {
  id: 'am-dbx707', label: 'DBX707', fullName: 'Aston Martin DBX707',
  type: 'generation', year: 2022, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbx', bodyType: 'suv', segment: 'premium_suv', zone: 'suv_large',
  hp: 697, engineType: 'v8t',
  note: '"Суперкар среди внедорожников" — старт продаж весна 2022, тот же 4.0Т V8, доработан до 707PS/697hp/900Нм (имя — от метрической мощности). Настолько популярна, что к MY2025 полностью вытеснила базовую DBX из линейки.',
}
const dbxS = {
  id: 'am-dbx-s', label: 'DBX S', fullName: 'Aston Martin DBX S',
  type: 'generation', year: 2026, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-dbx', bodyType: 'suv', segment: 'premium_suv', zone: 'suv_large',
  hp: 717, engineType: 'v8t',
  note: '"Возвращение S" — новый топ-трим 2026г., легче и мощнее DBX707: 727PS/717hp/900Нм. Сейчас сосуществует с DBX707 ("Two styles: DBX707 and DBX S" на astonmartin.com).',
}
graph.nodes.push(dbx, dbx707, dbxS)
console.log('  ✅ добавлен:', dbx.label, '(' + dbx.year + ', ' + dbx.hp + 'hp)')
console.log('  ✅ добавлен:', dbx707.label, '(' + dbx707.year + ', ' + dbx707.hp + 'hp)')
console.log('  ✅ добавлен:', dbxS.label, '(' + dbxS.year + ', ' + dbxS.hp + 'hp)')

graph.edges.push(
  { id: 'am-dbx-to-707', source: 'am-dbx', target: 'am-dbx707', type: 'facelifted_to', strength: 0.9 },
  { id: 'am-dbx707-to-s', source: 'am-dbx707', target: 'am-dbx-s', type: 'variant_of', strength: 0.85 },
)
console.log('  ✅ am-dbx --[facelifted_to]--> am-dbx707')
console.log('  ✅ am-dbx707 --[variant_of]--> am-dbx-s')

console.log('\n=== 3. Vanquish: добавляем Volante (кабрио, отсутствовала) ===')
const vanquishVolante = {
  id: 'am-vanquish-volante', label: 'Vanquish Volante', fullName: 'Aston Martin Vanquish Volante',
  type: 'generation', year: 2025, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vanquish', bodyType: 'convertible', segment: 'gt_coupe', zone: 'open_top',
  hp: 824, engineType: 'v12t',
  note: '"Самый быстрый и мощный переднемоторный кабриолет в мире" — анонс 25 марта 2025, поставки с Q3 2025. Тот же 5.2Т V12 824hp/835PS, что у купе. K-fold складная крыша (14с открыть/16с закрыть).',
}
graph.nodes.push(vanquishVolante)
console.log('  ✅ добавлен:', vanquishVolante.label, '(' + vanquishVolante.hp + 'hp)')
graph.edges.push({ id: 'am-vanquish-to-volante', source: 'am-vanquish-2024', target: 'am-vanquish-volante', type: 'derived_from', strength: 0.9 })
console.log('  ✅ am-vanquish-2024 --[derived_from]--> am-vanquish-volante')

console.log('\n=== 4. Valen: обогащаем сиротский узел (был почти пустой) + подключаем ===')
const valen = byId.get('ncs-astonmartin-2028-martin-valen')
valen.label = 'Valen'
valen.fullName = 'Aston Martin Valen'
valen.year = 2026
valen.hp = 838
valen.engineType = 'v12'
valen.bodyType = 'coupe'
valen.segment = 'gt_coupe'
valen.zone = 'gt_coupe'
valen.modelSlug = 'astonmartin-valen'
valen.brandName = 'Aston Martin'
valen.isLimited = true
valen.note = 'Самый мощный переднемоторный V12 в истории Aston Martin — 850PS/838hp, 1000Нм/738 lb-ft, 214mph. Лимит 150 экземпляров по всему миру. Подтверждено напрямую на astonmartin.com.'
delete valen.description
delete valen.sourceUrl
delete valen.isLatest
delete valen.scrapedAt
delete valen.heroImageUrl
delete valen.thumbnailUrl
delete valen.codeName
console.log('  ✅ обогащён:', valen.label, '(' + valen.year + ', ' + valen.hp + 'hp)')
graph.edges.push({ id: 'am-vanquish-to-valen', source: 'am-vanquish-2024', target: 'ncs-astonmartin-2028-martin-valen', type: 'derived_from', strength: 0.75 })
console.log('  ✅ am-vanquish-2024 --[derived_from]--> ncs-astonmartin-2028-martin-valen (текущий V12-флагман → сверхлимитированный V12-хало)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Часть 2 готова. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
