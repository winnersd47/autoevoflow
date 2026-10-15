#!/usr/bin/env node
// Comprehensive graph audit fix — 2026-07-31
// Fixes: Lexus ES routing, Pontiac variant direction, Land Rover labels,
//        Pagani flags, Lotus deep lineage, Mini missing R56 gen
'use strict';
const fs   = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]));

let adds = 0, removes = 0, patches = 0;

function nodeExists(id) { return !!byId[id]; }

function patch(id, fields) {
  const n = byId[id];
  if (!n) { console.warn('PATCH MISS:', id); return; }
  Object.assign(n, fields);
  patches++;
  console.log(`PATCH ${id}`);
}

function removeEdge(id) {
  const before = g.edges.length;
  g.edges = g.edges.filter(e => e.id !== id);
  if (g.edges.length < before) { removes++; console.log(`REMOVE edge ${id}`); }
  else console.warn(`WARN edge not found: ${id}`);
}

function addNode(n) {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return; }
  g.nodes.push(n); byId[n.id] = n; adds++;
  console.log(`ADD  node ${n.id}`);
}

function addEdge(e) {
  if (g.edges.some(x => x.id === e.id)) { console.log(`SKIP edge (exists): ${e.id}`); return; }
  if (!byId[e.source]) { console.warn(`WARN edge src missing ${e.source}: ${e.id}`); return; }
  if (!byId[e.target]) { console.warn(`WARN edge tgt missing ${e.target}: ${e.id}`); return; }
  g.edges.push(e); adds++;
  console.log(`ADD  edge ${e.id} (${e.type})`);
}

// ════════════════════════════════════════════════════════════════════
// 1. LEXUS ES — wrong GX→ES route, fix 2026 ES chain
// ════════════════════════════════════════════════════════════════════
console.log('\n── LEXUS ES ──');
removeEdge('sync-ev-lexus-gx-j250-ncs-lexus-2026-lexus-es-500e-awd'); // GX→ES wrong
removeEdge('sync-ev-ncs-lexus-2026-lexus-es-500e-awd-ncs-lexus-2026-lexus-es-350e');
removeEdge('sync-ev-ncs-lexus-2026-lexus-es-500e-awd-ncs-lexus-2026-lexus-es-350h');

// ES XV70 Phase II → ES 500e AWD (proper succession)
addEdge({ id: 'lexus-es-xv70-fl-to-500e', source: 'lexus-es-xv70-fl', target: 'ncs-lexus-2026-lexus-es-500e-awd', type: 'evolves_into', strength: 0.88 });
// ES 500e AWD (flagship EV) → 350e (standard EV) and 350h (hybrid) as variants
addEdge({ id: 'lexus-es-500e-to-350e', source: 'ncs-lexus-2026-lexus-es-500e-awd', target: 'ncs-lexus-2026-lexus-es-350e', type: 'variant_of', strength: 0.90 });
addEdge({ id: 'lexus-es-500e-to-350h', source: 'ncs-lexus-2026-lexus-es-500e-awd', target: 'ncs-lexus-2026-lexus-es-350h', type: 'variant_of', strength: 0.90 });
// Enrich NCS nodes
patch('ncs-lexus-2026-lexus-es-500e-awd', { brandId: 'lexus', brandName: 'Lexus', label: 'Lexus ES 500e AWD', engineType: 'EV', hp: 338, zone: 'jp' });
patch('ncs-lexus-2026-lexus-es-350e',     { brandId: 'lexus', brandName: 'Lexus', label: 'Lexus ES 350e',     engineType: 'EV', hp: 201, zone: 'jp' });
patch('ncs-lexus-2026-lexus-es-350h',     { brandId: 'lexus', brandName: 'Lexus', label: 'Lexus ES 350h',     engineType: 'hybrid', hp: 222, zone: 'jp' });

// ════════════════════════════════════════════════════════════════════
// 2. PONTIAC — reversed variant_of makes Firebird Gen4 look like a pentagon
// ════════════════════════════════════════════════════════════════════
console.log('\n── PONTIAC ──');
removeEdge('e-pon-tam-fb4');  // trans-am-ws6 → firebird-4 (reversed)
// Correct: Firebird Gen4 (base) → Trans Am WS6 (variant)
addEdge({ id: 'e-pont-fb4-ws6', source: 'pontiac-firebird-4', target: 'pontiac-trans-am-ws6', type: 'variant_of', strength: 0.92 });
// Add missing: Firebird Gen2 → Gen3 evolves_into (check if exists)
if (!g.edges.some(e => e.source === 'pontiac-firebird-2' && e.target === 'pontiac-firebird-3' && e.type === 'evolves_into'))
  addEdge({ id: 'e-pont-fb2-fb3', source: 'pontiac-firebird-2', target: 'pontiac-firebird-3', type: 'evolves_into', strength: 0.88 });
// GTO 2004 should evolve from GTO The Judge lineage more properly
addEdge({ id: 'e-pont-gto1-2004', source: 'pontiac-gto-1', target: 'pontiac-gto-2004', type: 'inspired_by', strength: 0.60 }); // idempotent if exists

// ════════════════════════════════════════════════════════════════════
// 3. LAND ROVER — label fix + missing flags
// ════════════════════════════════════════════════════════════════════
console.log('\n── LAND ROVER ──');
patch('ncs-land-rover-2027-rover-defender-vertex', {
  label: 'Land Rover Defender Vertex', brandId: 'land-rover', brandName: 'Land Rover',
  isLimited: true, zone: 'eu',
});
patch('lr-defender-v8', { isLimited: true });
// Add missing: Range Rover Sport SVX (track)
addNode({ id: 'lr-rrs-svx', label: 'Range Rover Sport SVX', brandId: 'land-rover', brandName: 'Land Rover', modelSlug: 'range-rover-sport-svx', type: 'generation', year: 2025, hp: 635, engineType: 'ICE', bodyType: 'suv', segment: 'performance-suv', isFacelift: false, isConcept: false, isLimited: true, zone: 'eu', familyKey: 'range-rover-sport' });
addEdge({ id: 'lr-rrs-sv-svx', source: 'lr-rrs-sv', target: 'lr-rrs-svx', type: 'variant_of', strength: 0.88 });
// Add Discovery 6 as future
addNode({ id: 'lr-disco6', label: 'Discovery 6', brandId: 'land-rover', brandName: 'Land Rover', modelSlug: 'discovery-6', type: 'generation', year: 2027, hp: null, engineType: 'PHEV', bodyType: 'suv', segment: 'suv', isFacelift: false, isConcept: false, isFuture: true, zone: 'eu', familyKey: 'land-rover-discovery' });
addEdge({ id: 'lr-disco5-6', source: 'lr-disco5', target: 'lr-disco6', type: 'evolves_into', strength: 0.85 });

// ════════════════════════════════════════════════════════════════════
// 4. PAGANI — fix isLimited flags, add missing variants
// ════════════════════════════════════════════════════════════════════
console.log('\n── PAGANI ──');
patch('pagani-huayra-r',     { isLimited: true });
patch('pagani-utopia-r',     { isLimited: true });
patch('ncs-pagani-2026-huayra-70-derecho', { isLimited: true, brandId: 'pagani', brandName: 'Pagani' });
// Add Huayra Roadster (2017)
addNode({ id: 'pagani-huayra-roadster', label: 'Huayra Roadster', brandId: 'pagani', brandName: 'Pagani', modelSlug: 'huayra-roadster', type: 'generation', year: 2017, hp: 754, engineType: 'ICE', bodyType: 'roadster', segment: 'hypercar', isFacelift: false, isConcept: false, isLimited: true, zone: 'eu', familyKey: 'pagani-huayra' });
addEdge({ id: 'pagani-huayra-roadster-variant', source: 'pagani-huayra', target: 'pagani-huayra-roadster', type: 'variant_of', strength: 0.90 });
// Add Huayra Imola (2020)
addNode({ id: 'pagani-huayra-imola', label: 'Huayra Imola', brandId: 'pagani', brandName: 'Pagani', modelSlug: 'huayra-imola', type: 'generation', year: 2020, hp: 827, engineType: 'ICE', bodyType: 'coupe', segment: 'hypercar', isFacelift: false, isConcept: false, isLimited: true, zone: 'eu', familyKey: 'pagani-huayra' });
addEdge({ id: 'pagani-huayra-imola-variant', source: 'pagani-huayra-r', target: 'pagani-huayra-imola', type: 'variant_of', strength: 0.85 });

// ════════════════════════════════════════════════════════════════════
// 5. MINI — add missing R56 generation
// ════════════════════════════════════════════════════════════════════
console.log('\n── MINI ──');
// Remove direct R50 → F56 jump (too long skip)
removeEdge(g.edges.find(e => e.source === 'mini-cooper-2001' && e.target === 'mini-3door-f56' && e.type === 'evolves_into')?.id);
// Add Mini R56 (second generation, 2006)
addNode({ id: 'mini-cooper-r56', label: 'Mini Cooper R56', brandId: 'mini', brandName: 'Mini', modelSlug: 'cooper-r56', type: 'generation', year: 2006, hp: 120, engineType: 'ICE', bodyType: 'hatchback', segment: 'subcompact', isFacelift: false, isConcept: false, zone: 'eu', familyKey: 'mini-cooper' });
addEdge({ id: 'mini-r50-r56', source: 'mini-cooper-2001', target: 'mini-cooper-r56', type: 'evolves_into', strength: 0.92 });
addEdge({ id: 'mini-r56-f56', source: 'mini-cooper-r56', target: 'mini-3door-f56', type: 'evolves_into', strength: 0.92 });
// R56 variants
addNode({ id: 'mini-cooper-s-r56', label: 'Mini Cooper S R56', brandId: 'mini', brandName: 'Mini', modelSlug: 'cooper-s-r56', type: 'generation', year: 2006, hp: 175, engineType: 'ICE', bodyType: 'hatchback', segment: 'subcompact', isFacelift: false, isConcept: false, zone: 'eu', familyKey: 'mini-cooper' });
addEdge({ id: 'mini-r56-sr56-variant', source: 'mini-cooper-r56', target: 'mini-cooper-s-r56', type: 'variant_of', strength: 0.92 });
addNode({ id: 'mini-jcw-r56', label: 'Mini JCW R56', brandId: 'mini', brandName: 'Mini', modelSlug: 'jcw-r56', type: 'generation', year: 2008, hp: 211, engineType: 'ICE', bodyType: 'hatchback', segment: 'hot-hatch', isFacelift: false, isConcept: false, zone: 'eu', familyKey: 'mini-jcw' });
addEdge({ id: 'mini-r56-jcw-r56', source: 'mini-cooper-r56', target: 'mini-jcw-r56', type: 'variant_of', strength: 0.90 });
addEdge({ id: 'mini-jcw-r56-f56', source: 'mini-jcw-r56', target: 'mini-jcw-f56', type: 'evolves_into', strength: 0.88 });

// ════════════════════════════════════════════════════════════════════
// 6. LOTUS — clean duplicate, add Exige S2, deepen Seven lineage,
//    add all key modifications
// ════════════════════════════════════════════════════════════════════
console.log('\n── LOTUS ──');

// Remove broken edges from duplicate lotus-elise node (undefined IDs)
g.edges = g.edges.filter(e => {
  if ((e.source === 'lotus-elise' || e.target === 'lotus-elise') && !e.id) {
    removes++; return false;
  }
  return true;
});
// Redirect the one valid edge: lotus-elise → elise-s1 (variant_of) is redundant, keep only if needed
g.edges = g.edges.filter(e => {
  if (e.source === 'lotus-elise' && e.target === 'lotus-elise-s1' && e.type === 'variant_of') {
    removes++; console.log('REMOVE redundant lotus-elise->elise-s1 variant'); return false;
  }
  return true;
});

// Seven lineage: Lotus Seven had 4 series
addNode({ id: 'lotus-seven-s1', label: 'Lotus Seven S1', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'seven', type: 'generation', year: 1957, hp: 40, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-seven' });
addNode({ id: 'lotus-seven-s2', label: 'Lotus Seven S2', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'seven', type: 'generation', year: 1960, hp: 55, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-seven' });
addNode({ id: 'lotus-seven-s3', label: 'Lotus Seven S3', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'seven', type: 'generation', year: 1968, hp: 82, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-seven' });
addNode({ id: 'lotus-seven-s4', label: 'Lotus Seven S4', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'seven', type: 'generation', year: 1970, hp: 84, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-seven' });
addNode({ id: 'caterham-seven', label: 'Caterham Seven', brandId: 'caterham', brandName: 'Caterham', modelSlug: 'seven', type: 'generation', year: 1973, hp: 80, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'caterham-seven' });
// Connect Seven chain
addEdge({ id: 'lotus-seven-s1-s2', source: 'lotus-seven-s1', target: 'lotus-seven-s2', type: 'evolves_into', strength: 0.90 });
addEdge({ id: 'lotus-seven-s2-s3', source: 'lotus-seven-s2', target: 'lotus-seven-s3', type: 'evolves_into', strength: 0.90 });
addEdge({ id: 'lotus-seven-s3-s4', source: 'lotus-seven-s3', target: 'lotus-seven-s4', type: 'evolves_into', strength: 0.88 });
addEdge({ id: 'lotus-seven-s4-caterham', source: 'lotus-seven-s4', target: 'caterham-seven', type: 'evolved_into', strength: 0.95 });
// Connect existing lotus-seven (generic) → S1 if not already
addEdge({ id: 'lotus-seven-to-s1', source: 'lotus-seven', target: 'lotus-seven-s1', type: 'variant_of', strength: 0.99 });

// Elan S2 (between S1 and S3)
addNode({ id: 'lotus-elan-s2', label: 'Elan S2', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'elan', type: 'generation', year: 1965, hp: 105, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-elan' });
addNode({ id: 'lotus-elan-s4', label: 'Elan S4/Sprint', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'elan', type: 'generation', year: 1968, hp: 126, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-elan' });
addEdge({ id: 'lotus-elan-s1-s2', source: 'lotus-elan-s1', target: 'lotus-elan-s2', type: 'evolves_into', strength: 0.92 });
addEdge({ id: 'lotus-elan-s2-s3', source: 'lotus-elan-s2', target: 'lotus-elan-s3', type: 'evolves_into', strength: 0.92 });
addEdge({ id: 'lotus-elan-s3-s4', source: 'lotus-elan-s3', target: 'lotus-elan-s4', type: 'evolves_into', strength: 0.90 });

// New Elan M100 (1989) — independent revival
addNode({ id: 'lotus-elan-m100', label: 'Lotus Elan M100', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'elan-m100', type: 'generation', year: 1989, hp: 162, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-elan' });
addEdge({ id: 'lotus-elan-s4-m100', source: 'lotus-elan-s4', target: 'lotus-elan-m100', type: 'inspired_by', strength: 0.65 });

// Europa S1→S2 fix: add proper edge (S2 already exists)
// lotus-europa-s1 → lotus-europa-s2 (evolves_into) already exists per audit ✓

// Exige S2 — MISSING between S1 and S3
addNode({ id: 'lotus-exige-s2', label: 'Exige S2', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'exige', type: 'generation', year: 2004, hp: 192, engineType: 'ICE', bodyType: 'coupe', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-elise' });
// Remove direct S1 → S3 edge if it exists (should go through S2)
const exigeS1S3 = g.edges.find(e => e.source === 'lotus-exige-s1' && e.target === 'lotus-exige-s3' && e.type === 'evolves_into');
if (exigeS1S3) { removeEdge(exigeS1S3.id); }
addEdge({ id: 'lotus-exige-s1-s2', source: 'lotus-exige-s1', target: 'lotus-exige-s2', type: 'evolves_into', strength: 0.90 });
addEdge({ id: 'lotus-exige-s2-s3', source: 'lotus-exige-s2', target: 'lotus-exige-s3', type: 'evolves_into', strength: 0.90 });
// Exige S2 is derived from Elise S2
addEdge({ id: 'lotus-elise-s2-exige-s2', source: 'lotus-elise-s2', target: 'lotus-exige-s2', type: 'derived_from', strength: 0.90 });

// Exige variants (S3 era)
addNode({ id: 'lotus-exige-sport-380', label: 'Exige Sport 380', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'exige-sport-380', type: 'generation', year: 2017, hp: 375, engineType: 'ICE', bodyType: 'coupe', segment: 'sports', isFacelift: false, isConcept: false, isLimited: false, zone: 'uk', familyKey: 'lotus-elise' });
addNode({ id: 'lotus-exige-cup-430', label: 'Exige Cup 430', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'exige-cup-430', type: 'generation', year: 2018, hp: 430, engineType: 'ICE', bodyType: 'coupe', segment: 'sports', isFacelift: false, isConcept: false, isLimited: true, zone: 'uk', familyKey: 'lotus-elise' });
addEdge({ id: 'lotus-exige-s3-sport380', source: 'lotus-exige-s3', target: 'lotus-exige-sport-380', type: 'variant_of', strength: 0.88 });
addEdge({ id: 'lotus-exige-s3-cup430',   source: 'lotus-exige-s3', target: 'lotus-exige-cup-430',   type: 'variant_of', strength: 0.88 });

// Elise variants (S3 era)
addNode({ id: 'lotus-elise-sprint-220', label: 'Elise Sprint 220', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'elise-sprint-220', type: 'generation', year: 2017, hp: 220, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-elise' });
addNode({ id: 'lotus-elise-cup-250',    label: 'Elise Cup 250',    brandId: 'lotus', brandName: 'Lotus', modelSlug: 'elise-cup-250',    type: 'generation', year: 2017, hp: 250, engineType: 'ICE', bodyType: 'roadster', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-elise' });
addEdge({ id: 'lotus-elise-s3-sprint', source: 'lotus-elise-s3', target: 'lotus-elise-sprint-220', type: 'variant_of', strength: 0.85 });
addEdge({ id: 'lotus-elise-s3-cup250', source: 'lotus-elise-s3', target: 'lotus-elise-cup-250',    type: 'variant_of', strength: 0.85 });

// Lotus 2-Eleven and 3-Eleven track cars
addNode({ id: 'lotus-2eleven', label: 'Lotus 2-Eleven', brandId: 'lotus', brandName: 'Lotus', modelSlug: '2-eleven', type: 'generation', year: 2007, hp: 252, engineType: 'ICE', bodyType: 'roadster', segment: 'track', isFacelift: false, isConcept: false, isLimited: true, zone: 'uk', familyKey: 'lotus-elise' });
addNode({ id: 'lotus-3eleven', label: 'Lotus 3-Eleven', brandId: 'lotus', brandName: 'Lotus', modelSlug: '3-eleven', type: 'generation', year: 2015, hp: 450, engineType: 'ICE', bodyType: 'roadster', segment: 'track', isFacelift: false, isConcept: false, isLimited: true, zone: 'uk', familyKey: 'lotus-elise' });
addEdge({ id: 'lotus-elise-s2-2eleven',  source: 'lotus-elise-s2', target: 'lotus-2eleven',  type: 'derived_from', strength: 0.80 });
addEdge({ id: 'lotus-2eleven-3eleven',    source: 'lotus-2eleven', target: 'lotus-3eleven',   type: 'evolves_into', strength: 0.82 });

// Evora 400 variant
addNode({ id: 'lotus-evora-400', label: 'Evora 400', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'evora-400', type: 'generation', year: 2015, hp: 400, engineType: 'ICE', bodyType: 'coupe', segment: 'sports', isFacelift: false, isConcept: false, zone: 'uk', familyKey: 'lotus-evora' });
addNode({ id: 'lotus-evora-gt430', label: 'Evora GT430', brandId: 'lotus', brandName: 'Lotus', modelSlug: 'evora-gt430', type: 'generation', year: 2017, hp: 430, engineType: 'ICE', bodyType: 'coupe', segment: 'sports', isFacelift: false, isConcept: false, isLimited: true, zone: 'uk', familyKey: 'lotus-evora' });
addEdge({ id: 'lotus-evora-400-variant', source: 'lotus-evora', target: 'lotus-evora-400',    type: 'variant_of', strength: 0.88 });
addEdge({ id: 'lotus-evora-gt430-variant', source: 'lotus-evora-400', target: 'lotus-evora-gt430', type: 'variant_of', strength: 0.88 });

// Emira → Evija (electric hypercar) already has inspired_by; add proper chain
// ncs-lotus-2025-lotus-evija already connected

// ════════════════════════════════════════════════════════════════════
// 7. Dedup cleanup: remove duplicate edges (same src+tgt+type)
// ════════════════════════════════════════════════════════════════════
const seen = new Set();
const before = g.edges.length;
g.edges = g.edges.filter(e => {
  const k = `${e.source}||${e.target}||${e.type}`;
  if (seen.has(k)) return false;
  seen.add(k); return true;
});
const dedupRemoved = before - g.edges.length;
if (dedupRemoved > 0) console.log(`\nDedup: removed ${dedupRemoved} duplicate edges`);

// ════════════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════════════
console.log(`\nAdded: ${adds}, Removed: ${removes}, Patched: ${patches}`);
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`);
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8');
console.log('Done.');
