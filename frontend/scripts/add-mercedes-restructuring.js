/**
 * add-mercedes-restructuring.js
 *
 * Mercedes-Benz Portfolio Restructuring 2014–2024
 * ──────────────────────────────────────────────
 * В 2014 Daimler AG провёл реструктуризацию бренда, создав три суб-бренда:
 *
 * 1. Mercedes-AMG (performance): первый standalone-автомобиль — AMG GT C190 (2014).
 *    До этого AMG делал только версии серийных Mercedes.
 *    SLS AMG (W197, 2009) → AMG GT C190 (2014) → AMG GT R190 II (2023)
 *
 * 2. Mercedes-Maybach (ultra-luxury): возрождён в 2014 как суб-бренд
 *    (Maybach 57/62 существовал как отдельный бренд 2002-2013, был закрыт).
 *    Производные от S-Class W222/W223, GLS X167, AMG SL, EQS.
 *
 * 3. Mercedes-EQ (electric): основан в 2016, первая модель EQC (2019).
 *    EQA←GLA, EQB←GLB, EQC←GLC, EQS/EQE — собственная платформа EVA2.
 *
 * Схема parent-derivative relationships:
 *
 * STANDALONE AMG (собственная платформа):
 *   SLS AMG W197 ──evolves_into──→ AMG GT C190 ──evolves_into──→ AMG GT R190 II
 *   AMG GT C190  ──derived_from──→ AMG GT 4-door X290 (E-Class платформа)
 *   AMG ONE (hypercar, F1-двигатель)
 *   SL R231 ──evolves_into──→ AMG SL R232 (AMG принял ответственность за SL)
 *
 * MAYBACH (derived from базовых моделей):
 *   S-Class W222 ──derived_from──→ Maybach S-Class W222 (X222)
 *   S-Class W223 ──derived_from──→ Maybach S-Class W223 (Z223)
 *   Maybach S W222 ──evolves_into──→ Maybach S W223
 *   GLS X167      ──derived_from──→ Maybach GLS 600
 *   AMG SL R232   ──derived_from──→ Maybach SL
 *   EQS V297      ──derived_from──→ Maybach EQS 680
 *
 * EQ (electric derived + dedicated platform):
 *   GLA H247 ──derived_from──→ EQA H243
 *   GLB X247 ──derived_from──→ EQB V243
 *   EQC N293 — already exists (from GLC)
 *   EQS V297, EQE V295 — already exist (EVA2 platform)
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname,'../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH,'utf8'))
const EID = new Set(g.nodes.map(n=>n.id))
const EEI = new Set(g.edges.map(e=>e.id))

const n=(id,label,year,code,slug,body,seg,zone,hp,eng,extra={})=>({
  id,label,type:'generation',year,brandId:'mercedes',brandName:'Mercedes-Benz',
  codeName:code,modelSlug:slug,bodyType:body,segment:seg,zone,hp,engineType:eng,...extra
})
const addNode=nd=>{ if(!EID.has(nd.id)){g.nodes.push(nd);EID.add(nd.id);return true;} return false; }
const addEdge=(id,s,t,type,str=0.9)=>{
  if(!EEI.has(id)&&EID.has(s)&&EID.has(t)){
    g.edges.push({id,source:s,target:t,type,strength:str});EEI.add(id);return true;
  }return false;
}
const log=[];
const A=(nd)=>addNode(nd)&&log.push('+ '+nd.label)
const E=(id,s,t,tp,str)=>addEdge(id,s,t,tp,str)&&log.push('+ edge: '+s.split('-').slice(1).join('-')+' —['+tp+']→ '+t.split('-').slice(1).join('-'))

// ══════════════════════════════════════════════════════════════════════════════
// MERCEDES-AMG SUB-BRAND STANDALONE MODELS
// ══════════════════════════════════════════════════════════════════════════════

// SLS AMG W197 (2009) — gullwing, predecessor to AMG GT, first dedicated AMG car
A(n('merc-sls-w197','SLS AMG W197',2009,'W197','mercedes-amg-sls','coupe','sports','sports',563,'v8'))

// AMG GT C190 — first official standalone AMG brand model, created new AMG sub-brand identity
// (already in graph as merc-amg-gt-c190, just fix the label)
const amggt=g.nodes.find(x=>x.id==='merc-amg-gt-c190')
if(amggt){amggt.label='AMG GT C190';amggt.modelSlug='mercedes-amg-gt';amggt.zone='sports';amggt.hp=510;amggt.engineType='v8t';log.push('~ fixed: AMG GT C190')}

// SLS AMG → AMG GT C190 (evolution of standalone AMG sports car)
E('me-sls-to-amggt','merc-sls-w197','merc-amg-gt-c190','evolves_into',0.95)

// AMG GT 4-door Coupé X290 (2018) — derived from AMG GT brand + E-Class platform
A(n('merc-amg-gt4-x290','AMG GT 4-door',2018,'X290','mercedes-amg-gt4','coupe','sports','gt_coupe',630,'v8t'))
E('me-amggt-to-4door','merc-amg-gt-c190','merc-amg-gt4-x290','derived_from',0.75)

// AMG ONE (2022) — F1-derived hybrid hypercar, 1063hp, 275 units
A(n('merc-amg-one','AMG ONE',2022,'HPS.1','mercedes-amg-one','coupe','hypercar','hypercar',1063,'v6h'))

// AMG GT R190 II (2023) — already in graph as merc-amg-gt2-r190, fix connection
const amggt2=g.nodes.find(x=>x.id==='merc-amg-gt2-r190')
if(amggt2){amggt2.label='AMG GT R190 II';amggt2.modelSlug='mercedes-amg-gt';amggt2.zone='sports';amggt2.hp=577;amggt2.engineType='v8t';log.push('~ fixed: AMG GT R190 II')}
// SL R232 = AMG SL, AMG took full responsibility for SL line in 2021
// (already connected SL R231 → SL R232 via evolves_into — correct)
const slr232=g.nodes.find(x=>x.id==='merc-sl-r232')
if(slr232){slr232.label='AMG SL R232';slr232.codeName='R232';log.push('~ SL R232 renamed AMG SL R232')}

// ══════════════════════════════════════════════════════════════════════════════
// MERCEDES-MAYBACH SUB-BRAND
// (revived 2014 after closure of standalone Maybach brand 2002-2013)
// ══════════════════════════════════════════════════════════════════════════════

// Maybach 57/62 (2002-2013) — original Maybach brand that was discontinued
A(n('merc-maybach-57','Maybach 57',2002,'W240','mercedes-maybach-57','sedan','luxury','flagship_sed',550,'v12'))
A(n('merc-maybach-62','Maybach 62',2002,'Z240','mercedes-maybach-62','sedan','luxury','flagship_sed',612,'v12'))

// Maybach S-Class W222 (2014) — first model of revived Mercedes-Maybach sub-brand
// Internal code: X222 (standard S-Class = W222, Maybach = X222)
A(n('merc-maybach-s222','Maybach S-Class W222',2014,'X222','mercedes-maybach-s','sedan','ultra-luxury','flagship_sed',630,'v12',{subBrand:'maybach'}))
E('me-sw222-to-may','merc-s-w222','merc-maybach-s222','derived_from',0.9)
E('me-may57-to-s222','merc-maybach-57','merc-maybach-s222','influenced_by',0.5)
E('me-may62-to-s222','merc-maybach-62','merc-maybach-s222','influenced_by',0.5)

// Maybach S-Class W223 (2021) — new generation
// Internal code: Z223
A(n('merc-maybach-s223','Maybach S-Class W223',2021,'Z223','mercedes-maybach-s','sedan','ultra-luxury','flagship_sed',650,'v12',{subBrand:'maybach'}))
E('me-sw223-to-may','merc-s-w223','merc-maybach-s223','derived_from',0.9)
E('me-may-s-ev','merc-maybach-s222','merc-maybach-s223','evolves_into',0.95)

// Maybach GLS 600 X167 (2020) — ultra-luxury SUV based on GLS W167
A(n('merc-maybach-gls600','Maybach GLS 600',2020,'VX167','mercedes-maybach-gls','suv','ultra-luxury','suv_large',558,'v8t',{subBrand:'maybach'}))
E('me-gls-to-maygls','merc-gle-w167','merc-maybach-gls600','derived_from',0.85)

// Maybach SL (2022) — derived from AMG SL R232
A(n('merc-maybach-sl','Maybach SL',2022,'R232M','mercedes-maybach-sl','roadster','ultra-luxury','open_top',612,'v12',{subBrand:'maybach'}))
E('me-sl-to-maysl','merc-sl-r232','merc-maybach-sl','derived_from',0.85)

// Maybach EQS 680 (2023) — electric Maybach derived from EQS V297
A(n('merc-maybach-eqs680','Maybach EQS 680',2023,'V297M','mercedes-maybach-eqs','sedan','ultra-luxury','electric',649,'ev',{subBrand:'maybach'}))
E('me-eqs-to-mayeqs','merc-eq-eqs','merc-maybach-eqs680','derived_from',0.85)

// ══════════════════════════════════════════════════════════════════════════════
// MERCEDES-EQ SUB-BRAND (补完 missing models)
// ══════════════════════════════════════════════════════════════════════════════

// EQA H243 (2021) — based on GLA H247
A(n('merc-eq-eqa','EQA H243',2021,'H243','mercedes-eqa','hatchback','electric','electric',140,'ev'))

// EQB V243 (2021) — based on GLB X247
A(n('merc-eq-eqb','EQB V243',2021,'V243','mercedes-eqb','suv','electric','electric',215,'ev'))

// G580 with EQ Technology (2024) — electric G-Class
A(n('merc-eq-g580','G580 EQ',2024,'W464','mercedes-g-electric','suv','electric','electric',587,'ev'))
E('me-g463b-to-g580','merc-g-w463b','merc-eq-g580','derived_from',0.85)

// EQC → EQA/EQB platform siblings (the MFA2 platform family)
E('me-eqc-to-eqa','merc-eq-eqc','merc-eq-eqa','influenced_by',0.5)
E('me-eqc-to-eqb','merc-eq-eqc','merc-eq-eqb','influenced_by',0.5)

// ── Save ──────────────────────────────────────────────────────────────────────
fs.writeFileSync(PATH,JSON.stringify(g,null,2),'utf8')
console.log('\n=== Mercedes Restructuring Applied ===')
log.forEach(l=>console.log(' ',l))
console.log('\n📊 Mercedes total nodes:', g.nodes.filter(n=>n.brandId==='mercedes').length)
console.log('   AMG standalone:', g.nodes.filter(n=>n.brandId==='mercedes'&&(n.id.includes('sls')||n.id.includes('amg-gt')||n.id.includes('amg-one'))).length)
console.log('   Maybach:', g.nodes.filter(n=>n.brandId==='mercedes'&&n.id.includes('maybach')).length)
console.log('   EQ electric:', g.nodes.filter(n=>n.brandId==='mercedes'&&n.id.includes('eq')).length)
