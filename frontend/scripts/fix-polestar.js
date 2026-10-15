#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== Polestar 5 — отсутствовал полностью ===')
graph.nodes.push({
  id: 'polestar-5', label: 'Polestar 5 (2025)', fullName: 'Polestar 5',
  type: 'generation', year: 2025, brandId: 'polestar', brandName: 'Polestar',
  modelSlug: 'polestar-5', familyKey: 'polestar-5',
  bodyType: 'sedan', segment: 'exec', zone: 'sports',
  hp: 872, engineType: 'ev',
  note: 'Флагманский GT — производственная реализация концепта Precept (2020) почти без изменений дизайна. Первая у Polestar 800В архитектура, склеенная алюминиевая платформа, батарея 112кВтч. Dual Motor — 738hp, версия Performance — 872hp/0-100 за 3.2с. Cd 0.24.',
})
graph.edges.push({ id: 'polestar-5-insp', source: 'polestar-1', target: 'polestar-5', type: 'inspired_by', strength: 0.6 })
console.log('  ✅ добавлен, inspired_by от polestar-1 (как и у polestar-6)')

console.log('\n=== Polestar 3 — база была подменена цифрой Performance Pack ===')
const p3 = byId.get('polestar-3')
console.log(`  было: ${p3.hp}hp (это Performance Pack) → база 489hp`)
p3.hp = 489
graph.nodes.push({
  id: 'polestar-3-perf', label: 'Polestar 3 Performance Pack', fullName: 'Polestar 3 Performance Pack',
  type: 'generation', year: 2023, brandId: 'polestar', brandName: 'Polestar',
  modelSlug: 'polestar-3-perf', bodyType: 'suv', segment: 'exec', zone: 'sports',
  hp: 517, engineType: 'ev',
  note: '517hp/671lb-ft против 489hp/620lb-ft у стандартной версии, 0-60 за 4.2с.',
})
graph.edges.push({ id: 'polestar-3-perf-var', source: 'polestar-3', target: 'polestar-3-perf', type: 'variant_of', strength: 0.85 })
console.log('  ✅ Polestar 3 Performance Pack — отдельный узел')

console.log('\n=== Polestar 2 Performance Pack — тоже отсутствовал ===')
graph.nodes.push({
  id: 'polestar-2-perf', label: 'Polestar 2 Performance Pack', fullName: 'Polestar 2 Performance Pack',
  type: 'generation', year: 2021, brandId: 'polestar', brandName: 'Polestar',
  modelSlug: 'polestar-2-perf', bodyType: 'sedan', segment: 'exec', zone: 'sports',
  hp: 455, engineType: 'ev',
  note: '455hp/546lb-ft (двухмоторная версия + пакет Performance — Öhlins, Brembo), 0-60 за 4.1с.',
})
graph.edges.push({ id: 'polestar-2-perf-var', source: 'polestar-2', target: 'polestar-2-perf', type: 'variant_of', strength: 0.85 })
console.log('  ✅ Polestar 2 Performance Pack — отдельный узел')

console.log('\n=== Polestar 4 — не трогаю: цифры в источниках слишком близкие (544 vs ~536), непонятно, разные ли это версии ===')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
