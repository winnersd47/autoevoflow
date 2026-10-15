#!/usr/bin/env node
/**
 * find-orphan-nodes.js — находит узлы графа, которые вообще ни с чем не
 * связаны (ноль рёбер). Специально нацелен на узлы, автоматически добавленные
 * sync-latest-to-project.js (isLatest:true / id с префиксом "ncs-") — эта часть
 * пайплайна НАМЕРЕННО не пытается угадать родителя без уверенного совпадения
 * (см. CLAUDE.md → "ловушка авто-родителя скрапера" — раньше автоматическое
 * "самая свежая нода бренда" давало мусорные рёбра), поэтому такие узлы
 * закономерно копятся без связей и раньше НИЧЕМ не подхватывались обратно —
 * только когда пользователь случайно замечал конкретный узел в интерфейсе.
 *
 * Список НЕ включает старые/фундаментальные пробелы данных (целые линейки
 * без цепочек эволюции — Citroën, Ariel, Scion, Pontiac и т.п.) — это другая,
 * гораздо более крупная задача, не относящаяся к недавней работе скрапера.
 *
 * Usage: node scripts/find-orphan-nodes.js [--out=path.json] [--all]
 *   --all — включить ВСЕ узлы без рёбер, а не только isLatest/ncs- (для
 *           отдельного, гораздо более крупного аудита старых пробелов)
 */
'use strict'
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const GRAPH_FILE = path.join(ROOT, 'public/data/evolution/graph.json')
const outArg = process.argv.find(a => a.startsWith('--out='))
const OUT_JSON = outArg ? outArg.slice(6) : path.join(ROOT, 'public/data/orphan-node-candidates.json')
const includeAll = process.argv.includes('--all')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const connected = new Set()
for (const e of graph.edges) { connected.add(e.source); connected.add(e.target) }

let orphans = graph.nodes.filter(n => !connected.has(n.id))
if (!includeAll) orphans = orphans.filter(n => n.isLatest === true || n.id.startsWith('ncs-'))

const result = orphans.map(n => ({
  id: n.id, label: n.label, brandId: n.brandId, brandName: n.brandName,
  year: n.year, hp: n.hp, engineType: n.engineType,
  sourceUrl: n.sourceUrl, description: n.description,
}))

console.log(`Узлов без единого ребра${includeAll ? '' : ' (только недавно добавленные скрапером)'}: ${result.length}`)
result.forEach(n => console.log('  ', n.id, '|', n.brandName || n.brandId, n.label, `(${n.year})`))

fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf8')
console.log(`\nЗаписано в ${OUT_JSON}`)
console.log('Каждый узел нужно проверить: реально ли не с чем связывать (одиночный')
console.log('концепт/спецверсия без родственников в графе), или родитель/донор есть,')
console.log('просто автоматика не рискнула угадывать — тогда добавить правильное ребро')
console.log('(evolves_into/variant_of/facelifted_to/derived_from/concept_to_production/')
console.log('inspired_by) по смыслу, не наугад.')
