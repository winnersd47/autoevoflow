#!/usr/bin/env node
// Lynk & Co 03 TCR — гоночная (WTCR) машина Cyan Racing, отсутствовала.
// Значимая находка: первый в истории мировой титул в автоспорте для
// китайского производителя (WTCR 2019, командный зачёт).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
if (graph.nodes.some(n => n.id === 'lynk-co-03-tcr')) {
  console.log('Уже существует.')
  process.exit(0)
}

graph.nodes.push({
  id: 'lynk-co-03-tcr', label: '03 TCR', fullName: 'Lynk & Co 03 TCR',
  type: 'generation', year: 2019, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: '03 TCR', modelSlug: 'lynk-co-03-tcr',
  bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 350, engineType: 'i4t', engineCC: 1969, isRacing: true, familyKey: 'lynk-co',
  note: 'Гоночная программа Cyan Racing в WTCR (World Touring Car Cup) — дебют на этапе в Марокко 2019г., в этом же сезоне принесла КОМАНДНЫЙ титул чемпиона мира — первый в истории мировой титул в автоспорте для китайского производителя. Мотор Volvo JLH-4G20TD 1969cc турбо I4 (спецификация TCR), 350hp/420Нм, секвентальная 6-ст. Xtrac, FWD. База — кузов серийного 03.',
})
graph.edges.push({ id: 'lco03-to-tcr', source: 'lynk-co-03', target: 'lynk-co-03-tcr', type: 'derived_from', strength: 0.6 })
console.log('  ✅ lynk-co-03 --[derived_from]--> lynk-co-03-tcr')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
