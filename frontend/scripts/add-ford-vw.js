/**
 * add-ford-vw.js — Ford (новый бренд) + расширение Volkswagen.
 * Платформенные связи добавляются отдельно (add-platform-web.js).
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const EID = new Set(g.nodes.map(n => n.id))
const EEI = new Set(g.edges.map(e => e.id))
const log = []
const mk = (brandId, brandName) => (id,label,year,code,body,zone,hp,eng) => ({
  id,label,type:'generation',year,brandId,brandName,codeName:code,
  modelSlug:`${brandId}-${id.split('-').slice(1).join('-')}`, bodyType:body,
  segment: zone==='supercar'?'supercar':zone==='pickup'?'truck':zone.includes('suv')?'suv':'mainstream',
  zone, hp, engineType:eng,
})
const A = nd => { if(!EID.has(nd.id)){ g.nodes.push(nd); EID.add(nd.id); byId[nd.id]=nd; log.push('+ '+nd.brandId+': '+nd.label+' ('+nd.year+')') } }
const E = (id,s,t,type,str=0.9) => {
  if(EEI.has(id)) return
  if(!EID.has(s)||!EID.has(t)){ log.push('✗ '+id+' нет '+(!EID.has(s)?s:t)); return }
  g.edges.push({id,source:s,target:t,type,strength:str}); EEI.add(id)
}

// ══════════ FORD (1903) ══════════
const f = mk('ford','Ford')
// — Mustang —
A(f('ford-mustang-1','Mustang (1-е пок.)',1964,'1st','coupe','gt_coupe',271,'v8'))
A(f('ford-mustang-2','Mustang II',1974,'2nd','coupe','gt_coupe',139,'v8'))
A(f('ford-mustang-fox','Mustang Fox',1979,'Fox','coupe','gt_coupe',157,'v8'))
A(f('ford-mustang-sn95','Mustang SN95',1994,'SN95','coupe','gt_coupe',215,'v8'))
A(f('ford-mustang-s197','Mustang S197',2005,'S197','coupe','gt_coupe',300,'v8'))
A(f('ford-mustang-s550','Mustang S550',2015,'S550','coupe','gt_coupe',435,'v8'))
A(f('ford-mustang-s650','Mustang S650',2024,'S650','coupe','gt_coupe',480,'v8'))
A(f('ford-shelby-gt500','Shelby GT500',2020,'S550 GT500','coupe','sports',760,'v8'))
A(f('ford-mustang-mache','Mustang Mach-E',2020,'GE1','suv','electric',480,'ev'))
E('f-mus-1-2','ford-mustang-1','ford-mustang-2','evolves_into')
E('f-mus-2-fox','ford-mustang-2','ford-mustang-fox','evolves_into')
E('f-mus-fox-sn95','ford-mustang-fox','ford-mustang-sn95','evolves_into')
E('f-mus-sn95-s197','ford-mustang-sn95','ford-mustang-s197','evolves_into')
E('f-mus-s197-s550','ford-mustang-s197','ford-mustang-s550','evolves_into')
E('f-mus-s550-s650','ford-mustang-s550','ford-mustang-s650','evolves_into')
E('f-mus-gt500','ford-mustang-s550','ford-shelby-gt500','variant_of',0.9)
E('f-mus-mache','ford-mustang-s550','ford-mustang-mache','derived_from',0.7)
// — GT (halo) —
A(f('ford-gt40','GT40',1964,'GT40','coupe','supercar',380,'v8'))
A(f('ford-gt-2005','Ford GT (2005)',2004,'2005','coupe','supercar',550,'v8t'))
A(f('ford-gt-2017','Ford GT (2017)',2017,'2017','coupe','supercar',647,'v6t'))
E('f-gt40-05','ford-gt40','ford-gt-2005','evolves_into')
E('f-gt-05-17','ford-gt-2005','ford-gt-2017','evolves_into')
// — F-150 —
A(f('ford-f150-13','F-150 (13-е, алюм.)',2015,'P552','pickup','pickup',375,'v6t'))
A(f('ford-f150-14','F-150 (14-е)',2021,'P702','pickup','pickup',400,'v6t'))
A(f('ford-f150-raptor','F-150 Raptor',2017,'Raptor','pickup','pickup',450,'v6t'))
A(f('ford-f150-lightning','F-150 Lightning',2022,'Lightning','pickup','electric',580,'ev'))
A(f('ford-ranger-t6','Ranger (T6)',2022,'T6.2','pickup','pickup',270,'v6t'))
E('f-f150-13-14','ford-f150-13','ford-f150-14','evolves_into')
E('f-f150-raptor','ford-f150-14','ford-f150-raptor','variant_of',0.9)
E('f-f150-light','ford-f150-14','ford-f150-lightning','variant_of',0.85)
// — Focus —
A(f('ford-focus-1','Focus Mk1',1998,'C170','hatchback','hatchback',130,'i4'))
A(f('ford-focus-2','Focus Mk2',2004,'C307','hatchback','hatchback',145,'i4'))
A(f('ford-focus-3','Focus Mk3',2010,'C346','hatchback','hatchback',160,'i4t'))
A(f('ford-focus-4','Focus Mk4',2018,'C519','hatchback','hatchback',180,'i4t'))
A(f('ford-focus-rs','Focus RS',2016,'C346 RS','hatchback','sports',350,'i4t'))
A(f('ford-focus-st','Focus ST',2012,'ST','hatchback','sports',250,'i4t'))
E('f-foc-1-2','ford-focus-1','ford-focus-2','evolves_into')
E('f-foc-2-3','ford-focus-2','ford-focus-3','evolves_into')
E('f-foc-3-4','ford-focus-3','ford-focus-4','evolves_into')
E('f-foc-rs','ford-focus-3','ford-focus-rs','variant_of',0.9)
E('f-foc-st','ford-focus-3','ford-focus-st','variant_of',0.9)
// — Fiesta —
A(f('ford-fiesta-1','Fiesta Mk1',1976,'Mk1','hatchback','hatchback',40,'i4'))
A(f('ford-fiesta-7','Fiesta Mk7',2017,'B479','hatchback','hatchback',100,'i4t'))
A(f('ford-fiesta-st','Fiesta ST',2013,'ST','hatchback','sports',200,'i4t'))
E('f-fie-1-7','ford-fiesta-1','ford-fiesta-7','evolves_into')
E('f-fie-st','ford-fiesta-7','ford-fiesta-st','variant_of',0.9)
// — Раллийное наследие —
A(f('ford-escort','Escort Mk1',1968,'Escort','coupe','sports',100,'i4'))
A(f('ford-escort-cosworth','Escort RS Cosworth',1992,'RS Cosworth','coupe','sports',227,'i4t'))
A(f('ford-sierra-cosworth','Sierra RS Cosworth',1986,'RS500','coupe','sports',224,'i4t'))
A(f('ford-rs200','RS200',1984,'RS200','coupe','supercar',250,'i4t'))
E('f-esc-cos','ford-escort','ford-escort-cosworth','variant_of',0.85)
E('f-sierra-cos','ford-escort','ford-sierra-cosworth','derived_from',0.7)
E('f-rs200','ford-escort','ford-rs200','derived_from',0.6)
// — Bronco / Capri / Explorer —
A(f('ford-bronco-1','Bronco (1-е пок.)',1966,'U13','suv','suv_large',200,'v8'))
A(f('ford-bronco-6','Bronco (2021)',2021,'U725','suv','suv_large',330,'v6t'))
E('f-bronco','ford-bronco-1','ford-bronco-6','evolves_into')
A(f('ford-capri','Capri',1969,'Capri','coupe','gt_coupe',138,'v6'))
A(f('ford-capri-ev','Capri (2024 EV)',2024,'CE1','suv','electric',340,'ev'))
E('f-capri-ev','ford-capri','ford-capri-ev','derived_from',0.6)
A(f('ford-explorer-ev','Explorer EV',2024,'CX1','suv','electric',340,'ev'))

// ══════════ VOLKSWAGEN (дополнение) ══════════
const v = mk('volkswagen','Volkswagen')
// — Golf GTI / R —
A(v('vw-golf-gti-mk1','Golf GTI Mk1',1976,'GTI','hatchback','hatchback',110,'i4'))
A(v('vw-golf-r-mk8','Golf R Mk8',2021,'R','hatchback','sports',315,'i4t'))
E('vw-golf1-gti','vw-golf1','vw-golf-gti-mk1','variant_of',0.9)
E('vw-golf8-r','vw-golf8','vw-golf-r-mk8','variant_of',0.9)
// — Polo —
A(v('vw-polo-1','Polo Mk1',1975,'86','hatchback','hatchback',40,'i4'))
A(v('vw-polo-6','Polo Mk6',2017,'AW','hatchback','hatchback',95,'i4t'))
E('vw-polo-1-6','vw-polo-1','vw-polo-6','evolves_into')
// — Scirocco / Corrado —
A(v('vw-scirocco-1','Scirocco Mk1',1974,'53','coupe','gt_coupe',85,'i4'))
A(v('vw-scirocco-3','Scirocco Mk3',2008,'13','coupe','gt_coupe',200,'i4t'))
A(v('vw-corrado','Corrado',1988,'53I','coupe','gt_coupe',190,'v6'))
E('vw-sci-1-3','vw-scirocco-1','vw-scirocco-3','evolves_into')
E('vw-sci-corrado','vw-scirocco-1','vw-corrado','derived_from',0.7)
// — Touareg / Tiguan / Amarok / Arteon —
A(v('vw-touareg-1','Touareg I',2002,'7L','suv','suv_large',310,'v6t'))
A(v('vw-touareg-3','Touareg III',2018,'CR','suv','suv_large',335,'v6t'))
A(v('vw-tiguan-1','Tiguan I',2007,'5N','suv','suv_compact',200,'i4t'))
A(v('vw-tiguan-2','Tiguan II',2016,'AD (MQB)','suv','suv_compact',220,'i4t'))
A(v('vw-amarok-2','Amarok II',2022,'Ford T6','pickup','pickup',240,'v6t'))
A(v('vw-arteon','Arteon',2017,'3H','sedan','exec_sed',272,'i4t'))
E('vw-tou-1-3','vw-touareg-1','vw-touareg-3','evolves_into')
E('vw-tig-1-2','vw-tiguan-1','vw-tiguan-2','evolves_into')
E('vw-arteon-d','vw-passat-b8','vw-arteon','derived_from',0.7)
// — ID. семейство (MEB) —
A(v('vw-id7','ID.7',2023,'MEB sedan','sedan','electric',286,'ev'))
A(v('vw-id-buzz','ID. Buzz',2022,'MEB van','van','electric',286,'ev'))
E('vw-id3-id4','vw-id3','vw-id4','derived_from',0.75)
E('vw-id3-id7','vw-id3','vw-id7','derived_from',0.7)
E('vw-id3-buzz','vw-id3','vw-id-buzz','derived_from',0.7)
// связать орфан ID.Polo GTI (электрический наследник Polo)
E('vw-polo-idpolo','vw-polo-6','ncs-volkswagen-2027-volkswagen-id-polo-gti','evolves_into',0.8)
// — Классика —
A(v('vw-karmann-ghia','Karmann Ghia',1955,'14','coupe','gt_coupe',50,'flat4'))
E('vw-beetle-kg','vw-beetle-t1','vw-karmann-ghia','derived_from',0.7)

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Ford + VW ===')
log.forEach(l => console.log(' ', l))
console.log('Ford:', g.nodes.filter(n=>n.brandId==='ford').length, '| VW:', g.nodes.filter(n=>n.brandId==='volkswagen').length)
console.log('Всего: узлов', g.nodes.length, '| рёбер', g.edges.length)
