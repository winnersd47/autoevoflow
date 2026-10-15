#!/usr/bin/env node
// Focus Mk4 (C519, 2018) не имел ни одной модификации в графе, хотя у Mk3
// есть и ST, и RS. Реальность разная для двух половин вопроса:
//  - Focus ST Mk4 (2019) — реальная машина, просто пропущена. Добавляем.
//  - Focus RS Mk4 — Ford официально отменил разработку в апреле 2020
//    (пан-европейские нормы CO2 сделали нерентабельной гибридную AWD-версию
//    при таких объёмах продаж) — это НЕ пробел в данных, RS для Mk4 просто
//    не существует. Ничего не добавляем, фиксируем факт в note у ST.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const id = 'ford-focus-st-4'
if (graph.nodes.some(n => n.id === id)) {
  console.log('Уже существует, ничего не делаю:', id)
  process.exit(0)
}

graph.nodes.push({
  id, label: 'Focus ST', fullName: 'Ford Focus ST Mk4',
  type: 'generation', year: 2019, brandId: 'ford', brandName: 'Ford',
  codeName: 'C519 ST', modelSlug: 'ford-focus-st-4',
  bodyType: 'hatchback', segment: 'mainstream', zone: 'sports',
  hp: 276, engineType: 'i4t', familyKey: 'ford-focus',
  note: '2.3L EcoBoost I4, 276hp/310lb-ft (420Нм), 0-62 за 5.7с (МКПП); впервые для ST доступна опция 7-АКПП. Топ-версия поколения Mk4 — Focus RS для Mk4 официально ОТМЕНЁН Ford в апреле 2020: пан-европейские нормы CO2/выбросов сделали нерентабельной разработку гибридной AWD-версии при таких объёмах продаж. Поэтому в графе нет узла Focus RS Mk4 — это не пробел в данных, а исторический факт (подтверждено Ford, Auto Express, Autocar, апрель 2020).',
})
graph.edges.push({ id: 'ford-focus4-to-st4', source: 'ford-focus-4', target: id, type: 'variant_of', strength: 0.8 })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('✅ Добавлен узел', id, '+ variant_of от ford-focus-4')
console.log(`Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
