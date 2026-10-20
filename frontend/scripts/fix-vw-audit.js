#!/usr/bin/env node
// Volkswagen audит: базовые цепочки (Golf/Passat/Jetta/Polo/Scirocco/Touareg/
// Tiguan/Amarok/Beetle) уже полные без пропусков поколений — находки здесь
// точечные, в основном среди недавно добавленных скрейпером 2027-2028 узлов:
//  - ID.3→ID.4 задвоен ДВУМЯ рёбрами разных типов (influenced_by И derived_from)
//    между одной и той же парой — валидатор не ловит, т.к. проверяет только
//    точный триплет source|target|type, а не пару source|target.
//  - "Volkswagen Atlas II (2027)" и его "Atlas Cross Sport" — реальные,
//    подтверждённые (MQB Evo, 2.0 TSI 282hp), но у обоих узлов hp=undefined
//    и engineType="v6" (неверно — мотор турбо-4, не V6). ID у них —
//    сырые слаги из заголовка скрейпера, переименовываем в чистую схему.
//  - "ID.Tiguan (2027)" — подтверждённый реальный преемник ОБОИХ ID.4 и ID.5
//    (общее имя вместо двух), но узел совсем не подключён к графу (ни одного
//    ребра), engineType не проставлен, bodyType ошибочно "coupe" (это SUV),
//    zone скопирован с какого-то седана ("midsize_sed").
//  - "ID.Cross (2027)" — hp не проставлен, zone="eu" (региональный код)
//    вместо принятой для этого класса "suv_compact" (как у T-Cross/T-Roc).
//  - vw-id4.zone="hatchback" — явная рассинхронизация с его же bodyType="suv"
//    (сосед vw-id5 с тем же кузовом и классом использует "suv_mid").
// Источники: Wikipedia, cars.com, electrive.com, autoevolution, motor1,
// carsguide.com.au — проверено веб-поиском 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch))
}
function deleteEdge(id) {
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.id !== id)
  console.log(g.edges.length < before ? `  🗑️  удалено ребро ${id}` : `  ⚠️  ребро не найдено: ${id}`)
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function renameNode(oldId, newId) {
  const n = byId.get(oldId)
  if (!n) { console.log('  ⚠️  узел не найден:', oldId); return }
  n.id = newId
  byId.delete(oldId); byId.set(newId, n)
  let touched = 0
  g.edges.forEach(e => {
    if (e.source === oldId) { e.source = newId; touched++ }
    if (e.target === oldId) { e.target = newId; touched++ }
  })
  console.log(`  🔀 ${oldId} → ${newId} (обновлено рёбер: ${touched})`)
}

console.log('=== 1. ID.3 → ID.4: убираем задвоенное ребро ===')
deleteEdge('vwid-2') // influenced_by — дублирует более точный derived_from (vw-id3-id4) между той же парой

console.log('\n=== 2. Volkswagen Atlas II (2027): переименование + реальные характеристики ===')
renameNode('ncs-volkswagen-2027-volkswagen-atlas-starts-at-53-795-in-can', 'vw-atlas-2')
fixNode('vw-atlas-2', {
  hp: 282, engineType: 'i4t',
  note: '2-е поколение, старт продаж — осень 2026 (MY2027). Платформа MQB Evo (впервые для Atlas — был отдельной крупной архитектурой), внешность сближена с Tiguan. Единственный мотор на старте — 2.0 TSI 282hp/8AT, FWD или 4Motion.',
})
renameNode('ncs-volkswagen-2027-atlas-cross-sport', 'vw-atlas-cross-sport-2')
fixNode('vw-atlas-cross-sport-2', { hp: 282, engineType: 'i4t' }) // тот же мотор/платформа, что у Atlas II — просто 2-рядный кузов

console.log('\n=== 3. ID.Cross (2027): мощность + zone ===')
fixNode('ncs-volkswagen-2027-id-cross', {
  hp: 208, zone: 'suv_compact',
  note: 'Младший электро-SUV на MEB+, альтернатива T-Cross (на 45мм длиннее). 3 версии: 85кВт/37кВтч (~317км), 99кВт/37кВтч (~306км), топ 155кВт/52кВтч (~427км, указан как hp).',
})

console.log('\n=== 4. ID.Tiguan (2027): подключаем к графу и чиним поля ===')
fixNode('ncs-volkswagen-2027-id-tiguan', {
  engineType: 'ev', bodyType: 'suv', zone: 'suv_mid', hp: 286,
  note: 'Общее имя-преемник СРАЗУ для ID.4 и ID.5 (обе линейки сворачиваются под один нейминг) — платформа MEB+, до 600км запаса хода. 3 версии: 140кВт/~190hp (RWD), 210кВт/~286hp (RWD, указан), 220кВт суммарно/~299hp (4Motion AWD).',
})
addEdge('e-id4-idtiguan', 'vw-id4', 'ncs-volkswagen-2027-id-tiguan', 'evolves_into', 0.85)

console.log('\n=== 5. Точечная правка zone у ID.4 (рассинхронизация с bodyType=suv) ===')
fixNode('vw-id4', { zone: 'suv_mid' }) // было "hatchback" — явно скопировано не оттуда; сосед ID.5 того же класса уже использует suv_mid

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
