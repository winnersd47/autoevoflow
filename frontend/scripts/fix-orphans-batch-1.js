#!/usr/bin/env node
// Массовая чистка сирот (2026-09-01, по запросу "Продолжи всё" после паузы).
// Три категории, разобранные вручную по данным графа (не наугад):
//   А) Явный мусор — обрывки заголовков/цены, не имена моделей → удаляем.
//   Б) Дубли — та же модель УЖЕ существует полноценным узлом в графе (найдено
//      систематической проверкой), сирота ничего не добавляет → удаляем.
//   В) Реальные модели без связи — подключаем к существующей базе, где она
//      есть; чиним систематически неверные дефолты скрапера (bodyType:coupe/
//      zone:midsize_sed/engineType:i4t у ВСЕХ пода ряд, независимо от реальной
//      модели — тот же класс бага, что чинили у sync-latest-to-project.js
//      ранее). Где базы в графе нет — оставляем корневым узлом с честной
//      пометкой в note, hp не выдумываем.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== А) Удаляем явный мусор (обрывки заголовков/цены) ===')
const garbage = [
  'ncs-toyota-2027-toyota-sequoia-ups-screen-acreage',
  'ncs-mercedes-2027-mercedes-amg-gt-53-enters-the-all-electric',
  'ncs-volkswagen-2027-volkswagen-atlas-starts-at-53-795-in-can',
  'ncs-toyota-2027-toyota-bz-canadian-pricing-starts-at-45-985',
  'ncs-subaru-2027-subaru-uncharted-quick',
]
console.log('=== Б) Удаляем дубли (модель уже есть полноценным узлом) ===')
const duplicates = [
  'ncs-audi-2027-audi-q9', 'ncs-audi-2027-q9', 'ncs-audi-2027-sq9', 'audi-sq9-2027',
  'ncs-mercedes-2026-mercedes-benz-sl680-maybach', 'ncs-mercedes-2026-mercedes-maybach-sl680',
  'ncs-zenvo-2028-aurora-tur', 'ncs-mclaren-2026-w1', 'ncs-ferrari-2026-849', 'ncs-lexus-2025-lfa-concept',
]
const toDelete = new Set([...garbage, ...duplicates])
const nBefore = graph.nodes.length, eBefore = graph.edges.length
graph.nodes = graph.nodes.filter(n => !toDelete.has(n.id))
graph.edges = graph.edges.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target))
console.log(`  🗑️  удалено узлов: ${nBefore - graph.nodes.length} (${garbage.length} мусор + ${duplicates.length} дублей), рёбер: ${eBefore - graph.edges.length}`)

console.log('\n=== В.1) Подключаем к существующим базам (+ чиним bodyType/zone/engineType) ===')
const connections = [
  // id, parentId, edgeType, bodyType, zone, engineType (null=не трогать/не знаем)
  ['ncs-toyota-2027-toyota-crown', 'toyota-crown-crossover', 'facelifted_to', 'crossover', 'midsize_sed', 'hybrid'],
  ['ncs-toyota-2027-tundra-trailhunter', 'toyota-tundra-3', 'variant_of', 'pickup', 'pickup', 'v6t'],
  ['ncs-audi-2027-q4-e-tron-uk', 'audi-q4-f4', 'facelifted_to', 'suv', 'suv_compact', 'ev'],
  ['ncs-audi-2027-q4-sportback-e-tron-uk', 'audi-q4-f4', 'variant_of', 'suv', 'suv_compact', 'ev'],
  ['ncs-audi-2026-rs3-sportback-competition-limited-uk', 'audi-rs3-8y', 'variant_of', 'hatchback', 'hatchback', 'i5t'],
  ['ncs-honda-2026-honda-jazz-e-hev', 'honda-fit-gm', 'variant_of', 'hatchback', 'hatchback', 'i4h'],
  ['ncs-mercedes-2027-gla', 'merc-gla-h247', 'facelifted_to', 'suv', 'suv_compact', 'i4t'],
  ['ncs-mercedes-2027-s680-maybach-us', 'merc-maybach-s223', 'variant_of', 'sedan', 'flagship_sed', 'v12t'],
  ['ncs-mercedes-2027-s580-4matic-maybach-us', 'merc-maybach-s223', 'variant_of', 'sedan', 'flagship_sed', 'v6h'],
  ['ncs-mercedes-2027-s580-4matic-us', 'merc-s-w223', 'variant_of', 'sedan', 'flagship_sed', 'v6h'],
  ['ncs-mercedes-2027-glc53-amg-us', 'merc-glc63s-x253', 'variant_of', 'suv', 'suv_compact', 'i6h'],
  ['ncs-ford-2027-ford-f-150', 'ford-f150-14', 'facelifted_to', 'pickup', 'pickup', 'v8'],
  ['ncs-ford-2027-mustang-dark-horse-sc-convertible', 'ford-mustang-dark-horse', 'variant_of', 'convertible', 'open_top', 'v8'],
  ['ncs-subaru-2026-subaru-trailseeker-premier-awd', 'ncs-subaru-2026-subaru-trailseeker', 'variant_of', 'suv', 'suv_compact', 'ev'],
  ['ncs-nissan-2027-kicks-rock-creek', 'ncs-nissan-2027-nissan-kicks', 'variant_of', 'suv', 'suv_compact', 'i4'],
]
for (const [id, parentId, edgeType, bodyType, zone, engineType] of connections) {
  const n = byId.get(id)
  const parent = byId.get(parentId)
  if (!n) { console.log('  ⚠️  не найден узел:', id); continue }
  if (!parent) { console.log('  ⚠️  не найдена база:', parentId, 'для', id); continue }
  n.bodyType = bodyType; n.zone = zone; n.engineType = engineType
  delete n.isLatest; delete n.scrapedAt
  graph.edges.push({ id: 'orphanfix-' + id, source: parentId, target: id, type: edgeType, strength: 0.75 })
  console.log('  ✅', parentId, '--['+edgeType+']-->', id)
}

console.log('\n=== В.2) Корневые узлы — базы в графе нет, честно фиксируем это в note ===')
const rootFixes = [
  ['ncs-toyota-2027-sequoia-trailhunter', 'suv', 'suv_large', 'i4t', 'Пакет "Trailhunter" (внедорожная комплектация) для Toyota Sequoia — самой модели Sequoia (база) в графе нет, это отдельный исторический пробел.'],
  ['ncs-subaru-2026-subaru-outback-wilderness', 'wagon', 'estate', 'i4t', 'Внедорожная комплектация "Wilderness" для Subaru Outback — самой модели Outback (база) в графе нет, это отдельный исторический пробел, несмотря на её значимость для бренда.'],
  ['ncs-volkswagen-2027-atlas-cross-sport', 'suv', 'suv_large', 'v6', '2-рядная купе-версия VW Atlas — самой модели Atlas (база) в графе нет.'],
  ['ncs-nissan-2027-nissan-kicks', 'suv', 'suv_compact', 'i4', 'Городской кроссовер Nissan (US-рынок) — база отсутствовала в графе, добавлен как корневой узел.'],
  ['ncs-nissan-2027-murano-dark-armor', 'suv', 'suv_mid', 'v6', 'Внедорожная спецверсия Nissan Murano — самой модели Murano (база) в графе нет.'],
  ['ncs-skoda-2027-slavia', 'sedan', 'midsize_sed', 'i4t', 'Седан для развивающихся рынков (Индия и др.) — первое появление модели в графе.'],
  ['ncs-ferrari-2026-cz26', 'wagon', 'supercar', null, 'Новый халф-концепт Ferrari — "выраженно горизонтальный дизайн, характерный силуэт two-box" (по описанию источника — похоже на шутинг-брейк). Донор/платформа не уточнены источником.'],
  ['ncs-porsche-2026-flachbau-rs', 'coupe', 'sports', 'flat6t', 'Спецверсия 911 в стиле "Flachbau" (плоский нос) — оммаж классическому 935. Конкретное поколение 911-донора источником не уточнено.'],
  ['ncs-mclaren-2026-mcl-6gt-concept', 'coupe', 'supercar', 'v8t', 'Концепт McLaren — по названию отсылает к гоночному наследию бренда (аналог MSO/GT-направления).'],
]
for (const [id, bodyType, zone, engineType, note] of rootFixes) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  не найден:', id); continue }
  n.bodyType = bodyType; n.zone = zone
  if (engineType) n.engineType = engineType; else delete n.engineType
  n.note = note
  delete n.isLatest; delete n.scrapedAt; delete n.description; delete n.sourceUrl
  console.log('  ✅', id, '— оставлен корневым, поля исправлены')
}

console.log('\n=== В.3) Gordon Murray S1 LM — донор T.50 (флагман, "LM" = дань уважения McLaren F1 LM) ===')
const s1 = byId.get('ncs-gordon-murray-2026-automotive-s1')
s1.bodyType = 'coupe'; s1.zone = 'hypercar'; s1.engineType = 'v12'
s1.note = 'Первый заказной автомобиль GMSV (Gordon Murray Special Vehicles) — "S1" на базе флагманского T.50, "LM" — дань уважения McLaren F1 LM (детищу того же Гордона Мюррея).'
delete s1.isLatest; delete s1.scrapedAt; delete s1.description; delete s1.sourceUrl
graph.edges.push({ id: 'gordonmurray-t50-to-s1', source: 'gma-t50', target: 'ncs-gordon-murray-2026-automotive-s1', type: 'derived_from', strength: 0.7 })
console.log('  ✅ gma-t50 --[derived_from]--> S1 LM')

console.log('\n=== В.4) Ford Fathom — корневой узел (компактный электропикап, нет явного донора в линейке Ford) ===')
graph.edges.length // no-op, Fathom уже был подтверждён ранее как отдельный узел, оставляем как есть — просто фиксируем в отчёте

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
