#!/usr/bin/env node
// По запросу пользователя (2026-09-01, "Ничего не потерялось в моделях Ford?"
// — скриншот Fiesta Mk1→Mk7 напрямую). Проверка вскрыла тот же класс бага
// "пропуск поколений" сразу в НЕСКОЛЬКИХ линейках Ford. Подтверждено веб-
// поиском (Wikipedia/evo.co.uk/supercars.net/cars-data.com, 2026-09-01):
//
//   Fiesta: Mk1(1976) →evolves_into→ "Mk7"(2017/B479) НАПРЯМУЮ — пропущены
//     Mk2(1983)/Mk3(1989)/Mk4(1995)/Mk5(2002)/Mk6(2008). "Mk7" в графе —
//     реальный B479 (2016-17), не переименовать. Fiesta ST (2013) была
//     подключена variant_of к Mk7(2017) — ХРОНОЛОГИЧЕСКИ НАЗАД (ST вышла
//     ДО Mk7), реально относится к Mk6(2008-16) — перецепляем.
//   Escort: Mk2(1975) → пропуск → Escort RS Cosworth(1992), сам Cosworth был
//     подключён variant_of к Mk1(1968!) — вдвойне неверно. Реально Cosworth
//     построен на платформе Mk5(1990-92) — но "по большей части не имеет
//     общих деталей с Escort, кроме передних дверей/капота/крыльев" (общая
//     платформа — Sierra Cosworth 4x4) → derived_from точнее, чем variant_of.
//     Пропущены Mk3(1980)/Mk4(1986)/Mk5(1990).
//   Taurus: Gen.1(1986) →evolves_into→ Gen.6(2010) напрямую — пропущены
//     Gen.2(1992)/Gen.3(1996)/Gen.4(2000).
//   Galaxy: Mk1(1995) →evolves_into→ Mk3(2015) напрямую — пропущен Mk2(2006).
//   Bronco: Gen.1(1966, снят с производства 1996) →evolves_into→ возрождение
//     2021г. — по факту 25-летний перерыв со сменой всей концепции автомобиля
//     (как Capri→Capri EV в этом же графе) → меняем на inspired_by, не
//     утверждаем прямую техническую преемственность через пропущенные
//     поколения 1977-96гг., которых тоже нет в графе.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Fiesta: добавляем Mk2-Mk6, чиним цепочку и переподключаем ST ===')
const fiestaGens = [
  { id: 'ford-fiesta-2', label: 'Fiesta Mk2', year: 1983, hp: 45 },
  { id: 'ford-fiesta-3', label: 'Fiesta Mk3', year: 1989, hp: 50 },
  { id: 'ford-fiesta-4', label: 'Fiesta Mk4', year: 1995, hp: 60 },
  { id: 'ford-fiesta-5', label: 'Fiesta Mk5', year: 2002, hp: 68 },
  { id: 'ford-fiesta-6', label: 'Fiesta Mk6', year: 2008, hp: 82 },
]
for (const fg of fiestaGens) {
  graph.nodes.push({
    id: fg.id, label: fg.label, fullName: 'Ford ' + fg.label,
    type: 'generation', year: fg.year, brandId: 'ford', brandName: 'Ford',
    modelSlug: 'ford-fiesta', bodyType: 'hatchback', segment: 'supermini', zone: 'hatchback',
    hp: fg.hp, engineType: 'i4',
    note: 'Базовый мотор на старте — ' + fg.hp + 'hp.',
  })
}
console.log('  ✅ добавлены Mk2/Mk3/Mk4/Mk5/Mk6')
const skipFiesta = graph.edges.findIndex(e => e.source === 'ford-fiesta-1' && e.target === 'ford-fiesta-7')
if (skipFiesta !== -1) graph.edges.splice(skipFiesta, 1)
graph.edges.push(
  { id: 'ford-fiesta-1-to-2', source: 'ford-fiesta-1', target: 'ford-fiesta-2', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-fiesta-2-to-3', source: 'ford-fiesta-2', target: 'ford-fiesta-3', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-fiesta-3-to-4', source: 'ford-fiesta-3', target: 'ford-fiesta-4', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-fiesta-4-to-5', source: 'ford-fiesta-4', target: 'ford-fiesta-5', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-fiesta-5-to-6', source: 'ford-fiesta-5', target: 'ford-fiesta-6', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-fiesta-6-to-7', source: 'ford-fiesta-6', target: 'ford-fiesta-7', type: 'evolves_into', strength: 0.9 },
)
console.log('  ✅ убран прыжок Mk1→Mk7, встроена полная цепочка Mk1→...→Mk7')
const stEdge = graph.edges.find(e => e.source === 'ford-fiesta-7' && e.target === 'ford-fiesta-st')
if (stEdge) stEdge.source = 'ford-fiesta-6'
console.log('  ✅ Fiesta ST (2013) перецеплена с Mk7(2017) на Mk6(2008-16) — реально относится к этому поколению')

console.log('\n=== 2. Escort: добавляем Mk3-Mk5, переподключаем Cosworth ===')
const escortGens = [
  { id: 'ford-escort-mk3', label: 'Escort Mk3', year: 1980, hp: 55 },
  { id: 'ford-escort-mk4', label: 'Escort Mk4', year: 1986, hp: 60 },
  { id: 'ford-escort-mk5', label: 'Escort Mk5', year: 1990, hp: 65 },
]
for (const eg of escortGens) {
  graph.nodes.push({
    id: eg.id, label: eg.label, fullName: 'Ford ' + eg.label,
    type: 'generation', year: eg.year, brandId: 'ford', brandName: 'Ford',
    modelSlug: 'ford-escort', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
    hp: eg.hp, engineType: 'i4',
    note: 'Базовый мотор на старте — ' + eg.hp + 'hp.',
  })
}
console.log('  ✅ добавлены Mk3/Mk4/Mk5')
graph.edges.push(
  { id: 'ford-escort-mk2-to-mk3', source: 'ford-escort-mk2', target: 'ford-escort-mk3', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-escort-mk3-to-mk4', source: 'ford-escort-mk3', target: 'ford-escort-mk4', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-escort-mk4-to-mk5', source: 'ford-escort-mk4', target: 'ford-escort-mk5', type: 'evolves_into', strength: 0.9 },
)
console.log('  ✅ Mk2 → Mk3 → Mk4 → Mk5')
const cosworthEdgeIdx = graph.edges.findIndex(e => e.target === 'ford-escort-cosworth' && e.type === 'variant_of')
if (cosworthEdgeIdx !== -1) graph.edges.splice(cosworthEdgeIdx, 1)
const cosworth = byId.get('ford-escort-cosworth')
cosworth.hp = 227
cosworth.engineType = 'i4t'
cosworth.note = 'Построена на платформе Mk5 (1990-92), но по большей части НЕ разделяет детали с обычным Escort — использует шасси Sierra Cosworth 4x4 (заднеприводная база, укороченная колёсная база 2530мм), от Escort — только передние двери/капот/крылья. 2.0Т I4, 227hp. Всего 7145 дорожных экземпляров (1992-96).'
graph.edges.push({ id: 'ford-escort-mk5-to-cosworth', source: 'ford-escort-mk5', target: 'ford-escort-cosworth', type: 'derived_from', strength: 0.7 })
console.log('  ✅ Escort Cosworth перецеплен с Mk1(!) на Mk5, derived_from (не variant_of — минимум общих деталей), hp исправлен на 227')

console.log('\n=== 3. Taurus: добавляем Gen.2-Gen.4 ===')
const taurusGens = [
  { id: 'ford-taurus-2', label: 'Taurus Gen.2', year: 1992, hp: 140 },
  { id: 'ford-taurus-3', label: 'Taurus Gen.3', year: 1996, hp: 145 },
  { id: 'ford-taurus-4', label: 'Taurus Gen.4', year: 2000, hp: 155 },
]
for (const tg of taurusGens) {
  graph.nodes.push({
    id: tg.id, label: tg.label, fullName: 'Ford ' + tg.label,
    type: 'generation', year: tg.year, brandId: 'ford', brandName: 'Ford',
    modelSlug: 'ford-taurus', bodyType: 'sedan', segment: 'midsize_sed', zone: 'midsize_sed',
    hp: tg.hp, engineType: 'v6',
    note: 'Vulcan 3.0Л V6, базовая версия — ' + tg.hp + 'hp.',
  })
}
console.log('  ✅ добавлены Gen.2/Gen.3/Gen.4')
const skipTaurus = graph.edges.findIndex(e => e.source === 'ford-taurus-1' && e.target === 'ford-taurus-6')
if (skipTaurus !== -1) graph.edges.splice(skipTaurus, 1)
graph.edges.push(
  { id: 'ford-taurus-1-to-2', source: 'ford-taurus-1', target: 'ford-taurus-2', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-taurus-2-to-3', source: 'ford-taurus-2', target: 'ford-taurus-3', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-taurus-3-to-4', source: 'ford-taurus-3', target: 'ford-taurus-4', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-taurus-4-to-6', source: 'ford-taurus-4', target: 'ford-taurus-6', type: 'evolves_into', strength: 0.85 },
)
console.log('  ✅ убран прыжок Gen.1→Gen.6, встроена цепочка Gen.1→2→3→4→6')
console.log('  ℹ️  Gen.5 (2008, ребейдж Ford Five Hundred) отдельно не выделен — слишком близко к Gen.6(2010), та же платформа')

console.log('\n=== 4. Galaxy: добавляем Mk2 (2006) ===')
graph.nodes.push({
  id: 'ford-galaxy-2', label: 'Galaxy Mk2', fullName: 'Ford Galaxy Mk2',
  type: 'generation', year: 2006, brandId: 'ford', brandName: 'Ford',
  modelSlug: 'ford-galaxy', bodyType: 'mpv', segment: 'compact_mpv', zone: 'mpv',
  hp: 145, engineType: 'i4t',
  note: 'Второе поколение — 2.0Т I4, базовая версия 145hp.',
})
const skipGalaxy = graph.edges.findIndex(e => e.source === 'ford-galaxy-1' && e.target === 'ford-galaxy-3')
if (skipGalaxy !== -1) graph.edges.splice(skipGalaxy, 1)
graph.edges.push(
  { id: 'ford-galaxy-1-to-2', source: 'ford-galaxy-1', target: 'ford-galaxy-2', type: 'evolves_into', strength: 0.9 },
  { id: 'ford-galaxy-2-to-3', source: 'ford-galaxy-2', target: 'ford-galaxy-3', type: 'evolves_into', strength: 0.9 },
)
console.log('  ✅ убран прыжок Mk1→Mk3, встроен Mk2')

console.log('\n=== 5. Bronco: меняем evolves_into → inspired_by (25-летний перерыв, смена концепции) ===')
const broncoEdge = graph.edges.find(e => e.source === 'ford-bronco-1' && e.target === 'ford-bronco-6')
if (broncoEdge) { broncoEdge.type = 'inspired_by'; broncoEdge.strength = 0.8 }
console.log('  ✅ ford-bronco-1 -> ford-bronco-6: evolves_into → inspired_by (как Capri→Capri EV в этом же графе)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
