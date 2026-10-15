#!/usr/bin/env node
// Round 2 of graph audit fixes: Saturn, Smart, Rezvani, Hennessey Blackbird, Mini untangle.
'use strict';
const fs   = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]));

let added = 0, removed = 0, patched = 0;
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node ${!byId[source]?source:target}`); return; }
  if (g.edges.some(e => e.source === source && e.target === target && e.type === type)) { console.log(`SKIP edge (exists): ${id}`); return; }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra });
  added++; console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`);
};
const removeEdge = (id) => {
  const before = g.edges.length;
  g.edges = g.edges.filter(e => e.id !== id);
  if (g.edges.length < before) { removed++; console.log(`REMOVE edge ${id}`); }
};
const patchNode = (id, props) => {
  const n = byId[id];
  if (!n) { console.log(`SKIP patch — missing node ${id}`); return; }
  Object.assign(n, props); patched++; console.log(`PATCH ${id}`);
};

console.log('── SATURN ──');
addEdge('sat-sl-sc',      'saturn-sl', 'saturn-sc', 'variant_of');       // same S-Series gen, coupe body
addEdge('sat-sl-sw',      'saturn-sl', 'saturn-sw', 'variant_of');       // same S-Series gen, wagon body
addEdge('sat-sl-ion',     'saturn-sl', 'saturn-ion', 'evolves_into');    // S-Series replaced by Ion (2002/03)
addEdge('sat-vectra-ls',  'opel-vectra-b', 'saturn-ls', 'shares_platform'); // L-Series = GM2900, shared w/ Vectra B
addEdge('sat-ls-aura',    'saturn-ls', 'saturn-aura', 'evolves_into');   // L-Series replaced by Aura (2006/07)
addEdge('sat-vue-2',      'saturn-vue', 'saturn-vue-2', 'evolves_into');
addEdge('sat-astra-h',    'opel-astra-h', 'saturn-astra', 'rebadged_as'); // Saturn Astra = rebadged Opel Astra H
addEdge('sat-ion-astra',  'saturn-ion', 'saturn-astra', 'evolves_into'); // Astra replaced Ion in lineup (2007)
addEdge('sat-outlook-enclave', 'saturn-outlook', 'buick-enclave-1', 'shares_platform'); // GM Lambda siblings

console.log('── SMART ──');
addEdge('smt-fw1-2',      'smart-fortwo-1', 'smart-fortwo-2', 'evolves_into');
addEdge('smt-fw2-3',      'smart-fortwo-2', 'smart-fortwo-3', 'evolves_into');
addEdge('smt-fw1-roadster','smart-fortwo-1', 'smart-roadster', 'variant_of'); // shared MCC platform
addEdge('smt-fw1-ff1',     'smart-fortwo-1', 'smart-forfour-1', 'variant_of'); // sister body style, launched together
addEdge('smt-ff1-2',       'smart-forfour-1', 'smart-forfour-2', 'evolves_into'); // revived 2014 on new platform
addEdge('smt-fw3-1num',    'smart-fortwo-3', 'smart-1', 'evolves_into');   // ICE Fortwo succeeded by Smart #1 (EV era)
addEdge('smt-ff2-1num',    'smart-forfour-2', 'smart-1', 'evolves_into');  // Forfour succeeded by Smart #1 too
addEdge('smt-1-3',         'smart-1', 'smart-3', 'variant_of');            // same SEA platform, different body

console.log('── REZVANI (was mislabeled Hennessey in earlier audit) ──');
addEdge('rz-beast-x',        'rezvani-beast-gen1', 'rezvani-beast-x', 'variant_of');
addEdge('rz-beast-alpha',    'rezvani-beast-x', 'rezvani-beast-alpha', 'variant_of');
addEdge('rz-beast-alphax',   'rezvani-beast-alpha', 'rezvani-beast-alpha-x', 'variant_of');
addEdge('rz-beast-gen2',     'rezvani-beast-gen1', 'rezvani-beast-gen2', 'evolves_into'); // Beast 2024 = Gen2
addEdge('rz-retro-rr1',      'rezvani-beast-gen1', 'rezvani-retro-rr1', 'inspired_by');   // sibling sports car
addEdge('rz-jeepjk-tank',    'jeep-wrangler-jk', 'rezvani-tank-gen1', 'derived_from');    // Tank built on JK chassis
addEdge('rz-tank-military',  'rezvani-tank-gen1', 'rezvani-tank-military', 'variant_of');
addEdge('rz-tank-x',         'rezvani-tank-military', 'rezvani-tank-x', 'variant_of');
addEdge('rz-tank-hybrid',    'rezvani-tank-gen1', 'rezvani-tank-hybrid', 'variant_of');
addEdge('rz-tank-2026',      'rezvani-tank-gen1', 'rezvani-tank-2026', 'evolves_into');
addEdge('rz-tank-hercules',  'rezvani-tank-gen1', 'rezvani-hercules', 'derived_from');    // 6x6 big brother of Tank
addEdge('rz-hercules-mil',   'rezvani-hercules', 'rezvani-hercules-military', 'variant_of');
addEdge('rz-tank-vengeance', 'rezvani-tank-gen1', 'rezvani-vengeance', 'inspired_by');
addEdge('rz-tank-dune',      'rezvani-tank-gen1', 'rezvani-dune', 'inspired_by');
addEdge('rz-vengeance-fortress', 'rezvani-vengeance', 'rezvani-fortress', 'inspired_by');
addEdge('rz-beast-knight',   'rezvani-beast-gen1', 'rezvani-knight', 'inspired_by');

console.log('── HENNESSEY (Blackbird orphan) ──');
addEdge('henn-f5m-blackbird', 'ncs-hennessey-2027-venom-f5-m', 'ncs-hennessey-2030-blackbird', 'evolves_into');

console.log('── MINI (untangle R56/F56/JCW/SE) ──');
removeEdge('e-mini-01-se'); // WRONG: 2001 R50 -> 2019 Cooper SE direct, skips R56+F56 entirely
addEdge('mini-f56-se',    'mini-3door-f56', 'mini-cooper-se', 'variant_of'); // SE = electric trim of F56
addEdge('mini-jcw-to-r56','mini-jcw', 'mini-jcw-r56', 'evolves_into');       // tuning-kit era -> official R56 JCW trim
addEdge('mini-se-j01',    'mini-cooper-se', 'mini-cooper-j01', 'evolves_into'); // EV succeeds EV

console.log(`\nAdded: ${added}, Removed: ${removed}, Patched: ${patched}`);
console.log(`Total: ${g.nodes.length} nodes, ${g.edges.length} edges`);
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8');
console.log('Done.');
