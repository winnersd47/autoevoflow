/**
 * fill-gaps.js — adds all missing model lineages to evolution graph.json
 * Covers: Porsche 356, VW Beetle/Passat/ID, Mercedes A/SLK/CLK/C63,
 *         BMW 1/2 Series + M1, Ferrari 250GT/Mondial/512TR,
 *         Lamborghini LM002, Lotus Elan/Europa, SEAT/Skoda expansion
 */
const fs = require('fs');
const gPath = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const mDir  = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/models/';

const g = JSON.parse(fs.readFileSync(gPath, 'utf8'));
const nodeIds = new Set(g.nodes.map(n => n.id));
const edgeIds = new Set(g.edges.map(e => e.id));

function addNode(n) { if (!nodeIds.has(n.id)) { g.nodes.push(n); nodeIds.add(n.id); } }
function addEdge(e) {
  if (edgeIds.has(e.id)) return;
  if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
    console.warn('  ⚠ skip edge', e.id, ':', e.source, '->', e.target, '(missing node)'); return;
  }
  g.edges.push(e); edgeIds.add(e.id);
}

// Helper to read model file for slug
function readSlug(slug) {
  try { const d = JSON.parse(fs.readFileSync(mDir + slug + '.json', 'utf8')); return d.slug; }
  catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PORSCHE 356 — the original Porsche before 911
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'porsche-356-prea',label:'356 Pre-A',   year:1948,codeName:'356 Pre-A',   modelSlug:'porsche-356' },
  { id:'porsche-356-a',   label:'356 A',        year:1955,codeName:'356A',        modelSlug:'porsche-356' },
  { id:'porsche-356-b',   label:'356 B',        year:1959,codeName:'356B',        modelSlug:'porsche-356' },
  { id:'porsche-356-c',   label:'356 C/SC',     year:1963,codeName:'356C',        modelSlug:'porsche-356' },
].forEach(n => addNode({...n,type:'generation',brandId:'porsche',brandName:'Porsche'}));

[
  { id:'p356-1', source:'porsche-356-prea', target:'porsche-356-a',   type:'evolves_into',  strength:0.95 },
  { id:'p356-2', source:'porsche-356-a',    target:'porsche-356-b',   type:'evolves_into',  strength:0.95 },
  { id:'p356-3', source:'porsche-356-b',    target:'porsche-356-c',   type:'evolves_into',  strength:0.95 },
  { id:'p356-4', source:'porsche-356-c',    target:'p911-901',        type:'evolves_into',  strength:0.85 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// VOLKSWAGEN — Beetle, Passat, ID. (Golf chain already exists)
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'vw-beetle-t1',    label:'Beetle Type 1',  year:1938,codeName:'Typ 1',    modelSlug:'vw-beetle' },
  { id:'vw-new-beetle',   label:'New Beetle',      year:1997,codeName:'9C',       modelSlug:'vw-new-beetle' },
  { id:'vw-passat-b1',    label:'Passat B1',       year:1973,codeName:'B1',       modelSlug:'vw-passat' },
  { id:'vw-passat-b3',    label:'Passat B3',       year:1988,codeName:'B3',       modelSlug:'vw-passat' },
  { id:'vw-passat-b6',    label:'Passat B6',       year:2005,codeName:'B6',       modelSlug:'vw-passat' },
  { id:'vw-passat-b8',    label:'Passat B8',       year:2014,codeName:'B8',       modelSlug:'vw-passat' },
  { id:'vw-id3',          label:'ID.3',            year:2019,codeName:'E11',      modelSlug:'vw-id3' },
  { id:'vw-id4',          label:'ID.4',            year:2020,codeName:'E21',      modelSlug:'vw-id4' },
].forEach(n => addNode({...n,type:'generation',brandId:'volkswagen',brandName:'Volkswagen'}));

[
  // Beetle history
  { id:'vwb-1', source:'vw-beetle-t1',  target:'vw-golf1',       type:'evolves_into',  strength:0.72 },
  { id:'vwb-2', source:'vw-golf7',      target:'vw-new-beetle',  type:'influenced_by', strength:0.45 },
  // Passat chain
  { id:'vwp-1', source:'vw-passat-b1',  target:'vw-passat-b3',   type:'evolves_into',  strength:0.90 },
  { id:'vwp-2', source:'vw-passat-b3',  target:'vw-passat-b6',   type:'evolves_into',  strength:0.90 },
  { id:'vwp-3', source:'vw-passat-b6',  target:'vw-passat-b8',   type:'evolves_into',  strength:0.95 },
  { id:'vwp-4', source:'audi-b1',       target:'vw-passat-b1',   type:'shares_platform',strength:0.88 },
  // ID. electric
  { id:'vwid-1',source:'vw-golf8',      target:'vw-id3',          type:'influenced_by', strength:0.65 },
  { id:'vwid-2',source:'vw-id3',        target:'vw-id4',          type:'influenced_by', strength:0.70 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// MERCEDES — A-Class, SLK/SLC, CLK, AMG C63
// ─────────────────────────────────────────────────────────────────────────────
[
  // A-Class
  { id:'merc-a-w168', label:'A-Class W168', year:1997, codeName:'W168', modelSlug:'mercedes-a-class' },
  { id:'merc-a-w169', label:'A-Class W169', year:2004, codeName:'W169', modelSlug:'mercedes-a-class' },
  { id:'merc-a-w176', label:'A-Class W176', year:2012, codeName:'W176', modelSlug:'mercedes-a-class' },
  { id:'merc-a-w177', label:'A-Class W177', year:2018, codeName:'W177', modelSlug:'mercedes-a-class' },
  // SLK/SLC
  { id:'merc-slk-r170',label:'SLK R170',   year:1996, codeName:'R170', modelSlug:'mercedes-slk' },
  { id:'merc-slk-r171',label:'SLK R171',   year:2004, codeName:'R171', modelSlug:'mercedes-slk' },
  { id:'merc-slk-r172',label:'SLC R172',   year:2011, codeName:'R172', modelSlug:'mercedes-slk' },
  // CLK
  { id:'merc-clk-w208',label:'CLK W208',   year:1997, codeName:'W208', modelSlug:'mercedes-clk' },
  { id:'merc-clk-w209',label:'CLK W209',   year:2002, codeName:'W209', modelSlug:'mercedes-clk' },
  // AMG C63
  { id:'merc-amg-c63-w204',label:'C63 AMG W204',year:2008,codeName:'W204 AMG',modelSlug:'mercedes-amg-c63'},
  { id:'merc-amg-c63-w205',label:'C63 AMG W205',year:2015,codeName:'W205 AMG',modelSlug:'mercedes-amg-c63'},
  { id:'merc-amg-c63-w206',label:'C63 E-Perf W206',year:2022,codeName:'W206 AMG',modelSlug:'mercedes-amg-c63'},
].forEach(n => addNode({...n,type:'generation',brandId:'mercedes',brandName:'Mercedes-Benz'}));

[
  // A-Class chain
  { id:'ms-a1', source:'merc-a-w168', target:'merc-a-w169', type:'evolves_into', strength:0.92 },
  { id:'ms-a2', source:'merc-a-w169', target:'merc-a-w176', type:'evolves_into', strength:0.92 },
  { id:'ms-a3', source:'merc-a-w176', target:'merc-a-w177', type:'evolves_into', strength:0.95 },
  { id:'ms-a4', source:'merc-c-w201', target:'merc-a-w168', type:'influenced_by',strength:0.55 },
  // SLK chain
  { id:'ms-sk1',source:'merc-slk-r170',target:'merc-slk-r171',type:'evolves_into',strength:0.92 },
  { id:'ms-sk2',source:'merc-slk-r171',target:'merc-slk-r172',type:'evolves_into',strength:0.92 },
  { id:'ms-sk3',source:'merc-sl-w198', target:'merc-slk-r170',type:'influenced_by',strength:0.55 },
  // CLK chain
  { id:'ms-cl1',source:'merc-clk-w208',target:'merc-clk-w209',type:'evolves_into',strength:0.92 },
  { id:'ms-cl2',source:'merc-w210',    target:'merc-clk-w208',type:'derived_from', strength:0.82 },
  { id:'ms-cl3',source:'merc-clk-w209',target:'merc-cls-c219',type:'influenced_by',strength:0.60 },
  // AMG C63 variant chain
  { id:'ms-c63-1',source:'merc-c-w204',target:'merc-amg-c63-w204',type:'variant_of',strength:0.82 },
  { id:'ms-c63-2',source:'merc-amg-c63-w204',target:'merc-amg-c63-w205',type:'evolves_into',strength:0.90 },
  { id:'ms-c63-3',source:'merc-c-w205',target:'merc-amg-c63-w205',type:'variant_of',strength:0.82 },
  { id:'ms-c63-4',source:'merc-amg-c63-w205',target:'merc-amg-c63-w206',type:'evolves_into',strength:0.88 },
  { id:'ms-c63-5',source:'merc-c-w206',target:'merc-amg-c63-w206',type:'variant_of',strength:0.82 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// BMW — 1 Series, 2 Series, M1 production
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'bmw-m1-road',  label:'M1',           year:1978, codeName:'E26',    modelSlug:'bmw-1-series' },
  { id:'bmw-1-e87',    label:'1 Series E87', year:2004, codeName:'E87',    modelSlug:'bmw-1-series' },
  { id:'bmw-1-f20',    label:'1 Series F20', year:2011, codeName:'F20',    modelSlug:'bmw-1-series' },
  { id:'bmw-1-f40',    label:'1 Series F40', year:2019, codeName:'F40',    modelSlug:'bmw-1-series' },
  { id:'bmw-2-f22',    label:'2 Series F22', year:2013, codeName:'F22',    modelSlug:'bmw-2-series-coupe' },
  { id:'bmw-2-g42',    label:'2 Series G42', year:2021, codeName:'G42',    modelSlug:'bmw-2-series-coupe' },
].forEach(n => addNode({...n,type:'generation',brandId:'bmw',brandName:'BMW'}));

[
  // M1 — links M heritage
  { id:'bm1-1', source:'bmw-m1-concept',target:'bmw-m1-road',   type:'concept_to_production',strength:0.85 },
  { id:'bm1-2', source:'bmw-m1-road',   target:'bmw-m3-e30',    type:'influenced_by',        strength:0.72 },
  // 1 Series chain (compact rear-wheel-drive before F40 FWD switch)
  { id:'b1-1',  source:'bmw-e36',       target:'bmw-1-e87',     type:'influenced_by',        strength:0.60 },
  { id:'b1-2',  source:'bmw-1-e87',     target:'bmw-1-f20',     type:'evolves_into',         strength:0.92 },
  { id:'b1-3',  source:'bmw-1-f20',     target:'bmw-1-f40',     type:'evolves_into',         strength:0.88 },
  { id:'b1-4',  source:'bmw-m2-f87',    target:'bmw-1-e87',     type:'influenced_by',        strength:0.50 },
  // 2 Series coupe (spirit of the 2002 in modern form)
  { id:'b2-1',  source:'bmw-2002',      target:'bmw-2-f22',     type:'influenced_by',        strength:0.55 },
  { id:'b2-2',  source:'bmw-2-f22',     target:'bmw-2-g42',     type:'evolves_into',         strength:0.90 },
  { id:'b2-3',  source:'bmw-1-f20',     target:'bmw-2-f22',     type:'derived_from',         strength:0.82 },
  { id:'b2-4',  source:'bmw-m2-f87',    target:'bmw-2-f22',     type:'variant_of',           strength:0.85 },
  { id:'b2-5',  source:'bmw-m2-g87',    target:'bmw-2-g42',     type:'variant_of',           strength:0.85 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// FERRARI — 250 GT, Mondial, 512 TR
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'ferrari-250gt',  label:'250 GT',      year:1956, codeName:'250 GT',  modelSlug:'ferrari-250-gt' },
  { id:'ferrari-mondial',label:'Mondial',     year:1980, codeName:'Mondial', modelSlug:'ferrari-mondial' },
  { id:'ferrari-512tr',  label:'512 TR',      year:1991, codeName:'512 TR',  modelSlug:'ferrari-512-tr' },
].forEach(n => addNode({...n,type:'generation',brandId:'ferrari',brandName:'Ferrari'}));

[
  { id:'ff-250', source:'ferrari-250gt',   target:'ferrari-daytona-365', type:'evolves_into',  strength:0.82 },
  { id:'ff-mon', source:'ferrari-testarossa',target:'ferrari-mondial',   type:'influenced_by', strength:0.50 },
  { id:'ff-512', source:'ferrari-testarossa',target:'ferrari-512tr',     type:'evolves_into',  strength:0.88 },
  { id:'ff-513', source:'ferrari-512tr',   target:'ferrari-550',          type:'influenced_by', strength:0.55 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// LAMBORGHINI — LM002 (proto-Urus)
// ─────────────────────────────────────────────────────────────────────────────
addNode({ id:'lambo-lm002', label:'LM002', type:'generation', year:1986,
  brandId:'lamborghini', brandName:'Lamborghini', codeName:'LM002', modelSlug:'lamborghini-lm' });
addEdge({ id:'la-lm1', source:'lambo-lm002', target:'lambo-urus', type:'influenced_by', strength:0.55 });
addEdge({ id:'la-lm2', source:'lamborghini-cnt', target:'lambo-lm002', type:'influenced_by', strength:0.40 });

// ─────────────────────────────────────────────────────────────────────────────
// LOTUS — Elan + Europa (pre-Esprit history)
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'lotus-elan-s1',  label:'Elan S1',    year:1962, codeName:'Elan',   modelSlug:'lotus-elan' },
  { id:'lotus-elan-s3',  label:'Elan S3',    year:1966, codeName:'Elan S3',modelSlug:'lotus-elan' },
  { id:'lotus-europa-s1',label:'Europa S1',  year:1966, codeName:'Europa', modelSlug:'lotus-europa' },
  { id:'lotus-europa-s2',label:'Europa S2',  year:1968, codeName:'Europa Twin-Cam',modelSlug:'lotus-europa' },
].forEach(n => addNode({...n,type:'generation',brandId:'lotus',brandName:'Lotus'}));

[
  { id:'le-1', source:'lotus-elan-s1',  target:'lotus-elan-s3',   type:'evolves_into',  strength:0.92 },
  { id:'le-2', source:'lotus-elan-s1',  target:'lotus-europa-s1', type:'influenced_by', strength:0.60 },
  { id:'le-3', source:'lotus-europa-s1',target:'lotus-europa-s2', type:'evolves_into',  strength:0.88 },
  { id:'le-4', source:'lotus-europa-s2',target:'lotus-esprit-s1', type:'evolves_into',  strength:0.78 },
  { id:'le-5', source:'lotus-elan-s3',  target:'lotus-elise-s1',  type:'influenced_by', strength:0.65 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// SEAT — Ibiza + León history
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'seat-ibiza-mk1', label:'Ibiza Mk1',   year:1984, codeName:'6K', modelSlug:'seat-ibiza' },
  { id:'seat-ibiza-mk3', label:'Ibiza Mk3',   year:2002, codeName:'6L', modelSlug:'seat-ibiza' },
  { id:'seat-leon-mk1',  label:'León Mk1',    year:1999, codeName:'1M', modelSlug:'seat-leon' },
  { id:'seat-leon-mk2',  label:'León Mk2',    year:2005, codeName:'1P', modelSlug:'seat-leon' },
].forEach(n => addNode({...n,type:'generation',brandId:'seat',brandName:'SEAT'}));

[
  { id:'se-1', source:'seat-ibiza-mk1', target:'seat-ibiza-mk3', type:'evolves_into',  strength:0.88 },
  { id:'se-2', source:'seat-ibiza-mk3', target:'seat-leon3',     type:'influenced_by', strength:0.55 },
  { id:'se-3', source:'seat-leon-mk1',  target:'seat-leon-mk2',  type:'evolves_into',  strength:0.92 },
  { id:'se-4', source:'seat-leon-mk2',  target:'seat-leon3',     type:'evolves_into',  strength:0.92 },
  { id:'se-5', source:'vw-golf3',       target:'seat-leon-mk1',  type:'shares_platform',strength:0.85 },
  { id:'se-6', source:'vw-golf4',       target:'seat-ibiza-mk3', type:'shares_platform',strength:0.82 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// ŠKODA — Octavia history + Superb
// ─────────────────────────────────────────────────────────────────────────────
[
  { id:'skoda-oct-a4',  label:'Octavia Mk1',  year:1996, codeName:'A4', modelSlug:'skoda-octavia' },
  { id:'skoda-oct-a5',  label:'Octavia Mk2',  year:2004, codeName:'A5', modelSlug:'skoda-octavia' },
  { id:'skoda-superb',  label:'Superb Mk1',   year:2001, codeName:'3U', modelSlug:'skoda-superb' },
  { id:'skoda-superb2', label:'Superb Mk2',   year:2008, codeName:'3T', modelSlug:'skoda-superb' },
].forEach(n => addNode({...n,type:'generation',brandId:'skoda',brandName:'Škoda'}));

[
  { id:'sk-1', source:'skoda-oct-a4',  target:'skoda-oct-a5',  type:'evolves_into',   strength:0.92 },
  { id:'sk-2', source:'skoda-oct-a5',  target:'skoda-oct3',    type:'evolves_into',   strength:0.92 },
  { id:'sk-3', source:'skoda-superb',  target:'skoda-superb2', type:'evolves_into',   strength:0.90 },
  { id:'sk-4', source:'vw-golf4',      target:'skoda-oct-a4',  type:'shares_platform',strength:0.85 },
  { id:'sk-5', source:'vw-passat-b6',  target:'skoda-superb',  type:'shares_platform',strength:0.82 },
  { id:'sk-6', source:'skoda-superb2', target:'skoda-oct3',    type:'influenced_by',  strength:0.45 },
].forEach(addEdge);

// ─────────────────────────────────────────────────────────────────────────────
// Save + report
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(gPath, JSON.stringify(g, null, 2));

const counts = {};
g.nodes.forEach(n => { counts[n.brandId] = (counts[n.brandId]||0)+1; });
console.log('\nNodes per brand:');
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([b,c]) => console.log(' ', b+':', c));
console.log('\nTotal: nodes', g.nodes.length, '| edges', g.edges.length);
