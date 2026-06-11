const fs = require('fs');
const dir = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/models/';

const readModel = (slug) => {
  try {
    const d = JSON.parse(fs.readFileSync(dir + slug + '.json', 'utf8'));
    return { slug: d.slug, name: d.name, bodyType: d.bodyType || 'coupe', segment: d.segment || 'sports',
      startYear: d.startYear, endYear: d.endYear, isActive: !!d.isActive,
      generationCount: d.generationCount || 1, thumbnailUrl: d.thumbnailUrl || '', heroImageUrl: d.heroImageUrl || '' };
  } catch (e) { return null; }
};

const slugs = [
  'lamborghini-aventador-lp-700-4', 'lamborghini-revuelto', 'lamborghini-huracan-lp-610-4',
  'lamborghini-temerario', 'lamborghini-gallardo-lp-560-4', 'lamborghini-urus',
  'lamborghini-countach-lpi-800-4', 'lamborghini-diablo-vt', 'lamborghini-veneno',
  'lamborghini-centenario', 'lamborghini-miura-p400', 'lamborghini-jarama',
  'lamborghini-400-gt-2-2', 'lamborghini-countach', 'lamborghini-diablo',
  'lamborghini-murcielago', 'lamborghini-espada', 'lamborghini-350-gt',
  'lamborghini-sesto-elemento-concept', 'lamborghini-lanzador-concept'
];

const models = slugs.map(slug => {
  const d = readModel(slug);
  if (!d) return null;
  return { id: 'm-' + slug, slug: d.slug, name: d.name, fullName: 'Lamborghini ' + d.name,
    brandId: 'brand-lamborghini', bodyType: d.bodyType, segment: d.segment,
    primaryMarket: 'global', startYear: d.startYear, endYear: d.endYear, isActive: d.isActive,
    description: 'Lamborghini ' + d.name + '.', generationCount: d.generationCount,
    thumbnailUrl: d.thumbnailUrl, heroImageUrl: d.heroImageUrl,
    aiAnalysisAvailable: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
}).filter(Boolean).slice(0, 20);

const brand = {
  id: 'brand-lamborghini', slug: 'lamborghini', name: 'Lamborghini',
  fullName: 'Automobili Lamborghini S.p.A.',
  country: 'Italy', countryCode: 'IT', foundingYear: 1963,
  logoUrl: '', logoWhiteUrl: '',
  headerImageUrl: 'https://images.caricos.com/l/lamborghini/2021_lamborghini_huracan_sto/images/1920x1080/2021_lamborghini_huracan_sto_1_1920x1080.jpg',
  description: "Automobili Lamborghini S.p.A. was born from an argument. In 1963, Ferruccio Lamborghini complained to Enzo Ferrari about the clutch on his 250 GT. Ferrari reportedly dismissed him: a tractor maker had no business telling him how to build sports cars. Ferruccio's response was the 350 GT, the Miura, and an automotive dynasty that has produced the most visually extreme cars in history for sixty years.\n\nThe Miura (1966), designed by Marcello Gandini at Bertone when he was just 26, was the first true supercar: a mid-engine V12 road car with bodywork so beautiful that it is still studied in design schools. The Countach that followed (1974) was so radical that Gandini reportedly used it to deliberately polarise — anyone who didn't love it, he didn't want driving it. This philosophy — design as provocation, performance as absolute — has defined every Lamborghini since.\n\nToday, under Audi/Volkswagen Group ownership since 1998, Lamborghini has become a rigorous business while remaining an irrational product. The Urus SUV doubled production volumes. The Revuelto delivers 1,015 hp through a hybrid V12 while Lamborghini insists the engine note is unchanged. The Temerario produces 920 hp from a 4.0-litre hybrid V8. Ferruccio would be confused by the management structure and astonished by the engineering.",
  parentCompany: 'Volkswagen Group (Audi AG)',
  headquarters: "Sant'Agata Bolognese, Italy",
  modelCount: 20, generationCount: 35,
  tags: ['italian', 'supercar', 'v12', 'v10', 'wedge-design', 'scissor-doors', 'urus', 'sant-agata'],
  aiAnalysisAvailable: true,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  dna: {
    id: 'dna-lamborghini', brandId: 'brand-lamborghini',
    entityType: 'brand', entityId: 'brand-lamborghini',
    overallScore: 94,
    dominantStyle: 'Wedge Provocation',
    colorPalette: ['#e6b800', '#000000', '#ffffff', '#1a1a1a'],
    keyElements: ['scissor doors', 'wedge silhouette', 'V12 engine note', 'Raging Bull badge', 'massive rear diffuser', 'angular surfaces'],
    influencedBy: ['motorsport aerodynamics', 'Bertone coachbuilding', 'Italian design provocation'],
    hasInfluenced: ['supercar design language globally', 'wedge car aesthetic 1970s-90s', 'modern hypercar proportions'],
    dimensions: [
      { key: 'v12_theatre', label: 'V12 Theatre', score: 99, trend: 'stable',
        description: "Lamborghini's naturally aspirated 6.5-litre V12 at 8,500 rpm is the most theatrical automotive experience in production. The Revuelto retains the V12 with a hybrid system — Lamborghini insists the soul is unchanged." },
      { key: 'design_provocation', label: 'Design Provocation', score: 97, trend: 'stable',
        description: "From the Miura's curves to the Countach's wedge to the Aventador's creased surfaces, every Lamborghini is designed to provoke. Gandini's philosophy: if you don't love it, we don't want you as a customer." },
      { key: 'track_performance', label: 'Track Performance', score: 94, trend: 'increasing',
        description: "The Huracán Performante held the Nürburgring production car record in 2017. The Aventador SVJ reclaimed it in 2018. Every model line gets a Superveloce or Performante variant that shows the architecture's limit." },
      { key: 'exclusivity', label: 'Exclusivity & Mythology', score: 95, trend: 'decreasing',
        description: "For 50 years Lamborghini produced under 2,500 cars annually. The Urus doubled production to over 8,000/year. The mythology persists, but the mathematics of exclusivity have changed fundamentally." },
      { key: 'vw_group_quality', label: 'VW Group Quality Foundation', score: 88, trend: 'stable',
        description: "Audi's 1998 acquisition transformed Lamborghini's build quality. The Urus shares the MLB Evo platform with the Porsche Cayenne and Audi Q7 — pragmatic engineering underpinning an impractical vision." },
      { key: 'electrification', label: 'Hybrid Electrification', score: 82, trend: 'increasing',
        description: "The Revuelto's 1,015 hp hybrid V12 and the Temerario's 920 hp hybrid V8 add electric motors to amplify, not replace, the combustion experience. The engine provides theatre no electric motor can replicate." }
    ],
    temporalEvolution: [
      { year: 1966, score: 95, milestone: "Miura — world's first supercar; Gandini at 26",
        dimensionScores: { 'V12 Theatre': 96, 'Design Provocation': 99, 'Track Performance': 85, 'Exclusivity & Mythology': 98, 'VW Group Quality Foundation': 45, 'Hybrid Electrification': 0 } },
      { year: 1974, score: 93, milestone: "Countach — wedge design manifesto; scissor doors",
        dimensionScores: { 'V12 Theatre': 94, 'Design Provocation': 99, 'Track Performance': 88, 'Exclusivity & Mythology': 97, 'VW Group Quality Foundation': 42, 'Hybrid Electrification': 0 } },
      { year: 1990, score: 88, milestone: "Diablo under Chrysler — 320 km/h; first AWD variant",
        dimensionScores: { 'V12 Theatre': 95, 'Design Provocation': 92, 'Track Performance': 90, 'Exclusivity & Mythology': 92, 'VW Group Quality Foundation': 52, 'Hybrid Electrification': 0 } },
      { year: 1998, score: 90, milestone: "Murciélago under Audi — quality revolution",
        dimensionScores: { 'V12 Theatre': 97, 'Design Provocation': 93, 'Track Performance': 91, 'Exclusivity & Mythology': 93, 'VW Group Quality Foundation': 80, 'Hybrid Electrification': 0 } },
      { year: 2003, score: 92, milestone: "Gallardo — V10 lineage begins; R8 platform sharing",
        dimensionScores: { 'V12 Theatre': 90, 'Design Provocation': 92, 'Track Performance': 93, 'Exclusivity & Mythology': 92, 'VW Group Quality Foundation': 85, 'Hybrid Electrification': 0 } },
      { year: 2011, score: 95, milestone: "Aventador — carbon monocoque; 700 hp V12 pushrod",
        dimensionScores: { 'V12 Theatre': 99, 'Design Provocation': 97, 'Track Performance': 95, 'Exclusivity & Mythology': 96, 'VW Group Quality Foundation': 87, 'Hybrid Electrification': 0 } },
      { year: 2018, score: 91, milestone: "Urus SUV — 650 hp; doubled production volume",
        dimensionScores: { 'V12 Theatre': 85, 'Design Provocation': 88, 'Track Performance': 88, 'Exclusivity & Mythology': 82, 'VW Group Quality Foundation': 90, 'Hybrid Electrification': 40 } },
      { year: 2024, score: 96, milestone: "Revuelto 1,015 hp hybrid V12; Temerario hybrid V8",
        dimensionScores: { 'V12 Theatre': 99, 'Design Provocation': 97, 'Track Performance': 96, 'Exclusivity & Mythology': 95, 'VW Group Quality Foundation': 90, 'Hybrid Electrification': 82 } }
    ],
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z'
  },
  analysis: {
    id: 'analysis-lamborghini-brand', entityType: 'brand', entityId: 'brand-lamborghini',
    analysisType: 'design_evolution', provider: 'claude-3-5',
    headline: "The Tractor Maker's Revenge: Lamborghini's Six Decades of Deliberate Excess",
    summary: "Lamborghini was founded as a personal act of defiance against Ferrari, and six decades later it remains the most emotionally extreme car brand in production. Its challenge today is preserving that mythology while delivering 1,000 hp through hybrid systems and selling SUVs to customers who will never hear a V12.",
    fullText: "The founding argument between Ferruccio Lamborghini and Enzo Ferrari is either literally true or the best origin myth in automotive history — and it does not matter which, because it captures something real about what Lamborghini is. Where Ferrari builds racing cars that can be driven on roads, Lamborghini builds statements that can be driven on roads. The difference is subtle but everything: Ferrari's identity is performance first, theatre second; Lamborghini's is theatre first, performance an extension of the theatre.\n\nThe Miura (1966) and the Countach (1974) are the two cars that established the supercar visual language still in use today. Marcello Gandini, designing at Bertone at 25 and 26 respectively, created the vocabulary — mid-engine layout, wedge body, dramatic proportions — that Ferrari, Porsche, and every other supercar maker eventually adopted. The Countach's scissor doors, sharp edges, and wide-body aggression appeared on every bedroom wall in the 1980s and still define what a child imagines when told to draw a fast car.\n\nThe Diablo (1990) and Murciélago (2001) continued the V12 flagship through corporate upheaval — Chrysler ownership, then Audi/Volkswagen Group acquisition in 1998. Audi's intervention was transformative: build quality improved dramatically, and the shared aluminium space frame architecture with the R8 gave Lamborghini engineering credibility it had previously lacked. The Gallardo (2003), the first V10 Lamborghini, showed that the brand could maintain theatre at a lower price point while sharing architecture with a mass-market sports car without diminishing either.\n\nThe Aventador (2011) was the technical statement: carbon fibre monocoque, pushrod suspension, 700 hp V12 at 8,350 rpm, and an exhaust note that automotive journalists struggled to describe without meteorological metaphors. The SVJ variant held the Nürburgring production car record, demonstrating that the theatre was underpinned by genuine dynamic capability. The Revuelto adds a hybrid system delivering 1,015 hp while preserving the V12 character — which, listening to it, it demonstrably does.\n\nThe Urus (2018) doubled production volumes, transformed profitability, and introduced Lamborghini's visual language to buyers who will never rev a V12. Whether this constitutes dilution or expansion is a question the market has answered: the Urus is sold out continuously, and Lamborghini's financial strength funds the hypercar programmes that preserve the mythology. Ferruccio, who sold the company in 1973 when tractor sales dropped, would understand the logic completely.",
    insights: [
      { id: 'insight-lam-1', category: 'The Founding Argument',
        text: "The story of Ferruccio Lamborghini and Enzo Ferrari defines the brand's identity: Lamborghini exists to prove a point. Every design decision, every lap record attempt, every outrageous special edition is a continuation of the original argument. Ferrari builds for performance; Lamborghini builds for provocation.",
        confidence: 0.97, importance: 'critical' },
      { id: 'insight-lam-2', category: "Gandini's Design Language",
        text: "Marcello Gandini, designing the Miura at 25 and the Countach at 26, created the visual vocabulary of the modern supercar. The mid-engine wedge silhouette, scissor doors, and aggressive surface language he established at Bertone were adopted by Ferrari, Porsche, and every subsequent supercar manufacturer. No single designer has had more influence on how high-performance cars look.",
        confidence: 0.96, importance: 'critical' },
      { id: 'insight-lam-3', category: 'The Gallardo–R8 Platform Paradox',
        text: "The Lamborghini Gallardo and the Audi R8 share the same aluminium space frame, engines, and transmissions. Audi gained a halo product with genuine supercar credibility; Lamborghini gained engineering investment only a VW Group budget could provide. Neither car suffered — both improved. This is the template for all subsequent Lamborghini-VW Group platform sharing.",
        confidence: 0.93, importance: 'high' },
      { id: 'insight-lam-4', category: 'The V12 vs V10 vs V8 Strategy',
        text: "Maintaining parallel V12, V10, and now V8 lineages simultaneously is Lamborghini's most sophisticated commercial decision. The V12 flagship preserves the mythological heritage; the V10 and V8 lines deliver volume at lower price points. The Temerario's 920 hp hybrid V8 is now more powerful than the original Aventador V12 — a statistic that would have seemed impossible in 2011.",
        confidence: 0.91, importance: 'high' },
      { id: 'insight-lam-5', category: 'Urus: Heresy or Genius?',
        text: "The Urus doubled Lamborghini's production from 3,500 to over 8,000 cars annually. The commercial logic is impeccable; the philosophical question is whether Lamborghini can simultaneously be the world's most irrational supercar brand and a practical SUV manufacturer. So far, the answer is yes — because the Urus looks like a Lamborghini, and looking like a Lamborghini is 60% of what a Lamborghini is.",
        confidence: 0.89, importance: 'high' }
    ],
    confidenceScore: 0.94, processingTimeMs: 4600,
    createdAt: '2026-01-15T10:00:00Z', isCached: true
  },
  models: models
};

fs.writeFileSync('C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/brands/lamborghini.json', JSON.stringify(brand, null, 2));
console.log('Done. DNA dims:', brand.dna.dimensions.length, '| temporal:', brand.dna.temporalEvolution.length, '| insights:', brand.analysis.insights.length, '| models:', brand.models.length);
