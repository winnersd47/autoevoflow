#!/usr/bin/env node
/**
 * add-missing-limited.js — добавляет 3 лимитных ноды, которых нет в графе:
 *   lambo-ultimae, bmw-m3-gts-e92, mclaren-elva
 * + исправляет patch-limited.js на правильные ID.
 */

const fs   = require('fs')
const path = require('path')

const GRAPH  = path.join(__dirname, '../public/data/evolution/graph.json')
const PATCH  = path.join(__dirname, 'patch-limited.js')

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// ─── 1. New nodes ──────────────────────────────────────────────────────────────

const NEW_NODES = [
  {
    id:        'lambo-ultimae',
    label:     'Huracán Ultimae',
    type:      'generation',
    year:      2022,
    brandId:   'lamborghini',
    brandName: 'Lamborghini',
    codeName:  'LB724',
    modelSlug: 'lamborghini-huracan-ultimae',
    bodyType:  'coupe',
    segment:   'supercar',
    zone:      'supercar',
    hp:        640,
    engineType:'v10',
    isLimited: true,
  },
  {
    id:        'bmw-m3-gts-e92',
    label:     'M3 GTS E92',
    type:      'generation',
    year:      2010,
    brandId:   'bmw',
    brandName: 'BMW',
    codeName:  'E92 GTS',
    modelSlug: 'bmw-m3-gts-e92',
    bodyType:  'coupe',
    segment:   'supercar',
    zone:      'supercar',
    hp:        450,
    engineType:'v8',
    isLimited: true,
  },
  {
    id:        'mclaren-elva',
    label:     'Elva',
    type:      'generation',
    year:      2020,
    brandId:   'mclaren',
    brandName: 'McLaren',
    codeName:  'M1A',
    modelSlug: 'mclaren-elva',
    bodyType:  'roadster',
    segment:   'hypercar',
    zone:      'hypercar',
    hp:        804,
    engineType:'v8-twin-turbo',
    isLimited: true,
  },
]

const NEW_EDGES = [
  { id: 'lambo-huracan-ultimae-var',   source: 'lambo-huracan',    target: 'lambo-ultimae',     type: 'variant_of', strength: 0.9 },
  { id: 'bmw-m3-gts-e92-var',          source: 'bmw-m3-e92',       target: 'bmw-m3-gts-e92',   type: 'variant_of', strength: 0.9 },
  { id: 'mclaren-senna-elva-var',       source: 'mclaren-senna',    target: 'mclaren-elva',      type: 'variant_of', strength: 0.85 },
]

// ─── 2. Merge (skip if already exists) ────────────────────────────────────────

const existingIds = new Set(g.nodes.map(n => n.id))
let addedNodes = 0
for (const n of NEW_NODES) {
  if (existingIds.has(n.id)) {
    console.log(`⟳  node ${n.id} уже существует, пропуск`)
  } else {
    g.nodes.push(n)
    existingIds.add(n.id)
    addedNodes++
    console.log(`✅ node добавлен: ${n.id} (${n.label} ${n.year})`)
  }
}

const existingEdgeIds = new Set(g.edges.map(e => e.id))
let addedEdges = 0
for (const e of NEW_EDGES) {
  if (existingEdgeIds.has(e.id)) {
    console.log(`⟳  edge ${e.id} уже существует, пропуск`)
  } else {
    // verify source and target exist
    if (!existingIds.has(e.source)) { console.warn(`⚠ source ${e.source} не найден, edge пропущен`); continue }
    if (!existingIds.has(e.target)) { console.warn(`⚠ target ${e.target} не найден, edge пропущен`); continue }
    g.edges.push(e)
    addedEdges++
    console.log(`✅ edge добавлен: ${e.source} --[${e.type}]--> ${e.target}`)
  }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
console.log(`\n📦 graph.json: +${addedNodes} нод, +${addedEdges} рёбер`)
console.log(`   Итого нод: ${g.nodes.length}, рёбер: ${g.edges.length}`)

// ─── 3. Fix patch-limited.js — replace wrong IDs with correct ones ─────────────

const ID_MAP = {
  "'bugatti-la-voiture-noire'": "'bugatti-lavnoire'",
  "'kg-cc8s'":    "'kgsegg-cc8s'",
  "'kg-ccr'":     "'kgsegg-ccr'",
  "'kg-ccx'":     "'kgsegg-ccx'",
  "'kg-agera-r'": "'kgsegg-agera-r'",
  "'kg-agera-one'":"'kgsegg-one1'",
  "'kg-regera'":  "'kgsegg-regera'",
  "'kg-jesko'":   "'kgsegg-jesko'",
  "'kg-jesko-abs'":"'kgsegg-jesko-a'",
  "'kg-gemera'":  "'kgsegg-gemera'",
  "'bmw-m1-e26'": "'bmw-m1-road'",
}

let src = fs.readFileSync(PATCH, 'utf8')
let fixes = 0
for (const [wrong, right] of Object.entries(ID_MAP)) {
  if (src.includes(wrong)) {
    src = src.replaceAll(wrong, right)
    fixes++
    console.log(`  patch-limited.js: ${wrong} → ${right}`)
  }
}
fs.writeFileSync(PATCH, src, 'utf8')
console.log(`\n📝 patch-limited.js: исправлено ${fixes} ID`)
