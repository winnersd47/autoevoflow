#!/usr/bin/env node
// BYD: проверил Song Pro/Song Plus (действительно отдельные параллельные
// модели в линейке Song, не поколения друг друга — inspired_by уже верно
// стоял, не трогаю) и текущее поколение Qin (Qin L/Qin Plus 2-го поколения —
// BYD прямо сейчас переживает "Major Overhaul" всей номенклатуры Dynasty/
// Ocean-линеек с частыми переименованиями, тянуть это сюда — высокий риск
// внести данные, которые устареют быстрее, чем будут опубликованы; сознательно
// не трогаю, в отличие от уже подтверждённых исторических фактов у других
// брендов). Правки здесь — только механические, без риска:
//  - 6 опечаток типа ребра "inspired" → "inspired_by".
//  - engineType вперемешку "PHEV"/"phev" и "electric"/"BEV"/"ev" — приводим
//    к доминирующим в графе "phev" и "ev" (как уже делали у VW/Mini/Tesla/
//    NIO/XPeng/Zeekr).
//  - 3 узла с zone="china_ev" заглушкой вместо конкретного класса.
// Источники: Wikipedia, cnevpost.com — проверено веб-поиском 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch))
}
function retypeEdge(id, newType) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено по id, ищу по паре...'); return false }
  console.log(`  🔄 ${id}: ${e.type} → ${newType}`)
  e.type = newType
  return true
}
function retypeEdgeByPair(source, target, newType) {
  const e = g.edges.find(e => e.source === source && e.target === target)
  if (!e) { console.log(`  ⚠️  ребро не найдено: ${source} -> ${target}`); return }
  console.log(`  🔄 ${source} -> ${target}: ${e.type} → ${newType}`)
  e.type = newType
}

console.log('=== 1. Опечатки "inspired" → "inspired_by" ===')
;[
  ['byd-tang-phev', 'byd-han-ev'],
  ['byd-han-ev', 'byd-seal-ev'],
  ['byd-dolphin-ev', 'byd-seagull-ev'],
  ['byd-atto3-ev', 'byd-seal-ev'],
  ['byd-tang-phev', 'byd-song-plus-phev'],
  ['byd-tang-phev', 'byd-yangwang-u8'],
].forEach(([s, t]) => retypeEdgeByPair(s, t, 'inspired_by'))

console.log('\n=== 2. engineType: нормализация регистра/конвенции ===')
fixNode('byd-destroyer05', { engineType: 'phev' })
fixNode('byd-sea-lion9',   { engineType: 'phev' })
fixNode('byd-sea-hawk',    { engineType: 'phev' })
fixNode('byd-han-ev',      { engineType: 'ev' })
fixNode('byd-dolphin-ev',  { engineType: 'ev' })
fixNode('byd-atto3-ev',    { engineType: 'ev' })
fixNode('byd-seal-ev',     { engineType: 'ev' })
fixNode('byd-seagull-ev',  { engineType: 'ev' })
fixNode('byd-sea-lion7',   { engineType: 'ev' })

console.log('\n=== 3. zone="china_ev" заглушка → конкретный класс ===')
fixNode('byd-destroyer05', { zone: 'midsize_sed' }) // derived_from Qin — тот же класс седана
fixNode('byd-sea-lion9',   { zone: 'suv_large' })   // flagship-класс, как Tang/Yangwang U8
fixNode('byd-sea-hawk',    { zone: 'suv_large' })   // 1200hp ультра-флагман

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
