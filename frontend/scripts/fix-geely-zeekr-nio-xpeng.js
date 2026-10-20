#!/usr/bin/env node
// Geely/Zeekr/NIO/XPeng:
//  - ДУБЛЬ: geely-monjaro-kx11 и geely-xingyue-l — ОДНА и та же машина под
//    двумя id (Monjaro — экспортное имя Xingyue L; собственный codeName
//    дубля даже буквально написан "KX11 / Xingyue L"). Идентичные
//    hp/engineType/engineCC/bodyType/segment/zone. Объединяю в xingyue-l
//    (более ранний год, китайское имя как основное), все рёбра переношу.
//  - Atlas/Tugella/Monjaro(→Xingyue L) были соединены evolves_into, как
//    если бы это поколения ОДНОЙ модели — по факту это ТРИ РАЗНЫЕ модели
//    на одной CMA-платформе (Tugella=Xingyue S, Monjaro=Xingyue L),
//    продающиеся ОДНОВРЕМЕННО в разных сегментах. Меняю на shares_platform.
//  - 11 рёбер с опечаткой типа "inspired" (без "_by") — тот же баг класса,
//    что уже чинили у Škoda/VW/Tesla, здесь сконцентрирован особенно сильно.
//  - Geely Galaxy TT: hp=null, engineType="EV" (регистр) — реальный спек
//    425кВт/570hp, 800V, позиционируется как конкурент Xiaomi SU7/Zeekr 7GT.
//  - Xpeng X9 "facelift"-узел датирован 2024г (как и база) — по факту
//    реальный рестайлинг вышел в 2025г (496 доработок, 800V, новый бампер).
//  - engineType на NIO/XPeng/Zeekr вперемешку "electric"/"BEV"/"ev" —
//    привожу к доминирующей конвенции графа "ev" (как уже делали у VW/Mini/
//    Tesla/Rivian/Lucid).
//  - zone="china_ev" как общая заглушка на нескольких новых узлах вместо
//    конкретного класса, который уже есть у их же братьев по бренду.
// Источники: Wikipedia (Geely Xingyue/Monjaro/Boyue/Atlas), carsguide.com.au,
// autobuzz.my — проверено веб-поиском 2026-10-19.
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
function deleteEdgeById(id) {
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.id !== id)
  console.log(g.edges.length < before ? `  🗑️  удалено ребро ${id}` : `  ⚠️  ребро не найдено: ${id}`)
}
function retargetEdge(id, { source, target, type }) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  if (source) e.source = source
  if (target) e.target = target
  if (type) e.type = type
  console.log(`  🔀 ${id}: → ${e.source} --[${e.type}]--> ${e.target}`)
}

console.log('=== 1. Дубль Monjaro/Xingyue L: объединяем в geely-xingyue-l ===')
fixNode('geely-xingyue-l', {
  note: 'CMA-платформа; бестселлер D-SUV в Китае 2022-23; на экспортных рынках продаётся как "Geely Monjaro" (конкурент VW Touareg, лауреат наград дизайна 2022) — тот же автомобиль, не отдельная модель.',
})
g.nodes = g.nodes.filter(n => n.id !== 'geely-monjaro-kx11')
byId.delete('geely-monjaro-kx11')
console.log('  🗑️  удалён узел-дубль geely-monjaro-kx11')
deleteEdgeById('geely-monjaro-inspired-xingyue-l') // самоссылка после объединения
retargetEdge('geely-preface-inspired-monjaro', { target: 'geely-xingyue-l', type: 'inspired_by' })
retargetEdge('geely-monjaro-inspired-galaxy-l7', { source: 'geely-xingyue-l', type: 'inspired_by' })
retargetEdge('geely-tugella-inspired-monjaro', { target: 'geely-xingyue-l', type: 'shares_platform' })
retargetEdge('geely-atlas-evolves-tugella', { type: 'shares_platform' }) // Atlas/Tugella/Xingyue L — разные модели на одной CMA, не поколения друг друга

console.log('\n=== 2. Опечатки типа ребра "inspired" → "inspired_by" ===')
;[
  'geely-emgrand-ec7-inspired-atlas',
  'geely-tugella-platform-lotus-eletre',
  'geely-galaxy-inspired-zeekr-001',
  'zeekr-001-evolves-zeekr-009',
  'geely-tugella-inspired-lynk-co-01',
  'lynk-co-08-inspired-zeekr-009',
  'xpeng-p7-inspired-g9',
  'xpeng-g9-inspired-x9',
  'nio-ep9-inspired-es8',
  'nio-es8-inspired-et7',
  'nio-et7-inspired-et5',
].forEach(id => retargetEdge(id, { type: 'inspired_by' }))

console.log('\n=== 3. Geely Galaxy TT: реальные характеристики (было hp=null, eng="EV") ===')
fixNode('geely-galaxy-tt', {
  hp: 570, engineType: 'ev', zone: 'sports',
  note: 'Электрокупе-седан, конкурент Xiaomi SU7/Zeekr 7GT/BYD Seal. 800V, 180кВт спереди + 245кВт сзади = 425кВт/570hp суммарно, 0-100 за 3.8с, LFP 75кВтч/650км CLTC.',
})

console.log('\n=== 4. Xpeng X9 facelift: реальный год рестайлинга (было 2024, как у базы) ===')
fixNode('xpeng-x9-2024', {
  year: 2025,
  note: 'Рестайлинг апрель-2025 — 496 доработок (35% новых компонентов), 800V-архитектура, новый бампер/диски, старт продаж в Европе во 2П 2025г.',
})

console.log('\n=== 5. engineType: приводим "electric"/"BEV"/"EV" к доминирующей конвенции "ev" ===')
;['nio','xpeng','zeekr'].forEach(brand => {
  g.nodes.filter(n => n.brandId === brand && /^(electric|BEV|EV)$/.test(n.engineType)).forEach(n => {
    const old = n.engineType
    n.engineType = 'ev'
    console.log(`  🔧 ${n.id}: engineType ${old} → ev`)
  })
})

console.log('\n=== 6. zone="china_ev" заглушка → конкретный класс (как у брата по бренду) ===')
fixNode('nio-el8',        { zone: 'suv_large' })   // как nio-es8
fixNode('nio-ec7',        { zone: 'suv_mid' })      // как предок nio-ec6
fixNode('nio-et9',        { zone: 'flagship_sed' }) // как nio-et7
fixNode('nio-l60',        { zone: 'suv_mid' })
fixNode('xpeng-x9-2024',  { zone: 'luxury' })       // как база xpeng-x9
fixNode('xpeng-g9-2024',  { zone: 'suv_large' })    // как база xpeng-g9
fixNode('zeekr-mix',      { zone: 'luxury' })       // как zeekr-009 (тот же mpv-класс)
fixNode('zeekr-7x',       { zone: 'suv_mid' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
