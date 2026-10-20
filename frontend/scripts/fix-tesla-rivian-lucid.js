#!/usr/bin/env node
// Tesla/Rivian/Lucid: небольшой, в целом аккуратный кластер. Находки:
//  - Model X не получила узел для рестайлинга 2021г ("Plaid"), хотя Model S
//    получила — а по факту Model S и Model X рестайлились ОДНОВРЕМЕННО, на
//    одной презентации (новый салон/руль-штурвал, трёхмоторный Plaid).
//  - Опечатка типа ребра: Model 3 → Model Y стоит "inspired" вместо
//    "inspired_by" (тот же баг класса, что уже чинили в Škoda/VW).
//  - Model Y → Model Y Juniper помечено evolves_into, хотя "Juniper" —
//    официальное имя рестайлинга (как "Highland" у Model 3, который уже
//    корректно стоит как facelifted_to) — для единообразия меняем тип.
//  - Model Y L: узел датирован 2027г с hp=500, по факту реальный старт
//    продаж — август 2025г (Китай), 456hp (340кВт) — исправляем оба поля.
//  - Rivian R1T → R1S стоит inspired_by, хотя это одновременно запущенные
//    (2022) близнецы на одной платформе — меняем на shares_platform.
//  - 4 узла (Model Y L, R1T Gen2, R1S Gen2, Gravity GT-S) использовали
//    общую заглушку zone="electric" вместо конкретного класса, который уже
//    использует их же базовый узел (suv_compact/pickup/suv_large) — тот же
//    паттерн "ленивого дефолта", что уже чинили у VW/Mini/Škoda.
// Источники: paultan.org, motorauthority.com, carnewschina.com, teslarati.com
// — проверено веб-поиском 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  g.nodes.push(node); byId.set(node.id, node)
  console.log(`  ✅ ${node.id} (${node.year}, ${node.hp} л.с.)`)
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function retypeEdge(id, newType) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  console.log(`  🔄 ${id}: ${e.type} → ${newType}`)
  e.type = newType
}
function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch))
}

console.log('=== 1. Tesla Model X Plaid (2021) — рестайлинг не был добавлен (в отличие от Model S) ===')
addNode({
  id: 'tesla-model-x-plaid', label: 'Tesla Model X Plaid (2021)',
  type: 'generation', year: 2021, brandId: 'tesla', brandName: 'Tesla',
  modelSlug: 'tesla-model-x', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 1020, engineType: 'ev',
  note: 'Рестайлинг представлен ОДНОВРЕМЕННО с Model S Plaid (янв-2021, одна презентация) — новый салон/руль-штурвал, трёхмоторный Plaid (2 мотора сзади + 1 спереди), 0-96км/ч за 2.5с, 100кВтч/330 миль EPA.',
})
addEdge('e-mx-mxplaid', 'tesla-model-x-1', 'tesla-model-x-plaid', 'facelifted_to', 0.95)

console.log('\n=== 2. Опечатки/несогласованность типов рёбер ===')
retypeEdge('e-tesla-m3-my', 'inspired_by') // было "inspired" (опечатка)
retypeEdge('e-modely-juniper', 'facelifted_to') // Juniper — офиц. имя рестайлинга, как Highland у Model 3 (уже facelifted_to)
retypeEdge('e-riv-r1t-r1s', 'shares_platform') // R1T/R1S — одновременные (2022) близнецы на одной платформе, не "вдохновение"

console.log('\n=== 3. Model Y L: реальные год/мощность (был 2027/500hp) ===')
fixNode('tesla-model-y-l', {
  year: 2025, hp: 456, zone: 'suv_compact',
  note: 'Удлинённая 6-местная версия для Китая, старт продаж — август 2025г (не 2027). 2 мотора AWD, 142кВт спереди + 198кВт сзади = 340кВт/456hp суммарно, 82кВтч LG, 751км CLTC.',
})

console.log('\n=== 4. Заглушка zone="electric" → конкретный класс, как у базового узла ===')
fixNode('rivian-r1t-gen2',    { zone: 'pickup' })
fixNode('rivian-r1s-gen2',    { zone: 'suv_large' })
fixNode('lucid-gravity-gts',  { zone: 'suv_large' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
