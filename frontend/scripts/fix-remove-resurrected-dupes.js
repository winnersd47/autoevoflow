'use strict'
/**
 * fix-remove-resurrected-dupes.js — public/data/graph-dismissed-ids.json
 * подтвердил: 11 из 14 дублей, удалённых ранее (ручная чистка + воскресный
 * аудит брендов), успели вернуться обратно за последние ~сутки через
 * sync-latest-to-project.js (скрейпер видит "этого id больше нет в графе" и
 * создаёт его заново). Удаляет их ещё раз — одновременно с этим скриптом
 * sync-latest-to-project.js получает постоянную проверку по этому же файлу,
 * чтобы они не вернулись в третий раз.
 */
const fs   = require('fs')
const path = require('path')
const GRAPH    = path.join(__dirname, '../public/data/evolution/graph.json')
const DISMISSED = path.join(__dirname, '../public/data/graph-dismissed-ids.json')

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const dismissed = JSON.parse(fs.readFileSync(DISMISSED, 'utf-8'))

let removed = 0
for (const id of Object.keys(dismissed)) {
  const n = g.nodes.find(x => x.id === id)
  if (!n) continue
  const hasEdges = g.edges.some(e => e.source === id || e.target === id)
  if (hasEdges) { console.log(`ПРОПУСК — есть рёбра, не трогаю: ${id}`); continue }
  console.log(`удалён (повторно): ${id} | ${n.label}`)
  g.nodes = g.nodes.filter(x => x.id !== id)
  removed++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`\nУдалено узлов: ${removed}`)
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
