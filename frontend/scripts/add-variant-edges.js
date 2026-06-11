// Converts relevant derived_from edges to variant_of and adds missing base→variant edges
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf8'));

// ── 1. Convert existing derived_from → variant_of where appropriate ───────────
// Rule: same brand, source is base model, target is official performance variant
const toVariant = new Set([
  // BMW M3 ← 3 Series (same gen)
  'm3-1',          // bmw-e30 → bmw-m3-e30
  // BMW M5 ← 5 Series (same gen)
  'bmw-m5-1',      // bmw-5-e28 → bmw-m5-e28
  'bmw-m5-3',      // bmw-5-e34 → bmw-m5-e34
  'bmw-m5-5',      // bmw-5-e39 → bmw-m5-e39
  'bmw-m5-7',      // bmw-5-e60 → bmw-m5-e60
  'bmw-m5-9',      // bmw-5-f10 → bmw-m5-f10
  'bmw-m5-11',     // bmw-5-g30 → bmw-m5-g30
  // BMW M4 ← 4 Series (same gen)
  'bmw-4-4',       // bmw-4-f32 → bmw-m4-f82
  'bmw-4-5',       // bmw-4-g22 → bmw-m4-g82
  // Porsche GT3 / Turbo (same gen chassis)
  'pt-1',          // p911-g → p911-turbo-930
  'pg-1',          // p911-996 → p911-gt3-996
  // Audi RS4 ← A4
  'au-a4-rs1',     // audi-a4b5 → audi-rs4-b5
  // Lamborghini limited variants ← Aventador
  'la-h1',         // lamborghini-aven → lambo-veneno
  'la-h2',         // lamborghini-aven → lambo-centenario
  // Ferrari 288 GTO ← 308 body
  'fhx-1',         // ferrari-308 → ferrari-288gto
]);

let converted = 0;
g.edges.forEach(e => {
  if (toVariant.has(e.id) && e.type === 'derived_from') {
    e.type = 'variant_of';
    converted++;
  }
});
console.log('Converted derived_from → variant_of:', converted);

// ── 2. Add missing base → variant edges not yet in graph ───────────────────────
const newVariants = [
  // BMW M3 — missing per-gen connections
  { id:'vm3-e36', source:'bmw-e36', target:'bmw-m3-e36', strength:0.88 },   // same class
  { id:'vm3-e46', source:'bmw-e46', target:'bmw-m3-e46', strength:0.88 },
  { id:'vm3-e90', source:'bmw-e90', target:'bmw-m3-e92', strength:0.88 },   // E90 base → E92 M3 coupe = same era
  { id:'vm3-g20', source:'bmw-g20', target:'bmw-m3-g80', strength:0.88 },
  // BMW M2 ← 2 Series (compact M heritage) — class elevating
  { id:'vm2-f87', source:'bmw-m2-f87', target:'bmw-m2-g87', strength:0.90 }, // already evolves_into
  // Porsche GT3 per generation
  { id:'vgt3-997',  source:'p911-997', target:'p911-gt3-997',  strength:0.85 }, // 997 → GT3 997 (track variant)
  { id:'vgt3-991',  source:'p911-991', target:'p911-gt3-991',  strength:0.85 },
  { id:'vgt3-992',  source:'p911-992', target:'p911-gt3-992',  strength:0.85 },
  // Porsche 911 Turbo per generation
  { id:'vtur-964',  source:'p911-964', target:'p911-turbo-964t', strength:0.88 },
  { id:'vtur-993',  source:'p911-993', target:'p911-turbo-993t', strength:0.88 },
  { id:'vtur-992',  source:'p911-992', target:'p911-turbo-992t', strength:0.90 }, // same class
  // Porsche Cayman ← Boxster (body variant: roadster → coupe, same class)
  { id:'vcay-987', source:'porsche-box-987', target:'porsche-cay-987', strength:0.92 },
  { id:'vcay-981', source:'porsche-box-981', target:'porsche-cay-981', strength:0.92 },
  { id:'vcay-718', source:'porsche-box-718', target:'porsche-cay-718', strength:0.92 },
  // Audi RS4 B7 and B9
  { id:'vrs4-b7', source:'audi-a4b6', target:'audi-rs4-b7', strength:0.88 },
  { id:'vrs4-b9', source:'audi-a4b9', target:'audi-rs4-b9', strength:0.88 },
  // Ferrari F8 ← 488 (official updated variant, same gen philosophy)
  // already evolves_into — skip
  // Lamborghini Huracán STO / Performante would be here if we had those nodes
  // Porsche 918 ← Carrera GT philosophy (different gen but hypercar lineage)
  // already handled by ph-1/ph-2
  // BMW 8 Series M8 ← 8 Series
  { id:'vm8-g15', source:'bmw-8-g15', target:'bmw-m8-g15', strength:0.85 }, // M8 = elevated GT class
];

const existingIds = new Set(g.edges.map(e => e.id));
let added = 0;
newVariants.forEach(v => {
  if (!existingIds.has(v.id)) {
    // Verify both nodes exist
    const nodeIds = new Set(g.nodes.map(n => n.id));
    if (nodeIds.has(v.source) && nodeIds.has(v.target)) {
      g.edges.push({ id: v.id, source: v.source, target: v.target, type: 'variant_of', strength: v.strength });
      added++;
    } else {
      console.warn('  Skipped (missing node):', v.id, v.source, '->', v.target);
    }
  }
});
console.log('New variant_of edges added:', added);

fs.writeFileSync(path, JSON.stringify(g, null, 2));

// Summary
const variantEdges = g.edges.filter(e => e.type === 'variant_of');
console.log('Total variant_of edges in graph:', variantEdges.length);
console.log('Total graph: nodes:', g.nodes.length, '| edges:', g.edges.length);
