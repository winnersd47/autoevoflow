#!/usr/bin/env node
// По запросу пользователя (2026-08-31, "Есть гоночные и другие модификации
// ещё?"). Подтверждено веб-поиском (WRC.com/Wikipedia/Stellantis Heritage/
// silodrome/automobile-catalog/autoevolution, 2026-08-31). Найдено 5 пробелов:
// вся классическая раллийная история Fiat (131 Abarth — ТРЁХКРАТНЫЙ чемпион
// WRC!) отсутствовала полностью, плюс пропустил Abarth Grande Punto при
// первом проходе по линейке Abarth.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. Fiat 131 (1974, база) + 131 Abarth Rally (трёхкратный чемпион WRC) ===')
const f131 = {
  id: 'fiat-131', label: 'Fiat 131', fullName: 'Fiat 131 Mirafiori',
  type: 'generation', year: 1974, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-131', bodyType: 'sedan', segment: 'midsize_sed', zone: 'midsize_sed',
  hp: 75, engineType: 'i4',
  note: 'Среднеразмерный седан ("Mirafiori" по названию туринского завода) — 1.3-1.6Л I4, 65-75hp на старте. База для гоночной 131 Abarth Rally.',
}
const f131abarth = {
  id: 'fiat-131-abarth-rally', label: 'Fiat 131 Abarth Rally', fullName: 'Fiat 131 Abarth Rally',
  type: 'generation', year: 1976, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-131', bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 140, engineType: 'i4', isRacing: true,
  note: 'ТРЁХКРАТНЫЙ чемпион WRC производителей (1977, 1978, 1980) — одна из самых успешных раллийных машин в истории. Дорожная гомологация — 2.0Л 16v, 140hp; гоночная версия — 200-245hp (в зависимости от эволюции, инжекторные версии). 20 побед в этапах WRC.',
}
graph.nodes.push(f131, f131abarth)
graph.edges.push({ id: 'fiat-131-to-abarthrally', source: 'fiat-131', target: 'fiat-131-abarth-rally', type: 'derived_from', strength: 0.9 })
console.log('  ✅ добавлены Fiat 131 (база) + 131 Abarth Rally, derived_from')

console.log('\n=== 2. Fiat 124 Abarth Rally (1972) — чемпион Европы по ралли 1975 ===')
const f124abarth = {
  id: 'fiat-124-abarth-rally', label: 'Fiat 124 Abarth Rally', fullName: 'Fiat 124 Abarth Rally',
  type: 'generation', year: 1972, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-124-spider', bodyType: 'roadster', segment: 'racing', zone: 'racing',
  hp: 170, engineType: 'i4', isRacing: true,
  note: 'Чемпион Европы по ралли 1975г. (Маурицио Верини). Стандартная версия — 1756cc, 128bhp; полная раллийная настройка — 170bhp; поздние инжекторные версии — до 215hp.',
}
graph.nodes.push(f124abarth)
graph.edges.push({ id: 'fiat-124spider-to-abarthrally', source: 'fiat-124-spider-1966', target: 'fiat-124-abarth-rally', type: 'derived_from', strength: 0.9 })
console.log('  ✅ добавлен Fiat 124 Abarth Rally, fiat-124-spider-1966 --[derived_from]--> fiat-124-abarth-rally')

console.log('\n=== 3. Abarth Grande Punto (2007) — пропущен при первом проходе по линейке Abarth ===')
const abarthGrandePunto = {
  id: 'fiat-abarth-grande-punto', label: 'Abarth Grande Punto', fullName: 'Abarth Grande Punto',
  type: 'generation', year: 2007, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-abarth-grande-punto', bodyType: 'hatchback', segment: 'hot_hatch', zone: 'hatchback',
  hp: 153, engineType: 'i4t',
  note: 'Хот-хэтч версия Grande Punto под маркой Abarth — 1.4Т, 153hp (Esseesse — 177hp).',
}
graph.nodes.push(abarthGrandePunto)
graph.edges.push({ id: 'fiat-grandepunto-to-abarth', source: 'fiat-grande-punto', target: 'fiat-abarth-grande-punto', type: 'derived_from', strength: 0.85 })
console.log('  ✅ добавлен Abarth Grande Punto, fiat-grande-punto --[derived_from]--> fiat-abarth-grande-punto')

console.log('\n=== 4. Abarth 595 Assetto Corse — трек-only клиентская гоночная версия ===')
const assettoCorse = {
  id: 'fiat-abarth-assetto-corse', label: 'Abarth 595 Assetto Corse', fullName: 'Abarth 595 Assetto Corse',
  type: 'generation', year: 2012, brandId: 'fiat', brandName: 'Fiat',
  modelSlug: 'fiat-abarth-500', bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 190, engineType: 'i4t', isRacing: true,
  note: 'Клиентская трек-only гоночная версия (моно-кубок Abarth Trofeo) — 1.4Т 16v, 190-200hp в зависимости от года выпуска.',
}
graph.nodes.push(assettoCorse)
graph.edges.push({ id: 'fiat-abarth595-to-assettocorse', source: 'fiat-abarth-595', target: 'fiat-abarth-assetto-corse', type: 'derived_from', strength: 0.85 })
console.log('  ✅ добавлен Abarth 595 Assetto Corse, fiat-abarth-595 --[derived_from]--> fiat-abarth-assetto-corse')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
