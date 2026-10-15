#!/usr/bin/env node
// Разделяем Impala Gen.8/9 на базу + отдельный узел SS — как уже сделано
// для Camaro (Gen5-SS/Gen6-SS) и Chevelle/Malibu (SS396/SS454). Раньше в
// самих узлах поколений стояла цифра SS-версии, будто это спецификация
// всего поколения — некорректно и не единообразно с остальным графом.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

const g8 = byId.get('chev-impala-8')
console.log(`Gen.8: было ${g8.hp}hp (это была цифра SS) → база 200hp (3.8L LS), SS выносим отдельно`)
g8.hp = 200
g8.note = 'Смена архитектуры на передний привод (GM W-body/GMX210) — впервые в истории имени. База — 3.4L V6 180hp / 3.8L V6 (LS) 200hp. При запуске V8 не предлагался.'

graph.nodes.push({
  id: 'chev-impala-8-ss', label: 'Impala SS', fullName: 'Chevrolet Impala SS (2004-05)',
  type: 'generation', year: 2004, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala-8-ss', bodyType: 'sedan', segment: 'exec', zone: 'sports',
  hp: 240, engineType: 'v6t', familyKey: 'chev-impala',
  note: '3.8L компрессорный V6 (L67), 240hp — топ-версия поколения Gen.8, только 2004-05гг.' })
graph.edges.push({ id: 'e-impala8-to-ss', source: 'chev-impala-8', target: 'chev-impala-8-ss', type: 'variant_of', strength: 0.85 })

const g9 = byId.get('chev-impala-9')
console.log(`Gen.9: было ${g9.hp}hp (это была цифра SS) → база 211hp (3.5L), SS выносим отдельно`)
g9.hp = 211
g9.engineType = 'v6'
g9.note = 'Полностью новый кузов/платформа (GMX211), тот же класс W-body. База — 3.5L V6 211hp, 3.9L V6 (LTZ) до 242hp (2006г.; к 2011г. — 230hp).'

graph.nodes.push({
  id: 'chev-impala-9-ss', label: 'Impala SS', fullName: 'Chevrolet Impala SS (2006-09)',
  type: 'generation', year: 2006, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala-9-ss', bodyType: 'sedan', segment: 'exec', zone: 'sports',
  hp: 303, engineType: 'v8', familyKey: 'chev-impala',
  note: 'LS4 5.3L V8 (поперечно установлен), 303hp — топ-версия поколения Gen.9, 2006-09гг. Последний передне-приводный американский седан с V8 в продаже в США.' })
graph.edges.push({ id: 'e-impala9-to-ss', source: 'chev-impala-9', target: 'chev-impala-9-ss', type: 'variant_of', strength: 0.85 })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
