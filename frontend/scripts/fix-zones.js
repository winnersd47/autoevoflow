'use strict'
/**
 * fix-zones.js — исправляет неверные zone-значения ('sedan', 'suv', 'muscle')
 * на канонические из BODY_TYPE_ZONES.
 *
 * sedan     → exec_sed / midsize_sed / flagship_sed (по сегменту)
 * suv       → suv_large / suv_mid / suv_compact (по размеру)
 * muscle    → sports / gt_coupe (мускул-кары)
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const ZONE_MAP = {
  // ── muscle → sports / gt_coupe ────────────────────────────────────────────
  'chevy-camaro-gen2':      'sports',
  'chevy-camaro-gen3':      'sports',
  'chevy-camaro-gen4':      'sports',
  'buick-skylark-1':        'sports',
  'olds-442-1':             'sports',
  'olds-cutlass-1':         'gt_coupe',
  'plymouth-barracuda-1':   'sports',
  'plymouth-barracuda-3':   'sports',
  'plymouth-roadrunner':    'sports',
  'plymouth-superbird':     'sports',
  'mercury-cougar-1':       'gt_coupe',

  // ── sedan → exec_sed / midsize_sed / flagship_sed ─────────────────────────
  // Opel (Vauxhall) — D-segment executive
  'opel-vectra-a':     'exec_sed',
  'opel-vectra-b':     'exec_sed',
  'opel-vectra-c':     'exec_sed',
  'opel-omega-a':      'exec_sed',
  'opel-omega-b':      'exec_sed',
  'opel-insignia-a':   'exec_sed',
  'opel-insignia-b':   'exec_sed',

  // Saab
  'saab-92':           'midsize_sed',   // economy/micro
  'saab-96':           'midsize_sed',   // small family
  'saab-99':           'midsize_sed',   // compact
  'saab-9-3-gen2':     'exec_sed',      // BMW 3-Series rival
  'saab-9-5-gen1':     'exec_sed',      // E-segment
  'saab-9-5-gen2':     'exec_sed',

  // Citroën
  'citroen-ds':        'flagship_sed',  // iconic hydropneumatic flagship
  'citroen-cx':        'exec_sed',
  'citroen-xm':        'exec_sed',
  'citroen-c5-x1':     'exec_sed',
  'citroen-c5-x2':     'exec_sed',

  // Peugeot
  'peugeot-407':       'exec_sed',

  // Buick
  'buick-lesabre-1':   'midsize_sed',   // full-size American

  // Dacia
  'dacia-1300':        'midsize_sed',
  'dacia-logan-1':     'midsize_sed',
  'dacia-logan-2':     'midsize_sed',
  'dacia-logan-3':     'midsize_sed',

  // ── suv → suv_large / suv_mid / suv_compact ───────────────────────────────
  // Nissan Pathfinder (3-row midsize)
  'nissan-pathfinder-wd21':  'suv_mid',
  'nissan-pathfinder-r50':   'suv_mid',
  'nissan-pathfinder-r51':   'suv_mid',
  'nissan-pathfinder-r52':   'suv_mid',

  // Mazda CX-9 / CX-90 (3-row large)
  'mazda-cx9-tb':      'suv_large',
  'mazda-cx9-tc':      'suv_large',
  'mazda-cx90':        'suv_large',

  // Suzuki (compact off-roaders)
  'suzuki-jimny-1':    'suv_compact',
  'suzuki-jimny-3':    'suv_compact',
  'suzuki-jimny-4':    'suv_compact',
  'suzuki-vitara-1':   'suv_compact',
  'suzuki-vitara-4':   'suv_compact',

  // Dacia Duster (compact)
  'dacia-duster-1':    'suv_compact',
  'dacia-duster-2':    'suv_compact',

  // Daihatsu Terios (kei/compact)
  'daihatsu-terios-1': 'suv_compact',

  // Buick Enclave (large 3-row)
  'buick-enclave-1':   'suv_large',
}

let fixed = 0
for (const node of g.nodes) {
  const newZone = ZONE_MAP[node.id]
  if (newZone && node.zone !== newZone) {
    console.log(`  ${node.id}: ${node.zone} → ${newZone}`)
    node.zone = newZone
    fixed++
  }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`\nfixed ${fixed} zones`)
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
