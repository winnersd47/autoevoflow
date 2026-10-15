#!/usr/bin/env node
// Аудит модификаций и гоночных версий Impala/Malibu/Blazer/Camaro.
// Camaro SS/ZL1/Z28 уже были покрыты ранее — здесь только реально
// недостающее: две NASCAR-программы (Impala, Malibu — обе чемпионские!),
// уличная TrailBlazer SS и текущая клиентская гонка Camaro GT4.R + Camaro
// ZL1 в NASCAR Cup 2018-21.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node, parentId, edgeType, strength) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  graph.nodes.push(node); byId.set(node.id, node)
  graph.edges.push({ id: `${parentId}-to-${node.id}`, source: parentId, target: node.id, type: edgeType, strength })
  console.log(`  ✅ ${node.id} (${node.hp} л.с.) ← ${edgeType} ← ${parentId}`)
}

console.log('=== Impala NASCAR (2007-2012) — чемпион 5 лет подряд ===')
addNode({
  id: 'chev-impala-nascar', label: 'Impala SS NASCAR', fullName: 'Chevrolet Impala SS NASCAR (Car of Tomorrow)',
  type: 'generation', year: 2007, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'COT', modelSlug: 'chev-impala-nascar',
  bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 850, engineType: 'v8', engineCC: 5900, isRacing: true, familyKey: 'chev-impala',
  note: 'Кузов NASCAR Nextel/Sprint Cup 2007-2012 ("Car of Tomorrow"). 358ci (5.9L) V8 GM HMS SB-2, 850hp. Выиграла чемпионат ВСЕ 5 лет использования: Джимми Джонсон (Hendrick Motorsports) — 2007-2010 подряд, Тони Стюарт — 2011. В дебютный 2007г. — 26 побед за 36-гоночный сезон, рекорд современной эры NASCAR. Сменена Chevrolet SS в 2013г.',
}, 'chev-impala-9', 'derived_from', 0.6)

console.log('\n=== TrailBlazer SS (2006-2009) — "доступный Corvette для всей семьи" ===')
addNode({
  id: 'chev-trailblazer-ss', label: 'TrailBlazer SS', fullName: 'Chevrolet TrailBlazer SS',
  type: 'generation', year: 2006, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'SS', modelSlug: 'chev-trailblazer-ss',
  bodyType: 'suv', segment: 'exec', zone: 'suv_large',
  hp: 395, engineType: 'v8', engineCC: 6000, familyKey: 'chev-blazer',
  note: 'LS2 6.0L V8 (тот же, что в Corvette C6/Camaro SS того времени) — 395hp (2006), 390hp (2007+, более строгий выхлоп), 400lb-ft, задний/полный привод, 4-АКПП. Культовая "доступная Corvette, в которую влезет вся семья" — самый мощный серийный внедорожник GM своего времени.',
}, 'chev-trailblazer', 'variant_of', 0.7)

console.log('\n=== Camaro GT4.R — действующая клиентская гонка (IMSA/Pirelli World Challenge) ===')
addNode({
  id: 'chevy-camaro-gt4r', label: 'Camaro GT4.R', fullName: 'Chevrolet Camaro GT4.R',
  type: 'generation', year: 2017, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'GT4.R', modelSlug: 'chevy-camaro-gt4r',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 480, engineType: 'v8', engineCC: 6200, isRacing: true, familyKey: 'camaro',
  note: 'Клиентский гоночный автомобиль класса GT4, построен Pratt & Miller. LT1 6.2L V8 (сухой картер), до 480hp, 6-ст. секвентальная Xtrac, Öhlins, Brembo. Действующая программа — IMSA Michelin Pilot Challenge / Pirelli World Challenge. Сменила гоночный Camaro Z/28.R поколения Gen.5. ~$259000.',
}, 'chevy-camaro-gen6', 'derived_from', 0.6)

console.log('\n=== Camaro ZL1 NASCAR (2018-2021) ===')
addNode({
  id: 'chevy-camaro-zl1-nascar', label: 'Camaro ZL1 NASCAR', fullName: 'Chevrolet Camaro ZL1 NASCAR Cup',
  type: 'generation', year: 2018, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'Gen6 Cup', modelSlug: 'chevy-camaro-zl1-nascar',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 750, engineType: 'v8', engineCC: 5800, isRacing: true, familyKey: 'camaro',
  note: 'Кузов NASCAR Cup Series 2018-2021 (правила поколения Gen6) — сменила Chevrolet SS. Дебют на Дайтоне, февраль 2018. 358ci (5.8L) V8, 750hp, 0-60 за 2.7с (на овале). С введением единого шасси Next Gen (2022) отдельный по маркам кузов Camaro в Cup ушёл.',
}, 'chevy-camaro-zl1', 'derived_from', 0.6)

console.log('\n=== Malibu NASCAR (1973-1983) — чемпионская машина Кейла Йборо ===')
addNode({
  id: 'chev-malibu-nascar', label: 'Malibu NASCAR', fullName: 'Chevrolet Malibu NASCAR',
  type: 'generation', year: 1973, brandId: 'chevrolet', brandName: 'Chevrolet',
  codeName: 'Winston Cup', modelSlug: 'chev-malibu-nascar',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 530, engineType: 'v8', engineCC: 5900, isRacing: true, familyKey: 'chev-malibu',
  note: 'Кузов NASCAR Winston Cup 1973-1983 (сменён Monte Carlo). 25 побед за 1973-77гг., чемпионская машина Кейла Йборо 1977г. (команда Junior Johnson). ~530hp — типичная цифра для стандартного 350-358ci small-block той эры (топ-команды выжимали до 560-570hp); точные заводские цифры конкретно для этого шасси не публиковались.',
}, 'chev-malibu-3', 'derived_from', 0.55)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
