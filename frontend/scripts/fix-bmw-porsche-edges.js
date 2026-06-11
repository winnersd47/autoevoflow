/**
 * fix-bmw-porsche-edges.js
 *
 * Чистка связей BMW 1/2 серии + Porsche Boxster/Cayman:
 *
 * 1) ДУБЛИ (ловушка #4 — двойная связь к одному узлу):
 *    - M2 F87 → M2 G87 имеет evolves_into (верно, разные поколения) И variant_of
 *      (неверно). Удаляем variant_of `vm2-f87`.
 *    - Boxster 987 → Cayman 987 имеет derived_from (верно — Cayman отдельная
 *      производная) И variant_of. Удаляем variant_of `vcay-987`.
 *
 * 2) МУСОР СКРАПЕРА на ноде «BMW M2 with M xDrive» (2027):
 *    - i5 G60 →evolves_into→ M2 xDrive (i5 — электроседан 5-й серии, не родитель M2)
 *    - M2 xDrive →evolves_into→ 5 концептов/iX3 (бессмыслица, часть с обратной
 *      хронологией: 2027 → 2026/2025/2024).
 *    Удаляем ВСЕ evolves_into, касающиеся ноды M2 xDrive.
 *    Затем правильная связь: M2 G87 →variant_of→ M2 xDrive (AWD-вариант G87).
 *
 * 3) ПЕРЕЦЕПКА осиротевших нод (честные, подтверждённые связи):
 *    - iX3 (2020) →evolves_into→ iX3 Long Wheelbase (2027)  [новое поколение iX3, Neue Klasse]
 *    - Vision Neue Klasse X Concept (2024) →concept_to_production→ iX3 LWB
 *    - 8 Series G15 →derived_from→ Skytop Concept (2024)   [кузовная спецверсия на базе 8/M8]
 *    - 8 Series G15 →derived_from→ Speedtop Concept (2025)  [shooting-brake собрат Skytop]
 *    Vision Alpina Concept (2026) — база не подтверждена → оставляем отдельным концептом.
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const EEI  = new Set(g.edges.map(e => e.id))
const log  = []

const M2X = 'ncs-bmw-2027-bmw-m2-with-m-xdrive'

// ── helpers ──────────────────────────────────────────────────────────────────
const delEdgeById = id => {
  const i = g.edges.findIndex(e => e.id === id)
  if (i >= 0) { const e = g.edges[i]; log.push('− dup edge ['+id+']: '+(byId[e.source]?.label)+' —'+e.type+'→ '+(byId[e.target]?.label)); g.edges.splice(i,1); return true }
  return false
}
const delEdgesWhere = (pred, tag) => {
  const keep = []
  g.edges.forEach(e => {
    if (pred(e)) log.push('− '+tag+' ['+(e.id||'?')+']: '+(byId[e.source]?.label)+' —'+e.type+'→ '+(byId[e.target]?.label))
    else keep.push(e)
  })
  g.edges = keep
}
const addEdge = (id, s, t, type, strength=0.9) => {
  if (EEI.has(id)) { log.push('· edge '+id+' уже есть'); return false }
  if (!byId[s] || !byId[t]) { log.push('✗ пропуск '+id+' — нет ноды '+(!byId[s]?s:t)); return false }
  g.edges.push({ id, source:s, target:t, type, strength }); EEI.add(id)
  log.push('+ edge ['+id+']: '+byId[s].label+' —'+type+'→ '+byId[t].label)
  return true
}
const patch = (id, p) => { if (byId[id]) { Object.assign(byId[id], p); log.push('~ patch '+id+': '+JSON.stringify(p)) } }

// ── 1) дубли ───────────────────────────────────────────────────────────────
delEdgeById('vm2-f87')    // M2 F87 →variant_of→ M2 G87  (оставляем evolves_into bmw-m2-2)
delEdgeById('vcay-987')   // Boxster 987 →variant_of→ Cayman 987 (оставляем derived_from pc-1)

// ── 2) мусор скрапера: все evolves_into, касающиеся M2 xDrive ─────────────────
delEdgesWhere(e => e.type === 'evolves_into' && (e.source === M2X || e.target === M2X), 'мусор скрапера')
// правильная связь: AWD-вариант поколения G87
addEdge('bmw-m2g87-xdrive-va', 'bmw-m2-g87', M2X, 'variant_of', 0.9)
patch(M2X, { label:'M2 xDrive (G87)', zone:'sports', engineType:'i6t', bodyType:'coupe' })

// ── 3) перецепка осиротевших нод ──────────────────────────────────────────────
// iX3 Neue Klasse (LWB) — следующее поколение iX3
addEdge('bmw-ix3-to-lwb', 'bmw-ix3-f25e', 'ncs-bmw-2027-ix3-long-wheelbase', 'evolves_into', 0.9)
patch('ncs-bmw-2027-ix3-long-wheelbase', { label:'iX3 Neue Klasse (LWB)', zone:'electric', engineType:'ev', bodyType:'suv' })
// Vision Neue Klasse X — концепт-предшественник производственного Neue Klasse iX3
addEdge('bmw-vnkx-to-ix3lwb', 'ncs-bmw-2024-bmw-vision-neue-klasse-x-concept', 'ncs-bmw-2027-ix3-long-wheelbase', 'concept_to_production', 0.85)
// Skytop / Speedtop — кузовные спецверсии на базе 8 Series G15
addEdge('bmw-8g15-to-skytop',  'bmw-8-g15', 'ncs-bmw-2024-bmw-skytop-concept',  'derived_from', 0.7)
addEdge('bmw-8g15-to-speedtop','bmw-8-g15', 'ncs-bmw-2025-bmw-speedtop-concept','derived_from', 0.7)
patch('ncs-bmw-2024-bmw-skytop-concept',  { zone:'open_top', engineType:'v8' })
patch('ncs-bmw-2025-bmw-speedtop-concept',{ zone:'gt_coupe', engineType:'v8' })

// ── save ──────────────────────────────────────────────────────────────────────
fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Фикс связей BMW/Porsche ===')
log.forEach(l => console.log(' ', l))
console.log('\nИтог: узлов', g.nodes.length, '| рёбер', g.edges.length)
