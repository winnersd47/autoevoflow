#!/usr/bin/env node
// Правки по итогам независимой проверки (2026-08-27) добавленной ранее ветки
// GranTurismo/GranCabrio Mk2 — см. предыдущий батч-скрипт для контекста.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== 1. Год GranCabrio Modena: 2027 → 2025 (реально MY2025, ДО рестайлинга, не одновременно) ===')
const gcModena = byId.get('maserati-grancabrio2-modena')
gcModena.year = 2025
gcModena.note = 'Базовый (самый доступный) трим GranCabrio Mk2 — тот же 3.0Т V6 Nettuno, что у Trofeo, но 483hp/442 lb-ft, макс. 186mph. GranCabrio стартовал в продаже в 2024-м сразу в топовом Trofeo — Modena добавлен на MY2025 как более доступный вход в линейку (примерно годом раньше рестайлинга 2027, не одновременно с ним, как считалось изначально).'
console.log('  ✅', gcModena.label, '→ год', gcModena.year)

console.log('\n=== 2. Запас хода GT Folgore Facelift — перепутано с Grecale Folgore при первом поиске ===')
const gtFolgoreFl = byId.get('maserati-granturismo2-folgore-fl')
gtFolgoreFl.note = 'Мощность без изменений (751hp), запас хода увеличен до ~250+ миль (было 242 мили у версии \'26). Исправлено 2026-08-27 независимой проверкой: изначально указанные 268 миль/+29 миль реально относятся к Grecale Folgore (другая модель, SUV), не к GranTurismo — перепутано при первом исследовании.'
console.log('  ✅ поправлена note у', gtFolgoreFl.label)

console.log('\n=== 3. GranCabrio Folgore Facelift — независимая проверка нашла прямые источники (не только "по аналогии") ===')
const gcFolgoreFl = byId.get('maserati-grancabrio2-folgore-fl')
gcFolgoreFl.note = 'Подтверждено независимой проверкой 2026-08-27 прямыми источниками (включая собственную страницу Maserati) — изначально было отмечено как "по аналогии с купе", теперь фактически: тот же прирост запаса хода WED, что у купе-версии, новый бампер/решётка/фонари, руль с плоским основанием снизу, PRND-селектор с металлической отделкой, цифровые часы на приборной панели. Снижение цены на американском рынке примерно с $207.6К до $151.2К.'
console.log('  ✅ обогащена note у', gcFolgoreFl.label)

console.log('\n=== 4. Код платформы M180 → M189 у ВСЕХ узлов GranTurismo Mk2 (общий код с GranCabrio, не отдельный) ===')
const gtIds = [
  'maserati-granturismo2', 'maserati-granturismo2-trofeo', 'ncs-maserati-2027-granturismo',
  'maserati-granturismo2-fl', 'maserati-granturismo2-trofeo-fl', 'maserati-granturismo2-folgore-fl',
]
for (const id of gtIds) {
  const n = byId.get(id)
  if (n && n.codeName && n.codeName.startsWith('M180')) {
    const old = n.codeName
    n.codeName = n.codeName.replace('M180', 'M189')
    console.log('  ✅', id, ':', old, '→', n.codeName)
  } else {
    console.log('  ⚠️  пропущен (не найден или неожиданный codeName):', id, n && n.codeName)
  }
}

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log('\n✅ Готово.')
