#!/usr/bin/env node
// Хвост №2: при первой попытке добавить Impala Gen.8 (2000-05, FWD W-body)
// addNode() молча пропустил её из-за коллизии id с уже существовавшим
// (легаси) узлом "chev-impala-8" — тем самым, который потом переименовали
// в Gen.9. В итоге Gen.8 так и не была создана, а ребро 7→9 идёт напрямую,
// пропуская её. Добавляем Gen.8 нормально и чиним цепочку.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

if (graph.nodes.some(n => n.id === 'chev-impala-8')) {
  console.log('chev-impala-8 уже существует — ничего не делаю.')
  process.exit(0)
}

graph.nodes.push({
  id: 'chev-impala-8', label: 'Impala Gen.8', year: 2000, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 240, engineType: 'v6t',
  note: 'Смена архитектуры на передний привод (GM W-body/GMX210) — впервые в истории имени. 3.8L компрессорный V6, 240hp (SS, 2004-05). При запуске V8 не предлагался.',
})

const e = graph.edges.find(x => x.source === 'chev-impala-7' && x.target === 'chev-impala-9')
if (e) { e.target = 'chev-impala-8'; console.log('  🔧 ребро 7→9 исправлено на 7→8') }
graph.edges.push({ id: 'e-chev-imp8-9-fix', source: 'chev-impala-8', target: 'chev-impala-9', type: 'evolves_into', strength: 0.85 })
console.log('  ✅ добавлена Gen.8 (2000-05), ребро 8→9 добавлено')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
