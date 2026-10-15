#!/usr/bin/env node
// Remove manual-added duplicate nodes that already exist as NCS nodes.
// Redirects edges and enriches NCS nodes with proper metadata.
'use strict';
const fs   = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

// Map: myManualId → ncsId
const REDIRECT = {
  'ferrari-sc40':            'ncs-ferrari-2025-sc40',
  'lambo-fenomeno':          'ncs-lamborghini-2025-fenomeno',
  'kgsegg-sadairs-spear':    'ncs-koenigsegg-2025-sadairs-spear',
  'bugatti-brouillard':      'ncs-bugatti-2025-brouillard-bugatti',
  'gma-le-mans-gtr':         'ncs-gordon-murray-2026-automotive-le-mans',
  'lambo-revo-impavido':     'ncs-lamborghini-2026-revuelto-impavido',
  'lambo-temerario-ap':      'ncs-lamborghini-2026-temerario-ad-personam',
  'merc-maybach-gls680':     'ncs-mercedes-2027-gls-680-maybach',
  'vw-id-cross':             'ncs-volkswagen-2027-id-cross',
  'pagani-huayra-codalunga-s': 'ncs-pagani-2025-huayra-codalunga-speedster',
};

// Enrichment for NCS nodes: override fields with correct metadata
const ENRICH = {
  'ncs-ferrari-2025-sc40':                     { isLimited: true, hp: 830, engineType: 'hybrid', label: 'Ferrari SC40', brandId: 'ferrari', brandName: 'Ferrari', zone: 'eu' },
  'ncs-lamborghini-2025-fenomeno':             { isLimited: true, hp: 1000, engineType: 'ICE', brandId: 'lamborghini', brandName: 'Lamborghini', zone: 'eu' },
  'ncs-koenigsegg-2025-sadairs-spear':         { isLimited: true, hp: 1700, engineType: 'hybrid', brandId: 'koenigsegg', brandName: 'Koenigsegg', bodyType: 'roadster', zone: 'eu' },
  'ncs-bugatti-2025-brouillard-bugatti':       { isLimited: true, hp: 1500, engineType: 'ICE', label: 'Bugatti Brouillard', brandId: 'bugatti', brandName: 'Bugatti', zone: 'eu' },
  'ncs-gordon-murray-2026-automotive-le-mans': { isLimited: true, hp: 650, engineType: 'ICE', label: 'GMA Le Mans GTR', brandId: 'gma', brandName: 'Gordon Murray Automotive', bodyType: 'coupe', zone: 'uk' },
  'ncs-lamborghini-2026-revuelto-impavido':    { isLimited: true, hp: 1001, engineType: 'hybrid', brandId: 'lamborghini', brandName: 'Lamborghini', zone: 'eu' },
  'ncs-lamborghini-2026-temerario-ad-personam':{ isLimited: true, hp: 920,  engineType: 'hybrid', brandId: 'lamborghini', brandName: 'Lamborghini', zone: 'eu' },
  'ncs-mercedes-2027-gls-680-maybach':         { hp: 558, engineType: 'ICE', brandId: 'mercedes', brandName: 'Mercedes-Benz', bodyType: 'suv', zone: 'eu' },
  'ncs-volkswagen-2027-id-cross':              { engineType: 'EV', isFuture: true, brandId: 'volkswagen', brandName: 'Volkswagen', bodyType: 'crossover', zone: 'eu' },
  'ncs-pagani-2025-huayra-codalunga-speedster':{ isLimited: true, hp: 864, engineType: 'ICE', brandId: 'pagani', brandName: 'Pagani', bodyType: 'roadster', zone: 'eu' },
};

const toRemove = new Set(Object.keys(REDIRECT));
const ncsIds   = new Set(Object.values(REDIRECT));

// 1. Apply enrichment to NCS nodes
let enriched = 0;
for (const node of g.nodes) {
  if (ENRICH[node.id]) {
    Object.assign(node, ENRICH[node.id]);
    enriched++;
    console.log(`ENRICH ${node.id}`);
  }
}

// 2. Redirect edges: replace source/target from manual ID → NCS ID
let redirected = 0;
for (const edge of g.edges) {
  let changed = false;
  if (REDIRECT[edge.source]) { edge.source = REDIRECT[edge.source]; changed = true; }
  if (REDIRECT[edge.target]) { edge.target = REDIRECT[edge.target]; changed = true; }
  if (changed) { redirected++; console.log(`REDIRECT edge ${edge.id} → (${edge.source} -> ${edge.target})`); }
}

// 3. Remove duplicate manual nodes
const beforeN = g.nodes.length;
g.nodes = g.nodes.filter(n => !toRemove.has(n.id));
const removedN = beforeN - g.nodes.length;
console.log(`\nRemoved ${removedN} duplicate manual nodes`);

// 4. Remove any duplicate edges (same source+target+type after redirect)
const edgeKey = e => `${e.source}||${e.target}||${e.type}`;
const seenEdges = new Set();
const beforeE = g.edges.length;
g.edges = g.edges.filter(e => {
  const k = edgeKey(e);
  if (seenEdges.has(k)) return false;
  seenEdges.add(k);
  return true;
});
console.log(`Removed ${beforeE - g.edges.length} duplicate edges`);

// 5. Verify all edge endpoints exist
const nodeIds = new Set(g.nodes.map(n => n.id));
const broken = g.edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
if (broken.length) {
  console.error('BROKEN edges:', broken.map(e => e.id).join(', '));
  g.edges = g.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  console.log(`Removed ${broken.length} broken edges`);
}

console.log(`\nFinal: ${g.nodes.length} nodes, ${g.edges.length} edges`);
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8');
console.log('Done.');
