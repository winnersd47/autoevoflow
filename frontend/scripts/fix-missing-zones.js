#!/usr/bin/env node
// Backfill поля zone для 99 узлов, у которых оно отсутствовало (см. полный
// список в выводе validate-graph.js). Все эти узлы — из старой партии
// импорта с legacy-схемой (brand/country/category вместо
// bodyType/segment/zone). Там, где легаси category уже совпадает с
// валидным значением zone (supercar/sports/offroad/hypercar) — берём его
// напрямую. Остальные (sedan/hatch/city/suv/truck/van/mpv/crossover/
// cabrio/coupe/wagon/gt) — сопоставлены вручную по реальному классу машины.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

const ZONE_MAP = {
  // Ariel
  'ariel-atom': 'supercar', 'ariel-atom-2': 'supercar', 'ariel-atom-3': 'supercar',
  'ariel-atom-3s': 'supercar', 'ariel-atom-4': 'supercar', 'ariel-atom-4r': 'supercar',
  'ariel-nomad': 'offroad', 'ariel-nomad-r': 'offroad', 'ariel-nomad-2': 'offroad',
  'ariel-hipercar': 'hypercar',
  // Lotus
  'lotus-elise': 'sports', 'lotus-seven': 'sports',
  // Rezvani
  'rezvani-beast-gen1': 'supercar', 'rezvani-beast-x': 'supercar', 'rezvani-beast-alpha': 'supercar',
  'rezvani-beast-alpha-x': 'supercar', 'rezvani-beast-gen2': 'supercar',
  'rezvani-tank-gen1': 'offroad', 'rezvani-tank-military': 'offroad', 'rezvani-tank-x': 'offroad',
  'rezvani-tank-hybrid': 'offroad', 'rezvani-tank-2026': 'offroad',
  'rezvani-hercules': 'pickup', 'rezvani-hercules-military': 'pickup', 'rezvani-fortress': 'pickup',
  'rezvani-vengeance': 'offroad', 'rezvani-knight': 'offroad',
  'rezvani-dune': 'supercar', 'rezvani-retro-rr1': 'supercar',
  // Porsche / KTM / BAC
  'porsche-911-992': 'sports',
  'ktm-x-bow': 'supercar', 'ktm-x-bow-gt2': 'supercar',
  'bac-mono': 'supercar', 'bac-mono-r': 'supercar',
  // Citroën
  'citroen-traction': 'exec_sed', 'citroen-ami': 'hatchback', 'citroen-dyane': 'hatchback',
  'citroen-mehari': 'offroad', 'citroen-sm': 'gt_coupe', 'citroen-visa': 'hatchback',
  'citroen-zx': 'hatchback', 'citroen-xsara': 'hatchback', 'citroen-berlingo': 'workhorse',
  'citroen-c1': 'hatchback', 'citroen-c2': 'hatchback', 'citroen-c6': 'flagship_sed',
  'citroen-c4-picasso': 'estate', 'citroen-c3-2': 'hatchback', 'citroen-c3-3': 'hatchback',
  'citroen-c4-2': 'hatchback', 'citroen-c4-cactus': 'suv_compact', 'citroen-c3-aircross': 'suv_compact',
  'citroen-c5-aircross': 'suv_mid', 'citroen-c4-3': 'hatchback', 'citroen-c5-x': 'exec_sed',
  'citroen-e-c3': 'hatchback', 'citroen-ds3': 'hatchback', 'citroen-ds4': 'hatchback', 'citroen-ds5': 'hatchback',
  // Mini
  'mini-classic-mk2': 'hatchback', 'mini-cooper-orig': 'hatchback', 'mini-cabrio-r52': 'open_top',
  'mini-clubman-r55': 'estate', 'mini-coupe-r58': 'gt_coupe', 'mini-roadster-r59': 'open_top',
  'mini-paceman-r61': 'suv_compact', 'mini-3door-f56': 'hatchback', 'mini-5door-f55': 'hatchback',
  'mini-cabrio-f57': 'open_top', 'mini-clubman-f54': 'estate', 'mini-countryman-f60': 'suv_compact',
  'mini-jcw-f56': 'hatchback', 'mini-cooper-j01': 'hatchback',
  // Saturn
  'saturn-sl': 'midsize_sed', 'saturn-sc': 'gt_coupe', 'saturn-sw': 'estate', 'saturn-ls': 'midsize_sed',
  'saturn-vue': 'suv_compact', 'saturn-ion': 'midsize_sed', 'saturn-relay': 'workhorse',
  'saturn-aura': 'midsize_sed', 'saturn-outlook': 'suv_large', 'saturn-vue-2': 'suv_compact',
  'saturn-astra': 'hatchback',
  // Scion
  'scion-xa': 'hatchback', 'scion-xb-1': 'hatchback', 'scion-tc-1': 'gt_coupe', 'scion-xd': 'hatchback',
  'scion-xb-2': 'hatchback', 'scion-tc-2': 'gt_coupe', 'scion-iq': 'hatchback', 'scion-ia': 'midsize_sed',
  'scion-im': 'hatchback',
  // Smart
  'smart-fortwo-2': 'hatchback', 'smart-roadster': 'open_top', 'smart-forfour-1': 'hatchback',
  'smart-forfour-2': 'hatchback', 'smart-1': 'suv_compact', 'smart-3': 'suv_compact',
}

let fixed = 0, missing = []
for (const [id, zone] of Object.entries(ZONE_MAP)) {
  const n = byId.get(id)
  if (!n) { missing.push(id); continue }
  n.zone = zone
  fixed++
}

console.log(`✅ Проставлено zone: ${fixed} из ${Object.keys(ZONE_MAP).length}`)
if (missing.length) console.log('⚠️  не найдены в графе:', missing.join(', '))

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
