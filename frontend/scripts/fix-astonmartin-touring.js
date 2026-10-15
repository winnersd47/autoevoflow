#!/usr/bin/env node
// Touring (Carrozzeria Touring Superleggera) × Aston Martin — по запросу
// пользователя (2026-08-31, "Делай все варианты, которые нашёл", среди них
// Touring × Aston Martin). В отличие от Zagato (который делал АЛЬТЕРНАТИВНЫЕ
// спецверсии рядом со стандартным кузовом), Touring спроектировал и построил
// САМ СТАНДАРТНЫЙ кузов DB4/DB5/DB6 — это не "ещё один узел рядом", а
// атрибуция уже существующих узлов. Общеизвестные, хорошо документированные
// факты (не требуют отдельной веб-проверки):
//   - Touring (миланское ателье) запатентовал метод "Superleggera" (сверх-
//     лёгкий) — трубчатый каркас + алюминиевые панели поверх него.
//   - DB4 (1958) — первый Aston Martin, построенный по этому методу под
//     лицензией Touring; DB5 (1963) и DB6 (1965) — прямое продолжение того
//     же кузова/метода.
//   - Touring обанкротился в 1966-м — вскоре после запуска DB6, из-за чего
//     Aston Martin пришлось переносить производство кузовов в собственные
//     руки для последующих версий.
//   - ИМЕННО отсюда название современного флагмана DBS SUPERLEGGERA (2018) —
//     прямая дань уважения методу Touring полувековой давности.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

const TOURING_NOTE_DB4 = 'Кузов спроектирован и построен миланским ателье Carrozzeria Touring по запатентованному методу "Superleggera" (сверхлёгкий) — трубчатый стальной каркас, обшитый алюминиевыми панелями. Первый Aston Martin на этой технологии.'
const TOURING_NOTE_DB5 = 'Прямое продолжение кузова DB4 — та же технология Touring Superleggera (трубчатый каркас + алюминиевые панели).'
const TOURING_NOTE_DB6 = 'Последний Aston Martin, построенный по методу Touring Superleggera — миланское ателье обанкротилось в 1966-м, вскоре после запуска DB6, и Aston Martin перенёс производство кузовов в собственные руки для последующих моделей. Спустя полвека имя технологии увековечено в названии флагмана DBS SUPERLEGGERA (2018).'

byId.get('am-db4').note = TOURING_NOTE_DB4
byId.get('am-db5').note = TOURING_NOTE_DB5
byId.get('am-db5-v').note = TOURING_NOTE_DB5
byId.get('am-db6').note = TOURING_NOTE_DB6

console.log('✅ am-db4 — note: атрибуция Touring Superleggera (родоначальник метода)')
console.log('✅ am-db5 / am-db5-v — note: продолжение метода Touring')
console.log('✅ am-db6 — note: последний Touring-кузов + связь с современным DBS Superleggera')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Новых узлов не добавлено (Touring строил СТАНДАРТНЫЙ кузов, не спецверсию) — только атрибуция.`)
