#!/usr/bin/env node
// Хвост от предыдущего скрипта: обнаружился ЕЩЁ ОДИН до-сессионный узел
// "chev-impala-8" (2006, легаси-схема petrol_v6/zone:"mainstream"), который
// не попал в предыдущий grep. Он представляет ТУ ЖЕ реальную генерацию
// (2006-13), что и новый "chev-impala-9", который я только что создал —
// получился дубль. Правильно: переименовать существующий -8 в -9 (это он
// и есть по стандартной нумерации), удалить мой дубль-новодел.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== Удаляем дубль "chev-impala-9" (новодел, 2006/303hp — та же генерация, что и chev-impala-8) ===')
graph.nodes = graph.nodes.filter(n => n.id !== 'chev-impala-9')
const before = graph.edges.length
graph.edges = graph.edges.filter(e => !(
  (e.source === 'chev-impala-9' || e.target === 'chev-impala-9') ||
  e.id === 'e-impala-8-9' // старое ребро 8→10, ставшее неверным после переименования старого "9" в "10"
))
console.log(`  🗑️  удалено рёбер: ${before - graph.edges.length}`)

console.log('\n=== Переименовываем настоящий "chev-impala-8" (2006, легаси-схема) → chev-impala-9 ===')
const n = byId.get('chev-impala-8')
n.id = 'chev-impala-9'
n.label = 'Impala Gen.9'
n.zone = 'exec_sed'
n.segment = 'exec'
n.modelSlug = 'chev-impala'
n.hp = 303
n.engineType = 'v8'
delete n.familyKey // добавим явно, единообразно с остальными
n.familyKey = 'chev-impala'
n.note = 'Полностью новый кузов/платформа (GMX211), тот же класс W-body. Базовая версия — 3.5-3.9L V6 (~211-242hp), флагманская SS — LS4 5.3L V8, 303hp (2006-09, поперечно установлен) — последний передне-приводный американский седан с V8 в продаже в США. С 2014г. распродавался флотам как "Impala Limited".'
graph.edges.forEach(e => {
  if (e.source === 'chev-impala-8') e.source = 'chev-impala-9'
  if (e.target === 'chev-impala-8') e.target = 'chev-impala-9'
})
graph.edges.push({ id: 'e-chev-imp9-10', source: 'chev-impala-9', target: 'chev-impala-10', type: 'evolves_into', strength: 0.85 })
console.log('  ✅ chev-impala-8 → chev-impala-9 (Gen.9), рёбра переподключены, добавлено 9→10')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
