#!/usr/bin/env node
// "Полная проверка" Aston Martin — часть 4 (финальная). По данным исследовательского
// агента (2026-08-27, кросс-референс Wikipedia/Motor1/autoevolution/Forbes/Autoblog/
// dailysportscar/media.astonmartin.com/официальные пресс-релизы):
//
//   Vantage GT3 (2019) — исправляем hp: было 550, реально 535hp (542PS,
//     широко цитируемая цифра во всех источниках).
//
//   Valour (2023, реveal 11 июля) — 705hp/715PS, 5.2Т V12 + первая в истории
//     Aston Martin связка V12+механика, 110 экз. (110-летие бренда). ДВЕ линии
//     ретро-V12-спецверсий, предшествующие Vanquish 2024 по времени → НЕ можем
//     подключить derived_from от него (нарушило бы хронологию), оставляем
//     корневым узлом (как MC12 был для Maserati до этой сессии).
//
//   Valiant (2024, reveal 26 июня, Goodwood-дебют с Фернандо Алонсо за рулём) —
//     ~735hp (745PS официально; hp Aston не публикует, это расчётная конвертация),
//     5.2Т V12+механика, 38 экз. (полностью распроданы). Прямо описан Aston
//     Martin как "эволюция Valour" → derived_from от Valour.
//
//   Valkyrie: ВАЖНОЕ уточнение агента — "Valkyrie LM" и "Valkyrie AMR-LMH" это
//     ДВЕ РАЗНЫЕ машины (в графе была путаница потенциально возможна):
//     - Valkyrie AMR-LMH — реальный ГОНОЧНЫЙ прототип класса Hypercar (FIA WEC +
//       IMSA GTP), дебют 1 марта 2025 (Катар), полный сезон 2025: Ле-Ман 2025 —
//       12-е и 14-е место (БЕЗ подиума), лучший результат сезона — подиум на
//       Petit Le Mans (IMSA, окт.2025). Мощность регулируется BoP (~680-707PS).
//     - Valkyrie LM — КЛИЕНТСКАЯ трек-only машина на базе AMR-LMH, 10 экз.,
//       reveal июнь 2025, поставки с 2026-го, 697bhp — тот же паттерн, что у
//       MC12→MC12 GT1→MC12 Versione Corse (дорожная→гоночная гомологация→
//       сверхлимитированная клиентская трек-производная).
//     - Valkyrie Spider (открытая дорожная версия) — ПОЛНОСТЬЮ отсутствовала,
//       reveal авг.2021 (Pebble Beach), поставки с 2022-го, ~1155bhp.
//
//   Vantage GT4 (2024) — гомологация нового поколения для клиентского класса
//     GT4, reveal 27 февр. 2024 ("эволюция предыдущей машины" по формулировке
//     Aston Martin). Мощность НЕ публикуется официально (BoP), ~469hp по
//     вторичным агрегаторам (netcarshow/iracing) — низкая уверенность,
//     явно отмечено в note.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Исправляем hp у Vantage GT3 (2019): 550 → 535 (542PS) ===')
const gt3 = byId.get('astonmartin-vantage-gt3')
gt3.hp = 535
gt3.note = (gt3.note || '') + ' Мощность уточнена: 535hp (542PS), не 550 — широко цитируемая цифра во всех источниках.'
console.log('  ✅', gt3.label, '→ hp:', gt3.hp)

console.log('\n=== 2. DBX707: уточняем note (сосуществовала с базовой DBX 2022-2024, снята только к MY2025) ===')
const dbx707n = byId.get('am-dbx707')
dbx707n.note = '"Суперкар среди внедорожников" — старт продаж весна 2022, тот же 4.0Т V8, доработан до 707PS/697hp/900Нм (имя — от метрической мощности). Первые 2-3 года сосуществовала с базовой DBX в линейке; настолько популярна, что базовую версию сняли с производства только к MY2025 (точная дата не публиковалась).'
console.log('  ✅ note уточнена (сосуществование 2022-2024, не мгновенная замена)')

console.log('\n=== 3. Valour (2023) и Valiant (2024) — ретро-V12 спецверсии, отдельная мини-линейка ===')
const valour = {
  id: 'am-valour', label: 'Valour', fullName: 'Aston Martin Valour',
  type: 'generation', year: 2023, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-valour', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 705, engineType: 'v12t', isLimited: true,
  note: 'Дизайн-оммаж гоночным Aston Martin 1970-80х (V8 Vantage той эпохи), к 110-летию бренда. Reveal 11 июля 2023. 5.2Т V12 (705hp/715PS/753Нм) + ПЕРВАЯ в истории Aston Martin связка V12 с механической 6-ступенчатой КПП. 110 экземпляров.',
}
const valiant = {
  id: 'am-valiant', label: 'Valiant', fullName: 'Aston Martin Valiant',
  type: 'generation', year: 2024, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-valour', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 735, engineType: 'v12t', isLimited: true,
  note: 'Явно описана Aston Martin как "эволюция Valour" — более экстремальная, лёгкая, трек-ориентированная версия, задуманная по личному заказу Фернандо Алонсо. Reveal 26 июня 2024, публичный дебют на Goodwood FoS с Алонсо за рулём. 5.2Т V12 + механика, 745PS (Aston официально не публикует hp — ~735hp расчётная конвертация), 383кг прижимной силы. 38 экземпляров, все распроданы.',
}
graph.nodes.push(valour, valiant)
console.log('  ✅ добавлен:', valour.label, '(' + valour.year + ', ' + valour.hp + 'hp, стоит отдельно — предшествует новому V12 Vanquish по времени)')
console.log('  ✅ добавлен:', valiant.label, '(' + valiant.year + ', ' + valiant.hp + 'hp)')
graph.edges.push({ id: 'am-valour-to-valiant', source: 'am-valour', target: 'am-valiant', type: 'derived_from', strength: 0.85 })
console.log('  ✅ am-valour --[derived_from]--> am-valiant')

console.log('\n=== 4. Valkyrie: Spider (отсутствовала) + AMR-LMH (гоночный прототип) + LM (клиентская трек-версия) ===')
const valkyrieSpider = {
  id: 'am-valkyrie-spider', label: 'Valkyrie Spider', fullName: 'Aston Martin Valkyrie Spider',
  type: 'generation', year: 2022, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-valkyrie', bodyType: 'convertible', segment: 'hypercar', zone: 'hypercar',
  hp: 1155, engineType: 'v12',
  note: 'Открытая дорожная версия Valkyrie — reveal авг.2021 (Pebble Beach), поставки с 2022-го. Тот же гибридный 6.5Т V12 (Cosworth), ~1155bhp.',
}
const valkyrieLMH = {
  id: 'am-valkyrie-amr-lmh', label: 'Valkyrie AMR-LMH', fullName: 'Aston Martin Valkyrie AMR-LMH',
  type: 'generation', year: 2025, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-valkyrie', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 690, engineType: 'v12', isRacing: true,
  note: 'Реальный гоночный прототип класса Hypercar (FIA WEC + IMSA GTP), НЕ путать с клиентской "Valkyrie LM" (см. отдельный узел). Дебют 1 марта 2025 (Катар, WEC). Полный сезон 2025: Ле-Ман 2025 — 12-е и 14-е место (без подиума), лучший результат — подиум на Petit Le Mans (IMSA, окт.2025). Безнаддувный 6.5Л V12 без гибрида (редкость в классе), мощность регулируется BoP — ~680-707PS в зависимости от этапа.',
}
const valkyrieLM = {
  id: 'am-valkyrie-lm', label: 'Valkyrie LM', fullName: 'Aston Martin Valkyrie LM',
  type: 'generation', year: 2026, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-valkyrie', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 697, engineType: 'v12', isLimited: true,
  note: 'Клиентская трек-only машина на базе гоночного прототипа AMR-LMH (не участвует в чемпионатах, аналог MC12 Versione Corse у Maserati) — reveal июнь 2025, поставки с 2026-го. 697bhp, тот же безнаддувный 6.5Л V12. 10 экземпляров.',
}
graph.nodes.push(valkyrieSpider, valkyrieLMH, valkyrieLM)
console.log('  ✅ добавлен:', valkyrieSpider.label, '(' + valkyrieSpider.hp + 'hp)')
console.log('  ✅ добавлен:', valkyrieLMH.label, '(гоночный прототип WEC/IMSA)')
console.log('  ✅ добавлен:', valkyrieLM.label, '(10 экз., клиентская трек-версия)')

graph.edges.push(
  { id: 'am-valkyrie-to-spider', source: 'am-valkyrie', target: 'am-valkyrie-spider', type: 'derived_from', strength: 0.9 },
  { id: 'am-valkyrie-to-lmh', source: 'am-valkyrie', target: 'am-valkyrie-amr-lmh', type: 'derived_from', strength: 0.85 },
  { id: 'am-valkyrielmh-to-lm', source: 'am-valkyrie-amr-lmh', target: 'am-valkyrie-lm', type: 'derived_from', strength: 0.85 },
)
console.log('  ✅ am-valkyrie --[derived_from]--> am-valkyrie-spider')
console.log('  ✅ am-valkyrie --[derived_from]--> am-valkyrie-amr-lmh')
console.log('  ✅ am-valkyrie-amr-lmh --[derived_from]--> am-valkyrie-lm')

console.log('\n=== 5. Vantage GT4 (2024) — клиентский гоночный класс, отсутствовал ===')
const gt4 = {
  id: 'am-vantage-gt4', label: 'Vantage GT4', fullName: 'Aston Martin Vantage GT4',
  type: 'generation', year: 2024, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vantage-gt4', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 469, engineType: 'v8t', isRacing: true,
  note: 'Гомологация нового поколения (2024) для клиентского гоночного класса GT4 — reveal 27 февр. 2024, Aston Martin описывает как "эволюцию предыдущей машины" (2019г.). Тот же 4.0Т V8. ⚠️ Точная мощность официально не публикуется (регулируется BoP по чемпионату) — 469hp по вторичным источникам (netcarshow/iRacing), не подтверждено напрямую Aston Martin — низкая уверенность в точной цифре.',
}
graph.nodes.push(gt4)
console.log('  ✅ добавлен:', gt4.label, '(' + gt4.hp + 'hp, ⚠️ низкая уверенность в цифре)')
graph.edges.push({ id: 'am-vantage3-to-gt4', source: 'am-vantage3', target: 'am-vantage-gt4', type: 'derived_from', strength: 0.85 })
console.log('  ✅ am-vantage3 --[derived_from]--> am-vantage-gt4')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Часть 4 готова. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
