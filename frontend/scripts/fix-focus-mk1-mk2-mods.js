#!/usr/bin/env node
// Focus Mk1 (C170, 1998) и Mk2 (C307, 2004) не имели НИ ОДНОЙ модификации в
// графе (variant_of), хотя обе реально существовали и были важными для
// истории бренда хот-хэтчами. Mk3/Mk4 уже покрыты (ST/RS Mk3 в графе,
// ST Mk4 добавлен только что). Добавляем недостающие 5 узлов.
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

console.log('=== Focus Mk1 (C170, 2002) — RS и ST170 ===')
addNode({
  id: 'ford-focus-rs-1', label: 'Focus RS', fullName: 'Ford Focus RS Mk1',
  type: 'generation', year: 2002, brandId: 'ford', brandName: 'Ford',
  codeName: 'C170 RS', modelSlug: 'ford-focus-rs-1',
  bodyType: 'hatchback', segment: 'mainstream', zone: 'sports',
  hp: 212, engineType: 'i4t', familyKey: 'ford-focus',
  note: 'Первый Focus RS. 1988cc турбо I4 — форсированный Zetec, разработан совместно с Tickford Engineering (не Cosworth, вопреки расхожему мнению). 310Нм/229lb-ft, 0-60 за 5.9с, 143mph. Всего 4501 экз., 2002-2003, £19995 на старте.',
}, 'ford-focus-1', 'variant_of', 0.8)
addNode({
  id: 'ford-focus-st170-1', label: 'Focus ST170', fullName: 'Ford Focus ST170 (SVT Focus в Северной Америке)',
  type: 'generation', year: 2002, brandId: 'ford', brandName: 'Ford',
  codeName: 'C170 ST170', modelSlug: 'ford-focus-st170-1',
  bodyType: 'hatchback', segment: 'mainstream', zone: 'sports',
  hp: 170, engineType: 'i4', familyKey: 'ford-focus',
  note: 'Средний по мощности хот-хэтч между обычным Focus и RS — атмосферный (не турбо) 2.0L I4 DOHC, 196Нм/145lb-ft, 6-МКПП. В Северной Америке продавался под именем "SVT Focus".',
}, 'ford-focus-1', 'variant_of', 0.75)

console.log('\n=== Focus Mk2 (C307) — ST (2005) и RS/RS500 (2009-2010) ===')
addNode({
  id: 'ford-focus-st-2', label: 'Focus ST', fullName: 'Ford Focus ST Mk2',
  type: 'generation', year: 2005, brandId: 'ford', brandName: 'Ford',
  codeName: 'C307 ST', modelSlug: 'ford-focus-st-2',
  bodyType: 'hatchback', segment: 'mainstream', zone: 'sports',
  hp: 225, engineType: 'i4t', familyKey: 'ford-focus',
  note: '2.5L турбо I5 (та же архитектура, что у Volvo), 320Нм/236lb-ft, 6-МКПП, 0-62 за 6.8с, 150mph.',
}, 'ford-focus-2', 'variant_of', 0.8)
addNode({
  id: 'ford-focus-rs-2', label: 'Focus RS', fullName: 'Ford Focus RS Mk2',
  type: 'generation', year: 2009, brandId: 'ford', brandName: 'Ford',
  codeName: 'C307 RS', modelSlug: 'ford-focus-rs-2',
  bodyType: 'hatchback', segment: 'mainstream', zone: 'sports',
  hp: 305, engineType: 'i4t', familyKey: 'ford-focus',
  note: 'Возвращение RS впервые с 2003г. 2.5L турбо I5 RevoKnuckle-подвеска (борьба с torque steer), 440Нм/325lb-ft, 6-МКПП.',
}, 'ford-focus-2', 'variant_of', 0.8)
addNode({
  id: 'ford-focus-rs500', label: 'Focus RS500', fullName: 'Ford Focus RS500',
  type: 'generation', year: 2010, brandId: 'ford', brandName: 'Ford',
  codeName: 'C307 RS500', modelSlug: 'ford-focus-rs500',
  bodyType: 'hatchback', segment: 'mainstream', zone: 'sports',
  hp: 350, engineType: 'i4t', isLimited: true, familyKey: 'ford-focus',
  note: 'Лимитированная версия RS Mk2 — больше интеркулер и воздухозаборник, толще выхлоп, перепрошивка ЭБУ. Всего 500 экз. в мире (101 — в Великобритании, разобраны за неделю по £33750).',
}, 'ford-focus-rs-2', 'variant_of', 0.7)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
