/**
 * rename-facelifts.js
 * Заменяет "FL" в label/codeName на реальные отраслевые обозначения фейслифтов
 */
const fs   = require('fs');
const PATH = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));

// id → { label, codeName }
const RENAME = {
  // ══ AUDI (.5 для поздних, Phase II для ранних) ════════════════════════════
  'audi-a3-8l-fl':   { label:'A3 8L Phase II',     codeName:'8L II'  },
  'audi-a3-8p-fl':   { label:'A3 8P Phase II',     codeName:'8P II'  },
  'audi-a3-8v-fl':   { label:'A3 8V Phase II',     codeName:'8V II'  },
  'audi-a4b8-fl':    { label:'A4 B8.5',            codeName:'B8.5'   },
  'audi-a4b9-fl':    { label:'A4 B9.5',            codeName:'B9.5'   },
  'audi-a5-8t-fl':   { label:'A5 8T Phase II',     codeName:'8T II'  },
  'audi-a5-f5b':     { label:'A5 F5B LCI',         codeName:'F5B'    }, // уже был в графе
  'audi-a6-c5-fl':   { label:'A6 C5 Phase II',     codeName:'C5 II'  },
  'audi-a6-c6-fl':   { label:'A6 C6 Phase II',     codeName:'C6 II'  },
  'audi-a6-c7-fl':   { label:'A6 C7.5',            codeName:'C7.5'   },
  'audi-a6-c8-fl':   { label:'A6 C8 Phase II',     codeName:'C8 II'  },
  'audi-a8-d2-fl':   { label:'A8 D2 Phase II',     codeName:'D2 II'  },
  'audi-a8-d3-fl':   { label:'A8 D3 Phase II',     codeName:'D3 II'  },
  'audi-a8-d4-fl':   { label:'A8 D4.5',            codeName:'D4.5'   },
  'audi-q3-8u-fl':   { label:'Q3 8U Phase II',     codeName:'8U II'  },
  'audi-q5-8r-fl':   { label:'Q5 8R Phase II',     codeName:'8R II'  },
  'audi-q7-j4-fl':   { label:'Q7 J4 Phase II',     codeName:'J4 II'  },
  'audi-tt-8n-fl':   { label:'TT 8N Phase II',     codeName:'8N II'  },
  'audi-tt-8j-fl':   { label:'TT 8J Phase II',     codeName:'8J II'  },
  'audi-r8-42-fl':   { label:'R8 Typ 42.1',        codeName:'42.1'   },

  // ══ BMW (LCI для F/G, Phase II для E-серии) ═══════════════════════════════
  'bmw-e30-fl':      { label:'3 Series E30 Phase II',  codeName:'E30 II'  },
  'bmw-e36-fl':      { label:'3 Series E36 Phase II',  codeName:'E36 II'  },
  'bmw-e46-fl':      { label:'3 Series E46 LCI',       codeName:'E46 LCI' },
  'bmw-e90-fl':      { label:'3 Series E90 LCI',       codeName:'E90 LCI' },
  'bmw-f30-fl':      { label:'3 Series F30 LCI',       codeName:'F30 LCI' },
  'bmw-g20-fl':      { label:'3 Series G20 LCI',       codeName:'G20 LCI' },
  'bmw-5-e34-fl':    { label:'5 Series E34 Phase II',  codeName:'E34 II'  },
  'bmw-5-e39-fl':    { label:'5 Series E39 Phase II',  codeName:'E39 II'  },
  'bmw-5-e60-fl':    { label:'5 Series E60 LCI',       codeName:'E60 LCI' },
  'bmw-5-f10-fl':    { label:'5 Series F10 LCI',       codeName:'F10 LCI' },
  'bmw-5-g30-fl':    { label:'5 Series G30 LCI',       codeName:'G30 LCI' },
  'bmw-7-e38-fl':    { label:'7 Series E38 Phase II',  codeName:'E38 II'  },
  'bmw-7-e65-fl':    { label:'7 Series E65 Phase II',  codeName:'E65 II'  },
  'bmw-7-f01-fl':    { label:'7 Series F01 LCI',       codeName:'F01 LCI' },
  'bmw-7-g11-fl':    { label:'7 Series G11 LCI',       codeName:'G11 LCI' },
  'bmw-x5-e53-fl':   { label:'X5 E53 Phase II',        codeName:'E53 II'  },
  'bmw-x5-e70-fl':   { label:'X5 E70 LCI',             codeName:'E70 LCI' },
  'bmw-x5-f15-fl':   { label:'X5 F15 LCI',             codeName:'F15 LCI' },
  'bmw-x3-e83-fl':   { label:'X3 E83 Phase II',        codeName:'E83 II'  },
  'bmw-x3-f25-fl':   { label:'X3 F25 LCI',             codeName:'F25 LCI' },
  'bmw-x3-g01-fl':   { label:'X3 G01 LCI',             codeName:'G01 LCI' },
  'bmw-4-f32-fl':    { label:'4 Series F32 LCI',       codeName:'F32 LCI' },
  'bmw-1-e87-fl':    { label:'1 Series E87 LCI',       codeName:'E87 LCI' },
  'bmw-1-f20-fl':    { label:'1 Series F20 LCI',       codeName:'F20 LCI' },
  'bmw-6-e63-fl':    { label:'6 Series E63 LCI',       codeName:'E63 LCI' },
  'bmw-z4-e85-fl':   { label:'Z4 E85 Phase II',        codeName:'E85 II'  },
  'bmw-8-e31-fl':    { label:'8 Series E31 Phase II',  codeName:'E31 II'  },

  // ══ MERCEDES (Modellpflege / Phase II) ════════════════════════════════════
  'merc-w210-fl':    { label:'E-Class W210 Phase II',  codeName:'W210 II' },
  'merc-w211-fl':    { label:'E-Class W211 Phase II',  codeName:'W211 II' },
  'merc-w212-fl':    { label:'E-Class W212 Phase II',  codeName:'W212 II' },
  'merc-w213-fl':    { label:'E-Class W213 Phase II',  codeName:'W213 II' },
  'merc-c-w202-fl':  { label:'C-Class W202 Phase II',  codeName:'W202 II' },
  'merc-c-w203-fl':  { label:'C-Class W203 Phase II',  codeName:'W203 II' },
  'merc-c-w204-fl':  { label:'C-Class W204 Phase II',  codeName:'W204 II' },
  'merc-c-w205-fl':  { label:'C-Class W205 Phase II',  codeName:'W205 II' },
  'merc-s-w116-fl':  { label:'S-Class W116 Phase II',  codeName:'W116 II' },
  'merc-s-w126-fl':  { label:'S-Class W126 Phase II',  codeName:'W126 II' },
  'merc-s-w140-fl':  { label:'S-Class W140 Phase II',  codeName:'W140 II' },
  'merc-s-w220-fl':  { label:'S-Class W220 Phase II',  codeName:'W220 II' },
  'merc-s-w221-fl':  { label:'S-Class W221 Phase II',  codeName:'W221 II' },
  'merc-s-w222-fl':  { label:'S-Class W222 Phase II',  codeName:'W222 II' },
  'merc-sl-r107-fl': { label:'SL R107 Phase II',       codeName:'R107 II' },
  'merc-sl-r129-fl': { label:'SL R129 Phase II',       codeName:'R129 II' },
  'merc-sl-r230-fl': { label:'SL R230 Phase II',       codeName:'R230 II' },
  'merc-ml-w163-fl': { label:'ML W163 Phase II',       codeName:'W163 II' },
  'merc-ml-w164-fl': { label:'ML W164 Phase II',       codeName:'W164 II' },
  'merc-a-w168-fl':  { label:'A-Class W168 Phase II',  codeName:'W168 II' },
  'merc-a-w169-fl':  { label:'A-Class W169 Phase II',  codeName:'W169 II' },
  'merc-a-w176-fl':  { label:'A-Class W176 Phase II',  codeName:'W176 II' },

  // ══ PORSCHE (.2 для 911, Phase II для остальных) ══════════════════════════
  'p911-996-fl':          { label:'911 996.2',              codeName:'996.2'   },
  'p911-997-fl':          { label:'911 997.2',              codeName:'997.2'   },
  'p911-991-fl':          { label:'911 991.2',              codeName:'991.2'   },
  'p911-992-fl':          { label:'911 992.2',              codeName:'992.2'   },
  'porsche-box-986-fl':   { label:'Boxster 986.2',          codeName:'986.2'   },
  'porsche-box-987-fl':   { label:'Boxster 987.2',          codeName:'987.2'   },
  'porsche-cay-987-fl':   { label:'Cayman 987.2',           codeName:'987.2'   },
  'porsche-cay9-9pa-fl':  { label:'Cayenne 9PA Phase II',   codeName:'9PA II'  },
  'porsche-cay9-92a-fl':  { label:'Cayenne 92A Phase II',   codeName:'92A II'  },
  'porsche-pan-970-fl':   { label:'Panamera 970 Phase II',  codeName:'970 II'  },

  // ══ LAMBORGHINI ══════════════════════════════════════════════════════════
  // (уже имеют конкретные имена: Diablo VT, LP640, LP560 и т.д.)

  // ══ FERRARI (уже имеют конкретные имена) ══════════════════════════════════

  // ══ MASERATI ══════════════════════════════════════════════════════════════
  'maserati-qp5-fl':    { label:'Quattroporte V Phase II', codeName:'QP5 II' },
  'maserati-gran-fl':   { label:'GranTurismo Mk1 Phase II',codeName:'MC II'  },
  'maserati-qp6-fl':    { label:'Quattroporte VI Phase II',codeName:'QP6 II' },
  'maserati-ghibli3-fl':{ label:'Ghibli III Phase II',     codeName:'M157 II'},
  'maserati-levante-fl':{ label:'Levante Phase II',        codeName:'M161 II'},

  // ══ TOYOTA (Series / конкретные коды платформ) ═══════════════════════════
  'toyota-supra-a60-fl': { label:'Supra A60 Series II',    codeName:'MA61'    },
  'toyota-supra-a70-fl': { label:'Supra A70 Series II',    codeName:'JZA70'   },
  'toyota-supra-a80-fl': { label:'Supra A80 Series II',    codeName:'JZA80 II'},
  'toyota-ae86-fl':      { label:'AE86 Series II',         codeName:'AE86 II' },
  'toyota-gt86-zn6-fl':  { label:'GT86 ZN6 Phase II',      codeName:'ZN6 II'  },
  'toyota-mr2-aw11-fl':  { label:'MR2 AW11 Series II',     codeName:'AW11 II' },
  'toyota-mr2-sw20-fl':  { label:'MR2 SW20 Series III',    codeName:'SW20 III'},
  'toyota-corolla-e80-fl':{ label:'Corolla E80 Series II', codeName:'E80 II'  },
  'toyota-corolla-e90-fl':{ label:'Corolla E90 Series II', codeName:'E90 II'  },
  'toyota-corolla-e100-fl':{ label:'Corolla E100 Series II',codeName:'E100 II'},
  'toyota-corolla-e120-fl':{ label:'Corolla E130',         codeName:'E130'    },
  'toyota-corolla-e160-fl':{ label:'Corolla E160 Phase II',codeName:'E160 II' },
  'toyota-camry-v20-fl': { label:'Camry V20 Series II',    codeName:'V20 II'  },
  'toyota-camry-v40-fl': { label:'Camry V40 Series II',    codeName:'V40 II'  },
  'toyota-camry-v50-fl': { label:'Camry V50 Series II',    codeName:'V50 II'  },
  'toyota-camry-v60-fl': { label:'Camry V60 Series II',    codeName:'V60 II'  },
  'toyota-camry-v70-fl': { label:'Camry V70 Series II',    codeName:'V70 II'  },
  'toyota-camry-v80-fl': { label:'Camry V80 Phase II',     codeName:'V80 II'  },
  'toyota-rav4-1-fl':    { label:'RAV4 XA10 Series II',    codeName:'XA10 II' },
  'toyota-rav4-2-fl':    { label:'RAV4 XA20 Series II',    codeName:'XA20 II' },
  'toyota-rav4-3-fl':    { label:'RAV4 XA30 Series II',    codeName:'XA30 II' },
  'toyota-rav4-4-fl':    { label:'RAV4 XA40 Series II',    codeName:'XA40 II' },
  'toyota-rav4-5-fl':    { label:'RAV4 XA50 Phase II',     codeName:'XA50 II' },
  'toyota-lc-60-fl':     { label:'Land Cruiser FJ62',      codeName:'FJ62'    },
  'toyota-lc-80-fl':     { label:'Land Cruiser FZJ80',     codeName:'FZJ80'   },
  'toyota-lc-100-fl':    { label:'Land Cruiser UZJ100',    codeName:'UZJ100 II'},
  'toyota-lc-200-fl':    { label:'Land Cruiser 200 Phase II',codeName:'URJ200 II'},
  'toyota-prius-1-fl':   { label:'Prius NHW11 Phase II',   codeName:'NHW11 II'},
  'toyota-prius-2-fl':   { label:'Prius NHW20 Phase II',   codeName:'NHW20 II'},
  'toyota-prius-3-fl':   { label:'Prius ZVW30 Phase II',   codeName:'ZVW30 II'},
  'toyota-prius-4-fl':   { label:'Prius ZVW55',            codeName:'ZVW55'   },
  'lexus-ls-ucf10-fl':   { label:'Lexus LS 400 UCF11',     codeName:'UCF11'   },
  'lexus-ls-ucf20-fl':   { label:'Lexus LS 400 UCF21',     codeName:'UCF21'   },
  'lexus-ls-ucf30-fl':   { label:'Lexus LS 430 Phase II',  codeName:'UCF30 II'},
  'lexus-ls-ucf40-fl':   { label:'Lexus LS 460 Phase II',  codeName:'UCF40 II'},
  'lexus-ls-xf50-fl':    { label:'Lexus LS 500 Phase II',  codeName:'XF50 II' },

  // ══ HONDA ══════════════════════════════════════════════════════════════════
  'honda-nsx-na1-fl':    { label:'NSX NA2',                codeName:'NA2'     },
  'honda-civic-eg-fl':   { label:'Civic EG Series II',     codeName:'EG II'   },
  'honda-civic-ek-fl':   { label:'Civic EK Phase II',      codeName:'EK II'   },
  'honda-civic-ep3-fl':  { label:'Civic EP3 Phase II',     codeName:'EP3 II'  },
  'honda-civic-fd-fl':   { label:'Civic FD Phase II',      codeName:'FD2'     },
  'honda-civic-fb-fl':   { label:'Civic FB Phase II',      codeName:'FB II'   },
  'honda-civic-fc-fl':   { label:'Civic FC Phase II',      codeName:'FC II'   },
  'honda-civic-fk8-fl':  { label:'Civic Type R FK8 Phase II',codeName:'FK8 II'},
  'honda-nsx-nc1-fl':    { label:'NSX NC1 Phase II',       codeName:'NC1 II'  },
  'honda-accord-cb-fl':  { label:'Accord CB Phase II',     codeName:'CB7 II'  },
  'honda-accord-cd-fl':  { label:'Accord CD Phase II',     codeName:'CD7 II'  },
  'honda-accord-cg-fl':  { label:'Accord CG Phase II',     codeName:'CG5 II'  },
  'honda-accord-cl-fl':  { label:'Accord CL Phase II',     codeName:'CL9'     },
  'honda-accord-cp-fl':  { label:'Accord CP Phase II',     codeName:'CP2 II'  },
  'honda-accord-cr-fl':  { label:'Accord CR Phase II',     codeName:'CR6 II'  },
  'honda-accord-cv-fl':  { label:'Accord CV Phase II',     codeName:'CV3 II'  },
  'honda-crv-rd1-fl':    { label:'CR-V RD1 Phase II',      codeName:'RD1 II'  },
  'honda-crv-rd4-fl':    { label:'CR-V RD5',               codeName:'RD5'     },
  'honda-crv-re4-fl':    { label:'CR-V RE4 Phase II',      codeName:'RE4 II'  },
  'honda-crv-rm1-fl':    { label:'CR-V RM4',               codeName:'RM4'     },
  'honda-crv-rw1-fl':    { label:'CR-V RW2',               codeName:'RW2'     },
  'honda-integra-dc2-fl':{ label:'Integra DC2 Series II',  codeName:'DC2 II'  },
  'honda-integra-dc5-fl':{ label:'Integra DC5 Phase II',   codeName:'DC5 II'  },

  // ══ NISSAN ══════════════════════════════════════════════════════════════════
  'nissan-skyline-r32-fl':{ label:'Skyline GT-R R32 Series II',codeName:'BNR32 II'},
  'nissan-skyline-r33-fl':{ label:'Skyline GT-R R33 Series II',codeName:'BCNR33 II'},
  'nissan-skyline-r34-fl':{ label:'Skyline GT-R R34 Series II',codeName:'BNR34 II'},
  'nissan-gtr-r35-fl':    { label:'GT-R R35 2017',           codeName:'R35 2017'},
  'nissan-z-z31-fl':      { label:'300ZX Z31 Series II',     codeName:'GZ31 II' },
  'nissan-z-z32-fl':      { label:'300ZX Z32 Series II',     codeName:'Z32 II'  },
  'nissan-z-z33-fl':      { label:'350Z Z33 Phase II',       codeName:'Z33 II'  },
  'nissan-z-z34-fl':      { label:'370Z Z34 Phase II',       codeName:'Z34 II'  },
  'nissan-silvia-s13-fl': { label:'Silvia S13 Series II',    codeName:'PS13'    },
  'nissan-silvia-s14-fl': { label:'Silvia S14 Kouki',        codeName:'S14 Kouki'},
  'nissan-patrol-y60-fl': { label:'Patrol Y60 Phase II',     codeName:'Y60 II'  },
  'nissan-patrol-y61-fl': { label:'Patrol Y61 Phase II',     codeName:'Y61 II'  },
  'nissan-patrol-y62-fl': { label:'Patrol Y62 Phase II',     codeName:'Y62 II'  },
  'nissan-leaf-1-fl':     { label:'Leaf ZE0 Phase II',       codeName:'ZE0 II'  },

  // ══ MAZDA ══════════════════════════════════════════════════════════════════
  'mazda-rx7-sa-fl':  { label:'RX-7 SA22C Series II',   codeName:'SA22C II'},
  'mazda-rx7-fc-fl':  { label:'RX-7 FC Series III',     codeName:'FC3S III'},
  'mazda-rx7-fd-fl':  { label:'RX-7 FD Series VI',      codeName:'FD3S VI' },
  'mazda-rx8-fl':     { label:'RX-8 Spirit R',          codeName:'SE3P SR' },
  'mazda-mx5-na-fl':  { label:'MX-5 NA Phase II',       codeName:'NA6C II' },
  'mazda-mx5-nb-fl':  { label:'MX-5 NB Phase II',       codeName:'NB8C II' },
  'mazda-mx5-nc-fl':  { label:'MX-5 NC Phase II',       codeName:'NC2'     },
  'mazda-mx5-nd-fl':  { label:'MX-5 ND Phase II',       codeName:'ND2'     },
  'mazda-3-bk-fl':    { label:'Mazda 3 BK Phase II',    codeName:'BK II'   },
  'mazda-3-bl-fl':    { label:'Mazda 3 BL Phase II',    codeName:'BL II'   },
  'mazda-3-bm-fl':    { label:'Mazda 3 BM Phase II',    codeName:'BM II'   },
  'mazda-6-gg-fl':    { label:'Mazda 6 GG Phase II',    codeName:'GG II'   },
  'mazda-6-gh-fl':    { label:'Mazda 6 GH Phase II',    codeName:'GH II'   },
  'mazda-6-gj-fl':    { label:'Mazda 6 GJ Phase II',    codeName:'GJ II'   },
  'mazda-cx5-ke-fl':  { label:'CX-5 KE Phase II',       codeName:'KE2'     },
  'mazda-cx5-kf-fl':  { label:'CX-5 KF Phase II',       codeName:'KF2'     },

  // ══ SUBARU ══════════════════════════════════════════════════════════════════
  'subaru-impreza-gc-fl':  { label:'Impreza WRX GC Series II', codeName:'GC8 II'  },
  'subaru-impreza-gd-fl':  { label:'Impreza WRX GD Series II', codeName:'GDB II'  },
  'subaru-impreza-ge-fl':  { label:'Impreza WRX GE Phase II',  codeName:'GE II'   },
  'subaru-impreza-gj-fl':  { label:'Impreza GJ Phase II',      codeName:'GJ II'   },
  'subaru-wrx-va-fl':      { label:'WRX VA Phase II',          codeName:'VA II'   },
  'subaru-legacy-bc-fl':   { label:'Legacy BC Phase II',       codeName:'BC5 II'  },
  'subaru-legacy-bd-fl':   { label:'Legacy BD Phase II',       codeName:'BDS II'  },
  'subaru-legacy-be-fl':   { label:'Legacy BE Phase II',       codeName:'BEE II'  },
  'subaru-legacy-bl-fl':   { label:'Legacy BL Phase II',       codeName:'BL5 II'  },
  'subaru-legacy-br-fl':   { label:'Legacy BR Phase II',       codeName:'BRM II'  },
  'subaru-legacy-bn-fl':   { label:'Legacy BN Phase II',       codeName:'BN9 II'  },
  'subaru-forester-sf-fl': { label:'Forester SF Phase II',     codeName:'SF5 II'  },
  'subaru-forester-sg-fl': { label:'Forester SG Phase II',     codeName:'SG5 II'  },
  'subaru-forester-sh-fl': { label:'Forester SH Phase II',     codeName:'SH5 II'  },
  'subaru-forester-sj-fl': { label:'Forester SJ Phase II',     codeName:'SJ5 II'  },
  'subaru-forester-sk-fl': { label:'Forester SK Phase II',     codeName:'SK3 II'  },
  'subaru-brz-zc6-fl':     { label:'BRZ ZC6 Phase II',         codeName:'ZC6 II'  },
  'subaru-brz-zd8-fl':     { label:'BRZ ZD8 Phase II',         codeName:'ZD8 II'  },
};

// ─── APPLY ───────────────────────────────────────────────────────────────────
let updated = 0, notFound = 0;
data.nodes.forEach(node => {
  const r = RENAME[node.id];
  if (!r) return;
  node.label    = r.label;
  node.codeName = r.codeName;
  updated++;
});
// Count how many IDs from RENAME weren't found
Object.keys(RENAME).forEach(id => {
  if (!data.nodes.find(n => n.id === id)) notFound++;
});

fs.writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Переименовано: ${updated} узлов`);
if (notFound > 0) console.log(`⚠  Не найдено в графе: ${notFound} ID`);

// Показать примеры
const examples = ['audi-a4b8-fl','bmw-f30-fl','p911-997-fl','nissan-silvia-s14-fl','mazda-mx5-nd-fl','subaru-wrx-sti-gc'];
console.log('\nПримеры:');
examples.forEach(id => {
  const n = data.nodes.find(n=>n.id===id);
  if (n) console.log(' ',n.id,'→',n.label,'|',n.codeName);
});
