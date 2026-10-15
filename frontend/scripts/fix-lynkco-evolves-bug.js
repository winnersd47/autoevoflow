#!/usr/bin/env node
// Lynk & Co 01/03/05/08/Z10 — реальные модели бренда это ПАРАЛЛЕЛЬНЫЕ
// нейминги (как BMW 1/3/5 серии), не поколения одной машины: 01 (компакт-SUV,
// 2017) продаётся ПАРАЛЛЕЛЬНО с 08 (средний SUV, 2022) — 08 не заменяет 01.
// Аналогично Z10 (2024, седан-флагман на платформе SEA) — не преемник 08
// (PHEV-кроссовер на другой платформе), а отдельная новая линейка.
// Найдены 2 ошибочных ребра evolves_into (01→08, 08→Z10) — по факту это те
// же отношения "влияния дизайна", что уже верно стоят у 01→03 и 01→05
// (type: "inspired"). Приводим к тому же типу для консистентности.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const fixes = [
  ['lynk-co-01-evolves-lynk-co-08', 'lynk-co-01', 'lynk-co-08', 0.65],
  ['e-lco-08-z10', 'lynk-co-08', 'lynk-co-z10', 0.6],
]
for (const [id, source, target, strength] of fixes) {
  const e = graph.edges.find(x => x.id === id && x.source === source && x.target === target)
  if (!e) { console.log('  ⚠️  не найдено ребро:', id); continue }
  console.log(`  было: ${source} --[${e.type}]--> ${target}`)
  e.type = 'inspired'
  e.strength = strength
  console.log(`  стало: ${source} --[inspired, ${strength}]--> ${target}`)
}

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('\n✅ Готово.')
