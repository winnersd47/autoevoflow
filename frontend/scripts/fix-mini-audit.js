#!/usr/bin/env node
// Mini: структура поколений в целом верная (R50→R56→F56→J01/F66 цепочка ICE,
// R60→F60→EV Countryman, купе/родстер/Paceman правильно прекращены после
// gen2 — реальный факт, BMW их не продолжила в F-поколении). Но данные по
// полям — в плохом состоянии почти на всём бренде:
//  - bodyType отсутствует у 14 из 27 узлов (больше половины бренда).
//  - engineType — на 13 узлах стоит общая заглушка "gasoline" вместо
//    конкретного i4/i4t/i3t (как у остальных узлов этого же бренда).
//  - У всех 3 узлов поколения R56 (Cooper/Cooper S/JCW) — zone="eu"
//    (региональный код) вместо "hatchback" (как у ВСЕХ остальных хэтчбеков
//    Mini) И engineType="ICE" (слишком общее) — похоже, эти 3 узла когда-то
//    добавлялись отдельным/более грубым процессом.
// Структурно не хватает 2 реальных узлов:
//  - Mini Cabrio R57 (2009-2015, gen2) — конвертируемая версия R56-поколения,
//    была купе(R58)/родстер(R59)/Paceman(R61)/Countryman(R60), а кабрио
//    этого поколения в графе не было вообще.
//  - Mini Cooper F66 (2024) — ICE-версия текущего поколения, выпускается
//    ПАРАЛЛЕЛЬНО электрическому J01 (одинаковый дизайн нарочно, чтобы
//    покупатель выбирал только тип силовой установки) — в графе была
//    только EV-ветка (Cooper SE → J01), ICE-ветка обрывалась на F56.
// Источники: auto-data.net, motoringfile.com, bmwblog.com — 2026-10-19.
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
function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  g.nodes.push(node); byId.set(node.id, node)
  console.log(`  ✅ ${node.id} (${node.year}, ${node.hp} л.с.)`)
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}

console.log('=== 1. Добавляем 2 реально пропущенных узла ===')
addNode({
  id: 'mini-cabrio-r57', label: 'Mini Cabrio R57 (2009)',
  type: 'generation', year: 2009, brandId: 'mini', brandName: 'MINI',
  codeName: 'R57', modelSlug: 'mini-cabrio',
  bodyType: 'convertible', segment: 'mainstream', zone: 'open_top',
  hp: 120, engineType: 'i4',
  note: 'Кабрио 2-го поколения (2009-2015) — от базовой 98hp до JCW 211hp (только 2009-10); указан Cooper 1.6 120hp. Единственный кабрио-кузов gen2, которого не было в графе (купе R58/родстер R59/Paceman R61/Countryman R60 уже были).',
})
addNode({
  id: 'mini-cooper-f66', label: 'Mini Cooper F66 (2024)',
  type: 'generation', year: 2024, brandId: 'mini', brandName: 'MINI',
  codeName: 'F66', modelSlug: 'mini-3door',
  bodyType: 'hatchback', segment: 'hot_hatch', zone: 'hatchback',
  hp: 156, engineType: 'i3t',
  note: 'ДВС-версия текущего поколения — платформа FAAR (рестайлинг F56), выпускается НАРОЧНО внешне неотличимой от электрического J01, чтобы покупатель выбирал только тип привода. Cooper C (база) 156hp 1.5 турбо-3; Cooper S 204hp 2.0 турбо-4; JCW 231hp/7-ст. DCT (последний ДВС John Cooper Works). Указана база.',
})
addEdge('e-r56-r57cabrio', 'mini-cooper-r56', 'mini-cabrio-r57', 'variant_of', 0.85)
addEdge('e-f56-f66', 'mini-3door-f56', 'mini-cooper-f66', 'evolves_into', 0.88)

console.log('\n=== 2. R56-трио: чиним zone (было "eu") и engineType (было "ICE") ===')
fixNode('mini-cooper-r56',   { zone: 'hatchback', engineType: 'i4' })  // 1.6 NA
fixNode('mini-cooper-s-r56', { zone: 'hatchback', engineType: 'i4t' }) // 1.6 турбо
fixNode('mini-jcw-r56',      { zone: 'hatchback', engineType: 'i4t' }) // 1.6 турбо, более высокий тюнинг

console.log('\n=== 3. Проставляем отсутствующий bodyType (14 узлов) ===')
fixNode('mini-cooper-orig',      { bodyType: 'hatchback' })
fixNode('mini-classic-mk2',      { bodyType: 'hatchback' })
fixNode('mini-cabrio-r52',       { bodyType: 'convertible' })
fixNode('mini-clubman-r55',      { bodyType: 'estate' })
fixNode('mini-coupe-r58',        { bodyType: 'coupe' })
fixNode('mini-roadster-r59',     { bodyType: 'roadster' })
fixNode('mini-paceman-r61',      { bodyType: 'suv' })
fixNode('mini-3door-f56',        { bodyType: 'hatchback' })
fixNode('mini-5door-f55',        { bodyType: 'hatchback' })
fixNode('mini-cabrio-f57',       { bodyType: 'convertible' })
fixNode('mini-clubman-f54',      { bodyType: 'estate' })
fixNode('mini-jcw-f56',          { bodyType: 'hatchback' })
fixNode('mini-countryman-f60',   { bodyType: 'suv' })
fixNode('mini-cooper-j01',       { bodyType: 'hatchback' })

console.log('\n=== 4. Заменяем общую заглушку engineType ("gasoline"/"electric") на конкретный тип ===')
fixNode('mini-cooper-orig',    { engineType: 'i4' })   // 997cc атмо
fixNode('mini-classic-mk2',    { engineType: 'i4' })
fixNode('mini-cabrio-r52',     { engineType: 'i4' })   // Cooper 1.6 атмо (115hp как у mini-cooper-2001)
fixNode('mini-clubman-r55',    { engineType: 'i4t' })  // 175hp = Cooper S турбо-спек
fixNode('mini-coupe-r58',      { engineType: 'i4t' })  // 211hp = JCW-спек турбо
fixNode('mini-roadster-r59',   { engineType: 'i4t' })  // 211hp = JCW-спек турбо
fixNode('mini-paceman-r61',    { engineType: 'i4t' })  // 218hp = JCW ALL4 турбо
fixNode('mini-3door-f56',      { engineType: 'i3t' })  // 136hp = база Cooper, 1.5 турбо-3
fixNode('mini-5door-f55',      { engineType: 'i3t' })
fixNode('mini-cabrio-f57',     { engineType: 'i3t' })
fixNode('mini-clubman-f54',    { engineType: 'i4t' })  // 231hp = JCW турбо-4
fixNode('mini-jcw-f56',        { engineType: 'i4t' })  // 231hp = JCW турбо-4
fixNode('mini-countryman-f60', { engineType: 'i4t' })  // 224hp = JCW ALL4 турбо-4
fixNode('mini-cooper-j01',     { engineType: 'ev' })   // было "electric" — приводим к доминирующей конвенции графа

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
