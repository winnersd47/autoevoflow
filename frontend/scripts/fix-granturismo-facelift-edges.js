#!/usr/bin/env node
// Правка по явному указанию пользователя (2026-08-27): связи фейслифт-модификаций
// должны идти ОТ самой модификации (facelifted_to), а НЕ через variant_of от хаба
// Modena Facelift. Раньше здесь стоял принцип "все связи от базы" (см. GC-сторону
// того же кластера и note в CLAUDE.md), но пользователь явно попросил обратное —
// каждая модификация получает свой прямой мост к своему фейслифту, как уже было
// на стороне GranCabrio (grancabrio2-trofeo→facelifted_to→grancabrio2-trofeo-fl).
// Приводим GranTurismo к тому же виду для консистentности между GT и GC.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const toRemove = new Set(['mas-gt2modenafl-to-trofeofl', 'mas-gt2modenafl-to-folgorefl'])
const before = graph.edges.length
graph.edges = graph.edges.filter(e => !toRemove.has(e.id))
console.log(`Удалено рёбер: ${before - graph.edges.length} (variant_of от Modena Facelift)`)

const newEdges = [
  { id: 'mas-gt2trofeo-to-trofeofl', source: 'maserati-granturismo2-trofeo', target: 'maserati-granturismo2-trofeo-fl', type: 'facelifted_to', strength: 0.9 },
  { id: 'mas-gt2folgore-to-folgorefl', source: 'ncs-maserati-2027-granturismo', target: 'maserati-granturismo2-folgore-fl', type: 'facelifted_to', strength: 0.9 },
]
for (const e of newEdges) {
  graph.edges.push(e)
  console.log('  ✅ добавлено:', e.source, '--[' + e.type + ']-->', e.target)
}

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Итого рёбер: ${graph.edges.length} (было ${before})`)
