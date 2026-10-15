const fs = require('fs');
const path = require('path');

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

let changes = [];

for (const e of g.edges) {

  // ── smart: "evolution" → "evolves_into" ──────────────────────────────────
  if (e.type === 'evolution') {
    changes.push(`FIX type: evolution → evolves_into  [${e.id ?? e.source+'→'+e.target}]`);
    e.type = 'evolves_into';
    if (!e.strength) e.strength = 0.85;
  }

  // ── smart: "spiritual_successor" → valid type ────────────────────────────
  if (e.type === 'spiritual_successor') {
    // Fortwo Gen.3 → Smart #1 EV: brand/product relaunch, use derived_from
    // Forfour Gen.1 → Forfour Gen.2: name-only revival, use inspired_by
    const newType = (e.source === 'smart-fortwo-3' && e.target === 'smart-1')
      ? 'derived_from'
      : 'inspired_by';
    changes.push(`FIX type: spiritual_successor → ${newType}  [${e.id ?? e.source+'→'+e.target}]`);
    e.type = newType;
    e.strength = newType === 'derived_from' ? 0.70 : 0.45;
  }

  // ── Alpine: inspired_by A610→A110 2017 → evolves_into ───────────────────
  // Без этого A110 2017 получает depth через коррекцию ПОСЛЕ variant-propagation,
  // поэтому S/R наследуют depth=0, а не depth(A110 2017).
  // evolves_into даёт A110 2017 depth=4 в основном цикле → S/R тоже depth=4.
  if (e.id === 'e-alp-a610-a110mod') {
    changes.push(`FIX Alpine: e-alp-a610-a110mod inspired_by → evolves_into (fixes S/R depth)`);
    e.type = 'evolves_into';
    e.strength = 0.72;
  }

  // ── platform_basis → shares_platform ────────────────────────────────────
  if (e.type === 'platform_basis') {
    changes.push(`FIX type: platform_basis → shares_platform  [${e.id ?? e.source+'→'+e.target}]`);
    e.type = 'shares_platform';
    if (!e.strength) e.strength = 0.75;
  }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8');
console.log(`\nEdge-type fixes (${changes.length}):`);
changes.forEach(c => console.log(' ', c));
console.log(`\nGraph: ${g.nodes.length} nodes, ${g.edges.length} edges`);
