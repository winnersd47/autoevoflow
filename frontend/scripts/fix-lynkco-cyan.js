#!/usr/bin/env node
// Модификации Lynk & Co: единственная реально значимая — Cyan Racing
// программа для 03 (у остальных 8 моделей нет сопоставимых по значимости
// отдельных performance-версий, только рутинные трим-пакеты — не добавляем).
// Сам граф УЖЕ содержал факт в note базового 03 ("03+ Cyan Racing —
// серийный Нюрбургринг-рекорд"), но без узла/связи — типичный для этой
// сессии паттерн "факт в тексте, но не в структуре графа".
//
// Два РАЗНЫХ автомобиля, не путать (разница в мощности ×2 не баг):
//  - 03 Cyan Concept (2019) — рекордный шоу-кар для Нюрбургринга, FWD,
//    заряженный некомпромиссный трек-мотор, 528hp.
//  - 03+ Cyan (2022) — серийная дорожная версия, AWD, дорожный сертифиц.
//    мотор, 261hp. Совсем другая машина под тем же именем.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return false }
  graph.nodes.push(node); byId.set(node.id, node)
  return true
}

addNode({
  id: 'lynk-co-03-cyan-concept', label: '03 Cyan Concept', fullName: 'Lynk & Co 03 Cyan Concept',
  type: 'generation', year: 2019, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: 'Cyan Concept', modelSlug: 'lynk-co-03-cyan-concept',
  bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 528, engineType: 'i4t', engineCC: 2000, isConcept: true, familyKey: 'lynk-co',
  note: 'Рекордный шоу-кар Cyan Racing — рекорд Нюрбургринга Нордшляйфе среди переднеприводных и среди 4-дверных авто (7:20.143, пилот Тед Бьорк, чемпион WTCC 2017). 2.0Т I4, 528hp/504Нм, разгон 0-100 за 4.4с, максималка 310км/ч. Некомпромиссный трек-мотор — НЕ дорожный сертифицированный.',
})
addNode({
  id: 'lynk-co-03-cyan', label: '03+ Cyan', fullName: 'Lynk & Co 03+ Cyan',
  type: 'generation', year: 2022, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: '03+ Cyan', modelSlug: 'lynk-co-03-cyan',
  bodyType: 'sedan', segment: 'exec', zone: 'sports',
  hp: 261, engineType: 'i4t', engineCC: 2000, isLimited: true, familyKey: 'lynk-co',
  note: 'Серийная дорожная версия — совсем другая машина, чем рекордный Concept 2019г. (261hp против 528hp — дорожный сертифицированный мотор, не трек-спец). AWD (не FWD, как у концепта), 380Нм, 8-АКПП, 250км/ч, 1620кг.',
})

graph.edges.push({ id: 'lco03-to-cyanconcept', source: 'lynk-co-03', target: 'lynk-co-03-cyan-concept', type: 'derived_from', strength: 0.6 })
graph.edges.push({ id: 'lco03-to-cyan', source: 'lynk-co-03', target: 'lynk-co-03-cyan', type: 'variant_of', strength: 0.75 })
graph.edges.push({ id: 'lcocyanconcept-to-cyan', source: 'lynk-co-03-cyan-concept', target: 'lynk-co-03-cyan', type: 'concept_to_production', strength: 0.6 })
console.log('  ✅ lynk-co-03 --[derived_from]--> 03 Cyan Concept')
console.log('  ✅ lynk-co-03 --[variant_of]--> 03+ Cyan')
console.log('  ✅ 03 Cyan Concept --[concept_to_production]--> 03+ Cyan')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
