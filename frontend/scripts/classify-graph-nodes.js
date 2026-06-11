/**
 * classify-graph-nodes.js
 * Adds bodyType, segment, zone to every node in evolution/graph.json
 * using pattern matching on node id, label, and codeName.
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf8'));

// ── Zone rules (order matters — first match wins) ───────────────────────────
// Each rule: test function + bodyType + segment + zone
const RULES = [
  // ── HYPERCARS ────────────────────────────────────────────────────────────
  { test: n => /laferrari|ferrari-f80|koenigsegg|bugatti|chiron|f80|mclaren-p1|918|enzo|mclaren-f1|pagani/i.test(n.id+n.label),
    bodyType:'coupe', segment:'hypercar', zone:'hypercar' },
  { test: n => /ferrari-(f40|f50)|lambo-veneno|lambo-centenario|ferrari-lafer|mc12/i.test(n.id),
    bodyType:'coupe', segment:'hypercar', zone:'hypercar' },

  // ── SUPERCARS ────────────────────────────────────────────────────────────
  { test: n => /ferrari-(296|488|f8|458|f430|360|f355|348|328|308|288gto)|ferrari-mondial/i.test(n.id),
    bodyType:'coupe', segment:'supercar', zone:'supercar' },
  { test: n => /ferrari-sf90|ferrari-12cil/i.test(n.id),
    bodyType:'coupe', segment:'supercar', zone:'supercar' },
  { test: n => /lamborghini-(miura|cnt|gallardo|huracan|diablo|murci|aven|revo|temerario|sesto|merak|bora)/i.test(n.id+n.label.toLowerCase()),
    bodyType:'coupe', segment:'supercar', zone:'supercar' },
  { test: n => /maserati-mc20|maserati-bora|maserati-merak|maserati-mc12/i.test(n.id),
    bodyType:'coupe', segment:'supercar', zone:'supercar' },
  { test: n => /bmw-m1|porsche-cgt|porsche-918|audi-r8/i.test(n.id),
    bodyType:'coupe', segment:'supercar', zone:'supercar' },
  { test: n => /porsche-356|ferrari-250gt|ferrari-daytona/i.test(n.id),
    bodyType:'coupe', segment:'supercar', zone:'supercar' },

  // ── SPORTS CARS (roadsters, 2-seat sports) ────────────────────────────────
  { test: n => /porsche-box|porsche-cay-[0-9]|p911-(901|g|964|993|996|997|991|992)/i.test(n.id),
    bodyType:'coupe', segment:'sports', zone:'sports' },
  { test: n => /p911-gt3|p911-turbo/i.test(n.id),
    bodyType:'coupe', segment:'sports', zone:'sports' },
  { test: n => /lotus-(elise|exige|elan|europa|evora|emira|esprit)/i.test(n.id),
    bodyType:'roadster', segment:'sports', zone:'sports' },
  { test: n => /bmw-z3|bmw-z4|bmw-z8|porsche-cay/i.test(n.id),
    bodyType:'roadster', segment:'sports', zone:'sports' },
  { test: n => /audi-tt|audi-r8/i.test(n.id),
    bodyType:'coupe', segment:'sports', zone:'sports' },
  { test: n => /maserati-ghibli1|maserati-ghibli2|maserati-3500gt/i.test(n.id),
    bodyType:'coupe', segment:'sports', zone:'sports' },

  // ── GT COUPES (Grand Tourers) ─────────────────────────────────────────────
  { test: n => /ferrari-(550|599|f12|812sf|12cil|gtc4l|ff)/i.test(n.id),
    bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe' },
  { test: n => /ferrari-daytona-365|ferrari-testarossa|ferrari-512tr/i.test(n.id),
    bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe' },
  { test: n => /bmw-(6-e|6-f|6-g|m6|8-e|8-g|m8)|maserati-granturismo|maserati-grancabrio|maserati-3200gt/i.test(n.id),
    bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe' },
  { test: n => /porsche-pan|audi-a7|audi-s7|audi-rs7/i.test(n.id),
    bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe' },
  { test: n => /bmw-4-f|bmw-4-g|bmw-m4|lambo-350gt|lambo-espada|lambo-jarama/i.test(n.id),
    bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe' },
  { test: n => /merc-cls|maserati-alfieri|audi-rs5|audi-a5-f/i.test(n.id),
    bodyType:'coupe', segment:'grand_tourer', zone:'gt_coupe' },

  // ── CONVERTIBLES / OPEN TOP ────────────────────────────────────────────────
  { test: n => /maserati-grancabrio|lambo-cnt-lpi|ferrari-california|ferrari-portofino|ferrari-roma/i.test(n.id),
    bodyType:'convertible', segment:'grand_tourer', zone:'open_top' },
  { test: n => /merc-sl-|maserati-bora|lambo-sc20|lambo-sian/i.test(n.id),
    bodyType:'convertible', segment:'sports', zone:'open_top' },
  { test: n => /merc-slk|lotus-eletre/i.test(n.id) && /slk/i.test(n.id),
    bodyType:'convertible', segment:'sports', zone:'open_top' },

  // ── FLAGSHIP SEDANS ───────────────────────────────────────────────────────
  { test: n => /merc-s-w|bmw-7-|audi-a8|maserati-qp|merc-maybach/i.test(n.id),
    bodyType:'sedan', segment:'luxury', zone:'flagship_sed' },
  { test: n => /rolls|bentley|phantom/i.test(n.id+n.label.toLowerCase()),
    bodyType:'sedan', segment:'flagship', zone:'flagship_sed' },

  // ── EXECUTIVE / BUSINESS SEDANS ───────────────────────────────────────────
  { test: n => /bmw-(5-e|5-f|5-g|m5)|merc-(w12|w21|e-class)|merc-w1[23]/i.test(n.id),
    bodyType:'sedan', segment:'premium_midsize', zone:'exec_sed' },
  { test: n => /merc-amg-e|audi-a6|audi-s6|audi-rs6/i.test(n.id),
    bodyType:'sedan', segment:'premium_midsize', zone:'exec_sed' },
  { test: n => /maserati-ghibli3|maserati-qp6/i.test(n.id),
    bodyType:'sedan', segment:'premium_midsize', zone:'exec_sed' },

  // ── MID/COMPACT SEDANS ────────────────────────────────────────────────────
  { test: n => /bmw-(e21|e30|e36|e46|e90|f30|g20|m3|m3-)|merc-c-w/i.test(n.id),
    bodyType:'sedan', segment:'premium_compact', zone:'midsize_sed' },
  { test: n => /audi-(b1|b2|b3|a4|s4|rs4)/i.test(n.id),
    bodyType:'sedan', segment:'premium_compact', zone:'midsize_sed' },
  { test: n => /merc-amg-c63/i.test(n.id),
    bodyType:'sedan', segment:'premium_compact', zone:'midsize_sed' },
  { test: n => /audi-a3|audi-rs3|audi-s3/i.test(n.id),
    bodyType:'sedan', segment:'compact', zone:'midsize_sed' },
  { test: n => /merc-a-w/i.test(n.id),
    bodyType:'hatchback', segment:'premium_compact', zone:'hatchback' },

  // ── ESTATES / WAGONS ──────────────────────────────────────────────────────
  { test: n => /wagon|avant|touring|estate|kombi/i.test(n.label.toLowerCase()),
    bodyType:'wagon', segment:'premium_midsize', zone:'estate' },
  { test: n => /vw-passat/i.test(n.id),
    bodyType:'sedan', segment:'midsize', zone:'midsize_sed' },

  // ── SUVs LARGE ────────────────────────────────────────────────────────────
  { test: n => /bmw-x7|bmw-x6|bmw-x5|merc-(ml|gle)|lambo-urus|lambo-lm002|porsche-cay9|audi-q7|audi-q8/i.test(n.id),
    bodyType:'suv', segment:'luxury', zone:'suv_large' },
  { test: n => /maserati-levante|audi-rs-q8|audi-s8/i.test(n.id) && !/s8/i.test(n.id),
    bodyType:'suv', segment:'luxury', zone:'suv_large' },
  { test: n => /maserati-levante/i.test(n.id),
    bodyType:'suv', segment:'luxury', zone:'suv_large' },
  { test: n => /bmw-x5|merc-gle|porsche-cay9/i.test(n.id),
    bodyType:'suv', segment:'premium_fullsize', zone:'suv_large' },

  // ── SUVs MID ───────────────────────────────────────────────────────────────
  { test: n => /bmw-x4|bmw-x3|bmw-x6-e|audi-q5|merc-ml-w1[46]/i.test(n.id),
    bodyType:'suv', segment:'premium_midsize', zone:'suv_mid' },
  { test: n => /porsche-mac|maserati-grecale/i.test(n.id),
    bodyType:'suv', segment:'premium_midsize', zone:'suv_mid' },
  { test: n => /audi-rs-q3|audi-q4|bmw-x2|bmw-x1/i.test(n.id),
    bodyType:'suv', segment:'premium_compact', zone:'suv_compact' },
  { test: n => /audi-q3|audi-q2|bmw-ix3/i.test(n.id),
    bodyType:'suv', segment:'compact', zone:'suv_compact' },
  { test: n => /merc-g-w/i.test(n.id),
    bodyType:'suv', segment:'luxury', zone:'suv_large' },

  // ── HATCHBACKS ────────────────────────────────────────────────────────────
  { test: n => /vw-golf|seat-leon|seat-ibiza|skoda-oct|audi-a1|vw-beetle|vw-id3/i.test(n.id),
    bodyType:'hatchback', segment:'compact', zone:'hatchback' },
  { test: n => /bmw-1-e|bmw-1-f|bmw-2-f22|bmw-2-g42|bmw-m2/i.test(n.id),
    bodyType:'hatchback', segment:'premium_compact', zone:'hatchback' },
  { test: n => /audi-a2/i.test(n.id),
    bodyType:'hatchback', segment:'subcompact', zone:'hatchback' },

  // ── ELECTRIC GT / EVs ──────────────────────────────────────────────────────
  { test: n => /porsche-taycan|audi-etron-gt|bmw-i4|bmw-i5|bmw-i7|merc-eq-eqs|merc-eq-eqe/i.test(n.id),
    bodyType:'sedan', segment:'luxury', zone:'electric' },
  { test: n => /bmw-ix|merc-eq-eqc|audi-etron-ge|audi-q6|lotus-eletre|bmw-ix3-f/i.test(n.id),
    bodyType:'suv', segment:'luxury', zone:'electric' },
  { test: n => /vw-id4/i.test(n.id),
    bodyType:'suv', segment:'midsize', zone:'hatchback' },

  // ── PICKUPS ────────────────────────────────────────────────────────────────
  { test: n => /pickup|lambo-lm002/i.test(n.id+n.label.toLowerCase()),
    bodyType:'pickup', segment:'fullsize', zone:'pickup' },

  // ── CONCEPTS ──────────────────────────────────────────────────────────────
  { test: n => n.isConcept || /concept|study|vision|maserati-alfieri|p-concept|bmw-m1-concept/i.test(n.id),
    bodyType:'concept', segment:'supercar', zone:'concept' },
];

// Fallback zone function
function getZone(bodyType, segment) {
  if (!bodyType) return 'midsize_sed';
  const bt = bodyType;
  const seg = segment || '';
  if (bt === 'concept') return 'concept';
  if (bt === 'pickup') return 'pickup';
  if (bt === 'wagon') return 'estate';
  if (bt === 'hatchback') return 'hatchback';
  if (bt === 'roadster') return 'sports';
  if (bt === 'convertible') return 'open_top';
  if (bt === 'coupe') {
    if (['hypercar'].includes(seg)) return 'hypercar';
    if (['supercar'].includes(seg)) return 'supercar';
    if (['sports'].includes(seg)) return 'sports';
    return 'gt_coupe';
  }
  if (bt === 'suv' || bt === 'crossover') {
    if (['luxury','flagship','premium_fullsize'].includes(seg)) return 'suv_large';
    if (['premium_midsize','fullsize'].includes(seg)) return 'suv_mid';
    return 'suv_compact';
  }
  if (bt === 'sedan') {
    if (['flagship','luxury'].includes(seg)) return 'flagship_sed';
    if (['premium_fullsize','premium_midsize'].includes(seg)) return 'exec_sed';
    return 'midsize_sed';
  }
  return 'midsize_sed';
}

let classified = 0;
g.nodes.forEach(node => {
  // Apply first matching rule
  for (const rule of RULES) {
    if (rule.test(node)) {
      node.bodyType = rule.bodyType;
      node.segment  = rule.segment;
      node.zone     = rule.zone;
      classified++;
      return;
    }
  }
  // Fallback: derive from existing bodyType/segment if set
  if (node.bodyType) {
    node.zone = getZone(node.bodyType, node.segment);
    classified++;
  }
});

fs.writeFileSync(path, JSON.stringify(g, null, 2));
const zoneCount = {};
g.nodes.forEach(n => { if (n.zone) zoneCount[n.zone] = (zoneCount[n.zone]||0)+1; });
console.log('Classified:', classified, '/', g.nodes.length, 'nodes');
console.log('\nZone distribution:');
Object.entries(zoneCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log('  '+k.padEnd(18)+v));
