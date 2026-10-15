#!/usr/bin/env node
/**
 * patch-m1-edges.js — исправляет исторически некорректные рёбра BMW M1:
 *
 * УДАЛЯЕМ (неверное направление / неверный тип):
 *   M1 Concept → concept_to_production → M3 E30  (M1 ≠ прототип M3)
 *   M1 Road    → influenced_by         → M3 E30  (M1 1978 не мог быть под влиянием M3 1986)
 *   M1 Concept → influenced_by         → M5 E28  (то же — инвертировано по времени)
 *
 * ДОБАВЛЯЕМ (исторически точные):
 *   M5 E28     → influenced_by → M1 Road     (M5 унаследовал M88 и дух M Division от M1)
 *   M635CSi E24→ influenced_by → M1 Road     (M635CSi использует тот же M88 3.5L I6 от M1)
 *   M3 E30     → inspired      → M1 Road     (M3 вдохновлён гоночным наследием M1 / Procar)
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// ── Remove wrong edges ────────────────────────────────────────────────────────

const REMOVE = new Set([
  JSON.stringify({ source: 'bmw-m1-concept', target: 'bmw-m3-e30',  type: 'concept_to_production' }),
  JSON.stringify({ source: 'bmw-m1-road',    target: 'bmw-m3-e30',  type: 'influenced_by' }),
  JSON.stringify({ source: 'bmw-m1-concept', target: 'bmw-m5-e28',  type: 'influenced_by' }),
])

const before = g.edges.length
g.edges = g.edges.filter(e => {
  const key = JSON.stringify({ source: e.source, target: e.target, type: e.type })
  if (REMOVE.has(key)) { console.log('❌ removed:', e.source, '--['+e.type+']->', e.target); return false }
  return true
})
console.log(`Removed ${before - g.edges.length} edges\n`)

// ── Add correct edges ─────────────────────────────────────────────────────────

const ADD = [
  {
    id:       'bmw-m1road-infl-m5e28',
    source:   'bmw-m1-road',
    target:   'bmw-m5-e28',
    type:     'influenced_by',
    strength: 0.75,
    // M1 (1978) → M5 E28 (1984): M88 engine carried over; M1 defined M Division DNA
  },
  {
    id:       'bmw-m1road-infl-m6e24',
    source:   'bmw-m1-road',
    target:   'bmw-m6-e24',
    type:     'influenced_by',
    strength: 0.80,
    // M1 (1978) → M635CSi E24 (1983): same M88 3.5L I6 engine, shared powertrain lineage
  },
  {
    id:       'bmw-m3e30-insp-m1road',
    source:   'bmw-m3-e30',
    target:   'bmw-m1-road',
    type:     'inspired',
    strength: 0.60,
    // M3 E30 (1986) was inspired by M1 Procar racing legacy and M Division philosophy
  },
]

const existingIds = new Set(g.edges.map(e => e.id))
const nodeIds     = new Set(g.nodes.map(n => n.id))

let added = 0
for (const e of ADD) {
  if (existingIds.has(e.id)) { console.log('⟳ already exists:', e.id); continue }
  if (!nodeIds.has(e.source)) { console.warn('⚠ source not found:', e.source); continue }
  if (!nodeIds.has(e.target)) { console.warn('⚠ target not found:', e.target); continue }
  g.edges.push(e)
  added++
  console.log('✅ added:', e.source, '--['+e.type+']->', e.target)
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
console.log(`\n📦 graph.json: +${added} edges → total ${g.edges.length}`)
