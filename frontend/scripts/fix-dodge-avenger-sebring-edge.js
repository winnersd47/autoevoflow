#!/usr/bin/env node
// Точечный аддендум к fix-dodge-audit.js — обнаружен гонкой параллельных
// агентов (нормально по ТЗ, см. "concurrency" в обоих заданиях).
//
// Пока этот (dodge) проход переносил платформенные/генерационные связи с
// трима dodge-avenger-2 ("Avenger R/T") на новый базовый узел поколения
// dodge-avenger-2-base ("Avenger Gen.2") — см. fix-dodge-audit.js, п.5 — в
// это же время параллельный агент по Chrysler добавил СВОЙ узел
// chrysler-sebring-3 ("Chrysler Sebring Gen.3 (2007)") с ребром
// shares_platform → dodge-avenger-2 (R/T). Его же note прямым текстом
// называет цель «Dodge Avenger Gen.2/R/T» — т.е. тот же платформенный факт
// уровня ПОКОЛЕНИЯ (JS-платформа), который должен указывать на базовый узел
// генерации, а не конкретно на трим R/T (ровно та же логика, что уже
// применена к остальным платформенным/inspired_by рёбрам Avenger Gen.2 в
// fix-dodge-audit.js). Переставляю цель на dodge-avenger-2-base.
// Dodge-нода на этом ребре (target) — в зоне моей ответственности по ТЗ;
// узел-источник (Chrysler) не трогаю.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией.
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

const e = g.edges.find(x => x.id === 'e-chr-seb3-avenger2-platform')
if (!e) {
  console.log('  ⚠️  ребро e-chr-seb3-avenger2-platform не найдено — возможно уже исправлено или переименовано, пропускаю')
} else if (!byId.has('dodge-avenger-2-base')) {
  console.log('  ⚠️  dodge-avenger-2-base не найден на диске — fix-dodge-audit.js ещё не применён? пропускаю')
} else if (e.target === 'dodge-avenger-2-base') {
  console.log('  = уже исправлено:', e.id)
} else {
  console.log(`  🔀 ${e.id}: target ${e.target} → dodge-avenger-2-base`)
  e.target = 'dodge-avenger-2-base'
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
  console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер`)
}
