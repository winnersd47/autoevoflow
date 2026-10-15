#!/usr/bin/env node
// Citroën ни разу не проверялся на связи в этой сессии (только zone
// чинил ранее). Итог: 25 из 38 узлов бренда были ПОЛНОСТЬЮ без единой
// связи — почти 2/3 бренда. Плюс баг: BX (D-класс) был слабо связан с C4
// (C-класс) напрямую, хотя реальный прямой предшественник C4 — Xsara
// (пропущенное звено в графе).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== БАГ: BX→C4 (напрямую, через сегмент) заменяется на Xsara→C4 (реальный предок) ===')
graph.edges = graph.edges.filter(e => e.id !== 'e-cit-bx-c4')

function addEdge(id, source, target, type, strength) { graph.edges.push({ id, source, target, type, strength }) }

console.log('\n=== Флагманская линия: Traction Avant → DS → CX → XM → C6 ===')
addEdge('e-cit-trac-ds', 'citroen-traction', 'citroen-ds', 'evolves_into', 0.75)
addEdge('e-cit-ds-sm', 'citroen-ds', 'citroen-sm', 'derived_from', 0.7) // SM: шасси/гидравлика DS + мотор Maserati
addEdge('e-cit-xm-c6', 'citroen-xm', 'citroen-c6', 'evolves_into', 0.8)

console.log('\n=== Малый класс: 2CV → Ami/Dyane → Mehari, Ami → Visa → AX (уже есть) → Saxo → C3 ===')
addEdge('e-cit-2cv-ami', 'citroen-2cv', 'citroen-ami', 'derived_from', 0.75)
addEdge('e-cit-2cv-dyane', 'citroen-2cv', 'citroen-dyane', 'inspired_by', 0.7)
addEdge('e-cit-dyane-mehari', 'citroen-dyane', 'citroen-mehari', 'derived_from', 0.75)
addEdge('e-cit-ami-visa', 'citroen-ami', 'citroen-visa', 'evolves_into', 0.75)
addEdge('e-cit-visa-ax', 'citroen-visa', 'citroen-ax', 'evolves_into', 0.85)

console.log('\n=== Компакт-класс: ZX → Xsara → C4 (исправлено) → C4 Gen.2/3, + Picasso/Cactus ===')
addEdge('e-cit-zx-xsara', 'citroen-zx', 'citroen-xsara', 'evolves_into', 0.85)
addEdge('e-cit-xsara-c4', 'citroen-xsara', 'citroen-c4-1', 'evolves_into', 0.85)
addEdge('e-cit-c4-1-2', 'citroen-c4-1', 'citroen-c4-2', 'evolves_into', 0.9)
addEdge('e-cit-c4-2-3', 'citroen-c4-2', 'citroen-c4-3', 'evolves_into', 0.9)
addEdge('e-cit-c4-picasso', 'citroen-c4-1', 'citroen-c4-picasso', 'variant_of', 0.75)
addEdge('e-cit-c4-cactus', 'citroen-c4-2', 'citroen-c4-cactus', 'derived_from', 0.7)

console.log('\n=== Супермини C3: C3 Gen.1 → Gen.2 → Gen.3 → e-C3, + C2, C3 Aircross ===')
addEdge('e-cit-c3-1-2', 'citroen-c3-1', 'citroen-c3-2', 'evolves_into', 0.9)
addEdge('e-cit-c3-2-3', 'citroen-c3-2', 'citroen-c3-3', 'evolves_into', 0.9)
addEdge('e-cit-c3-c2', 'citroen-c3-1', 'citroen-c2', 'derived_from', 0.65)
addEdge('e-cit-c3-3-ec3', 'citroen-c3-3', 'citroen-e-c3', 'variant_of', 0.8)
addEdge('e-cit-c3-3-aircross', 'citroen-c3-3', 'citroen-c3-aircross', 'derived_from', 0.7)

console.log('\n=== C5: Xantia уже → C5 Gen.1 → Gen.2 → Aircross → C5 X ===')
addEdge('e-cit-c5g2-aircross', 'citroen-c5-x2', 'citroen-c5-aircross', 'evolves_into', 0.7)
addEdge('e-cit-aircross-c5x', 'citroen-c5-aircross', 'citroen-c5-x', 'evolves_into', 0.7)

console.log('\n=== DS-суббренд (до отделения в самостоятельную марку) ===')
addEdge('e-cit-c3-ds3', 'citroen-c3-1', 'citroen-ds3', 'derived_from', 0.6)
addEdge('e-cit-c4-ds4', 'citroen-c4-1', 'citroen-ds4', 'derived_from', 0.6)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
console.log('Не тронуты (осознанно, без уверенного реального предка): DS5, Berlingo — оставлены корневыми.')
