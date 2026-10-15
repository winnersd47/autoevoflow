#!/usr/bin/env node
// В графе была только одна гоночная запись Focus — WRC (1999-2010,
// подключена от Mk1). Но у Focus есть ещё 2 отдельные, значимые гоночные
// программы, которых не было вообще:
//  - Focus RS RX — заводской ралликросс M-Sport/Ford Performance с Кеном
//    Блоком (Hoonigan), дебют FIA World RX 2016, база — шасси RS Mk3.
//  - Focus BTCC (NGTC) — кузовные гонки, с 2009г. по сегодня (NAPA Racing UK
//    с 2022г., 36 побед/6 титулов) — самая долгоиграющая и текущая
//    (!) гоночная программа Focus, отсутствовала полностью.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node, parentId, edgeType, strength) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует, пропуск:', node.id); return }
  graph.nodes.push(node)
  byId.set(node.id, node)
  graph.edges.push({ id: `${parentId}-to-${node.id}`, source: parentId, target: node.id, type: edgeType, strength })
  console.log(`  ✅ ${node.id} (${node.hp} л.с.) ← ${edgeType} ← ${parentId}`)
}

addNode({
  id: 'ford-focus-rs-rx', label: 'Focus RS RX', fullName: 'Ford Focus RS RX',
  type: 'generation', year: 2016, brandId: 'ford', brandName: 'Ford',
  codeName: 'RS RX', modelSlug: 'ford-focus-rs-rx',
  bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 600, engineType: 'i4t', isRacing: true,
  note: 'Заводской ралликросс-кар M-Sport/Ford Performance для Hoonigan Racing Кена Блока — дебют в FIA World Rallycross Championship 2016. База — шасси RS Mk3. 2.0L турбо I4 (Garrett), 600hp, полный привод (Sadev), 5-ст. секвентальная КПП, подвеска Reiger. 0-60 за 1.9с — быстрее машины Формулы-1.',
}, 'ford-focus-rs', 'derived_from', 0.6)

addNode({
  id: 'ford-focus-btcc', label: 'Focus BTCC', fullName: 'Ford Focus BTCC (NGTC)',
  type: 'generation', year: 2009, brandId: 'ford', brandName: 'Ford',
  codeName: 'NGTC', modelSlug: 'ford-focus-btcc',
  bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 350, engineType: 'i4t', isRacing: true,
  note: 'Силуэтный кузовной гонщик по регламенту NGTC (общий для всех марок BTCC: 2.0Т I4 350+hp, 6-ст. секвентальная КПП) — не гражданский двигатель. Дебют в BTCC — 2009 (Arena Motorsport), первая победа на LPG-топливе в Brands Hatch. Кузов менялся вместе с дорожным Focus (Mk3 у Arena/Motorbase → Mk4 у Motorbase 2020-21, затем NAPA Racing UK с 2022г.). NAPA Racing UK — 36 побед и 6 титулов с 2022г., самая долгоиграющая и ДЕЙСТВУЮЩАЯ гоночная программа Focus (в отличие от WRC, завершившейся в 2010).',
}, 'ford-focus-3', 'derived_from', 0.6)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
