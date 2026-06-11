/**
 * add-japan-brands.js
 * Toyota · Honda · Nissan · Mazda · Subaru
 */
const fs   = require('fs');
const PATH = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const EID  = new Set(data.nodes.map(n => n.id));
const EEI  = new Set(data.edges.map(e => e.id));

const n = (id,label,year,brandId,brandName,codeName,modelSlug,bodyType,segment,zone,hp,eng) =>
  ({id,label,type:'generation',year,brandId,brandName,codeName,modelSlug,bodyType,segment,zone,hp,engineType:eng});
const ev  = (id,src,tgt) => ({id,source:src,target:tgt,type:'evolves_into',  strength:0.95});
const fl  = (id,src,tgt) => ({id,source:src,target:tgt,type:'facelifted_to', strength:0.90});
const va  = (id,src,tgt) => ({id,source:src,target:tgt,type:'variant_of',    strength:0.90});

// ═══════════════════════════════════════════════════════════════════════════════
// TOYOTA
// ═══════════════════════════════════════════════════════════════════════════════
const TOYOTA = [
  // ── Supra ────────────────────────────────────────────────────────────────
  n('toyota-supra-a60',  'Supra A60',   1981,'toyota','Toyota','A60','toyota-supra','coupe','sports','sports',168,'i6'),
  n('toyota-supra-a70',  'Supra A70',   1986,'toyota','Toyota','A70','toyota-supra','coupe','sports','sports',230,'i6t'),
  n('toyota-supra-a80',  'Supra A80',   1993,'toyota','Toyota','A80','toyota-supra','coupe','sports','supercar',321,'i6t'),
  n('toyota-supra-a90',  'GR Supra A90',2019,'toyota','Toyota','A90','toyota-supra','coupe','sports','supercar',387,'i6t'),
  // ── 86 / AE86 ────────────────────────────────────────────────────────────
  n('toyota-ae86',       'AE86 Corolla',1983,'toyota','Toyota','AE86','toyota-86','coupe','sports','sports',128,'i4'),
  n('toyota-gt86-zn6',   'GT86 ZN6',    2012,'toyota','Toyota','ZN6', 'toyota-86','coupe','sports','sports',200,'flat4'),
  n('toyota-gr86-zn8',   'GR86 ZN8',    2021,'toyota','Toyota','ZN8', 'toyota-86','coupe','sports','sports',234,'flat4'),
  // ── MR2 ──────────────────────────────────────────────────────────────────
  n('toyota-mr2-aw11',   'MR2 AW11',    1984,'toyota','Toyota','AW11','toyota-mr2','coupe','sports','sports',128,'i4'),
  n('toyota-mr2-sw20',   'MR2 SW20',    1989,'toyota','Toyota','SW20','toyota-mr2','coupe','sports','sports',225,'i4t'),
  n('toyota-mr2-w30',    'MR2 Spyder W30',1999,'toyota','Toyota','W30','toyota-mr2','roadster','sports','sports',138,'i4'),
  // ── Land Cruiser ─────────────────────────────────────────────────────────
  n('toyota-lc-60',      'Land Cruiser 60',1980,'toyota','Toyota','FJ60','toyota-land-cruiser','suv','off_road','suv_large',135,'i6'),
  n('toyota-lc-80',      'Land Cruiser 80',1989,'toyota','Toyota','FJ80','toyota-land-cruiser','suv','off_road','suv_large',156,'i6'),
  n('toyota-lc-100',     'Land Cruiser 100',1998,'toyota','Toyota','UZJ100','toyota-land-cruiser','suv','off_road','suv_large',235,'v8'),
  n('toyota-lc-200',     'Land Cruiser 200',2007,'toyota','Toyota','URJ200','toyota-land-cruiser','suv','off_road','suv_large',309,'v8'),
  n('toyota-lc-300',     'Land Cruiser 300',2021,'toyota','Toyota','VJA300','toyota-land-cruiser','suv','off_road','suv_large',415,'v6t'),
  // ── RAV4 ─────────────────────────────────────────────────────────────────
  n('toyota-rav4-1',     'RAV4 1st Gen', 1994,'toyota','Toyota','XA10','toyota-rav4','suv','compact_suv','suv_mid',120,'i4'),
  n('toyota-rav4-2',     'RAV4 2nd Gen', 2000,'toyota','Toyota','XA20','toyota-rav4','suv','compact_suv','suv_mid',148,'i4'),
  n('toyota-rav4-3',     'RAV4 3rd Gen', 2005,'toyota','Toyota','XA30','toyota-rav4','suv','compact_suv','suv_mid',158,'i4'),
  n('toyota-rav4-4',     'RAV4 4th Gen', 2012,'toyota','Toyota','XA40','toyota-rav4','suv','compact_suv','suv_mid',178,'i4'),
  n('toyota-rav4-5',     'RAV4 5th Gen', 2018,'toyota','Toyota','XA50','toyota-rav4','suv','compact_suv','suv_mid',203,'i4h'),
  // ── Corolla ───────────────────────────────────────────────────────────────
  n('toyota-corolla-e80','Corolla E80',  1983,'toyota','Toyota','E80','toyota-corolla','sedan','compact','midsize_sed',75,'i4'),
  n('toyota-corolla-e90','Corolla E90',  1987,'toyota','Toyota','E90','toyota-corolla','sedan','compact','midsize_sed',100,'i4'),
  n('toyota-corolla-e100','Corolla E100',1992,'toyota','Toyota','E100','toyota-corolla','sedan','compact','midsize_sed',115,'i4'),
  n('toyota-corolla-e120','Corolla E120',2000,'toyota','Toyota','E120','toyota-corolla','sedan','compact','midsize_sed',140,'i4'),
  n('toyota-corolla-e160','Corolla E160',2013,'toyota','Toyota','E160','toyota-corolla','sedan','compact','midsize_sed',132,'i4'),
  n('toyota-corolla-e210','Corolla E210',2018,'toyota','Toyota','E210','toyota-corolla','sedan','compact','midsize_sed',177,'i4h'),
  // ── Camry ─────────────────────────────────────────────────────────────────
  n('toyota-camry-v20',  'Camry V20',   1986,'toyota','Toyota','V20','toyota-camry','sedan','midsize','exec_sed',100,'i4'),
  n('toyota-camry-v40',  'Camry V40',   1996,'toyota','Toyota','V40','toyota-camry','sedan','midsize','exec_sed',133,'i4'),
  n('toyota-camry-v50',  'Camry V50',   2001,'toyota','Toyota','V50','toyota-camry','sedan','midsize','exec_sed',150,'i4'),
  n('toyota-camry-v60',  'Camry V60',   2006,'toyota','Toyota','V60','toyota-camry','sedan','midsize','exec_sed',198,'v6'),
  n('toyota-camry-v70',  'Camry V70',   2011,'toyota','Toyota','V70','toyota-camry','sedan','midsize','exec_sed',148,'i4h'),
  n('toyota-camry-v80',  'Camry V80',   2017,'toyota','Toyota','V80','toyota-camry','sedan','midsize','exec_sed',218,'i4h'),
  // ── Prius ─────────────────────────────────────────────────────────────────
  n('toyota-prius-1',    'Prius 1st Gen',1997,'toyota','Toyota','NHW11','toyota-prius','sedan','hybrid','midsize_sed',70,'i4h'),
  n('toyota-prius-2',    'Prius 2nd Gen',2003,'toyota','Toyota','NHW20','toyota-prius','hatchback','hybrid','midsize_sed',76,'i4h'),
  n('toyota-prius-3',    'Prius 3rd Gen',2009,'toyota','Toyota','ZVW30','toyota-prius','hatchback','hybrid','midsize_sed',99,'i4h'),
  n('toyota-prius-4',    'Prius 4th Gen',2015,'toyota','Toyota','ZVW50','toyota-prius','hatchback','hybrid','midsize_sed',98,'i4h'),
  // ── Lexus LS ──────────────────────────────────────────────────────────────
  n('lexus-ls-ucf10',    'Lexus LS 400', 1989,'toyota','Toyota','UCF10','lexus-ls','sedan','luxury','flagship_sed',260,'v8'),
  n('lexus-ls-ucf20',    'Lexus LS 400 UCF20',1994,'toyota','Toyota','UCF20','lexus-ls','sedan','luxury','flagship_sed',261,'v8'),
  n('lexus-ls-ucf30',    'Lexus LS 430', 2000,'toyota','Toyota','UCF30','lexus-ls','sedan','luxury','flagship_sed',290,'v8'),
  n('lexus-ls-ucf40',    'Lexus LS 460', 2006,'toyota','Toyota','UCF40','lexus-ls','sedan','luxury','flagship_sed',380,'v8'),
  n('lexus-ls-xf50',     'Lexus LS 500', 2017,'toyota','Toyota','XF50', 'lexus-ls','sedan','luxury','flagship_sed',421,'v6t'),
  // ── Facelifts ────────────────────────────────────────────────────────────
  n('toyota-lc-80-fl',     'Land Cruiser 80 FL', 1995,'toyota','Toyota','FJ80 FL','toyota-land-cruiser','suv','off_road','suv_large',188,'i6'),
  n('toyota-lc-100-fl',    'Land Cruiser 100 FL',2002,'toyota','Toyota','UZJ100 FL','toyota-land-cruiser','suv','off_road','suv_large',235,'v8'),
  n('toyota-supra-a80-fl', 'Supra A80 FL',       1997,'toyota','Toyota','A80 FL','toyota-supra','coupe','sports','supercar',326,'i6t'),
  n('toyota-camry-v80-fl', 'Camry V80 FL',       2021,'toyota','Toyota','V80 FL','toyota-camry','sedan','midsize','exec_sed',215,'i4h'),
  n('toyota-rav4-5-fl',    'RAV4 5th Gen FL',    2021,'toyota','Toyota','XA50 FL','toyota-rav4','suv','compact_suv','suv_mid',203,'i4h'),
  n('toyota-prius-4-fl',   'Prius 4th Gen FL',   2018,'toyota','Toyota','ZVW55','toyota-prius','hatchback','hybrid','midsize_sed',98,'i4h'),
  n('lexus-ls-ucf40-fl',   'Lexus LS 460 FL',    2012,'toyota','Toyota','UCF40 FL','lexus-ls','sedan','luxury','flagship_sed',380,'v8'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// HONDA
// ═══════════════════════════════════════════════════════════════════════════════
const HONDA = [
  // ── Civic ─────────────────────────────────────────────────────────────────
  n('honda-civic-eg',   'Civic EG 5th', 1991,'honda','Honda','EG','honda-civic','hatchback','compact','hatchback',155,'i4'),
  n('honda-civic-ek',   'Civic EK 6th', 1995,'honda','Honda','EK','honda-civic','hatchback','compact','hatchback',160,'i4'),
  n('honda-civic-ep3',  'Civic EP3 7th',2000,'honda','Honda','EP3','honda-civic','hatchback','compact','hatchback',165,'i4'),
  n('honda-civic-fd',   'Civic FD 8th', 2005,'honda','Honda','FD', 'honda-civic','sedan','compact','midsize_sed',140,'i4'),
  n('honda-civic-fb',   'Civic FB 9th', 2011,'honda','Honda','FB', 'honda-civic','sedan','compact','midsize_sed',142,'i4'),
  n('honda-civic-fc',   'Civic FC 10th',2015,'honda','Honda','FC', 'honda-civic','sedan','compact','midsize_sed',158,'i4t'),
  n('honda-civic-fl',   'Civic FL5 11th',2021,'honda','Honda','FL5','honda-civic','sedan','compact','midsize_sed',158,'i4t'),
  // ── NSX ───────────────────────────────────────────────────────────────────
  n('honda-nsx-na1',    'NSX NA1',      1990,'honda','Honda','NA1','honda-nsx','coupe','sports','supercar',274,'v6'),
  n('honda-nsx-nc1',    'NSX NC1',      2016,'honda','Honda','NC1','honda-nsx','coupe','sports','supercar',573,'v6h'),
  // ── Accord ────────────────────────────────────────────────────────────────
  n('honda-accord-cb',  'Accord CB 4th',1989,'honda','Honda','CB', 'honda-accord','sedan','midsize','exec_sed',158,'i4'),
  n('honda-accord-cd',  'Accord CD 5th',1993,'honda','Honda','CD', 'honda-accord','sedan','midsize','exec_sed',145,'i4'),
  n('honda-accord-cg',  'Accord CG 6th',1997,'honda','Honda','CG', 'honda-accord','sedan','midsize','exec_sed',150,'i4'),
  n('honda-accord-cl',  'Accord CL 7th',2002,'honda','Honda','CL', 'honda-accord','sedan','midsize','exec_sed',190,'v6'),
  n('honda-accord-cp',  'Accord CP 8th',2007,'honda','Honda','CP', 'honda-accord','sedan','midsize','exec_sed',190,'v6'),
  n('honda-accord-cr',  'Accord CR 9th',2012,'honda','Honda','CR', 'honda-accord','sedan','midsize','exec_sed',185,'i4t'),
  n('honda-accord-cv',  'Accord CV 10th',2017,'honda','Honda','CV','honda-accord','sedan','midsize','exec_sed',192,'i4t'),
  // ── CR-V ──────────────────────────────────────────────────────────────────
  n('honda-crv-rd1',    'CR-V RD1 1st', 1995,'honda','Honda','RD1','honda-crv','suv','compact_suv','suv_mid',126,'i4'),
  n('honda-crv-rd4',    'CR-V RD4 2nd', 2001,'honda','Honda','RD4','honda-crv','suv','compact_suv','suv_mid',160,'i4'),
  n('honda-crv-re4',    'CR-V RE4 3rd', 2006,'honda','Honda','RE4','honda-crv','suv','compact_suv','suv_mid',166,'i4'),
  n('honda-crv-rm1',    'CR-V RM1 4th', 2011,'honda','Honda','RM1','honda-crv','suv','compact_suv','suv_mid',185,'i4'),
  n('honda-crv-rw1',    'CR-V RW1 5th', 2016,'honda','Honda','RW1','honda-crv','suv','compact_suv','suv_mid',190,'i4t'),
  n('honda-crv-rn1',    'CR-V RN1 6th', 2022,'honda','Honda','RN1','honda-crv','suv','compact_suv','suv_mid',204,'i4h'),
  // ── S2000 ─────────────────────────────────────────────────────────────────
  n('honda-s2000-ap1',  'S2000 AP1',    1999,'honda','Honda','AP1','honda-s2000','roadster','sports','sports',247,'i4'),
  n('honda-s2000-ap2',  'S2000 AP2',    2003,'honda','Honda','AP2','honda-s2000','roadster','sports','sports',242,'i4'),
  // ── Integra / Type R ─────────────────────────────────────────────────────
  n('honda-integra-dc2','Integra DC2 Type R',1993,'honda','Honda','DC2','honda-integra','coupe','sports','sports',185,'i4'),
  n('honda-integra-dc5','Integra DC5 Type R',2001,'honda','Honda','DC5','honda-integra','coupe','sports','sports',220,'i4'),
  n('honda-civic-fk8',  'Civic Type R FK8',2017,'honda','Honda','FK8','honda-civic-type-r','hatchback','sports','sports',320,'i4t'),
  n('honda-civic-fl5',  'Civic Type R FL5',2022,'honda','Honda','FL5','honda-civic-type-r','hatchback','sports','sports',330,'i4t'),
  // ── Facelifts ─────────────────────────────────────────────────────────────
  n('honda-nsx-na1-fl', 'NSX NA2 FL',   1997,'honda','Honda','NA2','honda-nsx','coupe','sports','supercar',290,'v6'),
  n('honda-civic-fc-fl','Civic FC FL',  2018,'honda','Honda','FC FL','honda-civic','sedan','compact','midsize_sed',158,'i4t'),
  n('honda-accord-cv-fl','Accord CV FL',2021,'honda','Honda','CV FL','honda-accord','sedan','midsize','exec_sed',192,'i4h'),
  n('honda-crv-rw1-fl', 'CR-V RW1 FL', 2019,'honda','Honda','RW1 FL','honda-crv','suv','compact_suv','suv_mid',190,'i4t'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NISSAN
// ═══════════════════════════════════════════════════════════════════════════════
const NISSAN = [
  // ── Skyline GT-R ──────────────────────────────────────────────────────────
  n('nissan-skyline-r32','Skyline GT-R R32',1989,'nissan','Nissan','R32','nissan-skyline-gtr','coupe','sports','sports',280,'i6t'),
  n('nissan-skyline-r33','Skyline GT-R R33',1995,'nissan','Nissan','R33','nissan-skyline-gtr','coupe','sports','sports',280,'i6t'),
  n('nissan-skyline-r34','Skyline GT-R R34',1998,'nissan','Nissan','R34','nissan-skyline-gtr','coupe','sports','sports',280,'i6t'),
  n('nissan-gtr-r35',    'GT-R R35',         2007,'nissan','Nissan','R35','nissan-gtr','coupe','sports','supercar',480,'v6t'),
  // ── Fairlady Z ────────────────────────────────────────────────────────────
  n('nissan-z-s30',      '240Z S30',         1969,'nissan','Nissan','S30',  'nissan-z','coupe','sports','sports',151,'i6'),
  n('nissan-z-s130',     '280ZX S130',       1978,'nissan','Nissan','S130', 'nissan-z','coupe','sports','sports',135,'i6'),
  n('nissan-z-z31',      '300ZX Z31',        1983,'nissan','Nissan','Z31',  'nissan-z','coupe','sports','sports',170,'v6'),
  n('nissan-z-z32',      '300ZX Z32',        1989,'nissan','Nissan','Z32',  'nissan-z','coupe','sports','sports',300,'v6t'),
  n('nissan-z-z33',      '350Z Z33',         2002,'nissan','Nissan','Z33',  'nissan-z','coupe','sports','sports',280,'v6'),
  n('nissan-z-z34',      '370Z Z34',         2008,'nissan','Nissan','Z34',  'nissan-z','coupe','sports','sports',328,'v6'),
  n('nissan-z-rz34',     'Z RZ34',           2022,'nissan','Nissan','RZ34', 'nissan-z','coupe','sports','sports',405,'v6t'),
  // ── Silvia ────────────────────────────────────────────────────────────────
  n('nissan-silvia-s13', 'Silvia S13',       1988,'nissan','Nissan','S13','nissan-silvia','coupe','sports','sports',205,'i4t'),
  n('nissan-silvia-s14', 'Silvia S14',       1993,'nissan','Nissan','S14','nissan-silvia','coupe','sports','sports',220,'i4t'),
  n('nissan-silvia-s15', 'Silvia S15',       1999,'nissan','Nissan','S15','nissan-silvia','coupe','sports','sports',250,'i4t'),
  // ── Patrol ────────────────────────────────────────────────────────────────
  n('nissan-patrol-y60', 'Patrol Y60',       1987,'nissan','Nissan','Y60','nissan-patrol','suv','off_road','suv_large',120,'i6'),
  n('nissan-patrol-y61', 'Patrol Y61',       1997,'nissan','Nissan','Y61','nissan-patrol','suv','off_road','suv_large',170,'i6'),
  n('nissan-patrol-y62', 'Patrol Y62',       2010,'nissan','Nissan','Y62','nissan-patrol','suv','off_road','suv_large',405,'v8'),
  // ── Leaf ─────────────────────────────────────────────────────────────────
  n('nissan-leaf-1',     'Leaf 1st Gen',     2010,'nissan','Nissan','ZE0','nissan-leaf','hatchback','electric','electric',109,'ev'),
  n('nissan-leaf-2',     'Leaf 2nd Gen',     2017,'nissan','Nissan','ZE1','nissan-leaf','hatchback','electric','electric',150,'ev'),
  // ── 350Z/370Z фейслифты + GTR обновления ──────────────────────────────────
  n('nissan-gtr-r35-fl', 'GT-R R35 2017',   2017,'nissan','Nissan','R35 2017','nissan-gtr','coupe','sports','supercar',570,'v6t'),
  n('nissan-z-z33-fl',   '350Z Z33 FL',      2005,'nissan','Nissan','Z33 FL','nissan-z','coupe','sports','sports',295,'v6'),
  n('nissan-patrol-y61-fl','Patrol Y61 FL',  2004,'nissan','Nissan','Y61 FL','nissan-patrol','suv','off_road','suv_large',250,'v6'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAZDA
// ═══════════════════════════════════════════════════════════════════════════════
const MAZDA = [
  // ── RX-7 ──────────────────────────────────────────────────────────────────
  n('mazda-rx7-sa',      'RX-7 SA22C',       1978,'mazda','Mazda','SA22C','mazda-rx7','coupe','sports','sports',   105,'i4'), // rotary ≈ i4 slot
  n('mazda-rx7-fc',      'RX-7 FC',          1985,'mazda','Mazda','FC3S', 'mazda-rx7','coupe','sports','sports',   185,'i4t'),
  n('mazda-rx7-fd',      'RX-7 FD',          1991,'mazda','Mazda','FD3S', 'mazda-rx7','coupe','sports','supercar', 255,'i4t'),
  // ── RX-8 ──────────────────────────────────────────────────────────────────
  n('mazda-rx8-se3p',    'RX-8 SE3P',        2003,'mazda','Mazda','SE3P','mazda-rx8','coupe','sports','sports',   231,'i4'),
  // ── MX-5 / Miata ──────────────────────────────────────────────────────────
  n('mazda-mx5-na',      'MX-5 NA',          1989,'mazda','Mazda','NA','mazda-mx5','roadster','sports','sports',   115,'i4'),
  n('mazda-mx5-nb',      'MX-5 NB',          1998,'mazda','Mazda','NB','mazda-mx5','roadster','sports','sports',   140,'i4'),
  n('mazda-mx5-nc',      'MX-5 NC',          2005,'mazda','Mazda','NC','mazda-mx5','roadster','sports','sports',   160,'i4'),
  n('mazda-mx5-nd',      'MX-5 ND',          2015,'mazda','Mazda','ND','mazda-mx5','roadster','sports','sports',   184,'i4'),
  // ── Mazda 3 / 323 ─────────────────────────────────────────────────────────
  n('mazda-3-bk',        'Mazda 3 BK',       2003,'mazda','Mazda','BK','mazda-3','hatchback','compact','hatchback',105,'i4'),
  n('mazda-3-bl',        'Mazda 3 BL',       2008,'mazda','Mazda','BL','mazda-3','hatchback','compact','hatchback',120,'i4'),
  n('mazda-3-bm',        'Mazda 3 BM',       2013,'mazda','Mazda','BM','mazda-3','hatchback','compact','hatchback',120,'i4'),
  n('mazda-3-bp',        'Mazda 3 BP',       2018,'mazda','Mazda','BP','mazda-3','hatchback','compact','hatchback',186,'i4'),
  // ── Mazda 6 ───────────────────────────────────────────────────────────────
  n('mazda-6-gg',        'Mazda 6 GG',       2002,'mazda','Mazda','GG','mazda-6','sedan','midsize','exec_sed',    141,'i4'),
  n('mazda-6-gh',        'Mazda 6 GH',       2007,'mazda','Mazda','GH','mazda-6','sedan','midsize','exec_sed',    147,'i4'),
  n('mazda-6-gj',        'Mazda 6 GJ',       2012,'mazda','Mazda','GJ','mazda-6','sedan','midsize','exec_sed',    165,'i4'),
  // ── CX-5 ──────────────────────────────────────────────────────────────────
  n('mazda-cx5-ke',      'CX-5 KE',          2012,'mazda','Mazda','KE','mazda-cx5','suv','compact_suv','suv_mid', 160,'i4'),
  n('mazda-cx5-kf',      'CX-5 KF',          2017,'mazda','Mazda','KF','mazda-cx5','suv','compact_suv','suv_mid', 165,'i4'),
  // ── Facelifts ─────────────────────────────────────────────────────────────
  n('mazda-rx7-fd-fl',   'RX-7 FD FL',       1996,'mazda','Mazda','FD FL','mazda-rx7','coupe','sports','supercar', 255,'i4t'),
  n('mazda-mx5-nb-fl',   'MX-5 NB FL',       2001,'mazda','Mazda','NB FL','mazda-mx5','roadster','sports','sports', 155,'i4'),
  n('mazda-mx5-nc-fl',   'MX-5 NC FL',       2008,'mazda','Mazda','NC FL','mazda-mx5','roadster','sports','sports', 160,'i4'),
  n('mazda-mx5-nd-fl',   'MX-5 ND FL',       2018,'mazda','Mazda','ND FL','mazda-mx5','roadster','sports','sports', 184,'i4'),
  n('mazda-3-bk-fl',     'Mazda 3 BK FL',    2006,'mazda','Mazda','BK FL','mazda-3','hatchback','compact','hatchback',120,'i4'),
  n('mazda-3-bl-fl',     'Mazda 3 BL FL',    2011,'mazda','Mazda','BL FL','mazda-3','hatchback','compact','hatchback',120,'i4'),
  n('mazda-6-gj-fl',     'Mazda 6 GJ FL',    2015,'mazda','Mazda','GJ FL','mazda-6','sedan','midsize','exec_sed',   192,'i4'),
  n('mazda-cx5-kf-fl',   'CX-5 KF FL',       2021,'mazda','Mazda','KF FL','mazda-cx5','suv','compact_suv','suv_mid',165,'i4'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUBARU
// ═══════════════════════════════════════════════════════════════════════════════
const SUBARU = [
  // ── Impreza / WRX ─────────────────────────────────────────────────────────
  n('subaru-impreza-gc', 'Impreza WRX GC',  1992,'subaru','Subaru','GC','subaru-impreza','sedan','sports','midsize_sed',240,'flat4t'),
  n('subaru-impreza-gd', 'Impreza WRX GD',  2000,'subaru','Subaru','GD','subaru-impreza','sedan','sports','midsize_sed',250,'flat4t'),
  n('subaru-impreza-ge', 'Impreza WRX GE',  2007,'subaru','Subaru','GE','subaru-impreza','sedan','sports','midsize_sed',265,'flat4t'),
  n('subaru-impreza-gj', 'Impreza GJ',      2011,'subaru','Subaru','GJ','subaru-impreza','sedan','compact','midsize_sed',154,'flat4'),
  n('subaru-wrx-va',     'WRX VA',           2014,'subaru','Subaru','VA','subaru-wrx','sedan','sports','midsize_sed',268,'flat4t'),
  n('subaru-wrx-vb',     'WRX VB',           2021,'subaru','Subaru','VB','subaru-wrx','sedan','sports','midsize_sed',271,'flat4t'),
  // ── BRZ ───────────────────────────────────────────────────────────────────
  n('subaru-brz-zc6',    'BRZ ZC6',          2012,'subaru','Subaru','ZC6','subaru-brz','coupe','sports','sports',200,'flat4'),
  n('subaru-brz-zd8',    'BRZ ZD8',          2021,'subaru','Subaru','ZD8','subaru-brz','coupe','sports','sports',228,'flat4'),
  // ── Legacy / Outback ──────────────────────────────────────────────────────
  n('subaru-legacy-bc',  'Legacy BC',        1989,'subaru','Subaru','BC','subaru-legacy','sedan','midsize','midsize_sed',150,'flat4'),
  n('subaru-legacy-bd',  'Legacy BD',        1993,'subaru','Subaru','BD','subaru-legacy','sedan','midsize','midsize_sed',276,'flat4t'),
  n('subaru-legacy-be',  'Legacy BE',        1998,'subaru','Subaru','BE','subaru-legacy','sedan','midsize','midsize_sed',250,'flat4t'),
  n('subaru-legacy-bl',  'Legacy BL',        2003,'subaru','Subaru','BL','subaru-legacy','sedan','midsize','midsize_sed',165,'flat4'),
  n('subaru-legacy-br',  'Legacy BR',        2009,'subaru','Subaru','BR','subaru-legacy','sedan','midsize','midsize_sed',256,'flat4t'),
  n('subaru-legacy-bn',  'Legacy BN',        2014,'subaru','Subaru','BN','subaru-legacy','sedan','midsize','midsize_sed',175,'flat4'),
  // ── Forester ──────────────────────────────────────────────────────────────
  n('subaru-forester-sf','Forester SF',       1997,'subaru','Subaru','SF','subaru-forester','suv','compact_suv','suv_mid',170,'flat4t'),
  n('subaru-forester-sg','Forester SG',       2002,'subaru','Subaru','SG','subaru-forester','suv','compact_suv','suv_mid',230,'flat4t'),
  n('subaru-forester-sh','Forester SH',       2007,'subaru','Subaru','SH','subaru-forester','suv','compact_suv','suv_mid',170,'flat4t'),
  n('subaru-forester-sj','Forester SJ',       2012,'subaru','Subaru','SJ','subaru-forester','suv','compact_suv','suv_mid',182,'flat4'),
  n('subaru-forester-sk','Forester SK',       2018,'subaru','Subaru','SK','subaru-forester','suv','compact_suv','suv_mid',182,'flat4'),
  // ── Facelifts ─────────────────────────────────────────────────────────────
  n('subaru-impreza-gc-fl','WRX GC FL',      1996,'subaru','Subaru','GC FL','subaru-impreza','sedan','sports','midsize_sed',280,'flat4t'),
  n('subaru-impreza-gd-fl','WRX GD FL',      2005,'subaru','Subaru','GD FL','subaru-impreza','sedan','sports','midsize_sed',280,'flat4t'),
  n('subaru-wrx-va-fl',  'WRX VA FL',        2017,'subaru','Subaru','VA FL','subaru-wrx','sedan','sports','midsize_sed',268,'flat4t'),
  n('subaru-legacy-br-fl','Legacy BR FL',    2012,'subaru','Subaru','BR FL','subaru-legacy','sedan','midsize','midsize_sed',256,'flat4t'),
  n('subaru-forester-sj-fl','Forester SJ FL',2016,'subaru','Subaru','SJ FL','subaru-forester','suv','compact_suv','suv_mid',182,'flat4'),
  n('subaru-forester-sk-fl','Forester SK FL',2021,'subaru','Subaru','SK FL','subaru-forester','suv','compact_suv','suv_mid',182,'flat4'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// EDGES
// ═══════════════════════════════════════════════════════════════════════════════
const newEdges = [
  // TOYOTA — Supra
  ev('to-sup-1','toyota-supra-a60','toyota-supra-a70'),
  ev('to-sup-2','toyota-supra-a70','toyota-supra-a80'),
  ev('to-sup-3','toyota-supra-a80','toyota-supra-a90'),
  fl('to-sup-fl1','toyota-supra-a80','toyota-supra-a80-fl'),
  // TOYOTA — 86 chain
  ev('to-86-1','toyota-ae86','toyota-gt86-zn6'),
  ev('to-86-2','toyota-gt86-zn6','toyota-gr86-zn8'),
  // TOYOTA — MR2
  ev('to-mr2-1','toyota-mr2-aw11','toyota-mr2-sw20'),
  ev('to-mr2-2','toyota-mr2-sw20','toyota-mr2-w30'),
  // TOYOTA — Land Cruiser
  ev('to-lc-1','toyota-lc-60','toyota-lc-80'),
  ev('to-lc-2','toyota-lc-80','toyota-lc-100'),
  ev('to-lc-3','toyota-lc-100','toyota-lc-200'),
  ev('to-lc-4','toyota-lc-200','toyota-lc-300'),
  fl('to-lc-fl1','toyota-lc-80','toyota-lc-80-fl'),
  fl('to-lc-fl2','toyota-lc-100','toyota-lc-100-fl'),
  // TOYOTA — RAV4
  ev('to-rav-1','toyota-rav4-1','toyota-rav4-2'),
  ev('to-rav-2','toyota-rav4-2','toyota-rav4-3'),
  ev('to-rav-3','toyota-rav4-3','toyota-rav4-4'),
  ev('to-rav-4','toyota-rav4-4','toyota-rav4-5'),
  fl('to-rav-fl1','toyota-rav4-5','toyota-rav4-5-fl'),
  // TOYOTA — Corolla
  ev('to-cor-1','toyota-corolla-e80','toyota-corolla-e90'),
  ev('to-cor-2','toyota-corolla-e90','toyota-corolla-e100'),
  ev('to-cor-3','toyota-corolla-e100','toyota-corolla-e120'),
  ev('to-cor-4','toyota-corolla-e120','toyota-corolla-e160'),
  ev('to-cor-5','toyota-corolla-e160','toyota-corolla-e210'),
  // TOYOTA — Camry
  ev('to-cam-1','toyota-camry-v20','toyota-camry-v40'),
  ev('to-cam-2','toyota-camry-v40','toyota-camry-v50'),
  ev('to-cam-3','toyota-camry-v50','toyota-camry-v60'),
  ev('to-cam-4','toyota-camry-v60','toyota-camry-v70'),
  ev('to-cam-5','toyota-camry-v70','toyota-camry-v80'),
  fl('to-cam-fl1','toyota-camry-v80','toyota-camry-v80-fl'),
  // TOYOTA — Prius
  ev('to-pri-1','toyota-prius-1','toyota-prius-2'),
  ev('to-pri-2','toyota-prius-2','toyota-prius-3'),
  ev('to-pri-3','toyota-prius-3','toyota-prius-4'),
  fl('to-pri-fl1','toyota-prius-4','toyota-prius-4-fl'),
  // TOYOTA — Lexus LS
  ev('to-ls-1','lexus-ls-ucf10','lexus-ls-ucf20'),
  ev('to-ls-2','lexus-ls-ucf20','lexus-ls-ucf30'),
  ev('to-ls-3','lexus-ls-ucf30','lexus-ls-ucf40'),
  ev('to-ls-4','lexus-ls-ucf40','lexus-ls-xf50'),
  fl('to-ls-fl1','lexus-ls-ucf40','lexus-ls-ucf40-fl'),
  // TOYOTA — AE86 variant: GT86 shares platform with BRZ
  va('to-br-1','toyota-gt86-zn6','subaru-brz-zc6'),

  // HONDA — Civic chain
  ev('ho-civ-1','honda-civic-eg','honda-civic-ek'),
  ev('ho-civ-2','honda-civic-ek','honda-civic-ep3'),
  ev('ho-civ-3','honda-civic-ep3','honda-civic-fd'),
  ev('ho-civ-4','honda-civic-fd','honda-civic-fb'),
  ev('ho-civ-5','honda-civic-fb','honda-civic-fc'),
  ev('ho-civ-6','honda-civic-fc','honda-civic-fl'),
  fl('ho-civ-fl1','honda-civic-fc','honda-civic-fc-fl'),
  // HONDA — NSX
  ev('ho-nsx-1','honda-nsx-na1','honda-nsx-nc1'),
  fl('ho-nsx-fl1','honda-nsx-na1','honda-nsx-na1-fl'),
  // HONDA — Accord
  ev('ho-acc-1','honda-accord-cb','honda-accord-cd'),
  ev('ho-acc-2','honda-accord-cd','honda-accord-cg'),
  ev('ho-acc-3','honda-accord-cg','honda-accord-cl'),
  ev('ho-acc-4','honda-accord-cl','honda-accord-cp'),
  ev('ho-acc-5','honda-accord-cp','honda-accord-cr'),
  ev('ho-acc-6','honda-accord-cr','honda-accord-cv'),
  fl('ho-acc-fl1','honda-accord-cv','honda-accord-cv-fl'),
  // HONDA — CR-V
  ev('ho-crv-1','honda-crv-rd1','honda-crv-rd4'),
  ev('ho-crv-2','honda-crv-rd4','honda-crv-re4'),
  ev('ho-crv-3','honda-crv-re4','honda-crv-rm1'),
  ev('ho-crv-4','honda-crv-rm1','honda-crv-rw1'),
  ev('ho-crv-5','honda-crv-rw1','honda-crv-rn1'),
  fl('ho-crv-fl1','honda-crv-rw1','honda-crv-rw1-fl'),
  // HONDA — S2000
  fl('ho-s2k-fl1','honda-s2000-ap1','honda-s2000-ap2'),
  // HONDA — Integra/Type R chain
  ev('ho-tr-1','honda-integra-dc2','honda-integra-dc5'),
  ev('ho-tr-2','honda-integra-dc5','honda-civic-fk8'),
  ev('ho-tr-3','honda-civic-fk8','honda-civic-fl5'),
  // HONDA — Civic EK variant: Type R
  va('ho-vr-1','honda-civic-ek','honda-integra-dc2'),

  // NISSAN — Skyline / GT-R chain
  ev('ni-gtr-1','nissan-skyline-r32','nissan-skyline-r33'),
  ev('ni-gtr-2','nissan-skyline-r33','nissan-skyline-r34'),
  ev('ni-gtr-3','nissan-skyline-r34','nissan-gtr-r35'),
  fl('ni-gtr-fl1','nissan-gtr-r35','nissan-gtr-r35-fl'),
  // NISSAN — Z-car chain
  ev('ni-z-1','nissan-z-s30','nissan-z-s130'),
  ev('ni-z-2','nissan-z-s130','nissan-z-z31'),
  ev('ni-z-3','nissan-z-z31','nissan-z-z32'),
  ev('ni-z-4','nissan-z-z32','nissan-z-z33'),
  ev('ni-z-5','nissan-z-z33','nissan-z-z34'),
  ev('ni-z-6','nissan-z-z34','nissan-z-rz34'),
  fl('ni-z-fl1','nissan-z-z33','nissan-z-z33-fl'),
  // NISSAN — Silvia
  ev('ni-sil-1','nissan-silvia-s13','nissan-silvia-s14'),
  ev('ni-sil-2','nissan-silvia-s14','nissan-silvia-s15'),
  // NISSAN — Patrol
  ev('ni-pat-1','nissan-patrol-y60','nissan-patrol-y61'),
  ev('ni-pat-2','nissan-patrol-y61','nissan-patrol-y62'),
  fl('ni-pat-fl1','nissan-patrol-y61','nissan-patrol-y61-fl'),
  // NISSAN — Leaf
  ev('ni-lf-1','nissan-leaf-1','nissan-leaf-2'),

  // MAZDA — RX-7 chain
  ev('mz-rx7-1','mazda-rx7-sa','mazda-rx7-fc'),
  ev('mz-rx7-2','mazda-rx7-fc','mazda-rx7-fd'),
  fl('mz-rx7-fl1','mazda-rx7-fd','mazda-rx7-fd-fl'),
  // MAZDA — RX-8 from RX-7 lineage
  ev('mz-rx8-1','mazda-rx7-fd','mazda-rx8-se3p'),
  // MAZDA — MX-5 chain
  ev('mz-mx5-1','mazda-mx5-na','mazda-mx5-nb'),
  ev('mz-mx5-2','mazda-mx5-nb','mazda-mx5-nc'),
  ev('mz-mx5-3','mazda-mx5-nc','mazda-mx5-nd'),
  fl('mz-mx5-fl1','mazda-mx5-nb','mazda-mx5-nb-fl'),
  fl('mz-mx5-fl2','mazda-mx5-nc','mazda-mx5-nc-fl'),
  fl('mz-mx5-fl3','mazda-mx5-nd','mazda-mx5-nd-fl'),
  // MAZDA — Mazda 3 chain
  ev('mz-3-1','mazda-3-bk','mazda-3-bl'),
  ev('mz-3-2','mazda-3-bl','mazda-3-bm'),
  ev('mz-3-3','mazda-3-bm','mazda-3-bp'),
  fl('mz-3-fl1','mazda-3-bk','mazda-3-bk-fl'),
  fl('mz-3-fl2','mazda-3-bl','mazda-3-bl-fl'),
  // MAZDA — Mazda 6 chain
  ev('mz-6-1','mazda-6-gg','mazda-6-gh'),
  ev('mz-6-2','mazda-6-gh','mazda-6-gj'),
  fl('mz-6-fl1','mazda-6-gj','mazda-6-gj-fl'),
  // MAZDA — CX-5 chain
  ev('mz-cx5-1','mazda-cx5-ke','mazda-cx5-kf'),
  fl('mz-cx5-fl1','mazda-cx5-kf','mazda-cx5-kf-fl'),

  // SUBARU — Impreza/WRX chain
  ev('su-imp-1','subaru-impreza-gc','subaru-impreza-gd'),
  ev('su-imp-2','subaru-impreza-gd','subaru-impreza-ge'),
  ev('su-imp-3','subaru-impreza-ge','subaru-impreza-gj'),
  ev('su-imp-4','subaru-impreza-gj','subaru-wrx-va'),
  ev('su-imp-5','subaru-wrx-va','subaru-wrx-vb'),
  fl('su-imp-fl1','subaru-impreza-gc','subaru-impreza-gc-fl'),
  fl('su-imp-fl2','subaru-impreza-gd','subaru-impreza-gd-fl'),
  fl('su-wrx-fl1','subaru-wrx-va','subaru-wrx-va-fl'),
  // SUBARU — BRZ chain
  ev('su-brz-1','subaru-brz-zc6','subaru-brz-zd8'),
  // SUBARU — Legacy chain
  ev('su-leg-1','subaru-legacy-bc','subaru-legacy-bd'),
  ev('su-leg-2','subaru-legacy-bd','subaru-legacy-be'),
  ev('su-leg-3','subaru-legacy-be','subaru-legacy-bl'),
  ev('su-leg-4','subaru-legacy-bl','subaru-legacy-br'),
  ev('su-leg-5','subaru-legacy-br','subaru-legacy-bn'),
  fl('su-leg-fl1','subaru-legacy-br','subaru-legacy-br-fl'),
  // SUBARU — Forester chain
  ev('su-for-1','subaru-forester-sf','subaru-forester-sg'),
  ev('su-for-2','subaru-forester-sg','subaru-forester-sh'),
  ev('su-for-3','subaru-forester-sh','subaru-forester-sj'),
  ev('su-for-4','subaru-forester-sj','subaru-forester-sk'),
  fl('su-for-fl1','subaru-forester-sj','subaru-forester-sj-fl'),
  fl('su-for-fl2','subaru-forester-sk','subaru-forester-sk-fl'),
  // SUBARU — BRZ ↔ Toyota GT86 (same car, cross-brand variant)
  va('su-brz-gt86','subaru-brz-zc6','toyota-gt86-zn6'),
  va('su-brz2-gr86','subaru-brz-zd8','toyota-gr86-zn8'),
];

// ─── APPLY ───────────────────────────────────────────────────────────────────
const allNodes = [...TOYOTA,...HONDA,...NISSAN,...MAZDA,...SUBARU];
let addN=0, addE=0, skipN=0, skipE=0;

allNodes.forEach(node => {
  if (EID.has(node.id)) { skipN++; return; }
  data.nodes.push(node); EID.add(node.id); addN++;
});

newEdges.forEach(edge => {
  if (EEI.has(edge.id)) { skipE++; return; }
  if (!EID.has(edge.source)) { console.warn('⚠ no source:', edge.source); skipE++; return; }
  if (!EID.has(edge.target)) { console.warn('⚠ no target:', edge.target); skipE++; return; }
  data.edges.push(edge); EEI.add(edge.id); addE++;
});

fs.writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf8');

// ─── REPORT ──────────────────────────────────────────────────────────────────
console.log(`✅ Узлов: +${addN}  (пропущено: ${skipN})`);
console.log(`✅ Рёбер: +${addE}  (пропущено: ${skipE})`);
console.log(`📊 Всего: ${data.nodes.length} узлов, ${data.edges.length} рёбер`);
const brands = {};
allNodes.forEach(n=>{ brands[n.brandId]=(brands[n.brandId]||0)+1; });
console.log('\nПо брендам:');
Object.entries(brands).sort().forEach(([b,c])=>console.log(`  ${b}: ${c} узлов`));
