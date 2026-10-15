'use strict'
/**
 * add-platform-fills.js — заполняет исторические пробелы платформенных связей:
 *  • Mitsubishi Galant Gen.6/7 — основа Eclipse 2G и Chrysler Sebring
 *  • Renault R12 / Twingo — исток Dacia 1300, иконика
 *  • Peugeot 504 / 405 — Car of the Year, важные исторические модели
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))
const N = obj => obj
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newNodes = [
  // ══ MITSUBISHI GALANT ═════════════════════════════════════════════════════

  // ── Galant Gen.6 (1987) — основа Eclipse 1G и Chrysler Laser ─────────────
  N({ id:'mitsubishi-galant-6', label:'Mitsubishi Galant Gen.6 (1987)', year:1987,
      brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-galant-6', familyKey:'mitsubishi-galant',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:145, engineType:'i4t', codeName:'E30A / GSX' }),

  // ── Galant Gen.7 (1992) — DSM II, Eclipse 2G / Chrysler Sebring ──────────
  N({ id:'mitsubishi-galant-7', label:'Mitsubishi Galant Gen.7 (1992)', year:1992,
      brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-galant-7', familyKey:'mitsubishi-galant',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:155, engineType:'i4t', codeName:'E50A / VR-4' }),

  // ── Galant Gen.8 (1996) — последнее поколение VR-4 ───────────────────────
  N({ id:'mitsubishi-galant-8', label:'Mitsubishi Galant Gen.8 (1996)', year:1996,
      brandId:'mitsubishi', brandName:'Mitsubishi', modelSlug:'mitsubishi-galant-8', familyKey:'mitsubishi-galant',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:245, engineType:'v6', codeName:'EA1A / VR-4' }),

  // ══ RENAULT ═══════════════════════════════════════════════════════════════

  // ── Renault R12 (1969) — основа Dacia 1300, продавался до 1980 ───────────
  N({ id:'renault-r12', label:'Renault R12 (1969)', year:1969,
      brandId:'renault', brandName:'Renault', modelSlug:'renault-r12', familyKey:'renault-r12',
      type:'generation', bodyType:'sedan', segment:'compact', zone:'midsize_sed',
      hp:54, engineType:'i4', codeName:'Gordini' }),

  // ── Renault Twingo Gen.1 (1992) — революция малого класса ────────────────
  N({ id:'renault-twingo-1', label:'Renault Twingo Gen.1 (1992)', year:1992,
      brandId:'renault', brandName:'Renault', modelSlug:'renault-twingo', familyKey:'renault-twingo',
      type:'generation', bodyType:'hatchback', segment:'micro', zone:'hatchback',
      hp:60, engineType:'i4', codeName:'X06 / RS' }),

  // ── Renault R5 Gen.1 (1972) — предок Clio ────────────────────────────────
  N({ id:'renault-r5-1', label:'Renault R5 Gen.1 (1972)', year:1972,
      brandId:'renault', brandName:'Renault', modelSlug:'renault-r5', familyKey:'renault-r5',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:93, engineType:'i4t', codeName:'Turbo 2' }),

  // ══ PEUGEOT ═══════════════════════════════════════════════════════════════

  // ── Peugeot 504 (1968) — Car of the Year 1969, производился до 2006 (Нигерия)
  N({ id:'peugeot-504', label:'Peugeot 504 (1968)', year:1968,
      brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-504', familyKey:'peugeot-504',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:75, engineType:'i4', codeName:'Ti / Coupé / Cabriolet' }),

  // ── Peugeot 405 (1987) — Car of the Year 1988 ────────────────────────────
  N({ id:'peugeot-405', label:'Peugeot 405 (1987)', year:1987,
      brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-405', familyKey:'peugeot-405',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:160, engineType:'i4t', codeName:'Mi16 / T16 Pikes Peak' }),

  // ── Peugeot 406 (1995) — предшественник 407 ──────────────────────────────
  N({ id:'peugeot-406', label:'Peugeot 406 (1995)', year:1995,
      brandId:'peugeot', brandName:'Peugeot', modelSlug:'peugeot-406', familyKey:'peugeot-406',
      type:'generation', bodyType:'sedan', segment:'midsize', zone:'midsize_sed',
      hp:190, engineType:'i4t', codeName:'Coupé V6 / 406 Pack' }),
]

const newEdges = [
  // ── Mitsubishi Galant ──────────────────────────────────────────────────────
  E('e-mit-gal6-gal7',  'mitsubishi-galant-6', 'mitsubishi-galant-7', 'evolves_into'),
  E('e-mit-gal7-gal8',  'mitsubishi-galant-7', 'mitsubishi-galant-8', 'evolves_into'),
  // Galant Gen.6 → Eclipse 1G (DSM — одна платформа)
  E('e-mit-gal6-ecl1',  'mitsubishi-galant-6', 'mit-eclipse-1',       'derived_from', 0.90),
  // Galant Gen.7 → Eclipse 2G (DSM платформа)
  E('e-mit-gal7-ecl2',  'mitsubishi-galant-7', 'mit-eclipse-2',       'derived_from', 0.90),
  // Galant Gen.7 / Eclipse 2G → Chrysler Sebring (одна платформа, завод DSM)
  E('e-chr-seb-ecl2',   'chrysler-sebring-1',  'mit-eclipse-2',       'shares_platform', 0.92),

  // ── Renault ────────────────────────────────────────────────────────────────
  // R12 → Dacia 1300 (лицензия 1969)
  E('e-ren-r12-dac',    'renault-r12',         'dacia-1300',          'derived_from', 0.95),
  // R5 → Clio Gen.1 (духовный предок)
  E('e-ren-r5-clio1',   'renault-r5-1',        'ren-clio-1',          'inspired_by', 0.80),
  // Twingo — параллельный суперкомпакт рядом с Clio
  E('e-ren-clio1-twi',  'ren-clio-1',          'renault-twingo-1',    'inspired_by', 0.60),

  // ── Peugeot ────────────────────────────────────────────────────────────────
  // 504 → 405 (эволюция среднего класса)
  E('e-peu-504-405',    'peugeot-504',         'peugeot-405',         'inspired_by', 0.65),
  // 405 → 406 → 407 (прямая эволюция D-сегмента)
  E('e-peu-405-406',    'peugeot-405',         'peugeot-406',         'evolves_into'),
  E('e-peu-406-407',    'peugeot-406',         'peugeot-407',         'evolves_into'),
  // 205 → 206 → 306: 205 уже есть, добавим связь 504 → 505 → 605... нет, лучше прямую
  E('e-peu-205-306',    'peu-205',             'peu-306',             'inspired_by', 0.70),
]

// Проверяем якоря
;['mit-eclipse-1','mit-eclipse-2','dacia-1300','ren-clio-1','peugeot-407',
  'peu-205','peu-306','chrysler-sebring-1'].forEach(id => {
  const n = g.nodes.find(n => n.id === id)
  if (!n) console.log('ОТСУТСТВУЕТ:', id)
})

let addedN=0, addedE=0, skipN=0, skipE=0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node:', n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n => n.id === e.source)
    const t = g.nodes.find(n => n.id === e.target)
    if (!s) { console.log('  SKIP '+e.id+': нет source '+e.source); skipE++; continue }
    if (!t) { console.log('  SKIP '+e.id+': нет target '+e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge:', e.id); skipE++ }
}
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Platform fills: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
