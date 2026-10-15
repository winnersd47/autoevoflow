#!/usr/bin/env node
// Batch-add new nodes discovered from NCS + A777 sources
// Run: node scripts/add-sources-nodes.js

'use strict';
const fs   = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json');
const graph      = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

const existingIds     = new Set(graph.nodes.map(n => n.id));
const existingEdgeIds = new Set(graph.edges.map(e => e.id));

let addedNodes = 0, addedEdges = 0, skippedNodes = 0, skippedEdges = 0;

function addNode(node) {
  if (existingIds.has(node.id)) { skippedNodes++; console.log(`SKIP node: ${node.id}`); return; }
  graph.nodes.push(node);
  existingIds.add(node.id);
  addedNodes++;
  console.log(`ADD  node: ${node.id} | ${node.label} (${node.year})`);
}

function addEdge(edge) {
  if (existingEdgeIds.has(edge.id)) { skippedEdges++; return; }
  if (!existingIds.has(edge.source)) { console.warn(`WARN edge missing source ${edge.source}: ${edge.id}`); return; }
  if (!existingIds.has(edge.target)) { console.warn(`WARN edge missing target ${edge.target}: ${edge.id}`); return; }
  graph.edges.push(edge);
  existingEdgeIds.add(edge.id);
  addedEdges++;
  console.log(`ADD  edge: ${edge.id} (${edge.type})`);
}

// ─── 1. Naran Hyper Coupe 2024 — British hypercar brand ──────────────────────
addNode({
  id: 'naran-hyper-coupe', label: 'Naran Hyper Coupe',
  brandId: 'naran', brandName: 'Naran', modelSlug: 'hyper-coupe',
  type: 'generation', year: 2024, hp: 1048, engineType: 'hybrid',
  bodyType: 'coupe', segment: 'hypercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'uk', familyKey: 'naran-hyper-coupe',
});
// Inspired by McLaren P1 / Ferrari LaFerrari philosophy
addEdge({
  id: 'naran-hyper-inspired-mcl-p1', source: 'naran-hyper-coupe', target: 'mclaren-p1',
  type: 'inspired_by', strength: 0.45, label: null,
});

// ─── 2. Ferrari SC40 2025 — one-off Scaglietti special ───────────────────────
addNode({
  id: 'ferrari-sc40', label: 'Ferrari SC40',
  brandId: 'ferrari', brandName: 'Ferrari', modelSlug: 'sc40',
  type: 'generation', year: 2025, hp: 830, engineType: 'hybrid',
  bodyType: 'coupe', segment: 'supercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'ferrari-xx',
});
addEdge({
  id: 'ferrari-sf90-sc40-variant', source: 'ferrari-sf90', target: 'ferrari-sc40',
  type: 'derived_from', strength: 0.75, label: null,
});

// ─── 3. Lamborghini Fenomeno 2025 — one-off V12 tribute ─────────────────────
addNode({
  id: 'lambo-fenomeno', label: 'Lamborghini Fenomeno',
  brandId: 'lamborghini', brandName: 'Lamborghini', modelSlug: 'fenomeno',
  type: 'generation', year: 2025, hp: 1000, engineType: 'ICE',
  bodyType: 'coupe', segment: 'hypercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'lamborghini-limited',
});
addEdge({
  id: 'lambo-revo-fenomeno-inspired', source: 'lamborghini-revo', target: 'lambo-fenomeno',
  type: 'derived_from', strength: 0.65, label: null,
});
addEdge({
  id: 'lambo-cnt-fenomeno-inspired', source: 'lamborghini-cnt', target: 'lambo-fenomeno',
  type: 'inspired_by', strength: 0.55, label: null,
});

// ─── 4. Koenigsegg Sadairs Spear 2025 — bespoke commission ──────────────────
addNode({
  id: 'kgsegg-sadairs-spear', label: 'Koenigsegg Sadairs Spear',
  brandId: 'koenigsegg', brandName: 'Koenigsegg', modelSlug: 'sadairs-spear',
  type: 'generation', year: 2025, hp: 1700, engineType: 'hybrid',
  bodyType: 'roadster', segment: 'hypercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'koenigsegg-bespoke',
});
addEdge({
  id: 'kgsegg-cc850-sadairs-derived', source: 'kgsegg-cc850', target: 'kgsegg-sadairs-spear',
  type: 'derived_from', strength: 0.70, label: null,
});

// ─── 5. Bugatti Brouillard 2025 — bespoke Sur Mesure edition ────────────────
addNode({
  id: 'bugatti-brouillard', label: 'Bugatti Brouillard',
  brandId: 'bugatti', brandName: 'Bugatti', modelSlug: 'brouillard',
  type: 'generation', year: 2025, hp: 1500, engineType: 'ICE',
  bodyType: 'coupe', segment: 'hypercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'bugatti-limited',
});
addEdge({
  id: 'bugatti-chiron-brouillard-derived', source: 'bugatti-chiron', target: 'bugatti-brouillard',
  type: 'derived_from', strength: 0.80, label: null,
});

// ─── 6. GMA Le Mans GTR 2026 — track-only hypercar ───────────────────────────
addNode({
  id: 'gma-le-mans-gtr', label: 'GMA Le Mans GTR',
  brandId: 'gma', brandName: 'Gordon Murray Automotive', modelSlug: 'le-mans-gtr',
  type: 'generation', year: 2026, hp: 650, engineType: 'ICE',
  bodyType: 'coupe', segment: 'racecar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'uk', familyKey: 'gma-t50',
});
addEdge({
  id: 'gma-t50s-lemans-derived', source: 'gma-t50s', target: 'gma-le-mans-gtr',
  type: 'derived_from', strength: 0.85, label: null,
});

// ─── 7. Lamborghini Revuelto Impavido 2026 — Ad Personam limited ─────────────
addNode({
  id: 'lambo-revo-impavido', label: 'Lamborghini Revuelto Impavido',
  brandId: 'lamborghini', brandName: 'Lamborghini', modelSlug: 'revuelto-impavido',
  type: 'generation', year: 2026, hp: 1001, engineType: 'hybrid',
  bodyType: 'coupe', segment: 'supercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'lamborghini-aventador',
});
addEdge({
  id: 'lambo-revo-impavido-variant', source: 'lamborghini-revo', target: 'lambo-revo-impavido',
  type: 'variant_of', strength: 0.90, label: null,
});

// ─── 8. Lamborghini Temerario Ad Personam 2026 ───────────────────────────────
addNode({
  id: 'lambo-temerario-ap', label: 'Lamborghini Temerario Ad Personam',
  brandId: 'lamborghini', brandName: 'Lamborghini', modelSlug: 'temerario-ap',
  type: 'generation', year: 2026, hp: 920, engineType: 'hybrid',
  bodyType: 'coupe', segment: 'supercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'lamborghini-huracan',
});
addEdge({
  id: 'lambo-temerario-ap-variant', source: 'lambo-temerario', target: 'lambo-temerario-ap',
  type: 'variant_of', strength: 0.90, label: null,
});

// ─── 9. Maybach GLS 680 2027 — flagship SUV update ───────────────────────────
addNode({
  id: 'merc-maybach-gls680', label: 'Maybach GLS 680',
  brandId: 'mercedes', brandName: 'Mercedes-Benz', modelSlug: 'gls-680',
  type: 'generation', year: 2027, hp: 558, engineType: 'ICE',
  bodyType: 'suv', segment: 'luxury-suv',
  isFacelift: false, isConcept: false, isFuture: false,
  imageUrl: null, zone: 'eu', familyKey: 'mercedes-gls',
});
addEdge({
  id: 'merc-gls600-680-evolves', source: 'merc-maybach-gls600', target: 'merc-maybach-gls680',
  type: 'evolves_into', strength: 0.88, label: null,
});

// ─── 10. Volkswagen ID.Cross 2027 — compact EV crossover ────────────────────
addNode({
  id: 'vw-id-cross', label: 'Volkswagen ID.Cross',
  brandId: 'volkswagen', brandName: 'Volkswagen', modelSlug: 'id-cross',
  type: 'generation', year: 2027, hp: null, engineType: 'EV',
  bodyType: 'crossover', segment: 'compact-suv',
  isFacelift: false, isConcept: false, isFuture: true,
  imageUrl: null, zone: 'eu', familyKey: 'volkswagen-id',
});
addEdge({
  id: 'vw-id2all-idcross-concept', source: 'vw-id2all', target: 'vw-id-cross',
  type: 'concept_to_production', strength: 0.72, label: null,
});
addEdge({
  id: 'vw-id3-idcross-platform', source: 'vw-id3', target: 'vw-id-cross',
  type: 'shares_platform', strength: 0.60, label: null,
});

// ─── 11. Dacia Striker 2027 — EV-only global model ──────────────────────────
addNode({
  id: 'dacia-striker', label: 'Dacia Striker',
  brandId: 'dacia', brandName: 'Dacia', modelSlug: 'striker',
  type: 'generation', year: 2027, hp: null, engineType: 'EV',
  bodyType: 'suv', segment: 'compact-suv',
  isFacelift: false, isConcept: false, isFuture: true,
  imageUrl: null, zone: 'eu', familyKey: 'dacia-striker',
});
addEdge({
  id: 'dacia-duster2-striker-inspired', source: 'dacia-duster-2', target: 'dacia-striker',
  type: 'inspired_by', strength: 0.50, label: null,
});

// ─── 12. Lexus LFA Concept 2025 — spiritual successor concept ───────────────
addNode({
  id: 'lexus-lfa-concept-2025', label: 'Lexus LFA Concept',
  brandId: 'lexus', brandName: 'Lexus', modelSlug: 'lfa',
  type: 'generation', year: 2025, hp: null, engineType: 'EV',
  bodyType: 'coupe', segment: 'supercar',
  isFacelift: false, isConcept: true, isFuture: false,
  imageUrl: null, zone: 'jp', familyKey: 'lexus-lfa',
});
addEdge({
  id: 'lexus-lfa-2025-from-xf10', source: 'lexus-lfa-xf10', target: 'lexus-lfa-concept-2025',
  type: 'inspired_by', strength: 0.85, label: null,
});

// ─── 13. Pagani Huayra Codalunga Speedster 2025 ──────────────────────────────
addNode({
  id: 'pagani-huayra-codalunga-s', label: 'Huayra Codalunga Speedster',
  brandId: 'pagani', brandName: 'Pagani', modelSlug: 'huayra-codalunga-speedster',
  type: 'generation', year: 2025, hp: 864, engineType: 'ICE',
  bodyType: 'roadster', segment: 'hypercar',
  isFacelift: false, isConcept: false, isFuture: false, isLimited: true,
  imageUrl: null, zone: 'eu', familyKey: 'pagani-huayra',
});
addEdge({
  id: 'pagani-huayra-r-codalungas', source: 'pagani-huayra-r', target: 'pagani-huayra-codalunga-s',
  type: 'variant_of', strength: 0.80, label: null,
});

// ─── 14. BAIC Taitan 700 2026 — Chinese body-on-frame pickup ─────────────────
addNode({
  id: 'baic-taitan-700', label: 'BAIC Taitan 700',
  brandId: 'baic', brandName: 'BAIC', modelSlug: 'taitan-700',
  type: 'generation', year: 2026, hp: 300, engineType: 'PHEV',
  bodyType: 'pickup', segment: 'truck',
  isFacelift: false, isConcept: false, isFuture: false,
  imageUrl: null, zone: 'cn', familyKey: 'baic-taitan',
});

// ─── 15. DS No7 2027 — luxury EV fastback ───────────────────────────────────
addNode({
  id: 'ds-no7-2027', label: 'DS No7',
  brandId: 'ds', brandName: 'DS Automobiles', modelSlug: 'no7',
  type: 'generation', year: 2027, hp: null, engineType: 'EV',
  bodyType: 'fastback', segment: 'luxury',
  isFacelift: false, isConcept: false, isFuture: true,
  imageUrl: null, zone: 'eu', familyKey: 'ds-no7',
});

// ─── 16. MG GO Concept 2026 — new EV concept ─────────────────────────────────
addNode({
  id: 'mg-go-concept', label: 'MG GO Concept',
  brandId: 'mg', brandName: 'MG', modelSlug: 'go',
  type: 'generation', year: 2026, hp: null, engineType: 'EV',
  bodyType: 'suv', segment: 'compact-suv',
  isFacelift: false, isConcept: true, isFuture: false,
  imageUrl: null, zone: 'cn', familyKey: 'mg-go',
});

// ─── 17. Geely Galaxy TT 2027 — flagship EV coupe concept ────────────────────
addNode({
  id: 'geely-galaxy-tt', label: 'Geely Galaxy TT',
  brandId: 'geely', brandName: 'Geely', modelSlug: 'galaxy-tt',
  type: 'generation', year: 2027, hp: null, engineType: 'EV',
  bodyType: 'coupe', segment: 'sport',
  isFacelift: false, isConcept: true, isFuture: false,
  imageUrl: null, zone: 'cn', familyKey: 'geely-galaxy',
});
addEdge({
  id: 'geely-galaxy-l7-tt-inspired', source: 'geely-galaxy-l7', target: 'geely-galaxy-tt',
  type: 'inspired_by', strength: 0.50, label: null,
});

// ─── Save ─────────────────────────────────────────────────────────────────────
console.log(`\nAdded ${addedNodes} nodes, ${addedEdges} edges`);
console.log(`Skipped ${skippedNodes} nodes (already exist), ${skippedEdges} edges`);
console.log(`Total: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf8');
console.log('\nDone. graph.json updated.');
