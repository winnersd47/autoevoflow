const fs = require('fs');
const path = require('path');

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

// Nodes confirmed to be concepts but missing isConcept: true
const MISSING_CONCEPT_FLAG = new Set([
  'jag-cx75',
  'rimac-concept1',
  'bentley-exp9f',
  'bentley-exp10-speed6',
  'bentley-exp100gt',
  'gen-magma-gt',
  'toyota-ft1',
  'hyundai-45-concept',
  'kia-ev9-concept',
  'vw-id-buzz-concept',
  'genesis-x-concept',
]);

let changes = [];

for (const n of g.nodes) {
  if (MISSING_CONCEPT_FLAG.has(n.id)) {
    n.isConcept = true;
    changes.push(`SET isConcept=true: ${n.id} (${n.label}, ${n.year})`);
  }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8');
console.log(`\nConcept flag fixes (${changes.length}):`);
changes.forEach(c => console.log(' ', c));
console.log(`\nGraph: ${g.nodes.length} nodes, ${g.edges.length} edges`);
