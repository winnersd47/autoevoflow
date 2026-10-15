const fs = require('fs');
const path = require('path');

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

let changes = [];

// ── Node fixes ─────────────────────────────────────────────────────────────

for (const n of g.nodes) {

  // 1. ferrari-roma-node: bodyType, zone, modelSlug
  if (n.id === 'ferrari-roma-node') {
    if (n.bodyType !== 'coupe') {
      changes.push(`roma: bodyType ${n.bodyType} → coupe`);
      n.bodyType = 'coupe';
    }
    if (n.zone !== 'gt_coupe') {
      changes.push(`roma: zone ${n.zone} → gt_coupe`);
      n.zone = 'gt_coupe';
    }
    if (n.modelSlug !== 'ferrari-roma') {
      changes.push(`roma: modelSlug ${n.modelSlug} → ferrari-roma`);
      n.modelSlug = 'ferrari-roma';
    }
  }

  // 2. ferrari-daytona-sp3: modelSlug
  if (n.id === 'ferrari-daytona-sp3') {
    if (n.modelSlug !== 'ferrari-daytona-sp3') {
      changes.push(`daytona-sp3: modelSlug ${n.modelSlug} → ferrari-daytona-sp3`);
      n.modelSlug = 'ferrari-daytona-sp3';
    }
  }

  // 3. ferrari-849-testarossa: add zone + familyKey
  if (n.id === 'ferrari-849-testarossa') {
    if (!n.zone) {
      changes.push(`849-testarossa: add zone=supercar`);
      n.zone = 'supercar';
    }
    if (!n.familyKey) {
      changes.push(`849-testarossa: add familyKey=fe-testarossa`);
      n.familyKey = 'fe-testarossa';
    }
  }
}

// ── Edge fixes ─────────────────────────────────────────────────────────────

for (const e of g.edges) {

  // 4. fg-2: portofino → roma, shares_platform → evolves_into
  if (e.id === 'fg-2') {
    if (e.type !== 'evolves_into') {
      changes.push(`fg-2: type ${e.type} → evolves_into (portofino→roma)`);
      e.type = 'evolves_into';
      e.strength = 0.82;
    }
  }

  // 5. Reverse ferrari-849-tr-insp-512m: was (849→512m), fix to (512m→849)
  if (e.id === 'ferrari-849-tr-insp-512m') {
    if (e.source === 'ferrari-849-testarossa') {
      changes.push(`849-tr-insp-512m: reverse direction → ferrari-512m→ferrari-849-testarossa`);
      e.source = 'ferrari-512m';
      e.target = 'ferrari-849-testarossa';
    }
  }
}

// ── New edges ──────────────────────────────────────────────────────────────

const edgeIds = new Set(g.edges.map(e => e.id));

// 6. ferrari-testarossa → ferrari-849-testarossa, inspired_by
if (!edgeIds.has('fe-testarossa-849-insp')) {
  // verify both nodes exist
  const src = g.nodes.find(n => n.id === 'ferrari-testarossa');
  const tgt = g.nodes.find(n => n.id === 'ferrari-849-testarossa');
  if (src && tgt) {
    g.edges.push({
      id: 'fe-testarossa-849-insp',
      source: 'ferrari-testarossa',
      target: 'ferrari-849-testarossa',
      type: 'inspired_by',
      strength: 0.88
    });
    changes.push('NEW EDGE: ferrari-testarossa → ferrari-849-testarossa (inspired_by)');
  } else {
    changes.push(`SKIP fe-testarossa-849: src=${!!src} tgt=${!!tgt}`);
  }
}

// 7. ferrari-daytona-sp3 → ferrari-daytona-365, inspired_by
if (!edgeIds.has('fe-dsp3-1')) {
  const src = g.nodes.find(n => n.id === 'ferrari-daytona-sp3');
  const tgt = g.nodes.find(n => n.id === 'ferrari-daytona-365');
  if (src && tgt) {
    g.edges.push({
      id: 'fe-dsp3-1',
      source: 'ferrari-daytona-365',
      target: 'ferrari-daytona-sp3',
      type: 'inspired_by',
      strength: 0.82
    });
    changes.push('NEW EDGE: ferrari-daytona-365 → ferrari-daytona-sp3 (inspired_by)');
  } else {
    // Try alternate IDs
    const altSrc = g.nodes.find(n => n.id.includes('daytona') && n.year < 1980);
    if (altSrc) {
      g.edges.push({
        id: 'fe-dsp3-1',
        source: altSrc.id,
        target: 'ferrari-daytona-sp3',
        type: 'inspired_by',
        strength: 0.82
      });
      changes.push(`NEW EDGE: ${altSrc.id} → ferrari-daytona-sp3 (inspired_by)`);
    } else {
      changes.push(`SKIP fe-dsp3-1: ferrari-daytona-365 not found (src=${!!src})`);
    }
  }
}

// ── Save + report ──────────────────────────────────────────────────────────

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8');
console.log(`\nFerrari audit fixes applied (${changes.length}):`);
changes.forEach(c => console.log(' ', c));
console.log(`\nGraph: ${g.nodes.length} nodes, ${g.edges.length} edges`);
