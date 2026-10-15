#!/usr/bin/env node
// Гоночные гомологации GT1-GT4/GTE/Cup — новая визуальная категория isRacing
// (пунктирный красный круг, по образцу isLimited, но другим цветом). Дорожные
// омологационные версии (911 GT1 Strassenversion, F1 GTR, CLK-GTR) отмечены
// isLimited ТОЖЕ true, где они реально продавались клиентам малым тиражом —
// isRacing здесь именно про то, что это трековая/гоночная спецификация,
// не обычный дорожный трим.
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

console.log('── GT1 (эра 1990-х — гомологационные монстры) ──')
addNode({ id: 'porsche-911-gt1', label: '911 GT1', fullName: 'Porsche 911 GT1 Straßenversion',
  type: 'generation', year: 1996, brandId: 'porsche', brandName: 'Porsche', codeName: '993 GT1',
  modelSlug: 'porsche-911-gt1', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 600, engineType: 'flat6t', isRacing: true, isLimited: true,
  note: 'Ле-Ман GT1-класс; дорожную версию (Straßenversion) построили всего в 20 экз. для омологации. Победа на Ле-Мане 1998.' })
addEdge('e-p993-gt1', 'p911-993', 'porsche-911-gt1', 'derived_from')

addNode({ id: 'mclaren-f1-gtr', label: 'F1 GTR', fullName: 'McLaren F1 GTR',
  type: 'generation', year: 1995, brandId: 'mclaren', brandName: 'McLaren', codeName: 'F1 GTR',
  modelSlug: 'mclaren-f1', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 600, engineType: 'v12', isRacing: true,
  note: 'GT1-версия F1 — победа на Ле-Мане 1995 с первой попытки, обогнав прототипы.' })
addEdge('e-f1-gtr', 'mclaren-f1', 'mclaren-f1-gtr', 'derived_from')

addNode({ id: 'merc-clk-gtr', label: 'CLK-GTR', fullName: 'Mercedes-Benz CLK-GTR',
  type: 'generation', year: 1997, brandId: 'mercedes', brandName: 'Mercedes-Benz', codeName: 'CLK-GTR',
  modelSlug: 'mercedes-clk-gtr', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 600, engineType: 'v12', isRacing: true, isLimited: true,
  note: 'Построен специально под GT1-омологацию за рекордные 128 дней; дорожная версия — всего 25-26 экз.' })
addEdge('e-clk-gtr', 'merc-clk-w208', 'merc-clk-gtr', 'derived_from')

console.log('\n── Современный GT3 ──')
addNode({ id: 'porsche-911-gt3-r', label: '911 GT3 R', fullName: 'Porsche 911 GT3 R',
  type: 'generation', year: 2019, brandId: 'porsche', brandName: 'Porsche', codeName: '992 GT3 R',
  modelSlug: 'porsche-911-gt3-r', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 565, engineType: 'flat6', isRacing: true,
  note: 'Клиентский GT3-гонщик на базе 911 (992) — IMSA, ADAC GT Masters, множество кузовных серий.' })
addEdge('e-p911-gt3r', 'p911-992', 'porsche-911-gt3-r', 'derived_from')

addNode({ id: 'bmw-m4-gt3', label: 'M4 GT3', fullName: 'BMW M4 GT3',
  type: 'generation', year: 2022, brandId: 'bmw', brandName: 'BMW', codeName: 'G82 GT3',
  modelSlug: 'bmw-m4-gt3', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 590, engineType: 'i6t', isRacing: true,
  note: 'Клиентский GT3 на базе M4 G82 — Nürburgring 24h, IMSA, DTM.' })
addEdge('e-bmw-m4-gt3', 'bmw-m4-g82', 'bmw-m4-gt3', 'derived_from')

addNode({ id: 'chevy-corvette-c8r-gt3', label: 'Corvette Z06 GT3.R', fullName: 'Chevrolet Corvette Z06 GT3.R',
  type: 'generation', year: 2024, brandId: 'chevrolet', brandName: 'Chevrolet', codeName: 'C8 GT3.R',
  modelSlug: 'chevrolet-corvette-c8', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 600, engineType: 'v8', isRacing: true,
  note: 'Первый среднемоторный гоночный Corvette — клиентский GT3 на базе Z06, дебют в IMSA 2024.' })
addEdge('e-corvette-c8-gt3', 'chevy-corvette-c8-z06', 'chevy-corvette-c8r-gt3', 'derived_from')

addNode({ id: 'astonmartin-vantage-gt3', label: 'Vantage GT3', fullName: 'Aston Martin Vantage GT3',
  type: 'generation', year: 2019, brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'Vantage GT3',
  modelSlug: 'astonmartin-vantage-gt3', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 550, engineType: 'v8t', isRacing: true,
  note: 'Клиентский GT3 на базе Vantage — сменил DBR9 (GT1-эра) как флагманский гоночный Aston Martin.' })
addEdge('e-vantage-gt3', 'am-vantage2', 'astonmartin-vantage-gt3', 'derived_from')

addNode({ id: 'audi-r8-lms-gt3', label: 'R8 LMS GT3', fullName: 'Audi R8 LMS GT3',
  type: 'generation', year: 2015, brandId: 'audi', brandName: 'Audi', codeName: 'Typ 4S GT3',
  modelSlug: 'audi-r8-lms', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 585, engineType: 'v10', isRacing: true,
  note: 'Один из самых титулованных клиентских GT3 в мире — Spa 24h, Nürburgring 24h, Bathurst 12h.' })
addEdge('e-r8-lms-gt3', 'audi-r8-typ4s', 'audi-r8-lms-gt3', 'derived_from')

console.log('\n── GT4 (младший клиентский класс) ──')
addNode({ id: 'porsche-718-cayman-gt4-rs-clubsport', label: 'Cayman GT4 RS CS', fullName: 'Porsche 718 Cayman GT4 RS Clubsport',
  type: 'generation', year: 2022, brandId: 'porsche', brandName: 'Porsche', codeName: '982 GT4 RS Clubsport',
  modelSlug: 'porsche-cayman', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 500, engineType: 'flat6', isRacing: true,
  note: 'GT4-класс — доступный клиентский гонщик, входная ступень в кузовной гонки Porsche.' })
addEdge('e-cayman-gt4rs-cs', 'porsche-cay-718', 'porsche-718-cayman-gt4-rs-clubsport', 'derived_from')

console.log(`\nTotal: ${g.nodes.length} nodes, ${g.edges.length} edges`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
