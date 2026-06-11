/**
 * audi-deep-expand.js
 * Comprehensive Audi model range expansion for evolution graph.
 * Fixes wrong years, adds 28+ missing nodes across all families.
 */
const fs = require('fs');
const gPath = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const mDir  = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/models/';
const g = JSON.parse(fs.readFileSync(gPath, 'utf8'));
const nodeIds = new Set(g.nodes.map(n => n.id));
const edgeIds = new Set(g.edges.map(e => e.id));
let addedNodes = 0, addedEdges = 0, fixedNodes = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────
const addNode = (n) => { if (!nodeIds.has(n.id)) { g.nodes.push(n); nodeIds.add(n.id); addedNodes++; } };
const addEdge = (e) => {
  if (edgeIds.has(e.id)) return;
  if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
    console.warn('  skip edge', e.id, ':', e.source, '->', e.target); return;
  }
  g.edges.push(e); edgeIds.add(e.id); addedEdges++;
};
const au = (id, label, year, codeName, modelSlug) => ({
  id, label, type: 'generation', year, brandId: 'audi', brandName: 'Audi', codeName,
  ...(modelSlug ? { modelSlug } : {})
});
const modelFile = (slug) => {
  try { return JSON.parse(fs.readFileSync(mDir + slug + '.json', 'utf8')); } catch { return null; }
};
const createModel = (slug, name, bodyType, segment, startYear, endYear, desc, codeName) => {
  if (fs.existsSync(mDir + slug + '.json')) return;
  const brandName = 'Audi';
  const obj = {
    id: 'm-' + slug, slug, name, fullName: brandName + ' ' + name,
    brandId: 'brand-audi', bodyType, segment, primaryMarket: 'global',
    startYear, endYear: endYear || null, isActive: !endYear,
    description: desc, generationCount: 1, thumbnailUrl: '', heroImageUrl: '',
    tags: [bodyType, 'audi'], aiAnalysisAvailable: false,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    generations: [{ id: 'gen-' + slug + '-1', slug: slug + '-gen1',
      modelId: 'm-' + slug, brandId: 'brand-audi', codeName,
      generationNumber: 1, startYear, endYear: endYear || null,
      isFacelift: false, isConcept: false, bodyTypes: [bodyType],
      engineTypes: ['ICE'], markets: ['global'], description: desc,
      thumbnailUrl: '', heroImageUrl: '', images: [] }]
  };
  fs.writeFileSync(mDir + slug + '.json', JSON.stringify(obj, null, 2));
  console.log('  📄 created model file:', slug);
};

// ── 1. FIX WRONG YEARS ───────────────────────────────────────────────────────
const q5fy = g.nodes.find(n => n.id === 'audi-q5-fy');
if (q5fy && q5fy.year === 2008) {
  q5fy.year = 2017; q5fy.label = 'Q5 FY (2nd)'; fixedNodes++;
  console.log('  ✏️  Fixed: audi-q5-fy year 2008 → 2017');
}
const q3f3 = g.nodes.find(n => n.id === 'audi-q3-f3');
if (q3f3 && q3f3.year === 2011) {
  q3f3.year = 2018; q3f3.label = 'Q3 F3 (2nd)'; fixedNodes++;
  console.log('  ✏️  Fixed: audi-q3-f3 year 2011 → 2018');
}

// ── 2. CREATE MISSING MODEL FILES ────────────────────────────────────────────
createModel('audi-a1', 'A1', 'hatchback', 'midsize', 2010, null,
  'The Audi A1 (2010–present), built on the Volkswagen PQ25/MQB-A0 platform, brought premium quality to the supermini segment. Its two generations (8X and GB) feature quattro AWD options and S1/RS-performance variants.',
  '8X/GB');
createModel('audi-a2', 'A2', 'hatchback', 'midsize', 1999, 2005,
  'The Audi A2 (1999–2005) was a revolutionary aluminium space-frame subcompact — the first volume-production aluminium car — predating Audi\'s ASF strategy by a decade. Its Lite construction saved 40% weight versus steel equivalent. Discontinued due to high production costs despite critical acclaim.',
  '8Z');
createModel('audi-a7', 'A7', 'coupe', 'luxury', 2010, null,
  'The Audi A7 Sportback (2010–present) is the four-door fastback in the A6 range — the Gran Turismo alternative to the A6 saloon. Its C7 (4G) and C8 (4K) generations offer TFSI/TDI powertrains and plug-in hybrid variants alongside performance S7 and RS7 derivatives.',
  '4G/4K');
createModel('audi-rs3', 'RS3', 'sedan', 'sports', 2011, null,
  'The Audi RS3 (2011–present) is the most extreme version of the A3, featuring a 2.5-litre five-cylinder turbocharged engine — the most powerful five-cylinder in production. The 8P/8V/8Y generations produced 340–400 hp with a distinctive five-cylinder howl that has become the RS3\'s sonic signature.',
  '8P/8V/8Y');
createModel('audi-s4', 'S4', 'sedan', 'sports', 1991, null,
  'The Audi S4 (1991–present) is the mid-performance A4 variant, slotting below the RS4. The original B5 S4 with its twin-turbocharged 2.7-litre V6 is a cult car; the B8/B9 generations use supercharged/turbocharged V6 engines. The S4 represents the sweet-spot between everyday usability and genuine performance.',
  'B5/B8/B9');
createModel('audi-rs6', 'RS6 Avant', 'wagon', 'sports', 2002, null,
  'The Audi RS6 Avant (2002–present) is the definitive performance estate and one of the most influential fast cars in history. The C5\'s twin-turbocharged 4.2-litre V8 (450 hp), the C7\'s 4.0-litre V8 (560 hp), and the C8\'s 4.0-litre V8 hybrid (600 hp) form a lineage of barely restrained family cars that can outrun supercars. The RS6 Avant defined the genre.',
  'C5/C7/C8');
createModel('audi-s6', 'S6', 'sedan', 'sports', 1994, null,
  'The Audi S6 (1994–present) is the performance version of the A6, combining executive saloon practicality with enhanced performance. Key generations include the C5 (quattroed 4.2-litre V8) and the current C8 with a 3.0-litre turbocharged V6 MHEV.',
  'C4/C5/C8');
createModel('audi-s7', 'S7', 'coupe', 'sports', 2012, null,
  'The Audi S7 Sportback (2012–present) is the performance fastback variant of the A7, pairing the dramatic four-door Gran Turismo silhouette with enhanced performance. The 4G used a 4.0-litre V8 TFSI; the 4K uses a 2.9-litre twin-turbo V6.',
  '4G/4K');
createModel('audi-rs7', 'RS7', 'coupe', 'sports', 2013, null,
  'The Audi RS7 Sportback (2013–present) is the most extreme A7 variant. The 4G RS7 produced 560 hp from its 4.0-litre V8; the 4K RS7 Performance produces 630 hp. It combines the visual drama of the Gran Turismo body with supercar-level straight-line performance.',
  '4G/4K');
createModel('audi-s8', 'S8', 'sedan', 'luxury', 1994, null,
  'The Audi S8 (1994–present) is the performance flagship saloon. The D2 pioneered the aluminium Space Frame in series production (1994); the D5 uses a twin-turbocharged 4.0-litre V8 with 48V mild-hybrid and active suspension. Each generation represents the apex of Audi\'s technology.',
  'D2/D3/D4/D5');
createModel('audi-q2', 'Q2', 'suv', 'midsize', 2016, null,
  'The Audi Q2 (2016–present) is the entry-level compact crossover, sitting below the Q3. Built on the MQB-A platform, it offers quattro AWD and the SQ2 performance variant with a 300 hp 2.0-litre TFSI — the most powerful production Audi in its segment.',
  'GA');
createModel('audi-q4-e-tron', 'Q4 e-tron', 'suv', 'midsize', 2021, null,
  'The Audi Q4 e-tron (2021–present), on the Volkswagen Group MEB platform shared with the VW ID.4 and Skoda Enyaq, is Audi\'s volume electric SUV. The Q4 e-tron GT coupe variant adds a sportier profile. Its 77 kWh battery and rear/AWD options represent the accessible tier of Audi\'s EV strategy.',
  'F4/MEB');
createModel('audi-q5-sportback', 'Q5 Sportback', 'suv', 'luxury', 2021, null,
  'The Audi Q5 Sportback (2021–present) is the coupé-SUV version of the Q5, offering a sloping roofline SAC body style alongside the standard Q5.',
  'FY Sportback');
createModel('audi-q6-e-tron', 'Q6 e-tron', 'suv', 'luxury', 2024, null,
  'The Audi Q6 e-tron (2024–present), built on the Premium Platform Electric (PPE) developed jointly with Porsche, is Audi\'s premium mid-size electric SUV. The PPE platform allows 800V charging, placing the Q6 e-tron above the MEB-based Q4 e-tron in architecture and performance.',
  'PPE');
createModel('audi-rs-q3', 'RS Q3', 'suv', 'sports', 2013, null,
  'The Audi RS Q3 (2013–present) is the performance variant of the Q3, using the 2.5-litre five-cylinder turbocharged engine from the RS3. It is the definitive compact performance crossover, with 340–400 hp and quattro AWD in an elevated SUV body.',
  'F3 RS');
createModel('audi-rs-q8', 'RS Q8', 'suv', 'sports', 2019, null,
  'The Audi RS Q8 (2019–present) is the performance flagship of the SUV range — a 600 hp twin-turbocharged 4.0-litre V8 in an SUV body. It shares its MLB Evo platform with the Lamborghini Urus and the Porsche Cayenne Turbo GT. The RS Q8 Nürburgring lap record (7:42) made it the fastest SUV at the circuit.',
  'F8 RS');

// ── 3. NEW NODES ─────────────────────────────────────────────────────────────
const newNodes = [
  // A1 — entry supermini
  au('audi-a1-8x',    'A1 8X',           2010, '8X (PQ25)',   'audi-a1'),
  au('audi-a1-gb',    'A1 GB (MQB-A0)',  2018, 'GB/MQB-A0',  'audi-a1'),

  // A2 — aluminium subcompact
  au('audi-a2-8z',    'A2 8Z',           1999, '8Z/ASF',      'audi-a2'),

  // A7 — Gran Turismo fastback
  au('audi-a7-4g',    'A7 4G',           2010, '4G Sportback','audi-a7'),
  au('audi-a7-4k',    'A7 4K',           2018, '4K Sportback','audi-a7'),

  // A5 second gen update
  au('audi-a5-f5b',   'A5 F5B',          2019, 'F5B LCI',     'audi-a5-sedan'),

  // RS3 — A3-based hot hatch
  au('audi-rs3-8p',   'RS3 8P',          2011, '8P RS3',      'audi-rs3'),
  au('audi-rs3-8v',   'RS3 8V',          2015, '8V RS3',      'audi-rs3'),
  au('audi-rs3-8y',   'RS3 8Y',          2021, '8Y RS3',      'audi-rs3'),

  // S4 — sport A4
  au('audi-s4-b5',    'S4 B5',           1991, 'B5 S4 2.7T',  'audi-s4'),
  au('audi-s4-b8',    'S4 B8',           2008, 'B8 S4 3.0',   'audi-s4'),
  au('audi-s4-b9',    'S4 B9',           2016, 'B9 S4 3.0T',  'audi-s4'),

  // RS6 Avant — performance estate icon
  au('audi-rs6-c5',   'RS6 Avant C5',    2002, 'C5 RS6 4.2TT','audi-rs6'),
  au('audi-rs6-c7',   'RS6 Avant C7',    2013, 'C7 RS6 4.0',  'audi-rs6'),
  au('audi-rs6-c8',   'RS6 Avant C8',    2019, 'C8 RS6 MHEV', 'audi-rs6'),

  // S6 — sport A6
  au('audi-s6-c5',    'S6 C5',           1999, 'C5 S6 4.2',   'audi-s6'),
  au('audi-s6-c8',    'S6 C8',           2019, 'C8 S6 MHEV',  'audi-s6'),

  // A7/S7/RS7 — fastback family
  au('audi-s7-4g',    'S7 4G',           2012, '4G S7 4.0',   'audi-s7'),
  au('audi-s7-4k',    'S7 4K',           2019, '4K S7 2.9T',  'audi-s7'),
  au('audi-rs7-4g',   'RS7 4G',          2013, '4G RS7 4.0',  'audi-rs7'),
  au('audi-rs7-4k',   'RS7 4K',          2019, '4K RS7 4.0',  'audi-rs7'),

  // S8 — performance flagship
  au('audi-s8-d2',    'S8 D2',           1994, 'D2 S8 4.2',   'audi-s8'),
  au('audi-s8-d5',    'S8 D5',           2019, 'D5 S8 4.0T',  'audi-s8'),

  // Q2 — compact entry crossover
  au('audi-q2-ga',    'Q2 GA',           2016, 'GA/MQB',      'audi-q2'),

  // Q3 first gen (was missing — F3 year was wrong)
  au('audi-q3-8u',    'Q3 8U (1st)',     2011, '8U',          'audi-q3'),

  // Q4 e-tron — MEB compact EV
  au('audi-q4-f4',    'Q4 e-tron F4',    2021, 'F4/MEB',      'audi-q4-e-tron'),

  // Q5 first gen (FY year was wrong — add 8R)
  au('audi-q5-8r',    'Q5 8R (1st)',     2008, '8R',          'audi-q5'),

  // Q6 e-tron — PPE platform premium EV
  au('audi-q6-etron', 'Q6 e-tron PPE',   2024, 'PPE',         'audi-q6-e-tron'),

  // RS performance SUVs
  au('audi-rs-q3-f3', 'RS Q3 F3',        2019, 'F3 RS 2.5',   'audi-rs-q3'),
  au('audi-rs-q8-f8', 'RS Q8 F8',        2019, 'F8 RS 4.0',   'audi-rs-q8'),
];

newNodes.forEach(addNode);

// ── 4. NEW EDGES ─────────────────────────────────────────────────────────────
const newEdges = [
  // A1 chain
  { id:'au-a1-1', source:'audi-a3-8l',   target:'audi-a1-8x',   type:'influenced_by', strength:0.60 },
  { id:'au-a1-2', source:'audi-a1-8x',   target:'audi-a1-gb',   type:'evolves_into',  strength:0.90 },

  // A2 — aluminium pioneer
  { id:'au-a2-1', source:'audi-a8-d2',   target:'audi-a2-8z',   type:'influenced_by', strength:0.65 }, // ASF platform knowledge transfer

  // A7 chain (derived from A6 platform)
  { id:'au-a7-1', source:'audi-a6-c7',   target:'audi-a7-4g',   type:'derived_from',  strength:0.88 },
  { id:'au-a7-2', source:'audi-a7-4g',   target:'audi-a7-4k',   type:'evolves_into',  strength:0.90 },
  { id:'au-a7-3', source:'audi-a6-c8',   target:'audi-a7-4k',   type:'derived_from',  strength:0.88 },
  // S7 variants of A7
  { id:'au-s7-1', source:'audi-a7-4g',   target:'audi-s7-4g',   type:'variant_of',    strength:0.85 },
  { id:'au-s7-2', source:'audi-s7-4g',   target:'audi-s7-4k',   type:'evolves_into',  strength:0.88 },
  { id:'au-s7-3', source:'audi-a7-4k',   target:'audi-s7-4k',   type:'variant_of',    strength:0.85 },
  // RS7 derived from S7
  { id:'au-rs7-1',source:'audi-s7-4g',   target:'audi-rs7-4g',  type:'derived_from',  strength:0.88 },
  { id:'au-rs7-2',source:'audi-rs7-4g',  target:'audi-rs7-4k',  type:'evolves_into',  strength:0.90 },
  { id:'au-rs7-3',source:'audi-s7-4k',   target:'audi-rs7-4k',  type:'derived_from',  strength:0.88 },

  // A5 facelift
  { id:'au-a5-2', source:'audi-a5-f5',   target:'audi-a5-f5b',  type:'facelifted_to', strength:0.88 },

  // RS3 chain (variant_of A3 each gen)
  { id:'au-rs3-1',source:'audi-a3-8p',   target:'audi-rs3-8p',  type:'variant_of',    strength:0.82 },
  { id:'au-rs3-2',source:'audi-rs3-8p',  target:'audi-rs3-8v',  type:'evolves_into',  strength:0.90 },
  { id:'au-rs3-3',source:'audi-a3-8v',   target:'audi-rs3-8v',  type:'variant_of',    strength:0.82 },
  { id:'au-rs3-4',source:'audi-rs3-8v',  target:'audi-rs3-8y',  type:'evolves_into',  strength:0.90 },
  { id:'au-rs3-5',source:'audi-a3-8y',   target:'audi-rs3-8y',  type:'variant_of',    strength:0.82 },

  // S4 chain (variant_of A4 each gen)
  { id:'au-s4-1', source:'audi-a4b5',    target:'audi-s4-b5',   type:'variant_of',    strength:0.85 },
  { id:'au-s4-2', source:'audi-s4-b5',   target:'audi-s4-b8',   type:'evolves_into',  strength:0.82 },
  { id:'au-s4-3', source:'audi-a4b8',    target:'audi-s4-b8',   type:'variant_of',    strength:0.85 },
  { id:'au-s4-4', source:'audi-s4-b8',   target:'audi-s4-b9',   type:'evolves_into',  strength:0.88 },
  { id:'au-s4-5', source:'audi-a4b9',    target:'audi-s4-b9',   type:'variant_of',    strength:0.85 },

  // RS6 chain (variant_of A6 each gen)
  { id:'au-rs6-1',source:'audi-a6-c5',   target:'audi-rs6-c5',  type:'variant_of',    strength:0.80 },
  { id:'au-rs6-2',source:'audi-rs6-c5',  target:'audi-rs6-c7',  type:'evolves_into',  strength:0.82 },
  { id:'au-rs6-3',source:'audi-a6-c7',   target:'audi-rs6-c7',  type:'variant_of',    strength:0.80 },
  { id:'au-rs6-4',source:'audi-rs6-c7',  target:'audi-rs6-c8',  type:'evolves_into',  strength:0.90 },
  { id:'au-rs6-5',source:'audi-a6-c8',   target:'audi-rs6-c8',  type:'variant_of',    strength:0.80 },

  // S6 (subset of RS6 lineage)
  { id:'au-s6-1', source:'audi-a6-c5',   target:'audi-s6-c5',   type:'variant_of',    strength:0.85 },
  { id:'au-s6-2', source:'audi-s6-c5',   target:'audi-s6-c8',   type:'evolves_into',  strength:0.78 },
  { id:'au-s6-3', source:'audi-a6-c8',   target:'audi-s6-c8',   type:'variant_of',    strength:0.85 },
  { id:'au-s6-4', source:'audi-s6-c5',   target:'audi-rs6-c5',  type:'derived_from',  strength:0.88 }, // RS6 derived from S6 platform

  // S8 chain (variant_of A8 each gen)
  { id:'au-s8-1', source:'audi-a8-d2',   target:'audi-s8-d2',   type:'variant_of',    strength:0.85 },
  { id:'au-s8-2', source:'audi-s8-d2',   target:'audi-s8-d5',   type:'evolves_into',  strength:0.75 },
  { id:'au-s8-3', source:'audi-a8-d5',   target:'audi-s8-d5',   type:'variant_of',    strength:0.85 },

  // Q2 (entry crossover, derived from A3/MQB)
  { id:'au-q2-1', source:'audi-a3-8v',   target:'audi-q2-ga',   type:'shares_platform', strength:0.82 },

  // Q3 first gen chain
  { id:'au-q3-0', source:'audi-a3-8p',   target:'audi-q3-8u',   type:'shares_platform', strength:0.80 },
  { id:'au-q3-c', source:'audi-q3-8u',   target:'audi-q3-f3',   type:'evolves_into',    strength:0.92 },
  // RS Q3 derived from Q3
  { id:'au-rsq3-1',source:'audi-q3-f3',  target:'audi-rs-q3-f3',type:'variant_of',      strength:0.82 },

  // Q5 first gen chain
  { id:'au-q5-0', source:'audi-q7-j4',   target:'audi-q5-8r',   type:'influenced_by',   strength:0.70 },
  { id:'au-q5-c', source:'audi-q5-8r',   target:'audi-q5-fy',   type:'evolves_into',    strength:0.92 },

  // Q4 e-tron (MEB platform)
  { id:'au-q4-1', source:'audi-etron-ge',target:'audi-q4-f4',   type:'influenced_by',   strength:0.65 },
  { id:'au-q4-2', source:'audi-q3-f3',   target:'audi-q4-f4',   type:'influenced_by',   strength:0.50 },

  // Q6 e-tron (PPE — Porsche Taycan sibling)
  { id:'au-q6-1', source:'audi-etron-ge',target:'audi-q6-etron',type:'influenced_by',   strength:0.60 },
  { id:'au-q6-2', source:'porsche-taycan',target:'audi-q6-etron',type:'shares_platform',strength:0.85 }, // PPE platform

  // RS Q8 derived from Q8
  { id:'au-rsq8-1',source:'audi-q8-f8',  target:'audi-rs-q8-f8',type:'variant_of',      strength:0.82 },
  // Cross: RS Q8 and Lamborghini Urus share MLB Evo
  { id:'au-rsq8-2',source:'audi-rs-q8-f8',target:'lambo-urus',  type:'shares_platform', strength:0.82 },
];

newEdges.forEach(addEdge);

// ── 5. Save ───────────────────────────────────────────────────────────────────
fs.writeFileSync(gPath, JSON.stringify(g, null, 2));

const auFinal = g.nodes.filter(n => n.brandId === 'audi').length;
console.log('\n✅ Done:');
console.log('  Fixed nodes:', fixedNodes);
console.log('  Added nodes:', addedNodes, '→ Audi total:', auFinal);
console.log('  Added edges:', addedEdges);
console.log('  Graph total:', g.nodes.length, 'nodes |', g.edges.length, 'edges');
