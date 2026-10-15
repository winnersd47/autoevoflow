#!/usr/bin/env node
// Модификации и гоночные для Daihatsu (Charade/Terios/Copen кластер).
// Реально нашлось только у Charade — Terios и Copen не имеют сопоставимых
// по значимости отдельных performance/racing версий (не добавляем рутину).
// Проверено: Dakar-программа Daihatsu Rocky/Terios — источники не дают
// конкретных подтверждённых результатов (только общие факты о моделях),
// поэтому НЕ добавляем — не выдумываем цифры без реального подтверждения.
//
// Два РАЗНЫХ автомобиля под брендом De Tomaso, не путать:
//  - Charade De Tomaso Turbo (1983-87) — серийная дорожная спецверсия,
//    80hp, лицензионный body-kit De Tomaso.
//  - Charade 926R De Tomaso (1985) — несостоявшийся прототип для Group B
//    (класс B/9), заднемоторный/заднеприводный, 120hp — НИКОГДА не гонялся,
//    проект закрыт после запрета Group B в 1986г.
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

addNode({
  id: 'daihatsu-charade-detomaso', label: 'Charade De Tomaso Turbo', fullName: 'Daihatsu Charade De Tomaso Turbo',
  type: 'generation', year: 1983, brandId: 'daihatsu', brandName: 'Daihatsu',
  codeName: 'De Tomaso Turbo', modelSlug: 'daihatsu-charade-detomaso',
  bodyType: 'hatchback', segment: 'subcompact', zone: 'sports',
  hp: 80, engineType: 'i3t', engineCC: 1000, isLimited: true, familyKey: 'daihatsu-charade',
  note: 'Серийная спецверсия — лицензионный аэродинамический body-kit от Алехандро Де Томазо (интегрированный передний спойлер, пороги, двойной выхлоп, задний спойлер вокруг хэтча). 1.0Т I3, 80PS/87lb-ft, 5-МКПП, ~690кг. Была и более редкая версия "De Tomaso Bianca" — 600 экз., бело-серая расцветка.',
}, 'daihatsu-charade-2', 'variant_of', 0.7)

addNode({
  id: 'daihatsu-charade-926r', label: 'Charade 926R', fullName: 'Daihatsu Charade 926R De Tomaso (прототип Group B)',
  type: 'generation', year: 1985, brandId: 'daihatsu', brandName: 'Daihatsu',
  codeName: '926R', modelSlug: 'daihatsu-charade-926r',
  bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 120, engineType: 'i3t', engineCC: 926, isConcept: true, familyKey: 'daihatsu-charade',
  note: 'НИКОГДА не гонялся и не пошёл в серию. Заднемоторный/заднеприводный прототип (необычно для Daihatsu) под самый малообъёмный класс Group B — B/9. Турбо 926cc I3 DOHC 12V, 120PS, широкие "блистерные" арки, мех. блокировка диффа, ~800кг. Показан на Tokyo Motor Show 1985. Для омологации Group A требовалось 5000 серийных экземпляров — проект закрыт после запрета Group B в 1986г.',
}, 'daihatsu-charade-2', 'derived_from', 0.55)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
