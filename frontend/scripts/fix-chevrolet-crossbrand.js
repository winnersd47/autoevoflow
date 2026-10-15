#!/usr/bin/env node
// Camaro уже был богат кросс-брендовыми связями (Firebird, Mustang,
// CTS-V...) — у Impala/Blazer таких связей не было вообще, хотя реальная
// история этого требует (GM намеренно перепродавал одни и те же кузова
// под разными марками).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== Impala — платформа B-body делилась с Buick/Pontiac ===')
graph.edges.push({ id: 'e-ponbonn57-impala1', source: 'pontiac-bonneville-1957', target: 'chev-impala-1', type: 'shares_platform', strength: 0.85 })
graph.edges.push({ id: 'e-buicklesabre1-impala2', source: 'buick-lesabre-1', target: 'chev-impala-2', type: 'shares_platform', strength: 0.85 })
console.log('  ✅ Pontiac Bonneville (1957) <--shares_platform--> Impala Gen.1')
console.log('  ✅ Buick LeSabre Gen.1 (1959) <--shares_platform--> Impala Gen.2')

console.log('\n=== K5 Blazer — прямой корпоративный близнец GMC Jimmy отсутствовал целиком ===')
if (!byId.has('gmc-jimmy-1')) {
  graph.nodes.push({
    id: 'gmc-jimmy-1', label: 'GMC Jimmy', fullName: 'GMC Jimmy (K5-based)',
    type: 'generation', year: 1970, brandId: 'gmc', brandName: 'GMC',
    modelSlug: 'gmc-jimmy', familyKey: 'gmc-jimmy',
    bodyType: 'suv', segment: 'offroad', zone: 'suv_large',
    hp: 300, engineType: 'v8',
    note: 'Корпоративный близнец K5 Blazer — то же шасси, та же механика, весь модельный ряд движков; отличия только в решётке (сдвоенные фары вместо одинарных) и отделке салона, более "премиальное" позиционирование внутри GM. Выпускался до 1991г. (затем имя перешло на компактный S-15 Jimmy).',
  })
  graph.edges.push({ id: 'e-k5blazer-jimmy', source: 'chev-k5-blazer', target: 'gmc-jimmy-1', type: 'shares_platform', strength: 0.97 })
  console.log('  ✅ K5 Blazer <--shares_platform (0.97, близнецы)--> GMC Jimmy (новый узел)')
} else {
  console.log('  ⚠️  gmc-jimmy-1 уже существует')
}

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
