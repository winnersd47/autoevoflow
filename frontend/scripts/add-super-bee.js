#!/usr/bin/env node
// Точечное добавление: нейминг "Super Bee" целиком отсутствовал в графе.
//   1. 1968 Coronet Super Bee — оригинал, бюджетный маслкар-ответ на Plymouth
//      Road Runner, тот же B-body, что и Charger того поколения → shares_platform
//      с dodge-charger-1969 (тот же паттерн, что уже есть у GTX/Chrysler 300).
//   2. 2027 Charger Super Bee — реальный анонс (Car and Driver, только что
//      заскрейплен), топовый Sixpack-трим нового Charger (I6 Hurricane TT,
//      ~600 л.с.) → variant_of dodge-charger-sixpack (та же генерация/платформа).
//      ВАЖНО: подтверждено поиском (Jalopnik/CarBuzz/MotorWeek) — модель
//      выпускается в 2- И 4-дверном кузове, но это ВСЕГДА Charger, никогда
//      Challenger — у Super Bee нет и не было ни одной точки пересечения с
//      Challenger (ни платформы, ни трима), поэтому рёбер к Challenger нет.
//   Обе ноды получают единый modelSlug 'dodge-super-bee' — Dodge всегда вёл
//   Super Bee как отдельный суб-нейминг, а не растворял его в Coronet/Charger.
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

// Мелкая смежная починка: у dodge-charger-sixpack не было modelSlug/type —
// без этого он выпадал из группировки по модели на карточках/списках.
const sixpack = byId['dodge-charger-sixpack']
if (sixpack && !sixpack.modelSlug) {
  sixpack.modelSlug = 'dodge-charger'
  sixpack.type = sixpack.type || 'generation'
  console.log('FIX  dodge-charger-sixpack: добавлен modelSlug=dodge-charger, type=generation')
}

console.log('── 1968 Coronet Super Bee (оригинал) ──')
addNode({
  id: 'dodge-coronet-super-bee-1968', label: 'Coronet Super Bee', fullName: 'Dodge Coronet Super Bee',
  type: 'generation', year: 1968,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'B-body Super Bee',
  modelSlug: 'dodge-super-bee', bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
  hp: 335, engineType: 'v8',
  description: 'Бюджетный ответ Dodge на Plymouth Road Runner — тот же B-body, что и Charger, но проще и дешевле; опционально 426 Hemi.',
})
addEdge('e-superbee68-charger69', 'dodge-coronet-super-bee-1968', 'dodge-charger-1969', 'shares_platform')

console.log('── 2027 Charger Super Bee (возрождение, реальный анонс) ──')
addNode({
  id: 'dodge-charger-super-bee', label: 'Charger Super Bee', fullName: 'Dodge Charger Super Bee',
  type: 'generation', year: 2027,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LH Super Bee',
  modelSlug: 'dodge-super-bee', bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
  hp: 600, engineType: 'I6 Hurricane TT',
  description: 'Топ-трим нового Sixpack Charger — на 50 л.с. мощнее Scat Pack, почти на уровне Hellcat. Доступен в 2- И 4-дверном кузове (обе версии — Charger; к Challenger отношения не имеет).',
})
addEdge('e-charger-sixpack-superbee', 'dodge-charger-sixpack', 'dodge-charger-super-bee', 'variant_of')
addEdge('e-superbee68-superbee27', 'dodge-coronet-super-bee-1968', 'dodge-charger-super-bee', 'inspired')

console.log(`\nAdded ${addedN} nodes, ${addedE} edges.`)
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
