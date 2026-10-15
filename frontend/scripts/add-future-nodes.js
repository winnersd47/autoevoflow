#!/usr/bin/env node
// Add future/upcoming nodes to evolution graph
// Revealed nodes (official photos): Porsche 718 EV Boxster/Cayman (April 2024 reveal)
// isFuture nodes (announced, no design photos yet): GT-R R36, NSX Gen3, M2 EV, Urus EV

const fs = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json');
const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

const existingIds = new Set(graph.nodes.map(n => n.id));
const existingEdgeIds = new Set(graph.edges.map(e => e.id));

const newNodes = [];
const newEdges = [];

function addNode(node) {
  if (existingIds.has(node.id)) {
    console.log(`SKIP node (exists): ${node.id}`);
    return;
  }
  newNodes.push(node);
  existingIds.add(node.id);
  console.log(`ADD node: ${node.id}`);
}

function addEdge(edge) {
  if (existingEdgeIds.has(edge.id)) {
    console.log(`SKIP edge (exists): ${edge.id}`);
    return;
  }
  // Verify source/target exist
  if (!existingIds.has(edge.source)) {
    console.warn(`SKIP edge (missing source ${edge.source}): ${edge.id}`);
    return;
  }
  if (!existingIds.has(edge.target)) {
    console.warn(`SKIP edge (missing target ${edge.target}): ${edge.id}`);
    return;
  }
  newEdges.push(edge);
  existingEdgeIds.add(edge.id);
  console.log(`ADD edge: ${edge.id} (${edge.type} ${edge.strength})`);
}

// ─── 1. Porsche 718 Boxster EV — officially revealed April 2024 ───────────────
// Direct EV successor to the 718 Boxster (982 generation). Full design revealed.
addNode({
  id: 'porsche-718-boxster-ev',
  label: 'Porsche 718 Boxster EV',
  brandId: 'porsche',
  brandName: 'Porsche',
  modelSlug: '718-boxster',
  type: 'generation',
  year: 2025,
  hp: 402,
  engineType: 'EV',
  bodyType: 'roadster',
  segment: 'sports',
  isFacelift: false,
  isConcept: false,
  isFuture: false,     // officially revealed with photos
  imageUrl: null,
  zone: 'eu',
  familyKey: 'porsche-718-boxster',
});

addEdge({
  id: 'porsche-box-718-ev-evolves',
  source: 'porsche-box-718',
  target: 'porsche-718-boxster-ev',
  type: 'evolves_into',
  strength: 0.90,
  label: null,
});

// ─── 2. Porsche 718 Cayman EV — officially revealed April 2024 ────────────────
addNode({
  id: 'porsche-718-cayman-ev',
  label: 'Porsche 718 Cayman EV',
  brandId: 'porsche',
  brandName: 'Porsche',
  modelSlug: '718-cayman',
  type: 'generation',
  year: 2025,
  hp: 402,
  engineType: 'EV',
  bodyType: 'coupe',
  segment: 'sports',
  isFacelift: false,
  isConcept: false,
  isFuture: false,     // officially revealed with photos
  imageUrl: null,
  zone: 'eu',
  familyKey: 'porsche-718-cayman',
});

addEdge({
  id: 'porsche-cay-718-ev-evolves',
  source: 'porsche-cay-718',
  target: 'porsche-718-cayman-ev',
  type: 'evolves_into',
  strength: 0.90,
  label: null,
});

addEdge({
  id: 'porsche-718-ev-boxster-cayman-variant',
  source: 'porsche-718-boxster-ev',
  target: 'porsche-718-cayman-ev',
  type: 'variant_of',
  strength: 0.95,
  label: null,
});

// ─── 3. Nissan GT-R R36 — confirmed for development, no design shown ──────────
// Nissan officially confirmed GT-R R36 is in development. No design photos yet.
addNode({
  id: 'nissan-gtr-r36',
  label: 'Nissan GT-R R36',
  brandId: 'nissan',
  brandName: 'Nissan',
  modelSlug: 'gt-r',
  type: 'generation',
  year: 2027,
  hp: null,
  engineType: null,
  bodyType: 'coupe',
  segment: 'supercar',
  isFacelift: false,
  isConcept: false,
  isFuture: true,      // announced, design not yet revealed
  imageUrl: null,
  zone: 'jp',
  familyKey: 'nissan-gt-r',
});

addEdge({
  id: 'nissan-gtr-r35-fl-r36-evolves',
  source: 'nissan-gtr-r35-fl',
  target: 'nissan-gtr-r36',
  type: 'evolves_into',
  strength: 0.88,
  label: null,
});

// ─── 4. Honda NSX Gen3 EV — confirmed by Honda, no design revealed ────────────
// Honda confirmed the NSX nameplate will return as a pure EV. No photos yet.
addNode({
  id: 'honda-nsx-gen3-ev',
  label: 'Honda NSX Gen3',
  brandId: 'honda',
  brandName: 'Honda',
  modelSlug: 'nsx',
  type: 'generation',
  year: 2028,
  hp: null,
  engineType: 'EV',
  bodyType: 'coupe',
  segment: 'supercar',
  isFacelift: false,
  isConcept: false,
  isFuture: true,      // confirmed comeback, no design photos
  imageUrl: null,
  zone: 'jp',
  familyKey: 'honda-nsx',
});

addEdge({
  id: 'honda-nsx-nc1-fl-gen3-evolves',
  source: 'honda-nsx-nc1-fl',
  target: 'honda-nsx-gen3-ev',
  type: 'evolves_into',
  strength: 0.82,
  label: null,
});

// ─── 5. BMW M2 EV (G87 successor) — confirmed, no design photos ──────────────
// BMW confirmed an electric M2 as part of Neue Klasse transition.
addNode({
  id: 'bmw-m2-ev',
  label: 'BMW M2 EV',
  brandId: 'bmw',
  brandName: 'BMW',
  modelSlug: 'm2',
  type: 'generation',
  year: 2027,
  hp: null,
  engineType: 'EV',
  bodyType: 'coupe',
  segment: 'sport',
  isFacelift: false,
  isConcept: false,
  isFuture: true,
  imageUrl: null,
  zone: 'eu',
  familyKey: 'bmw-m2',
});

// BMW M2 G87 (2023) → M2 EV
const bmwM2G87 = graph.nodes.find(n => n.id.includes('m2') && (n.id.includes('g87') || n.year === 2023) && n.brandId === 'bmw');
const bmwM2ParentId = bmwM2G87 ? bmwM2G87.id : 'bmw-m2-g87';
addEdge({
  id: `${bmwM2ParentId}-ev-evolves`,
  source: bmwM2ParentId,
  target: 'bmw-m2-ev',
  type: 'evolves_into',
  strength: 0.85,
  label: null,
});

// ─── 6. Lamborghini Urus EV — pure electric Urus confirmed for ~2029 ─────────
// Lamborghini announced full EV Urus to follow Urus SE PHEV. No design shown.
addNode({
  id: 'lambo-urus-ev',
  label: 'Lamborghini Urus EV',
  brandId: 'lamborghini',
  brandName: 'Lamborghini',
  modelSlug: 'urus',
  type: 'generation',
  year: 2029,
  hp: null,
  engineType: 'EV',
  bodyType: 'suv',
  segment: 'super-suv',
  isFacelift: false,
  isConcept: false,
  isFuture: true,
  imageUrl: null,
  zone: 'eu',
  familyKey: 'lamborghini-urus',
});

// Urus SE PHEV (ncs node 2027) → Urus EV. If ncs node exists, link from it; else from base Urus.
const urusSeNode = graph.nodes.find(n => n.id === 'ncs-lamborghini-2027-urus-se-performante');
const urusParentId = urusSeNode ? 'ncs-lamborghini-2027-urus-se-performante' : 'lambo-urus';
addEdge({
  id: `${urusParentId}-urus-ev-evolves`,
  source: urusParentId,
  target: 'lambo-urus-ev',
  type: 'evolves_into',
  strength: 0.80,
  label: null,
});

// ─── 7. Alfa Romeo GTV EV — announced 2023, no production design ─────────────
// Alfa Romeo confirmed a GTV coupe revival as part of their electrification plan.
addNode({
  id: 'alfa-gtv-ev',
  label: 'Alfa Romeo GTV EV',
  brandId: 'alfa-romeo',
  brandName: 'Alfa Romeo',
  modelSlug: 'gtv',
  type: 'generation',
  year: 2027,
  hp: null,
  engineType: 'EV',
  bodyType: 'coupe',
  segment: 'sport',
  isFacelift: false,
  isConcept: false,
  isFuture: true,
  imageUrl: null,
  zone: 'eu',
  familyKey: 'alfa-gtv',
});

addEdge({
  id: 'alfa-romeo-giulia-ev-gtv-inspired',
  source: 'alfa-gtv-ev',
  target: 'alfa-romeo-stelvio',
  type: 'shares_platform',
  strength: 0.65,
  label: null,
});

// ─── 8. Acura NSX Gen2 Successor / Type S EV — confirmed ─────────────────────
// Acura confirmed Type S EV hypercar concept (Precision EV). No production design.
addNode({
  id: 'acura-zsx-ev',
  label: 'Acura ZSX EV',
  brandId: 'acura',
  brandName: 'Acura',
  modelSlug: 'zsx',
  type: 'generation',
  year: 2028,
  hp: null,
  engineType: 'EV',
  bodyType: 'coupe',
  segment: 'supercar',
  isFacelift: false,
  isConcept: false,
  isFuture: true,
  imageUrl: null,
  zone: 'us',
  familyKey: 'acura-nsx',
});

addEdge({
  id: 'acura-nsx-2-zsx-evolves',
  source: 'acura-nsx-2',
  target: 'acura-zsx-ev',
  type: 'evolves_into',
  strength: 0.75,
  label: null,
});

// Also link to Honda NSX Gen3 (platform sharing expected)
addEdge({
  id: 'acura-zsx-honda-nsx-gen3-platform',
  source: 'honda-nsx-gen3-ev',
  target: 'acura-zsx-ev',
  type: 'shares_platform',
  strength: 0.85,
  label: null,
});

// ─── Apply ────────────────────────────────────────────────────────────────────
console.log(`\nNew nodes: ${newNodes.length}, new edges: ${newEdges.length}`);

graph.nodes.push(...newNodes);
graph.edges.push(...newEdges);

console.log(`Total: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf8');
console.log('\nDone. graph.json updated.');
