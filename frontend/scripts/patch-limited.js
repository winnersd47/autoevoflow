#!/usr/bin/env node
/**
 * patch-limited.js — помечает эксклюзивные модели ограниченной серии
 * как isLimited:true в graph.json.
 *
 * Критерии включения: производство ≤ ~2000 единиц, является
 * коллекционным/гомологационным/специальным вариантом бренда.
 * Запуск: node scripts/patch-limited.js
 */

const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')

// Список id нод, которые нужно пометить isLimited: true
const LIMITED_IDS = new Set([
  // Ferrari — специальные серии
  'ferrari-288gto',      // 272 шт.
  'ferrari-f40',         // 1315 шт.
  'ferrari-f50',         // 349 шт.
  'ferrari-enzo',        // 400 шт.
  'ferrari-lafer',       // 499 шт.
  'ferrari-lafer-aperta',// 210 шт.

  // McLaren
  'mclaren-f1',          // 106 шт.
  'mclaren-p1',          // 375 шт.
  'mclaren-p1-gtr',      // 58 шт. (track variant)
  'mclaren-speedtail',   // 106 шт.
  'mclaren-senna',       // 500 шт.
  'mclaren-senna-gtr',   // 75 шт.
  'mclaren-w1',          // 399 шт.
  'mclaren-elva',        // 399 шт.

  // Lamborghini
  'lambo-sesto',         // 20 шт.
  'lambo-veneno',        // 5 шт.
  'lambo-ultimae',       // 600 шт.
  'lambo-centenario',    // 40 шт.

  // Pagani
  'pagani-huayra-bc',    // 20 шт.
  'pagani-zonda-r',      // 15 шт.
  'pagani-utopia',       // 99 шт.

  // Porsche
  'porsche-cgt',         // 1270 шт. (Carrera GT)
  'porsche-918',         // 918 шт.

  // Bugatti
  'bugatti-eb110',       // 139 шт.
  'bugatti-veyron-ss',   // 30 шт.
  'bugatti-chiron-ss',   // 30 шт.
  'bugatti-lavnoire', // 1 шт.

  // Koenigsegg
  'kgsegg-cc8s',             // 6 шт.
  'kgsegg-ccr',              // 14 шт.
  'kgsegg-ccx',              // 29 шт.
  'kgsegg-agera-r',          // 18 шт.
  'kgsegg-one1',        // 3 шт.
  'kgsegg-regera',           // 80 шт.
  'kgsegg-jesko',            // 125 шт.
  'kgsegg-jesko-a',        // 125 шт.
  'kgsegg-gemera',           // 300 шт.

  // Toyota/Lexus
  'lexus-lfa-xf10',      // 500 шт.

  // BMW
  'bmw-m1-road',          // 456 шт.
  'bmw-m3-gts-e92',      // 135 шт.

  // Aston Martin
  'am-one77',            // 77 шт.
  'am-vulcan',           // 24 шт.
  'am-valkyrie',         // 150 шт.
])

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))
let marked = 0, notFound = []

g.nodes = g.nodes.map(n => {
  if (LIMITED_IDS.has(n.id)) { marked++; return { ...n, isLimited: true } }
  // Убираем устаревший флаг, если не в списке (clean slate)
  if (n.isLimited) { const { isLimited, ...rest } = n; return rest }
  return n
})

// Отмечаем те, что не нашлись в графе
LIMITED_IDS.forEach(id => {
  if (!g.nodes.find(n => n.id === id)) notFound.push(id)
})

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
console.log(`✅ Помечено isLimited:true: ${marked} нод`)
if (notFound.length) console.log(`⚠ Не найдено в графе (${notFound.length}): ${notFound.join(', ')}`)
