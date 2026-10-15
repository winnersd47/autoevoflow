#!/usr/bin/env node
// Две независимые задачи из одного сообщения пользователя:
// А) Соперники Lynk & Co 03 TCR по WTCR — Honda/Hyundai/Audi/Cupra.
// Б) Полная проверка кластера Daihatsu (Charade/Terios/Copen) — Copen
//    оказался полным (Gen.1→2, реально только 2 поколения), но Charade и
//    Terios пропускают поколения (тот же баг, что у Ford Fiesta/Taurus
//    ранее в этой сессии).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return false }
  graph.nodes.push(node); byId.set(node.id, node); return true
}
function addEdge(id, source, target, type, strength) {
  graph.edges.push({ id, source, target, type, strength })
}

console.log('=== А) Соперники Lynk & Co 03 TCR в WTCR ===')

if (addNode({
  id: 'honda-civic-type-r-tcr', label: 'Civic Type R TCR', fullName: 'Honda Civic Type R TCR',
  type: 'generation', year: 2018, brandId: 'honda', brandName: 'Honda',
  codeName: 'FK7/FK8 TCR', modelSlug: 'honda-civic-type-r-tcr',
  bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 340, engineType: 'i4t', engineCC: 1996, isRacing: true,
  note: 'Соперник Lynk & Co 03 TCR в WTCR. K20C1 турбо I4, 340hp/420Нм, 6-ст. секвентальная Xtrac, 1265кг. Работал в WTCR через Münnich Motorsport. Дважды признан "Model of the Year" по версии TCR (2019, 2020). База — серийный Civic Type R FK8.',
})) addEdge('honda-civicfk8-to-tcr', 'honda-civic-fk8', 'honda-civic-type-r-tcr', 'derived_from', 0.6)

if (addNode({
  id: 'hyundai-i30n-tcr', label: 'i30 N TCR', fullName: 'Hyundai i30 N TCR',
  type: 'generation', year: 2018, brandId: 'hyundai', brandName: 'Hyundai',
  codeName: 'PD i30 N TCR', modelSlug: 'hyundai-i30n-tcr',
  bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 350, engineType: 'i4t', engineCC: 1998, isRacing: true,
  note: 'Соперник Lynk & Co 03 TCR в WTCR. Мотор Theta II (G4KH) турбо I4, 350hp/460Нм, 6-ст. Xtrac, 1265кг. Принёс Hyundai самый первый чемпионский титул WTCR (2018) — до дебюта Lynk & Co. Работал через BRC Racing Team. Дорожная база (Hyundai i30 N) пока не представлена в графе отдельным узлом — эта запись пока без родителя.',
})) {}

if (addNode({
  id: 'audi-rs3-lms-tcr', label: 'RS3 LMS TCR', fullName: 'Audi RS3 LMS TCR',
  type: 'generation', year: 2017, brandId: 'audi', brandName: 'Audi',
  codeName: '8V TCR', modelSlug: 'audi-rs3-lms-tcr',
  bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 335, engineType: 'i4t', engineCC: 1984, isRacing: true,
  note: 'Соперник Lynk & Co 03 TCR в WTCR. Мотор EA888 (архитектура VW Group) турбо I4, 330-340hp/460Нм, 6-ст. секвентальная Xtrac. В WTCR выступал через частные команды (Comtoyou Racing, WRT) под эгидой Audi Sport. База — 8V-поколение RS3.',
})) addEdge('audirs3-8v-to-tcr', 'audi-rs3-8v', 'audi-rs3-lms-tcr', 'derived_from', 0.6)

if (addNode({
  id: 'cupra-leon-competicion-tcr', label: 'Leon Competición TCR', fullName: 'CUPRA Leon Competición TCR',
  type: 'generation', year: 2021, brandId: 'cupra', brandName: 'CUPRA',
  codeName: 'Competición TCR', modelSlug: 'cupra-leon-tcr',
  bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 340, engineType: 'i4t', engineCC: 2000, isRacing: true,
  note: 'Соперник Lynk & Co 03 TCR в WTCR. 2.0Т I4, 340PS/410Нм, 6-ст. секвентальная. Официальная гоночная программа CUPRA Racing — продолжение более ранней линии SEAT León Cupra TCR (в TCR с 2015г.). База — серийный CUPRA Leon.',
})) addEdge('cupraleon-to-tcr', 'cupra-leon', 'cupra-leon-competicion-tcr', 'derived_from', 0.6)

console.log('\n=== Б) Daihatsu Charade — пропущены Gen.2 и Gen.3 ===')
if (addNode({
  id: 'daihatsu-charade-2', label: 'Daihatsu Charade Gen.2 (1983)',
  type: 'generation', year: 1983, brandId: 'daihatsu', brandName: 'Daihatsu',
  modelSlug: 'daihatsu-charade-2', familyKey: 'daihatsu-charade',
  bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 52, engineType: 'i3', codeName: 'G11',
  note: '1.0L атмо I3, 52hp. 3- и 5-дверный хэтчбек, была и дизельная версия (37hp).',
})) {}
if (addNode({
  id: 'daihatsu-charade-3', label: 'Daihatsu Charade Gen.3 (1987)',
  type: 'generation', year: 1987, brandId: 'daihatsu', brandName: 'Daihatsu',
  modelSlug: 'daihatsu-charade-3', familyKey: 'daihatsu-charade',
  bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 103, engineType: 'i3t', codeName: 'G100 GTti',
  note: 'Топ-версия GTti — первый в мире серийный турбомотор объёмом 1.0Л (CB70, турбина IHI RHB51), 103hp/130Нм, 0-60 за 8с. Та же линейка GTti продолжилась и в Gen.4.',
})) {}

const nBefore = graph.edges.length
graph.edges = graph.edges.filter(e => e.id !== 'e-dai-cha1-cha4')
addEdge('e-dai-cha1-cha2', 'daihatsu-charade-1', 'daihatsu-charade-2', 'evolves_into', 0.9)
addEdge('e-dai-cha2-cha3', 'daihatsu-charade-2', 'daihatsu-charade-3', 'evolves_into', 0.9)
addEdge('e-dai-cha3-cha4', 'daihatsu-charade-3', 'daihatsu-charade-4', 'evolves_into', 0.9)
console.log(`  🗑️  удалено прямое ребро Gen.1→Gen.4 (${nBefore - graph.edges.length}), добавлена полная цепочка 1→2→3→4`)

console.log('\n=== Б) Daihatsu Terios — пропущены Gen.2 и Gen.3 ===')
if (addNode({
  id: 'daihatsu-terios-2', label: 'Daihatsu Terios Gen.2 (2006)',
  type: 'generation', year: 2006, brandId: 'daihatsu', brandName: 'Daihatsu',
  modelSlug: 'daihatsu-terios-2', familyKey: 'daihatsu-terios',
  bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 105, engineType: 'i4', codeName: 'J200',
  note: '1.5L атмо I4, 105hp/134Нм. Не путать с "Terios Kid" — упрощённой японской kei-версией под тем же именем.',
})) {}
if (addNode({
  id: 'daihatsu-terios-3', label: 'Daihatsu Terios Gen.3 (2017)',
  type: 'generation', year: 2017, brandId: 'daihatsu', brandName: 'Daihatsu',
  modelSlug: 'daihatsu-terios-3', familyKey: 'daihatsu-terios',
  bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 104, engineType: 'i4', codeName: 'F800',
  note: 'Полностью новая платформа (общая с Daihatsu Xenia/Toyota Avanza). Мотор 2NR-VE 1.5L, 104PS/136Нм. Бейдж-инженерный близнец — Toyota Rush (та же платформа, тот же мотор; узла Toyota Rush пока нет в графе).',
})) {}
graph.edges = graph.edges.filter(e => e.id !== 'e-dai-ter-rush')
addEdge('e-dai-ter1-ter2', 'daihatsu-terios-1', 'daihatsu-terios-2', 'evolves_into', 0.9)
addEdge('e-dai-ter2-ter3', 'daihatsu-terios-2', 'daihatsu-terios-3', 'evolves_into', 0.9)
addEdge('e-dai-ter-cha4-restored', 'daihatsu-terios-1', 'daihatsu-charade-4', 'inspired_by', 0.55)
console.log('  ✅ добавлена цепочка Terios 1→2→3 (старое inspired_by-ребро к Charade Gen.4 сохранено на Gen.1)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
