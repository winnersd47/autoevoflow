#!/usr/bin/env node
// Škoda/SEAT/Cupra: аудит показал серию пропущенных поколений (skip-generation),
// где граф напрямую соединял Mk1 с современным поколением через 15-20+ лет:
//   - SEAT Toledo: Mk1(1991) --inspired--> "2012" напрямую, пропущены Mk2(1998)/Mk3(2004)
//   - Škoda Fabia: Mk1(1999) --evolves_into--> Mk4(2021) напрямую, пропущены Mk2(2007)/Mk3(2014)
//   - Škoda Superb: Mk2(2008) обрывался, пропущены Mk3(2015)/Mk4(2023)
//   - Škoda Octavia: oct3/A7(2012) обрывался, пропущено текущее Mk4/NX/A8(2019)
//   - Škoda Slavia: был только одинокий узел фейслифта 2027г без базового поколения 2022г
// Плюс отдельные баги: невалидный zone="compact_sed" на обоих Toledo, опечатка
// типа ребра "inspired" вместо "inspired_by", неверное evolves_into Octavia→Epiq
// (Epiq — не преемник Octavia, это отдельная новая EV-модель), Peaq ошибочно
// помечен ДВС-турбо (i4t) хотя это полностью электромобиль на MEB, и неверный
// год/кузов/мощность у Epiq. Источники проверены через веб-поиск (Wikipedia,
// autoevolution, carexpert, electrive, briskoda forums) 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  g.nodes.push(node); byId.set(node.id, node)
  console.log(`  ✅ ${node.id} (${node.year}, ${node.hp ?? '?'} л.с.)`)
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
function retypeEdge(id, newType, newStrength) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  console.log(`  🔄 ${id}: ${e.type}(${e.strength}) → ${newType}(${newStrength})`)
  e.type = newType; e.strength = newStrength
}
function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch))
}

console.log('=== 1. SEAT Toledo: добавляем Mk2(1998)/Mk3(2004) ===')
addNode({
  id: 'seat-toledo-mk2', label: 'Toledo Mk2', fullName: 'SEAT Toledo Mk2',
  type: 'generation', year: 1998, brandId: 'seat', brandName: 'SEAT',
  codeName: '1M', modelSlug: 'seat-toledo',
  bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed',
  hp: 125, engineType: 'i4',
  note: '2-е поколение (Typ 1M, Париж-1998) — платформа Golf Mk4/PQ34 (VW Group A4), общая с León Mk1. Кузов — 4-дверный фастбек вместо хэтчбека Mk1. Флагманский бензин — 1.8 20V 125hp; также были 2.3 V5 и дизели 1.9 TDI до 110hp.',
})
addNode({
  id: 'seat-toledo-mk3', label: 'Toledo Mk3', fullName: 'SEAT Toledo Mk3',
  type: 'generation', year: 2004, brandId: 'seat', brandName: 'SEAT',
  codeName: '5P', modelSlug: 'seat-toledo',
  bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed',
  hp: 170, engineType: 'i4d',
  note: '3-е поколение (Typ 5P, Париж-2004), дизайн Вальтера де Сильва — платформа PQ35/"A5" (как Golf Mk5, Audi A3 8P, Octavia Mk2), кузов-гибрид седан/5-местный минивэн на базе Altea. Бензин 86-102 л.с. (1.4/1.6), дизели 105-170 л.с. — указано 170hp (2.0 TDI, топ-версия).',
})
addEdge('e-toledo-mk1-mk2', 'seat-toledo-mk1', 'seat-toledo-mk2', 'evolves_into', 0.9)
addEdge('e-toledo-mk2-mk3', 'seat-toledo-mk2', 'seat-toledo-mk3', 'evolves_into', 0.9)
addEdge('e-toledo-mk3-2012', 'seat-toledo-mk3', 'seat-toledo-2012', 'evolves_into', 0.85)
addEdge('e-golf4-toledomk2', 'vw-golf4', 'seat-toledo-mk2', 'shares_platform', 0.9)
addEdge('e-golf5-toledomk3', 'vw-golf5', 'seat-toledo-mk3', 'shares_platform', 0.9)

console.log('\n=== 2. Škoda Fabia: добавляем Mk2(2007)/Mk3(2014) ===')
addNode({
  id: 'skoda-fabia-2', label: 'Škoda Fabia Mk2 (2007)',
  type: 'generation', year: 2007, brandId: 'skoda', brandName: 'Škoda',
  modelSlug: 'skoda-fabia-2', familyKey: 'skoda-fabia',
  bodyType: 'hatchback', segment: 'city', zone: 'hatchback',
  hp: 180, engineType: 'i4t',
  note: 'Женева-2007, платформа PQ24 (как и Mk1), более крупный кузов. Указана вершина линейки — vRS на уникальном 1.4 TSI "twincharger" (турбо+компрессор), 180hp, 0-100 за 7.3с. Продано 1.7 млн экз.',
})
addNode({
  id: 'skoda-fabia-3', label: 'Škoda Fabia Mk3 (2014)',
  type: 'generation', year: 2014, brandId: 'skoda', brandName: 'Škoda',
  modelSlug: 'skoda-fabia-3', familyKey: 'skoda-fabia',
  bodyType: 'hatchback', segment: 'city', zone: 'hatchback',
  hp: 110, engineType: 'i4t',
  note: 'Платформа PQ26 (гибрид PQ25+MQB). Единственное поколение Fabia БЕЗ версии vRS — Škoda официально отменила её из-за продаж <1% (на фоне успеха Octavia vRS); вместо этого косметический пакет "Monte Carlo" разошёлся тиражом 20 000 шт. при плане 3000. Топ-мотор — 1.2 TSI 110hp.',
})
addEdge('e-fabia-mk1-mk2', 'skoda-fabia-1', 'skoda-fabia-2', 'evolves_into', 0.9)
addEdge('e-fabia-mk2-mk3', 'skoda-fabia-2', 'skoda-fabia-3', 'evolves_into', 0.9)
addEdge('e-fabia-mk3-mk4', 'skoda-fabia-3', 'skoda-fabia-4', 'evolves_into', 0.9)

console.log('\n=== 3. Škoda Superb: добавляем Mk3(2015)/Mk4(2023) ===')
addNode({
  id: 'skoda-superb3', label: 'Superb Mk3', fullName: 'Škoda Superb Mk3',
  type: 'generation', year: 2015, brandId: 'skoda', brandName: 'Škoda',
  codeName: '3V', modelSlug: 'skoda-superb',
  bodyType: 'sedan', segment: 'executive', zone: 'exec_sed',
  hp: 280, engineType: 'i4t',
  note: '3-е поколение (Typ 3V) — первый Superb на модульной MQB (растянутая колёсная база). Диапазон бензин 1.4-2.0 TSI (125-280hp) и дизель 1.6-2.0 TDI (120-190hp); указан топ — 2.0 TSI 280hp 4×4. Фейслифт 2019г, выпуск до 2023/2025 (liftback допродавался дольше универсала).',
})
addNode({
  id: 'skoda-superb4', label: 'Superb Mk4', fullName: 'Škoda Superb Mk4',
  type: 'generation', year: 2023, brandId: 'skoda', brandName: 'Škoda',
  modelSlug: 'skoda-superb',
  bodyType: 'sedan', segment: 'executive', zone: 'exec_sed',
  hp: 265, engineType: 'i4t',
  note: '4-е (текущее) поколение, представлено в 2023г — удлинённая версия MQB Evo (как и Passat B9, выпускаются на одной линии). Топ-мотор ДВС — 2.0 TSI 265hp 4×4 (195кВт, EA888 evo4), 0-100 за 5.6с; есть и PHEV-версия.',
})
addEdge('e-superb-mk2-mk3', 'skoda-superb2', 'skoda-superb3', 'evolves_into', 0.9)
addEdge('e-superb-mk3-mk4', 'skoda-superb3', 'skoda-superb4', 'evolves_into', 0.9)

console.log('\n=== 4. Škoda Octavia: добавляем Mk4/NX(2019), отвязываем Epiq ===')
addNode({
  id: 'skoda-oct-nx', label: 'Octavia Mk4', fullName: 'Škoda Octavia Mk4',
  type: 'generation', year: 2019, brandId: 'skoda', brandName: 'Škoda',
  codeName: 'A8', modelSlug: 'skoda-octavia',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 204, engineType: 'i4t',
  note: '4-е (текущее) поколение (внутр. код A8/NX) — платформа MQB Evo, общая с Golf Mk8 и Audi A3. Диапазон 110-204hp (1.0/1.5 TSI, есть MHEV); указан топ ДВС без учёта vRS. Также есть PHEV iV и vRS-версии.',
})
deleteEdge('sync-ev-skoda-oct3-ncs-skoda-2027-skoda-epiq') // Octavia НЕ эволюционирует в Epiq — это отдельная новая EV-модель, не преемник
addEdge('e-oct3-octnx', 'skoda-oct3', 'skoda-oct-nx', 'evolves_into', 0.9)
fixNode('skoda-oct3', { modelSlug: 'skoda-octavia' }) // был не проставлен, из-за чего не группировался с a4/a5

console.log('\n=== 5. Škoda Slavia: добавляем базовое поколение 2022г ===')
addNode({
  id: 'skoda-slavia-1', label: 'Škoda Slavia (2022)',
  type: 'generation', year: 2022, brandId: 'skoda', brandName: 'Škoda',
  modelSlug: 'skoda-slavia',
  bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed',
  hp: 150, engineType: 'i4t',
  note: 'Дебют имени (возрождено из истории бренда) — компактный седан для Индии и ряда других рынков на платформе MQB-A0-IN, технический близнец VW Virtus. Топ-мотор 1.5 TSI EVO 150hp/DSG; базовый — 1.0 TSI 115hp. Узел-рестайлинг 2027г уже был в графе без этой базы.',
})
addEdge('e-slavia-1-fl2027', 'skoda-slavia-1', 'ncs-skoda-2027-slavia', 'facelifted_to', 0.9)

console.log('\n=== 6. Точечные фактические правки ===')
fixNode('seat-toledo-mk1', { zone: 'midsize_sed' }) // "compact_sed" не существует в ZONES-энуме validate-graph.js
fixNode('seat-toledo-2012', { zone: 'midsize_sed', codeName: 'NH (PQ25)' }) // платформа PQ25 (Polo Mk5/Rapid-твин), не MQB — MQB дебютировал в тот же год на Golf7, но Toledo/Rapid NH это не он
deleteEdge('e-toledo1-2012') // прямое "inspired" Mk1→2012 (опечатка типа + 21 год разрыва) заменено цепочкой Mk1→Mk2→Mk3→2012

fixNode('ncs-skoda-2027-skoda-epiq', { brandName: 'Škoda', year: 2026, hp: 215, bodyType: 'suv', segment: 'compact_suv' })
// Epiq: реальный старт продаж — июнь 2026 (не 2027), это компактный электро-SUV (как Puma Gen-E),
// НЕ купе. Топ-версия Epiq 55 — 215hp/52kWh/~430км WLTP.

fixNode('ncs-skoda-2027-peaq', { brandName: 'Škoda', engineType: 'ev', hp: 286 })
// Peaq ошибочно был i4t (турбо-ДВС) — по факту полностью электрический флагман на MEB.
// Линейка Peaq 60(204hp)/90(286hp)/90x(AWD,~299hp) — указан средний/топовый RWD-вариант 90.
retypeEdge('skoda-peaq-enyaq-der', 'shares_platform', 0.75)
// derived_from подразумевает "Peaq создан НА БАЗЕ Enyaq" — по факту это два отдельных
// флагмана-соседа на одной MEB-платформе, не прямой донор/дериватив.

fixNode('ncs-skoda-2027-slavia', { brandName: 'Škoda', hp: 150, segment: 'compact' })
// hp был undefined; 1.5 TSI EVO2 150hp — топ-мотор фейслифта (не меняется относительно базы).

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
