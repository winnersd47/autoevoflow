/**
 * add-facelifts.js — добавляет фейслифты всех основных моделей в граф эволюции
 */
const fs = require('fs');
const PATH = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));

const existingIds  = new Set(data.nodes.map(n => n.id));
const existingEIds = new Set(data.edges.map(e => e.id));

function node(id, label, year, brandId, brandName, codeName, modelSlug, bodyType, segment, zone, hp, engineType) {
  return { id, label, type:'generation', year, brandId, brandName, codeName, modelSlug, bodyType, segment, zone, hp, engineType };
}
function fl(eid, src, tgt) {
  return { id: eid, source: src, target: tgt, type: 'facelifted_to', strength: 0.9 };
}

const newNodes = [
  // ── AUDI ──────────────────────────────────────────────────────────────────
  node('audi-a3-8l-fl',   'A3 8L FL',          2000,'audi','Audi','8L FL',   'audi-a3',                       'hatchback','premium_compact','hatchback',  101,'i4'),
  node('audi-a3-8p-fl',   'A3 8P FL',          2008,'audi','Audi','8P FL',   'audi-a3',                       'hatchback','premium_compact','hatchback',  160,'i4t'),
  node('audi-a3-8v-fl',   'A3 8V FL',          2016,'audi','Audi','8V FL',   'audi-a3',                       'hatchback','premium_compact','midsize_sed',165,'i4t'),
  node('audi-a4b8-fl',    'A4 B8 FL',          2011,'audi','Audi','B8 FL',   'audi-a4',                       'sedan',    'premium_compact','midsize_sed', 211,'i4t'),
  node('audi-a4b9-fl',    'A4 B9 FL',          2019,'audi','Audi','B9 FL',   'audi-a4',                       'sedan',    'premium_compact','midsize_sed', 190,'i4t'),
  node('audi-a5-8t-fl',   'A5 8T FL',          2011,'audi','Audi','8T FL',   'audi-a5',                       'coupe',    'grand_tourer',   'gt_coupe',   265,'v6t'),
  node('audi-a6-c5-fl',   'A6 C5 FL',          2001,'audi','Audi','C5 FL',   'audi-a6',                       'sedan',    'executive',      'exec_sed',   180,'v6'),
  node('audi-a6-c6-fl',   'A6 C6 FL',          2008,'audi','Audi','C6 FL',   'audi-a6',                       'sedan',    'executive',      'exec_sed',   177,'v6t'),
  node('audi-a6-c7-fl',   'A6 C7 FL',          2014,'audi','Audi','C7 FL',   'audi-a6',                       'sedan',    'executive',      'exec_sed',   218,'i4t'),
  node('audi-a6-c8-fl',   'A6 C8 FL',          2023,'audi','Audi','C8 FL',   'audi-a6',                       'sedan',    'executive',      'exec_sed',   204,'i4t'),
  node('audi-a8-d2-fl',   'A8 D2 FL',          1998,'audi','Audi','D2 FL',   'audi-a8',                       'sedan',    'luxury',         'flagship_sed',240,'v8'),
  node('audi-a8-d3-fl',   'A8 D3 FL',          2005,'audi','Audi','D3 FL',   'audi-a8',                       'sedan',    'luxury',         'flagship_sed',260,'v8'),
  node('audi-a8-d4-fl',   'A8 D4 FL',          2013,'audi','Audi','D4 FL',   'audi-a8',                       'sedan',    'luxury',         'flagship_sed',310,'v8t'),
  node('audi-q3-8u-fl',   'Q3 8U FL',          2014,'audi','Audi','8U FL',   'audi-q3',                       'suv',      'premium_suv',    'suv_compact', 180,'i4t'),
  node('audi-q5-8r-fl',   'Q5 8R FL',          2012,'audi','Audi','8R FL',   'audi-q5',                       'suv',      'premium_suv',    'suv_mid',    211,'i4t'),
  node('audi-q7-j4-fl',   'Q7 J4 FL',          2009,'audi','Audi','J4 FL',   'audi-q7',                       'suv',      'premium_suv',    'suv_large',  245,'v6t'),
  node('audi-tt-8n-fl',   'TT 8N FL',          2003,'audi','Audi','8N FL',   'audi-tt',                       'coupe',    'sports',         'sports',     225,'i4t'),
  node('audi-tt-8j-fl',   'TT 8J FL',          2010,'audi','Audi','8J FL',   'audi-tt',                       'coupe',    'sports',         'sports',     211,'i4t'),
  node('audi-r8-42-fl',   'R8 Typ 42 FL',      2010,'audi','Audi','42 FL',   'audi-r8',                       'coupe',    'supercar',       'supercar',   525,'v10'),

  // ── BMW ───────────────────────────────────────────────────────────────────
  node('bmw-e30-fl',      '3 Series E30 FL',   1987,'bmw','BMW','E30 FL',  'bmw-3-series',                    'sedan',   'premium_compact','midsize_sed', 170,'i6'),
  node('bmw-e36-fl',      '3 Series E36 FL',   1996,'bmw','BMW','E36 FL',  'bmw-3-series',                    'sedan',   'premium_compact','midsize_sed', 193,'i6'),
  node('bmw-e46-fl',      '3 Series E46 LCI',  2001,'bmw','BMW','E46 LCI','bmw-3-series',                     'sedan',   'premium_compact','midsize_sed', 170,'i6'),
  node('bmw-e90-fl',      '3 Series E90 LCI',  2008,'bmw','BMW','E90 LCI','bmw-3-series',                     'sedan',   'premium_compact','midsize_sed', 204,'i6'),
  node('bmw-f30-fl',      '3 Series F30 LCI',  2015,'bmw','BMW','F30 LCI','bmw-3-series',                     'sedan',   'premium_compact','midsize_sed', 184,'i4t'),
  node('bmw-g20-fl',      '3 Series G20 LCI',  2022,'bmw','BMW','G20 LCI','bmw-3-series',                     'sedan',   'premium_compact','midsize_sed', 190,'i4t'),
  node('bmw-5-e34-fl',    '5 Series E34 FL',   1992,'bmw','BMW','E34 FL',  'bmw-5-series',                    'sedan',   'executive',      'exec_sed',    218,'i6'),
  node('bmw-5-e39-fl',    '5 Series E39 FL',   2000,'bmw','BMW','E39 FL',  'bmw-5-series',                    'sedan',   'executive',      'exec_sed',    231,'i6'),
  node('bmw-5-e60-fl',    '5 Series E60 LCI',  2007,'bmw','BMW','E60 LCI','bmw-5-series',                     'sedan',   'executive',      'exec_sed',    258,'i6t'),
  node('bmw-5-f10-fl',    '5 Series F10 LCI',  2013,'bmw','BMW','F10 LCI','bmw-5-series',                     'sedan',   'executive',      'exec_sed',    218,'i4t'),
  node('bmw-5-g30-fl',    '5 Series G30 LCI',  2020,'bmw','BMW','G30 LCI','bmw-5-series',                     'sedan',   'executive',      'exec_sed',    190,'i4t'),
  node('bmw-7-e38-fl',    '7 Series E38 FL',   1998,'bmw','BMW','E38 FL',  'bmw-7-series',                    'sedan',   'luxury',         'flagship_sed',286,'v8'),
  node('bmw-7-e65-fl',    '7 Series E65 FL',   2005,'bmw','BMW','E65 FL',  'bmw-7-series',                    'sedan',   'luxury',         'flagship_sed',272,'v8'),
  node('bmw-7-f01-fl',    '7 Series F01 LCI',  2012,'bmw','BMW','F01 LCI','bmw-7-series',                     'sedan',   'luxury',         'flagship_sed',320,'v8t'),
  node('bmw-7-g11-fl',    '7 Series G11 LCI',  2019,'bmw','BMW','G11 LCI','bmw-7-series',                     'sedan',   'luxury',         'flagship_sed',340,'i6t'),
  node('bmw-x5-e53-fl',   'X5 E53 FL',         2003,'bmw','BMW','E53 FL',  'bmw-x5',                          'suv',     'premium_suv',    'suv_large',   231,'i6'),
  node('bmw-x5-e70-fl',   'X5 E70 LCI',        2010,'bmw','BMW','E70 LCI','bmw-x5',                           'suv',     'premium_suv',    'suv_large',   245,'i6t'),
  node('bmw-x5-f15-fl',   'X5 F15 LCI',        2016,'bmw','BMW','F15 LCI','bmw-x5',                           'suv',     'premium_suv',    'suv_large',   231,'i6t'),
  node('bmw-x3-e83-fl',   'X3 E83 FL',         2006,'bmw','BMW','E83 FL',  'bmw-x3',                          'suv',     'premium_suv',    'suv_mid',     215,'i6'),
  node('bmw-x3-f25-fl',   'X3 F25 LCI',        2014,'bmw','BMW','F25 LCI','bmw-x3',                           'suv',     'premium_suv',    'suv_mid',     184,'i4t'),
  node('bmw-x3-g01-fl',   'X3 G01 LCI',        2021,'bmw','BMW','G01 LCI','bmw-x3',                           'suv',     'premium_suv',    'suv_mid',     190,'i4t'),
  node('bmw-4-f32-fl',    '4 Series F32 LCI',  2017,'bmw','BMW','F32 LCI','bmw-4-series-gran-coup',           'coupe',   'premium_sport',  'gt_coupe',   184,'i4t'),
  node('bmw-1-e87-fl',    '1 Series E87 LCI',  2007,'bmw','BMW','E87 LCI','bmw-1-series',                     'hatchback','premium_compact','hatchback', 130,'i4'),
  node('bmw-1-f20-fl',    '1 Series F20 LCI',  2015,'bmw','BMW','F20 LCI','bmw-1-series',                     'hatchback','premium_compact','hatchback', 136,'i4t'),
  node('bmw-6-e63-fl',    '6 Series E63 LCI',  2007,'bmw','BMW','E63 LCI','bmw-6-series',                     'coupe',   'grand_tourer',   'gt_coupe',   367,'v8'),
  node('bmw-z4-e85-fl',   'Z4 E85 FL',         2006,'bmw','BMW','E85 FL',  'bmw-z4',                          'roadster','sports',         'sports',     265,'i6'),
  node('bmw-8-e31-fl',    '8 Series E31 FL',   1996,'bmw','BMW','E31 FL',  'bmw-8-series',                    'coupe',   'grand_tourer',   'gt_coupe',   326,'v8'),

  // ── MERCEDES ──────────────────────────────────────────────────────────────
  node('merc-w210-fl',    'E-Class W210 FL',   1999,'mercedes','Mercedes-Benz','W210 FL', 'mercedes-e-class',  'sedan','executive',      'exec_sed',   163,'i6'),
  node('merc-w211-fl',    'E-Class W211 FL',   2006,'mercedes','Mercedes-Benz','W211 FL', 'mercedes-e-class',  'sedan','executive',      'exec_sed',   211,'v6t'),
  node('merc-w212-fl',    'E-Class W212 FL',   2013,'mercedes','Mercedes-Benz','W212 FL', 'mercedes-e-class',  'sedan','executive',      'exec_sed',   211,'v6t'),
  node('merc-w213-fl',    'E-Class W213 FL',   2020,'mercedes','Mercedes-Benz','W213 FL', 'mercedes-e-class',  'sedan','executive',      'exec_sed',   194,'i4t'),
  node('merc-c-w202-fl',  'C-Class W202 FL',   1997,'mercedes','Mercedes-Benz','W202 FL', 'mercedes-c-class',  'sedan','premium_compact','midsize_sed', 150,'i4'),
  node('merc-c-w203-fl',  'C-Class W203 FL',   2004,'mercedes','Mercedes-Benz','W203 FL', 'mercedes-c-class',  'sedan','premium_compact','midsize_sed', 163,'i4'),
  node('merc-c-w204-fl',  'C-Class W204 FL',   2011,'mercedes','Mercedes-Benz','W204 FL', 'mercedes-c-class',  'sedan','premium_compact','midsize_sed', 184,'i4t'),
  node('merc-c-w205-fl',  'C-Class W205 FL',   2018,'mercedes','Mercedes-Benz','W205 FL', 'mercedes-c-class',  'sedan','premium_compact','midsize_sed', 184,'i4t'),
  node('merc-s-w116-fl',  'S-Class W116 FL',   1977,'mercedes','Mercedes-Benz','W116 FL', 'mercedes-s-class',  'sedan','luxury',         'flagship_sed',240,'v8'),
  node('merc-s-w126-fl',  'S-Class W126 FL',   1985,'mercedes','Mercedes-Benz','W126 FL', 'mercedes-s-class',  'sedan','luxury',         'flagship_sed',265,'v8'),
  node('merc-s-w140-fl',  'S-Class W140 FL',   1994,'mercedes','Mercedes-Benz','W140 FL', 'mercedes-s-class',  'sedan','luxury',         'flagship_sed',326,'v12'),
  node('merc-s-w220-fl',  'S-Class W220 FL',   2002,'mercedes','Mercedes-Benz','W220 FL', 'mercedes-s-class',  'sedan','luxury',         'flagship_sed',306,'v8t'),
  node('merc-s-w221-fl',  'S-Class W221 FL',   2009,'mercedes','Mercedes-Benz','W221 FL', 'mercedes-s-class',  'sedan','luxury',         'flagship_sed',388,'v8t'),
  node('merc-s-w222-fl',  'S-Class W222 FL',   2017,'mercedes','Mercedes-Benz','W222 FL', 'mercedes-s-class',  'sedan','luxury',         'flagship_sed',367,'v8t'),
  node('merc-sl-r107-fl', 'SL R107 FL',        1985,'mercedes','Mercedes-Benz','R107 FL', 'mercedes-sl',       'roadster','sports',      'open_top',   245,'v8'),
  node('merc-sl-r129-fl', 'SL R129 FL',        1996,'mercedes','Mercedes-Benz','R129 FL', 'mercedes-sl',       'roadster','sports',      'open_top',   320,'v8'),
  node('merc-sl-r230-fl', 'SL R230 FL',        2006,'mercedes','Mercedes-Benz','R230 FL', 'mercedes-sl',       'roadster','sports',      'open_top',   388,'v8'),
  node('merc-ml-w163-fl', 'ML W163 FL',        2001,'mercedes','Mercedes-Benz','W163 FL', 'mercedes-gle',      'suv',   'premium_suv',   'suv_large',  218,'v6'),
  node('merc-ml-w164-fl', 'ML W164 FL',        2008,'mercedes','Mercedes-Benz','W164 FL', 'mercedes-gle',      'suv',   'premium_suv',   'suv_large',  258,'v6t'),
  node('merc-a-w168-fl',  'A-Class W168 FL',   2001,'mercedes','Mercedes-Benz','W168 FL', 'mercedes-a-class',  'hatchback','small',      'hatchback',  140,'i4'),
  node('merc-a-w169-fl',  'A-Class W169 FL',   2008,'mercedes','Mercedes-Benz','W169 FL', 'mercedes-a-class',  'hatchback','small',      'hatchback',  136,'i4'),
  node('merc-a-w176-fl',  'A-Class W176 FL',   2015,'mercedes','Mercedes-Benz','W176 FL', 'mercedes-a-class',  'hatchback','small',      'hatchback',  136,'i4t'),

  // ── PORSCHE ───────────────────────────────────────────────────────────────
  node('p911-996-fl',         '911 996.2',        2001,'porsche','Porsche','996.2',  'porsche-911-carrera',               'coupe','sports','sports', 320,'flat6'),
  node('p911-997-fl',         '911 997.2',        2008,'porsche','Porsche','997.2',  'porsche-911-carrera',               'coupe','sports','sports', 345,'flat6'),
  node('p911-991-fl',         '911 991.2',        2015,'porsche','Porsche','991.2',  'porsche-911-carrera',               'coupe','sports','sports', 370,'flat6t'),
  node('p911-992-fl',         '911 992.2',        2023,'porsche','Porsche','992.2',  'porsche-911-carrera',               'coupe','sports','sports', 394,'flat6t'),
  node('porsche-box-986-fl',  'Boxster 986 FL',   2003,'porsche','Porsche','986 FL', 'porsche-boxster-and-boxster-s',     'roadster','sports','sports',228,'flat6'),
  node('porsche-box-987-fl',  'Boxster 987.2',    2009,'porsche','Porsche','987.2',  'porsche-boxster-and-boxster-s',     'roadster','sports','sports',255,'flat6'),
  node('porsche-cay-987-fl',  'Cayman 987.2',     2009,'porsche','Porsche','987.2',  'porsche-cayman',                    'coupe','sports','sports', 265,'flat6'),
  node('porsche-cay9-9pa-fl', 'Cayenne 9PA FL',   2007,'porsche','Porsche','9PA FL', 'porsche-cayenne',                   'suv','premium_suv','suv_large',340,'v8t'),
  node('porsche-cay9-92a-fl', 'Cayenne 92A FL',   2014,'porsche','Porsche','92A FL', 'porsche-cayenne',                   'suv','premium_suv','suv_large',340,'v6t'),
  node('porsche-pan-970-fl',  'Panamera 970 FL',  2013,'porsche','Porsche','970 FL', 'porsche-panamera',                  'sedan','grand_tourer','gt_coupe',310,'v6t'),

  // ── LAMBORGHINI ───────────────────────────────────────────────────────────
  node('lambo-diablo-fl',   'Diablo VT',          1993,'lamborghini','Lamborghini','VT',    'lamborghini-diablo',             'coupe','supercar','supercar',492,'v12'),
  node('lambo-murci-fl',    'Murciélago LP640',   2006,'lamborghini','Lamborghini','LP640', 'lamborghini-murcielago',         'coupe','supercar','supercar',640,'v12'),
  node('lambo-gallardo-fl', 'Gallardo LP560-4',   2008,'lamborghini','Lamborghini','LP560', 'lamborghini-gallardo-lp-560-4',  'coupe','supercar','supercar',560,'v10'),
  node('lambo-aven-fl',     'Aventador S',        2016,'lamborghini','Lamborghini','S',     'lamborghini-aventador-lp-700-4', 'coupe','supercar','supercar',740,'v12'),
  node('lambo-huracan-fl',  'Huracán EVO',        2019,'lamborghini','Lamborghini','EVO',   'lamborghini-huracan-lp-610-4',   'coupe','supercar','supercar',640,'v10'),

  // ── FERRARI ───────────────────────────────────────────────────────────────
  node('ferrari-portofino-m','Portofino M',       2020,'ferrari','Ferrari','M',  'ferrari-portofino',     'roadster','grand_tourer','open_top',620,'v8t'),
  node('ferrari-california-t','California T',     2014,'ferrari','Ferrari','T',  'ferrari-california',    'roadster','grand_tourer','open_top',560,'v8t'),
  node('ferrari-f12-tdf',   'F12 TDF',            2015,'ferrari','Ferrari','TDF','ferrari-f12berlinetta', 'coupe',   'supercar',    'gt_coupe',780,'v12'),

  // ── MASERATI ──────────────────────────────────────────────────────────────
  node('maserati-qp5-fl',   'Quattroporte V FL',  2008,'maserati','Maserati','V FL',   'maserati-quattroporte-v','sedan','luxury',     'flagship_sed',400,'v8'),
  node('maserati-gran-fl',  'GranTurismo Mk1 FL', 2011,'maserati','Maserati','FL',     'maserati-granturismo',  'coupe','grand_tourer','gt_coupe',   460,'v8'),
  node('maserati-qp6-fl',   'Quattroporte VI FL', 2018,'maserati','Maserati','VI FL',  'maserati-quattroporte', 'sedan','luxury',     'flagship_sed',430,'v8t'),
  node('maserati-ghibli3-fl','Ghibli III FL',     2018,'maserati','Maserati','III FL', 'maserati-ghibli',       'sedan','executive',  'exec_sed',    350,'v6t'),
  node('maserati-levante-fl','Levante FL',        2021,'maserati','Maserati','FL',     'maserati-levante',      'suv',  'premium_suv','suv_large',   350,'v6t'),
];

const newEdges = [
  // AUDI
  fl('au-fl-a3-8l','audi-a3-8l','audi-a3-8l-fl'),
  fl('au-fl-a3-8p','audi-a3-8p','audi-a3-8p-fl'),
  fl('au-fl-a3-8v','audi-a3-8v','audi-a3-8v-fl'),
  fl('au-fl-a4b8', 'audi-a4b8', 'audi-a4b8-fl'),
  fl('au-fl-a4b9', 'audi-a4b9', 'audi-a4b9-fl'),
  fl('au-fl-a58t', 'audi-a5-8t','audi-a5-8t-fl'),
  fl('au-fl-a6c5', 'audi-a6-c5','audi-a6-c5-fl'),
  fl('au-fl-a6c6', 'audi-a6-c6','audi-a6-c6-fl'),
  fl('au-fl-a6c7', 'audi-a6-c7','audi-a6-c7-fl'),
  fl('au-fl-a6c8', 'audi-a6-c8','audi-a6-c8-fl'),
  fl('au-fl-a8d2', 'audi-a8-d2','audi-a8-d2-fl'),
  fl('au-fl-a8d3', 'audi-a8-d3','audi-a8-d3-fl'),
  fl('au-fl-a8d4', 'audi-a8-d4','audi-a8-d4-fl'),
  fl('au-fl-q38u', 'audi-q3-8u','audi-q3-8u-fl'),
  fl('au-fl-q58r', 'audi-q5-8r','audi-q5-8r-fl'),
  fl('au-fl-q7j4', 'audi-q7-j4','audi-q7-j4-fl'),
  fl('au-fl-tt8n', 'audi-tt-8n','audi-tt-8n-fl'),
  fl('au-fl-tt8j', 'audi-tt-8j','audi-tt-8j-fl'),
  fl('au-fl-r842', 'audi-r8-typ42','audi-r8-42-fl'),
  // BMW
  fl('bm-fl-e30',  'bmw-e30',     'bmw-e30-fl'),
  fl('bm-fl-e36',  'bmw-e36',     'bmw-e36-fl'),
  fl('bm-fl-e46',  'bmw-e46',     'bmw-e46-fl'),
  fl('bm-fl-e90',  'bmw-e90',     'bmw-e90-fl'),
  fl('bm-fl-f30',  'bmw-f30',     'bmw-f30-fl'),
  fl('bm-fl-g20',  'bmw-g20',     'bmw-g20-fl'),
  fl('bm-fl-5e34', 'bmw-5-e34',   'bmw-5-e34-fl'),
  fl('bm-fl-5e39', 'bmw-5-e39',   'bmw-5-e39-fl'),
  fl('bm-fl-5e60', 'bmw-5-e60',   'bmw-5-e60-fl'),
  fl('bm-fl-5f10', 'bmw-5-f10',   'bmw-5-f10-fl'),
  fl('bm-fl-5g30', 'bmw-5-g30',   'bmw-5-g30-fl'),
  fl('bm-fl-7e38', 'bmw-7-e38',   'bmw-7-e38-fl'),
  fl('bm-fl-7e65', 'bmw-7-e65',   'bmw-7-e65-fl'),
  fl('bm-fl-7f01', 'bmw-7-f01',   'bmw-7-f01-fl'),
  fl('bm-fl-7g11', 'bmw-7-g11',   'bmw-7-g11-fl'),
  fl('bm-fl-x5e53','bmw-x5-e53',  'bmw-x5-e53-fl'),
  fl('bm-fl-x5e70','bmw-x5-e70',  'bmw-x5-e70-fl'),
  fl('bm-fl-x5f15','bmw-x5-f15',  'bmw-x5-f15-fl'),
  fl('bm-fl-x3e83','bmw-x3-e83',  'bmw-x3-e83-fl'),
  fl('bm-fl-x3f25','bmw-x3-f25',  'bmw-x3-f25-fl'),
  fl('bm-fl-x3g01','bmw-x3-g01',  'bmw-x3-g01-fl'),
  fl('bm-fl-4f32', 'bmw-4-f32',   'bmw-4-f32-fl'),
  fl('bm-fl-1e87', 'bmw-1-e87',   'bmw-1-e87-fl'),
  fl('bm-fl-1f20', 'bmw-1-f20',   'bmw-1-f20-fl'),
  fl('bm-fl-6e63', 'bmw-6-e63',   'bmw-6-e63-fl'),
  fl('bm-fl-z4e85','bmw-z4-e85',  'bmw-z4-e85-fl'),
  fl('bm-fl-8e31', 'bmw-8-e31',   'bmw-8-e31-fl'),
  // MERCEDES
  fl('me-fl-w210', 'merc-w210',      'merc-w210-fl'),
  fl('me-fl-w211', 'merc-w211',      'merc-w211-fl'),
  fl('me-fl-w212', 'merc-w212',      'merc-w212-fl'),
  fl('me-fl-w213', 'merc-w213',      'merc-w213-fl'),
  fl('me-fl-cw202','merc-c-w202',    'merc-c-w202-fl'),
  fl('me-fl-cw203','merc-c-w203',    'merc-c-w203-fl'),
  fl('me-fl-cw204','merc-c-w204',    'merc-c-w204-fl'),
  fl('me-fl-cw205','merc-c-w205',    'merc-c-w205-fl'),
  fl('me-fl-sw116','merc-s-w116',    'merc-s-w116-fl'),
  fl('me-fl-sw126','merc-s-w126',    'merc-s-w126-fl'),
  fl('me-fl-sw140','merc-s-w140',    'merc-s-w140-fl'),
  fl('me-fl-sw220','merc-s-w220',    'merc-s-w220-fl'),
  fl('me-fl-sw221','merc-s-w221',    'merc-s-w221-fl'),
  fl('me-fl-sw222','merc-s-w222',    'merc-s-w222-fl'),
  fl('me-fl-sl107','merc-sl-r107',   'merc-sl-r107-fl'),
  fl('me-fl-sl129','merc-sl-r129',   'merc-sl-r129-fl'),
  fl('me-fl-sl230','merc-sl-r230',   'merc-sl-r230-fl'),
  fl('me-fl-ml163','merc-ml-w163',   'merc-ml-w163-fl'),
  fl('me-fl-ml164','merc-ml-w164',   'merc-ml-w164-fl'),
  fl('me-fl-aw168','merc-a-w168',    'merc-a-w168-fl'),
  fl('me-fl-aw169','merc-a-w169',    'merc-a-w169-fl'),
  fl('me-fl-aw176','merc-a-w176',    'merc-a-w176-fl'),
  // PORSCHE
  fl('po-fl-996',    'p911-996',          'p911-996-fl'),
  fl('po-fl-997',    'p911-997',          'p911-997-fl'),
  fl('po-fl-991',    'p911-991',          'p911-991-fl'),
  fl('po-fl-992',    'p911-992',          'p911-992-fl'),
  fl('po-fl-box986', 'porsche-box-986',   'porsche-box-986-fl'),
  fl('po-fl-box987', 'porsche-box-987',   'porsche-box-987-fl'),
  fl('po-fl-cay987', 'porsche-cay-987',   'porsche-cay-987-fl'),
  fl('po-fl-c9pa',   'porsche-cay9-9pa',  'porsche-cay9-9pa-fl'),
  fl('po-fl-c92a',   'porsche-cay9-92a',  'porsche-cay9-92a-fl'),
  fl('po-fl-pan970', 'porsche-pan-970',   'porsche-pan-970-fl'),
  // LAMBORGHINI
  fl('lb-fl-diablo',  'lamborghini-diablo','lambo-diablo-fl'),
  fl('lb-fl-murci',   'lamborghini-murci', 'lambo-murci-fl'),
  fl('lb-fl-gallardo','lambo-gallardo',    'lambo-gallardo-fl'),
  fl('lb-fl-aven',    'lamborghini-aven',  'lambo-aven-fl'),
  fl('lb-fl-huracan', 'lambo-huracan',     'lambo-huracan-fl'),
  // FERRARI
  fl('fe-fl-portofino','ferrari-portofino-node','ferrari-portofino-m'),
  fl('fe-fl-cal',      'ferrari-california-node','ferrari-california-t'),
  fl('fe-fl-f12tdf',   'ferrari-f12',            'ferrari-f12-tdf'),
  // MASERATI
  fl('ma-fl-qp5',    'maserati-qp5',          'maserati-qp5-fl'),
  fl('ma-fl-gran',   'maserati-granturismo1', 'maserati-gran-fl'),
  fl('ma-fl-qp6',    'maserati-qp6',          'maserati-qp6-fl'),
  fl('ma-fl-ghibli', 'maserati-ghibli3',      'maserati-ghibli3-fl'),
  fl('ma-fl-levante','maserati-levante',       'maserati-levante-fl'),
];

// ── Apply ────────────────────────────────────────────────────────────────────
let addedN = 0, addedE = 0, skipN = 0, skipE = 0;

newNodes.forEach(n => {
  if (existingIds.has(n.id)) { skipN++; return; }
  data.nodes.push(n); existingIds.add(n.id); addedN++;
});

newEdges.forEach(e => {
  if (existingEIds.has(e.id)) { skipE++; return; }
  if (!existingIds.has(e.source)) { console.warn('Missing source:', e.source); skipE++; return; }
  if (!existingIds.has(e.target)) { console.warn('Missing target:', e.target); skipE++; return; }
  data.edges.push(e); existingEIds.add(e.id); addedE++;
});

fs.writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Узлов добавлено: ${addedN}  (пропущено: ${skipN})`);
console.log(`✅ Рёбер добавлено: ${addedE}  (пропущено: ${skipE})`);
console.log(`📊 Итого: ${data.nodes.length} узлов, ${data.edges.length} рёбер`);

const flNodes = data.nodes.filter(n => n.id.endsWith('-fl') || n.id.endsWith('.2'));
const byBrand = {};
flNodes.forEach(n => { byBrand[n.brandId] = (byBrand[n.brandId]||0)+1; });
console.log('\nФейслифтов по брендам:');
Object.entries(byBrand).sort().forEach(([b,c])=>console.log(`  ${b}: ${c}`));
