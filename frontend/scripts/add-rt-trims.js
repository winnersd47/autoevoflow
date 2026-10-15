#!/usr/bin/env node
// Точечное добавление по запросу пользователя: "проверь весь бренд" на предмет
// пропавшего R/T — одного из старейших и самых узнаваемых перформанс-беджей
// Dodge (с 1967-го), которого не было НИ НА ОДНОЙ ноде графа.
//
// Главная находка — Charger: цепочка шла 1969 B-body -> "Charger SRT8 (2011)"
// напрямую, как будто SRT8 и есть база поколения. На деле SRT8 всегда был
// ТОП-тримом; R/T — настоящий волюм-трим, вокруг которого строилось всё
// поколение LX/LD (2006-2023). Добавляем Charger R/T (2006, старт LX) как
// истинную базу, переставляем на неё inspired от B-body и shares_platform от
// Chrysler 300, SRT8 становится variant_of R/T (а не псевдо-базой).
//
// Тот же паттерн — Durango R/T (сиблинг Hellcat под Gen.3) и Dakota R/T
// (единственный явный перформанс-трим этого грузовичка, 1998).
//
// НЕ трогаем: Ram R/T (у Ram Gen.2 уже 245 л.с. — почти в точности спек R/T
// того поколения, отдельная нода была бы дублем с низкой ценностью) и Magnum
// R/T (это вообще отдельная непредставленная в графе модель, не просто
// пропавший трим — больше по объёму, чем текущий точечный запрос).
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  if (g.edges.some(e => e.id === id)) { console.log(`SKIP edge (exists): ${id}`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}
const retarget = (edgeId, newTarget) => {
  const e = g.edges.find(x => x.id === edgeId)
  if (!e) { console.log(`SKIP retarget — edge not found: ${edgeId}`); return }
  const oldTarget = e.target
  e.target = newTarget
  console.log(`RETARGET ${edgeId}: -> ${byId[oldTarget]?.label} превратилось в -> ${byId[newTarget]?.label}`)
}

console.log('── Charger R/T (2006, LX) — истинная база поколения ──')
addNode({
  id: 'dodge-charger-rt-lx', label: 'Charger R/T', fullName: 'Dodge Charger R/T',
  type: 'generation', year: 2006,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LX Charger R/T',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'exec_sed',
  hp: 340, engineType: 'v8', engineCC: 5700,
  note: '5.7L HEMI; волюм-трим, вокруг которого строилось всё поколение LX/LD (2006–2023) — SRT8 был верхним тримом НАД ним, а не базой.',
})
retarget('charger-1969-srt8', 'dodge-charger-rt-lx')
retarget('e-chr-300lx-charger', 'dodge-charger-rt-lx')
addEdge('e-chargerrt-srt8', 'dodge-charger-rt-lx', 'dodge-charger-srt8-2011', 'variant_of')

console.log('\n── Durango R/T (сиблинг Hellcat под Gen.3) ──')
addNode({
  id: 'dodge-durango-rt', label: 'Durango R/T', fullName: 'Dodge Durango R/T',
  type: 'generation', year: 2011,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'WD Durango R/T',
  modelSlug: 'dodge-durango', bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
  hp: 360, engineType: 'v8', engineCC: 5700,
  note: '5.7L HEMI; спорт-трим до появления Hellcat в 2021-м.',
})
addEdge('e-durango3-rt', 'dodge-durango-gen3', 'dodge-durango-rt', 'variant_of')

console.log('\n── Dakota R/T (1998) ──')
addNode({
  id: 'dodge-dakota-rt', label: 'Dakota R/T', fullName: 'Dodge Dakota R/T',
  type: 'generation', year: 1998,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'Dakota R/T',
  modelSlug: 'dodge-dakota-2', bodyType: 'pickup', segment: 'performance', zone: 'pickup',
  hp: 250, engineType: 'v8', engineCC: 5900,
  note: '5.9L Magnum V8 — единственный по-настоящему перформанс-трим Dakota, "спящий" маслкар-пикап своей эпохи.',
})
addEdge('e-dakota2-rt', 'dodge-dakota-2', 'dodge-dakota-rt', 'variant_of')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
