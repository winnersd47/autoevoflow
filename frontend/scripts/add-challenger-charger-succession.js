#!/usr/bin/env node
// Точечное добавление: Challenger (LC, 2008-2023) и новый Charger (STLA Large,
// 2024+) НЕ делят платформу и не связаны по трим-истории — это подтверждено
// ранее и остаётся верным. Но между ними есть реальная рыночная преемственность:
// Challenger сняли с производства в конце 2023-го ИМЕННО потому, что новый
// 2-дверный бензиновый Charger (Sixpack) должен был занять его место маслкара
// в модельном ряду Dodge — это открыто заявленная Dodge позиция, а не догадка.
// inspired_by — тот же тип, что уже используют R5→Clio и Superbird→Charger
// B-body в этом графе: разный нейминг, ноль общей инженерии, но прямая
// смысловая эстафета. Только 2-Door (Challenger никогда не был 4-дверным) и
// только бензиновая ветка (Sixpack), не EV Daytona.
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  if (g.edges.some(e => e.id === id)) { console.log(`SKIP edge (exists): ${id}`); return }
  g.edges.push({ id, source, target, type, strength: 0.75, ...extra })
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}

addEdge(
  'e-demon170-sixpack2dr', 'dodge-challenger-srt-demon-170', 'dodge-charger-sixpack',
  'inspired_by',
  { note: 'Challenger сняли с производства в 2023-м, когда 2-дверный Sixpack Charger занял его место маслкара в лайнапе Dodge — рыночная преемственность без общей платформы/инженерии.' }
)

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
