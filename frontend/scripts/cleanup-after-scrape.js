/**
 * cleanup-after-scrape.js
 *
 * Уборка побочных эффектов прогона скрапера + обогащение Bentley:
 *  1) Дедуп нод с ОДИНАКОВЫМ id (Q7/SQ7 дублировались из-за бага candidateId≠node.id;
 *     баг уже исправлен в sync, тут чистим уже задвоенное).
 *  2) Удаление мусорных sync-ev рёбер: кросс-брендовых (Z→Mercedes из-за ключа 'z '
 *     поймавшего «benZ Amg») и нелепых по типу кузова (Z→Frontier, Eletre→Emira).
 *  3) Добавление 3 реальных Bentley EXP-концептов из улова (фильтр year≥2024 их не
 *     пустил): EXP 9 F (2012) →c2p→ Bentayga; EXP 10 Speed 6 (2015), EXP 100 GT (2019).
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = id => g.nodes.find(n => n.id === id)
const log = []

// ── 1) дедуп нод по id ───────────────────────────────────────────────────────
const seen = new Set(); const uniq = []
let dupN = 0
g.nodes.forEach(n => {
  if (seen.has(n.id)) { dupN++; log.push('− дубль ноды: '+n.id+' ('+n.label+')'); return }
  seen.add(n.id); uniq.push(n)
})
g.nodes = uniq

// ── 2) удаление мусорных sync-ev рёбер ───────────────────────────────────────
const nById = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const garbage = e => {
  if (!e.id || !e.id.startsWith('sync-ev-')) return false
  const s = nById[e.source], t = nById[e.target]
  if (!s || !t) return false
  if (s.brandId !== t.brandId) return true                      // кросс-брендовое evolves — всегда мусор
  if (s.id === 'nissan-z-rz34' && /frontier/i.test(t.id)) return true
  if (/eletre/i.test(s.id) && /emira/i.test(t.id)) return true
  return false
}
const keptEdges = []
g.edges.forEach(e => {
  if (garbage(e)) log.push('− мусор edge: '+(nById[e.source]?.label)+' → '+(nById[e.target]?.label)+' ['+e.id+']')
  else keptEdges.push(e)
})
g.edges = keptEdges

// ── 3) добавить Bentley EXP-концепты ─────────────────────────────────────────
const EID = new Set(g.nodes.map(n => n.id))
const EEI = new Set(g.edges.map(e => e.id))
const bn = (id,label,year,code,body,zone,hp,eng) => ({
  id, label, type:'generation', year, brandId:'bentley', brandName:'Bentley',
  codeName:code, modelSlug:'bentley-'+id.replace('bentley-',''), bodyType:body,
  segment:'premium', zone, hp, engineType:eng,
})
const A = nd => { if(!EID.has(nd.id)){ g.nodes.push(nd); EID.add(nd.id); log.push('+ node: '+nd.label+' ('+nd.year+')') } }
const E = (id,s,t,type,str=0.85) => {
  if(EEI.has(id)||!EID.has(s)||!EID.has(t)) return
  g.edges.push({id,source:s,target:t,type,strength:str}); EEI.add(id)
  log.push('+ edge: '+nById2(s)+' —'+type+'→ '+nById2(t))
}
const nById2 = id => (g.nodes.find(n=>n.id===id)||{}).label || id

A(bn('bentley-exp9f','EXP 9 F Concept',2012,'EXP9F','suv','concept',500,'v8t'))
A(bn('bentley-exp10-speed6','EXP 10 Speed 6 Concept',2015,'EXP10','coupe','concept',400,'v8t'))
A(bn('bentley-exp100gt','EXP 100 GT Concept',2019,'EXP100','coupe','concept',0,'ev'))
// EXP 9 F напрямую превью серийного Bentayga (2015)
E('bn-exp9f-bentayga','bentley-exp9f','bentley-bentayga','concept_to_production',0.85)
// EXP 10 Speed 6 и EXP 100 GT — концепты без прямого серийного потомка → standalone

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Уборка после скрапа + Bentley EXP ===')
log.forEach(l => console.log(' ', l))
console.log('\nДублей нод убрано:', dupN)
// контроль
const ids = new Set(g.nodes.map(n=>n.id))
const dangling = g.edges.filter(e=>!ids.has(e.source)||!ids.has(e.target)).length
const dupIds = g.nodes.length - new Set(g.nodes.map(n=>n.id)).size
console.log('Висячих рёбер:', dangling, dangling?'❌':'✅', '| дублей id осталось:', dupIds, dupIds?'❌':'✅')
console.log('Узлов:', g.nodes.length, '| рёбер:', g.edges.length)
