/**
 * add-gma-zenvo-detomaso.js
 * Бутиковые hypercar-бренды: Gordon Murray Automotive, Zenvo, De Tomaso.
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
  log.push('  edge: '+byId[s].label+' —'+type+'→ '+byId[t].label)
}

// ── Gordon Murray Automotive (наследник McLaren F1) ──────────────────────────
const gm = mk('gordon-murray','Gordon Murray')
A(gm('gma-t50','T.50',2022,'T.50','coupe','hypercar',654,'v12'))
A(gm('gma-t50s','T.50s Niki Lauda',2023,'T.50s','coupe','hypercar',711,'v12'))
A(gm('gma-t33','T.33',2024,'T.33','coupe','supercar',607,'v12'))
A(gm('gma-t33-spider','T.33 Spider',2024,'T.33 S','convertible','open_top',607,'v12'))
E('gm-t50-t50s','gma-t50','gma-t50s','variant_of',0.9)
E('gm-t50-t33','gma-t50','gma-t33','derived_from',0.7)            // T.33 — младшая, отдельная колонка справа
E('gm-t33-spider','gma-t33','gma-t33-spider','variant_of',0.9)
// McLaren F1 → T.50 (Гордон Мюррей спроектировал оба; T.50 — духовный наследник F1)
const f1 = g.nodes.find(n => n.brandId==='mclaren' && /McLaren F1$/.test(n.label))
if (f1) E('gm-f1-t50', f1.id, 'gma-t50', 'influenced_by', 0.7)

// ── Zenvo (Дания) ────────────────────────────────────────────────────────────
const zv = mk('zenvo','Zenvo')
A(zv('zenvo-st1','ST1',2009,'ST1','coupe','hypercar',1104,'v8t'))
A(zv('zenvo-tsrs','TSR-S',2018,'TSR-S','coupe','hypercar',1177,'v8t'))
A(zv('zenvo-aurora','Aurora',2023,'Aurora','coupe','hypercar',1450,'v12t'))
A(zv('zenvo-aurora-tur','Aurora Tur',2023,'Aurora Tur','coupe','hypercar',1850,'v12t'))
E('zv-st1-tsrs','zenvo-st1','zenvo-tsrs','evolves_into')
E('zv-tsrs-aurora','zenvo-tsrs','zenvo-aurora','evolves_into')
E('zv-aurora-tur','zenvo-aurora','zenvo-aurora-tur','variant_of',0.9)

// ── De Tomaso (Италия, осн. 1959; возрождён 2019) ────────────────────────────
const dt = mk('de-tomaso','De Tomaso')
A(dt('detomaso-vallelunga','Vallelunga',1965,'Vallelunga','coupe','sports',104,'i4'))
A(dt('detomaso-mangusta','Mangusta',1967,'Mangusta','coupe','sports',306,'v8'))
A(dt('detomaso-pantera','Pantera',1971,'Pantera','coupe','supercar',330,'v8'))
A(dt('detomaso-guara','Guarà',1993,'Guara','coupe','sports',304,'v8'))
A(dt('detomaso-p72','P72',2019,'P72','coupe','hypercar',700,'v8t'))
A(dt('detomaso-p900','P900',2024,'P900','coupe','hypercar',888,'v12'))
E('dt-val-man','detomaso-vallelunga','detomaso-mangusta','evolves_into')
E('dt-man-pan','detomaso-mangusta','detomaso-pantera','evolves_into')
E('dt-pan-gua','detomaso-pantera','detomaso-guara','evolves_into')
E('dt-gua-p72','detomaso-guara','detomaso-p72','evolves_into')   // возрождение линии
E('dt-p72-p900','detomaso-p72','detomaso-p900','derived_from',0.7) // P900 — трековый собрат

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Gordon Murray + Zenvo + De Tomaso ===')
log.forEach(l => console.log(' ', l))
;['gordon-murray','zenvo','de-tomaso'].forEach(b =>
  console.log(b+':', g.nodes.filter(n=>n.brandId===b).length, 'нод'))
console.log('Всего: узлов', g.nodes.length, '| рёбер', g.edges.length)
