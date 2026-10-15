#!/usr/bin/env node
// BYD Shark — первый пикап BYD, реальная модель, подтверждена независимо
// (BYD UK Media, Autocar, Electrek, Notebookcheck, июль 2026), уже в продаже
// в Европе/UK. В графе не было ни одного узла про неё (проверено grep по
// brandId:"byd" и по "shark" — только ложное совпадение в note Corvette).
// Донора/базы нет — первый пикап бренда, оставляем корневым узлом.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const id = 'byd-shark-phev'
if (graph.nodes.some(n => n.id === id)) {
  console.log('Уже существует, ничего не делаю:', id)
  process.exit(0)
}

graph.nodes.push({
  id,
  label: 'BYD Shark',
  type: 'generation',
  year: 2026,
  brandId: 'byd',
  brandName: 'BYD',
  codeName: 'DMO',
  modelSlug: 'byd-shark',
  bodyType: 'pickup',
  segment: 'truck',
  zone: 'pickup',
  hp: 436,
  engineType: 'phev',
  engineCC: 1500,
  note: '436 л.с. суммарно (150 л.с. турбо-I4 1.5 как генератор + 231 л.с. передний мотор + 204 л.с. задний), 650 Нм, 0-100 за 5.7с; первый пикап BYD, платформа Super Hybrid DMO (Dual Mode Off-road); запас хода на электротяге 90км WLTP, общий 675км; старт продаж в Европе/UK — 2026 (модельный год 2027 по номенклатуре netcarshow), от £47290 в UK; источники: BYD UK Media, Electrek, Notebookcheck, Autocar (июль 2026).',
})

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('✅ Добавлен корневой узел:', id, '(без донора — первый пикап бренда)')
console.log(`Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
