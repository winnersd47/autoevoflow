/**
 * add-hypercar-brands.js
 * Bugatti · Koenigsegg · Pagani · McLaren · Aston Martin · Rimac
 */
const fs   = require('fs');
const PATH = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const EID  = new Set(data.nodes.map(n => n.id));
const EEI  = new Set(data.edges.map(e => e.id));

const n = (id,label,year,bId,bName,code,slug,body,seg,zone,hp,eng) =>
  ({id,label,type:'generation',year,brandId:bId,brandName:bName,codeName:code,modelSlug:slug,bodyType:body,segment:seg,zone,hp,engineType:eng});
const ev = (id,s,t) => ({id,source:s,target:t,type:'evolves_into',  strength:0.95});
const fl = (id,s,t) => ({id,source:s,target:t,type:'facelifted_to', strength:0.90});
const va = (id,s,t) => ({id,source:s,target:t,type:'variant_of',    strength:0.90});
const df = (id,s,t) => ({id,source:s,target:t,type:'derived_from',  strength:0.85});

// ═══════════════════════════════════════════════════════════════════════════════
// BUGATTI
// W16 = уникальный 16-цил. квад-турбо. Используем 'w16' как engineType.
// ═══════════════════════════════════════════════════════════════════════════════
const BUGATTI = [
  // ── Heritage ──────────────────────────────────────────────────────────────
  n('bugatti-type35',  'Type 35',               1924,'bugatti','Bugatti','Type 35',  'bugatti-type-35',  'racing','heritage',   'sports',   135,'i8'),
  n('bugatti-type57',  'Type 57',               1934,'bugatti','Bugatti','Type 57',  'bugatti-type-57',  'coupe', 'heritage',   'gt_coupe', 175,'i8'),
  // ── Modern era ────────────────────────────────────────────────────────────
  n('bugatti-eb110',   'EB110 GT',              1992,'bugatti','Bugatti','EB110',    'bugatti-eb110',    'coupe', 'hypercar',   'hypercar', 553,'v12t'),
  n('bugatti-veyron',  'Veyron 16.4',           2005,'bugatti','Bugatti','EB 16.4',  'bugatti-veyron',   'coupe', 'hypercar',   'hypercar', 987,'w16'),
  n('bugatti-chiron',  'Chiron',                2016,'bugatti','Bugatti','W16T',     'bugatti-chiron',   'coupe', 'hypercar',   'hypercar',1479,'w16'),
  n('bugatti-bolide',  'Bolide',                2023,'bugatti','Bugatti','W16 B',    'bugatti-bolide',   'coupe', 'hypercar',   'hypercar',1850,'w16'),
  n('bugatti-tourill', 'Tourbillon',            2026,'bugatti','Bugatti','TOB',      'bugatti-tourbillon','coupe','hypercar',  'hypercar',1800,'v16h'),
  // ── Variants ──────────────────────────────────────────────────────────────
  n('bugatti-eb110ss', 'EB110 Super Sport',     1992,'bugatti','Bugatti','EB110 SS', 'bugatti-eb110',    'coupe', 'hypercar',   'hypercar', 603,'v12t'),
  n('bugatti-veyron-ss','Veyron Super Sport',   2010,'bugatti','Bugatti','SS',       'bugatti-veyron',   'coupe', 'hypercar',   'hypercar',1183,'w16'),
  n('bugatti-veyron-gs','Veyron Grand Sport',   2009,'bugatti','Bugatti','GS',       'bugatti-veyron',   'roadster','hypercar','open_top',  987,'w16'),
  n('bugatti-chiron-sport','Chiron Sport',      2018,'bugatti','Bugatti','Sport',    'bugatti-chiron',   'coupe', 'hypercar',   'hypercar',1479,'w16'),
  n('bugatti-chiron-ss','Chiron Super Sport',   2019,'bugatti','Bugatti','SS',       'bugatti-chiron',   'coupe', 'hypercar',   'hypercar',1479,'w16'),
  n('bugatti-divo',    'Divo',                  2018,'bugatti','Bugatti','Divo',     'bugatti-divo',     'coupe', 'hypercar',   'hypercar',1479,'w16'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// KOENIGSEGG
// ═══════════════════════════════════════════════════════════════════════════════
const KOENIGSEGG = [
  n('kgsegg-cc8s',     'CC8S',                  2002,'koenigsegg','Koenigsegg','CC8S',   'koenigsegg-cc','coupe','hypercar','hypercar',655,'v8t'),
  n('kgsegg-ccr',      'CCR',                   2004,'koenigsegg','Koenigsegg','CCR',    'koenigsegg-cc','coupe','hypercar','hypercar',806,'v8t'),
  n('kgsegg-ccx',      'CCX',                   2006,'koenigsegg','Koenigsegg','CCX',    'koenigsegg-ccx','coupe','hypercar','hypercar',806,'v8t'),
  n('kgsegg-ccxr',     'CCXR',                  2007,'koenigsegg','Koenigsegg','CCXR',   'koenigsegg-ccx','coupe','hypercar','hypercar',1018,'v8t'),
  n('kgsegg-agera',    'Agera',                 2010,'koenigsegg','Koenigsegg','Agera',  'koenigsegg-agera','coupe','hypercar','hypercar',960,'v8t'),
  n('kgsegg-agera-r',  'Agera R',               2011,'koenigsegg','Koenigsegg','Agera R','koenigsegg-agera','coupe','hypercar','hypercar',1140,'v8t'),
  n('kgsegg-agera-rs', 'Agera RS',              2015,'koenigsegg','Koenigsegg','Agera RS','koenigsegg-agera','coupe','hypercar','hypercar',1360,'v8t'),
  n('kgsegg-one1',     'One:1',                 2014,'koenigsegg','Koenigsegg','One:1',  'koenigsegg-one','coupe','hypercar','hypercar',1341,'v8t'),
  n('kgsegg-regera',   'Regera',                2016,'koenigsegg','Koenigsegg','Regera','koenigsegg-regera','coupe','hypercar','hypercar',1500,'v8h'),
  n('kgsegg-jesko',    'Jesko',                 2019,'koenigsegg','Koenigsegg','Jesko',  'koenigsegg-jesko','coupe','hypercar','hypercar',1600,'v8t'),
  n('kgsegg-jesko-a',  'Jesko Absolut',         2020,'koenigsegg','Koenigsegg','Absolut','koenigsegg-jesko','coupe','hypercar','hypercar',1600,'v8t'),
  n('kgsegg-gemera',   'Gemera',                2020,'koenigsegg','Koenigsegg','Gemera', 'koenigsegg-gemera','coupe','hypercar','hypercar',1700,'v8h'),
  n('kgsegg-cc850',    'CC850',                 2022,'koenigsegg','Koenigsegg','CC850',  'koenigsegg-cc850','coupe','hypercar','hypercar',1385,'v8t'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PAGANI
// ═══════════════════════════════════════════════════════════════════════════════
const PAGANI = [
  n('pagani-zonda-c12', 'Zonda C12',            1999,'pagani','Pagani','C12',    'pagani-zonda',  'coupe','hypercar','hypercar', 450,'v12'),
  n('pagani-zonda-s',   'Zonda S 7.3',          2002,'pagani','Pagani','S 7.3',  'pagani-zonda',  'coupe','hypercar','hypercar', 555,'v12'),
  n('pagani-zonda-f',   'Zonda F',              2005,'pagani','Pagani','F',      'pagani-zonda',  'coupe','hypercar','hypercar', 602,'v12'),
  n('pagani-zonda-cin', 'Zonda Cinque',         2009,'pagani','Pagani','Cinque', 'pagani-zonda',  'coupe','hypercar','hypercar', 678,'v12'),
  n('pagani-zonda-r',   'Zonda R',              2010,'pagani','Pagani','R',      'pagani-zonda',  'coupe','hypercar','hypercar', 740,'v12'),
  n('pagani-huayra',    'Huayra',               2012,'pagani','Pagani','C9',     'pagani-huayra', 'coupe','hypercar','hypercar', 730,'v12'),
  n('pagani-huayra-bc', 'Huayra BC',            2016,'pagani','Pagani','BC',     'pagani-huayra', 'coupe','hypercar','hypercar', 740,'v12'),
  n('pagani-huayra-r',  'Huayra R',             2020,'pagani','Pagani','R',      'pagani-huayra', 'coupe','hypercar','hypercar', 838,'v12'),
  n('pagani-utopia',    'Utopia',               2022,'pagani','Pagani','C12',    'pagani-utopia', 'coupe','hypercar','hypercar', 852,'v12'),
  n('pagani-utopia-r',  'Utopia Roadster',      2024,'pagani','Pagani','C12 R',  'pagani-utopia', 'roadster','hypercar','open_top',864,'v12'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// McLAREN
// ═══════════════════════════════════════════════════════════════════════════════
const MCLAREN = [
  // ── Hypercars ─────────────────────────────────────────────────────────────
  n('mclaren-f1',      'McLaren F1',            1992,'mclaren','McLaren','F1',    'mclaren-f1',    'coupe','hypercar','hypercar', 627,'v12'),
  n('mclaren-f1-lm',   'McLaren F1 LM',         1995,'mclaren','McLaren','F1 LM', 'mclaren-f1',    'coupe','hypercar','hypercar', 680,'v12'),
  n('mclaren-p1',      'McLaren P1',            2013,'mclaren','McLaren','P1',    'mclaren-p1',    'coupe','hypercar','hypercar', 903,'v8h'),
  n('mclaren-p1-gtr',  'McLaren P1 GTR',        2015,'mclaren','McLaren','P1 GTR','mclaren-p1',    'coupe','hypercar','hypercar', 986,'v8h'),
  n('mclaren-senna',   'Senna',                 2018,'mclaren','McLaren','BP23',  'mclaren-senna', 'coupe','hypercar','hypercar', 789,'v8t'),
  n('mclaren-speedtail','Speedtail',            2020,'mclaren','McLaren','BP23',  'mclaren-speedtail','coupe','hypercar','hypercar',1035,'v8h'),
  n('mclaren-solus',   'Solus GT',              2022,'mclaren','McLaren','1X',    'mclaren-solus', 'coupe','hypercar','hypercar', 829,'v10'),
  // ── Supercars chain ───────────────────────────────────────────────────────
  n('mclaren-mp412c',  'MP4-12C',               2011,'mclaren','McLaren','MP4-12C','mclaren-mp4','coupe','supercar','supercar', 592,'v8t'),
  n('mclaren-650s',    '650S',                  2014,'mclaren','McLaren','650S',  'mclaren-650s',  'coupe','supercar','supercar', 641,'v8t'),
  n('mclaren-720s',    '720S',                  2017,'mclaren','McLaren','720S',  'mclaren-720s',  'coupe','supercar','supercar', 710,'v8t'),
  n('mclaren-artura',  'Artura',                2021,'mclaren','McLaren','Artura','mclaren-artura','coupe','supercar','supercar', 680,'v8h'),
  // ── Variants ──────────────────────────────────────────────────────────────
  n('mclaren-765lt',   '765LT',                 2020,'mclaren','McLaren','765LT', 'mclaren-720s',  'coupe','supercar','supercar', 765,'v8t'),
  n('mclaren-senna-gtr','Senna GTR',            2020,'mclaren','McLaren','GTR',   'mclaren-senna', 'coupe','hypercar','hypercar', 814,'v8t'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// ASTON MARTIN
// ═══════════════════════════════════════════════════════════════════════════════
const ASTONMARTIN = [
  // ── DB heritage chain ─────────────────────────────────────────────────────
  n('am-db4',    'DB4',                          1958,'astonmartin','Aston Martin','DB4',   'aston-martin-db','coupe','gt','gt_coupe',240,'i6'),
  n('am-db5',    'DB5',                          1963,'astonmartin','Aston Martin','DB5',   'aston-martin-db','coupe','gt','gt_coupe',282,'i6'),
  n('am-db6',    'DB6',                          1965,'astonmartin','Aston Martin','DB6',   'aston-martin-db','coupe','gt','gt_coupe',282,'i6'),
  n('am-db7',    'DB7',                          1994,'astonmartin','Aston Martin','DB7',   'aston-martin-db','coupe','gt','gt_coupe',335,'i6'),
  n('am-db9',    'DB9',                          2004,'astonmartin','Aston Martin','DB9',   'aston-martin-db','coupe','gt','gt_coupe',510,'v12'),
  n('am-db11',   'DB11',                         2016,'astonmartin','Aston Martin','DB11',  'aston-martin-db','coupe','gt','gt_coupe',503,'v8t'),
  n('am-db12',   'DB12',                         2023,'astonmartin','Aston Martin','DB12',  'aston-martin-db','coupe','gt','gt_coupe',671,'v8t'),
  // ── Vantage chain ─────────────────────────────────────────────────────────
  n('am-vantage','V8 Vantage',                   2005,'astonmartin','Aston Martin','V8 V',  'aston-martin-vantage','coupe','sports','sports',380,'v8'),
  n('am-vantage2','Vantage V8',                  2018,'astonmartin','Aston Martin','AMR',   'aston-martin-vantage','coupe','sports','sports',503,'v8t'),
  // ── Hypercars ─────────────────────────────────────────────────────────────
  n('am-one77',  'One-77',                       2009,'astonmartin','Aston Martin','One-77','aston-martin-one77','coupe','hypercar','hypercar',750,'v12'),
  n('am-vulcan', 'Vulcan',                       2015,'astonmartin','Aston Martin','AMR-V8','aston-martin-vulcan','coupe','hypercar','hypercar',820,'v12'),
  n('am-valkyrie','Valkyrie',                    2019,'astonmartin','Aston Martin','AM-RB1','aston-martin-valkyrie','coupe','hypercar','hypercar',1139,'v12'),
  n('am-valhalla','Valhalla',                    2024,'astonmartin','Aston Martin','AM-B03','aston-martin-valhalla','coupe','hypercar','hypercar',1064,'v8h'),
  // ── Variants ──────────────────────────────────────────────────────────────
  n('am-db5-v',  'DB5 Vantage',                  1964,'astonmartin','Aston Martin','DB5V',  'aston-martin-db','coupe','gt','gt_coupe',314,'i6'),
  n('am-db11-v12','DB11 V12',                    2016,'astonmartin','Aston Martin','V12',   'aston-martin-db','coupe','gt','gt_coupe',600,'v12'),
  n('am-valkyrie-amrp','Valkyrie AMR Pro',       2021,'astonmartin','Aston Martin','AMR Pro','aston-martin-valkyrie','coupe','hypercar','hypercar',1000,'v12'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// RIMAC
// ═══════════════════════════════════════════════════════════════════════════════
const RIMAC = [
  n('rimac-concept1',  'Concept One',            2013,'rimac','Rimac','C_One', 'rimac-concept','coupe','hypercar','hypercar',1224,'ev'),
  n('rimac-nevera',    'Nevera',                 2021,'rimac','Rimac','C_Two', 'rimac-nevera', 'coupe','hypercar','hypercar',1888,'ev'),
  n('rimac-nevera-r',  'Nevera R',               2024,'rimac','Rimac','C_Two R','rimac-nevera','coupe','hypercar','hypercar',2078,'ev'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// EDGES
// ═══════════════════════════════════════════════════════════════════════════════
const newEdges = [
  // BUGATTI evolution
  ev('bu-1','bugatti-type35','bugatti-type57'),
  ev('bu-2','bugatti-eb110','bugatti-veyron'),
  ev('bu-3','bugatti-veyron','bugatti-chiron'),
  ev('bu-4','bugatti-chiron','bugatti-tourill'),
  // Bugatti variants
  va('bu-v1','bugatti-eb110','bugatti-eb110ss'),
  va('bu-v2','bugatti-veyron','bugatti-veyron-ss'),
  va('bu-v3','bugatti-veyron','bugatti-veyron-gs'),
  va('bu-v4','bugatti-chiron','bugatti-chiron-sport'),
  va('bu-v5','bugatti-chiron','bugatti-chiron-ss'),
  va('bu-v6','bugatti-chiron','bugatti-divo'),
  // Bolide derived from Chiron platform
  df('bu-d1','bugatti-chiron','bugatti-bolide'),

  // KOENIGSEGG evolution
  ev('kg-1','kgsegg-cc8s','kgsegg-ccx'),
  ev('kg-2','kgsegg-ccx','kgsegg-agera'),
  ev('kg-3','kgsegg-agera','kgsegg-jesko'),
  // Facelifts
  fl('kg-fl1','kgsegg-cc8s','kgsegg-ccr'),
  // Variants
  va('kg-v1','kgsegg-ccx','kgsegg-ccxr'),
  va('kg-v2','kgsegg-agera','kgsegg-agera-r'),
  va('kg-v3','kgsegg-agera','kgsegg-agera-rs'),
  va('kg-v4','kgsegg-agera','kgsegg-one1'),
  va('kg-v5','kgsegg-jesko','kgsegg-jesko-a'),
  // Separate lines (parallel development)
  df('kg-d1','kgsegg-agera','kgsegg-regera'),
  df('kg-d2','kgsegg-agera','kgsegg-gemera'),
  df('kg-d3','kgsegg-cc8s','kgsegg-cc850'),

  // PAGANI evolution
  ev('pg-1','pagani-zonda-c12','pagani-huayra'),
  ev('pg-2','pagani-huayra','pagani-utopia'),
  // Facelifts
  fl('pg-fl1','pagani-zonda-c12','pagani-zonda-s'),
  fl('pg-fl2','pagani-zonda-s','pagani-zonda-f'),
  // Variants
  va('pg-v1','pagani-zonda-f','pagani-zonda-cin'),
  va('pg-v2','pagani-zonda-f','pagani-zonda-r'),
  va('pg-v3','pagani-huayra','pagani-huayra-bc'),
  va('pg-v4','pagani-huayra','pagani-huayra-r'),
  va('pg-v5','pagani-utopia','pagani-utopia-r'),

  // McLAREN hypercars
  ev('mc-1','mclaren-f1','mclaren-p1'),
  ev('mc-2','mclaren-p1','mclaren-senna'),
  ev('mc-3','mclaren-senna','mclaren-speedtail'),
  // McLaren supercars chain
  ev('mc-4','mclaren-mp412c','mclaren-650s'),
  ev('mc-5','mclaren-650s','mclaren-720s'),
  ev('mc-6','mclaren-720s','mclaren-artura'),
  // Variants
  va('mc-v1','mclaren-f1','mclaren-f1-lm'),
  va('mc-v2','mclaren-p1','mclaren-p1-gtr'),
  va('mc-v3','mclaren-senna','mclaren-senna-gtr'),
  va('mc-v4','mclaren-720s','mclaren-765lt'),
  df('mc-d1','mclaren-720s','mclaren-solus'),

  // ASTON MARTIN DB chain
  ev('am-1','am-db4','am-db5'),
  ev('am-2','am-db5','am-db6'),
  ev('am-3','am-db6','am-db7'),
  ev('am-4','am-db7','am-db9'),
  ev('am-5','am-db9','am-db11'),
  ev('am-6','am-db11','am-db12'),
  // Vantage chain
  ev('am-7','am-vantage','am-vantage2'),
  // Hypercars
  ev('am-8','am-one77','am-vulcan'),
  ev('am-9','am-vulcan','am-valkyrie'),
  ev('am-10','am-valkyrie','am-valhalla'),
  // Variants
  va('am-v1','am-db5','am-db5-v'),
  va('am-v2','am-db11','am-db11-v12'),
  va('am-v3','am-valkyrie','am-valkyrie-amrp'),
  // One-77 derived from DB9
  df('am-d1','am-db9','am-one77'),

  // RIMAC chain
  ev('ri-1','rimac-concept1','rimac-nevera'),
  fl('ri-fl1','rimac-nevera','rimac-nevera-r'),
];

// ─── Apply ───────────────────────────────────────────────────────────────────
const allNodes = [...BUGATTI,...KOENIGSEGG,...PAGANI,...MCLAREN,...ASTONMARTIN,...RIMAC];
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

const byBrand = {};
allNodes.forEach(n => { byBrand[n.brandId]=(byBrand[n.brandId]||0)+1; });
console.log(`✅ Узлов: +${addN}  (пропущено: ${skipN})`);
console.log(`✅ Рёбер: +${addE}  (пропущено: ${skipE})`);
console.log(`📊 Всего: ${data.nodes.length} узлов, ${data.edges.length} рёбер`);
console.log('\nПо брендам:');
Object.entries(byBrand).sort().forEach(([b,c])=>console.log(`  ${b}: ${c}`));
