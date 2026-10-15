#!/usr/bin/env node
// Pininfarina × Ferrari — атрибуция самых знаковых узлов основной линейки
// (не весь массив в 82 узла — см. обсуждение с пользователем: это была бы
// задача другого порядка, не "добавить ателье", а "переосмыслить весь
// бренд"). 250 GTO сознательно ПРОПУЩЕН — там разделённое авторство
// (инженерия Джотто Биццаррини + кузов строил Скальетти + стиль Pininfarina),
// упрощать до одной атрибуции было бы неточно.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

const notes = {
  'ferrari-250gt': 'Дизайн — Pininfarina, начало десятилетий почти безраздельного партнёрства с Ferrari по кузовному дизайну.',
  'ferrari-275gtb': 'Дизайн — Pininfarina.',
  'ferrari-daytona-365': 'Дизайн — Pininfarina (Леонардо Фиораванти).',
  'ferrari-dino246': 'Дизайн — Pininfarina (Альдо Брованелли/Леонардо Фиораванти).',
  'ferrari-308': 'Дизайн — Pininfarina (Леонардо Фиораванти).',
  'ferrari-testarossa': 'Дизайн — Pininfarina.',
  'ferrari-f40': 'Дизайн — Pininfarina (команда Леонардо Фиораванти), с сильным вкладом собственных аэродинамиков Ferrari — экстремальная функциональная аэродинамика диктовала форму сильнее, чем на предыдущих моделях.',
}
for (const [id, note] of Object.entries(notes)) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  не найден:', id); continue }
  n.note = note
  console.log('  ✅', id, '— note добавлена')
}
console.log('ℹ️  250 GTO сознательно пропущен — разделённое авторство (Биццаррини/Скальетти/Pininfarina)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово.`)
