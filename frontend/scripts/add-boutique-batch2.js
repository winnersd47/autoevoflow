/**
 * add-boutique-batch2.js
 * Бутиковые бренды: Morgan, TVR, Caterham (UK) · Hennessey, SSC, Saleen (US)
 *                    Automobili Pininfarina, Hispano Suiza, Aspark (EV).
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
  segment: zone==='hypercar'?'hypercar':zone==='supercar'?'supercar':'sports', zone, hp, engineType:eng,
})
const A = nd => { if(!EID.has(nd.id)){ g.nodes.push(nd); EID.add(nd.id); byId[nd.id]=nd; log.push('+ '+nd.brandId+': '+nd.label+' ('+nd.year+')') } }
const E = (id,s,t,type,str=0.9) => {
  if(EEI.has(id)) return
  if(!EID.has(s)||!EID.has(t)){ log.push('✗ '+id+' нет '+(!EID.has(s)?s:t)); return }
  g.edges.push({id,source:s,target:t,type,strength:str}); EEI.add(id)
  log.push('  '+byId[s].label+' —'+type+'→ '+byId[t].label)
}
const findId = (brand, re) => { const n=g.nodes.find(x=>x.brandId===brand&&re.test(x.label)); return n?n.id:null }

// ══════════ MORGAN (1909) ══════════
const mg = mk('morgan','Morgan')
A(mg('morgan-44','4/4',1936,'4/4','convertible','open_top',110,'i4'))
A(mg('morgan-plus4','Plus 4',1950,'Plus 4','convertible','open_top',116,'i4'))
A(mg('morgan-plus8','Plus 8',1968,'Plus 8','convertible','open_top',160,'v8'))
A(mg('morgan-aero8','Aero 8',2000,'Aero 8','convertible','open_top',362,'v8'))
A(mg('morgan-plus6','Plus Six',2019,'CX','convertible','open_top',335,'i6t'))
A(mg('morgan-plus4cx','Plus Four',2020,'CX','convertible','open_top',255,'i4t'))
A(mg('morgan-supersport','Supersport',2025,'CXV','convertible','open_top',335,'i6t'))
A(mg('morgan-3wheeler','3 Wheeler',2011,'3W','convertible','open_top',82,'i4'))
A(mg('morgan-super3','Super 3',2022,'S3','convertible','open_top',118,'i4'))
E('mg-44-p4','morgan-44','morgan-plus4','evolves_into')
E('mg-p4-p8','morgan-plus4','morgan-plus8','evolves_into')
E('mg-p8-aero','morgan-plus8','morgan-aero8','evolves_into')
E('mg-aero-p6','morgan-aero8','morgan-plus6','evolves_into')
E('mg-p6-ss','morgan-plus6','morgan-supersport','evolves_into')
E('mg-p6-p4cx','morgan-plus6','morgan-plus4cx','variant_of',0.9)
E('mg-44-3w','morgan-44','morgan-3wheeler','derived_from',0.7)
E('mg-3w-s3','morgan-3wheeler','morgan-super3','evolves_into')

// ══════════ TVR (1946) ══════════
const tv = mk('tvr','TVR')
A(tv('tvr-grantura','Grantura',1958,'Grantura','coupe','sports',100,'i4'))
A(tv('tvr-tasmin','Tasmin 280i',1980,'Tasmin','coupe','sports',160,'v6'))
A(tv('tvr-griffith','Griffith',1990,'Griffith','convertible','open_top',240,'v8'))
A(tv('tvr-chimaera','Chimaera',1992,'Chimaera','convertible','open_top',240,'v8'))
A(tv('tvr-cerbera','Cerbera',1996,'Cerbera','coupe','gt_coupe',350,'v8'))
A(tv('tvr-tuscan','Tuscan',1999,'Tuscan','coupe','sports',360,'i6'))
A(tv('tvr-sagaris','Sagaris',2005,'Sagaris','coupe','sports',400,'i6'))
A(tv('tvr-griffith2','Griffith (2017)',2017,'Griffith II','coupe','sports',500,'v8'))
E('tv-gr-tas','tvr-grantura','tvr-tasmin','evolves_into')
E('tv-tas-gri','tvr-tasmin','tvr-griffith','evolves_into')
E('tv-gri-chi','tvr-griffith','tvr-chimaera','variant_of',0.9)
E('tv-gri-cer','tvr-griffith','tvr-cerbera','evolves_into')
E('tv-cer-tus','tvr-cerbera','tvr-tuscan','evolves_into')
E('tv-tus-sag','tvr-tuscan','tvr-sagaris','evolves_into')
E('tv-sag-gri2','tvr-sagaris','tvr-griffith2','evolves_into')

// ══════════ CATERHAM (1973) ══════════
const ct = mk('caterham','Caterham')
A(ct('caterham-seven','Seven',1973,'Seven','convertible','open_top',135,'i4'))
A(ct('caterham-21','21',1994,'21','coupe','sports',135,'i4'))
A(ct('caterham-620r','Seven 620R',2013,'620R','convertible','open_top',310,'i4t'))
A(ct('caterham-superseven','Super Seven 2000',2020,'SS2000','convertible','open_top',180,'i4'))
A(ct('caterham-project-v','Project V',2026,'Project V','coupe','gt_coupe',272,'ev'))
E('ct-7-21','caterham-seven','caterham-21','derived_from',0.7)
E('ct-7-620','caterham-seven','caterham-620r','variant_of',0.9)
E('ct-7-ss','caterham-seven','caterham-superseven','variant_of',0.9)
E('ct-7-pv','caterham-seven','caterham-project-v','derived_from',0.7)
// наследие Lotus Seven
const lotus7parent = findId('lotus', /elan s3|elise s1/i)  // ближайший лёгкий Lotus-предок по духу
if (lotus7parent) E('ct-lotus-infl', lotus7parent, 'caterham-seven', 'influenced_by', 0.6)

// ══════════ HENNESSEY (1991, US) ══════════
const hn = mk('hennessey','Hennessey')
A(hn('hennessey-venom-gt','Venom GT',2010,'Venom GT','coupe','hypercar',1244,'v8t'))
A(hn('hennessey-venom-f5','Venom F5',2020,'Venom F5','coupe','hypercar',1817,'v8t'))
A(hn('hennessey-venom-f5-roadster','Venom F5 Roadster',2022,'F5 R','convertible','open_top',1817,'v8t'))
E('hn-gt-f5','hennessey-venom-gt','hennessey-venom-f5','evolves_into')
E('hn-f5-road','hennessey-venom-f5','hennessey-venom-f5-roadster','variant_of',0.9)
const exige = findId('lotus', /exige/i)  // Venom GT построен на шасси Lotus Exige
if (exige) E('hn-exige-plat', exige, 'hennessey-venom-gt', 'shares_platform', 0.6)

// ══════════ SSC (1998, US) ══════════
const ss = mk('ssc','SSC')
A(ss('ssc-ultimate-aero','Ultimate Aero',2006,'Aero','coupe','hypercar',1183,'v8t'))
A(ss('ssc-tuatara','Tuatara',2020,'Tuatara','coupe','hypercar',1750,'v8t'))
E('ss-aero-tua','ssc-ultimate-aero','ssc-tuatara','evolves_into')

// ══════════ SALEEN (1983, US) ══════════
const sl = mk('saleen','Saleen')
A(sl('saleen-s7','S7',2000,'S7','coupe','supercar',550,'v8'))
A(sl('saleen-s7-tt','S7 Twin Turbo',2005,'S7 TT','coupe','supercar',750,'v8t'))
A(sl('saleen-s1','S1',2017,'S1','coupe','sports',450,'i4t'))
E('sl-s7-tt','saleen-s7','saleen-s7-tt','variant_of',0.9)
E('sl-s7-s1','saleen-s7','saleen-s1','evolves_into')

// ══════════ AUTOMOBILI PININFARINA (2018, EV) ══════════
const pf = mk('pininfarina','Pininfarina')
A(pf('pininfarina-battista','Battista',2022,'Battista','coupe','hypercar',1877,'ev'))
A(pf('pininfarina-b95','B95',2024,'B95','convertible','open_top',1877,'ev'))
E('pf-bat-b95','pininfarina-battista','pininfarina-b95','derived_from',0.8)
const nevera = findId('rimac', /nevera/i)  // общая платформа/силовая Rimac
if (nevera) E('pf-rimac-plat', nevera, 'pininfarina-battista', 'shares_platform', 0.7)

// ══════════ HISPANO SUIZA (1904 → возрождён 2019, EV) ══════════
const hs = mk('hispano-suiza','Hispano Suiza')
A(hs('hispano-carmen','Carmen',2019,'Carmen','coupe','hypercar',1019,'ev'))
A(hs('hispano-carmen-boulogne','Carmen Boulogne',2020,'Boulogne','coupe','hypercar',1101,'ev'))
E('hs-carmen-boul','hispano-carmen','hispano-carmen-boulogne','variant_of',0.9)

// ══════════ ASPARK (2005, JP, EV) ══════════
const ap = mk('aspark','Aspark')
A(ap('aspark-owl','Owl',2020,'Owl','coupe','hypercar',1985,'ev'))

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Бутиковый батч 2 ===')
log.forEach(l => console.log(' ', l))
;['morgan','tvr','caterham','hennessey','ssc','saleen','pininfarina','hispano-suiza','aspark'].forEach(b =>
  console.log(b+':', g.nodes.filter(n=>n.brandId===b).length, 'нод'))
console.log('Всего: узлов', g.nodes.length, '| рёбер', g.edges.length)
