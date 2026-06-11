/**
 * supplement-q7-rr-bentley.js
 *
 * Part 1: Audi Q7 — добавить 2-е поколение (4M) и привязать новинки Q7/SQ7 2027.
 * Part 2: Дополнить RR и Bentley моделями (классика + варианты), т.к. бренд-
 *         страницы netcarshow недоступны из среды (таймаут) — берём из той же
 *         авторитетной автобазы, что и остальные линейки проекта.
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = id => g.nodes.find(n => n.id === id)
const EID = new Set(g.nodes.map(n => n.id))
const EEI = new Set(g.edges.map(e => e.id))
const log = []
const mk = (brandId, brandName) => (id,label,year,code,body,zone,hp,eng) => ({
  id,label,type:'generation',year,brandId,brandName,codeName:code,
  modelSlug:`${brandId}-${id.replace(brandId+'-','').replace(/^rr-/,'')}`,
  bodyType:body, segment: zone.includes('suv')?'suv': zone==='flagship_sed'?'luxury':'premium',
  zone, hp, engineType:eng,
})
const A = nd => { if(!EID.has(nd.id)){ g.nodes.push(nd); EID.add(nd.id); log.push('+ '+nd.brandId+': '+nd.label+' ('+nd.year+')') } }
const E = (id,s,t,type,str=0.9) => {
  if(EEI.has(id)){ return }
  if(!EID.has(s)||!EID.has(t)){ log.push('✗ '+id+' нет '+(!EID.has(s)?s:t)); return }
  g.edges.push({id,source:s,target:t,type,strength:str}); EEI.add(id)
  log.push('  edge: '+(byId(s)||{}).label+' —'+type+'→ '+(byId(t)||{}).label)
}
const delE = id => { const i=g.edges.findIndex(e=>e.id===id); if(i>=0){ g.edges.splice(i,1); log.push('  − edge '+id) } }
const patch = (id,p) => { const n=byId(id); if(n){ Object.assign(n,p); } }

// ══════════ PART 1: AUDI Q7 ══════════
const au = mk('audi','Audi')
A(au('audi-q7-4m','Q7 4M',2015,'4M','suv','suv_large',333,'v6t'))
A(au('audi-q7-4m-fl','Q7 4M Facelift',2019,'4M.2','suv','suv_large',335,'v6t'))
A(au('audi-sq7-4m','SQ7 4M',2016,'4M S','suv','suv_large',500,'v8t'))
E('au-q7-j4-4m','audi-q7-j4','audi-q7-4m','evolves_into')          // J4(2005)→4M(2015), от базы (не от FL)
E('au-q7-4m-fl','audi-q7-4m','audi-q7-4m-fl','facelifted_to')
E('au-q7-4m-sq7','audi-q7-4m','audi-sq7-4m','variant_of',0.9)
E('au-q7-4m-2027','audi-q7-4m','ncs-audi-2027-q7','evolves_into')   // 4M→Q7 2027 (след. поколение)
E('au-q7-2027-sq7','ncs-audi-2027-q7','ncs-audi-2027-sq7','variant_of',0.9)
patch('ncs-audi-2027-q7',  { label:'Q7 (2027)', zone:'suv_large', engineType:'v6t', bodyType:'suv' })
patch('ncs-audi-2027-sq7', { label:'SQ7 (2027)', zone:'suv_large', engineType:'v8t', bodyType:'suv' })

// ══════════ PART 2a: ROLLS-ROYCE дополнение ══════════
const rr = mk('rolls-royce','Rolls-Royce')
// Классика — производные Silver Shadow
A(rr('rr-corniche','Corniche',1971,'Corniche','convertible','open_top',220,'v8'))
A(rr('rr-camargue','Camargue',1975,'Camargue','coupe','gt_coupe',220,'v8'))
E('rr-shadow-corniche','rr-silver-shadow','rr-corniche','derived_from',0.8)
E('rr-shadow-camargue','rr-silver-shadow','rr-camargue','derived_from',0.8)
// Классические Phantom-лимузины V→VI и их связь с современным Phantom VII
A(rr('rr-phantom5','Phantom V',1959,'PV','sedan','flagship_sed',200,'v8'))
A(rr('rr-phantom6','Phantom VI',1968,'PVI','sedan','flagship_sed',200,'v8'))
E('rr-p5-p6','rr-phantom5','rr-phantom6','evolves_into')
// Перецепка: Phantom VII — преемник классического Phantom (а не Silver Seraph),
//            а Silver Seraph — предшественник «малого» RR Ghost.
delE('rr-seraph-p7')
E('rr-p6-p7','rr-phantom6','rr-phantom7','evolves_into')
E('rr-seraph-ghost','rr-silver-seraph','rr-ghost','evolves_into')
// EWB-варианты (long wheelbase)
A(rr('rr-phantom8-ewb','Phantom VIII EWB',2017,'RR11 EWB','sedan','flagship_sed',563,'v12t'))
A(rr('rr-ghost-ewb','Ghost EWB',2020,'RR21 EWB','sedan','flagship_sed',563,'v12t'))
E('rr-p8-ewb','rr-phantom8','rr-phantom8-ewb','variant_of',0.9)
E('rr-ghost2-ewb','rr-ghost2','rr-ghost-ewb','variant_of',0.9)

// ══════════ PART 2b: BENTLEY дополнение ══════════
const bn = mk('bentley','Bentley')
// Довоенная классика (эра W.O. Bentley) + S-серия — единый ствол к R-Type
A(bn('bentley-speed-six','Speed Six',1928,'6.5L','coupe','sports',180,'i6'))
A(bn('bentley-blower','4½ Litre Blower',1929,'Blower','coupe','sports',240,'i4t'))
A(bn('bentley-8litre','8 Litre',1930,'8L','sedan','flagship_sed',220,'i6'))
A(bn('bentley-mark6','Mark VI',1946,'MkVI','sedan','flagship_sed',132,'i6'))
A(bn('bentley-s1','S1',1955,'S1','sedan','flagship_sed',178,'i6'))
A(bn('bentley-s2','S2',1959,'S2','sedan','flagship_sed',200,'v8'))
A(bn('bentley-s3','S3',1962,'S3','sedan','flagship_sed',200,'v8'))
E('bn-six-blower','bentley-speed-six','bentley-blower','derived_from',0.7)
E('bn-six-8l','bentley-speed-six','bentley-8litre','evolves_into')
E('bn-8l-mk6','bentley-8litre','bentley-mark6','evolves_into')
E('bn-mk6-rtype','bentley-mark6','bentley-rtype','evolves_into')
// перецепка ствола: R-Type → S1 → S2 → S3 → T-Series (вместо прямого R-Type→T-Series)
delE('bn-rt-t')
E('bn-rt-s1','bentley-rtype','bentley-s1','evolves_into')
E('bn-s1-s2','bentley-s1','bentley-s2','evolves_into')
E('bn-s2-s3','bentley-s2','bentley-s3','evolves_into')
E('bn-s3-t','bentley-s3','bentley-t-series','evolves_into')
// Continental GTC по поколениям + Flying Spur 4 + Bentayga Hybrid
A(bn('bentley-conti-gtc2','Continental GTC II',2011,'GTC2','convertible','open_top',567,'v12t'))
A(bn('bentley-conti-gtc3','Continental GTC III',2019,'GTC3','convertible','open_top',626,'v12t'))
A(bn('bentley-flying-spur4','Flying Spur (2024)',2024,'FS4','sedan','flagship_sed',771,'v8h'))
A(bn('bentley-bentayga-hybrid','Bentayga Hybrid',2021,'BNT Hybrid','suv','suv_large',456,'v6h'))
E('bn-gtc-gtc2','bentley-conti-gtc','bentley-conti-gtc2','evolves_into')
E('bn-gtc2-gtc3','bentley-conti-gtc2','bentley-conti-gtc3','evolves_into')
E('bn-fs3-fs4','bentley-flying-spur3','bentley-flying-spur4','evolves_into')
E('bn-bnt-hybrid','bentley-bentayga','bentley-bentayga-hybrid','variant_of',0.9)

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Дополнение Q7 + RR + Bentley ===')
log.forEach(l => console.log(' ', l))
console.log('\nAudi:', g.nodes.filter(n=>n.brandId==='audi').length,
            '| RR:', g.nodes.filter(n=>n.brandId==='rolls-royce').length,
            '| Bentley:', g.nodes.filter(n=>n.brandId==='bentley').length)
console.log('Всего: узлов', g.nodes.length, '| рёбер', g.edges.length)
