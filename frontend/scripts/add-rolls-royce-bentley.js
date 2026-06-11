/**
 * add-rolls-royce-bentley.js
 *
 * Полные модельные линейки Rolls-Royce и Bentley в граф эволюции.
 * До этого у обоих брендов были только осиротевшие ноды от скрапера.
 *
 * Связи по конвенции (CLAUDE.md):
 *   evolves_into   — следующее поколение (та же колонка, +1 уровень)
 *   variant_of     — версия той же модели (Black Badge, Speed, EWB) — пятиугольник
 *   derived_from   — отдельная производная (Wraith←Ghost, GTC←GT, Flying Spur←GT)
 *   facelifted_to  — рестайлинг (Series II)
 *
 * Существующие скрапер-ноды интегрируются (Spectre Series II / Black Badge,
 * Project Nightingale, Bentley EXP 15), мусорное sync-ev ребро Spectre удаляется.
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const EID  = new Set(g.nodes.map(n => n.id))
const EEI  = new Set(g.edges.map(e => e.id))
const log  = []

const node = (brandId, brandName) => (id, label, year, code, body, zone, hp, eng) => ({
  id, label, type:'generation', year, brandId, brandName, codeName:code,
  modelSlug:`${brandId}-${id.replace(brandId+'-','')}`, bodyType:body,
  segment: zone.includes('suv')?'suv': zone==='flagship_sed'?'luxury':'premium',
  zone, hp, engineType:eng,
})
const A = nd => { if(!EID.has(nd.id)){ g.nodes.push(nd); EID.add(nd.id); byId[nd.id]=nd; log.push('+ node: '+nd.label+' ('+nd.year+')') } else log.push('· есть: '+nd.id) }
const E = (id,s,t,type,str=0.9) => {
  if(EEI.has(id)){ log.push('· ребро есть: '+id); return }
  if(!EID.has(s)||!EID.has(t)){ log.push('✗ пропуск '+id+' — нет '+(!EID.has(s)?s:t)); return }
  g.edges.push({id,source:s,target:t,type,strength:str}); EEI.add(id)
  log.push('+ edge: '+byId[s].label+' —'+type+'→ '+byId[t].label)
}
const patch = (id,p) => { if(byId[id]){ Object.assign(byId[id],p); log.push('~ patch '+id+': '+JSON.stringify(p)) } }
const delEdge = id => { const i=g.edges.findIndex(e=>e.id===id); if(i>=0){ log.push('− ребро '+id); g.edges.splice(i,1) } }

// ══════════════════════════════════════════════════════════════════════════════
// ROLLS-ROYCE
// ══════════════════════════════════════════════════════════════════════════════
const rr = node('rr','Rolls-Royce')

// — Исторические якоря —
A(rr('rr-silver-cloud','Silver Cloud',1955,'SC','sedan','flagship_sed',200,'v8'))
A(rr('rr-silver-shadow','Silver Shadow',1965,'SY','sedan','flagship_sed',220,'v8'))
A(rr('rr-silver-spirit','Silver Spirit',1980,'SZ','sedan','flagship_sed',220,'v8'))
A(rr('rr-silver-seraph','Silver Seraph',1998,'PLB','sedan','flagship_sed',326,'v12'))
E('rr-sc-ss','rr-silver-cloud','rr-silver-shadow','evolves_into')
E('rr-ss-spirit','rr-silver-shadow','rr-silver-spirit','evolves_into')
E('rr-spirit-seraph','rr-silver-spirit','rr-silver-seraph','evolves_into')

// — Phantom (флагман, эра BMW) —
A(rr('rr-phantom7','Phantom VII',2003,'RR01','sedan','flagship_sed',453,'v12'))
A(rr('rr-phantom7-fl','Phantom VII Series II',2012,'RR01.2','sedan','flagship_sed',453,'v12'))
A(rr('rr-phantom-dhc','Phantom Drophead Coupé',2007,'RR02','convertible','open_top',453,'v12'))
A(rr('rr-phantom-coupe','Phantom Coupé',2008,'RR03','coupe','gt_coupe',453,'v12'))
A(rr('rr-phantom8','Phantom VIII',2017,'RR11','sedan','flagship_sed',563,'v12t'))
A(rr('rr-phantom8-fl','Phantom VIII Series II',2022,'RR11.2','sedan','flagship_sed',563,'v12t'))
E('rr-seraph-p7','rr-silver-seraph','rr-phantom7','evolves_into')
E('rr-p7-fl','rr-phantom7','rr-phantom7-fl','facelifted_to')
E('rr-p7-dhc','rr-phantom7','rr-phantom-dhc','derived_from',0.8)
E('rr-p7-coupe','rr-phantom7','rr-phantom-coupe','derived_from',0.8)
E('rr-p7-p8','rr-phantom7','rr-phantom8','evolves_into')
E('rr-p8-fl','rr-phantom8','rr-phantom8-fl','facelifted_to')

// — Ghost + производные (Wraith, Dawn) —
A(rr('rr-ghost','Ghost',2009,'RR04','sedan','flagship_sed',563,'v12t'))
A(rr('rr-ghost-fl','Ghost Series II',2014,'RR04.2','sedan','flagship_sed',563,'v12t'))
A(rr('rr-ghost2','Ghost II',2020,'RR21','sedan','flagship_sed',563,'v12t'))
A(rr('rr-ghost-bb','Ghost Black Badge',2021,'RR21 BB','sedan','flagship_sed',591,'v12t'))
A(rr('rr-wraith','Wraith',2013,'RR05','coupe','gt_coupe',624,'v12t'))
A(rr('rr-wraith-bb','Wraith Black Badge',2016,'RR05 BB','coupe','gt_coupe',624,'v12t'))
A(rr('rr-dawn','Dawn',2015,'RR06','convertible','open_top',563,'v12t'))
A(rr('rr-dawn-bb','Dawn Black Badge',2017,'RR06 BB','convertible','open_top',593,'v12t'))
E('rr-ghost-fle','rr-ghost','rr-ghost-fl','facelifted_to')
E('rr-ghost-g2','rr-ghost','rr-ghost2','evolves_into')
E('rr-ghost2-bb','rr-ghost2','rr-ghost-bb','variant_of',0.9)
E('rr-ghost-wraith','rr-ghost','rr-wraith','derived_from',0.8)
E('rr-wraith-bbv','rr-wraith','rr-wraith-bb','variant_of',0.9)
E('rr-wraith-dawn','rr-wraith','rr-dawn','derived_from',0.8)
E('rr-dawn-bbv','rr-dawn','rr-dawn-bb','variant_of',0.9)

// — Cullinan (SUV) —
A(rr('rr-cullinan','Cullinan',2018,'RR31','suv','suv_large',563,'v12t'))
A(rr('rr-cullinan-bb','Cullinan Black Badge',2019,'RR31 BB','suv','suv_large',591,'v12t'))
A(rr('rr-cullinan-fl','Cullinan Series II',2024,'RR31.2','suv','suv_large',563,'v12t'))
E('rr-cull-bb','rr-cullinan','rr-cullinan-bb','variant_of',0.9)
E('rr-cull-fl','rr-cullinan','rr-cullinan-fl','facelifted_to')

// — Spectre (EV) + интеграция скрапер-нод —
A(rr('rr-spectre','Spectre',2023,'RR-EV','coupe','gt_coupe',577,'ev'))
E('rr-wraith-spectre','rr-wraith','rr-spectre','evolves_into')   // EV-преемник 2-дверки
const SPEC_II = 'ncs-rolls-royce-2027-rolls-royce-spectre-series-ii'
const SPEC_BB = 'ncs-rolls-royce-2027-rolls-royce-spectre-black-badge-series-'
patch(SPEC_II, { label:'Spectre Series II', zone:'gt_coupe', engineType:'ev', hp:577, bodyType:'coupe' })
patch(SPEC_BB, { label:'Spectre Black Badge II', zone:'gt_coupe', engineType:'ev', hp:650, bodyType:'coupe' })
// убрать мусорное sync-ev (Black Badge → Series II) и поставить правильные связи
delEdge('sync-ev-ncs-rolls-royce-2027-rolls-royce-spectre-black-badge-series--ncs-rolls-r')
E('rr-spectre-fl','rr-spectre',SPEC_II,'facelifted_to')
E('rr-spectre-bb',SPEC_II,SPEC_BB,'variant_of',0.9)
// Project Nightingale — коучбилд-одиночка, точная база не подтверждена → оставляем standalone

// ══════════════════════════════════════════════════════════════════════════════
// BENTLEY
// ══════════════════════════════════════════════════════════════════════════════
const bn = node('bentley','Bentley')

// — Исторические якоря —
A(bn('bentley-rtype','R-Type Continental',1952,'R','coupe','gt_coupe',153,'i6'))
A(bn('bentley-t-series','T-Series',1965,'T','sedan','flagship_sed',220,'v8'))
A(bn('bentley-turbo-r','Turbo R',1985,'TR','sedan','flagship_sed',296,'v8t'))
A(bn('bentley-continental-r','Continental R',1991,'CR','coupe','gt_coupe',325,'v8t'))
A(bn('bentley-azure','Azure',1995,'AZ','convertible','open_top',385,'v8t'))
A(bn('bentley-arnage','Arnage',1998,'AR','sedan','flagship_sed',350,'v8t'))
A(bn('bentley-brooklands','Brooklands',2008,'BK','coupe','gt_coupe',530,'v8t'))
E('bn-rt-t','bentley-rtype','bentley-t-series','evolves_into')
E('bn-t-tr','bentley-t-series','bentley-turbo-r','evolves_into')
E('bn-tr-cr','bentley-turbo-r','bentley-continental-r','derived_from',0.7)
E('bn-cr-az','bentley-continental-r','bentley-azure','derived_from',0.8)
E('bn-tr-arn','bentley-turbo-r','bentley-arnage','evolves_into')
E('bn-arn-bk','bentley-arnage','bentley-brooklands','derived_from',0.8)

// — Continental GT (эра VW) + производные —
A(bn('bentley-conti-gt','Continental GT',2003,'GT1','coupe','gt_coupe',552,'v12t'))
A(bn('bentley-conti-gt2','Continental GT II',2011,'GT2','coupe','gt_coupe',567,'v12t'))
A(bn('bentley-conti-gt3','Continental GT III',2018,'GT3','coupe','gt_coupe',626,'v12t'))
A(bn('bentley-conti-gt4','Continental GT IV',2024,'GT4','coupe','gt_coupe',771,'v8h'))
A(bn('bentley-conti-gtc','Continental GTC',2006,'GTC','convertible','open_top',552,'v12t'))
A(bn('bentley-conti-speed','Continental GT Speed',2007,'GT Speed','coupe','gt_coupe',602,'v12t'))
A(bn('bentley-supersports','Continental Supersports',2009,'SS','coupe','gt_coupe',621,'v12t'))
A(bn('bentley-bacalar','Bacalar',2020,'Mulliner','convertible','open_top',650,'v12t'))
A(bn('bentley-batur','Batur',2022,'Mulliner','coupe','gt_coupe',740,'v12t'))
E('bn-cr-gt','bentley-continental-r','bentley-conti-gt','evolves_into')
E('bn-gt-gt2','bentley-conti-gt','bentley-conti-gt2','evolves_into')
E('bn-gt2-gt3','bentley-conti-gt2','bentley-conti-gt3','evolves_into')
E('bn-gt3-gt4','bentley-conti-gt3','bentley-conti-gt4','evolves_into')
E('bn-gt-gtc','bentley-conti-gt','bentley-conti-gtc','derived_from',0.8)
E('bn-gt-speed','bentley-conti-gt','bentley-conti-speed','variant_of',0.9)
E('bn-gt-ss','bentley-conti-gt','bentley-supersports','variant_of',0.9)
E('bn-gt3-bacalar','bentley-conti-gt3','bentley-bacalar','derived_from',0.7)
E('bn-gt3-batur','bentley-conti-gt3','bentley-batur','derived_from',0.7)

// — Flying Spur (4-дверка от Continental) —
A(bn('bentley-flying-spur','Continental Flying Spur',2005,'FS1','sedan','flagship_sed',552,'v12t'))
A(bn('bentley-flying-spur2','Flying Spur II',2013,'FS2','sedan','flagship_sed',616,'v12t'))
A(bn('bentley-flying-spur3','Flying Spur III',2019,'FS3','sedan','flagship_sed',626,'v12t'))
E('bn-gt-fs','bentley-conti-gt','bentley-flying-spur','derived_from',0.8)
E('bn-fs-fs2','bentley-flying-spur','bentley-flying-spur2','evolves_into')
E('bn-fs2-fs3','bentley-flying-spur2','bentley-flying-spur3','evolves_into')

// — Mulsanne (флагман) —
A(bn('bentley-mulsanne','Mulsanne',2010,'MUL','sedan','flagship_sed',505,'v8t'))
A(bn('bentley-mulsanne-speed','Mulsanne Speed',2014,'MUL Speed','sedan','flagship_sed',530,'v8t'))
E('bn-arn-mul','bentley-arnage','bentley-mulsanne','evolves_into')
E('bn-mul-speed','bentley-mulsanne','bentley-mulsanne-speed','variant_of',0.9)

// — Bentayga (SUV) —
A(bn('bentley-bentayga','Bentayga',2015,'BNT','suv','suv_large',600,'v12t'))
A(bn('bentley-bentayga-fl','Bentayga (2020)',2020,'BNT.2','suv','suv_large',542,'v8t'))
A(bn('bentley-bentayga-speed','Bentayga Speed',2019,'BNT Speed','suv','suv_large',626,'v12t'))
A(bn('bentley-bentayga-ewb','Bentayga EWB',2022,'BNT EWB','suv','suv_large',542,'v8t'))
E('bn-bnt-fl','bentley-bentayga','bentley-bentayga-fl','facelifted_to')
E('bn-bnt-speed','bentley-bentayga','bentley-bentayga-speed','variant_of',0.9)
E('bn-bnt-ewb','bentley-bentayga','bentley-bentayga-ewb','variant_of',0.9)
// EXP 15 Concept (2025) — превью первого Bentley EV → оставляем standalone концептом

// ── save ──────────────────────────────────────────────────────────────────────
fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Rolls-Royce + Bentley добавлены ===')
log.forEach(l => console.log(' ', l))
console.log('\nRR нод:', g.nodes.filter(n=>n.brandId==='rolls-royce').length,
            '| Bentley нод:', g.nodes.filter(n=>n.brandId==='bentley').length)
console.log('Всего: узлов', g.nodes.length, '| рёбер', g.edges.length)
