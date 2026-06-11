/**
 * add-powertrain-data.js
 * Adds approximate peak hp and engineType to every graph.json node.
 * engineType: "ev" | "hybrid" | "v12" | "v10" | "v8" | "flat6" | "i6" | "v6" | "i4" | "diesel" | "other"
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/public/data/evolution/graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf8'));

// ── Exact ID overrides (hp, engineType) ─────────────────────────────────────
const EXACT = {
  // ── Porsche 356
  'porsche-356-prea': [60, 'flat4'], 'porsche-356-a': [70, 'flat4'],
  'porsche-356-b': [90, 'flat4'],    'porsche-356-c': [95, 'flat4'],
  // ── Porsche 911 core chain
  'p911-901': [130, 'flat6'],  'p911-g': [210, 'flat6'],   'p911-964': [250, 'flat6'],
  'p911-993': [272, 'flat6'],  'p911-996': [300, 'flat6'], 'p911-997': [325, 'flat6'],
  'p911-991': [350, 'flat6'],  'p911-992': [385, 'flat6'],
  // ── Porsche 911 Turbo
  'p911-turbo-930': [260, 'flat6t'], 'p911-turbo-964t': [360, 'flat6t'],
  'p911-turbo-993t': [408, 'flat6t'], 'p911-turbo-996t': [420, 'flat6t'],
  'p911-turbo-992t': [640, 'flat6t'],
  // ── Porsche 911 GT3
  'p911-gt3-996': [381, 'flat6'], 'p911-gt3-997': [415, 'flat6'],
  'p911-gt3-991': [475, 'flat6'], 'p911-gt3-992': [510, 'flat6'],
  // ── Porsche Boxster/Cayman
  'porsche-box-986': [204, 'flat6'], 'porsche-box-987': [255, 'flat6'],
  'porsche-box-981': [265, 'flat6'], 'porsche-box-718': [300, 'flat4t'],
  'porsche-cay-987': [295, 'flat6'], 'porsche-cay-981': [325, 'flat6'],
  'porsche-cay-718': [300, 'flat4t'],
  // ── Porsche Cayenne
  'porsche-cay9-9pa': [340, 'v8'],  'porsche-cay9-92a': [400, 'v6t'],
  'porsche-cay9-9ya': [462, 'v6t'],
  // ── Porsche Panamera
  'porsche-pan-970': [400, 'v8'],   'porsche-pan-971': [460, 'v6t'],
  // ── Porsche Macan
  'porsche-mac-95b': [340, 'v6t'],  'porsche-mac-j1': [408, 'ev'],
  // ── Porsche Carrera GT / 918
  'porsche-cgt': [612, 'v10'],      'porsche-918': [887, 'hybrid'],
  // ── Porsche Taycan
  'porsche-taycan': [761, 'ev'],
  // ── Porsche concepts
  'p-concept-989': [240, 'v8'],

  // ── Ferrari mid-engine V8/V6 chain
  'ferrari-dino246': [195, 'v6'],   'ferrari-308': [255, 'v8'],
  'ferrari-328': [270, 'v8'],       'ferrari-348': [300, 'v8'],
  'ferrari-f355': [375, 'v8'],      'ferrari-360': [400, 'v8'],
  'ferrari-f430': [490, 'v8'],      'ferrari-458': [570, 'v8'],
  'ferrari-488': [660, 'v8t'],      'ferrari-f8': [720, 'v8t'],
  'ferrari-296': [654, 'v6h'],      // V6 hybrid
  // ── Ferrari V12 GT chain
  'ferrari-250gt': [300, 'v12'],    'ferrari-daytona-365': [352, 'v12'],
  'ferrari-testarossa': [390, 'flat12'], 'ferrari-512tr': [428, 'flat12'],
  'ferrari-550': [485, 'v12'],      'ferrari-599': [620, 'v12'],
  'ferrari-f12': [730, 'v12'],      'ferrari-812sf': [800, 'v12'],
  'ferrari-12cil': [830, 'v12'],
  // ── Ferrari GT/Open
  'ferrari-california-node': [460, 'v8t'], 'ferrari-portofino-node': [600, 'v8t'],
  'ferrari-roma-node': [620, 'v8t'], 'ferrari-ff-node': [660, 'v12'],
  'ferrari-gtc4l-node': [690, 'v12'],
  // ── Ferrari Hypercars
  'ferrari-288gto': [400, 'v8t'],   'ferrari-f40': [478, 'v8t'],
  'ferrari-f50': [520, 'v12'],      'ferrari-enzo': [660, 'v12'],
  'ferrari-lafer': [963, 'hybrid'], 'ferrari-sf90': [1000, 'hybrid'],
  'ferrari-f80': [1200, 'hybrid'],
  // ── Ferrari Purosangue
  'ferrari-puros': [725, 'v12'],
  // ── Ferrari Mondial / 512
  'ferrari-mondial': [240, 'v8'],

  // ── Lamborghini V12 chain
  'lambo-350gt': [270, 'v12'],      'lamborghini-miura': [350, 'v12'],
  'lamborghini-cnt': [455, 'v12'],  'lamborghini-diablo': [530, 'v12'],
  'lamborghini-murci': [631, 'v12'],'lamborghini-aven': [700, 'v12'],
  'lamborghini-revo': [1015, 'hybrid'],  // V12 PHEV
  'lambo-cnt-lpi': [814, 'hybrid'],
  // ── Lamborghini V10/V8 chain
  'lambo-gallardo': [520, 'v10'],   'lambo-huracan': [640, 'v10'],
  'lambo-temerario': [920, 'hybrid'], // V8 hybrid
  // ── Lamborghini others
  'lambo-espada': [325, 'v12'],     'lambo-jarama': [365, 'v12'],
  'lambo-lm002': [450, 'v12'],      'lambo-urus': [666, 'v8t'],
  'lambo-sesto': [570, 'v10'],      'lambo-veneno': [750, 'v12'],
  'lambo-centenario': [770, 'v12'],

  // ── BMW 3 Series / M3 chain
  'bmw-e21': [90, 'i4'],    'bmw-e30': [105, 'i4'],   'bmw-e36': [140, 'i6'],
  'bmw-e46': [150, 'i6'],   'bmw-e90': [170, 'i6'],   'bmw-f30': [184, 'i4t'],
  'bmw-g20': [184, 'i4t'],  'bmw-a4b10': [150, 'i4t'],
  'bmw-m3-e30': [200, 'i4'], 'bmw-m3-e36': [286, 'i6'], 'bmw-m3-e46': [343, 'i6'],
  'bmw-m3-e92': [420, 'v8'], 'bmw-m3-g80': [510, 'i6t'],
  // ── BMW 4 / M4
  'bmw-4-f32': [184, 'i4t'], 'bmw-4-g22': [184, 'i4t'],
  'bmw-m4-f82': [431, 'i6t'], 'bmw-m4-g82': [510, 'i6t'],
  // ── BMW M2
  'bmw-m2-f87': [370, 'i6t'], 'bmw-m2-g87': [460, 'i6t'],
  // ── BMW 5 / M5
  'bmw-5-e12': [115, 'i4'],  'bmw-5-e28': [150, 'i6'],  'bmw-5-e34': [170, 'i6'],
  'bmw-5-e39': [193, 'i6'],  'bmw-5-e60': [245, 'i6'],  'bmw-5-f10': [245, 'i6t'],
  'bmw-5-g30': [252, 'i6t'],
  'bmw-m5-e28': [286, 'i6'],  'bmw-m5-e34': [340, 'i6'], 'bmw-m5-e39': [400, 'v8'],
  'bmw-m5-e60': [507, 'v10'], 'bmw-m5-f10': [560, 'v8t'],'bmw-m5-g30': [625, 'v8t'],
  // ── BMW 6 / M6 / 8 / M8
  'bmw-6-e24': [218, 'i6'],   'bmw-m6-e24': [286, 'i6'],
  'bmw-6-e63': [258, 'v8'],   'bmw-m6-e63': [507, 'v10'],
  'bmw-6-f13': [320, 'i6t'],  'bmw-m6-f13': [560, 'v8t'],
  'bmw-6-g32': [252, 'i6t'],
  'bmw-8-e31': [299, 'v12'],  'bmw-8-g15': [335, 'i6t'],  'bmw-m8-g15': [625, 'v8t'],
  // ── BMW 7 Series
  'bmw-7-e23': [170, 'i6'],   'bmw-7-e32': [211, 'v8'],  'bmw-7-e38': [326, 'v12'],
  'bmw-7-e65': [333, 'v12'],  'bmw-7-f01': [326, 'v12'], 'bmw-7-g11': [333, 'v12'],
  'bmw-7-g70': [544, 'v8t'],
  // ── BMW Z Series
  'bmw-z3-e36': [189, 'i6'],  'bmw-z4-e85': [231, 'i6'], 'bmw-z4-e89': [306, 'i6t'],
  'bmw-z4-g29': [340, 'i4t'], 'bmw-z8-e52': [400, 'v8'],
  // ── BMW X Series
  'bmw-x5-e53': [231, 'v8'],  'bmw-x5-e70': [407, 'v8'],  'bmw-x5-f15': [450, 'v8t'],
  'bmw-x5-g05': [462, 'v6t'], 'bmw-x6-e71': [555, 'v8t'], 'bmw-x6-g06': [530, 'v8t'],
  'bmw-x3-e83': [218, 'v6'],  'bmw-x3-f25': [248, 'i6t'], 'bmw-x3-g01': [354, 'i4t'],
  'bmw-x4-f26': [313, 'i4t'], 'bmw-x4-g02': [354, 'i4t'], 'bmw-x7-g07': [530, 'v8t'],
  'bmw-x1-e84': [177, 'i4t'], 'bmw-x2-f39': [231, 'i4t'],
  // ── BMW i / Electric
  'bmw-i3-i01': [170, 'ev'],  'bmw-i4-g26': [544, 'ev'],  'bmw-i5-g60': [601, 'ev'],
  'bmw-i7-g70': [660, 'ev'],  'bmw-ix3-f25e': [286, 'ev'], 'bmw-ix-i20': [619, 'ev'],
  // ── BMW 1 / 2 Series / M1
  'bmw-m1-road': [277, 'i6'], 'bmw-2002': [130, 'i4'],
  'bmw-1-e87': [116, 'i4'],   'bmw-1-f20': [136, 'i4'],   'bmw-1-f40': [136, 'i4'],
  'bmw-2-f22': [184, 'i4t'],  'bmw-2-g42': [302, 'i4t'],
  'bmw-m1-concept': [277, 'i6'],

  // ── Mercedes E-Class chain
  'merc-w123': [136, 'i4'],   'merc-w124': [220, 'i6'],   'merc-w210': [163, 'i4'],
  'merc-w211': [224, 'v6'],   'merc-w212': [204, 'v6'],   'merc-w213': [286, 'i4t'],
  // ── Mercedes S-Class
  'merc-s-w116': [225, 'v8'], 'merc-s-w126': [300, 'v8'], 'merc-s-w140': [394, 'v12'],
  'merc-s-w220': [306, 'v12'],'merc-s-w221': [517, 'v12'],'merc-s-w222': [630, 'v12'],
  'merc-s-w223': [510, 'i6h'],
  // ── Mercedes C-Class
  'merc-c-w201': [122, 'i4'], 'merc-c-w202': [193, 'i4'], 'merc-c-w203': [204, 'v6'],
  'merc-c-w204': [204, 'v6'], 'merc-c-w205': [204, 'i4t'],'merc-c-w206': [204, 'i4t'],
  // ── Mercedes SL
  'merc-sl-w198': [215, 'i6'],  'merc-sl-r107': [231, 'v8'], 'merc-sl-r129': [231, 'i6'],
  'merc-sl-r230': [306, 'v8'],  'merc-sl-r231': [435, 'v8'], 'merc-sl-r232': [585, 'i6t'],
  // ── Mercedes G-Class
  'merc-g-w460': [88, 'i4'],   'merc-g-w463': [213, 'i4'],  'merc-g-w463b': [585, 'v8t'],
  // ── Mercedes GLE/ML
  'merc-ml-w163': [224, 'v6'], 'merc-ml-w164': [280, 'v6'], 'merc-ml-w166': [306, 'v6t'],
  'merc-gle-w167': [367, 'i6t'],
  // ── Mercedes AMG GT
  'merc-amg-gt-c190': [503, 'v8t'], 'merc-amg-gt2-r190': [585, 'v8t'],
  // ── Mercedes CLS
  'merc-cls-c219': [320, 'v8'], 'merc-cls-c257': [340, 'i6t'],
  // ── Mercedes AMG E
  'merc-amg-e55': [476, 'v8'],   'merc-amg-e63': [571, 'v8t'], 'merc-amg-e63s': [612, 'v8t'],
  // ── Mercedes EQ
  'merc-eq-eqc': [408, 'ev'],  'merc-eq-eqs': [761, 'ev'],  'merc-eq-eqe': [584, 'ev'],
  // ── Mercedes A-Class / SLK / CLK
  'merc-a-w168': [102, 'i4'],  'merc-a-w169': [116, 'i4'], 'merc-a-w176': [122, 'i4'],
  'merc-a-w177': [163, 'i4t'], 'merc-slk-r170': [197, 'i4'],
  'merc-slk-r171': [231, 'v6'],'merc-slk-r172': [306, 'v6t'],
  'merc-clk-w208': [136, 'i4'],'merc-clk-w209': [367, 'v8'],
  'merc-amg-c63-w204': [457, 'v8'], 'merc-amg-c63-w205': [510, 'v8t'],
  'merc-amg-c63-w206': [476, 'i4h'],

  // ── Audi 80 / A4 chain
  'audi-b1': [55, 'i4'],   'audi-b2': [75, 'i4'],    'audi-b3': [90, 'i4'],
  'audi-a4b5': [101, 'i4t'],'audi-a4b6': [115, 'i4t'],'audi-a4b8': [120, 'i4t'],
  'audi-a4b9': [150, 'i4t'],'audi-a4b10': [150, 'i4t'],
  'audi-quattro-ur': [200, 'i5t'],
  // ── Audi RS4
  'audi-rs4-b5': [380, 'v6t'], 'audi-rs4-b7': [420, 'v8'], 'audi-rs4-b9': [450, 'v6t'],
  // ── Audi S4
  'audi-s4-b5': [265, 'v6t'], 'audi-s4-b8': [333, 'v6s'], 'audi-s4-b9': [354, 'v6t'],
  // ── Audi A3 / RS3
  'audi-a3-8l': [125, 'i4'], 'audi-a3-8p': [140, 'i4t'], 'audi-a3-8v': [140, 'i4t'],
  'audi-a3-8y': [204, 'i4t'],
  'audi-rs3-8p': [340, 'i5t'], 'audi-rs3-8v': [367, 'i5t'], 'audi-rs3-8y': [400, 'i5t'],
  // ── Audi A5 / RS5
  'audi-a5-f5': [190, 'i4t'], 'audi-a5-f5b': [190, 'i4t'],
  // ── Audi A6 / RS6
  'audi-a6-c4': [140, 'i6'],  'audi-a6-c5': [193, 'i6'], 'audi-a6-c6': [220, 'v6t'],
  'audi-a6-c7': [204, 'v6t'], 'audi-a6-c8': [204, 'v6t'],
  'audi-rs6-c5': [450, 'v8t'], 'audi-rs6-c7': [560, 'v8t'], 'audi-rs6-c8': [630, 'v8h'],
  'audi-s6-c5': [340, 'v8'],   'audi-s6-c8': [444, 'v6h'],
  // ── Audi A7 / S7 / RS7
  'audi-a7-4g': [204, 'v6t'],  'audi-a7-4k': [204, 'i4t'],
  'audi-s7-4g': [420, 'v8t'],  'audi-s7-4k': [450, 'v6t'],
  'audi-rs7-4g': [560, 'v8t'], 'audi-rs7-4k': [630, 'v8t'],
  // ── Audi A8 / S8
  'audi-a8-d2': [300, 'v8'],   'audi-a8-d3': [360, 'v8'],
  'audi-a8-d4': [420, 'v8t'],  'audi-a8-d5': [460, 'v8h'],
  'audi-s8-d2': [360, 'v8'],   'audi-s8-d5': [571, 'v8t'],
  // ── Audi TT
  'audi-tt-8n': [180, 'i4t'],  'audi-tt-8j': [200, 'i4t'], 'audi-tt-8s': [230, 'i4t'],
  // ── Audi R8
  'audi-r8-typ42': [420, 'v8'], 'audi-r8-typ4s': [540, 'v10'],
  // ── Audi Q2 / Q3 / Q5 / Q7 / Q8
  'audi-q2-ga': [190, 'i4t'],   'audi-q3-8u': [177, 'i4t'], 'audi-q3-f3': [190, 'i4t'],
  'audi-rs-q3-f3': [400, 'i5t'],
  'audi-q5-8r': [270, 'v6t'],   'audi-q5-fy': [265, 'v6t'],
  'audi-q7-j4': [280, 'v8t'],   'audi-q8-f8': [340, 'v6t'],
  'audi-rs-q8-f8': [600, 'v8t'],
  // ── Audi Electric
  'audi-etron-ge': [408, 'ev'],  'audi-etron-gt': [598, 'ev'],
  'audi-q4-f4': [299, 'ev'],     'audi-q6-etron': [408, 'ev'],

  // ── VW
  'vw-golf1': [50, 'i4'],   'vw-golf2': [75, 'i4'],   'vw-golf3': [90, 'i4'],
  'vw-golf4': [115, 'i4t'], 'vw-golf5': [150, 'i4t'], 'vw-golf6': [160, 'i4t'],
  'vw-golf7': [140, 'i4t'], 'vw-golf8': [150, 'i4t'],
  'vw-beetle-t1': [30, 'flat4'], 'vw-new-beetle': [115, 'i4t'],
  'vw-passat-b1': [75, 'i4'],    'vw-passat-b3': [110, 'i4'],
  'vw-passat-b6': [200, 'v6t'],  'vw-passat-b8': [220, 'i4t'],
  'vw-id3': [204, 'ev'],         'vw-id4': [299, 'ev'],
  'audi-a3-8v': [140, 'i4t'],    'seat-leon3': [150, 'i4t'],
  'skoda-oct3': [150, 'i4t'],
  // ── SEAT / Škoda
  'seat-ibiza-mk1': [75, 'i4'],  'seat-ibiza-mk3': [100, 'i4t'],
  'seat-leon-mk1': [150, 'i4t'], 'seat-leon-mk2': [150, 'i4t'],
  'skoda-oct-a4': [101, 'i4'],   'skoda-oct-a5': [140, 'i4t'],
  'skoda-superb': [150, 'v6'],   'skoda-superb2': [200, 'v6t'],

  // ── Maserati
  'maserati-3500gt': [240, 'i6'],   'maserati-ghibli1': [330, 'v8'],
  'maserati-bora': [310, 'v8'],     'maserati-merak': [190, 'v6'],
  'maserati-qp1': [260, 'v8'],      'maserati-ghibli2': [306, 'v6t'],
  'maserati-3200gt': [370, 'v8t'],  'maserati-qp5': [394, 'v8'],
  'maserati-mc12': [630, 'v12'],    'maserati-granturismo1': [440, 'v8'],
  'maserati-grancabrio': [440, 'v8'],'maserati-ghibli3': [330, 'v6t'],
  'maserati-qp6': [530, 'v8t'],     'maserati-levante': [430, 'v6t'],
  'maserati-mc20': [630, 'v6t'],    'maserati-grecale': [300, 'v6t'],
  'maserati-granturismo2': [490, 'v6t'], 'maserati-alfieri': [520, 'hybrid'],
  'maserati-quattroporte-i': [260, 'v8'], 'maserati-quattroporte-v': [400, 'v8'],

  // ── Lotus
  'lotus-elan-s1': [105, 'i4'],     'lotus-elan-s3': [115, 'i4'],
  'lotus-europa-s1': [82, 'i4'],    'lotus-europa-s2': [105, 'i4'],
  'lotus-esprit-s1': [160, 'i4t'],  'lotus-esprit-turbo': [210, 'i4t'],
  'lotus-esprit-v8': [350, 'v8t'],  'lotus-elise-s1': [111, 'i4'],
  'lotus-elise-s2': [111, 'i4'],    'lotus-elise-s3': [136, 'i4t'],
  'lotus-exige-s1': [120, 'i4'],    'lotus-exige-s3': [355, 'v6t'],
  'lotus-evora': [280, 'v6t'],      'lotus-emira': [360, 'i4t'],
  'lotus-eletre': [905, 'ev'],
};

// ── Pattern-based fallback mapping ──────────────────────────────────────────
const PATTERNS = [
  // EV
  { test: id => /bmw-i[0-9]|bmw-ix|merc-eq-|audi-etron|audi-q4-|audi-q6-|vw-id|lotus-eletre/i.test(id), hp: 450, engineType: 'ev' },
  // Hybrid
  { test: id => /ferrari-(sf90|lafer|f80)|lambo-revo|lambo-cnt-lpi|porsche-918|maserati-(mc20|alfieri)|lambo-temerario|merc-s-w223/i.test(id), hp: 850, engineType: 'hybrid' },
  // V12
  { test: id => /ferrari-(812|12cil|daytona|testarossa|512|f12|f50|enzo|550|599|250)|lambo-(miura|cnt|diablo|murci|aven|revo|350|espada|jarama|lm002)|maserati-(3500|ghibli1|bora|mc12)/i.test(id), hp: 650, engineType: 'v12' },
  // V10
  { test: id => /lambo-(gallardo|huracan|sesto)|audi-r8-typ4|porsche-cgt/i.test(id), hp: 570, engineType: 'v10' },
  // V8 Turbo
  { test: id => /merc-amg|bmw-m5|bmw-m8|bmw-x5.*g|bmw-x6|ferrari-(488|f8)|audi-rs6|audi-s8|lambo-urus|audi-rs-q8/i.test(id), hp: 580, engineType: 'v8t' },
  // V8 NA
  { test: id => /bmw-m3-e92|bmw-7-e3|bmw-z8|merc-s-w1[234]|ferrari-(458|f430|360|f355|348|328|308)/i.test(id), hp: 420, engineType: 'v8' },
  // Flat-6 Turbo
  { test: id => /p911-turbo/i.test(id), hp: 450, engineType: 'flat6t' },
  // Flat-6 NA
  { test: id => /p911-|porsche-box|porsche-cay/i.test(id), hp: 300, engineType: 'flat6' },
  // I6 Turbo
  { test: id => /bmw-m3|bmw-m4|bmw-m2/i.test(id), hp: 460, engineType: 'i6t' },
  // I6 NA
  { test: id => /bmw-(e3[0-9]|e46|5-e|7-e2|z4)/i.test(id), hp: 200, engineType: 'i6' },
  // V6 Turbo
  { test: id => /audi-rs3|audi-rs4|maserati-mc20|maserati-ghibli3|ferrari-296/i.test(id), hp: 430, engineType: 'v6t' },
  // I4 Turbo
  { test: id => /audi-(a4b[89]|a3-8[vy]|q5-fy|q8-f8|tt-8|rs3)|bmw-(1-[fg]|2-[fg]|x1|x2)|merc-(a-w17|c-w2[056])|vw-golf[5-8]|seat-leon/i.test(id), hp: 160, engineType: 'i4t' },
  // I4 NA
  { test: id => /audi-b[123]|bmw-(e21|1-e)|vw-golf[123]|merc-c-w20[123]|seat-ibiza|skoda/i.test(id), hp: 85, engineType: 'i4' },
  // Concept
  { test: id => /concept|maserati-alfieri/i.test(id), hp: 500, engineType: 'hybrid' },
];

let updated = 0;
g.nodes.forEach(node => {
  if (EXACT[node.id]) {
    [node.hp, node.engineType] = EXACT[node.id];
    updated++;
    return;
  }
  for (const p of PATTERNS) {
    if (p.test(node.id)) {
      node.hp = p.hp;
      node.engineType = p.engineType;
      updated++;
      return;
    }
  }
  // Final fallback
  node.hp = 150;
  node.engineType = 'i4';
  updated++;
});

fs.writeFileSync(path, JSON.stringify(g, null, 2));

// Summary
const byEngine = {};
g.nodes.forEach(n => { byEngine[n.engineType] = (byEngine[n.engineType]||0)+1; });
console.log(`Updated: ${updated} / ${g.nodes.length} nodes`);
console.log('\nEngine distribution:');
Object.entries(byEngine).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k.padEnd(10)}${v}`));
const avgHp = Math.round(g.nodes.reduce((s,n)=>s+(n.hp||0),0)/g.nodes.length);
console.log(`\nAvg HP: ${avgHp} | Max: ${Math.max(...g.nodes.map(n=>n.hp||0))}`);
