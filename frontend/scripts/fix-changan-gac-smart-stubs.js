#!/usr/bin/env node
// Changan/GAC/Smart + одноузловые заглушки (Seres/BAIC/MG):
//  - 4 опечатки типа ребра "inspired" → "inspired_by" у Changan (размерная
//    линейка CS35/CS55/CS75 и Uni-K/Uni-Z — параллельные модели одного
//    бренда, не поколения друг друга, inspired_by тут и так корректен по
//    смыслу, просто без "_by").
//  - GAC GM8/M8/E8 — большие MPV, но bodyType="van" (в графе уже есть
//    отдельное значение "mpv", которым помечены аналогичные машины у
//    Zeekr/Xpeng) — для единообразия меняю на "mpv".
//  - GAC Trumpchi Yue 7 (2027): реально EREV (1.5Т работает ТОЛЬКО как
//    генератор, колёса крутят исключительно 2 мотора) — был помечен "phev"
//    (параллельный гибрид, где ДВС тоже может крутить колёса напрямую).
//    hp=544 не сходится ни с одной реальной цифрой (536 от моторов,
//    отдельно 168 от ДВС-генератора) — исправляю на 536.
//  - BAIC Taitan 700 (2026): та же EREV-архитектура, но был hp=300 (реально
//    532) и bodyType="pickup" — по факту это body-on-frame SUV (рама +
//    несущий кузов, НЕ пикап с открытым кузовом).
//  - MG GO! Concept (2026): bodyType="suv" — по факту B-сегмент ХЭТЧБЕК
//    (явно во всех источниках), подробных характеристик компания намеренно
//    не раскрыла (hp=null — это честное "неизвестно", не баг, не трогаю).
//  - Smart: 6 узлов без bodyType + "gasoline"-заглушка engineType (тот же
//    паттерн, что уже чинили у Mini) — ВАЖНО: 1-е поколение Forfour (2004)
//    технически отличается от остальной линейки — это ребейдж Mitsubishi
//    Colt (передний мотор, обычная "четвёрка"), тогда как Fortwo/Forfour-2/
//    Roadster все на заднемоторной турбо-"тройке" — не ставлю всем одинаковый
//    i3t бездумно.
//  - Seres SF5 + вся линейка AITO (M5/M7/M7 Pro/M9) используют общую
//    заглушку zone="china_ev" — привожу к их же полям segment.
// Источники: carscoops.com, tarantas.news, motori.ua, whatcar.com,
// autopunditz.com — проверено веб-поиском 2026-10-19.
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
function retypeEdgeByPair(source, target, newType) {
  const e = g.edges.find(e => e.source === source && e.target === target)
  if (!e) { console.log(`  ⚠️  ребро не найдено: ${source} -> ${target}`); return }
  console.log(`  🔄 ${source} -> ${target}: ${e.type} → ${newType}`)
  e.type = newType
}

console.log('=== 1. Changan: опечатки "inspired" → "inspired_by" ===')
;[
  ['changan-cs35-plus', 'changan-cs55-plus'],
  ['changan-cs55-plus', 'changan-cs75-plus'],
  ['changan-cs55-plus', 'changan-oshan-x5-plus'],
  ['changan-uni-k', 'changan-uni-z'],
].forEach(([s, t]) => retypeEdgeByPair(s, t, 'inspired_by'))

console.log('\n=== 2. GAC: bodyType van→mpv, Yue 7 реальные характеристики ===')
fixNode('gac-gm8', { bodyType: 'mpv' })
fixNode('gac-m8',  { bodyType: 'mpv' })
fixNode('gac-e8',  { bodyType: 'mpv' })
fixNode('gac-trumpchi-yue7', {
  hp: 536, engineType: 'erev',
  note: 'Первый хардкорный внедорожник Trumpchi (рама + подключаемый полный привод, тройная блокировка дифференциалов 100%). EREV-архитектура — 1.5Т работает ТОЛЬКО как генератор, колёса крутят 2 электромотора (536hp суммарно); чисто электрический запас хода 188км.',
})

console.log('\n=== 3. BAIC Taitan 700: реальные hp/engineType/bodyType ===')
fixNode('baic-taitan-700', {
  hp: 532, engineType: 'erev', bodyType: 'suv', zone: 'offroad',
  note: 'Body-on-frame внедорожник (рама + несущий кузов), НЕ пикап. EREV: 1.5Т-генератор + 2 электромотора = 391кВт/532hp суммарно, CATL 49.4кВтч, чисто электрический запас 220км, общий — 1340км.',
})

console.log('\n=== 4. MG GO! Concept: реальный кузов (было suv) ===')
fixNode('mg-go-concept', {
  engineType: 'ev', bodyType: 'hatchback', zone: 'hatchback',
  note: 'Концепт B-класса электрохэтчбека (Goodwood-2026), дизайн отсылает к MGB GT/Metro Turbo/ZR/EX4. Технические характеристики (батарея/мотор/запас хода) компания намеренно не раскрыла — серийная версия ожидается в 2027г.',
})

console.log('\n=== 5. Smart: bodyType + engineType (с учётом разной инженерной базы) ===')
fixNode('smart-roadster',  { bodyType: 'roadster',  engineType: 'i3t' }) // заднемоторная турбо-тройка, как Fortwo
fixNode('smart-forfour-1', { bodyType: 'hatchback', engineType: 'i4' })  // ребейдж Mitsubishi Colt — переднемоторная, другая база
fixNode('smart-fortwo-2',  { bodyType: 'microcar',  engineType: 'i3t' })
fixNode('smart-forfour-2', { bodyType: 'hatchback', engineType: 'i3t' }) // платформа с Renault Twingo 3, та же тройка, что у Fortwo-3
fixNode('smart-1',         { bodyType: 'suv',       engineType: 'ev' })
fixNode('smart-3',         { bodyType: 'suv',       engineType: 'ev' })

console.log('\n=== 6. Seres SF5 + вся линейка AITO: zone="china_ev" → конкретный класс ===')
fixNode('seres-sf5',     { engineType: 'phev', zone: 'suv_compact' })
fixNode('aito-m5',       { zone: 'suv_compact' })
fixNode('aito-m7',       { zone: 'suv_mid' })
fixNode('aito-m7-2023',  { zone: 'suv_mid' })
fixNode('aito-m9',       { zone: 'suv_large' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
