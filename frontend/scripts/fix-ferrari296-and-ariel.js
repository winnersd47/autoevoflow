#!/usr/bin/env node
// По запросу пользователя (2026-09-01, скриншоты Ferrari 296 + Ariel).
//
//   Ferrari 296: 2 узла "ncs-" оказались ДУБЛЯМИ уже существующего, полностью
//   заполненного ferrari-296-spec-a (296 Speciale A, 880hp, F171 Spec A):
//   - ncs-ferrari-2025-296 — label "Ferrari 296" (2025), но СОБСТВЕННОЕ
//     описание начинается "2025 Ferrari 296 Speciale A..." — явно тот же
//     автомобиль, просто криво распарсен (hp вообще не заполнен).
//   - ncs-ferrari-2026-ferrari-296-speciale-aperta — "Aperta" — это ПОЛНОЕ
//     слово, сокращение которого — "A" (как у 458 Speciale A = 458 Speciale
//     Aperta) — та же модель под другим написанием имени, hp (360) явно
//     ошибочный (реальная 296 Speciale A — 880hp, как и купе-версия).
//   Оба узла подключены только через автоматические "sync-ev-" рёбра
//   (evolves_into от ferrari-296 напрямую) — классическая ловушка авто-
//   синка, слепо соединяющего одноимённые узлы без проверки на дубли.
//
//   Ariel: ВСЕ 10 узлов были без единой связи, хотя в описаниях уже прямо
//   указана хронология/донорство (Atom 1 → 2 → 3 → 3.5 → 4 → 4R, Nomad →
//   Nomad R / Nomad 2, "Donor for Rezvani Beast").
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. Удаляем 2 дубля Ferrari 296 Speciale A ===')
const dupIds = new Set(['ncs-ferrari-2025-296', 'ncs-ferrari-2026-ferrari-296-speciale-aperta'])
const nodesBefore = graph.nodes.length
graph.nodes = graph.nodes.filter(n => !dupIds.has(n.id))
const edgesBefore = graph.edges.length
graph.edges = graph.edges.filter(e => !dupIds.has(e.source) && !dupIds.has(e.target))
console.log('  🗑️  узлов удалено:', nodesBefore - graph.nodes.length, '| рёбер удалено:', edgesBefore - graph.edges.length)

console.log('\n=== 2. Ariel — выстраиваем всю линейку по данным из description ===')
graph.edges.push(
  { id: 'ariel-atom-to-2', source: 'ariel-atom', target: 'ariel-atom-2', type: 'evolves_into', strength: 0.9 },
  { id: 'ariel-atom2-to-3', source: 'ariel-atom-2', target: 'ariel-atom-3', type: 'evolves_into', strength: 0.9 },
  { id: 'ariel-atom3-to-35', source: 'ariel-atom-3', target: 'ariel-atom-3s', type: 'evolves_into', strength: 0.85 },
  { id: 'ariel-atom35-to-4', source: 'ariel-atom-3s', target: 'ariel-atom-4', type: 'evolves_into', strength: 0.9 },
  { id: 'ariel-atom4-to-4r', source: 'ariel-atom-4', target: 'ariel-atom-4r', type: 'variant_of', strength: 0.9 },
  { id: 'ariel-atom35-to-nomad', source: 'ariel-atom-3s', target: 'ariel-nomad', type: 'derived_from', strength: 0.8 },
  { id: 'ariel-nomad-to-nomadr', source: 'ariel-nomad', target: 'ariel-nomad-r', type: 'variant_of', strength: 0.85 },
  { id: 'ariel-nomad-to-nomad2', source: 'ariel-nomad', target: 'ariel-nomad-2', type: 'evolves_into', strength: 0.85 },
  { id: 'ariel-atom-to-rezvani', source: 'ariel-atom', target: 'rezvani-beast-gen1', type: 'derived_from', strength: 0.75 },
)
console.log('  ✅ Atom 1 → 2 → 3 → 3.5 → 4 → (variant) 4R')
console.log('  ✅ Atom 3.5 → (derived_from, офф-роуд спин-офф) Nomad → (variant) Nomad R, → (evolves_into) Nomad 2')
console.log('  ✅ Atom 1 → (derived_from, кросс-бренд) Rezvani Beast Gen 1')
console.log('  ℹ️  Hipercar (2023) оставлен без входящего ребра — отдельная EV-платформа, не на базе Atom/Nomad')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
