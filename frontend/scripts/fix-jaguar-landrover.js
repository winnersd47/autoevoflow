#!/usr/bin/env node
// Аудит Jaguar / Land Rover (JLR). Параллельно по этому же graph.json работает
// другой агент по Bentley+Rolls-Royce — их brandId не трогаем, они не трогают наш.
//
//  1. Jaguar "Type 01" — 2 изолированных дубля-сироты (0 рёбер):
//     ncs-jaguar-2028-jaguar-type-01-ev и ncs-jaguar-2028-type-01. Оба — сырые
//     нераспарсенные дампы скрейпера (hp: undefined, bodyType: "hatchback" —
//     ошибочно, Type 01 это 4-дверный GT, не хэтчбек), дублирующие уже
//     полностью смоделированный jaguar-type01 (2027, 1016 л.с., с реальным
//     ребром concept_to_production от jaguar-type00). description-поля обоих
//     дублей — маркетинговый/редакционный текст без новых фактов, обогащать
//     нечем. Удаляю оба.
//
//  2. Land Rover "Range Rover Electric" — найден ТРЕТИЙ дубль того же типа:
//     ncs-land-rover-2027-rover-range-rover-electric. scrapedAt совпадает с
//     точностью до секунды с обоими дублями Jaguar Type 01 (один и тот же
//     скрейп-прогон 2026-10-07), brandName испорчен до "Land" (вместо "Land
//     Rover"), bodyType "hatchback" (та же ошибка скрейпера, что и у Type 01
//     дублей), hp отсутствует. Описывает ТОТ ЖЕ автомобиль, что уже полностью
//     смоделирован как lr-rr-electric (2025) — но содержит 2 факта, которых
//     ещё не было в graph: финальные (после реального анонса, сен.2026)
//     0-60mph за 4.3s и разгон 50-75mph (обгон) за 2.7s. Это НЕ орфан (есть
//     ребро sync-ev-lr-rr-l460-...), поэтому перед удалением узла удаляю и его
//     ребро, а уникальные цифры переношу в note лежащего в графе lr-rr-electric
//     (политика "NCS-ноды богаче — обогащать, а не просто выкидывать").
//     Заодно поправлена реальная платформа: было codeName "EMA" — ОШИБКА,
//     подтверждено 2 источниками (autocar.co.uk, roverparts.com), что Range
//     Rover Electric на платформе MLA-Flex (общей с ICE L460); EMA — другая,
//     более компактная электроплатформа JLR (под неё идут Velar Electric и
//     Discovery 6, см. ниже), не под полноразмерный Range Rover. Запас хода
//     обновлён на финальную цифру 372 мили/~599км WLTP (сен.2026, после
//     реального анонса) взамен более ранней предпроизводственной оценки
//     333 мили/536км.
//
//  3. Range Rover Electric: ребро lr-rr-l460→lr-rr-electric было evolves_into
//     (как будто новое поколение сменяет ICE L460). Неверно: это электро-
//     вариант ТОГО ЖЕ поколения L460 на общей платформе MLA-Flex, продаётся
//     параллельно с ICE-версией, а не заменяет её — как и прочие ICE/EV-пары
//     в этом графе (напр. Jeep Avenger ICE/4xe, Ram ProMaster ICE/EV).
//     Переведено на variant_of.
//
//  4. Freelander → Evoque / Discovery Sport: подтверждено веб-поиском — после
//     Freelander 2 (2006) нейминг прекращён, а сегмент разделён на ДВЕ новые
//     линейки: 3-дверные Freelander сменил Range Rover Evoque (2011), 5-дверный
//     Freelander 2 сменил Discovery Sport (2015, тот же завод/платформа, что и
//     Evoque). В графе было прямое evolves_into ТОЛЬКО на Discovery Sport
//     (представляя его единственным/эксклюзивным наследником), а ребра на
//     Evoque не было вообще (Evoque L538 висел без единого входящего ребра).
//     Паттерн "один предшественник → два новых нейма" уже закрывался в этой
//     сессии через inspired_by на оба (а не evolves_into на одного) — применяю
//     ту же конвенцию: существующее ребро на Discovery Sport понижено до
//     inspired_by, добавлено симметричное inspired_by на Evoque L538.
//
//  5. Land Rover Discovery 6 (lr-disco6, 2027) — гигиена полей:
//     engineType "PHEV"→"phev" (ненормализованный регистр, в графе доминирует
//     нижний регистр — 37 "phev" против 9 "PHEV"), zone "eu" заменена на
//     "suv_large" (как у ВСЕХ соседних Discovery 1-5 — "eu" тут явно код
//     региона по ошибке приклеенный в поле geo-зоны, а не сегмент), segment
//     "suv"→"mid_suv" (та же нормализация под соседей). hp НЕ выдумываю:
//     веб-поиском подтверждено, что платформа сменилась с ранее предполагавшейся
//     MLA на EMA (электро-архитектура с опцией PHEV/range-extender — экс-CEO
//     JLR Адриан Марделл, Auto Express, 2023), выход к дилерам ориентировочно
//     2028г., но точные мощность/силовая установка серийной версии официально
//     ещё не объявлены (окт. 2026) — оставляю hp: null с поясняющей note,
//     это тот случай "слишком рано для цифры", о котором предупреждает ТЗ.
//
//  6. Jaguar Type 00 (2024, концепт) и Type 01 (2027, серийный) — engineType
//     был "electric" у обоих; в графе нормализованный канон для электротяги —
//     "ev" (274 узла), "electric" — нечастый выброс (16 узлов). Приведено к
//     "ev" для согласованности с jag-ipace/lr-rr-electric и остальным графом.
//
//  7. ПРОВЕРЕНО, фикс НЕ нужен (цепочки полные, рёбра корректны):
//     - Jaguar XJ: S1(1968)→S2(1973)→S3(1979)→XJ40(1986)→X300(1994)→
//       X308(1997)→X350(2003)→X351(2010) — подтверждено Wikipedia/
//       automobile-catalog, 8 поколений, пропущенного шасси-кода нет (X356/
//       X358 — фейслифты внутри X350, не отдельные поколения, верно не
//       выделены узлами). X351 корректно не имеет исходящего ребра вперёд:
//       реальный проект электро-XJ (300 миль запаса хода, платформа MLA)
//       был анонсирован, почти доведён до готовности и отменён Тьерри
//       Боллоре в февр. 2021 — в графе корректно НЕ фабрикуется как узел.
//     - F-Pace/E-Pace/XE/XF/F-Type: подтверждено — XE/XF/F-Type сняты с
//       производства июнь 2024, E-Pace/I-Pace к концу 2024; ТОЛЬКО F-Pace
//       продолжает выпуск до запуска Type 00/01. Ни один из узлов не имеет
//       сфабрикованного наследника и не ведёт ребром вперёд на Type 00/01
//       (единственное такое ребро во всём кластере — jag-ipace→jaguar-type00,
//       inspired_by, мягкая формулировка, корректно отражает, что I-Pace был
//       единственным предыдущим электромобилем бренда, а не что Type 00
//       "заменяет именно I-Pace").
//     - Land Rover Defender: ребро lr-def-1983(1983)→lr-def-l663-110(2020)
//       существует, тип evolves_into — подтверждено, корректно (реальный
//       разрыв поколений: старый рамный Defender снят в 2016, L663 совсем
//       другая несущая платформа 2020, но это прямой преемник нейма).
//     - Range Rover Classic→P38a→L322→L405→L460; Sport L320→L494→L461;
//       Evoque L538→L551; Velar (1 поколение) — все цепочки полные, пропусков
//       поколений не найдено.
//     - "inspired" (без _by) опечатки в этом кластере не найдено; кросс-
//       брендовых evolves_into/variant_of/facelifted_to не найдено (все
//       кросс-брендовые рёбра — корректно shares_platform/inspired_by/
//       derived_from).
//     - ncs-land-rover-2026-rover-defender-dakar-concept и
//       ncs-land-rover-2027-rover-defender-vertex: НЕ дубли (Dakar concept
//       корректно смотрит в реальный landrover-defender-dakar через
//       concept_to_production; Vertex — самостоятельный трим L663, variant_of
//       от lr-def-l663-110), не сироты, brandId/brandName корректны. Но у
//       обоих (и был у удалённого дубля Range Rover Electric) modelSlug с
//       вкраплением лишнего "rover-" ("land-rover-rover-defender-...") —
//       похоже на баг парсинга бренда в скрейпере (дублирует токен "rover").
//       ID не переименовываю (риск оборвать существующие рёбра/внешние
//       ссылки) — это находка для будущего фикса самого скрейпера, не графа.
//
// Источники: Wikipedia (Jaguar XJ, Jaguar XJ (X300/X308/X350), Jaguar XJ
// (electric)), automobile-catalog.com, carbuyer.co.uk, autoexpress.co.uk,
// greencarreports.com, autobuzz.my, topgear.com.ph, motor1.com, autocar.co.uk,
// roverparts.com, electrive.com, carexpert.com.au, fleetpoint.org,
// electriccarscheme.com, electriccarsreport.com, insideevs.com,
// blog.subimpact.net, en.wikipedia.org/wiki/Land_Rover_Freelander — проверено
// веб-поиском 2026-10-21.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно по этому же
// файлу работает агент по Bentley+Rolls-Royce, мерджимся в актуальное
// состояние на диске.
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id, source, '->', target); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function deleteEdge(id) {
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.id !== id)
  console.log(g.edges.length < before ? `  🗑️  удалено ребро ${id}` : `  ⚠️  ребро не найдено: ${id}`)
}
function deleteNode(id) {
  if (!byId.has(id)) { console.log('  ⚠️  узел не найден:', id); return }
  g.nodes = g.nodes.filter(n => n.id !== id)
  byId.delete(id)
  // защитная очистка: если вдруг остались рёбра на удалённый узел (не должно,
  // но параллельный агент правит тот же файл) — убираем, чтобы не оставить
  // висячее ребро для валидатора.
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.source !== id && e.target !== id)
  if (g.edges.length < before) console.log(`  🗑️  узел ${id} + ${before - g.edges.length} неожиданных рёбер на него`)
  else console.log(`  🗑️  удалён узел ${id}`)
}
function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch).slice(0, 200))
}
function retypeEdgeByPair(source, target, newType) {
  const e = g.edges.find(e => e.source === source && e.target === target)
  if (!e) { console.log('  ⚠️  ребро не найдено:', source, '->', target); return }
  console.log(`  🔀 ${e.id}: [${e.type}] → [${newType}]`)
  e.type = newType
}

console.log('=== 1. Jaguar Type 01: удаляем 2 подтверждённых дубля-сироты ===')
deleteNode('ncs-jaguar-2028-jaguar-type-01-ev')
deleteNode('ncs-jaguar-2028-type-01')

console.log('\n=== 2. Range Rover Electric: обогащаем реальный узел, удаляем найденный 3-й дубль ===')
fixNode('lr-rr-electric', {
  codeName: 'MLA-Flex',
  note: 'Офиц. данные JLR: 542 л.с./550PS (2 мотора), батарея 118.5 кВтч, 800В/350кВт зарядка, от $138k в США / £154,070 в Великобритании. Платформа — MLA-Flex (общая с ICE L460; НЕ EMA — EMA это отдельная, более компактная электроплатформа JLR для Velar Electric/Discovery 6). Разгон 0-100 за 4.3s (режим Dynamic Launch), обгон 50-75mph за 2.7s. Запас хода на момент финального анонса (сен. 2026) — 372 мили/~599км WLTP, уточняет более раннюю предпроизводственную оценку 333 мили/536км. Источники: JLR, autocar.co.uk, electriccarsreport.com, insideevs.com (сен.-окт. 2026).',
})
deleteEdge('sync-ev-lr-rr-l460-ncs-land-rover-2027-rover-range-rover-electric')
deleteNode('ncs-land-rover-2027-rover-range-rover-electric')

console.log('\n=== 3. Range Rover Electric — не новое поколение, а EV-вариант того же L460 ===')
retypeEdgeByPair('lr-rr-l460', 'lr-rr-electric', 'variant_of')

console.log('\n=== 4. Freelander → Evoque + Discovery Sport: сегмент распался на ДВЕ линейки, не одну ===')
retypeEdgeByPair('lr-freelander2', 'lr-disco-sport', 'inspired_by')
addEdge('lr-fl2-evoque-insp', 'lr-freelander2', 'lr-evoque-l538', 'inspired_by', 0.7)

console.log('\n=== 5. Discovery 6: гигиена полей (engineType/zone/segment), hp НЕ выдумываю ===')
fixNode('lr-disco6', {
  engineType: 'phev',
  zone: 'suv_large',
  segment: 'mid_suv',
  note: 'Платформа подтверждена как EMA (электро-архитектура с опцией PHEV/range-extender), а не MLA, как предполагалось ранее — смену курса подтвердил экс-CEO JLR Адриан Марделл (Auto Express, 2023). Ориентировочный выход к дилерам — 2028г. Точные мощность и силовая установка серийной версии официально ещё не объявлены (окт. 2026), hp намеренно оставлен пустым. Источники: autocar.co.uk, carexpert.com.au, roverparts.com.',
})

console.log('\n=== 6. Jaguar Type 00 / Type 01: engineType "electric" → канон "ev" ===')
fixNode('jaguar-type00', { engineType: 'ev' })
fixNode('jaguar-type01', { engineType: 'ev' })

console.log('\n=== 7. Проверено, фикс не нужен (см. комментарий в шапке файла) ===')
console.log('   - Jaguar XJ S1..X351: цепочка полная (8 поколений), X351 корректно без исходящего ребра')
console.log('   - F-Pace/E-Pace/XE/XF/F-Type: дискантинуация 2024 подтверждена, наследников на Type00/01 не сфабриковано')
console.log('   - Land Rover Defender 1983→L663(2020): ребро evolves_into подтверждено, на месте')
console.log('   - Range Rover / Sport / Evoque / Velar: все цепочки полные, пропусков поколений нет')
console.log('   - ncs-...-defender-dakar-concept и ncs-...-defender-vertex: не дубли, корректно подключены')
console.log('   - "rover-rover-" в modelSlug у части ncs-узлов — похоже на баг скрейпера, ID не трогаю (риск оборвать рёбра)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
