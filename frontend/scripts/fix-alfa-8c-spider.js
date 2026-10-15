#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
if (graph.nodes.some(n => n.id === 'alfa-8c-spider')) { console.log('уже есть'); process.exit(0) }

graph.nodes.push({
  id: 'alfa-8c-spider', label: '8C Spider', fullName: 'Alfa Romeo 8C Spider',
  type: 'generation', year: 2008, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-8c-spider', familyKey: 'alfa-8c', codeName: '920 Spider',
  bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 450, engineType: 'v8', engineCC: 4691, isLimited: true,
  note: 'Открытая версия 8C Competizione — тот же 4.7L V8, 450PS, 6-ст. полуавтомат, 0-100 за 4.4с, 290км/ч. Планировался тираж 500 экз., но из-за мирового финансового кризиса построено только 329.',
})
graph.edges.push({ id: 'e-alfa-8c-to-spider', source: 'alfa-romeo-8c', target: 'alfa-8c-spider', type: 'variant_of', strength: 0.9 })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('✅ Готово. Узлов:', graph.nodes.length, 'рёбер:', graph.edges.length)
