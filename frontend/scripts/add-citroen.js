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
  // ── 2CV (1948) — народный автомобиль Франции ─────────────────────────────
  N({ id:'citroen-2cv', label:'Citroën 2CV (1948)', year:1948,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-2cv', familyKey:'citroen-2cv',
      type:'generation', bodyType:'hatchback', segment:'micro', zone:'hatchback',
      hp:9, engineType:'flat2', codeName:'AZ / AZL / Charleston' }),

  // ── DS (1955) — революционный гидропневматический флагман ─────────────────
  N({ id:'citroen-ds', label:'Citroën DS (1955)', year:1955,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-ds', familyKey:'citroen-ds',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:109, engineType:'i4', codeName:'DS 21 Pallas' }),

  // ── GS (1970) — компактный с гидропневматикой ─────────────────────────────
  N({ id:'citroen-gs', label:'Citroën GS (1970)', year:1970,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-gs', familyKey:'citroen-gs',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:65, engineType:'flat4' }),

  // ── CX (1974) — Europcar года, преемник DS ────────────────────────────────
  N({ id:'citroen-cx', label:'Citroën CX (1974)', year:1974,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-cx', familyKey:'citroen-cx',
      type:'generation', bodyType:'hatchback', segment:'exec', zone:'sedan',
      hp:168, engineType:'i4t', codeName:'CX GTi Turbo 2' }),

  // ── BX (1982) ─────────────────────────────────────────────────────────────
  N({ id:'citroen-bx', label:'Citroën BX (1982)', year:1982,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-bx', familyKey:'citroen-bx',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:125, engineType:'i4', codeName:'BX GTi 16V' }),

  // ── AX (1986) — субкомпакт, конкурент VW Polo ────────────────────────────
  N({ id:'citroen-ax', label:'Citroën AX (1986)', year:1986,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-ax', familyKey:'citroen-ax',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:95, engineType:'i4', codeName:'AX GT' }),

  // ── XM (1989) — флагман после CX ─────────────────────────────────────────
  N({ id:'citroen-xm', label:'Citroën XM (1989)', year:1989,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-xm', familyKey:'citroen-xm',
      type:'generation', bodyType:'hatchback', segment:'exec', zone:'sedan',
      hp:200, engineType:'v6', codeName:'XM V6 24V' }),

  // ── Xantia (1993) ─────────────────────────────────────────────────────────
  N({ id:'citroen-xantia', label:'Citroën Xantia (1993)', year:1993,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-xantia', familyKey:'citroen-xantia',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:167, engineType:'i4t', codeName:'Activa / V6' }),

  // ── Saxo (1996) — спортивный хэтч для молодёжи ───────────────────────────
  N({ id:'citroen-saxo', label:'Citroën Saxo (1996)', year:1996,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-saxo', familyKey:'citroen-saxo',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:120, engineType:'i4', codeName:'VTS 16V' }),

  // ── C5 (2001) — современный флагман ──────────────────────────────────────
  N({ id:'citroen-c5-x1', label:'Citroën C5 (2001)', year:2001,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-c5', familyKey:'citroen-c5',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:210, engineType:'v6' }),
  N({ id:'citroen-c5-x2', label:'Citroën C5 Gen.2 (2008)', year:2008,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-c5-gen2', familyKey:'citroen-c5',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'sedan',
      hp:240, engineType:'v6' }),

  // ── C3 (2002) — массовый субкомпакт ──────────────────────────────────────
  N({ id:'citroen-c3-1', label:'Citroën C3 (2002)', year:2002,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-c3', familyKey:'citroen-c3',
      type:'generation', bodyType:'hatchback', segment:'subcompact', zone:'hatchback',
      hp:110, engineType:'i4' }),

  // ── C4 (2004) — компактный ─────────────────────────────────────────────────
  N({ id:'citroen-c4-1', label:'Citroën C4 (2004)', year:2004,
      brandId:'citroen', brandName:'Citroën', modelSlug:'citroen-c4', familyKey:'citroen-c4',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'hatchback',
      hp:180, engineType:'i4t', codeName:'VTS' }),
]

const newEdges = [
  // DS → CX → XM (флагманская линия)
  E('e-cit-ds-cx',   'citroen-ds',     'citroen-cx',     'evolves_into'),
  E('e-cit-cx-xm',   'citroen-cx',     'citroen-xm',     'evolves_into'),
  // GS → BX → Xantia (компактная линия)
  E('e-cit-gs-bx',   'citroen-gs',     'citroen-bx',     'evolves_into'),
  E('e-cit-bx-xan',  'citroen-bx',     'citroen-xantia', 'evolves_into'),
  E('e-cit-xan-c5',  'citroen-xantia', 'citroen-c5-x1',  'evolves_into'),
  E('e-cit-c5-c5g2', 'citroen-c5-x1',  'citroen-c5-x2',  'evolves_into'),
  // AX → Saxo → C3 (субкомпактная линия)
  E('e-cit-ax-saxo', 'citroen-ax',     'citroen-saxo',   'evolves_into'),
  E('e-cit-saxo-c3', 'citroen-saxo',   'citroen-c3-1',   'evolves_into'),
  // BX → C4
  E('e-cit-bx-c4',   'citroen-bx',     'citroen-c4-1',   'inspired_by', 0.72),
  // 2CV повлиял на GS (народный дух Citroën)
  E('e-cit-2cv-gs',  'citroen-2cv',    'citroen-gs',     'inspired_by', 0.70),

  // ── Кросс-брендовые ────────────────────────────────────────────────────────
  // C5 и Peugeot 407 — общая PSA PF3 платформа
  E('e-cit-c5-p407', 'citroen-c5-x1',  'peugeot-407',    'shares_platform', 0.92),
  // Saxo и Peugeot 106 — общая платформа
  E('e-cit-saxo-106','citroen-saxo',   'peugeot-106',    'shares_platform', 0.95),
  // C4 и Peugeot 307 — PF2 платформа
  E('e-cit-c4-307',  'citroen-c4-1',   'peugeot-307',    'shares_platform', 0.92),
]

// Проверяем наличие якорей Peugeot
;['peugeot-407','peugeot-106','peugeot-307'].forEach(id=>{
  const n=g.nodes.find(n=>n.id===id)
  console.log(id,'→',n?'ЕСТЬ ('+n.year+')':'ОТСУТСТВУЕТ')
})

let addedN=0, addedE=0, skipN=0, skipE=0
for(const n of newNodes){
  if(!existN.has(n.id)){g.nodes.push(n);addedN++}
  else{console.log('  SKIP node:',n.id);skipN++}
}
for(const e of newEdges){
  if(!existE.has(e.id)){
    const s=g.nodes.find(n=>n.id===e.source), t=g.nodes.find(n=>n.id===e.target)
    if(!s){console.log('  SKIP edge '+e.id+': нет source '+e.source);skipE++;continue}
    if(!t){console.log('  SKIP edge '+e.id+': нет target '+e.target);skipE++;continue}
    g.edges.push(e);addedE++
  }else{console.log('  SKIP edge:',e.id);skipE++}
}
fs.writeFileSync(GRAPH, JSON.stringify(g,null,2))
console.log('Citroën: +'+addedN+' nodes ('+skipN+' skip), +'+addedE+' edges ('+skipE+' skip)')
console.log('Total:',g.nodes.length,'nodes,',g.edges.length,'edges')
