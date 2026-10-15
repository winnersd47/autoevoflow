#!/usr/bin/env node
// По запросу пользователя (2026-08-31, скриншот кластера Haval + "Тут всё
// хватает?"). Найдено 4 пробела, подтверждено веб-поиском (Wikipedia/
// carnewschina/CarExpert/carsguide, 2026-08-31):
//
//   H6 Gen.1 (2011) →evolves_into→ Gen.3 (2021) НАПРЯМУЮ — пропущено целое
//     реальное поколение Gen.2 (2017-2021, тот же системный баг "перескок
//     поколения", что чинили у Koenigsegg/Bugatti/Maserati ранее в этой
//     сессии). Gen.2: 190PS/187hp 2.0Т I4, две версии на старте (Blue Label/
//     Red Label — разные целевые рынки, отличались цветом шильдика).
//   H9 Gen.1 (2014) — снят с производства в начале 2022г., БЕЗ преемника в
//     графе, хотя Gen.2 реально анонсирован и вышел в Китае в 2024г.:
//     221hp (165kW) 2.0Т бензин + опционально 2.4Т дизель.
//   Линейка Tank — в графе только 300 и 500, ДВЕ реальные модели отсутствуют:
//     Tank 400 (дебют 2021 на том же шоу, что и 500; продажи в Китае с авг.
//     2023) — 252hp 2.0Т I4 (есть и PHEV-версия Hi4-T, ~408hp, отдельным
//     узлом не выделяем — за рамками задачи).
//     Tank 700 (продажи с февр. 2024) — флагман линейки, 3.0Т V6 + PHEV,
//     516hp суммарно.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. H6 Gen.2 (2017) — закрываем пропуск поколения ===')
const h6gen2 = {
  id: 'haval-h6-gen2', label: 'Haval H6 Gen.2', fullName: 'Haval H6 Gen.2',
  type: 'generation', year: 2017, brandId: 'haval', brandName: 'Haval',
  modelSlug: 'haval-h6', bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 187, engineType: 'i4t',
  note: 'На той же платформе, что Gen.1 — 2.0Т I4, 190PS/187hp, 310 Нм. На старте продавалась в 2 версиях с разным цветом шильдика под разные целевые аудитории (Blue Label / Red Label).',
}
graph.nodes.push(h6gen2)
const skipIdx = graph.edges.findIndex(e => e.id === 'haval-h6-gen1-evolves-gen3')
if (skipIdx === -1) throw new Error('Не найдено ребро-пропуск Gen.1->Gen.3')
graph.edges.splice(skipIdx, 1)
graph.edges.push(
  { id: 'haval-h6-gen1-to-gen2', source: 'haval-h6-gen1', target: 'haval-h6-gen2', type: 'evolves_into', strength: 0.9 },
  { id: 'haval-h6-gen2-to-gen3', source: 'haval-h6-gen2', target: 'haval-h6-gen3', type: 'evolves_into', strength: 0.9 },
)
console.log('  ✅ добавлен H6 Gen.2, убран прыжок Gen.1→Gen.3, добавлена цепочка Gen.1→Gen.2→Gen.3')

console.log('\n=== 2. H9 Gen.2 (2024) — H9 Gen.1 снят с производства 2022, преемник вышел 2024 ===')
const h9gen2 = {
  id: 'haval-h9-gen2', label: 'Haval H9 Gen.2', fullName: 'Haval H9 Gen.2',
  type: 'generation', year: 2024, brandId: 'haval', brandName: 'Haval',
  modelSlug: 'haval-h9', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 221, engineType: 'i4t',
  note: 'Первое поколение H9 (2014) снято с производства в начале 2022г.; преемник анонсирован и вышел в Китае в 2024г. 2.0Т бензин (165kW/221hp/384Нм) + опциональный 2.4Т дизель.',
}
graph.nodes.push(h9gen2)
graph.edges.push({ id: 'haval-h9-to-gen2', source: 'haval-h9', target: 'haval-h9-gen2', type: 'evolves_into', strength: 0.85 })
console.log('  ✅ добавлен H9 Gen.2, haval-h9 --[evolves_into]--> haval-h9-gen2')

console.log('\n=== 3. Tank 400 (2021/23) и Tank 700 (2024) — линейка Tank была неполной ===')
const tank400 = {
  id: 'tank-400', label: 'Tank 400', fullName: 'GWM Tank 400',
  type: 'generation', year: 2021, brandId: 'haval', brandName: 'Haval',
  modelSlug: 'tank-400', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 252, engineType: 'i4t',
  note: 'Дебют на том же шоу (Шанхай 2021), что и Tank 500; продажи в Китае с авг. 2023г. 2.0Т I4, 252hp/380Нм. Есть также PHEV-версия Hi4-T (~408hp) — отдельным узлом не выделена.',
}
const tank700 = {
  id: 'tank-700', label: 'Tank 700', fullName: 'GWM Tank 700',
  type: 'generation', year: 2024, brandId: 'haval', brandName: 'Haval',
  modelSlug: 'tank-700', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 516, engineType: 'phev',
  note: 'Флагман линейки Tank — продажи в Китае с февр. 2024г. 3.0Т V6 + электромотор (PHEV), суммарно 516hp.',
}
graph.nodes.push(tank400, tank700)
graph.edges.push(
  { id: 'tank-300-to-400', source: 'tank-300', target: 'tank-400', type: 'inspired', strength: 0.7 },
  { id: 'tank-500-to-700', source: 'tank-500', target: 'tank-700', type: 'inspired', strength: 0.75 },
)
console.log('  ✅ добавлены Tank 400 (от 300, тот же старт продаж) и Tank 700 (от 500, новый флагман)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
