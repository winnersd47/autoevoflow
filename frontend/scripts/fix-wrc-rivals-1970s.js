#!/usr/bin/env node
// Соперники Fiat 131 Abarth в WRC 1970-80х — по запросу пользователя
// (2026-08-31, "Делай всё"). Хронология титулов производителей WRC:
// 1973 Alpine-Renault (уже в графе) → 1974-76 Lancia Stratos → 1977-78 Fiat
// 131 Abarth (уже в графе) → 1979 Datsun Violet → 1980 Fiat 131 Abarth
// (уже в графе) → 1981 Talbot Sunbeam-Lotus → 1982-84 Audi Quattro (новая
// эра полного привода). Подтверждено веб-поиском (Wikipedia/WRC.com/
// autoevolution/automobile-catalog/tech-racingcars.wikidot.com/Hagerty,
// 2026-08-31).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Lancia Stratos HF Rally (1974) — чемпион WRC 1974/75/76 ===')
const stratosRally = {
  id: 'lancia-stratos-rally', label: 'Stratos HF Rally', fullName: 'Lancia Stratos HF Rally (Gruppo 4)',
  type: 'generation', year: 1974, brandId: 'lancia', brandName: 'Lancia',
  modelSlug: 'lancia-stratos', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 280, engineType: 'v6', isRacing: true,
  note: 'Заводская гоночная версия (группа 4) — чемпион WRC производителей ТРИ ГОДА ПОДРЯД (1974, 1975, 1976). Тот же 2.4Л V6 Dino, что у дорожной Stradale (188hp), но форсирован до 280hp (были и турбо-эксперименты до 480hp). На 100кг легче дорожной версии.',
}
graph.nodes.push(stratosRally)
graph.edges.push({ id: 'lancia-stratos-to-rally', source: 'lancia-stratos', target: 'lancia-stratos-rally', type: 'derived_from', strength: 0.9 })
console.log('  ✅ добавлен Stratos HF Rally, lancia-stratos --[derived_from]--> lancia-stratos-rally')

console.log('\n=== 2. Ford Escort Mk2 (1975, база) + RS1800 (чемпион WRC 1979) ===')
const escortMk2 = {
  id: 'ford-escort-mk2', label: 'Escort Mk2', fullName: 'Ford Escort Mk2',
  type: 'generation', year: 1975, brandId: 'ford', brandName: 'Ford',
  modelSlug: 'ford-escort', bodyType: 'sedan', segment: 'compact', zone: 'sedan',
  hp: 115, engineType: 'i4',
  note: 'Второе поколение Escort — 1.8Л I4, 115hp на старте. База для гоночной RS1800.',
}
const rs1800 = {
  id: 'ford-escort-rs1800', label: 'Escort RS1800', fullName: 'Ford Escort RS1800',
  type: 'generation', year: 1975, brandId: 'ford', brandName: 'Ford',
  modelSlug: 'ford-escort', bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 250, engineType: 'i4', isRacing: true,
  note: 'Чемпион WRC производителей 1979г. (Ханну Микконен) — ПОСЛЕДНИЙ заднеприводный автомобиль, выигравший WRC, перед эрой полного привода Audi Quattro. Cosworth BDA → с 1979г. BDG (2.0Л, алюминиевый блок), до 250hp, 5-ступ. ZF.',
}
graph.nodes.push(escortMk2, rs1800)
graph.edges.push(
  { id: 'ford-escort-to-mk2', source: 'ford-escort', target: 'ford-escort-mk2', type: 'evolves_into', strength: 0.85 },
  { id: 'ford-escortmk2-to-rs1800', source: 'ford-escort-mk2', target: 'ford-escort-rs1800', type: 'derived_from', strength: 0.9 },
)
console.log('  ✅ добавлены Escort Mk2 (evolves_into от Mk1) + RS1800 (derived_from Mk2)')

console.log('\n=== 3. Datsun/Nissan Violet 160J GT (1979) — чемпион WRC 1979 ===')
const violet = {
  id: 'nissan-violet-160j', label: 'Datsun Violet 160J GT', fullName: 'Datsun (Nissan) Violet 160J GT',
  type: 'generation', year: 1979, brandId: 'nissan', brandName: 'Nissan',
  modelSlug: 'nissan-violet', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 87, engineType: 'i4', isRacing: true,
  note: 'Чемпион WRC производителей 1979г. вместе с Ford Escort RS1800 — победа на изматывающем Сафари-ралли (Шекхар Мехта) достигнута не мощностью (стандартная SSS Coupe — всего 87hp), а надёжностью в тяжелейших африканских условиях. Более развитая версия группы 4 (~1981) достигала 230hp.',
}
graph.nodes.push(violet)
console.log('  ✅ добавлен Datsun Violet 160J GT (корневой узел — самостоятельная линейка Nissan, не в графе)')

console.log('\n=== 4. Talbot Sunbeam-Lotus (1981) — чемпион WRC 1981, НОВЫЙ БРЕНД ===')
const sunbeamLotus = {
  id: 'talbot-sunbeam-lotus', label: 'Sunbeam-Lotus', fullName: 'Talbot Sunbeam-Lotus',
  type: 'generation', year: 1981, brandId: 'talbot', brandName: 'Talbot',
  modelSlug: 'talbot-sunbeam', bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 150, engineType: 'i4', isRacing: true,
  note: 'Чемпион WRC производителей 1981г. — последний титул перед революцией полного привода Audi Quattro. Мотор Lotus 2.2Л 16v slant-four (спроектирован Lotus для Sunbeam) — 150hp в дорожной версии, ~250hp в раллийной. Бренд Talbot — бывший Chrysler Europe, куплен PSA/Peugeot в 1978-79гг.',
}
graph.nodes.push(sunbeamLotus)
console.log('  ✅ добавлен Talbot Sunbeam-Lotus (первый узел нового бренда Talbot, добавлен в BRAND_WHITELIST)')

console.log('\n=== 5. Audi Quattro Group B / A2 (1982-84) — открывает эру полного привода ===')
const quattroRally = {
  id: 'audi-quattro-group-b', label: 'Quattro Group B', fullName: 'Audi Quattro Group B (A2)',
  type: 'generation', year: 1982, brandId: 'audi', brandName: 'Audi',
  modelSlug: 'audi-quattro', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 350, engineType: 'i5t', isRacing: true,
  note: 'Заводская гоночная версия (группа B, эволюция A2) — чемпион WRC производителей 1982, 1984 (плюс личный титул пилотов 1983-84). Революция: ПЕРВЫЙ полноприводный автомобиль-чемпион WRC — навсегда изменил ралли, положив конец эре заднеприводных машин вроде Stratos/131/Escort/Violet/Sunbeam. 2.1Л турбо I5, ~350hp (дорожная Sport Quattro омологации — 302hp).',
}
graph.nodes.push(quattroRally)
graph.edges.push({ id: 'audi-quattro-to-groupb', source: 'audi-quattro-ur', target: 'audi-quattro-group-b', type: 'derived_from', strength: 0.85 })
console.log('  ✅ добавлен Quattro Group B, derived_from от дорожной Ur-Quattro')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
