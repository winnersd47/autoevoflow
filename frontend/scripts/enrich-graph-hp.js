#!/usr/bin/env node
/**
 * enrich-graph-hp.js — обогащает graph.json данными из A777 кэша
 *
 * Заполняет поле `hp` у узлов, где оно отсутствует или равно 0,
 * используя данные из public/data/a777-cache.json.
 *
 * Запуск: node scripts/enrich-graph-hp.js
 * Вызывается автоматически из scrape-latest.js после парсинга.
 */
const fs   = require('fs')
const path = require('path')

const ROOT       = path.join(__dirname, '..')
const GRAPH_FILE = path.join(ROOT, 'public/data/evolution/graph.json')
const A777_FILE  = path.join(ROOT, 'public/data/a777-cache.json')

function main() {
  if (!fs.existsSync(A777_FILE)) {
    console.log('a777-cache.json не найден — пропускаем обогащение hp')
    return
  }

  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
  const a777  = JSON.parse(fs.readFileSync(A777_FILE, 'utf8'))

  let updated = 0, skipped = 0

  graph.nodes = graph.nodes.map(node => {
    const entry = a777[node.id]
    if (!entry?.found) { skipped++; return node }

    let changed = false
    const patch = {}

    // hp — главное поле для раскладки «Мощность»
    if (entry.horsepower && (!node.hp || node.hp === 0)) {
      patch.hp = entry.horsepower
      changed = true
    }

    if (!changed) { skipped++; return node }
    updated++
    return { ...node, ...patch }
  })

  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
  console.log(`enrich-graph-hp: обновлено ${updated} узлов, пропущено ${skipped}`)
}

main()
