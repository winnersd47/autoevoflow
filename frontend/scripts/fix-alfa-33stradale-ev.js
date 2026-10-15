#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
if (graph.nodes.some(n => n.id === 'alfa-33-stradale-ev')) { console.log('уже есть'); process.exit(0) }

graph.nodes.push({
  id: 'alfa-33-stradale-ev', label: '33 Stradale Elettrica', fullName: 'Alfa Romeo 33 Stradale Elettrica',
  type: 'generation', year: 2023, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  codeName: '33 EV', modelSlug: 'alfa-33-stradale-ev',
  bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 750, engineType: 'ev', isLimited: true,
  a777TopSpeed: 333, a777Accel: 3,
  note: 'Не отдельная модель, а альтернативная силовая установка того же 33 Stradale — заказчик выбирал V6 или полностью электрическую версию. 750+hp, запас хода ~450км, 0-100 менее чем за 3с, та же максималка 333км/ч, что у V6. Общий тираж на ОБЕ версии вместе — 33 экземпляра (не 33 плюс 33), все уже проданы.',
})
graph.edges.push({ id: 'e-alfa-33stradale-ev', source: 'alfa-romeo-33-stradale', target: 'alfa-33-stradale-ev', type: 'variant_of', strength: 0.95 })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('✅ Готово. Узлов:', graph.nodes.length, 'рёбер:', graph.edges.length)
