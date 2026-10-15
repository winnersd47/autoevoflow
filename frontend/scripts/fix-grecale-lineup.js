#!/usr/bin/env node
// Полная проверка линейки Grecale по запросу пользователя (2026-08-27, "все
// дополнения аналогично сделай для других моделей бренда с полной проверкой" —
// та же строгость, что применили к GranTurismo/GranCabrio Mk2).
//
// Реальная история (подтверждено веб-поиском, несколько независимых источников —
// autoevolution/autoblog/cars.com/hotcars/carbuzz/electrive/electrek, 2026-08-27):
//   2022 (апрель, официальный релиз): три трима сразу — GT (2.0 I4 MHEV, 296hp),
//     Modena (2.0 I4 MHEV, 320-325hp), Trofeo (3.0 V6 твин-турбо Nettuno из MC20,
//     523hp/457lb-ft/3.6с/177mph).
//   2023 (осень, первые поставки в США): Grecale Folgore — первый серийный
//     электромобиль Maserati вообще, 400V/105kWh, 542hp/605lb-ft/4.0с/137mph.
//   MY2026 (важное обновление): I4 полностью убран из линейки — Modena
//     переходит на детюненный V6 Nettuno: 385hp/369lb-ft (+60hp/+36lb-ft
//     относительно I4), 5.0с/160mph. Trofeo БЕЗ ИЗМЕНЕНИЙ (523hp — подтверждено
//     напрямую на maserati.com). Folgore получил +30 миль запаса хода (макс.
//     ~275 миль), мощность та же 542hp — тоже подтверждено напрямую на сайте.
//
// В графе уже был узел maserati-grecale (2022, было hp:300/engineType:v6t —
// правим на реальные 296hp/i4t базового GT/Modena-launch трима) и сырой,
// плохо обогащённый узел скрайпера ncs-maserati-2027-grecale (было
// label:"Maserati Grecale", hp:530, bodyType:"coupe", zone:"midsize_sed",
// engineType:"i4t" — ни одно поле не соответствовало реальности; тот самый
// systemic i4t-default баг из sync-latest-to-project.js, пойманный ранее на
// Koenigsegg CCGT1/Bugatti Veyron). Переиспользуем этот id под РЕАЛЬНОЕ
// событие MY2026 Modena V6 (самое значимое подтверждённое изменение).
//
// Структура рёбер — по конвенции, установленной пользователем 2026-08-27
// (см. CLAUDE.md "Фейслифт-мост"): каждая модификация — свой facelifted_to,
// НЕ общий хаб. Trofeo без изменений → facelift-узел не создаём (не выдумываем
// несуществующее событие). Folgore получил реальное изменение (запас хода) →
// свой facelifted_to к новому узлу.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Базовый узел maserati-grecale — реальные launch-специи (2022 GT/Modena I4) ===')
const base = byId.get('maserati-grecale')
base.hp = 296
base.engineType = 'i4t'
base.note = 'Launch-трим апреля 2022: 2.0L I4 mild-hybrid twin-turbo, 296hp (GT) — одновременно с этим на реapp также шёл чуть более мощный Modena (320-325hp, тот же I4). В 2026 модельном году базовый трим Modena перешёл на V6 Nettuno (см. facelifted_to) — I4 полностью убран из линейки.'
console.log('  ✅', base.label, '→ hp:', base.hp, 'engineType:', base.engineType)

console.log('\n=== 2. Переиспользуем сырой узел скрайпера под реальное событие: MY2026 Modena V6 ===')
const modenaV6 = byId.get('ncs-maserati-2027-grecale')
modenaV6.label = 'Grecale Modena V6'
modenaV6.fullName = 'Maserati Grecale Modena V6'
modenaV6.year = 2026
modenaV6.hp = 385
modenaV6.bodyType = 'suv'
modenaV6.segment = 'premium_midsize'
modenaV6.zone = 'suv_mid'
modenaV6.engineType = 'v6t'
modenaV6.codeName = 'M363'
modenaV6.note = 'MY2026: I4 полностью убран из линейки Grecale, базовый Modena переходит на детюненный V6 Nettuno 3.0Т (тот же блок, что у Trofeo/MC20) — 385hp/369 lb-ft (+60hp/+36lb-ft к I4), 0-60 за 5.0с, 160mph. Подтверждено напрямую на maserati.com (title: "New Maserati Grecale Modena – 2027 Version") и независимо — autoblog/cars.com/hotcars/carbuzz/autoevolution (дек. 2025 - 2026). Trofeo (523hp) БЕЗ ИЗМЕНЕНИЙ в этом цикле.'
delete modenaV6.description
delete modenaV6.sourceUrl
delete modenaV6.isLatest
delete modenaV6.scrapedAt
delete modenaV6.heroImageUrl
delete modenaV6.thumbnailUrl
console.log('  ✅', modenaV6.label, '→ hp:', modenaV6.hp, 'bodyType:', modenaV6.bodyType, 'zone:', modenaV6.zone, 'engineType:', modenaV6.engineType)

console.log('\n=== 3. Новые узлы: Trofeo (launch, 2022) и Folgore (2023) ===')
const trofeo = {
  id: 'maserati-grecale-trofeo', label: 'Grecale Trofeo', fullName: 'Maserati Grecale Trofeo',
  type: 'generation', year: 2022, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-grecale', bodyType: 'suv', segment: 'premium_midsize', zone: 'suv_mid',
  hp: 523, engineType: 'v6t',
  note: 'Топовый ДВС-трим с самого launch (апрель 2022) — 3.0Т V6 твин-турбо Nettuno (та же архитектура, что у MC20), 523hp/457 lb-ft, 0-60 за 3.6с, 177mph. Без изменений по сей день (подтверждено на maserati.com) — единственный трим линейки, не затронутый обновлением MY2026.',
}
const folgore = {
  id: 'maserati-grecale-folgore', label: 'Grecale Folgore', fullName: 'Maserati Grecale Folgore',
  type: 'generation', year: 2023, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-grecale', bodyType: 'suv', segment: 'premium_midsize', zone: 'suv_mid',
  hp: 542, engineType: 'ev',
  note: 'Первый серийный электромобиль Maserati за всю историю бренда — поставки в США начались осенью 2023. 400V архитектура, батарея 105 kWh, 542hp/605 lb-ft, 0-60 за 4.0с, 137mph, запас хода ~242 мили на момент запуска.',
}
graph.nodes.push(trofeo, folgore)
console.log('  ✅ добавлен:', trofeo.label, '(' + trofeo.year + ', ' + trofeo.hp + 'hp)')
console.log('  ✅ добавлен:', folgore.label, '(' + folgore.year + ', ' + folgore.hp + 'hp)')

console.log('\n=== 4. Новый узел: Folgore facelift (MY2026, +30 миль запаса хода) ===')
const folgoreFl = {
  id: 'maserati-grecale-folgore-fl', label: 'Grecale Folgore Facelift', fullName: 'Maserati Grecale Folgore (MY2026)',
  type: 'generation', year: 2026, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-grecale', bodyType: 'suv', segment: 'premium_midsize', zone: 'suv_mid',
  hp: 542, engineType: 'ev',
  note: 'MY2026: мощность без изменений (542hp), запас хода увеличен на ~30 миль (макс. ~275 миль, было ~242) — добавлена система отключения переднего моста (AWD disconnect) в режимах низкой нагрузки. Подтверждено напрямую на maserati.com и независимо (autoblog/cars.com/hotcars, дек. 2025).',
}
graph.nodes.push(folgoreFl)
console.log('  ✅ добавлен:', folgoreFl.label, '(' + folgoreFl.year + ', ' + folgoreFl.hp + 'hp)')

console.log('\n=== 5. Рёбра — каждая модификация от базы, каждый фейслифт от своей модификации ===')
const newEdges = [
  { id: 'mas-grecale-to-trofeo', source: 'maserati-grecale', target: 'maserati-grecale-trofeo', type: 'variant_of', strength: 0.9 },
  { id: 'mas-grecale-to-folgore', source: 'maserati-grecale', target: 'maserati-grecale-folgore', type: 'variant_of', strength: 0.85 },
  { id: 'mas-grecale-folgore-to-fl', source: 'maserati-grecale-folgore', target: 'maserati-grecale-folgore-fl', type: 'facelifted_to', strength: 0.9 },
]
for (const e of newEdges) {
  graph.edges.push(e)
  console.log('  ✅', e.source, '--[' + e.type + ']-->', e.target)
}
console.log('  ℹ️  maserati-grecale --facelifted_to--> ncs-maserati-2027-grecale (Modena V6) — уже существовало, оставляем без изменений')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
