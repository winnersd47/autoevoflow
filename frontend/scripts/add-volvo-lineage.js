#!/usr/bin/env node
// Volvo deep-dive: classic pre-1975 lineage + missing modern models/variants.
// Current graph started at 1975 (244/245) — real Volvo history goes back to 1947.
'use strict';
const fs   = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]));

let addedN = 0, addedE = 0;
const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return; }
  g.nodes.push(n); byId[n.id] = n; addedN++;
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`);
};
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node`); return; }
  if (g.edges.some(e => e.source === source && e.target === target && e.type === type)) { console.log(`SKIP edge (exists): ${id}`); return; }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra });
  addedE++; console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`);
};

console.log('── VOLVO: classic pre-1975 lineage ──');
addNode({ id: 'volvo-pv444', label: 'Volvo PV444 (1947)', year: 1947, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-pv444', familyKey: 'volvo-classics', type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed', hp: 40, engineType: 'i4' });
addNode({ id: 'volvo-pv544', label: 'Volvo PV544 (1958)', year: 1958, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-pv444', familyKey: 'volvo-classics', type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed', hp: 60, engineType: 'i4' });
addNode({ id: 'volvo-amazon', label: 'Volvo Amazon / 120 (1956)', year: 1956, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-amazon', familyKey: 'volvo-classics', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed', hp: 85, engineType: 'i4' });
addNode({ id: 'volvo-p1800', label: 'Volvo P1800 (1961)', year: 1961, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-p1800', familyKey: 'volvo-p1800', type: 'generation', bodyType: 'coupe', segment: 'sports', zone: 'sports', hp: 100, engineType: 'i4' });
addNode({ id: 'volvo-140', label: 'Volvo 140 (1966)', year: 1966, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-140', familyKey: 'volvo-classics', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed', hp: 100, engineType: 'i4' });

addEdge('vol-pv444-pv544', 'volvo-pv444', 'volvo-pv544', 'facelifted_to');
addEdge('vol-pv444-amazon', 'volvo-pv444', 'volvo-amazon', 'evolves_into');
addEdge('vol-amazon-p1800', 'volvo-amazon', 'volvo-p1800', 'derived_from'); // shared B18 engine/chassis eng.
addEdge('vol-amazon-140', 'volvo-amazon', 'volvo-140', 'evolves_into');
addEdge('vol-140-244', 'volvo-140', 'volvo-244', 'evolves_into'); // links into existing 244/245(1975)

console.log('── VOLVO: 850 performance variant ──');
addNode({ id: 'volvo-850-t5r', label: 'Volvo 850 T5-R (1994)', year: 1994, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-850', familyKey: 'volvo-classics', type: 'generation', bodyType: 'estate', segment: 'exec', zone: 'exec_sed', hp: 240, engineType: 'i5t', isLimited: true });
addEdge('vol-850-t5r', 'volvo-850', 'volvo-850-t5r', 'variant_of');

console.log('── VOLVO: missing modern models ──');
addNode({ id: 'volvo-xc70-1', label: 'Volvo XC70 (1997)', year: 1997, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-xc70', familyKey: 'volvo-xc70', type: 'generation', bodyType: 'estate', segment: 'exec', zone: 'estate', hp: 193, engineType: 'i5t' });
addNode({ id: 'volvo-s80-1', label: 'Volvo S80 (1998)', year: 1998, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-s80', familyKey: 'volvo-s80', type: 'generation', bodyType: 'sedan', segment: 'flagship', zone: 'flagship_sed', hp: 200, engineType: 'i6' });
addNode({ id: 'volvo-v60-1', label: 'Volvo V60 (2010)', year: 2010, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-v60', familyKey: 'volvo-s60', type: 'generation', bodyType: 'estate', segment: 'exec', zone: 'estate', hp: 240, engineType: 'i5t' });
addNode({ id: 'volvo-v90-1', label: 'Volvo V90 (2016)', year: 2016, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-v90', familyKey: 'volvo-xc70', type: 'generation', bodyType: 'estate', segment: 'flagship', zone: 'estate', hp: 250, engineType: 'i4t' });
addNode({ id: 'volvo-ex30-1', label: 'Volvo EX30 (2023)', year: 2023, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-ex30', familyKey: 'volvo-xc40', type: 'generation', bodyType: 'suv', segment: 'compact', zone: 'suv_compact', hp: 268, engineType: 'EV' });

addEdge('vol-s70-xc70', 'volvo-s70-v70', 'volvo-xc70-1', 'variant_of');      // XC70 = raised/AWD Cross Country wagon variant
addEdge('vol-s70-s80', 'volvo-s70-v70', 'volvo-s80-1', 'inspired_by');       // flagship sedan, different class, S70 kept selling alongside
addEdge('vol-s60-2-v60', 'volvo-s60-2', 'volvo-v60-1', 'variant_of');        // V60 = wagon body variant of S60 Gen2 (shared P3 platform)
addEdge('vol-xc70-v90', 'volvo-xc70-1', 'volvo-v90-1', 'evolves_into');      // Volvo's big-wagon nameplate succession
addEdge('vol-xc40-ex30', 'volvo-xc40-1', 'volvo-ex30-1', 'inspired_by');     // smallest ICE crossover -> smallest EV crossover

console.log(`\nAdded ${addedN} nodes, ${addedE} edges.`);
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`);
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8');
console.log('Done.');
