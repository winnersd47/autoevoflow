/**
 * fix-lexus-supra.js
 * 1. Исправляет zone Supra A80/A90: supercar → gt_coupe
 * 2. Добавляет полный модельный ряд Lexus (IS, GS, ES, RX, NX, GX, LX, LC, LFA, RC, CT, UX)
 * 3. Устанавливает derived_from/shares_platform связи с Toyota
 */
const fs   = require('fs');
const PATH = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const EID  = new Set(data.nodes.map(n => n.id));
const EEI  = new Set(data.edges.map(e => e.id));

// ─── 1. Исправление зон Supra ────────────────────────────────────────────────
// Supra — GT-купе, а не суперкар (Porsche 911 уровень, не Ferrari/Lambo)
const SUPRA_FIX = ['toyota-supra-a80','toyota-supra-a90','toyota-supra-a80-fl'];
let zoneFixed = 0;
data.nodes.forEach(n => {
  if (SUPRA_FIX.includes(n.id)) { n.zone = 'gt_coupe'; zoneFixed++; }
});
console.log(`✅ Zone fix: ${zoneFixed} Supra nodes → gt_coupe`);

// ─── helpers ─────────────────────────────────────────────────────────────────
const n  = (id,label,year,bId,bName,codeName,modelSlug,bodyType,segment,zone,hp,eng) =>
  ({id,label,type:'generation',year,brandId:bId,brandName:bName,codeName,modelSlug,bodyType,segment,zone,hp,engineType:eng});
const ev = (id,src,tgt) => ({id,source:src,target:tgt,type:'evolves_into',  strength:0.95});
const fl = (id,src,tgt) => ({id,source:src,target:tgt,type:'facelifted_to', strength:0.90});
const df = (id,src,tgt) => ({id,source:src,target:tgt,type:'derived_from',  strength:0.85});
const sp = (id,src,tgt) => ({id,source:src,target:tgt,type:'shares_platform',strength:0.80});

// ─── 2. Lexus модели ──────────────────────────────────────────────────────────
// brandId='lexus' — отдельный бренд, связи с Toyota через derived_from
const newNodes = [

  // ══ Lexus IS (компактный спортивный седан) ════════════════════════════════
  n('lexus-is-xe10',  'Lexus IS200 XE10',   1999,'lexus','Lexus','XE10',  'lexus-is','sedan','premium_compact','midsize_sed',156,'i6'),
  n('lexus-is-xe20',  'Lexus IS250 XE20',   2005,'lexus','Lexus','XE20',  'lexus-is','sedan','premium_compact','midsize_sed',208,'v6'),
  n('lexus-is-xe30',  'Lexus IS350 XE30',   2013,'lexus','Lexus','XE30',  'lexus-is','sedan','premium_compact','midsize_sed',306,'v6'),
  n('lexus-is-xe40',  'Lexus IS500 XE40',   2020,'lexus','Lexus','XE40',  'lexus-is','sedan','premium_compact','midsize_sed',472,'v8'),
  // IS facelifts
  n('lexus-is-xe10-fl','Lexus IS200 XE10 Phase II',2003,'lexus','Lexus','XE10 II','lexus-is','sedan','premium_compact','midsize_sed',156,'i6'),
  n('lexus-is-xe20-fl','Lexus IS250 XE20 Phase II',2008,'lexus','Lexus','XE20 II','lexus-is','sedan','premium_compact','midsize_sed',208,'v6'),
  n('lexus-is-xe30-fl','Lexus IS350 XE30 Phase II',2016,'lexus','Lexus','XE30 II','lexus-is','sedan','premium_compact','midsize_sed',311,'v6'),

  // ══ Lexus GS (представительский седан) ════════════════════════════════════
  n('lexus-gs-s140',  'Lexus GS300 S140',   1993,'lexus','Lexus','S140',  'lexus-gs','sedan','executive','exec_sed',220,'i6'),
  n('lexus-gs-s160',  'Lexus GS300 S160',   1997,'lexus','Lexus','S160',  'lexus-gs','sedan','executive','exec_sed',215,'i6'),
  n('lexus-gs-s190',  'Lexus GS350 S190',   2005,'lexus','Lexus','S190',  'lexus-gs','sedan','executive','exec_sed',303,'v6'),
  n('lexus-gs-l10',   'Lexus GS350 L10',    2012,'lexus','Lexus','L10',   'lexus-gs','sedan','executive','exec_sed',306,'v6'),
  // GS facelifts
  n('lexus-gs-s160-fl','Lexus GS300 S160 Phase II',2000,'lexus','Lexus','S160 II','lexus-gs','sedan','executive','exec_sed',215,'i6'),
  n('lexus-gs-s190-fl','Lexus GS350 S190 Phase II',2008,'lexus','Lexus','S190 II','lexus-gs','sedan','executive','exec_sed',303,'v6'),
  n('lexus-gs-l10-fl', 'Lexus GS350 L10 Phase II', 2015,'lexus','Lexus','L10 II', 'lexus-gs','sedan','executive','exec_sed',306,'v6'),

  // ══ Lexus ES (передний привод, на платформе Camry) ════════════════════════
  n('lexus-es-xv10',  'Lexus ES300 XV10',   1992,'lexus','Lexus','XV10',  'lexus-es','sedan','luxury_comfort','exec_sed',185,'v6'),
  n('lexus-es-xv20',  'Lexus ES300 XV20',   1996,'lexus','Lexus','XV20',  'lexus-es','sedan','luxury_comfort','exec_sed',188,'v6'),
  n('lexus-es-xv30',  'Lexus ES300 XV30',   2001,'lexus','Lexus','XV30',  'lexus-es','sedan','luxury_comfort','exec_sed',210,'v6'),
  n('lexus-es-xv40',  'Lexus ES350 XV40',   2006,'lexus','Lexus','XV40',  'lexus-es','sedan','luxury_comfort','exec_sed',272,'v6'),
  n('lexus-es-xv60',  'Lexus ES300h XV60',  2012,'lexus','Lexus','XV60',  'lexus-es','sedan','luxury_comfort','exec_sed',200,'i4h'),
  n('lexus-es-xv70',  'Lexus ES350 XV70',   2018,'lexus','Lexus','XV70',  'lexus-es','sedan','luxury_comfort','exec_sed',302,'v6'),
  // ES facelifts
  n('lexus-es-xv40-fl','Lexus ES350 XV40 Phase II',2009,'lexus','Lexus','XV40 II','lexus-es','sedan','luxury_comfort','exec_sed',272,'v6'),
  n('lexus-es-xv60-fl','Lexus ES300h XV60 Phase II',2015,'lexus','Lexus','XV60 II','lexus-es','sedan','luxury_comfort','exec_sed',200,'i4h'),
  n('lexus-es-xv70-fl','Lexus ES350 XV70 Phase II', 2021,'lexus','Lexus','XV70 II','lexus-es','sedan','luxury_comfort','exec_sed',302,'v6'),

  // ══ Lexus RX (кроссовер, на платформе Camry/Highlander) ═══════════════════
  n('lexus-rx-xu10',  'Lexus RX300 XU10',   1997,'lexus','Lexus','XU10',  'lexus-rx','suv','premium_suv','suv_mid',220,'v6'),
  n('lexus-rx-xu30',  'Lexus RX330 XU30',   2003,'lexus','Lexus','XU30',  'lexus-rx','suv','premium_suv','suv_mid',230,'v6'),
  n('lexus-rx-al10',  'Lexus RX350 AL10',   2009,'lexus','Lexus','AL10',  'lexus-rx','suv','premium_suv','suv_mid',275,'v6'),
  n('lexus-rx-al20',  'Lexus RX350 AL20',   2015,'lexus','Lexus','AL20',  'lexus-rx','suv','premium_suv','suv_mid',295,'v6'),
  n('lexus-rx-al30',  'Lexus RX500h AL30',  2022,'lexus','Lexus','AL30',  'lexus-rx','suv','premium_suv','suv_mid',366,'v6h'),
  // RX facelifts
  n('lexus-rx-xu10-fl','Lexus RX300 XU10 Phase II',2000,'lexus','Lexus','XU10 II','lexus-rx','suv','premium_suv','suv_mid',220,'v6'),
  n('lexus-rx-xu30-fl','Lexus RX350 XU30 Phase II',2006,'lexus','Lexus','XU30 II','lexus-rx','suv','premium_suv','suv_mid',270,'v6'),
  n('lexus-rx-al10-fl','Lexus RX350 AL10 Phase II',2012,'lexus','Lexus','AL10 II','lexus-rx','suv','premium_suv','suv_mid',275,'v6'),
  n('lexus-rx-al20-fl','Lexus RX350 AL20 Phase II',2018,'lexus','Lexus','AL20 II','lexus-rx','suv','premium_suv','suv_mid',295,'v6'),

  // ══ Lexus NX (компактный кроссовер, на платформе RAV4) ════════════════════
  n('lexus-nx-az10',  'Lexus NX200t AZ10',  2014,'lexus','Lexus','AZ10',  'lexus-nx','suv','premium_suv','suv_compact',235,'i4t'),
  n('lexus-nx-az20',  'Lexus NX350 AZ20',   2021,'lexus','Lexus','AZ20',  'lexus-nx','suv','premium_suv','suv_compact',275,'i4t'),
  // NX facelifts
  n('lexus-nx-az10-fl','Lexus NX200t AZ10 Phase II',2017,'lexus','Lexus','AZ10 II','lexus-nx','suv','premium_suv','suv_compact',235,'i4t'),

  // ══ Lexus LX (большой внедорожник, на платформе Land Cruiser) ═════════════
  n('lexus-lx-j80',   'Lexus LX450 J80',    1996,'lexus','Lexus','J80',   'lexus-lx','suv','off_road','suv_large',212,'i6'),
  n('lexus-lx-j100',  'Lexus LX470 J100',   1998,'lexus','Lexus','J100',  'lexus-lx','suv','off_road','suv_large',230,'v8'),
  n('lexus-lx-j200',  'Lexus LX570 J200',   2007,'lexus','Lexus','J200',  'lexus-lx','suv','off_road','suv_large',383,'v8'),
  n('lexus-lx-j300',  'Lexus LX600 J300',   2021,'lexus','Lexus','J300',  'lexus-lx','suv','off_road','suv_large',409,'v6t'),
  // LX facelifts
  n('lexus-lx-j100-fl','Lexus LX470 J100 Phase II',2003,'lexus','Lexus','J100 II','lexus-lx','suv','off_road','suv_large',230,'v8'),
  n('lexus-lx-j200-fl','Lexus LX570 J200 Phase II',2012,'lexus','Lexus','J200 II','lexus-lx','suv','off_road','suv_large',383,'v8'),

  // ══ Lexus GX (средний внедорожник, Land Cruiser Prado) ════════════════════
  n('lexus-gx-j120',  'Lexus GX470 J120',   2002,'lexus','Lexus','J120',  'lexus-gx','suv','off_road','suv_large',235,'v8'),
  n('lexus-gx-j150',  'Lexus GX460 J150',   2009,'lexus','Lexus','J150',  'lexus-gx','suv','off_road','suv_large',301,'v8'),
  n('lexus-gx-j250',  'Lexus GX550 J250',   2023,'lexus','Lexus','J250',  'lexus-gx','suv','off_road','suv_large',349,'v6t'),
  // GX facelifts
  n('lexus-gx-j150-fl','Lexus GX460 J150 Phase II',2013,'lexus','Lexus','J150 II','lexus-gx','suv','off_road','suv_large',301,'v8'),

  // ══ Lexus LC (гран-туризмо купе) ════════════════════════════════════════════
  n('lexus-lc-z100',  'Lexus LC500 Z100',   2017,'lexus','Lexus','Z100',  'lexus-lc','coupe','grand_tourer','gt_coupe',471,'v8'),
  n('lexus-lc-z100-fl','Lexus LC500 Z100 Phase II',2020,'lexus','Lexus','Z100 II','lexus-lc','coupe','grand_tourer','gt_coupe',471,'v8'),

  // ══ Lexus RC (спортивное купе, на платформе IS) ════════════════════════════
  n('lexus-rc-xc10',  'Lexus RC350 XC10',   2014,'lexus','Lexus','XC10',  'lexus-rc','coupe','sports','gt_coupe',306,'v6'),
  n('lexus-rc-f-xc10','Lexus RC F XC10',    2014,'lexus','Lexus','XC10 F','lexus-rc-f','coupe','sports','sports', 467,'v8'),
  // RC facelifts
  n('lexus-rc-xc10-fl','Lexus RC350 XC10 Phase II',2018,'lexus','Lexus','XC10 II','lexus-rc','coupe','sports','gt_coupe',306,'v6'),

  // ══ Lexus LFA (суперкар) ════════════════════════════════════════════════════
  n('lexus-lfa-xf10', 'Lexus LFA XF10',     2010,'lexus','Lexus','XF10',  'lexus-lfa','coupe','hypercar','supercar', 552,'v10'),

  // ══ Lexus CT (хэтчбэк, на платформе Prius) ════════════════════════════════
  n('lexus-ct-zwa10', 'Lexus CT200h ZWA10', 2011,'lexus','Lexus','ZWA10', 'lexus-ct','hatchback','hybrid','hatchback',134,'i4h'),
  n('lexus-ct-zwa10-fl','Lexus CT200h Phase II',2013,'lexus','Lexus','ZWA10 II','lexus-ct','hatchback','hybrid','hatchback',134,'i4h'),

  // ══ Lexus UX (городской кроссовер) ════════════════════════════════════════
  n('lexus-ux-za10',  'Lexus UX250h ZA10',  2018,'lexus','Lexus','ZA10',  'lexus-ux','suv','compact_suv','suv_compact',178,'i4h'),
  n('lexus-ux-za10-fl','Lexus UX250h Phase II',2022,'lexus','Lexus','ZA10 II','lexus-ux','suv','compact_suv','suv_compact',178,'i4h'),

  // ══ Lexus UX EV ════════════════════════════════════════════════════════════
  n('lexus-ux-ze10',  'Lexus UX300e ZE10',  2020,'lexus','Lexus','ZE10',  'lexus-ux','suv','compact_suv','electric',201,'ev'),
];

// ─── 3. Рёбра ────────────────────────────────────────────────────────────────
const newEdges = [
  // ── IS эволюция ────────────────────────────────────────────────────────────
  ev('lx-is-1','lexus-is-xe10','lexus-is-xe20'),
  ev('lx-is-2','lexus-is-xe20','lexus-is-xe30'),
  ev('lx-is-3','lexus-is-xe30','lexus-is-xe40'),
  fl('lx-is-fl1','lexus-is-xe10','lexus-is-xe10-fl'),
  fl('lx-is-fl2','lexus-is-xe20','lexus-is-xe20-fl'),
  fl('lx-is-fl3','lexus-is-xe30','lexus-is-xe30-fl'),
  // IS связь с Toyota (IS XE10 на базе Toyota Altezza/Corolla platform)
  sp('lx-is-t1','lexus-is-xe10','toyota-corolla-e100'),

  // ── GS эволюция ────────────────────────────────────────────────────────────
  ev('lx-gs-1','lexus-gs-s140','lexus-gs-s160'),
  ev('lx-gs-2','lexus-gs-s160','lexus-gs-s190'),
  ev('lx-gs-3','lexus-gs-s190','lexus-gs-l10'),
  fl('lx-gs-fl1','lexus-gs-s160','lexus-gs-s160-fl'),
  fl('lx-gs-fl2','lexus-gs-s190','lexus-gs-s190-fl'),
  fl('lx-gs-fl3','lexus-gs-l10','lexus-gs-l10-fl'),

  // ── ES эволюция (на базе Camry) ────────────────────────────────────────────
  ev('lx-es-1','lexus-es-xv10','lexus-es-xv20'),
  ev('lx-es-2','lexus-es-xv20','lexus-es-xv30'),
  ev('lx-es-3','lexus-es-xv30','lexus-es-xv40'),
  ev('lx-es-4','lexus-es-xv40','lexus-es-xv60'),
  ev('lx-es-5','lexus-es-xv60','lexus-es-xv70'),
  fl('lx-es-fl1','lexus-es-xv40','lexus-es-xv40-fl'),
  fl('lx-es-fl2','lexus-es-xv60','lexus-es-xv60-fl'),
  fl('lx-es-fl3','lexus-es-xv70','lexus-es-xv70-fl'),
  // ES на базе Camry
  df('lx-es-t1','toyota-camry-v40','lexus-es-xv20'),
  df('lx-es-t2','toyota-camry-v50','lexus-es-xv40'),
  df('lx-es-t3','toyota-camry-v70','lexus-es-xv70'),

  // ── RX эволюция (кроссовер на базе Camry/Highlander) ──────────────────────
  ev('lx-rx-1','lexus-rx-xu10','lexus-rx-xu30'),
  ev('lx-rx-2','lexus-rx-xu30','lexus-rx-al10'),
  ev('lx-rx-3','lexus-rx-al10','lexus-rx-al20'),
  ev('lx-rx-4','lexus-rx-al20','lexus-rx-al30'),
  fl('lx-rx-fl1','lexus-rx-xu10','lexus-rx-xu10-fl'),
  fl('lx-rx-fl2','lexus-rx-xu30','lexus-rx-xu30-fl'),
  fl('lx-rx-fl3','lexus-rx-al10','lexus-rx-al10-fl'),
  fl('lx-rx-fl4','lexus-rx-al20','lexus-rx-al20-fl'),
  // RX на базе RAV4/Camry платформы
  df('lx-rx-t1','toyota-camry-v40','lexus-rx-xu10'),
  df('lx-rx-t2','toyota-rav4-4','lexus-rx-al20'),
  df('lx-rx-t3','toyota-rav4-5','lexus-rx-al30'),

  // ── NX эволюция (на базе RAV4) ─────────────────────────────────────────────
  ev('lx-nx-1','lexus-nx-az10','lexus-nx-az20'),
  fl('lx-nx-fl1','lexus-nx-az10','lexus-nx-az10-fl'),
  df('lx-nx-t1','toyota-rav4-4','lexus-nx-az10'),
  df('lx-nx-t2','toyota-rav4-5','lexus-nx-az20'),

  // ── LX эволюция (на базе Land Cruiser) ─────────────────────────────────────
  ev('lx-lx-1','lexus-lx-j80','lexus-lx-j100'),
  ev('lx-lx-2','lexus-lx-j100','lexus-lx-j200'),
  ev('lx-lx-3','lexus-lx-j200','lexus-lx-j300'),
  fl('lx-lx-fl1','lexus-lx-j100','lexus-lx-j100-fl'),
  fl('lx-lx-fl2','lexus-lx-j200','lexus-lx-j200-fl'),
  // LX = премиум-версия Land Cruiser
  df('lx-lx-t1','toyota-lc-80','lexus-lx-j80'),
  df('lx-lx-t2','toyota-lc-100','lexus-lx-j100'),
  df('lx-lx-t3','toyota-lc-200','lexus-lx-j200'),
  df('lx-lx-t4','toyota-lc-300','lexus-lx-j300'),

  // ── GX эволюция ────────────────────────────────────────────────────────────
  ev('lx-gx-1','lexus-gx-j120','lexus-gx-j150'),
  ev('lx-gx-2','lexus-gx-j150','lexus-gx-j250'),
  fl('lx-gx-fl1','lexus-gx-j150','lexus-gx-j150-fl'),

  // ── LC (standalone) ────────────────────────────────────────────────────────
  fl('lx-lc-fl1','lexus-lc-z100','lexus-lc-z100-fl'),

  // ── RC = купе на базе IS XE30 ──────────────────────────────────────────────
  fl('lx-rc-fl1','lexus-rc-xc10','lexus-rc-xc10-fl'),
  df('lx-rc-t1','lexus-is-xe30','lexus-rc-xc10'),
  df('lx-rc-t2','lexus-is-xe30','lexus-rc-f-xc10'),

  // ── CT на базе Prius ───────────────────────────────────────────────────────
  fl('lx-ct-fl1','lexus-ct-zwa10','lexus-ct-zwa10-fl'),
  df('lx-ct-t1','toyota-prius-3','lexus-ct-zwa10'),

  // ── UX эволюция ────────────────────────────────────────────────────────────
  fl('lx-ux-fl1','lexus-ux-za10','lexus-ux-za10-fl'),
  df('lx-ux-t1','toyota-corolla-e210','lexus-ux-za10'),
  // UX EV = электро-версия UX
  {id:'lx-ux-ev',source:'lexus-ux-za10',target:'lexus-ux-ze10',type:'derived_from',strength:0.85},

  // ── LS → IS преемственность через платформу ───────────────────────────────
  sp('lx-ls-is','lexus-ls-ucf10','lexus-gs-s140'),
];

// ─── Apply ───────────────────────────────────────────────────────────────────
let addN=0, addE=0, skipN=0, skipE=0;
newNodes.forEach(node => {
  if (EID.has(node.id)) { skipN++; return; }
  data.nodes.push(node); EID.add(node.id); addN++;
});
newEdges.forEach(edge => {
  if (EEI.has(edge.id)) { skipE++; return; }
  if (!EID.has(edge.source)) { console.warn('⚠ no src:', edge.source); skipE++; return; }
  if (!EID.has(edge.target)) { console.warn('⚠ no tgt:', edge.target); skipE++; return; }
  data.edges.push(edge); EEI.add(edge.id); addE++;
});
fs.writeFileSync(PATH, JSON.stringify(data,null,2), 'utf8');

const lexusTotal = data.nodes.filter(n=>n.brandId==='lexus').length;
console.log(`✅ Узлов добавлено: +${addN}  (пропущено: ${skipN})`);
console.log(`✅ Рёбер добавлено: +${addE}  (пропущено: ${skipE})`);
console.log(`📊 Lexus всего: ${lexusTotal} моделей`);
console.log(`📊 Граф: ${data.nodes.length} узлов, ${data.edges.length} рёбер`);

// Показать Lexus по сериям
const series = {};
data.nodes.filter(n=>n.brandId==='lexus').forEach(n=>{
  const s = n.modelSlug || n.id.split('-')[1];
  series[s] = (series[s]||0)+1;
});
console.log('\nLexus по моделям:');
Object.entries(series).sort().forEach(([s,c])=>console.log(`  ${s}: ${c}`));
