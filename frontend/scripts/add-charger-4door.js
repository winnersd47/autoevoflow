#!/usr/bin/env node
// Точечное добавление: новое поколение Charger (2024+) — первое в истории имени,
// которое продаётся сразу в 2- И 4-дверном кузове под ОДНИМ неймингом (раньше
// Charger был либо только 2-дверным 1966-78, либо только 4-дверным 2006-2023).
// Решение пользователя: не сворачивать это в одну ноду с текстовой припиской,
// а развести на явные пары — чтобы кузов был видимым/фильтруемым признаком
// (bodyType), а не просто строкой в description.
//
// Три существующие ноды (Daytona EV, Sixpack R/T, Super Bee) становятся явными
// 2-Door версиями (id/связи не меняются — только label+bodyType, чтобы не
// сломать существующие edges на них). К каждой добавляется 4-Door близнец с
// ИДЕНТИЧНЫМИ характеристиками (реальный Dodge подтверждает одинаковый
// привод/мощность в обоих кузовах — меняется только кузов) и variant_of от
// 2-Door к 4-Door, чтобы они легли в ту же колонку/глубину графа, что и
// остальные same-generation варианты (Hellcat/Demon и т.п.).
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

let addedN = 0, addedE = 0
const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n; addedN++
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  addedE++; console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}

// ── 1. Помечаем существующие ноды как явные 2-Door ────────────────────────────
const daytonaEv = byId['dodge-charger-daytona-ev']
daytonaEv.label = 'Charger Daytona EV 2-Door'
console.log(`FIX  dodge-charger-daytona-ev: label -> "${daytonaEv.label}"`)

const sixpack = byId['dodge-charger-sixpack']
sixpack.label = 'Charger Sixpack R/T 2-Door'
sixpack.bodyType = 'coupe' // было "Muscle Car" — нестандартное значение, единственное в графе
console.log(`FIX  dodge-charger-sixpack: label -> "${sixpack.label}", bodyType -> coupe`)

const superBee = byId['dodge-charger-super-bee']
superBee.label = 'Charger Super Bee 2-Door'
superBee.description = 'Топ-трим нового Sixpack Charger — на 50 л.с. мощнее Scat Pack, почти на уровне Hellcat. 2-Door и 4-Door технически идентичны (тот же привод/мощность), разница только в кузове.'
console.log(`FIX  dodge-charger-super-bee: label -> "${superBee.label}", description обновлён`)

// ── 2. Добавляем 4-Door близнецов с идентичными характеристиками ──────────────
console.log('\n── 4-Door близнецы ──')
addNode({
  id: 'dodge-charger-daytona-ev-4dr', label: 'Charger Daytona EV 4-Door',
  type: 'generation', year: daytonaEv.year,
  brandId: 'dodge', brandName: 'Dodge', codeName: daytonaEv.codeName,
  modelSlug: daytonaEv.modelSlug, bodyType: 'sedan', segment: daytonaEv.segment, zone: daytonaEv.zone,
  hp: daytonaEv.hp, engineType: daytonaEv.engineType,
  note: daytonaEv.note,
})
addNode({
  id: 'dodge-charger-sixpack-4dr', label: 'Charger Sixpack R/T 4-Door',
  type: 'generation', year: sixpack.year,
  brandId: 'dodge', brandName: 'Dodge', codeName: sixpack.codeName,
  modelSlug: sixpack.modelSlug, bodyType: 'sedan', segment: sixpack.segment, zone: sixpack.zone,
  hp: sixpack.hp, engineType: sixpack.engineType,
})
addNode({
  id: 'dodge-charger-super-bee-4dr', label: 'Charger Super Bee 4-Door',
  type: 'generation', year: superBee.year,
  brandId: 'dodge', brandName: 'Dodge', codeName: superBee.codeName,
  modelSlug: superBee.modelSlug, bodyType: 'sedan', segment: superBee.segment, zone: superBee.zone,
  hp: superBee.hp, engineType: superBee.engineType,
  description: 'Технически идентичен 2-Door версии (тот же привод/мощность) — отличие только в кузове.',
})

addEdge('e-daytonaev-2dr-4dr', 'dodge-charger-daytona-ev', 'dodge-charger-daytona-ev-4dr', 'variant_of')
addEdge('e-sixpack-2dr-4dr', 'dodge-charger-sixpack', 'dodge-charger-sixpack-4dr', 'variant_of')
addEdge('e-superbee-2dr-4dr', 'dodge-charger-super-bee', 'dodge-charger-super-bee-4dr', 'variant_of')

console.log(`\nAdded ${addedN} nodes, ${addedE} edges.`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
