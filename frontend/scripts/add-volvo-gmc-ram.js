/**
 * Добавляет Volvo, GMC, Ram + Chevrolet trucks
 *
 * Volvo:  XC90 (3 пок.) · XC60 (2 пок.) · S60 (3 пок.) · EX40/C40 · EX60 · EX90
 * GMC:    Sierra (4 пок.) · Hummer EV · Yukon · Canyon
 * Ram:    1500 (2 пок.) · TRX · BackCountry
 * Chevy:  Silverado (2 пок.) · Bolt (2 пок.)
 */
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))
const existN = new Set(g.nodes.map(n => n.id))
const existE = new Set(g.edges.map(e => e.id))

const N = (obj) => obj
const E = (id, src, tgt, type, str = 0.9) => ({ id, source: src, target: tgt, type, strength: str })

const newNodes = [

  // ══════════════════════════════════════════════════════════════════
  // VOLVO
  // ══════════════════════════════════════════════════════════════════

  // ── XC90 ──────────────────────────────────────────────────────────
  N({ id:'volvo-xc90-1',  label:'Volvo XC90 Gen1 (2002)', year:2002,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-xc90', familyKey:'volvo-xc90',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:272, engineType:'v8' }),
  N({ id:'volvo-xc90-2',  label:'Volvo XC90 Gen2 (2015)', year:2015,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-xc90-2', familyKey:'volvo-xc90',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:320, engineType:'i4t' }),
  N({ id:'volvo-ex90-1',  label:'Volvo EX90 (2024)', year:2024,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-ex90', familyKey:'volvo-xc90',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:503, engineType:'ev' }),

  // ── XC60 ──────────────────────────────────────────────────────────
  N({ id:'volvo-xc60-1',  label:'Volvo XC60 Gen1 (2008)', year:2008,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-xc60', familyKey:'volvo-xc60',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:240, engineType:'i6' }),
  N({ id:'volvo-xc60-2',  label:'Volvo XC60 Gen2 (2017)', year:2017,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-xc60-2', familyKey:'volvo-xc60',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:300, engineType:'i4t' }),

  // ── EX40 / C40 (EV compact SUV) ───────────────────────────────────
  N({ id:'volvo-xc40-1',  label:'Volvo XC40 (2017)', year:2017,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-xc40', familyKey:'volvo-xc40',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:247, engineType:'i4t' }),
  N({ id:'volvo-ex40-1',  label:'Volvo EX40 (2023)', year:2023,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-ex40', familyKey:'volvo-xc40',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:408, engineType:'ev' }),
  N({ id:'volvo-c40-1',   label:'Volvo C40 Recharge (2021)', year:2021,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-c40', familyKey:'volvo-xc40',
      type:'generation', bodyType:'suv', segment:'compact', zone:'suv_compact',
      hp:408, engineType:'ev' }),

  // ── EX60 (2026) ───────────────────────────────────────────────────
  N({ id:'volvo-ex60-1',  label:'Volvo EX60 (2026)', year:2026,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-ex60', familyKey:'volvo-xc60',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_mid',
      hp:455, engineType:'ev' }),

  // ── S60 ───────────────────────────────────────────────────────────
  N({ id:'volvo-s60-1',   label:'Volvo S60 Gen1 (2000)', year:2000,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-s60', familyKey:'volvo-s60',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:210, engineType:'i5t' }),
  N({ id:'volvo-s60-2',   label:'Volvo S60 Gen2 (2010)', year:2010,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-s60-2', familyKey:'volvo-s60',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:254, engineType:'i6' }),
  N({ id:'volvo-s60-3',   label:'Volvo S60 Gen3 (2018)', year:2018,
      brandId:'volvo', brandName:'Volvo', modelSlug:'volvo-s60-3', familyKey:'volvo-s60',
      type:'generation', bodyType:'sedan', segment:'exec', zone:'exec_sed',
      hp:415, engineType:'i4t', codeName:'Polestar Engineered' }),

  // ══════════════════════════════════════════════════════════════════
  // GMC
  // ══════════════════════════════════════════════════════════════════

  // ── Sierra ────────────────────────────────────────────────────────
  N({ id:'gmc-sierra-1',  label:'GMC Sierra Gen1 (1999)', year:1999,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-sierra', familyKey:'gmc-sierra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:285, engineType:'v8' }),
  N({ id:'gmc-sierra-2',  label:'GMC Sierra Gen2 (2006)', year:2006,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-sierra-2', familyKey:'gmc-sierra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:320, engineType:'v8' }),
  N({ id:'gmc-sierra-3',  label:'GMC Sierra Gen3 (2013)', year:2013,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-sierra-3', familyKey:'gmc-sierra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:355, engineType:'v8' }),
  N({ id:'gmc-sierra-4',  label:'GMC Sierra Gen4 (2019)', year:2019,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-sierra-4', familyKey:'gmc-sierra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:420, engineType:'v8' }),
  N({ id:'gmc-sierra-5',  label:'GMC Sierra 2027', year:2027,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-sierra-5', familyKey:'gmc-sierra',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:420, engineType:'v8' }),

  // ── Hummer EV ─────────────────────────────────────────────────────
  N({ id:'gmc-hummer-ev',  label:'GMC Hummer EV (2021)', year:2021,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-hummer-ev', familyKey:'gmc-hummer',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:1000, engineType:'ev' }),

  // ── Yukon ─────────────────────────────────────────────────────────
  N({ id:'gmc-yukon-5',   label:'GMC Yukon Gen5 (2021)', year:2021,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-yukon', familyKey:'gmc-yukon',
      type:'generation', bodyType:'suv', segment:'exec', zone:'suv_large',
      hp:420, engineType:'v8' }),

  // ── Canyon ────────────────────────────────────────────────────────
  N({ id:'gmc-canyon-3',  label:'GMC Canyon Gen3 (2023)', year:2023,
      brandId:'gmc', brandName:'GMC', modelSlug:'gmc-canyon', familyKey:'gmc-canyon',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:310, engineType:'v6' }),

  // ══════════════════════════════════════════════════════════════════
  // RAM
  // ══════════════════════════════════════════════════════════════════

  N({ id:'ram-1500-4',    label:'Ram 1500 Gen4 (2009)', year:2009,
      brandId:'ram', brandName:'Ram', modelSlug:'ram-1500-4', familyKey:'ram-1500',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:395, engineType:'v8' }),
  N({ id:'ram-1500-5',    label:'Ram 1500 Gen5 (2019)', year:2019,
      brandId:'ram', brandName:'Ram', modelSlug:'ram-1500-5', familyKey:'ram-1500',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:395, engineType:'v8' }),
  N({ id:'ram-1500-6',    label:'Ram 1500 2027', year:2027,
      brandId:'ram', brandName:'Ram', modelSlug:'ram-1500-6', familyKey:'ram-1500',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:420, engineType:'v8' }),

  // Ram TRX — мощный вариант Gen5
  N({ id:'ram-1500-trx',  label:'Ram 1500 TRX (2021)', year:2021,
      brandId:'ram', brandName:'Ram', modelSlug:'ram-1500-trx', familyKey:'ram-1500',
      type:'generation', bodyType:'pickup', segment:'exec_sports', zone:'pickup',
      hp:702, engineType:'v8', codeName:'Hellcat',
      a777Accel: 4.5 }),

  // Ram 1500 BackCountry (внедорожный пакет Gen5)
  N({ id:'ram-1500-bc',   label:'Ram 1500 BackCountry (2027)', year:2027,
      brandId:'ram', brandName:'Ram', modelSlug:'ram-1500-backcountry', familyKey:'ram-1500',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:395, engineType:'v8' }),

  // ══════════════════════════════════════════════════════════════════
  // CHEVROLET — trucks (Silverado, Bolt) — бренд уже в whitelist
  // ══════════════════════════════════════════════════════════════════

  N({ id:'chev-silverado-4', label:'Chevrolet Silverado Gen4 (2019)', year:2019,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-silverado-4', familyKey:'chev-silverado',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:420, engineType:'v8' }),
  N({ id:'chev-silverado-5', label:'Chevrolet Silverado Gen5 (2027)', year:2027,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-silverado-5', familyKey:'chev-silverado',
      type:'generation', bodyType:'pickup', segment:'truck', zone:'pickup',
      hp:420, engineType:'v8' }),

  N({ id:'chev-bolt-1',   label:'Chevrolet Bolt EV Gen1 (2016)', year:2016,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-bolt', familyKey:'chev-bolt',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'electric',
      hp:200, engineType:'ev' }),
  N({ id:'chev-bolt-2',   label:'Chevrolet Bolt EV Gen2 (2025)', year:2025,
      brandId:'chevrolet', brandName:'Chevrolet', modelSlug:'chev-bolt-2', familyKey:'chev-bolt',
      type:'generation', bodyType:'hatchback', segment:'compact', zone:'electric',
      hp:200, engineType:'ev' }),
]

const newEdges = [
  // Volvo XC90
  E('e-vxc90-1-2', 'volvo-xc90-1', 'volvo-xc90-2', 'evolves_into'),
  E('e-vxc90-2-ex90', 'volvo-xc90-2', 'volvo-ex90-1', 'evolves_into'),
  // Volvo XC60
  E('e-vxc60-1-2', 'volvo-xc60-1', 'volvo-xc60-2', 'evolves_into'),
  E('e-vxc60-2-ex60', 'volvo-xc60-2', 'volvo-ex60-1', 'evolves_into'),
  // Volvo XC40 → EX40
  E('e-vxc40-ex40', 'volvo-xc40-1', 'volvo-ex40-1', 'evolves_into'),
  E('e-vxc40-c40',  'volvo-xc40-1', 'volvo-c40-1',  'variant_of', 0.85),
  // Volvo S60
  E('e-vs60-1-2', 'volvo-s60-1', 'volvo-s60-2', 'evolves_into'),
  E('e-vs60-2-3', 'volvo-s60-2', 'volvo-s60-3', 'evolves_into'),

  // GMC Sierra
  E('e-gsier-1-2', 'gmc-sierra-1', 'gmc-sierra-2', 'evolves_into'),
  E('e-gsier-2-3', 'gmc-sierra-2', 'gmc-sierra-3', 'evolves_into'),
  E('e-gsier-3-4', 'gmc-sierra-3', 'gmc-sierra-4', 'evolves_into'),
  E('e-gsier-4-5', 'gmc-sierra-4', 'gmc-sierra-5', 'evolves_into'),

  // Ram 1500
  E('e-ram-4-5',   'ram-1500-4', 'ram-1500-5', 'evolves_into'),
  E('e-ram-5-6',   'ram-1500-5', 'ram-1500-6', 'evolves_into'),
  E('e-ram-5-trx', 'ram-1500-5', 'ram-1500-trx', 'variant_of', 0.9),
  E('e-ram-5-bc',  'ram-1500-5', 'ram-1500-bc',  'variant_of', 0.85),

  // Chevrolet Silverado
  E('e-csil-4-5', 'chev-silverado-4', 'chev-silverado-5', 'evolves_into'),
  // Chevrolet Bolt
  E('e-cbolt-1-2', 'chev-bolt-1', 'chev-bolt-2', 'evolves_into'),
  // Silverado вдохновил Sierra (shared platform)
  E('e-gsier-sil', 'chev-silverado-4', 'gmc-sierra-4', 'inspired_by', 0.95),

  // Cross-brand: Ram TRX vs Hellcat DNA (Dodge)
  // (dodge-hellcat уже должен быть в графе — пропустим если нет)
]

let addedN = 0, addedE = 0, skipN = 0, skipE = 0

for (const n of newNodes) {
  if (!existN.has(n.id)) { g.nodes.push(n); addedN++ }
  else { console.log('  SKIP node: ' + n.id); skipN++ }
}
for (const e of newEdges) {
  if (!existE.has(e.id)) { g.edges.push(e); addedE++ }
  else { console.log('  SKIP edge: ' + e.id); skipE++ }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Volvo + GMC + Ram + Chevy trucks: +' + addedN + ' nodes (' + skipN + ' skip), +' + addedE + ' edges (' + skipE + ' skip)')
console.log('Total: ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges')
