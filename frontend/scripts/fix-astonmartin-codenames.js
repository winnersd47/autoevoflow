#!/usr/bin/env node
// Заполняем codeName у 34 узлов Aston Martin, добавленных в этой сессии без
// него. Где нашли настоящий внутренний код платформы (веб-поиск,
// astonmartins.com/Wikipedia/media.astonmartin.com, 2026-08-31) — используем
// его; иначе — имя трима, как уже принято у существующих узлов (напр.
// am-vanquish-2024: codeName "Vanquish", am-db12-s-volante: "DB12 S").
//
// Настоящие коды платформ: Vanquish 2001 = "Project Vantage" (реальное
// внутреннее имя проекта до запуска), Vanquish 2012 = AM310, DBS Superleggera
// = AM7 (включая Volante/770 Ultimate/GT Zagato — тот же каркас), DBX = AM8
// (включая 707/S), Vantage 2018+ = AM6 (ПОДТВЕРЖДЕНО: обновление 2024г. —
// доработка того же поколения "AM6", не новая платформа, несмотря на
// маркетинговую подачу как "нового поколения" — Aston Martin переиспользует
// коды платформ только при реально новом каркасе).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

const codeNames = {
  'am-db4-gt-zagato': 'DB4 GT Zagato',
  'am-v8-zagato': 'V8 Zagato',
  'am-vanquish1': 'Project Vantage',
  'am-db7-zagato': 'DB7 Zagato',
  'am-db-ar1': 'DB AR1',
  'am-v12-zagato': 'V12 Zagato',
  'am-vanquish2': 'AM310',
  'am-vanquish-zagato': 'Vanquish Zagato',
  'am-vanquish-zagato-volante': 'Vanquish Zagato Volante',
  'am-vanquish-zagato-shooting-brake': 'Vanquish Zagato Shooting Brake',
  'am-vanquish-zagato-speedster': 'Vanquish Zagato Speedster',
  'am-dbs-superleggera': 'AM7',
  'am-dbs-superleggera-volante': 'AM7',
  'am-db4-gt-zagato-continuation': 'DB4 GT Zagato Continuation',
  'am-dbs-gt-zagato': 'AM7',
  'am-dbx': 'AM8',
  'am-dbx707': 'AM8',
  'am-valkyrie-spider': 'Valkyrie Spider',
  'am-db12-volante': 'DB12 Volante',
  'am-valour': 'Valour',
  'am-dbs-770-ultimate': 'AM7',
  'am-db12-s': 'DB12 S',
  'am-vantage3': 'AM6',
  'am-vantage-gt3-evo': 'Vantage GT3 EVO',
  'am-valiant': 'Valiant',
  'am-vantage-gt4': 'Vantage GT4',
  'am-vantage3-s': 'AM6',
  'am-vantage3-roadster': 'AM6',
  'am-vanquish-volante': 'Vanquish Volante',
  'am-valkyrie-amr-lmh': 'Valkyrie AMR-LMH',
  'ncs-astonmartin-2028-martin-valen': 'Valen',
  'am-db12-volante-60th': 'DB12 Volante 60th',
  'am-dbx-s': 'AM8',
  'am-valkyrie-lm': 'Valkyrie LM',
}

let filled = 0, missing = 0
for (const [id, code] of Object.entries(codeNames)) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  не найден узел:', id); missing++; continue }
  n.codeName = code
  filled++
  console.log('  ✅', id, '→ codeName:', code)
}

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Заполнено: ${filled}, не найдено: ${missing}`)
