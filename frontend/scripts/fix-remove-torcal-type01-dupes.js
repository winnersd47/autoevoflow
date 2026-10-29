'use strict'
/**
 * fix-remove-torcal-type01-dupes.js — живая находка 28.10.2026: в рассылке
 * "Обновление графа эволюции" вылезли "Bentley 2028 Bentley Torcal Aims To
 * Capture That Tangible", "Jaguar 2028 Jaguar Type 01 EV" и т.п. — обрезанные
 * заголовки статей-дублей с доп. "год+бренд" в начале, которые предыдущий
 * проход gap-fill-агента уже исследовал и подтвердил как ТОЧНЫЕ дубли уже
 * подключённых канонических узлов (bentley-torcal, jaguar-type01), но решил
 * не удалять, просто оставил несвязанными. У них 0 входящих/исходящих рёбер —
 * удаление ничего не оторвёт.
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const DUPE_IDS = [
  'ncs-jaguar-2028-type-01',
  'ncs-jaguar-2028-jaguar-type-01-ev',
  'ncs-bentley-2028-torcal',
  'ncs-bentley-2028-bentley-torcal-breaks',
  'ncs-bentley-2028-bentley-torcal-ev-charts-a-slightly-strange',
  'ncs-bentley-2028-bentley-torcal-first-ride',
  'ncs-bentley-2028-bentley-torcal-aims-to-capture-that-tangibl',
]

let removed = 0
for (const id of DUPE_IDS) {
  const n = g.nodes.find(x => x.id === id)
  if (!n) { console.log(`пропуск — не найден: ${id}`); continue }
  const hasEdges = g.edges.some(e => e.source === id || e.target === id)
  if (hasEdges) { console.log(`ПРОПУСК — есть рёбра, не трогаю: ${id}`); continue }
  console.log(`удалён: ${id} | ${n.label}`)
  g.nodes = g.nodes.filter(x => x.id !== id)
  removed++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`\nУдалено узлов: ${removed}`)
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
