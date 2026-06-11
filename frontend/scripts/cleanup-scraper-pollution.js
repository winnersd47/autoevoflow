/**
 * cleanup-scraper-pollution.js
 *
 * Уборка накопленного мусора авто-синка скрапера (решение пользователя:
 * «Полная уборка, но оставить Rolls-Royce + Bentley» = ровно 25 брендов).
 *
 * 1) Удалить ноды ВНЕ 25 курируемых брендов + все рёбра, их касающиеся.
 *    Сохранить: 23 из CLAUDE.md + rolls-royce + bentley.
 * 2) Починить brandId 'mercedes-benz' → 'mercedes' (или удалить как дубль,
 *    если AMG GT 4-Door уже есть в курируемом виде merc-amg-gt4-x290).
 * 3) Снять обратные evolves_into (source новее target) — мусор sync-ev.
 * 4) Контроль целостности: ни одно ребро не должно ссылаться на удалённую ноду.
 */
const fs   = require('fs')
const path = require('path')
const PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const log = []

const KEEP = new Set([
  // EU (17)
  'bmw','mercedes','audi','volkswagen','porsche','ferrari','lamborghini','mclaren',
  'astonmartin','bugatti','pagani','koenigsegg','rimac','seat','skoda','lotus','maserati',
  // JP (6)
  'toyota','lexus','honda','nissan','mazda','subaru',
  // оставлены по решению пользователя (2) → всего 25
  'rolls-royce','bentley',
])

const before = { nodes: g.nodes.length, edges: g.edges.length }
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

// ── 2) mercedes-benz: дубль AMG GT 4-Door? ──────────────────────────────────
const hasCuratedGt4 = g.nodes.some(n => n.id === 'merc-amg-gt4-x290')
g.nodes.filter(n => n.brandId === 'mercedes-benz').forEach(n => {
  const isGt4 = /gt\s*4/i.test(n.label)
  if (isGt4 && hasCuratedGt4) {
    n.__remove = true
    log.push('− дубль: '+n.label+' (есть merc-amg-gt4-x290)')
  } else {
    n.brandId = 'mercedes'; n.brandName = 'Mercedes-Benz'
    log.push('~ brandId: '+n.label+' mercedes-benz → mercedes')
  }
})

// ── 1) пометить вне-брендовые ноды на удаление ──────────────────────────────
g.nodes.forEach(n => {
  if (!KEEP.has(n.brandId) && n.brandId !== 'mercedes') n.__remove = true
})
const removedIds = new Set(g.nodes.filter(n => n.__remove).map(n => n.id))
g.nodes.filter(n => n.__remove && n.brandId !== 'mercedes').forEach(n =>
  log.push('− нода ['+n.brandId+']: '+n.label))

// применить удаление нод
g.nodes = g.nodes.filter(n => !n.__remove)
g.nodes.forEach(n => { delete n.__remove })

// ── удалить рёбра, касающиеся удалённых нод ─────────────────────────────────
let edgeRmNode = 0
g.edges = g.edges.filter(e => {
  if (removedIds.has(e.source) || removedIds.has(e.target)) { edgeRmNode++; return false }
  return true
})

// ── 3) снять обратные evolves_into среди оставшихся ─────────────────────────
const liveById = Object.fromEntries(g.nodes.map(n => [n.id, n]))
let edgeRmRev = 0
g.edges = g.edges.filter(e => {
  if (e.type === 'evolves_into' && (liveById[e.source]?.year) > (liveById[e.target]?.year)) {
    log.push('− обратное evolves_into: '+liveById[e.source]?.label+' ('+liveById[e.source]?.year+') → '+liveById[e.target]?.label+' ('+liveById[e.target]?.year+')')
    edgeRmRev++; return false
  }
  return true
})

fs.writeFileSync(PATH, JSON.stringify(g, null, 2), 'utf8')

// ── отчёт + контроль целостности ────────────────────────────────────────────
console.log('=== Уборка мусора скрапера ===')
log.forEach(l => console.log(' ', l))
console.log('\nУдалено нод:', before.nodes - g.nodes.length, '| рёбер всего:', before.edges - g.edges.length, '(по нодам '+edgeRmNode+', обратных '+edgeRmRev+')')

const ids = new Set(g.nodes.map(n => n.id))
const dangling = g.edges.filter(e => !ids.has(e.source) || !ids.has(e.target))
console.log('Целостность: висячих рёбер (ссылка на удалённую ноду):', dangling.length, dangling.length ? '❌' : '✅')

const brands = [...new Set(g.nodes.map(n => n.brandId))].sort()
console.log('Брендов в графе:', brands.length, '→', brands.join(', '))

const rev = g.edges.filter(e => e.type === 'evolves_into' && (liveById[e.source]?.year) > (liveById[e.target]?.year))
console.log('Обратных evolves_into осталось:', rev.length, rev.length ? '❌' : '✅')

// ноды-сироты среди ncs- (для информации — что осталось без связей)
const conn = new Set(); g.edges.forEach(e => { conn.add(e.source); conn.add(e.target) })
const floats = g.nodes.filter(n => n.id.startsWith('ncs-') && !conn.has(n.id))
console.log('\nИнфо: ncs- нод без связей (нужна ручная привязка родителя):', floats.length)
floats.forEach(n => console.log('   ['+n.brandId+']', n.label, '('+n.year+')'))
console.log('\nИтог: узлов', g.nodes.length, '| рёбер', g.edges.length)
