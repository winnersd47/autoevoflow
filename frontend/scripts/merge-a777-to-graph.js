#!/usr/bin/env node
/**
 * merge-a777-to-graph.js
 * Bakes A777 performance data from a777-cache.json into graph.json node metadata.
 *
 * Fields added to each node (if found in cache):
 *   a777TopSpeed   — max speed km/h
 *   a777Accel      — 0-100 km/h seconds
 *   a777Torque     — Nm
 *   a777Weight     — kg
 *   a777Price      — USD
 *   a777HpPerTon   — hp/t
 *   a777HpPerLiter — hp/l
 *   a777Nurb       — Nürburgring lap time string (e.g. "7:18.89")
 *   a777TopGear    — Top Gear lap time string
 *   a777Hockenheim — Hockenheim short lap time string
 *   a777Tsukuba    — Tsukuba Circuit lap time string
 *
 * Safe to run multiple times — only overwrites a777* fields.
 * Usage: node scripts/merge-a777-to-graph.js
 */

const fs   = require('fs')
const path = require('path')

const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')
const CACHE_FILE = path.join(__dirname, '../public/data/a777-cache.json')

function main() {
  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))

  let merged = 0, skipped = 0
  graph.nodes = graph.nodes.map(node => {
    const entry = cache[node.id]
    if (!entry?.found) { skipped++; return node }

    const a777 = {}

    // Numeric specs — sanity check before writing
    if (entry.topSpeed     && entry.topSpeed >= 100 && entry.topSpeed <= 600)
      a777.a777TopSpeed = entry.topSpeed
    if (entry.acceleration && entry.acceleration >= 1  && entry.acceleration <= 20)
      a777.a777Accel = entry.acceleration
    if (entry.torque       && entry.torque >= 50  && entry.torque <= 3000)
      a777.a777Torque = entry.torque
    if (entry.weightKg     && entry.weightKg >= 500 && entry.weightKg <= 5000)
      a777.a777Weight = entry.weightKg
    if (entry.priceUsd     && entry.priceUsd >= 1000)
      a777.a777Price = entry.priceUsd
    if (entry.hpPerTon     && entry.hpPerTon >= 50 && entry.hpPerTon <= 2000)
      a777.a777HpPerTon = entry.hpPerTon
    if (entry.hpPerLiter   && entry.hpPerLiter >= 20 && entry.hpPerLiter <= 700)
      a777.a777HpPerLiter = entry.hpPerLiter

    // Track times (strings like "7:18.89")
    const tt = entry.trackTimes ?? {}
    if (tt.nurburgring)  a777.a777Nurb        = tt.nurburgring
    if (tt.topgear)      a777.a777TopGear     = tt.topgear
    if (tt.hockenheim)   a777.a777Hockenheim  = tt.hockenheim
    if (tt.tsukuba)      a777.a777Tsukuba     = tt.tsukuba

    if (Object.keys(a777).length > 0) { merged++; return { ...node, ...a777 } }
    skipped++
    return node
  })

  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
  console.log(`✅ Merged A777 data: ${merged} nodes updated, ${skipped} skipped (not found).`)
  console.log(`   graph.json → ${GRAPH_FILE}`)
}

main()
