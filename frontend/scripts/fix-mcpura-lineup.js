#!/usr/bin/env node
// Продолжение "полной проверки" линейки Maserati (2026-08-27) — после GranTurismo/
// GranCabrio Mk2 и Grecale, теперь MC20/MCPura. Подтверждено напрямую на
// maserati.com + веб-поиском (autoevolution/motorauthority/media.maserati.com/carbuzz):
//
//   GT2 Stradale — трек-ориентированная дорожная спецверсия, world premiere на
//     Monterey Car Week, 16 авг. 2024, изначально как "MC20 GT2 Stradale"
//     (631hp V6 Nettuno твин-турбо, 531 lb-ft, 2.8с, 201mph, RWD — подтверждено
//     напрямую на текущей странице maserati.com/models/gt2-stradale; ранний
//     пресс-релиз лета 2024 называл 640hp — финальная серийная цифра ниже).
//     Полностью ОТСУТСТВОВАЛА в графе.
//   MCPura Cielo — открытая (кабрио) версия MCPura, электрохромная PDLC-крыша,
//     621hp/531 lb-ft/3.0с/199mph/RWD (те же цифры мощности, что и купе —
//     подтверждено на maserati.com/models/mcpura-cielo). Родословная тянется от
//     MC20 Cielo (дебют ~2022-23), но в графе MC20↔MCPura уже смоделирован как
//     один facelifted_to без отдельных под-вариантов MC20 — сохраняем тот же
//     уровень детализации и добавляем Cielo только на стороне MCPura (2026).
//     ПОЛНОСТЬЮ ОТСУТСТВОВАЛА в графе.
//
// Плюс: существующий ncs-maserati-2026-mcpura-cielo-tributo-1926 ("MCPura Cielo
// Tributo 1926") был подключён variant_of НАПРЯМУЮ от купе maserati-mcpura —
// неточно, т.к. это явно Cielo-спецверсия (имя говорит само за себя). Пере-
// цепляем на новый узел maserati-mcpura-cielo. Заодно чиним тот же systemic
// i4t-default баг (engineType) и bodyType/zone/segment, что были неправильными
// (сырой, необогащённый узел скрайпера — см. аналогичные фиксы Koenigsegg
// CCGT1/Bugatti Veyron/Grecale в этой же сессии).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Новый узел: GT2 Stradale (2024, derived_from MC20) ===')
const gt2 = {
  id: 'maserati-gt2-stradale', label: 'GT2 Stradale', fullName: 'Maserati GT2 Stradale',
  type: 'generation', year: 2024, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-gt2-stradale', bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 631, engineType: 'v6t',
  note: 'Дорожная гомологация трекового Maserati GT2 (гоночная программа возврата в GT-чемпионаты) на базе MC20 — world premiere на Monterey Car Week, 16 авг. 2024 (изначально анонсирован как "MC20 GT2 Stradale", 640hp по раннему пресс-релизу). Финальная серийная спецификация — 631hp/531 lb-ft V6 Nettuno твин-турбо, 0-60 за 2.8с, 201mph, RWD, на 60кг легче базового MC20, до 500кг прижимной силы. Подтверждено напрямую на maserati.com.',
}
graph.nodes.push(gt2)
console.log('  ✅ добавлен:', gt2.label, '(' + gt2.year + ', ' + gt2.hp + 'hp)')
graph.edges.push({ id: 'mas-mc20-to-gt2stradale', source: 'maserati-mc20', target: 'maserati-gt2-stradale', type: 'derived_from', strength: 0.85 })
console.log('  ✅ maserati-mc20 --[derived_from]--> maserati-gt2-stradale')

console.log('\n=== 2. Новый узел: MCPura Cielo (2026, variant_of MCPura) ===')
const cielo = {
  id: 'maserati-mcpura-cielo', label: 'MCPura Cielo', fullName: 'Maserati MCPura Cielo',
  type: 'generation', year: 2026, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-mcpura', bodyType: 'convertible', segment: 'supercar', zone: 'open_top',
  hp: 621, engineType: 'v6t',
  note: 'Открытая версия MCPura — электрохромная стеклянная крыша PDLC (прозрачная↔матовая за 1 секунду), тот же 3.0Т V6 Nettuno 621hp/531 lb-ft, 0-60 за 3.0с (купе — 2.9с), 199mph (купе — 202mph). Родословная тянется от MC20 Cielo (дебютировал ~2022-23, отдельно в графе не смоделирован — тот же уровень детализации, что и переход MC20→MCPura). Подтверждено напрямую на maserati.com.',
}
graph.nodes.push(cielo)
console.log('  ✅ добавлен:', cielo.label, '(' + cielo.year + ', ' + cielo.hp + 'hp)')
graph.edges.push({ id: 'mas-mcpura-to-cielo', source: 'maserati-mcpura', target: 'maserati-mcpura-cielo', type: 'variant_of', strength: 0.9 })
console.log('  ✅ maserati-mcpura --[variant_of]--> maserati-mcpura-cielo')

console.log('\n=== 3. Перецепляем Cielo Tributo 1926 на новый узел Cielo + чиним поля ===')
const tributo = byId.get('ncs-maserati-2026-mcpura-cielo-tributo-1926')
tributo.bodyType = 'convertible'
tributo.segment = 'supercar'
tributo.zone = 'open_top'
tributo.engineType = 'v6t'
tributo.note = 'Лимитированная спецверсия MCPura Cielo (не купе — имя "Cielo" в названии) в честь 1926 года основания Maserati: цвета и формы гоночных авто 1920-х. Тот же 3.0Т V6 Nettuno.'
console.log('  ✅ поля исправлены:', tributo.label, '→ bodyType:', tributo.bodyType, 'zone:', tributo.zone, 'engineType:', tributo.engineType)

const edgeIdx = graph.edges.findIndex(e => e.id === 'mase-mcpura-cielo-var')
if (edgeIdx === -1) throw new Error('Не найдено ребро mase-mcpura-cielo-var')
graph.edges[edgeIdx].source = 'maserati-mcpura-cielo'
console.log('  ✅ ребро перецеплено: maserati-mcpura-cielo --[variant_of]--> ' + tributo.id + ' (было от maserati-mcpura напрямую)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
