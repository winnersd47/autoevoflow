#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
if (graph.nodes.some(n => n.id === 'alfa-90-qo')) { console.log('уже есть'); process.exit(0) }

graph.nodes.push({
  id: 'alfa-90-qo', label: '90 Quadrifoglio Oro', fullName: 'Alfa Romeo 90 Quadrifoglio Oro',
  type: 'generation', year: 1984, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-90-qo', bodyType: 'sedan', segment: 'midsize', zone: 'sports',
  hp: 156, engineType: 'v6', engineCC: 2500,
  note: 'Топ-версия — 2.5 V6 Iniezione, 156PS/205км/ч. Тот же мотор, что и в Alfa 6/GTV6, впрыск вместо карбюраторов.',
})
graph.edges.push({ id: 'e-alfa-90-to-qo', source: 'alfa-90-1984', target: 'alfa-90-qo', type: 'variant_of', strength: 0.8 })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('✅ Готово. Узлов:', graph.nodes.length, 'рёбер:', graph.edges.length)
