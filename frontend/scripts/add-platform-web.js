/**
 * add-platform-web.js — кросс-брендовые shares_platform связи.
 * VW Group (MQB / MLB / MLB Evo / MSB / MEB / PPE) + альянс Ford↔VW + Ford↔Mazda.
 * shares_platform скрыт в Древе (даёт паутину) — это срез «общие платформы».
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const EID = new Set(g.nodes.map(n => n.id))
const EEI = new Set(g.edges.map(e => e.id))
const log = []
const findId = (brand, re) => { const n = g.nodes.find(x => x.brandId === brand && re.test(x.label)); return n ? n.id : null }
let n = 0
const P = (id, s, t, str = 0.7) => {
  if (!s || !t) { log.push('✗ '+id+' — id null'); return }
  if (EEI.has(id)) return
  if (!EID.has(s) || !EID.has(t)) { log.push('✗ '+id+' нет '+(!EID.has(s)?s:t)); return }
  // не дублируем уже существующую пару (в любом направлении/типе)
  if (g.edges.some(e => e.type==='shares_platform' && ((e.source===s&&e.target===t)||(e.source===t&&e.target===s)))) return
  g.edges.push({ id, source: s, target: t, type: 'shares_platform', strength: str }); EEI.add(id); n++
  log.push('  '+byId[s].label+' ('+byId[s].brandId+') ↔ '+byId[t].label+' ('+byId[t].brandId+')')
}

// уточняем id через label-поиск (могут отсутствовать)
const q6   = findId('audi', /q6 e-tron/i)
const r8s2 = findId('audi', /r8 typ 4s|r8 4s/i) || g.nodes.find(x=>x.brandId==='audi'&&/^r8/i.test(x.label)&&(x.year||0)>=2015)?.id
const enyaq= findId('skoda', /enyaq/i)

// ── MQB (поперечная компактная) ──────────────────────────────────────────────
P('sp-mqb-golf7-tt',  'vw-golf7',   'audi-tt-8s')
P('sp-mqb-tig-q3',    'vw-tiguan-2','audi-q3-f3')
P('sp-mqb-golf8-a3',  'vw-golf8',   'audi-a3-8y')

// ── MLB (продольная, 1-е пок. PL71) ──────────────────────────────────────────
P('sp-mlb1-tou-q7',   'vw-touareg-1','audi-q7-j4')
P('sp-mlb1-tou-cay',  'vw-touareg-1','porsche-cay9-9pa')

// ── MLB Evo (большие SUV, 2-е пок.) ──────────────────────────────────────────
P('sp-mlbe-q7-cay',   'audi-q7-4m',  'porsche-cay9-9ya')
P('sp-mlbe-q7-tou',   'audi-q7-4m',  'vw-touareg-3')
P('sp-mlbe-q7-bent',  'audi-q7-4m',  'bentley-bentayga')
P('sp-mlbe-q7-urus',  'audi-q7-4m',  'lambo-urus')
P('sp-mlbe-cay-bent', 'porsche-cay9-9ya','bentley-bentayga')
P('sp-mlbe-cay-urus', 'porsche-cay9-9ya','lambo-urus')
P('sp-mlbe-cay-tou',  'porsche-cay9-9ya','vw-touareg-3')
P('sp-mlbe-bent-urus','bentley-bentayga','lambo-urus')
P('sp-mlbe-tou-bent', 'vw-touareg-3','bentley-bentayga')
P('sp-mlbe-q8-cay',   'audi-q8-f8',  'porsche-cay9-9ya')

// ── MSB (Panamera ↔ Bentley Continental/Flying Spur) ─────────────────────────
P('sp-msb-pan970-gt2','porsche-pan-970','bentley-conti-gt2')
P('sp-msb-pan970-fs2','porsche-pan-970','bentley-flying-spur2')
P('sp-msb-pan971-gt3','porsche-pan-971','bentley-conti-gt3')
P('sp-msb-pan971-fs3','porsche-pan-971','bentley-flying-spur3')

// ── MEB (EV компакт) + альянс Ford↔VW ★ ──────────────────────────────────────
P('sp-meb-id3-q4',    'vw-id3', 'audi-q4-f4')
P('sp-meb-id4-q4',    'vw-id4', 'audi-q4-f4')
P('sp-meb-id4-fordx', 'vw-id4', 'ford-explorer-ev', 0.8)   // ★ Ford Explorer EV на VW MEB
P('sp-meb-id4-capri', 'vw-id4', 'ford-capri-ev',    0.8)   // ★ Ford Capri EV на VW MEB
if (enyaq) P('sp-meb-id3-enyaq', 'vw-id3', enyaq)

// ── PPE (EV, ~2024) ──────────────────────────────────────────────────────────
if (q6) P('sp-ppe-macan-q6', 'porsche-mac-j1', q6)

// ── Ford ↔ VW: Ranger / Amarok ★ ─────────────────────────────────────────────
P('sp-ford-ranger-amarok', 'ford-ranger-t6', 'vw-amarok-2', 0.85)  // ★ Amarok II на Ford Ranger T6

// ── Ford ↔ Mazda (историческая платформа C1) ─────────────────────────────────
P('sp-ford-focus-mazda3', 'ford-focus-2', 'mazda-3-bk', 0.75)      // Focus Mk2 / Mazda 3 — платформа C1

// ── Lamborghini ↔ Audi (V10) ─────────────────────────────────────────────────
if (r8s2) P('sp-huracan-r8', 'lambo-huracan', r8s2)

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Платформенная сеть: +' + n + ' shares_platform ===')
log.forEach(l => console.log(' ', l))
console.log('Всего shares_platform:', g.edges.filter(e=>e.type==='shares_platform').length, '| рёбер:', g.edges.length)
