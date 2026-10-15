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
  'pininfarina','hispano-suiza','ford','hennessey','ssc','saleen','brabus',
  'toyota','lexus','honda','nissan','mazda','subaru','aspark','czinger',
  'alfa-romeo',
  'chrysler','kia','renault','peugeot',
  'hyundai','genesis',
  'mitsubishi','acura','infiniti',
  'jaguar','land-rover',
  'opel','saab','citroen','suzuki','isuzu',
  'buick','oldsmobile','plymouth','dacia','daihatsu','mercury','scion','smart','saturn',
  'gaz','lada','uaz','aurus','moskvich',
  'changan','byd','geely','nio','gac',
  'zeekr','lynk-co','haval','li-auto','xpeng',
  'chevrolet','dodge','cadillac',
  'volvo',
  'gmc','ram',
  'hudson','amc',
  // EV brands
  'tesla','polestar','rivian','lucid',
  // American classics
  'jeep','pontiac','lincoln','hummer',
  // European classics
  'lancia','alpine','fiat','mini','talbot',
  // SEAT spin-off
  'cupra',
  // Chinese EV / JV brands
  'seres','aito','denza','hiphi','avatr',
  // Low-volume / boutique performance
  'ariel','rezvani','ktm','bac','naran','gma',
  // Newer/niche 2025+ scraper finds
  'baic','ds','mg',
])
// Geographic/market zones used on nodes (not segments)
const ZONES = new Set([
  'eu','us','uk','jp','cn','au','global',
  'china_ev','ru','it','fr','de','se','kr',
  // legacy segment zone values kept for backwards compat
  'hypercar','supercar','sports','gt_coupe','open_top','flagship_sed','exec_sed',
  'midsize_sed','estate','suv_large','suv_mid','suv_compact','hatchback','electric',
  'pickup','concept','luxury','ultra-luxury',
  // extra found in the wild
  'sport','workhorse','offroad','muscle','track','racing',
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

// 2b. мощность (hp) — нужна раскладке «Мощность» (ось X). Скрапер netcarshow её
//     НЕ извлекает → узлы без hp падают в дефолтный бакет (~150 л.с.) и сбиваются
//     в крайний левый столбец. Новые ncs-узлы дозаполнять (см. scripts/fix-missing-hp.js).
const noHp = g.nodes.filter(n => typeof n.hp !== 'number' || !(n.hp > 0))
if (noHp.length) W(`без hp — ${noHp.length} узлов (в «Мощности» сядут в бакет ~150 л.с.): ${noHp.slice(0,6).map(n => n.id).join(', ')}${noHp.length > 6 ? '…' : ''}`)

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

// 9. ncs-узлы без brandId/brandName — «Rover Defender Vertex» вместо «Land Rover Defender Vertex»
g.nodes.filter(n => n.id.startsWith('ncs-') && (!n.brandId || !n.brandName))
  .forEach(n => W(`ncs-нода без brandId/brandName: ${n.id} label="${n.label}"`))

// 10. variant_of: цель слабее/новее источника (возможно перевёрнуто)
//     Паттерн ошибки: Trans Am WS6 → Firebird Gen4 (variant_of) — основа становится «пятиугольником»
g.edges.forEach(e => {
  if (e.type !== 'variant_of') return
  const s = byId[e.source], t = byId[e.target]
  if (!s || !t) return
  // Если у source меньше hp чем у target — возможно перевёрнуто (source должен быть базой)
  if (typeof s.hp === 'number' && typeof t.hp === 'number' && s.hp < t.hp - 50)
    W(`variant_of: source слабее target на >50 л.с. — возможно перевёрнуто? ${lbl(e.source)} hp=${s.hp} → ${lbl(e.target)} hp=${t.hp}`)
  // Если цель имеет много входящих evolves_into (она скорее всего базовая модель) — возможно перевёрнуто
})

// 11. Параллельные evolves_into с одного источника (может быть confusing на графике)
const multiOut = {}
g.edges.filter(e => e.type === 'evolves_into').forEach(e => {
  (multiOut[e.source] ??= []).push(e.target)
})
Object.entries(multiOut).filter(([,v]) => v.length > 1).forEach(([src, targets]) => {
  const s = byId[src]
  if (!s) return
  W(`дерево evolves_into: ${lbl(src)} → ${targets.length} потомков [${targets.map(t=>lbl(t)).join(', ')}] — рассмотреть variant_of`)
})

// 12. isLimited-кандидаты: модели с ≤30 экземплярами в названии (Imola, R, BC, Zonda, Edition)
//     Это ПРЕДУПРЕЖДЕНИЕ — не авто-ошибка, может быть намеренно
const limitedKeywords = /\bR\b|Imola|One:1|Regera|Final Edition|\bBC\b|Absolut|Naraya|Koenigsegg.+?(1|One)|Pagani.+?R$/i
g.nodes.filter(n => !n.isLimited && limitedKeywords.test(n.label || ''))
  .forEach(n => W(`кандидат на isLimited (без флага): ${n.id} — "${n.label}"`))

// 13. evolves_into, где имя цели структурно = "<имя источника без маркера поколения> + доп.
//     слово(а)" — почти всегда трим/эдишн ТОЙ ЖЕ генерации (SV, Homage, Impavido…), а не
//     новое поколение. Баг-триггер: sync-latest-to-project.js → findParentNode() → запись
//     SUCCESSORS без variant:true (см. isSameGenerationTrim в том же файле — тут та же
//     проверка продублирована, т.к. скрипты в проекте не шарят модули между собой).
//     Пример: Revuelto → evolves_into → Revuelto SV (правильно — variant_of).
const GEN_MARKERS_RE_ = /\b(gen\.?\s?\d+|mk\s?\d+|generation\s*\d*|\bii\b|\biii\b|\biv\b|\(\d{4}\)|\d{4})\b/gi
function looksLikeSameGenTrim(sourceNode, targetNode) {
  if (!sourceNode?.label || !targetNode?.label) return false
  const brand = sourceNode.brandName || sourceNode.brandId || ''
  const stripBrand = s => brand ? s.replace(new RegExp(`^${brand}\\s+`, 'i'), '') : s
  const normalize  = s => stripBrand(s).toLowerCase().replace(GEN_MARKERS_RE_, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const sourceCore = normalize(sourceNode.label)
  const targetCore = normalize(targetNode.label)
  if (sourceCore.length < 3 || !targetCore.startsWith(sourceCore)) return false
  return targetCore.slice(sourceCore.length).trim().length > 1
}
g.edges.filter(e => e.type === 'evolves_into').forEach(e => {
  const s = byId[e.source], t = byId[e.target]
  if (looksLikeSameGenTrim(s, t))
    W(`evolves_into похоже на трим/эдишн той же генерации, не новое поколение — рассмотреть variant_of: ${lbl(e.source)} → ${lbl(e.target)}`)
})

// ── отчёт ──────────────────────────────────────────────────────────────────────
console.log(`graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${new Set(g.nodes.map(n=>n.brandId)).size} брендов`)
if (warns.length)  { console.log(`\n⚠ WARN (${warns.length}):`);  warns.forEach(w => console.log('  ', w)) }
if (errors.length) { console.log(`\n✖ ERROR (${errors.length}):`); errors.forEach(e => console.log('  ', e)) }
if (!errors.length) console.log('\n✅ Валидация пройдена — критических проблем нет.')
process.exit(errors.length ? 1 : 0)
