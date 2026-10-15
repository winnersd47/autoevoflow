#!/usr/bin/env node
// По запросу пользователя (2026-08-27, "А MC12 GT1?") — та же проверка гоночных
// вариантов, что делали для Koenigsegg CCGT1 ранее в этой сессии. Подтверждено
// веб-поиском (dailysportscar/motorauthority/wikipedia + maserati.com/motorauthority/
// jalopnik/girardo для Versione Corse): у дорожного MC12 (уже в графе, 630hp)
// ДВЕ реальные производные, обе полностью отсутствовали:
//
//   MC12 GT1 — заводская гоночная гомологация для FIA GT. Дебют — Имола, конец
//     сезона 2004; с 2005-го доминировала до 2010-го включительно (в 2011-м
//     заявок не было) — 6 Кубков конструкторов команд (FIA Teams'), 2 FIA GT
//     Constructors', 6 Drivers', 40+ побед в гонках. Тот же 6.0Т V12, НО по
//     регламенту обязателен рестриктор воздухозабора → МЕНЬШЕ мощности, чем у
//     дорожной версии: 580 л.с. (не 630, как у Stradale).
//
//   MC12 Versione Corse — сверхлимитированная трек-only машина для частных
//     клиентов (аналог Ferrari FXX по концепции — не для гонок, не для дорог,
//     только трек). Произведена от шасси GT1, но БЕЗ регламентных ограничений
//     FIA GT → тот же V12 БЕЗ рестриктора = 755hp (больше, чем и Stradale,
//     И GT1). Всего 14 экземпляров: 12 клиентских + 1 прототип + 1 дорожно-
//     легальный экземпляр 2014 года к 100-летию бренда.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const gt1 = {
  id: 'maserati-mc12-gt1', label: 'MC12 GT1', fullName: 'Maserati MC12 GT1',
  type: 'generation', year: 2004, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-mc12', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 580, engineType: 'v12', isRacing: true, isLimited: true,
  note: 'Заводская гоночная гомологация MC12 для FIA GT Championship (класс GT1). Дебют — Имола, конец сезона 2004; доминировала с 2005 по 2010 (в 2011-м заявок не подавали). Итог: 6 FIA GT Teams\' Championships, 2 FIA GT Constructors\' Championships, 6 Drivers\' Championships, 40+ побед в гонках. Тот же 6.0Л V12, но с обязательным по регламенту рестриктором воздухозабора — МЕНЬШЕ мощности, чем у дорожной Stradale: 580hp против 630hp.',
}
const corse = {
  id: 'maserati-mc12-versione-corse', label: 'MC12 Versione Corse', fullName: 'Maserati MC12 Versione Corse',
  type: 'generation', year: 2005, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-mc12', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 755, engineType: 'v12', isLimited: true,
  note: 'Сверхлимитированная трек-only машина для частных клиентов (концепция как у Ferrari FXX — не для гонок, не для дорог, только трек; Maserati хранила и обслуживала машины владельцев). Построена на шасси MC12 GT1 (тот же хвост/аэродинамика гонщика), но БЕЗ регламентных ограничений FIA GT → тот же 6.0Л V12 без рестриктора = 755hp (больше и Stradale, и GT1). Всего 14 экземпляров: 12 клиентских + 1 прототип + 1 дорожно-легальный к 100-летию Maserati (2014).',
}
graph.nodes.push(gt1, corse)
console.log('✅ добавлен:', gt1.label, '(' + gt1.year + ', ' + gt1.hp + 'hp, racing+limited)')
console.log('✅ добавлен:', corse.label, '(' + corse.year + ', ' + corse.hp + 'hp, limited)')

graph.edges.push(
  { id: 'mas-mc12-to-gt1', source: 'maserati-mc12', target: 'maserati-mc12-gt1', type: 'derived_from', strength: 0.9 },
  { id: 'mas-mc12gt1-to-corse', source: 'maserati-mc12-gt1', target: 'maserati-mc12-versione-corse', type: 'derived_from', strength: 0.85 },
)
console.log('✅ maserati-mc12 --[derived_from]--> maserati-mc12-gt1')
console.log('✅ maserati-mc12-gt1 --[derived_from]--> maserati-mc12-versione-corse')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
