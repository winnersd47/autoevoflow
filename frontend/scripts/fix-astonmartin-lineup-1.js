#!/usr/bin/env node
// "Полная проверка" Aston Martin по запросу пользователя (2026-08-27, "Сделай все
// те же действия с брендом Aston Martin"). Часть 1 — DB12/Vantage/DBX/Vanquish/
// Valen/удаление мусорного орфана. Всё подтверждено напрямую на astonmartin.com
// + веб-поиск (autoevolution/motor1/carbuzz/autoblog/forbes/duPont Registry,
// 2026-08-27).
//
//   Aston Martin Dreadnought Concept (сирота, ncs-...) — УДАЛЯЕМ: собственное
//     описание узла гласит "a digital-only military specification vehicle
//     designed exclusively for... Call of Duty: Modern Warfare 4" — это цифровой
//     игровой скин, не реальный автомобиль/концепт-кар. Мусор скрайпера.
//
//   DB12 (671hp, уже в графе, подтверждено — 680PS на astonmartin.com/models/db12)
//     "Five body styles": DB12 / DB12 S / DB12 Volante / DB12 S Volante /
//     DB12 Volante 60th Anniversary. В графе была только DB12 S Volante (690hp),
//     подключённая variant_of НАПРЯМУЮ от DB12 — исправляем на конвенцию
//     GT/GC (cross-body derived_from + локальный variant_of veer), добавляем
//     недостающие DB12 S (coupe) и DB12 Volante (base кабрио).
//
//   Vantage — ПОЛНОСТЬЮ ОТСУТСТВОВАЛО новое поколение 2024 (реализ Feb 2024,
//     базовая версия 665PS/655hp V8 твин-турбо, было в графе только "S Roadster"
//     (671hp) ошибочно подключённый к СТАРОМУ поколению 2018г. (am-vantage2,
//     503hp) вместо нового. Добавляем новое поколение целиком (база/S/Roadster),
//     перецепляем S Roadster на правильную базу.
//
//   DBX — ПОЛНОСТЬЮ ОТСУТСТВОВАЛ (единственный кроссовер Aston Martin!).
//     История: DBX (2020, 542hp) → DBX707 (2022, 697hp, настолько успешна, что
//     базовая версия снята с производства к MY2025 — "facelifted_to", как и
//     MC20→MCPura у Maserati) → DBX S (2026, "возвращение S", 717hp, сейчас
//     сосуществует с 707: "Two styles: DBX707 and DBX S").
//
//   Vanquish (824hp, уже в графе) — добавляем Vanquish Volante (2025, 824hp,
//     кабрио, объявлен март 2025, поставки Q3 2025).
//
//   Valen — сиротский узел скрайпера был почти пустой (нет hp, engineType:i4t
//     неверный — тот же systemic баг). Подтверждено напрямую на astonmartin.com:
//     "most powerful front engine V12 in our history", лимит 150 экз.,
//     850PS/838hp, 1000Nm/738 lb-ft, 214mph.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 0. Удаляем мусорный орфан-узел (видеоигровой скин, не реальный концепт) ===')
const before0 = graph.nodes.length
graph.nodes = graph.nodes.filter(n => n.id !== 'ncs-astonmartin-2026-martin-dreadnought-concept')
console.log('  🗑️  удалено узлов:', before0 - graph.nodes.length, '(Dreadnought Concept — Call of Duty tie-in, не автомобиль)')

console.log('\n=== 1. DB12: добавляем S (coupe) и Volante (base кабрио), перестраиваем рёбра ===')
const db12S = {
  id: 'am-db12-s', label: 'DB12 S', fullName: 'Aston Martin DB12 S',
  type: 'generation', year: 2024, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db12', bodyType: 'coupe', segment: 'gt', zone: 'gt_coupe',
  hp: 690, engineType: 'v8t',
  note: 'Более мощная трим-версия купе DB12 — 690hp/700PS (база — 671hp), тот же 4.0Т V8. Подтверждено напрямую на astonmartin.com.',
}
const db12Volante = {
  id: 'am-db12-volante', label: 'DB12 Volante', fullName: 'Aston Martin DB12 Volante',
  type: 'generation', year: 2023, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db12', bodyType: 'convertible', segment: 'gt', zone: 'open_top',
  hp: 671, engineType: 'v8t',
  note: 'Кабрио-версия DB12 (K-fold складная крыша), тот же 4.0Т V8 671hp/800Nm, что у купе. Представлена вместе с купе в 2023-м.',
}
const db12Volante60th = {
  id: 'am-db12-volante-60th', label: 'DB12 Volante 60th Anniversary', fullName: 'Aston Martin DB12 Volante: 60th Anniversary Edition',
  type: 'generation', year: 2026, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-db12', bodyType: 'convertible', segment: 'gt', zone: 'open_top',
  hp: 671, engineType: 'v8t', isLimited: true,
  note: 'Лимитированная серия к 60-летию модельной линейки Volante (открытых Aston Martin) — тот же 4.0Т V8 671hp, что у базовой Volante, эксклюзивная отделка/цвета.',
}
graph.nodes.push(db12S, db12Volante, db12Volante60th)
console.log('  ✅ добавлен:', db12S.label, '(' + db12S.hp + 'hp)')
console.log('  ✅ добавлен:', db12Volante.label, '(' + db12Volante.hp + 'hp)')
console.log('  ✅ добавлен:', db12Volante60th.label, '(limited)')

// Перецепляем существующее ребро DB12 -> DB12 S Volante: было напрямую от DB12,
// становится variant_of от DB12 Volante (локальный веер, как GT/GC у Maserati).
const db12svIdx = graph.edges.findIndex(e => e.target === 'am-db12-s-volante' && e.type === 'variant_of')
if (db12svIdx === -1) throw new Error('Не найдено ребро DB12 -> DB12 S Volante')
graph.edges[db12svIdx].source = 'am-db12-volante'
console.log('  ✅ ребро перецеплено: am-db12-volante --[variant_of]--> am-db12-s-volante (было от am-db12 напрямую)')

graph.edges.push(
  { id: 'am-db12-to-s', source: 'am-db12', target: 'am-db12-s', type: 'variant_of', strength: 0.9 },
  { id: 'am-db12-to-volante', source: 'am-db12', target: 'am-db12-volante', type: 'derived_from', strength: 0.9 },
  { id: 'am-db12volante-to-60th', source: 'am-db12-volante', target: 'am-db12-volante-60th', type: 'variant_of', strength: 0.85 },
)
console.log('  ✅ am-db12 --[variant_of]--> am-db12-s')
console.log('  ✅ am-db12 --[derived_from]--> am-db12-volante (кросс-кузовной мост)')
console.log('  ✅ am-db12-volante --[variant_of]--> am-db12-volante-60th')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Часть 1 (DB12) готова. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
