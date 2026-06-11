/**
 * add-japan-fl-variants.js
 * Добавляет недостающие фейслифты и модификации для 5 японских брендов
 */
const fs   = require('fs');
const PATH = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const EID  = new Set(data.nodes.map(n => n.id));
const EEI  = new Set(data.edges.map(e => e.id));

const n = (id,label,year,brandId,brandName,codeName,modelSlug,bodyType,segment,zone,hp,eng) =>
  ({id,label,type:'generation',year,brandId,brandName,codeName,modelSlug,bodyType,segment,zone,hp,engineType:eng});
const fl = (id,src,tgt) => ({id,source:src,target:tgt,type:'facelifted_to',strength:0.90});
const va = (id,src,tgt) => ({id,source:src,target:tgt,type:'variant_of',   strength:0.90});

// ═══════════════════════════════════════════════════════════════════════════════
// TOYOTA — недостающие фейслифты
// ═══════════════════════════════════════════════════════════════════════════════
const TOYOTA_FL = [
  n('toyota-supra-a60-fl', 'Supra A60 FL',        1984,'toyota','Toyota','A60 FL','toyota-supra',       'coupe',    'sports',     'sports',     190,'i6t'),
  n('toyota-supra-a70-fl', 'Supra A70 FL',        1990,'toyota','Toyota','A70 FL','toyota-supra',       'coupe',    'sports',     'sports',     239,'i6t'),
  n('toyota-mr2-aw11-fl',  'MR2 AW11 FL',         1987,'toyota','Toyota','AW11 FL','toyota-mr2',        'coupe',    'sports',     'sports',     145,'i4'),
  n('toyota-mr2-sw20-fl',  'MR2 SW20 FL',         1995,'toyota','Toyota','SW20 FL','toyota-mr2',        'coupe',    'sports',     'sports',     245,'i4t'),
  n('toyota-ae86-fl',      'AE86 FL',             1985,'toyota','Toyota','AE86 FL','toyota-86',         'coupe',    'sports',     'sports',     128,'i4'),
  n('toyota-gt86-zn6-fl',  'GT86 ZN6 FL',         2016,'toyota','Toyota','ZN6 FL','toyota-86',         'coupe',    'sports',     'sports',     200,'flat4'),
  n('toyota-corolla-e80-fl','Corolla E80 FL',      1986,'toyota','Toyota','E80 FL','toyota-corolla',    'sedan',    'compact',    'midsize_sed', 90,'i4'),
  n('toyota-corolla-e90-fl','Corolla E90 FL',      1990,'toyota','Toyota','E90 FL','toyota-corolla',    'sedan',    'compact',    'midsize_sed',115,'i4'),
  n('toyota-corolla-e100-fl','Corolla E100 FL',    1995,'toyota','Toyota','E100 FL','toyota-corolla',   'sedan',    'compact',    'midsize_sed',115,'i4'),
  n('toyota-corolla-e120-fl','Corolla E120 FL',    2004,'toyota','Toyota','E120 FL','toyota-corolla',   'sedan',    'compact',    'midsize_sed',132,'i4'),
  n('toyota-corolla-e160-fl','Corolla E160 FL',    2016,'toyota','Toyota','E160 FL','toyota-corolla',   'sedan',    'compact',    'midsize_sed',132,'i4'),
  n('toyota-camry-v20-fl', 'Camry V20 FL',        1988,'toyota','Toyota','V20 FL','toyota-camry',      'sedan',    'midsize',    'exec_sed',   100,'i4'),
  n('toyota-camry-v40-fl', 'Camry V40 FL',        1999,'toyota','Toyota','V40 FL','toyota-camry',      'sedan',    'midsize',    'exec_sed',   133,'i4'),
  n('toyota-camry-v50-fl', 'Camry V50 FL',        2004,'toyota','Toyota','V50 FL','toyota-camry',      'sedan',    'midsize',    'exec_sed',   150,'i4'),
  n('toyota-camry-v60-fl', 'Camry V60 FL',        2009,'toyota','Toyota','V60 FL','toyota-camry',      'sedan',    'midsize',    'exec_sed',   272,'v6'),
  n('toyota-camry-v70-fl', 'Camry V70 FL',        2014,'toyota','Toyota','V70 FL','toyota-camry',      'sedan',    'midsize',    'exec_sed',   200,'i4h'),
  n('toyota-rav4-1-fl',    'RAV4 1st Gen FL',     1997,'toyota','Toyota','XA10 FL','toyota-rav4',      'suv',      'compact_suv','suv_mid',    120,'i4'),
  n('toyota-rav4-2-fl',    'RAV4 2nd Gen FL',     2003,'toyota','Toyota','XA20 FL','toyota-rav4',      'suv',      'compact_suv','suv_mid',    148,'i4'),
  n('toyota-rav4-3-fl',    'RAV4 3rd Gen FL',     2008,'toyota','Toyota','XA30 FL','toyota-rav4',      'suv',      'compact_suv','suv_mid',    158,'i4'),
  n('toyota-rav4-4-fl',    'RAV4 4th Gen FL',     2015,'toyota','Toyota','XA40 FL','toyota-rav4',      'suv',      'compact_suv','suv_mid',    178,'i4'),
  n('toyota-lc-60-fl',     'Land Cruiser 60 FL',  1987,'toyota','Toyota','FJ62','toyota-land-cruiser', 'suv',      'off_road',   'suv_large',  155,'i6'),
  n('toyota-lc-200-fl',    'Land Cruiser 200 FL', 2012,'toyota','Toyota','URJ200 FL','toyota-land-cruiser','suv',  'off_road',   'suv_large',  309,'v8'),
  n('toyota-prius-1-fl',   'Prius 1st Gen FL',    2000,'toyota','Toyota','NHW11 FL','toyota-prius',    'sedan',    'hybrid',     'midsize_sed', 72,'i4h'),
  n('toyota-prius-2-fl',   'Prius 2nd Gen FL',    2006,'toyota','Toyota','NHW20 FL','toyota-prius',    'hatchback','hybrid',     'midsize_sed', 76,'i4h'),
  n('toyota-prius-3-fl',   'Prius 3rd Gen FL',    2012,'toyota','Toyota','ZVW30 FL','toyota-prius',    'hatchback','hybrid',     'midsize_sed', 99,'i4h'),
  n('lexus-ls-ucf10-fl',   'Lexus LS 400 FL',     1992,'toyota','Toyota','UCF10 FL','lexus-ls',        'sedan',    'luxury',     'flagship_sed',261,'v8'),
  n('lexus-ls-ucf20-fl',   'Lexus LS 400 UCF20 FL',1997,'toyota','Toyota','UCF20 FL','lexus-ls',       'sedan',    'luxury',     'flagship_sed',295,'v8'),
  n('lexus-ls-ucf30-fl',   'Lexus LS 430 FL',     2004,'toyota','Toyota','UCF30 FL','lexus-ls',        'sedan',    'luxury',     'flagship_sed',290,'v8'),
  n('lexus-ls-xf50-fl',    'Lexus LS 500 FL',     2021,'toyota','Toyota','XF50 FL','lexus-ls',         'sedan',    'luxury',     'flagship_sed',416,'v6t'),
  // Варианты Toyota
  n('toyota-celica-zzt231','Celica ZZT231',        1999,'toyota','Toyota','ZZT231','toyota-celica',    'coupe',    'sports',     'sports',     189,'i4'),
  n('toyota-gr-corolla',   'GR Corolla',           2022,'toyota','Toyota','GZEA10','toyota-corolla',   'hatchback','sports',     'sports',     304,'i3t'),
  n('toyota-mr2-sw20-turbo','MR2 SW20 Turbo',      1991,'toyota','Toyota','SW20T','toyota-mr2',        'coupe',    'sports',     'sports',     245,'i4t'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// HONDA — недостающие фейслифты и модификации
// ═══════════════════════════════════════════════════════════════════════════════
const HONDA_FL = [
  n('honda-civic-eg-fl',   'Civic EG FL',          1994,'honda','Honda','EG FL',   'honda-civic',       'hatchback','compact',    'hatchback',  160,'i4'),
  n('honda-civic-ek-fl',   'Civic EK FL',          1998,'honda','Honda','EK FL',   'honda-civic',       'hatchback','compact',    'hatchback',  160,'i4'),
  n('honda-civic-ep3-fl',  'Civic EP3 FL',         2003,'honda','Honda','EP3 FL',  'honda-civic',       'hatchback','compact',    'hatchback',  165,'i4'),
  n('honda-civic-fd-fl',   'Civic FD FL',          2008,'honda','Honda','FD FL',   'honda-civic',       'sedan',    'compact',    'midsize_sed',140,'i4'),
  n('honda-civic-fb-fl',   'Civic FB FL',          2014,'honda','Honda','FB FL',   'honda-civic',       'sedan',    'compact',    'midsize_sed',142,'i4'),
  n('honda-civic-fk8-fl',  'Civic Type R FK8 FL',  2020,'honda','Honda','FK8 FL',  'honda-civic-type-r','hatchback','sports',    'sports',     320,'i4t'),
  n('honda-accord-cb-fl',  'Accord CB FL',         1992,'honda','Honda','CB FL',   'honda-accord',      'sedan',    'midsize',    'exec_sed',   158,'i4'),
  n('honda-accord-cd-fl',  'Accord CD FL',         1996,'honda','Honda','CD FL',   'honda-accord',      'sedan',    'midsize',    'exec_sed',   150,'i4'),
  n('honda-accord-cg-fl',  'Accord CG FL',         2000,'honda','Honda','CG FL',   'honda-accord',      'sedan',    'midsize',    'exec_sed',   155,'i4'),
  n('honda-accord-cl-fl',  'Accord CL FL',         2005,'honda','Honda','CL FL',   'honda-accord',      'sedan',    'midsize',    'exec_sed',   190,'v6'),
  n('honda-accord-cp-fl',  'Accord CP FL',         2010,'honda','Honda','CP FL',   'honda-accord',      'sedan',    'midsize',    'exec_sed',   190,'v6'),
  n('honda-accord-cr-fl',  'Accord CR FL',         2015,'honda','Honda','CR FL',   'honda-accord',      'sedan',    'midsize',    'exec_sed',   185,'i4t'),
  n('honda-crv-rd1-fl',    'CR-V RD1 FL',          1997,'honda','Honda','RD1 FL',  'honda-crv',         'suv',      'compact_suv','suv_mid',    126,'i4'),
  n('honda-crv-rd4-fl',    'CR-V RD4 FL',          2004,'honda','Honda','RD4 FL',  'honda-crv',         'suv',      'compact_suv','suv_mid',    160,'i4'),
  n('honda-crv-re4-fl',    'CR-V RE4 FL',          2009,'honda','Honda','RE4 FL',  'honda-crv',         'suv',      'compact_suv','suv_mid',    166,'i4'),
  n('honda-crv-rm1-fl',    'CR-V RM1 FL',          2014,'honda','Honda','RM1 FL',  'honda-crv',         'suv',      'compact_suv','suv_mid',    185,'i4'),
  n('honda-nsx-nc1-fl',    'NSX NC1 FL',           2019,'honda','Honda','NC1 FL',  'honda-nsx',         'coupe',    'sports',     'supercar',   600,'v6h'),
  n('honda-integra-dc2-fl','Integra DC2 FL',       1998,'honda','Honda','DC2 FL',  'honda-integra',     'coupe',    'sports',     'sports',     195,'i4'),
  n('honda-integra-dc5-fl','Integra DC5 FL',       2004,'honda','Honda','DC5 FL',  'honda-integra',     'coupe',    'sports',     'sports',     220,'i4'),
  // Модификации Honda
  n('honda-civic-type-r-eg','Civic Type R EK9',    1997,'honda','Honda','EK9',     'honda-civic-type-r','hatchback','sports',    'sports',     185,'i4'),
  n('honda-s2000-cr',       'S2000 CR',            2007,'honda','Honda','AP2 CR',  'honda-s2000',       'roadster', 'sports',     'sports',     247,'i4'),
  n('honda-nsx-type-r',     'NSX Type R NA1',      1992,'honda','Honda','NA1-R',   'honda-nsx',         'coupe',    'sports',     'supercar',   276,'v6'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NISSAN — недостающие фейслифты и модификации
// ═══════════════════════════════════════════════════════════════════════════════
const NISSAN_FL = [
  n('nissan-skyline-r32-fl','Skyline GT-R R32 FL',  1991,'nissan','Nissan','R32 FL','nissan-skyline-gtr','coupe','sports','sports',  280,'i6t'),
  n('nissan-skyline-r33-fl','Skyline GT-R R33 FL',  1998,'nissan','Nissan','R33 FL','nissan-skyline-gtr','coupe','sports','sports',  280,'i6t'),
  n('nissan-skyline-r34-fl','Skyline GT-R R34 FL',  2001,'nissan','Nissan','R34 FL','nissan-skyline-gtr','coupe','sports','sports',  280,'i6t'),
  n('nissan-z-z32-fl',      '300ZX Z32 FL',         1993,'nissan','Nissan','Z32 FL','nissan-z',          'coupe','sports','sports',  300,'v6t'),
  n('nissan-z-z34-fl',      '370Z Z34 FL',          2012,'nissan','Nissan','Z34 FL','nissan-z',          'coupe','sports','sports',  332,'v6'),
  n('nissan-silvia-s13-fl', 'Silvia S13 FL',        1991,'nissan','Nissan','S13 FL','nissan-silvia',     'coupe','sports','sports',  205,'i4t'),
  n('nissan-silvia-s14-fl', 'Silvia S14 FL',        1996,'nissan','Nissan','S14 FL','nissan-silvia',     'coupe','sports','sports',  220,'i4t'),
  n('nissan-patrol-y60-fl', 'Patrol Y60 FL',        1993,'nissan','Nissan','Y60 FL','nissan-patrol',     'suv',  'off_road','suv_large',155,'i6'),
  n('nissan-patrol-y62-fl', 'Patrol Y62 FL',        2014,'nissan','Nissan','Y62 FL','nissan-patrol',     'suv',  'off_road','suv_large',405,'v8'),
  n('nissan-leaf-1-fl',     'Leaf 1st Gen FL',      2013,'nissan','Nissan','ZE0 FL','nissan-leaf',       'hatchback','electric','electric',109,'ev'),
  n('nissan-z-z31-fl',      '300ZX Z31 FL',         1987,'nissan','Nissan','Z31 FL','nissan-z',          'coupe','sports','sports',  170,'v6'),
  // Модификации Nissan
  n('nissan-180sx',         '180SX',                1989,'nissan','Nissan','RPS13','nissan-silvia',      'coupe','sports','sports',  205,'i4t'),
  n('nissan-gtr-r35-nismo', 'GT-R R35 NISMO',       2014,'nissan','Nissan','R35 NISMO','nissan-gtr',     'coupe','sports','supercar',600,'v6t'),
  n('nissan-z-z33-nismo',   '350Z Z33 NISMO',       2004,'nissan','Nissan','Z33 NISMO','nissan-z',       'coupe','sports','sports',  298,'v6'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAZDA — недостающие фейслифты и модификации
// ═══════════════════════════════════════════════════════════════════════════════
const MAZDA_FL = [
  n('mazda-rx7-sa-fl',  'RX-7 SA22C FL',      1981,'mazda','Mazda','SA FL', 'mazda-rx7',  'coupe','sports','sports',   115,'i4'),
  n('mazda-rx7-fc-fl',  'RX-7 FC FL',         1989,'mazda','Mazda','FC FL', 'mazda-rx7',  'coupe','sports','sports',   200,'i4t'),
  n('mazda-rx8-fl',     'RX-8 FL',            2008,'mazda','Mazda','SE3P FL','mazda-rx8', 'coupe','sports','sports',   231,'i4'),
  n('mazda-mx5-na-fl',  'MX-5 NA FL',         1993,'mazda','Mazda','NA FL', 'mazda-mx5',  'roadster','sports','sports', 130,'i4'),
  n('mazda-6-gg-fl',    'Mazda 6 GG FL',      2004,'mazda','Mazda','GG FL', 'mazda-6',    'sedan','midsize','exec_sed', 141,'i4'),
  n('mazda-6-gh-fl',    'Mazda 6 GH FL',      2010,'mazda','Mazda','GH FL', 'mazda-6',    'sedan','midsize','exec_sed', 147,'i4'),
  n('mazda-cx5-ke-fl',  'CX-5 KE FL',         2014,'mazda','Mazda','KE FL', 'mazda-cx5',  'suv','compact_suv','suv_mid',165,'i4'),
  n('mazda-3-bm-fl',    'Mazda 3 BM FL',      2016,'mazda','Mazda','BM FL', 'mazda-3',    'hatchback','compact','hatchback',120,'i4'),
  // Модификации Mazda
  n('mazda-mx5-nd-rf',  'MX-5 ND RF',         2016,'mazda','Mazda','ND RF','mazda-mx5',   'coupe','sports','sports',   184,'i4'),
  n('mazda-3-mps',      'Mazda 3 MPS',        2007,'mazda','Mazda','BL MPS','mazda-3',    'hatchback','sports','hatchback',256,'i4t'),
  n('mazda-6-mps',      'Mazda 6 MPS',        2006,'mazda','Mazda','GG MPS','mazda-6',    'sedan','sports','exec_sed', 260,'i4t'),
  n('mazda-rx7-fd-spirit','RX-7 FD Spirit R', 1999,'mazda','Mazda','FD SR','mazda-rx7',   'coupe','sports','supercar', 255,'i4t'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUBARU — недостающие фейслифты и модификации
// ═══════════════════════════════════════════════════════════════════════════════
const SUBARU_FL = [
  n('subaru-legacy-bc-fl', 'Legacy BC FL',       1991,'subaru','Subaru','BC FL', 'subaru-legacy',   'sedan','midsize','midsize_sed',180,'flat4t'),
  n('subaru-legacy-bd-fl', 'Legacy BD FL',       1996,'subaru','Subaru','BD FL', 'subaru-legacy',   'sedan','midsize','midsize_sed',276,'flat4t'),
  n('subaru-legacy-be-fl', 'Legacy BE FL',       2001,'subaru','Subaru','BE FL', 'subaru-legacy',   'sedan','midsize','midsize_sed',250,'flat4t'),
  n('subaru-legacy-bl-fl', 'Legacy BL FL',       2006,'subaru','Subaru','BL FL', 'subaru-legacy',   'sedan','midsize','midsize_sed',255,'flat4t'),
  n('subaru-legacy-bn-fl', 'Legacy BN FL',       2017,'subaru','Subaru','BN FL', 'subaru-legacy',   'sedan','midsize','midsize_sed',260,'flat4t'),
  n('subaru-forester-sf-fl','Forester SF FL',    1999,'subaru','Subaru','SF FL', 'subaru-forester', 'suv','compact_suv','suv_mid',  170,'flat4t'),
  n('subaru-forester-sg-fl','Forester SG FL',    2005,'subaru','Subaru','SG FL', 'subaru-forester', 'suv','compact_suv','suv_mid',  230,'flat4t'),
  n('subaru-forester-sh-fl','Forester SH FL',    2010,'subaru','Subaru','SH FL', 'subaru-forester', 'suv','compact_suv','suv_mid',  300,'flat4t'),
  n('subaru-impreza-ge-fl', 'Impreza WRX GE FL', 2010,'subaru','Subaru','GE FL', 'subaru-impreza',  'sedan','sports','midsize_sed', 265,'flat4t'),
  n('subaru-impreza-gj-fl', 'Impreza GJ FL',     2014,'subaru','Subaru','GJ FL', 'subaru-impreza',  'sedan','compact','midsize_sed',154,'flat4'),
  n('subaru-brz-zc6-fl',   'BRZ ZC6 FL',        2014,'subaru','Subaru','ZC6 FL','subaru-brz',       'coupe','sports','sports',     200,'flat4'),
  n('subaru-brz-zd8-fl',   'BRZ ZD8 FL',        2024,'subaru','Subaru','ZD8 FL','subaru-brz',       'coupe','sports','sports',     228,'flat4'),
  // Модификации Subaru (WRX STI по поколениям)
  n('subaru-wrx-sti-gc',   'Impreza WRX STI GC', 1994,'subaru','Subaru','GC STI','subaru-wrx-sti',  'sedan','sports','sports',     275,'flat4t'),
  n('subaru-wrx-sti-gd',   'Impreza WRX STI GD', 2001,'subaru','Subaru','GD STI','subaru-wrx-sti',  'sedan','sports','sports',     300,'flat4t'),
  n('subaru-wrx-sti-ge',   'Impreza WRX STI GE', 2007,'subaru','Subaru','GE STI','subaru-wrx-sti',  'sedan','sports','sports',     305,'flat4t'),
  n('subaru-wrx-sti-va',   'WRX STI VA',         2014,'subaru','Subaru','VA STI','subaru-wrx-sti',   'sedan','sports','sports',     300,'flat4t'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// РЁБРА
// ═══════════════════════════════════════════════════════════════════════════════
const newEdges = [
  // TOYOTA facelifts
  fl('to-fl-a60',    'toyota-supra-a60',      'toyota-supra-a60-fl'),
  fl('to-fl-a70',    'toyota-supra-a70',      'toyota-supra-a70-fl'),
  fl('to-fl-aw11',   'toyota-mr2-aw11',       'toyota-mr2-aw11-fl'),
  fl('to-fl-sw20',   'toyota-mr2-sw20',       'toyota-mr2-sw20-fl'),
  fl('to-fl-ae86',   'toyota-ae86',           'toyota-ae86-fl'),
  fl('to-fl-zn6',    'toyota-gt86-zn6',       'toyota-gt86-zn6-fl'),
  fl('to-fl-e80',    'toyota-corolla-e80',    'toyota-corolla-e80-fl'),
  fl('to-fl-e90',    'toyota-corolla-e90',    'toyota-corolla-e90-fl'),
  fl('to-fl-e100',   'toyota-corolla-e100',   'toyota-corolla-e100-fl'),
  fl('to-fl-e120',   'toyota-corolla-e120',   'toyota-corolla-e120-fl'),
  fl('to-fl-e160',   'toyota-corolla-e160',   'toyota-corolla-e160-fl'),
  fl('to-fl-cv20',   'toyota-camry-v20',      'toyota-camry-v20-fl'),
  fl('to-fl-cv40',   'toyota-camry-v40',      'toyota-camry-v40-fl'),
  fl('to-fl-cv50',   'toyota-camry-v50',      'toyota-camry-v50-fl'),
  fl('to-fl-cv60',   'toyota-camry-v60',      'toyota-camry-v60-fl'),
  fl('to-fl-cv70',   'toyota-camry-v70',      'toyota-camry-v70-fl'),
  fl('to-fl-rav1',   'toyota-rav4-1',         'toyota-rav4-1-fl'),
  fl('to-fl-rav2',   'toyota-rav4-2',         'toyota-rav4-2-fl'),
  fl('to-fl-rav3',   'toyota-rav4-3',         'toyota-rav4-3-fl'),
  fl('to-fl-rav4',   'toyota-rav4-4',         'toyota-rav4-4-fl'),
  fl('to-fl-lc60',   'toyota-lc-60',          'toyota-lc-60-fl'),
  fl('to-fl-lc200',  'toyota-lc-200',         'toyota-lc-200-fl'),
  fl('to-fl-pri1',   'toyota-prius-1',        'toyota-prius-1-fl'),
  fl('to-fl-pri2',   'toyota-prius-2',        'toyota-prius-2-fl'),
  fl('to-fl-pri3',   'toyota-prius-3',        'toyota-prius-3-fl'),
  fl('to-fl-ls10',   'lexus-ls-ucf10',        'lexus-ls-ucf10-fl'),
  fl('to-fl-ls20',   'lexus-ls-ucf20',        'lexus-ls-ucf20-fl'),
  fl('to-fl-ls30',   'lexus-ls-ucf30',        'lexus-ls-ucf30-fl'),
  fl('to-fl-ls50',   'lexus-ls-xf50',         'lexus-ls-xf50-fl'),
  // Toyota variants
  va('to-va-cel',    'toyota-corolla-e120',   'toyota-celica-zzt231'),
  va('to-va-grc',    'toyota-corolla-e210',   'toyota-gr-corolla'),
  va('to-va-sw20t',  'toyota-mr2-sw20',       'toyota-mr2-sw20-turbo'),

  // HONDA facelifts
  fl('ho-fl-eg',     'honda-civic-eg',        'honda-civic-eg-fl'),
  fl('ho-fl-ek',     'honda-civic-ek',        'honda-civic-ek-fl'),
  fl('ho-fl-ep3',    'honda-civic-ep3',       'honda-civic-ep3-fl'),
  fl('ho-fl-fd',     'honda-civic-fd',        'honda-civic-fd-fl'),
  fl('ho-fl-fb',     'honda-civic-fb',        'honda-civic-fb-fl'),
  fl('ho-fl-fk8',    'honda-civic-fk8',       'honda-civic-fk8-fl'),
  fl('ho-fl-accb',   'honda-accord-cb',       'honda-accord-cb-fl'),
  fl('ho-fl-accd',   'honda-accord-cd',       'honda-accord-cd-fl'),
  fl('ho-fl-accg',   'honda-accord-cg',       'honda-accord-cg-fl'),
  fl('ho-fl-accl',   'honda-accord-cl',       'honda-accord-cl-fl'),
  fl('ho-fl-accp',   'honda-accord-cp',       'honda-accord-cp-fl'),
  fl('ho-fl-accr',   'honda-accord-cr',       'honda-accord-cr-fl'),
  fl('ho-fl-rd1',    'honda-crv-rd1',         'honda-crv-rd1-fl'),
  fl('ho-fl-rd4',    'honda-crv-rd4',         'honda-crv-rd4-fl'),
  fl('ho-fl-re4',    'honda-crv-re4',         'honda-crv-re4-fl'),
  fl('ho-fl-rm1',    'honda-crv-rm1',         'honda-crv-rm1-fl'),
  fl('ho-fl-nc1',    'honda-nsx-nc1',         'honda-nsx-nc1-fl'),
  fl('ho-fl-dc2',    'honda-integra-dc2',     'honda-integra-dc2-fl'),
  fl('ho-fl-dc5',    'honda-integra-dc5',     'honda-integra-dc5-fl'),
  // Honda variants
  va('ho-va-ekr',    'honda-civic-ek',        'honda-civic-type-r-eg'),
  va('ho-va-s2cr',   'honda-s2000-ap2',       'honda-s2000-cr'),
  va('ho-va-nxr',    'honda-nsx-na1',         'honda-nsx-type-r'),

  // NISSAN facelifts
  fl('ni-fl-r32',    'nissan-skyline-r32',    'nissan-skyline-r32-fl'),
  fl('ni-fl-r33',    'nissan-skyline-r33',    'nissan-skyline-r33-fl'),
  fl('ni-fl-r34',    'nissan-skyline-r34',    'nissan-skyline-r34-fl'),
  fl('ni-fl-z32',    'nissan-z-z32',          'nissan-z-z32-fl'),
  fl('ni-fl-z34',    'nissan-z-z34',          'nissan-z-z34-fl'),
  fl('ni-fl-s13',    'nissan-silvia-s13',     'nissan-silvia-s13-fl'),
  fl('ni-fl-s14',    'nissan-silvia-s14',     'nissan-silvia-s14-fl'),
  fl('ni-fl-y60',    'nissan-patrol-y60',     'nissan-patrol-y60-fl'),
  fl('ni-fl-y62',    'nissan-patrol-y62',     'nissan-patrol-y62-fl'),
  fl('ni-fl-lf1',    'nissan-leaf-1',         'nissan-leaf-1-fl'),
  fl('ni-fl-z31',    'nissan-z-z31',          'nissan-z-z31-fl'),
  // Nissan variants
  va('ni-va-180sx',  'nissan-silvia-s13',     'nissan-180sx'),
  va('ni-va-nismo',  'nissan-gtr-r35',        'nissan-gtr-r35-nismo'),
  va('ni-va-z33n',   'nissan-z-z33',          'nissan-z-z33-nismo'),

  // MAZDA facelifts
  fl('mz-fl-sa',     'mazda-rx7-sa',          'mazda-rx7-sa-fl'),
  fl('mz-fl-fc',     'mazda-rx7-fc',          'mazda-rx7-fc-fl'),
  fl('mz-fl-rx8',    'mazda-rx8-se3p',        'mazda-rx8-fl'),
  fl('mz-fl-na',     'mazda-mx5-na',          'mazda-mx5-na-fl'),
  fl('mz-fl-6gg',    'mazda-6-gg',            'mazda-6-gg-fl'),
  fl('mz-fl-6gh',    'mazda-6-gh',            'mazda-6-gh-fl'),
  fl('mz-fl-ke',     'mazda-cx5-ke',          'mazda-cx5-ke-fl'),
  fl('mz-fl-bm',     'mazda-3-bm',            'mazda-3-bm-fl'),
  // Mazda variants
  va('mz-va-rf',     'mazda-mx5-nd',          'mazda-mx5-nd-rf'),
  va('mz-va-mps3',   'mazda-3-bl',            'mazda-3-mps'),
  va('mz-va-mps6',   'mazda-6-gg',            'mazda-6-mps'),
  va('mz-va-spirr',  'mazda-rx7-fd-fl',       'mazda-rx7-fd-spirit'),

  // SUBARU facelifts
  fl('su-fl-bc',     'subaru-legacy-bc',      'subaru-legacy-bc-fl'),
  fl('su-fl-bd',     'subaru-legacy-bd',      'subaru-legacy-bd-fl'),
  fl('su-fl-be',     'subaru-legacy-be',      'subaru-legacy-be-fl'),
  fl('su-fl-bl',     'subaru-legacy-bl',      'subaru-legacy-bl-fl'),
  fl('su-fl-bn',     'subaru-legacy-bn',      'subaru-legacy-bn-fl'),
  fl('su-fl-sfr',    'subaru-forester-sf',    'subaru-forester-sf-fl'),
  fl('su-fl-sg',     'subaru-forester-sg',    'subaru-forester-sg-fl'),
  fl('su-fl-sh',     'subaru-forester-sh',    'subaru-forester-sh-fl'),
  fl('su-fl-ge',     'subaru-impreza-ge',     'subaru-impreza-ge-fl'),
  fl('su-fl-gj',     'subaru-impreza-gj',     'subaru-impreza-gj-fl'),
  fl('su-fl-zc6',    'subaru-brz-zc6',        'subaru-brz-zc6-fl'),
  fl('su-fl-zd8',    'subaru-brz-zd8',        'subaru-brz-zd8-fl'),
  // Subaru STI как варианты WRX
  va('su-va-sti-gc', 'subaru-impreza-gc',     'subaru-wrx-sti-gc'),
  va('su-va-sti-gd', 'subaru-impreza-gd',     'subaru-wrx-sti-gd'),
  va('su-va-sti-ge', 'subaru-impreza-ge',     'subaru-wrx-sti-ge'),
  va('su-va-sti-va', 'subaru-wrx-va',         'subaru-wrx-sti-va'),
  // STI эволюция
  {id:'su-sti-1',source:'subaru-wrx-sti-gc',target:'subaru-wrx-sti-gd',type:'evolves_into',strength:0.95},
  {id:'su-sti-2',source:'subaru-wrx-sti-gd',target:'subaru-wrx-sti-ge',type:'evolves_into',strength:0.95},
  {id:'su-sti-3',source:'subaru-wrx-sti-ge',target:'subaru-wrx-sti-va', type:'evolves_into',strength:0.95},
];

// ─── APPLY ───────────────────────────────────────────────────────────────────
const allNodes = [...TOYOTA_FL,...HONDA_FL,...NISSAN_FL,...MAZDA_FL,...SUBARU_FL];
let addN=0, addE=0, skipN=0, skipE=0;

allNodes.forEach(node => {
  if (EID.has(node.id)) { skipN++; return; }
  data.nodes.push(node); EID.add(node.id); addN++;
});
newEdges.forEach(edge => {
  if (EEI.has(edge.id)) { skipE++; return; }
  if (!EID.has(edge.source)) { console.warn('⚠ no src:', edge.source); skipE++; return; }
  if (!EID.has(edge.target)) { console.warn('⚠ no tgt:', edge.target); skipE++; return; }
  data.edges.push(edge); EEI.add(edge.id); addE++;
});

fs.writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf8');

// Статистика по типам добавленного
const flCount = newEdges.filter(e=>e.type==='facelifted_to').length;
const vaCount = newEdges.filter(e=>e.type==='variant_of').length;
const evCount = newEdges.filter(e=>e.type==='evolves_into').length;
console.log(`✅ Узлов: +${addN}  (пропущено: ${skipN})`);
console.log(`✅ Рёбер: +${addE}  (пропущено: ${skipE})`);
console.log(`   facelifted_to: ${flCount}  |  variant_of: ${vaCount}  |  evolves_into: ${evCount}`);
console.log(`📊 Всего: ${data.nodes.length} узлов, ${data.edges.length} рёбер`);

// Итоговый счёт фейслифтов и вариантов по японским брендам
const jb = new Set(['toyota','honda','nissan','mazda','subaru']);
const jIds = new Set(data.nodes.filter(n=>jb.has(n.brandId)).map(n=>n.id));
const jFL = data.edges.filter(e=>e.type==='facelifted_to'&&jIds.has(e.source)).length;
const jVA = data.edges.filter(e=>e.type==='variant_of'&&(jIds.has(e.source)||jIds.has(e.target))).length;
console.log(`\n🇯🇵 Японские бренды итого: ${jFL} фейслифтов, ${jVA} модификаций`);
