#!/usr/bin/env node
// Alfa Romeo Junior (2024) — первый электромобиль в истории бренда,
// полностью отсутствовал в графе.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) { if (byId.has(node.id)) { console.log('уже есть:', node.id); return false } graph.nodes.push(node); byId.set(node.id, node); return true }

addNode({
  id: 'alfa-junior-2024', label: 'Junior', fullName: 'Alfa Romeo Junior',
  type: 'generation', year: 2024, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-junior', bodyType: 'suv', segment: 'compact_suv', zone: 'electric',
  hp: 156, engineType: 'ev', engineCC: null,
  note: 'ПЕРВЫЙ электромобиль в истории Alfa Romeo. Показан 10 апреля 2024г. как "Milano" — но переименован в "Junior" ещё до начала продаж из-за скандала в Италии (название в честь Милана, а сборка в Польше — нарушение итал. закона о защите потребителей от ложного происхождения товара). Версия Elettrica — 54кВтч батарея, база 156hp, топ 240hp, до 410км WLTP. Есть и гибрид Ibrida — 1.2Т I3 + 48V, 136hp, 6-АКПП.',
})
addNode({
  id: 'alfa-junior-veloce', label: 'Junior Elettrica Veloce', fullName: 'Alfa Romeo Junior Elettrica Veloce',
  type: 'generation', year: 2024, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-junior-veloce', bodyType: 'suv', segment: 'compact_suv', zone: 'electric',
  hp: 276, engineType: 'ev',
  note: 'Топ-версия — не форсировка базового мотора, а совершенно новый электромотор собственной разработки Alfa. 276hp/254lb-ft.',
})
graph.edges.push({ id: 'e-alfa-junior-veloce', source: 'alfa-junior-2024', target: 'alfa-junior-veloce', type: 'variant_of', strength: 0.85 })
graph.edges.push({ id: 'e-alfa-tonale-junior', source: 'alfa-romeo-tonale', target: 'alfa-junior-2024', type: 'inspired', strength: 0.6 })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('✅ Готово. Узлов:', graph.nodes.length, 'рёбер:', graph.edges.length)
