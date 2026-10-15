#!/usr/bin/env node
// Lynk & Co: в графе было только 01/03/05/08/Z10 из 9 реальных линеек
// бренда. Добавляем недостающие 02/06/07/09 — каждая подключена через
// "inspired" от 01 (та же конвенция, что уже верно стоит у 03/05/08/Z10 —
// это не поколения друг друга, а параллельные модели одного бренда).
// Плюс реальные межбрендовые платформенные связи, аналогичные уже верным
// у Z10 (zeekr-x/zeekr-007 shares_platform).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return false }
  graph.nodes.push(node); byId.set(node.id, node)
  graph.edges.push({ id: `lynk-co-01-inspired-${node.id}`, source: 'lynk-co-01', target: node.id, type: 'inspired', strength: 0.6 })
  console.log(`  ✅ ${node.id} (${node.hp} л.с.) ← inspired ← lynk-co-01`)
  return true
}

addNode({
  id: 'lynk-co-02', label: 'Lynk & Co 02', fullName: 'Lynk & Co 02',
  type: 'generation', year: 2024, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: 'SEA2', modelSlug: 'lynk-co-02',
  bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 272, engineType: 'ev', familyKey: 'lynk-co',
  note: 'Электрический кроссовер-купе на платформе SEA2 (2024, для Европы) — общая архитектура с Zeekr X, smart #1 и Volvo EX30. 445км WLTP, 0-100 за 5.5с. Сменил на этом имени более раннюю (2018) ДВС-версию 02 (та же CMA-база, что у 01/03).',
})
addNode({
  id: 'lynk-co-06', label: 'Lynk & Co 06', fullName: 'Lynk & Co 06',
  type: 'generation', year: 2022, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: 'CMA', modelSlug: 'lynk-co-06',
  bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 181, engineType: 'i3t', engineCC: 1500, familyKey: 'lynk-co',
  note: 'Самый компактный SUV в линейке. 1.5Т турбо-«тройка», 290Нм, 7-ст. DCT; есть и PHEV-версия (187hp суммарно, турбомотор + 80hp э/мотор).',
})
addNode({
  id: 'lynk-co-07', label: 'Lynk & Co 07', fullName: 'Lynk & Co 07 EM-P',
  type: 'generation', year: 2024, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: 'CMA Evo / EM-P', modelSlug: 'lynk-co-07',
  bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 375, engineType: 'phev', engineCC: 1500, familyKey: 'lynk-co',
  note: 'Второй седан бренда (после 03), размер Camry. Базовая EM-P версия — 1.5Т + мотор(ы), суммарно ~280кВт/375hp, 3-ст. DHT. Топовая спецверсия EM-P разгонялась до 585hp, а версия-универсал "07 GT" (2026) — 523hp.',
})
addNode({
  id: 'lynk-co-09', label: 'Lynk & Co 09', fullName: 'Lynk & Co 09',
  type: 'generation', year: 2021, brandId: 'lynk-co', brandName: 'Lynk & Co',
  codeName: 'SPA2', modelSlug: 'lynk-co-09',
  bodyType: 'suv', segment: 'large_suv', zone: 'suv_large',
  hp: 431, engineType: 'phev', engineCC: 2000, familyKey: 'lynk-co',
  note: 'Флагманский 3-рядный SUV (до Z10) — на платформе SPA2, общей со 2-м поколением Volvo XC90 ("удешевлённый XC90" по оценке прессы). 2.0Т, диапазон версий 254hp (MHEV) — 431hp (PHEV) — 512hp (EM-P Voyage Edition), полный привод во всех версиях.',
})

console.log('\n=== Межбрендовые платформенные связи (по аналогии с zeekr-x/zeekr-007 → Z10) ===')
function addPlatformEdge(id, source, target, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для', id); return }
  graph.edges.push({ id, source, target, type: 'shares_platform', strength })
  console.log(`  ✅ ${source} --[shares_platform]--> ${target}`)
}
addPlatformEdge('e-zeekrx-lco02', 'zeekr-x', 'lynk-co-02', 0.85)
addPlatformEdge('e-smart1-lco02', 'smart-1', 'lynk-co-02', 0.8)
addPlatformEdge('e-xc90-2-lco09', 'volvo-xc90-2', 'lynk-co-09', 0.85)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
