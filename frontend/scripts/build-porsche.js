const fs = require('fs');
const gPath = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const mDir  = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/models/';
const bPath = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/brands/porsche.json';

// ── 1. Patch existing 911 / concept nodes ────────────────────────────────────
const graph = JSON.parse(fs.readFileSync(gPath, 'utf8'));

const slugMap = {
  'p911-901':    'porsche-911-carrera',
  'p911-g':      'porsche-911-carrera',
  'p911-964':    'porsche-911-carrera',
  'p911-993':    'porsche-911-carrera',
  'p911-996':    'porsche-911-carrera',
  'p911-997':    'porsche-911-carrera',
  'p911-991':    'porsche-911-carrera',
  'p911-992':    'porsche-911-carrera',
};
graph.nodes.forEach(n => { if (slugMap[n.id]) n.modelSlug = slugMap[n.id]; });

// ── 2. New nodes ─────────────────────────────────────────────────────────────
const newNodes = [
  // 911 Turbo lineage
  { id:'p911-turbo-930', label:'911 Turbo 930', type:'generation', year:1974, brandId:'porsche', brandName:'Porsche', codeName:'930', modelSlug:'porsche-911-turbo' },
  { id:'p911-turbo-964t', label:'911 Turbo 964', type:'generation', year:1990, brandId:'porsche', brandName:'Porsche', codeName:'964 Turbo', modelSlug:'porsche-911-turbo' },
  { id:'p911-turbo-993t', label:'911 Turbo 993', type:'generation', year:1995, brandId:'porsche', brandName:'Porsche', codeName:'993 Turbo', modelSlug:'porsche-911-turbo' },
  { id:'p911-turbo-996t', label:'911 Turbo 996', type:'generation', year:1999, brandId:'porsche', brandName:'Porsche', codeName:'996 Turbo', modelSlug:'porsche-911-turbo' },
  { id:'p911-turbo-992t', label:'911 Turbo 992', type:'generation', year:2020, brandId:'porsche', brandName:'Porsche', codeName:'992 Turbo', modelSlug:'porsche-911-turbo' },
  // GT3 / RS lineage
  { id:'p911-gt3-996', label:'911 GT3 996', type:'generation', year:1999, brandId:'porsche', brandName:'Porsche', codeName:'996 GT3', modelSlug:'porsche-911-gt3' },
  { id:'p911-gt3-997', label:'911 GT3 997', type:'generation', year:2006, brandId:'porsche', brandName:'Porsche', codeName:'997 GT3', modelSlug:'porsche-911-gt3' },
  { id:'p911-gt3-991', label:'911 GT3 991', type:'generation', year:2013, brandId:'porsche', brandName:'Porsche', codeName:'991 GT3', modelSlug:'porsche-911-gt3' },
  { id:'p911-gt3-992', label:'911 GT3 992', type:'generation', year:2021, brandId:'porsche', brandName:'Porsche', codeName:'992 GT3', modelSlug:'porsche-911-gt3' },
  // Boxster lineage
  { id:'porsche-box-986', label:'Boxster 986', type:'generation', year:1996, brandId:'porsche', brandName:'Porsche', codeName:'986', modelSlug:'porsche-boxster-and-boxster-s' },
  { id:'porsche-box-987', label:'Boxster 987', type:'generation', year:2004, brandId:'porsche', brandName:'Porsche', codeName:'987', modelSlug:'porsche-boxster-and-boxster-s' },
  { id:'porsche-box-981', label:'Boxster 981', type:'generation', year:2012, brandId:'porsche', brandName:'Porsche', codeName:'981', modelSlug:'porsche-boxster-and-boxster-s' },
  { id:'porsche-box-718', label:'718 Boxster', type:'generation', year:2016, brandId:'porsche', brandName:'Porsche', codeName:'982', modelSlug:'porsche-718-boxster-and-boxster-s' },
  // Cayman
  { id:'porsche-cay-987', label:'Cayman 987', type:'generation', year:2005, brandId:'porsche', brandName:'Porsche', codeName:'987C', modelSlug:'porsche-cayman' },
  { id:'porsche-cay-981', label:'Cayman 981', type:'generation', year:2013, brandId:'porsche', brandName:'Porsche', codeName:'981C', modelSlug:'porsche-cayman' },
  { id:'porsche-cay-718', label:'718 Cayman', type:'generation', year:2016, brandId:'porsche', brandName:'Porsche', codeName:'982C', modelSlug:'porsche-718-cayman-and-cayman-s' },
  // Cayenne SUV
  { id:'porsche-cay9-9pa', label:'Cayenne 9PA', type:'generation', year:2002, brandId:'porsche', brandName:'Porsche', codeName:'9PA', modelSlug:'porsche-cayenne' },
  { id:'porsche-cay9-92a', label:'Cayenne 92A', type:'generation', year:2010, brandId:'porsche', brandName:'Porsche', codeName:'92A', modelSlug:'porsche-cayenne' },
  { id:'porsche-cay9-9ya', label:'Cayenne 9YA', type:'generation', year:2017, brandId:'porsche', brandName:'Porsche', codeName:'9YA', modelSlug:'porsche-cayenne' },
  // Panamera
  { id:'porsche-pan-970', label:'Panamera 970', type:'generation', year:2009, brandId:'porsche', brandName:'Porsche', codeName:'970', modelSlug:'porsche-panamera' },
  { id:'porsche-pan-971', label:'Panamera 971', type:'generation', year:2016, brandId:'porsche', brandName:'Porsche', codeName:'971', modelSlug:'porsche-panamera' },
  // Macan
  { id:'porsche-mac-95b', label:'Macan 95B', type:'generation', year:2014, brandId:'porsche', brandName:'Porsche', codeName:'95B', modelSlug:'porsche-macan' },
  { id:'porsche-mac-j1', label:'Macan EV J1', type:'generation', year:2024, brandId:'porsche', brandName:'Porsche', codeName:'J1', modelSlug:'porsche-macan' },
  // Carrera GT hypercar
  { id:'porsche-cgt', label:'Carrera GT', type:'generation', year:2003, brandId:'porsche', brandName:'Porsche', codeName:'980', modelSlug:'porsche-carrera-gt' },
  // 918 hypercar
  { id:'porsche-918', label:'918 Spyder', type:'generation', year:2013, brandId:'porsche', brandName:'Porsche', codeName:'918', modelSlug:'porsche-918-spy' },
  // Taycan electric
  { id:'porsche-taycan', label:'Taycan', type:'generation', year:2019, brandId:'porsche', brandName:'Porsche', codeName:'J1', modelSlug:'porsche-taycan' },
];

const existingIds = new Set(graph.nodes.map(n => n.id));
newNodes.forEach(n => { if (!existingIds.has(n.id)) graph.nodes.push(n); });

// ── 3. New edges ─────────────────────────────────────────────────────────────
const newEdges = [
  // 911 Turbo chain
  { id:'pt-1', source:'p911-g', target:'p911-turbo-930', type:'derived_from', strength:0.88 },
  { id:'pt-2', source:'p911-turbo-930', target:'p911-turbo-964t', type:'evolves_into', strength:0.92 },
  { id:'pt-3', source:'p911-turbo-964t', target:'p911-turbo-993t', type:'evolves_into', strength:0.92 },
  { id:'pt-4', source:'p911-turbo-993t', target:'p911-turbo-996t', type:'evolves_into', strength:0.90 },
  { id:'pt-5', source:'p911-turbo-996t', target:'p911-turbo-992t', type:'evolves_into', strength:0.90 },
  // 911 GT3 chain
  { id:'pg-1', source:'p911-996', target:'p911-gt3-996', type:'derived_from', strength:0.88 },
  { id:'pg-2', source:'p911-gt3-996', target:'p911-gt3-997', type:'evolves_into', strength:0.92 },
  { id:'pg-3', source:'p911-gt3-997', target:'p911-gt3-991', type:'evolves_into', strength:0.92 },
  { id:'pg-4', source:'p911-gt3-991', target:'p911-gt3-992', type:'evolves_into', strength:0.92 },
  // Boxster chain
  { id:'pb-1', source:'porsche-box-986', target:'porsche-box-987', type:'evolves_into', strength:0.92 },
  { id:'pb-2', source:'porsche-box-987', target:'porsche-box-981', type:'evolves_into', strength:0.92 },
  { id:'pb-3', source:'porsche-box-981', target:'porsche-box-718', type:'evolves_into', strength:0.88 },
  // Cayman chain (derived from Boxster)
  { id:'pc-1', source:'porsche-box-987', target:'porsche-cay-987', type:'derived_from', strength:0.90 },
  { id:'pc-2', source:'porsche-cay-987', target:'porsche-cay-981', type:'evolves_into', strength:0.92 },
  { id:'pc-3', source:'porsche-cay-981', target:'porsche-cay-718', type:'evolves_into', strength:0.88 },
  // Cayenne chain
  { id:'py-1', source:'porsche-cay9-9pa', target:'porsche-cay9-92a', type:'evolves_into', strength:0.95 },
  { id:'py-2', source:'porsche-cay9-92a', target:'porsche-cay9-9ya', type:'evolves_into', strength:0.95 },
  // Panamera chain
  { id:'pp-1', source:'porsche-pan-970', target:'porsche-pan-971', type:'evolves_into', strength:0.92 },
  // Macan chain
  { id:'pm-1', source:'porsche-mac-95b', target:'porsche-mac-j1', type:'evolves_into', strength:0.82 },
  // Hypercar lineage
  { id:'ph-1', source:'p911-gt3-991', target:'porsche-cgt', type:'influenced_by', strength:0.50 },
  { id:'ph-2', source:'porsche-cgt', target:'porsche-918', type:'evolves_into', strength:0.72 },
  // Electric
  { id:'pe-1', source:'porsche-918', target:'porsche-taycan', type:'influenced_by', strength:0.60 },
  { id:'pe-2', source:'porsche-pan-971', target:'porsche-taycan', type:'influenced_by', strength:0.50 },
  { id:'pe-3', source:'porsche-mac-95b', target:'porsche-mac-j1', type:'evolves_into', strength:0.82 },
  // Cross-brand
  { id:'cx-por-1', source:'porsche-taycan', target:'audi-etron-gt', type:'shares_platform', strength:0.90 },
  { id:'cx-por-2', source:'porsche-cay9-9pa', target:'audi-q7-j4', type:'shares_platform', strength:0.82 },
  { id:'cx-por-3', source:'porsche-mac-95b', target:'audi-q5-fy', type:'shares_platform', strength:0.85 },
  { id:'cx-por-4', source:'p911-992', target:'lambo-huracan', type:'influenced_by', strength:0.32 },
];

const existingEdges = new Set(graph.edges.map(e => e.id));
newEdges.forEach(e => { if (!existingEdges.has(e.id)) graph.edges.push(e); });

fs.writeFileSync(gPath, JSON.stringify(graph, null, 2));
const pNodes = graph.nodes.filter(n => n.brandId === 'porsche').length;
const pEdges = graph.edges.filter(e => e.id.startsWith('p') && (e.id.startsWith('pt-') || e.id.startsWith('pg-') || e.id.startsWith('pb-') || e.id.startsWith('pc-') || e.id.startsWith('py-') || e.id.startsWith('pp-') || e.id.startsWith('pm-') || e.id.startsWith('ph-') || e.id.startsWith('pe-') || e.id.startsWith('cx-por-'))).length;
console.log('Graph: Porsche nodes:', pNodes, '| Porsche edges:', pEdges, '| Total:', graph.nodes.length, 'nodes', graph.edges.length, 'edges');

// ── 4. Create Carrera GT model file ──────────────────────────────────────────
const cgt = {
  id: 'm-porsche-carrera-gt', slug: 'porsche-carrera-gt', name: 'Carrera GT',
  fullName: 'Porsche Carrera GT', brandId: 'brand-porsche',
  bodyType: 'coupe', segment: 'sports', primaryMarket: 'global',
  startYear: 2003, endYear: 2006, isActive: false, generationCount: 1,
  thumbnailUrl: '', heroImageUrl: '',
  description: "The Porsche Carrera GT (2003–2006) was Porsche's mid-engine V10 hypercar, built on a carbon fibre monocoque with a 5.7-litre naturally aspirated V10 producing 612 hp. Just 1,270 were produced. Its titanium gearknob, wooden clutch disc, and complete absence of electronic driver aids made it the most demanding — and most revered — driver's car of its decade.",
  tags: ['coupe', 'porsche', 'v10', 'hypercar', 'carbon'], aiAnalysisAvailable: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  generations: [{ id: 'gen-porsche-carrera-gt-1', slug: 'porsche-carrera-gt-gen1',
    modelId: 'm-porsche-carrera-gt', brandId: 'brand-porsche', codeName: '980',
    generationNumber: 1, startYear: 2003, endYear: 2006, isFacelift: false, isConcept: false,
    bodyTypes: ['coupe'], engineTypes: ['ICE'], markets: ['global'],
    description: 'Porsche Carrera GT 2003-2006', thumbnailUrl: '', heroImageUrl: '', images: [] }]
};
fs.writeFileSync(mDir + 'porsche-carrera-gt.json', JSON.stringify(cgt, null, 2));
console.log('✅ porsche-carrera-gt.json');

// ── 5. Read actual model data ─────────────────────────────────────────────────
const readM = (slug) => {
  try {
    const d = JSON.parse(fs.readFileSync(mDir + slug + '.json', 'utf8'));
    return { slug: d.slug, name: d.name, bodyType: d.bodyType || 'coupe', segment: d.segment || 'sports',
      startYear: d.startYear, endYear: d.endYear, isActive: !!d.isActive,
      generationCount: d.generationCount || 1, thumbnailUrl: d.thumbnailUrl || '', heroImageUrl: d.heroImageUrl || '' };
  } catch { return null; }
};

const modelSlugs = [
  'porsche-911-carrera', 'porsche-911-turbo-s', 'porsche-911-gt3',
  'porsche-taycan', 'porsche-cayenne', 'porsche-macan', 'porsche-panamera',
  'porsche-boxster-and-boxster-s', 'porsche-cayman', 'porsche-718-boxster-and-boxster-s',
  'porsche-718-cayman-and-cayman-s', 'porsche-carrera-gt', 'porsche-918-spy',
  'porsche-taycan-cross-turismo', 'porsche-cayenne-turbo', 'porsche-macan-turbo',
  'porsche-panamera-turbo-s', 'porsche-911-gt3-rs', 'porsche-911-speedster',
  'porsche-718-cayman-gt4'
];

const models = modelSlugs.map(s => {
  const d = readM(s); if (!d) return null;
  return { id: 'm-' + s, slug: d.slug, name: d.name, fullName: 'Porsche ' + d.name,
    brandId: 'brand-porsche', bodyType: d.bodyType, segment: d.segment,
    primaryMarket: 'global', startYear: d.startYear, endYear: d.endYear, isActive: d.isActive,
    description: 'Porsche ' + d.name + '.', generationCount: d.generationCount,
    thumbnailUrl: d.thumbnailUrl, heroImageUrl: d.heroImageUrl,
    aiAnalysisAvailable: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
}).filter(Boolean).slice(0, 20);

// ── 6. Build brand JSON ───────────────────────────────────────────────────────
const brand = {
  id: 'brand-porsche', slug: 'porsche', name: 'Porsche',
  fullName: 'Dr. Ing. h.c. F. Porsche AG',
  country: 'Germany', countryCode: 'DE', foundingYear: 1931,
  logoUrl: '', logoWhiteUrl: '',
  headerImageUrl: 'https://images.caricos.com/p/porsche/2021_porsche_911_gt3/images/1920x1080/2021_porsche_911_gt3_1_1920x1080.jpg',
  description: "Dr. Ing. h.c. F. Porsche AG, founded by Ferdinand Porsche in Stuttgart in 1931, has produced the most continuously developed sports car in automotive history. The 911, introduced in 1963, has been in uninterrupted production for over sixty years — each generation more capable than the last while remaining unmistakably itself. The rear-engine layout that every competitor declared wrong has been refined into the most sophisticated sports car architecture in existence.\n\nPorsche's genius has always been the same: take what seems like a constraint and make it the defining advantage. The rear engine that should produce terminal oversteer instead provides outstanding traction and road-holding through decades of progressive chassis engineering. The Boxster that should have undermined the 911 instead clarified it: customers who buy a mid-engine roadster are not 911 customers, and the two cars coexist without cannibalising each other. The Cayenne that should have diluted the brand saved it: Porsche's 2002 financial position was precarious; the Cayenne funded the 997, the Cayman, and everything that followed.\n\nToday Porsche is navigating the electric transition with its characteristic precision. The Taycan, launched in 2019 on the purpose-built J1 platform, was not merely Porsche's first electric car — it was the car that established whether a Porsche could be emotionally engaging without a combustion engine. The evidence is that it can. The Macan EV, the electric Cayenne, and the forthcoming electric 718 will complete the transformation. Whether the 911 gains electric assistance or remains the last combustion holdout is the question Porsche has not yet answered.",
  parentCompany: 'Volkswagen Group',
  headquarters: 'Stuttgart-Zuffenhausen, Germany',
  modelCount: 85, generationCount: 140,
  tags: ['german', 'sports', '911', 'rear-engine', 'taycan', 'cayenne', 'motorsport', 'nurburgring'],
  aiAnalysisAvailable: true,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  dna: {
    id: 'dna-porsche', brandId: 'brand-porsche',
    entityType: 'brand', entityId: 'brand-porsche',
    overallScore: 95,
    dominantStyle: 'Precision Sports',
    colorPalette: ['#d5001c', '#000000', '#ffffff', '#8d8d8d'],
    keyElements: ['911 silhouette', 'rear-engine layout', 'flat-six sound', 'PDK gearbox', 'Weissach package', 'Nürburgring lap times'],
    influencedBy: ['Ferdinand Porsche engineering philosophy', 'Volkswagen Beetle architecture', 'Le Mans racing programme'],
    hasInfluenced: ['mid-engine sports car standard', 'SUV performance expectations', 'electric GT benchmark via Taycan'],
    dimensions: [
      { key: 'nine11_heritage', label: '911 Heritage', score: 99, trend: 'stable',
        description: "The 911 has been in continuous production since 1963 — 60 years of incremental refinement of a rear-engine sports car everyone said was wrong. Each generation is more capable than the last while remaining instantly recognisable. No other car has been developed this continuously for this long." },
      { key: 'engineering_precision', label: 'Engineering Precision', score: 97, trend: 'stable',
        description: "Porsche engineering is characterised by obsessive incremental improvement. The PDK double-clutch gearbox, PASM active suspension, PDCC anti-roll system, and torque vectoring are not features but a coordinated system. The 911 GT3's Nürburgring lap times are used internally as a development target, not a marketing number." },
      { key: 'motorsport_dna', label: 'Motorsport DNA', score: 96, trend: 'stable',
        description: "Porsche is the most successful manufacturer at Le Mans (20 overall victories), in the World Rally Championship (1984 Rohrl/Geistdörfer), and across club racing through the Porsche Carrera Cup. Every production 911's chassis is informed by the 911 RSR race car programme running in parallel." },
      { key: 'driver_focus', label: 'Driver-Focused Dynamics', score: 95, trend: 'stable',
        description: "Porsche products are consistently rated the highest for driving engagement in their segments. The 911 GT3's manual gearbox option, the Boxster's steering feel, the Cayman GT4's suspension geometry — these represent choices that cost money and add no marketing value except to the driver." },
      { key: 'brand_expansion', label: 'Brand Range Management', score: 88, trend: 'stable',
        description: "The Cayenne (2002) and Panamera (2009) expanded Porsche beyond sports cars into segments that now account for the majority of sales. Both have maintained Porsche's dynamics reputation in their respective segments, demonstrating that the brand's engineering identity is not genre-specific." },
      { key: 'electric_leadership', label: 'Electric Leadership', score: 90, trend: 'increasing',
        description: "The Taycan on the J1 platform (shared with the Audi e-tron GT) established that an electric Porsche could deliver the brand experience. Its 0-100 km/h time of 2.8 seconds, 800V charging architecture, and chassis behaviour made it the benchmark electric GT at launch. The forthcoming electric Macan and Cayenne will test whether this translates to volume." }
    ],
    temporalEvolution: [
      { year: 1963, score: 88, milestone: "911 (901) introduced — rear-engine sports car formula established",
        dimensionScores: { '911 Heritage': 85, 'Engineering Precision': 82, 'Motorsport DNA': 80, 'Driver-Focused Dynamics': 90, 'Brand Range Management': 30, 'Electric Leadership': 0 } },
      { year: 1974, score: 90, milestone: "911 Turbo 930 — turbocharging mastered; Le Mans dominance begins",
        dimensionScores: { '911 Heritage': 92, 'Engineering Precision': 88, 'Motorsport DNA': 93, 'Driver-Focused Dynamics': 92, 'Brand Range Management': 32, 'Electric Leadership': 0 } },
      { year: 1989, score: 92, milestone: "964 — all-wheel drive; PDK precursor; airbags standard",
        dimensionScores: { '911 Heritage': 93, 'Engineering Precision': 92, 'Motorsport DNA': 94, 'Driver-Focused Dynamics': 93, 'Brand Range Management': 38, 'Electric Leadership': 0 } },
      { year: 1997, score: 88, milestone: "996 — water cooling; controversial; company near bankruptcy",
        dimensionScores: { '911 Heritage': 88, 'Engineering Precision': 90, 'Motorsport DNA': 90, 'Driver-Focused Dynamics': 89, 'Brand Range Management': 45, 'Electric Leadership': 0 } },
      { year: 2002, score: 91, milestone: "Cayenne saves Porsche; 993-style air-cooled 911 GT3 peak",
        dimensionScores: { '911 Heritage': 93, 'Engineering Precision': 93, 'Motorsport DNA': 93, 'Driver-Focused Dynamics': 95, 'Brand Range Management': 82, 'Electric Leadership': 0 } },
      { year: 2011, score: 95, milestone: "991 + Carrera 4; PDK universal; 918 Spyder announced",
        dimensionScores: { '911 Heritage': 97, 'Engineering Precision': 96, 'Motorsport DNA': 95, 'Driver-Focused Dynamics': 97, 'Brand Range Management': 88, 'Electric Leadership': 35 } },
      { year: 2019, score: 94, milestone: "Taycan — first electric Porsche; J1 platform; 800V charging",
        dimensionScores: { '911 Heritage': 99, 'Engineering Precision': 97, 'Motorsport DNA': 95, 'Driver-Focused Dynamics': 95, 'Brand Range Management': 90, 'Electric Leadership': 88 } },
      { year: 2024, score: 96, milestone: "992 GT3 RS; Macan EV; electric Cayenne; 911 at 60 years",
        dimensionScores: { '911 Heritage': 99, 'Engineering Precision': 98, 'Motorsport DNA': 96, 'Driver-Focused Dynamics': 97, 'Brand Range Management': 90, 'Electric Leadership': 92 } }
    ],
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z'
  },
  analysis: {
    id: 'analysis-porsche-brand', entityType: 'brand', entityId: 'brand-porsche',
    analysisType: 'design_evolution', provider: 'claude-3-5',
    headline: "The 901 Formula: How Porsche Survived Sixty Years by Never Changing",
    summary: "Porsche has maintained a clearer engineering identity over a longer period than any other car manufacturer — the 911 being the most obvious evidence but not the only one. Its challenge today is preserving that identity through electrification while its key competitor, Ferrari, is doing the same thing and its parent company, Volkswagen Group, is under structural pressure that will reshape the industry.",
    fullText: "The story Porsche tells about itself — that the 911's rear engine layout, universally criticised at launch, was eventually proven right by decades of refinement — is both literally true and metaphorically instructive. Porsche's engineering philosophy is not to follow the consensus view of what is correct and optimise it. It is to identify what the product needs to be and engineer relentlessly toward that target, regardless of what the consensus says. The 911 needed to be engaging, balanced, and fast. That it required 40 years of chassis engineering to make the rear-engine layout work optimally is presented not as a cautionary tale but as evidence of commitment.\n\nThis philosophy produced the most successful single model nameplate in sports car history. The 911 has been in continuous production since 1963, with each generation measurably more capable than the last while remaining unmistakably the same car. The 992 GT3 RS laps the Nürburgring in 6:49 — a time that would have placed it among the fastest racing prototypes of the early 2000s. It does so with a naturally aspirated 4.0-litre flat-six producing 525 hp and a driver assistance system set to 'off'. This is not a coincidence; it is the result of a racing programme — the 911 RSR — running in parallel with road car development, with learnings transferred between the two continuously.\n\nThe Cayenne (2002) is the single most consequential decision in Porsche's modern history, and it was controversial in exactly the way that decisions that save companies are controversial: it compromised the brand's purity to ensure its survival. Porsche in 2001 was profitable but small and financially fragile. The Cayenne was a calculated bet that Porsche's engineering identity could be applied to an SUV segment that was growing while the sports car segment was flat. The bet was correct — the Cayenne was immediately successful — and the profits funded the 997, the Cayman, the Carrera GT, and the 918 Spyder. Without the Cayenne, none of those cars would have been built. The purists who objected were wrong not about the principle but about the consequences.\n\nThe Taycan (2019) represents Porsche's answer to the question every premium manufacturer must now answer: can our brand identity survive electrification? Porsche's answer was to not hedge. The Taycan is not a carefully managed transition vehicle with a combustion fallback — it is a purpose-built electric GT on a dedicated platform with 800V charging architecture and chassis tuning that prioritises driver engagement over efficiency. Its lap time at the Nürburgring at launch was 7:42 — quicker than a 991 Carrera. This was not accidental. It established that a Porsche can be engaging without combustion, which is the only question that matters for the brand's future.\n\nThe 911's electric future remains the final, most complex chapter. Porsche has committed to electric variants of everything except the 911. Whether the 911 eventually gains a PHEV system like the Revuelto or remains the last combustion sports car in the range depends on regulatory pressure that has not yet fully materialised in Porsche's key markets. The argument for keeping it combustion is clear: the 911 flat-six sound and throttle response are constitutive of the car's identity in a way that can't be replicated electrically. The argument against is equally clear: regulations will eventually force the issue, and a Porsche that doesn't lead the technology transition is not quite a Porsche.",
    insights: [
      { id: 'insight-por-1', category: 'The Rear Engine Argument',
        text: "The 911's rear engine layout was universally condemned at launch and is now universally praised — not because opinion changed but because Porsche's engineering changed the physics. The rear weight bias that produces oversteer in an undeveloped chassis provides extraordinary traction and stability in a developed one. Porsche's commitment to this layout for 60 years is the longest sustained engineering bet in automotive history, and it paid off.",
        confidence: 0.98, importance: 'critical' },
      { id: 'insight-por-2', category: 'The Cayenne Paradox',
        text: "The Cayenne saved Porsche from financial fragility and is simultaneously the car most frequently cited as evidence that the brand compromised its identity. Both things are true. The lesson is that brand identity is not preserved by refusing to evolve — it is preserved by ensuring that every new product applies the same engineering rigour to its segment that the core product applies to its own. The Cayenne is not a 911 SUV; it is a Porsche SUV, which is a different and sustainable thing.",
        confidence: 0.96, importance: 'critical' },
      { id: 'insight-por-3', category: 'GT3 / RSR Racing Transfer',
        text: "The 911 GT3's development is inseparable from the 911 RSR racing programme. Both use the same naturally aspirated 4.0-litre flat-six, both are developed by the same team, and lap time improvements in the RSR directly inform road car chassis changes. This is not a marketing relationship — it is a genuine engineering pipeline. The result is a road car whose dynamic behaviour is closer to a racing car than any competitor at its price point.",
        confidence: 0.97, importance: 'critical' },
      { id: 'insight-por-4', category: 'Taycan and the Electric Question',
        text: "The Taycan was the first electric car to lap the Nürburgring faster than the combustion equivalent at launch. Porsche achieved this not through raw power but through 800V charging architecture that allows sustained high-performance use, and chassis tuning that prioritises feel over efficiency. This established that Porsche can build an engaging electric car — which is all the brand needed to prove before committing the rest of the range to electrification.",
        confidence: 0.95, importance: 'high' },
      { id: 'insight-por-5', category: 'PDK and the Manual Question',
        text: "Porsche's PDK double-clutch gearbox is faster at every measurable dynamic task than the manual alternative. Porsche continues to offer a manual gearbox in the 911 and GT3 not because it is technically superior but because a segment of buyers derives genuine pleasure from the engagement. This is the clearest example of Porsche treating driver experience as an engineering requirement rather than a marketing option.",
        confidence: 0.93, importance: 'high' }
    ],
    confidenceScore: 0.96, processingTimeMs: 4400,
    createdAt: '2026-01-15T10:00:00Z', isCached: true
  },
  models: models
};

fs.writeFileSync(bPath, JSON.stringify(brand, null, 2));
console.log('Brand written: DNA dims:', brand.dna.dimensions.length, '| temporal:', brand.dna.temporalEvolution.length, '| insights:', brand.analysis.insights.length, '| models:', brand.models.length);
