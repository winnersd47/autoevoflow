#!/usr/bin/env node
// Cadillac V-Series.R (2023, GTP/Hypercar-класс, IMSA/WEC) + V-ONE Concept (2026,
// одноместный трек-концепт на его шасси). НЕ связаны с седанами CTS/CT4/CT5 —
// общее только имя V-Series (перформанс-суббренд). Добавлены после того, как
// скраперный пост про V-ONE Concept ошибочно матчился на CTS Gen.1 через
// getGraphContext() — токен "cadillac" совпадал со ВСЕМИ нодами бренда сразу
// (см. фикс в publish-new-stories.js). Здесь — сами реальные данные машины.
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

addNode({
  id: 'cadillac-v-series-r', label: 'V-Series.R', fullName: 'Cadillac V-Series.R',
  type: 'generation', year: 2023, brandId: 'cadillac', brandName: 'Cadillac',
  codeName: 'Project GTP Hypercar / V-LMDh / V-Series.R', modelSlug: 'cadillac-v-series-r',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 671, engineType: 'v8h', isRacing: true,
  note: 'Прототип класса GTP (IMSA) / Hypercar (WEC) на шасси Dallara. Анонсирован в 2022 как "Project GTP Hypercar", кратко именовался V-LMDh, с марта 2023 официальное имя V-Series.R. Атмосферный гибридный V8 5.5л. Не связан с седанами CTS/CT4/CT5 — только общий бренд V-Series.',
})

addNode({
  id: 'cadillac-v-one-concept', label: 'V-ONE Concept', fullName: 'Cadillac V-ONE Concept',
  type: 'generation', year: 2026, brandId: 'cadillac', brandName: 'Cadillac',
  codeName: 'V-ONE', modelSlug: 'cadillac-v-one-concept',
  bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 830, engineType: 'v8h', isConcept: true,
  note: 'Одноместный трековый концепт (не street-legal), представлен 14 августа 2026 на The Quail (Monterey Car Week). Наследует шасси, подвеску, трансмиссию и электронику гоночного V-Series.R — без регламентных ограничений гибридный буст даёт 830 л.с. (у гонщика — 671). Официально без обязательств по производству. Имя = V-Series + "One", НЕ связано с CTS/CT4/CT5.',
})

addEdge('e-v-one-from-vseriesr', 'cadillac-v-series-r', 'cadillac-v-one-concept', 'derived_from')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
