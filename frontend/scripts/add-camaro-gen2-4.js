'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

const N = obj => obj
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newNodes = [
  // ── Camaro Gen.2 (1970) — F-Body 2nd gen, Camaro SS 454 ─────────────────
  N({ id:'chevy-camaro-gen2', label:'Camaro Gen.2 (1970)', year:1970,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'camaro-gen2', familyKey:'camaro',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:360, engineType:'v8', codeName:'F-Body 2nd gen' }),

  // ── Camaro Gen.3 (1982) — F-Body 3rd gen, Camaro Z28 ────────────────────
  N({ id:'chevy-camaro-gen3', label:'Camaro Gen.3 (1982)', year:1982,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'camaro-gen3', familyKey:'camaro',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:228, engineType:'v8', codeName:'F-Body 3rd gen' }),

  // ── Camaro Gen.4 (1993) — F-Body 4th gen, последнее поколение перед паузой
  N({ id:'chevy-camaro-gen4', label:'Camaro Gen.4 (1993)', year:1993,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'camaro-gen4', familyKey:'camaro',
      type:'generation', bodyType:'coupe', segment:'muscle', zone:'muscle',
      hp:275, engineType:'v8', codeName:'F-Body 4th gen' }),
]

const newEdges = [
  // Полная цепочка эволюции
  E('camaro-g1-g2',   'chevy-camaro-gen1', 'chevy-camaro-gen2', 'evolves_into'),
  E('camaro-g2-g3',   'chevy-camaro-gen2', 'chevy-camaro-gen3', 'evolves_into'),
  E('camaro-g3-g4',   'chevy-camaro-gen3', 'chevy-camaro-gen4', 'evolves_into'),
  // Gen.4 → Gen.5 (возрождение через 10 лет)
  E('camaro-g4-g5',   'chevy-camaro-gen4', 'chevy-camaro-gen5', 'inspired_by', 0.92),
  // Firebird Trans Am — Gen.3/4 были F-Body братьями-близнецами
  E('camaro-g3-firebird', 'chevy-camaro-gen3', 'pontiac-firebird', 'shares_platform', 0.98),
]

// Удаляем устаревший jump-edge Gen1 → Gen5 (заменяем цепочкой)
const oldEdgeIdx = g.edges.findIndex(e => e.id === 'camaro-g1-g5')
if (oldEdgeIdx !== -1) {
  g.edges.splice(oldEdgeIdx, 1)
  console.log('  REMOVED stale edge camaro-g1-g5 (replaced by chain)')
}

let addedN = 0, addedE = 0, skipN = 0, skipE = 0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n => n.id === e.source)
    const t = g.nodes.find(n => n.id === e.target)
    if (!s) { console.log('  SKIP edge ' + e.id + ': нет source ' + e.source); skipE++; continue }
    if (!t) { console.log('  SKIP edge ' + e.id + ': нет target ' + e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Camaro Gen.2-4: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
