const fs = require('fs');
const path = require('path');

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

let changes = [];

// ── Problem: two nodes for 2017 Alpine A110 ────────────────────────────────
// ren-alpine-a110   (brandId:renault, hp:249) — DUPLICATE
// alpine-a110-2017  (brandId:alpine,  hp:252) — CANONICAL
//
// Also duplicate R variants:
// ren-alpine-a110r  (brandId:renault, 2022, 300hp) — DUPLICATE
// alpine-a110-r     (brandId:alpine,  2022, 300hp) — CANONICAL
//
// Missing from Alpine family: S variant (2019, 292hp) only in renault chain
// Fix: rebrand ren-alpine-a110s → add to Alpine family as alpine-a110-s

// ── Step 1: rebrand ren-alpine-a110s → alpine-a110-s ──────────────────────
const sNode = g.nodes.find(n => n.id === 'ren-alpine-a110s');
if (sNode) {
  sNode.id       = 'alpine-a110-s';
  sNode.brandId  = 'alpine';
  sNode.brandName = 'Alpine';
  sNode.familyKey = 'alpine-a110-mod';
  changes.push('Rebrand ren-alpine-a110s → alpine-a110-s (brandId: alpine)');
  // update any edges referencing old id
  for (const e of g.edges) {
    if (e.source === 'ren-alpine-a110s') { e.source = 'alpine-a110-s'; changes.push(`  edge ${e.id} source updated`); }
    if (e.target === 'ren-alpine-a110s') { e.target = 'alpine-a110-s'; changes.push(`  edge ${e.id} target updated`); }
  }
}

// ── Step 2: remove ren-alpine-a110r (exact dup of alpine-a110-r) ──────────
const beforeNodes = g.nodes.length;
g.nodes = g.nodes.filter(n => n.id !== 'ren-alpine-a110r');
if (g.nodes.length < beforeNodes) changes.push('Removed duplicate node ren-alpine-a110r');

// Remove edges referencing ren-alpine-a110r
const beforeEdges = g.edges.length;
g.edges = g.edges.filter(e => e.source !== 'ren-alpine-a110r' && e.target !== 'ren-alpine-a110r');
if (g.edges.length < beforeEdges) changes.push(`Removed ${beforeEdges - g.edges.length} edges for ren-alpine-a110r`);

// ── Step 3: remove ren-alpine-a110 (dup of alpine-a110-2017) ─────────────
const before2 = g.nodes.length;
g.nodes = g.nodes.filter(n => n.id !== 'ren-alpine-a110');
if (g.nodes.length < before2) changes.push('Removed duplicate node ren-alpine-a110');

// Remove old e-ren-a110-s edge (source was ren-alpine-a110, now dangling)
const before3 = g.edges.length;
g.edges = g.edges.filter(e => e.id !== 'e-ren-a110-s' && e.source !== 'ren-alpine-a110' && e.target !== 'ren-alpine-a110');
if (g.edges.length < before3) changes.push(`Removed ${before3 - g.edges.length} edges for ren-alpine-a110`);

// ── Step 4: rewire Alpine S into Alpine family ─────────────────────────────
const edgeIds = new Set(g.edges.map(e => e.id));

// alpine-a110-2017 → alpine-a110-s (variant_of)
if (!edgeIds.has('e-alp-a110-2017-s')) {
  g.edges.push({ id: 'e-alp-a110-2017-s', source: 'alpine-a110-2017', target: 'alpine-a110-s', type: 'variant_of', strength: 0.88 });
  changes.push('NEW EDGE: alpine-a110-2017 → alpine-a110-s (variant_of)');
}

// alpine-a110-s → alpine-a110-r (variant_of) — was ren-alpine-a110s→ren-alpine-a110r, now canonical chain
if (!edgeIds.has('e-alp-a110-s-r')) {
  g.edges.push({ id: 'e-alp-a110-s-r', source: 'alpine-a110-s', target: 'alpine-a110-r', type: 'variant_of', strength: 0.88 });
  changes.push('NEW EDGE: alpine-a110-s → alpine-a110-r (variant_of)');
}

// remove old e-ren-a110s-r (was ren-a110s→ren-a110r, now replaced by e-alp-a110-s-r)
const before4 = g.edges.length;
g.edges = g.edges.filter(e => e.id !== 'e-ren-a110s-r');
if (g.edges.length < before4) changes.push('Removed old edge e-ren-a110s-r (replaced)');

// ── Save + report ──────────────────────────────────────────────────────────

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8');
console.log(`\nAlpine A110 duplicate fixes (${changes.length}):`);
changes.forEach(c => console.log(' ', c));
console.log(`\nGraph: ${g.nodes.length} nodes, ${g.edges.length} edges`);
