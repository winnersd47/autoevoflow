#!/usr/bin/env node
// Точечная правка по итогам разбора связей Challenger:
//  1. У S.Stock и Demon 170 в codeName потерялся префикс "LC", который есть у
//     '08/Hellcat/Demon — платформа не менялась (в отличие от Charger, у
//     которого реально был переход LX->LD), это просто пропуск при вводе.
//  2. У "Challenger '08" note ошибочно говорит "LX-платформа" при том, что
//     codeName верно указывает LC (LC — двухдверная производная от LX,
//     используется только для Challenger).
//  3. Реальный фейслифт 2015 года (новые фары/бампера, тогда же дебютировал
//     Hellcat) отсутствовал как отдельный узел — Hellcat/Demon/S.Stock/Demon170
//     висели variant_of прямо на до-фейслифтовом '08, хотя технически все они
//     построены на ПОСЛЕфейслифтовом кузове. Добавляем facelifted_to-узел по
//     тому же паттерну, что уже есть у merc-sl-r129 -> merc-sl-r129-fl.
//  4. Добавляем недостающий Challenger Hellcat Redeye (2019, 797 л.с.) —
//     тот же пробел, что раньше нашли и закрыли на стороне Charger.
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return }
  if (g.edges.some(e => e.id === id)) { console.log(`SKIP edge (exists): ${id}`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}
const retargetSource = (edgeId, newSource) => {
  const e = g.edges.find(x => x.id === edgeId)
  const old = e.source
  e.source = newSource
  console.log(`RETARGET ${edgeId}: source ${byId[old].label} -> ${byId[newSource].label}`)
}

console.log('── 1-2. Коды и заметка ──')
byId['dodge-challenger-srt-super-stock'].codeName = 'LC SRT Super Stock'
console.log('FIX  dodge-challenger-srt-super-stock: codeName -> "LC SRT Super Stock"')
byId['dodge-challenger-srt-demon-170'].codeName = 'LC SRT Demon 170'
console.log('FIX  dodge-challenger-srt-demon-170: codeName -> "LC SRT Demon 170"')
byId['dodge-challenger-gen3'].note = "Ретро-возрождение 1970 дизайна; LC-платформа (купе-производная LX); SRT8 = 425 л.с."
console.log('FIX  dodge-challenger-gen3: note исправлен на LC-платформу')

console.log('\n── 3. Фейслифт 2015 (тот же паттерн, что merc-sl-r129 -> -fl) ──')
addNode({
  id: 'dodge-challenger-gen3-fl', label: "Challenger '15", fullName: 'Dodge Challenger (facelift)',
  type: 'generation', year: 2015,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LC Challenger II',
  modelSlug: 'dodge-challenger', bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
  hp: 375, engineType: 'v8', engineCC: 5654,
  note: 'Фейслифт: новые фары/бампера, обновлённый салон — та же LC-платформа; в этом же году дебютировал Hellcat.',
})
addEdge('e-challenger08-fl15', 'dodge-challenger-gen3', 'dodge-challenger-gen3-fl', 'facelifted_to')
retargetSource('challenger-gen3-hellcat', 'dodge-challenger-gen3-fl')

console.log('\n── 4. Challenger Hellcat Redeye (2019) — тот же пробел, что был у Charger ──')
addNode({
  id: 'dodge-challenger-srt-hellcat-redeye', label: 'Challenger Hellcat Redeye', fullName: 'Dodge Challenger SRT Hellcat Redeye',
  type: 'generation', year: 2019,
  brandId: 'dodge', brandName: 'Dodge', codeName: 'LC Hellcat Redeye',
  modelSlug: 'dodge-challenger-srt', bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 797, engineType: 'v8s', engineCC: 6162,
  note: 'Тот же 6.2L supercharged HEMI и 797 л.с., что у Charger Hellcat Redeye — на год раньше седана.',
})
addEdge('e-challenger-hellcat-redeye', 'dodge-challenger-srt-hellcat', 'dodge-challenger-srt-hellcat-redeye', 'variant_of')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
