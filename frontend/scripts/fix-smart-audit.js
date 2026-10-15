const fs = require('fs');
const path = require('path');

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

let changes = [];

for (const e of g.edges) {

  // Issue 3: fortwo-2 → forfour-2 derived_from → fortwo-3 shares_platform
  if (e.source === 'smart-fortwo-2' && e.target === 'smart-forfour-2') {
    changes.push(`FIX: smart-fortwo-2→forfour-2 source → smart-fortwo-3, type derived_from → shares_platform`);
    e.source = 'smart-fortwo-3';
    e.type   = 'shares_platform';
    e.strength = 0.92;
  }

  // Issue 4: forfour-1 → forfour-2 evolution → spiritual_successor
  if (e.source === 'smart-forfour-1' && e.target === 'smart-forfour-2') {
    changes.push(`FIX: smart-forfour-1→forfour-2 type evolution → spiritual_successor`);
    e.type = 'spiritual_successor';
    e.strength = 0.55;
  }

  // Issue 2: fortwo-1 → forfour-1 derived_from → inspired_by (brand-only link)
  if (e.source === 'smart-fortwo-1' && e.target === 'smart-forfour-1') {
    changes.push(`FIX: smart-fortwo-1→forfour-1 type derived_from → inspired_by (no platform overlap)`);
    e.type     = 'inspired_by';
    e.strength = 0.40;
  }
}

// Issue 1: remove redundant Gen.1 → Gen.3 direct evolves_into (skips Gen.2)
const before = g.edges.length;
g.edges = g.edges.filter(e => e.id !== 'e-sma-fw1-fw3');
// also remove by source/target in case id is different
const before2 = g.edges.length;
g.edges = g.edges.filter(e => !(e.source === 'smart-fortwo-1' && e.target === 'smart-fortwo-3' && e.type === 'evolves_into'));
const removed = before - g.edges.length;
if (removed > 0) changes.push(`REMOVED ${removed} redundant Gen.1→Gen.3 evolves_into edge(s)`);

// Issue 5: add missing shares_platform between fortwo-3 ↔ forfour-2
const edgeIds = new Set(g.edges.map(e => e.id));
if (!edgeIds.has('e-sma-fw3-ff2-platform')) {
  g.edges.push({
    id: 'e-sma-fw3-ff2-platform',
    source: 'smart-fortwo-3',
    target: 'smart-forfour-2',
    type: 'shares_platform',
    strength: 0.92,
    label: 'W453 platform'
  });
  changes.push('NEW EDGE: smart-fortwo-3 ↔ smart-forfour-2 (shares_platform W453)');
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8');
console.log(`\nSmart audit fixes (${changes.length}):`);
changes.forEach(c => console.log(' ', c));
console.log(`\nGraph: ${g.nodes.length} nodes, ${g.edges.length} edges`);
