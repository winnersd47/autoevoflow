/**
 * Добавляет:
 * Alfa Romeo классика (Giulia 105 → Spider 105 → 155 → 164 → связи к существующим)
 * Cadillac Escalade Gen1/4/5/IQ
 * Volvo классика (244 → 740 → 850 → S70/V70 → связь к существующим S60)
 */
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

  // ══════════════════════════════════════════════════════════════
  // ALFA ROMEO CLASSICS
  // ══════════════════════════════════════════════════════════════
  N({ id:'alfa-giulia-105', label:'Alfa Romeo Giulia (1962)', year:1962,
      brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-giulia-105', familyKey:'alfa-giulia',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:92, engineType:'i4' }),
  N({ id:'alfa-spider-105', label:'Alfa Romeo Spider Duetto (1966)', year:1966,
      brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-spider-105', familyKey:'alfa-spider',
      type:'generation', bodyType:'roadster', segment:'sports', zone:'open_top',
      hp:109, engineType:'i4', codeName:'Duetto' }),
  N({ id:'alfa-155', label:'Alfa Romeo 155 (1992)', year:1992,
      brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-155', familyKey:'alfa-155',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:190, engineType:'i4t' }),
  N({ id:'alfa-164', label:'Alfa Romeo 164 (1987)', year:1987,
      brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-164', familyKey:'alfa-164',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:192, engineType:'v6' }),
  N({ id:'alfa-33-stradale-1967', label:'Alfa Romeo 33 Stradale (1967)', year:1967,
      brandId:'alfa-romeo', brandName:'Alfa Romeo', modelSlug:'alfa-33-stradale-1967', familyKey:'alfa-33-stradale',
      type:'generation', bodyType:'coupe', segment:'sports', zone:'supercar',
      hp:230, engineType:'v8' }),

  // ══════════════════════════════════════════════════════════════
  // CADILLAC ESCALADE
  // ══════════════════════════════════════════════════════════════
  N({ id:'cadillac-escalade-1', label:'Cadillac Escalade Gen1 (1999)', year:1999,
      brandId:'cadillac', brandName:'Cadillac', modelSlug:'cadillac-escalade', familyKey:'cadillac-escalade',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:255, engineType:'v8' }),
  N({ id:'cadillac-escalade-4', label:'Cadillac Escalade Gen4 (2015)', year:2015,
      brandId:'cadillac', brandName:'Cadillac', modelSlug:'cadillac-escalade-4', familyKey:'cadillac-escalade',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:420, engineType:'v8' }),
  N({ id:'cadillac-escalade-5', label:'Cadillac Escalade Gen5 (2021)', year:2021,
      brandId:'cadillac', brandName:'Cadillac', modelSlug:'cadillac-escalade-5', familyKey:'cadillac-escalade',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:420, engineType:'v8' }),
  N({ id:'cadillac-escalade-iq', label:'Cadillac Escalade IQ (2024)', year:2024,
      brandId:'cadillac', brandName:'Cadillac', modelSlug:'cadillac-escalade-iq', familyKey:'cadillac-escalade',
      type:'generation', bodyType:'suv', segment:'luxury', zone:'suv_large',
      hp:750, engineType:'ev' }),

  // ══════════════════════════════════════════════════════════════
  // VOLVO CLASSICS
  // ══════════════════════════════════════════════════════════════
  N({ id:'volvo-244', label:'Volvo 244/245 (1975)', year:1975,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-244', familyKey:'volvo-classics',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:100, engineType:'i4' }),
  N({ id:'volvo-740', label:'Volvo 740 (1984)', year:1984,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-740', familyKey:'volvo-classics',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:115, engineType:'i4t' }),
  N({ id:'volvo-850', label:'Volvo 850 (1991)', year:1991,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-850', familyKey:'volvo-classics',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:225, engineType:'i5' }),
  N({ id:'volvo-s70-v70', label:'Volvo S70/V70 (1996)', year:1996,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-s70-v70', familyKey:'volvo-classics',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:240, engineType:'i5t' }),
]

const newEdges = [
  // Alfa Romeo classics chain
  E('e-alfa-g105-sp105',   'alfa-giulia-105',     'alfa-spider-105',       'inspired_by', 0.85),
  E('e-alfa-g105-164',     'alfa-giulia-105',     'alfa-164',              'inspired_by', 0.75),
  E('e-alfa-164-155',      'alfa-164',            'alfa-155',              'inspired_by', 0.80),
  E('e-alfa-155-156',      'alfa-155',            'alfa-romeo-156',        'evolves_into'),
  // 33 Stradale 1967 → 33 Stradale 2023 (revival, духовная преемственность)
  E('e-alfa-33s-67-23',    'alfa-33-stradale-1967','alfa-romeo-33-stradale','inspired_by', 0.92),
  // Classic GTV chain: GTV (существующий 916) происходит от Alfetta GTV
  E('e-alfa-155-147',      'alfa-155',            'alfa-romeo-147',        'evolves_into'),
  E('e-alfa-164-gtv',      'alfa-164',            'alfa-romeo-gtv',        'inspired_by', 0.70),

  // Cadillac Escalade chain
  E('e-cad-esc1-4',        'cadillac-escalade-1', 'cadillac-escalade-4',   'evolves_into'),
  E('e-cad-esc4-5',        'cadillac-escalade-4', 'cadillac-escalade-5',   'evolves_into'),
  E('e-cad-esc5-iq',       'cadillac-escalade-5', 'cadillac-escalade-iq',  'evolves_into'),
  // Escalade — Cadillac-версия Chevrolet Tahoe (shared T1XX platform)
  E('e-cad-esc-chev-tahoe','chev-tahoe-5',        'cadillac-escalade-5',   'inspired_by', 0.92),
  // Cadillac Lyriq → EV-параллель Escalade IQ
  E('e-cad-lyriq-esciq',   'cadillac-lyriq',      'cadillac-escalade-iq',  'inspired_by', 0.80),

  // Volvo classics chain
  E('e-vol-244-740',       'volvo-244',           'volvo-740',             'evolves_into'),
  E('e-vol-740-850',       'volvo-740',           'volvo-850',             'evolves_into'),
  E('e-vol-850-s70',       'volvo-850',           'volvo-s70-v70',         'evolves_into'),
  // S70/V70 → S60 Gen1 (уже есть в графе)
  E('e-vol-s70-s60-1',     'volvo-s70-v70',       'volvo-s60-1',           'evolves_into'),
]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0
for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) {
    const s = g.nodes.find(n=>n.id===e.source)
    const t = g.nodes.find(n=>n.id===e.target)
    if (!s) { console.log('  SKIP edge ' + e.id + ': нет source ' + e.source); skipE++; continue }
    if (!t) { console.log('  SKIP edge ' + e.id + ': нет target ' + e.target); skipE++; continue }
    g.edges.push(e); addedE++
  } else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Alfa classics + Cadillac Escalade + Volvo classics: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
