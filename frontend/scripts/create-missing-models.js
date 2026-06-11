const fs = require('fs');
const dir = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/models/';
const now = '2026-01-01T00:00:00Z';

const files = [
  { slug:'porsche-356', name:'356', brandId:'brand-porsche', bodyType:'coupe', segment:'sports', startYear:1948, endYear:1965,
    desc:'The Porsche 356 (1948-1965) was the first Porsche, built by Ferry Porsche using Volkswagen Beetle components. Its evolution through Pre-A, A, B, and C series laid every engineering principle that the 911 would inherit — rear-engine layout, torsion bar suspension, and a philosophy of continuous refinement over revolution.' },
  { slug:'vw-beetle', name:'Beetle', brandId:'brand-volkswagen', bodyType:'sedan', segment:'midsize', startYear:1938, endYear:2019,
    desc:'The Volkswagen Beetle (1938-2019) is the best-selling car of a single design in history. Ferdinand Porsche\'s air-cooled rear-engine layout directly influenced the 356 and 911 and established the founding ethos of the Volkswagen Group.' },
  { slug:'vw-new-beetle', name:'New Beetle', brandId:'brand-volkswagen', bodyType:'hatchback', segment:'midsize', startYear:1997, endYear:2011,
    desc:'The New Beetle (1997-2011) was Volkswagen\'s retro revival, built on the Golf platform. The opposite of everything the original stood for technically, and enormously commercially successful.' },
  { slug:'vw-passat', name:'Passat', brandId:'brand-volkswagen', bodyType:'sedan', segment:'midsize', startYear:1973, endYear:null,
    desc:'The Volkswagen Passat (1973-present) is the Group executive car, sharing its B1 platform with the Audi 80 and evolving across eight generations into the European family estate benchmark.' },
  { slug:'vw-id3', name:'ID.3', brandId:'brand-volkswagen', bodyType:'hatchback', segment:'midsize', startYear:2019, endYear:null,
    desc:'The Volkswagen ID.3 (2019-present) is the first purpose-built MEB-platform electric car, intended to do for electric vehicles what the original Golf did for hatchbacks.' },
  { slug:'vw-id4', name:'ID.4', brandId:'brand-volkswagen', bodyType:'suv', segment:'midsize', startYear:2020, endYear:null,
    desc:'The Volkswagen ID.4 (2020-present) is the MEB-platform electric SUV — the ID family volume leader and the electric equivalent of the Tiguan in the range.' },
  { slug:'mercedes-a-class', name:'A-Class', brandId:'brand-mercedes', bodyType:'hatchback', segment:'luxury', startYear:1997, endYear:null,
    desc:'The Mercedes-Benz A-Class (1997-present) brought the three-pointed star to the compact hatchback segment. Its W168 sandwich floor was revolutionary; the W177 became the best-selling premium compact globally.' },
  { slug:'mercedes-slk', name:'SLK', brandId:'brand-mercedes', bodyType:'convertible', segment:'luxury', startYear:1996, endYear:2022,
    desc:'The Mercedes-Benz SLK (1996-2022, renamed SLC in 2016) was a compact roadster with a folding metal hardtop — a technical novelty at launch that became the template for the segment.' },
  { slug:'mercedes-clk', name:'CLK', brandId:'brand-mercedes', bodyType:'coupe', segment:'luxury', startYear:1997, endYear:2009,
    desc:'The Mercedes-Benz CLK (1997-2009) combined E-Class engineering with C-Class dimensions to produce one of the most elegant Mercedes designs of its era. Replaced by the E-Class Coupe W207.' },
  { slug:'mercedes-amg-c63', name:'AMG C63', brandId:'brand-mercedes', bodyType:'sedan', segment:'sports', startYear:2008, endYear:null,
    desc:'The Mercedes-AMG C63 (2008-present) established AMG as a credible BMW M3 rival. Its 6.2-litre V8 in the W204 is considered the finest AMG engine ever built for its sound and response.' },
  { slug:'ferrari-250-gt', name:'250 GT', brandId:'brand-ferrari', bodyType:'coupe', segment:'sports', startYear:1956, endYear:1964,
    desc:'The Ferrari 250 GT (1956-1964) was Ferrari\'s first commercially successful road car. The 250 GTO is the most valuable car in existence; the 250 Lusso is the most graceful. All share a 3.0-litre Colombo V12.' },
  { slug:'ferrari-mondial', name:'Mondial', brandId:'brand-ferrari', bodyType:'coupe', segment:'sports', startYear:1980, endYear:1993,
    desc:'The Ferrari Mondial (1980-1993) was Ferrari\'s entry-level 2+2 mid-engine coupe designed for everyday usability. Often dismissed for its relative performance, it introduced many buyers to Ferrari ownership.' },
  { slug:'ferrari-512-tr', name:'512 TR', brandId:'brand-ferrari', bodyType:'coupe', segment:'sports', startYear:1991, endYear:1996,
    desc:'The Ferrari 512 TR (1991-1996) was the Testarossa\'s modernised successor with revised suspension and improved engine. The F512M of 1994 was its final evolution before the 550 Maranello ended the flat-12 era.' },
  { slug:'lotus-elan', name:'Elan', brandId:'brand-lotus', bodyType:'convertible', segment:'sports', startYear:1962, endYear:1975,
    desc:'The Lotus Elan (1962-1975) was Colin Chapman\'s definitive lightweight sports car: fibreglass body on a steel backbone chassis with a twin-cam Ford engine. Its steering was so exceptional every subsequent generation measured itself against it.' },
  { slug:'lotus-europa', name:'Europa', brandId:'brand-lotus', bodyType:'coupe', segment:'sports', startYear:1966, endYear:1975,
    desc:'The Lotus Europa (1966-1975) was Lotus\'s mid-engine production car — so radical it was mistaken for a racing car on public roads. Its combination of mid-engine layout and minimal weight directly inspired the Esprit.' },
  { slug:'seat-ibiza', name:'Ibiza', brandId:'brand-seat', bodyType:'hatchback', segment:'midsize', startYear:1984, endYear:null,
    desc:'The SEAT Ibiza (1984-present) is Spain\'s best-known car export. Five generations on VW Group platforms have made it the most successful Spanish car in history.' },
  { slug:'seat-leon', name:'Leon', brandId:'brand-seat', bodyType:'hatchback', segment:'midsize', startYear:1999, endYear:null,
    desc:'The SEAT Leon (1999-present) shares successive Golf platforms while delivering more aggressive styling and the Cupra performance variants that rival the Golf GTI.' },
  { slug:'skoda-octavia', name:'Octavia', brandId:'brand-skoda', bodyType:'sedan', segment:'midsize', startYear:1996, endYear:null,
    desc:'The Skoda Octavia (1996-present) consistently delivers more space than any VW Group equivalent at a lower price. It is the best-selling car in several Central European markets.' },
  { slug:'skoda-superb', name:'Superb', brandId:'brand-skoda', bodyType:'sedan', segment:'luxury', startYear:2001, endYear:null,
    desc:'The Skoda Superb (2001-present) shares its platform with the VW Passat and Audi A4 while delivering more rear passenger space than either. The name revives a pre-war Skoda model.' },
];

let created = 0;
files.forEach(f => {
  const path = dir + f.slug + '.json';
  if (fs.existsSync(path)) { console.log('  skip (exists):', f.slug); return; }
  const brandName = f.brandId.replace('brand-', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const obj = {
    id: 'm-' + f.slug, slug: f.slug, name: f.name,
    fullName: brandName + ' ' + f.name,
    brandId: f.brandId, bodyType: f.bodyType, segment: f.segment,
    primaryMarket: 'global', startYear: f.startYear,
    endYear: f.endYear || null, isActive: !f.endYear,
    description: f.desc, generationCount: 1,
    thumbnailUrl: '', heroImageUrl: '',
    tags: [f.bodyType, f.brandId.replace('brand-', '')],
    aiAnalysisAvailable: false,
    createdAt: now, updatedAt: now,
    generations: [{
      id: 'gen-' + f.slug + '-1', slug: f.slug + '-gen1',
      modelId: 'm-' + f.slug, brandId: f.brandId,
      codeName: f.name, generationNumber: 1,
      startYear: f.startYear, endYear: f.endYear || null,
      isFacelift: false, isConcept: false,
      bodyTypes: [f.bodyType], engineTypes: ['ICE'],
      markets: ['global'], description: f.desc,
      thumbnailUrl: '', heroImageUrl: '', images: []
    }]
  };
  fs.writeFileSync(path, JSON.stringify(obj, null, 2));
  console.log('✅', f.slug);
  created++;
});
console.log('\nCreated:', created, 'files');
