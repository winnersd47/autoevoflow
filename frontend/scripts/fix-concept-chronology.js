/**
 * fix-concept-chronology.js
 *
 * Чинит 2 связи concept_to_production, где концепт НОВЕЕ «production»-цели
 * (нарушение: концепт обязан быть ПРЕДШЕСТВЕННИКОМ, year(концепт) ≤ year(цель)).
 *
 * 1) Nissan IMs Concept (2019) →c2p→ Leaf 2nd Gen (2017)  ❌ (цель старше концепта)
 *    Реально IMs превью серийного Nissan Ariya (2021). Ariya в графе НЕТ —
 *    добавляем ноду Ariya и перецепляем связь: IMs (2019) →c2p→ Ariya (2021) ✅
 *
 * 2) Lexus LF-1 Limitless (2018) →c2p→ Lexus LC500 (2017) ❌ (LC500 — купе, и старше)
 *    LF-1 «Limitless» — флагманский кроссовер-концепт, чей дизайн воплотился в
 *    5-м поколении RX. Перецепляем: LF-1 (2018) →c2p→ RX AL30 (2022) ✅
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const EID  = new Set(g.nodes.map(n => n.id))
const log  = []

// ── 1) Nissan Ariya — добавить недостающую серийную модель ──────────────────
if (!EID.has('nissan-ariya')) {
  g.nodes.push({
    id:'nissan-ariya', label:'Ariya', type:'generation', year:2021,
    brandId:'nissan', brandName:'Nissan', codeName:'FE0', modelSlug:'nissan-ariya',
    bodyType:'suv', segment:'electric', zone:'electric', hp:389, engineType:'ev',
  })
  EID.add('nissan-ariya'); byId['nissan-ariya']=g.nodes[g.nodes.length-1]
  log.push('+ node: Nissan Ariya (2021, electric)')
}

// ── перецепка обеих связей (мутируем target + id у существующих рёбер) ────────
const retarget = (edgeId, newTarget, newId) => {
  const e = g.edges.find(x => x.id === edgeId)
  if (!e) { log.push('✗ ребро '+edgeId+' не найдено'); return }
  if (!EID.has(newTarget)) { log.push('✗ цель '+newTarget+' отсутствует'); return }
  const oldT = byId[e.target]?.label, src = byId[e.source]?.label
  e.target = newTarget
  if (newId) e.id = newId
  log.push('~ '+src+': c2p → было ['+oldT+'] → стало ['+byId[newTarget].label+'] ('+byId[e.source].year+'≤'+byId[newTarget].year+')')
}
retarget('c2p-concept-nissan-ims', 'nissan-ariya',  'c2p-nissan-ims-ariya')
retarget('c2p-concept-lexus-lf1',  'lexus-rx-al30', 'c2p-lexus-lf1-rxal30')

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Фикс хронологии концептов ===')
log.forEach(l => console.log(' ', l))

// ── контроль: 0 нарушений concept_to_production по всему графу ────────────────
const bad = g.edges.filter(e => e.type==='concept_to_production' &&
  (byId[e.source]?.year) > (byId[e.target]?.year))
console.log('\nНарушений concept_to_production (концепт новее цели):', bad.length, bad.length?'❌':'✅')
bad.forEach(e => console.log('   ', byId[e.source].label, byId[e.source].year, '>', byId[e.target].label, byId[e.target].year))
console.log('Узлов:', g.nodes.length, '| рёбер:', g.edges.length)
