const fs = require('fs');
const path = require('path');

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json');
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

const existingIds = new Set(g.nodes.map(n => n.id));
const existingEdgeIds = new Set(g.edges.map(e => e.id));

const BASE = { brandId: 'volkswagen', brandName: 'Volkswagen', type: 'generation' };

// ── New nodes ──────────────────────────────────────────────────────────────

const NEW_NODES = [

  // ── Golf GTI chain ────────────────────────────────────────────────────────
  { ...BASE, id:'vw-golf-gti-mk2', label:'Golf GTI Mk2', year:1984, hp:112, engineType:'i4', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-mk3', label:'Golf GTI Mk3', year:1992, hp:115, engineType:'i4', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-mk4', label:'Golf GTI Mk4', year:1998, hp:150, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-mk5', label:'Golf GTI Mk5', year:2004, hp:200, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-mk6', label:'Golf GTI Mk6', year:2009, hp:210, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-mk7', label:'Golf GTI Mk7', year:2013, hp:220, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-mk8', label:'Golf GTI Mk8', year:2020, hp:245, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-clubsport', label:'Golf GTI Clubsport', year:2016, hp:265, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gti-clubsport', familyKey:'vw-golf-gti' },
  { ...BASE, id:'vw-golf-gti-cs-s', label:'Golf GTI Clubsport S', year:2016, hp:310, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', isLimited:true, modelSlug:'volkswagen-golf-gti-clubsport-s', familyKey:'vw-golf-gti' },

  // ── Golf R chain ──────────────────────────────────────────────────────────
  { ...BASE, id:'vw-golf-r32-mk4', label:'Golf R32 Mk4', year:2002, hp:241, engineType:'v6', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-r32', familyKey:'vw-golf-r' },
  { ...BASE, id:'vw-golf-r32-mk5', label:'Golf R32 Mk5', year:2006, hp:250, engineType:'v6', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-r32', familyKey:'vw-golf-r' },
  { ...BASE, id:'vw-golf-r-mk6',   label:'Golf R Mk6',   year:2010, hp:270, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-r', familyKey:'vw-golf-r' },
  { ...BASE, id:'vw-golf-r-mk7',   label:'Golf R Mk7',   year:2014, hp:300, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-r', familyKey:'vw-golf-r' },

  // ── Golf GTE ──────────────────────────────────────────────────────────────
  { ...BASE, id:'vw-golf-gte-mk7', label:'Golf GTE Mk7', year:2014, hp:204, engineType:'hybrid', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gte', familyKey:'vw-golf-gte' },
  { ...BASE, id:'vw-golf-gte-mk8', label:'Golf GTE Mk8', year:2020, hp:245, engineType:'hybrid', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-golf-gte', familyKey:'vw-golf-gte' },

  // ── Arteon variants ───────────────────────────────────────────────────────
  { ...BASE, id:'vw-arteon-r',  label:'Arteon R',              year:2021, hp:320, engineType:'i4t', bodyType:'coupe', segment:'executive', zone:'gt_coupe', modelSlug:'volkswagen-arteon-r', familyKey:'vw-arteon' },
  { ...BASE, id:'vw-arteon-sb', label:'Arteon Shooting Brake', year:2021, hp:272, engineType:'i4t', bodyType:'estate', segment:'executive', zone:'gt_coupe', modelSlug:'volkswagen-arteon-shooting-brake', familyKey:'vw-arteon' },

  // ── ID electric variants ──────────────────────────────────────────────────
  { ...BASE, id:'vw-id4-gtx',   label:'ID.4 GTX',     year:2021, hp:299, engineType:'ev', bodyType:'suv', segment:'suv_mid', zone:'suv_mid', modelSlug:'volkswagen-id4-gtx', familyKey:'vw-id4' },
  { ...BASE, id:'vw-id5',       label:'ID.5',         year:2022, hp:204, engineType:'ev', bodyType:'suv', segment:'suv_mid', zone:'suv_mid', modelSlug:'volkswagen-id5', familyKey:'vw-id5' },
  { ...BASE, id:'vw-id5-gtx',   label:'ID.5 GTX',     year:2022, hp:299, engineType:'ev', bodyType:'suv', segment:'suv_mid', zone:'suv_mid', modelSlug:'volkswagen-id5-gtx', familyKey:'vw-id5' },
  { ...BASE, id:'vw-id-buzz-lwb',label:'ID. Buzz LWB', year:2024, hp:286, engineType:'ev', bodyType:'mpv', segment:'mpv', zone:'suv_large', modelSlug:'volkswagen-id-buzz-lwb', familyKey:'vw-id-buzz' },
  { ...BASE, id:'vw-id2all',    label:'ID.2all Concept', year:2023, hp:226, engineType:'ev', bodyType:'hatchback', segment:'compact', zone:'hatchback', isConcept:true, modelSlug:'volkswagen-id2all', familyKey:'vw-id2' },

  // ── Touareg / Tiguan performance ──────────────────────────────────────────
  { ...BASE, id:'vw-touareg-r',  label:'Touareg R', year:2021, hp:462, engineType:'hybrid', bodyType:'suv', segment:'suv_large', zone:'suv_large', modelSlug:'volkswagen-touareg-r', familyKey:'vw-touareg' },
  { ...BASE, id:'vw-tiguan-r',   label:'Tiguan R',  year:2021, hp:320, engineType:'i4t', bodyType:'suv', segment:'suv_mid', zone:'suv_mid', modelSlug:'volkswagen-tiguan-r', familyKey:'vw-tiguan' },
  { ...BASE, id:'vw-tiguan-allspace', label:'Tiguan Allspace', year:2017, hp:190, engineType:'i4t', bodyType:'suv', segment:'suv_mid', zone:'suv_mid', modelSlug:'volkswagen-tiguan-allspace', familyKey:'vw-tiguan' },

  // ── Missing Polo generations ──────────────────────────────────────────────
  { ...BASE, id:'vw-polo-mk2',   label:'Polo Mk2',    year:1981, hp:55,  engineType:'i4', bodyType:'hatchback', segment:'subcompact', zone:'hatchback', modelSlug:'volkswagen-polo', familyKey:'vw-polo' },
  { ...BASE, id:'vw-polo-gti-6', label:'Polo GTI Mk6',year:2018, hp:200, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-polo-gti', familyKey:'vw-polo' },
  { ...BASE, id:'vw-polo-r-wrc', label:'Polo R WRC',  year:2013, hp:220, engineType:'i4t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', isLimited:true, modelSlug:'volkswagen-polo-r-wrc', familyKey:'vw-polo' },

  // ── Missing Passat generations ────────────────────────────────────────────
  { ...BASE, id:'vw-passat-b2',  label:'Passat B2', year:1980, hp:90,  engineType:'i4', bodyType:'sedan', segment:'midsize', zone:'midsize_sed', modelSlug:'volkswagen-passat', familyKey:'vw-passat' },
  { ...BASE, id:'vw-passat-b4',  label:'Passat B4', year:1993, hp:115, engineType:'i4', bodyType:'sedan', segment:'midsize', zone:'midsize_sed', modelSlug:'volkswagen-passat', familyKey:'vw-passat' },
  { ...BASE, id:'vw-passat-b7',  label:'Passat B7', year:2010, hp:200, engineType:'i4t', bodyType:'sedan', segment:'midsize', zone:'midsize_sed', modelSlug:'volkswagen-passat', familyKey:'vw-passat' },
  { ...BASE, id:'vw-passat-b9',  label:'Passat B9', year:2023, hp:218, engineType:'i4t', bodyType:'sedan', segment:'midsize', zone:'midsize_sed', modelSlug:'volkswagen-passat', familyKey:'vw-passat' },
  { ...BASE, id:'vw-passat-gte', label:'Passat GTE',year:2015, hp:218, engineType:'hybrid', bodyType:'sedan', segment:'midsize', zone:'midsize_sed', modelSlug:'volkswagen-passat-gte', familyKey:'vw-passat' },

  // ── Scirocco Mk2 ──────────────────────────────────────────────────────────
  { ...BASE, id:'vw-scirocco-2', label:'Scirocco Mk2', year:1981, hp:112, engineType:'i4', bodyType:'coupe', segment:'sports', zone:'sports', modelSlug:'volkswagen-scirocco', familyKey:'vw-scirocco' },

  // ── Jetta (major missing model line) ─────────────────────────────────────
  { ...BASE, id:'vw-jetta-mk1',  label:'Jetta Mk1', year:1979, hp:75,  engineType:'i4', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },
  { ...BASE, id:'vw-jetta-mk2',  label:'Jetta Mk2', year:1984, hp:90,  engineType:'i4', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },
  { ...BASE, id:'vw-jetta-mk3',  label:'Jetta Mk3', year:1992, hp:101, engineType:'i4', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },
  { ...BASE, id:'vw-jetta-mk4',  label:'Jetta Mk4', year:1998, hp:115, engineType:'i4t', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },
  { ...BASE, id:'vw-jetta-mk5',  label:'Jetta Mk5', year:2005, hp:150, engineType:'i4t', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },
  { ...BASE, id:'vw-jetta-mk6',  label:'Jetta Mk6', year:2011, hp:160, engineType:'i4t', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },
  { ...BASE, id:'vw-jetta-mk7',  label:'Jetta Mk7', year:2018, hp:158, engineType:'i4t', bodyType:'sedan', segment:'compact', zone:'midsize_sed', modelSlug:'volkswagen-jetta', familyKey:'vw-jetta' },

  // ── Up! & Lupo ────────────────────────────────────────────────────────────
  { ...BASE, id:'vw-lupo',      label:'Lupo',         year:1998, hp:75,  engineType:'i4', bodyType:'hatchback', segment:'city', zone:'hatchback', modelSlug:'volkswagen-lupo', familyKey:'vw-lupo' },
  { ...BASE, id:'vw-lupo-gti',  label:'Lupo GTI',     year:2000, hp:125, engineType:'i4', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-lupo-gti', familyKey:'vw-lupo' },
  { ...BASE, id:'vw-up',        label:'Up!',          year:2011, hp:65,  engineType:'i3', bodyType:'hatchback', segment:'city', zone:'hatchback', modelSlug:'volkswagen-up', familyKey:'vw-up' },
  { ...BASE, id:'vw-up-gti',    label:'Up! GTI',      year:2018, hp:115, engineType:'i3t', bodyType:'hatchback', segment:'hot_hatch', zone:'sports', modelSlug:'volkswagen-up-gti', familyKey:'vw-up' },

  // ── T-Roc ─────────────────────────────────────────────────────────────────
  { ...BASE, id:'vw-t-roc',    label:'T-Roc',    year:2017, hp:150, engineType:'i4t', bodyType:'suv', segment:'suv_compact', zone:'suv_compact', modelSlug:'volkswagen-t-roc', familyKey:'vw-t-roc' },
  { ...BASE, id:'vw-t-roc-r',  label:'T-Roc R',  year:2019, hp:300, engineType:'i4t', bodyType:'suv', segment:'suv_compact', zone:'suv_compact', modelSlug:'volkswagen-t-roc-r', familyKey:'vw-t-roc' },

  // ── Phaeton ───────────────────────────────────────────────────────────────
  { ...BASE, id:'vw-phaeton',   label:'Phaeton', year:2002, hp:335, engineType:'v8', bodyType:'sedan', segment:'luxury', zone:'flagship_sed', modelSlug:'volkswagen-phaeton', familyKey:'vw-phaeton' },

  // ── XL1 ───────────────────────────────────────────────────────────────────
  { ...BASE, id:'vw-xl1',       label:'XL1',     year:2013, hp:68, engineType:'hybrid', bodyType:'coupe', segment:'sports', zone:'sports', isLimited:true, modelSlug:'volkswagen-xl1', familyKey:'vw-xl1' },
];

// ── New edges ──────────────────────────────────────────────────────────────

const NEW_EDGES = [
  // Golf GTI chain (mk1→mk2→…→mk8)
  { id:'vw-gti1-2',  source:'vw-golf-gti-mk1', target:'vw-golf-gti-mk2', type:'evolves_into', strength:0.9 },
  { id:'vw-gti2-3',  source:'vw-golf-gti-mk2', target:'vw-golf-gti-mk3', type:'evolves_into', strength:0.9 },
  { id:'vw-gti3-4',  source:'vw-golf-gti-mk3', target:'vw-golf-gti-mk4', type:'evolves_into', strength:0.9 },
  { id:'vw-gti4-5',  source:'vw-golf-gti-mk4', target:'vw-golf-gti-mk5', type:'evolves_into', strength:0.9 },
  { id:'vw-gti5-6',  source:'vw-golf-gti-mk5', target:'vw-golf-gti-mk6', type:'evolves_into', strength:0.9 },
  { id:'vw-gti6-7',  source:'vw-golf-gti-mk6', target:'vw-golf-gti-mk7', type:'evolves_into', strength:0.9 },
  { id:'vw-gti7-8',  source:'vw-golf-gti-mk7', target:'vw-golf-gti-mk8', type:'evolves_into', strength:0.9 },
  // Golf base → GTI variant_of
  { id:'vw-g2-gti2', source:'vw-golf2', target:'vw-golf-gti-mk2', type:'variant_of', strength:0.88 },
  { id:'vw-g3-gti3', source:'vw-golf3', target:'vw-golf-gti-mk3', type:'variant_of', strength:0.88 },
  { id:'vw-g4-gti4', source:'vw-golf4', target:'vw-golf-gti-mk4', type:'variant_of', strength:0.88 },
  { id:'vw-g5-gti5', source:'vw-golf5', target:'vw-golf-gti-mk5', type:'variant_of', strength:0.88 },
  { id:'vw-g6-gti6', source:'vw-golf6', target:'vw-golf-gti-mk6', type:'variant_of', strength:0.88 },
  { id:'vw-g7-gti7', source:'vw-golf7', target:'vw-golf-gti-mk7', type:'variant_of', strength:0.88 },
  { id:'vw-g8-gti8', source:'vw-golf8', target:'vw-golf-gti-mk8', type:'variant_of', strength:0.88 },
  // GTI Clubsport from Mk7
  { id:'vw-gti7-cs',  source:'vw-golf-gti-mk7', target:'vw-golf-gti-clubsport', type:'variant_of', strength:0.85 },
  { id:'vw-gtics-css', source:'vw-golf-gti-clubsport', target:'vw-golf-gti-cs-s', type:'variant_of', strength:0.85 },

  // Golf R32 chain
  { id:'vw-g4-r32',   source:'vw-golf4', target:'vw-golf-r32-mk4', type:'variant_of', strength:0.88 },
  { id:'vw-g5-r32',   source:'vw-golf5', target:'vw-golf-r32-mk5', type:'variant_of', strength:0.88 },
  { id:'vw-r32-4-5',  source:'vw-golf-r32-mk4', target:'vw-golf-r32-mk5', type:'evolves_into', strength:0.88 },
  // Golf R chain (R32 → R Mk6 → Mk7 → Mk8)
  { id:'vw-r32-5-r6', source:'vw-golf-r32-mk5', target:'vw-golf-r-mk6', type:'evolves_into', strength:0.85 },
  { id:'vw-r6-r7',    source:'vw-golf-r-mk6',   target:'vw-golf-r-mk7', type:'evolves_into', strength:0.90 },
  { id:'vw-r7-r8',    source:'vw-golf-r-mk7',   target:'vw-golf-r-mk8', type:'evolves_into', strength:0.90 },
  { id:'vw-g6-r6',    source:'vw-golf6', target:'vw-golf-r-mk6', type:'variant_of', strength:0.88 },
  { id:'vw-g7-r7',    source:'vw-golf7', target:'vw-golf-r-mk7', type:'variant_of', strength:0.88 },

  // Golf GTE chain
  { id:'vw-g7-gte7',  source:'vw-golf7', target:'vw-golf-gte-mk7', type:'variant_of', strength:0.85 },
  { id:'vw-g8-gte8',  source:'vw-golf8', target:'vw-golf-gte-mk8', type:'variant_of', strength:0.85 },
  { id:'vw-gte7-8',   source:'vw-golf-gte-mk7', target:'vw-golf-gte-mk8', type:'evolves_into', strength:0.88 },

  // Arteon variants
  { id:'vw-arteon-r-var',  source:'vw-arteon',    target:'vw-arteon-r',  type:'variant_of', strength:0.90 },
  { id:'vw-arteon-sb-var', source:'vw-arteon',    target:'vw-arteon-sb', type:'variant_of', strength:0.88 },

  // ID.4 GTX
  { id:'vw-id4-gtx-var', source:'vw-id4', target:'vw-id4-gtx', type:'variant_of', strength:0.90 },
  // ID.5 (coupe SUV variant of ID.4)
  { id:'vw-id4-id5',     source:'vw-id4', target:'vw-id5',     type:'derived_from', strength:0.85 },
  { id:'vw-id5-gtx-var', source:'vw-id5', target:'vw-id5-gtx', type:'variant_of',   strength:0.90 },
  // ID. Buzz LWB
  { id:'vw-idbuzz-lwb',  source:'vw-id-buzz', target:'vw-id-buzz-lwb', type:'variant_of', strength:0.88 },
  // ID.2all concept
  { id:'vw-id3-id2all',  source:'vw-id3', target:'vw-id2all', type:'inspired_by', strength:0.80 },

  // Touareg R
  { id:'vw-tou3-r', source:'vw-touareg-3', target:'vw-touareg-r', type:'variant_of', strength:0.88 },
  // Tiguan R + Allspace
  { id:'vw-tig2-r',        source:'vw-tiguan-2', target:'vw-tiguan-r',        type:'variant_of', strength:0.88 },
  { id:'vw-tig2-allspace', source:'vw-tiguan-2', target:'vw-tiguan-allspace',  type:'variant_of', strength:0.85 },

  // Polo Mk2 insertion
  { id:'vw-polo1-2',  source:'vw-polo-1',   target:'vw-polo-mk2', type:'evolves_into', strength:0.90 },
  { id:'vw-polo2-3',  source:'vw-polo-mk2', target:'vw-polo-mk3', type:'evolves_into', strength:0.90 },
  // Polo GTI Mk6
  { id:'vw-polo6-gti6', source:'vw-polo-6', target:'vw-polo-gti-6', type:'variant_of', strength:0.88 },
  // Polo R WRC (variant of Mk5 GTI era)
  { id:'vw-polo5-rwrc', source:'vw-polo-mk5', target:'vw-polo-r-wrc', type:'variant_of', strength:0.85 },

  // Passat missing generations
  { id:'vw-pb1-b2',  source:'vw-passat-b1', target:'vw-passat-b2', type:'evolves_into', strength:0.90 },
  { id:'vw-pb2-b3',  source:'vw-passat-b2', target:'vw-passat-b3', type:'evolves_into', strength:0.90 },
  { id:'vw-pb3-b4',  source:'vw-passat-b3', target:'vw-passat-b4', type:'evolves_into', strength:0.90 },
  { id:'vw-pb4-b5',  source:'vw-passat-b4', target:'vw-passat-b5', type:'evolves_into', strength:0.90 },
  { id:'vw-pb6-b7',  source:'vw-passat-b6', target:'vw-passat-b7', type:'evolves_into', strength:0.90 },
  { id:'vw-pb7-b8',  source:'vw-passat-b7', target:'vw-passat-b8', type:'evolves_into', strength:0.90 },
  { id:'vw-pb8-b9',  source:'vw-passat-b8', target:'vw-passat-b9', type:'evolves_into', strength:0.88 },
  { id:'vw-pb8-gte', source:'vw-passat-b8', target:'vw-passat-gte', type:'variant_of', strength:0.85 },

  // Scirocco Mk2
  { id:'vw-sci1-2',  source:'vw-scirocco-1', target:'vw-scirocco-2', type:'evolves_into', strength:0.90 },
  { id:'vw-sci2-3',  source:'vw-scirocco-2', target:'vw-scirocco-3', type:'evolves_into', strength:0.90 },

  // Jetta chain (Golf-based sedans)
  { id:'vw-g1-jet1', source:'vw-golf1',    target:'vw-jetta-mk1', type:'derived_from', strength:0.88 },
  { id:'vw-jet1-2',  source:'vw-jetta-mk1', target:'vw-jetta-mk2', type:'evolves_into', strength:0.92 },
  { id:'vw-jet2-3',  source:'vw-jetta-mk2', target:'vw-jetta-mk3', type:'evolves_into', strength:0.92 },
  { id:'vw-jet3-4',  source:'vw-jetta-mk3', target:'vw-jetta-mk4', type:'evolves_into', strength:0.92 },
  { id:'vw-jet4-5',  source:'vw-jetta-mk4', target:'vw-jetta-mk5', type:'evolves_into', strength:0.92 },
  { id:'vw-jet5-6',  source:'vw-jetta-mk5', target:'vw-jetta-mk6', type:'evolves_into', strength:0.92 },
  { id:'vw-jet6-7',  source:'vw-jetta-mk6', target:'vw-jetta-mk7', type:'evolves_into', strength:0.92 },
  // Jetta shares platform with Golf same gen
  { id:'vw-g4-jet4', source:'vw-golf4', target:'vw-jetta-mk4', type:'shares_platform', strength:0.95 },
  { id:'vw-g5-jet5', source:'vw-golf5', target:'vw-jetta-mk5', type:'shares_platform', strength:0.95 },
  { id:'vw-g6-jet6', source:'vw-golf6', target:'vw-jetta-mk6', type:'shares_platform', strength:0.95 },
  { id:'vw-g7-jet7', source:'vw-golf7', target:'vw-jetta-mk7', type:'shares_platform', strength:0.95 },

  // Lupo
  { id:'vw-polo3-lupo', source:'vw-polo-mk3', target:'vw-lupo', type:'derived_from', strength:0.80 },
  { id:'vw-lupo-gti-v', source:'vw-lupo',     target:'vw-lupo-gti', type:'variant_of', strength:0.88 },
  // Up!
  { id:'vw-lupo-up',   source:'vw-lupo',  target:'vw-up',     type:'inspired_by', strength:0.78 },
  { id:'vw-up-gti-v',  source:'vw-up',    target:'vw-up-gti', type:'variant_of',  strength:0.88 },

  // T-Roc (from Golf/Tiguan era)
  { id:'vw-g7-troc',   source:'vw-golf7',    target:'vw-t-roc',   type:'derived_from', strength:0.82 },
  { id:'vw-troc-r',    source:'vw-t-roc',    target:'vw-t-roc-r', type:'variant_of',   strength:0.90 },

  // Phaeton (flagship, related to Touareg platform)
  { id:'vw-tou1-phae', source:'vw-touareg-1', target:'vw-phaeton', type:'shares_platform', strength:0.75 },

  // XL1 (concept-inspired ultra-efficiency)
  { id:'vw-xl1-infl',  source:'vw-phaeton',  target:'vw-xl1', type:'inspired_by', strength:0.40 },
];

// ── Apply: only add nodes/edges not already present ────────────────────────

let addedNodes = 0, addedEdges = 0;

for (const n of NEW_NODES) {
  if (!existingIds.has(n.id)) {
    g.nodes.push(n);
    addedNodes++;
  }
}

for (const e of NEW_EDGES) {
  if (!existingEdgeIds.has(e.id)) {
    // verify both endpoints exist in updated graph
    const allIds = new Set(g.nodes.map(n => n.id));
    if (allIds.has(e.source) && allIds.has(e.target)) {
      g.edges.push(e);
      addedEdges++;
    } else {
      console.warn(`SKIP edge ${e.id}: missing ${!allIds.has(e.source)?e.source:e.target}`);
    }
  }
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8');
console.log(`\nVW expansion: +${addedNodes} nodes, +${addedEdges} edges`);
console.log(`Graph total: ${g.nodes.length} nodes, ${g.edges.length} edges`);
console.log(`\nVW nodes now: ${g.nodes.filter(n=>n.brandId==='volkswagen').length}`);
