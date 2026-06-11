/**
 * validate-graph.js — QA-гейт для public/data/evolution/graph.json
 *
 * Кодифицирует все ручные проверки сессии. Запуск: `npm run validate`
 * (или автоматически в `npm run update:latest` после скрейпа/синка).
 * Выход 1 при ERROR — можно ставить в CI/пайплайн как гейт.
 *
 * ERROR (ломает выход): висячие рёбра, дубли id узлов, обратная хронология
 *   (evolves_into/concept_to_production/influenced_by — source новее target),
 *   кросс-брендовые evolves_into/variant_of/facelifted_to, ноды вне белого
 *   списка брендов, отсутствие обязательного поля (id/year/brandId/zone),
 *   дубли рёбер (один source→target→type).
 * WARN (не ломает): ncs-ноды без связей (ждут ручной привязки),
 *   неизвестная зона.
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')

const BRAND_WHITELIST = new Set([
  'bmw','mercedes','audi','volkswagen','porsche','ferrari','lamborghini','mclaren',
  'astonmartin','bugatti','pagani','koenigsegg','rimac','seat','skoda','lotus','maserati',
  'rolls-royce','bentley','gordon-murray','zenvo','de-tomaso','morgan','tvr','caterham',
  'pininfarina','hispano-suiza','hennessey','ssc','saleen',
  'toyota','lexus','honda','nissan','mazda','subaru','aspark',
])
const ZONES = new Set([
  'hypercar','supercar','sports','gt_coupe','open_top','flagship_sed','exec_sed',
  'midsize_sed','estate','suv_large','suv_mid','suv_compact','hatchback','electric',
  'pickup','concept','luxury','ultra-luxury',
])
const CHRONO_TYPES = ['evolves_into','concept_to_production','influenced_by']  // source.year ≤ target.year
const SAME_BRAND_TYPES = ['evolves_into','variant_of','facelifted_to']         // кросс-бренд = ошибка

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const errors = [], warns = []
const E = m => errors.push(m), W = m => warns.push(m)
const lbl = id => byId[id] ? `${byId[id].label}(${byId[id].year})` : `?${id}`

// 1. дубли id узлов
const idSeen = new Set()
g.nodes.forEach(n => { if (idSeen.has(n.id)) E(`дубль id узла: ${n.id}`); idSeen.add(n.id) })

// 2. обязательные поля
g.nodes.forEach(n => {
  if (!n.id) E(`узел без id: ${JSON.stringify(n).slice(0,60)}`)
  if (n.year == null) E(`нет year: ${n.id}`)
  if (!n.brandId) E(`нет brandId: ${n.id}`)
  if (!n.zone) E(`нет zone: ${n.id} (${n.label})`)
  else if (!ZONES.has(n.zone)) W(`неизвестная zone "${n.zone}": ${n.id}`)
})

// 3. бренды вне белого списка
const offBrands = {}
g.nodes.forEach(n => { if (n.brandId && !BRAND_WHITELIST.has(n.brandId)) (offBrands[n.brandId] ??= []).push(n.label) })
Object.entries(offBrands).forEach(([b, arr]) => E(`бренд вне белого списка "${b}": ${arr.length} нод (${arr.slice(0,3).join(', ')}${arr.length>3?'…':''})`))

// 4. висячие рёбра + 5. дубли рёбер
const edgeKey = new Set()
g.edges.forEach(e => {
  if (!byId[e.source]) E(`висячее ребро [${e.id}]: нет source ${e.source}`)
  if (!byId[e.target]) E(`висячее ребро [${e.id}]: нет target ${e.target}`)
  const k = `${e.source}|${e.target}|${e.type}`
  if (edgeKey.has(k)) E(`дубль ребра: ${lbl(e.source)} —${e.type}→ ${lbl(e.target)}`)
  edgeKey.add(k)
})

// 6. хронология
g.edges.forEach(e => {
  const s = byId[e.source], t = byId[e.target]
  if (!s || !t) return
  if (CHRONO_TYPES.includes(e.type) && s.year > t.year)
    E(`обратная хронология [${e.type}]: ${lbl(e.source)} → ${lbl(e.target)} (источник новее)`)
})

// 7. кросс-брендовые структурные связи
g.edges.forEach(e => {
  const s = byId[e.source], t = byId[e.target]
  if (!s || !t) return
  if (SAME_BRAND_TYPES.includes(e.type) && s.brandId !== t.brandId)
    E(`кросс-брендовое [${e.type}]: ${s.label}(${s.brandId}) → ${t.label}(${t.brandId})`)
})

// 8. сироты ncs- (предупреждение)
const connected = new Set()
g.edges.forEach(e => { connected.add(e.source); connected.add(e.target) })
g.nodes.filter(n => n.id.startsWith('ncs-') && !connected.has(n.id))
  .forEach(n => W(`ncs-нода без связей (ручная привязка): [${n.brandId}] ${n.label} (${n.year})`))

// ── отчёт ──────────────────────────────────────────────────────────────────────
console.log(`graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${new Set(g.nodes.map(n=>n.brandId)).size} брендов`)
if (warns.length)  { console.log(`\n⚠ WARN (${warns.length}):`);  warns.forEach(w => console.log('  ', w)) }
if (errors.length) { console.log(`\n✖ ERROR (${errors.length}):`); errors.forEach(e => console.log('  ', e)) }
if (!errors.length) console.log('\n✅ Валидация пройдена — критических проблем нет.')
process.exit(errors.length ? 1 : 0)
