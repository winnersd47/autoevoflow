'use strict'
/**
 * fix-bmw-bodytype.js — живая находка пользователя: на /brand/bmw в категории
 * "Купе/GT" оказались X5 M60e, X3 M50 xDrive, iX4 — все SUV по названию
 * (BMW "X" + цифра — универсальное обозначение SUV/кроссовера бренда,
 * подтверждено 30+ уже существующими в графе X1-X7 узлами, ВСЕ bodyType=suv).
 * При проверке нашлось ещё несколько узлов того же скрейп-батча (ncs-bmw-2027-*)
 * с тем же паттерном — bodyType не совпадает с их же полем zone
 * (например m350-xdrive и 3-series оба имеют zone:"midsize_sed", но
 * bodyType:"coupe" — внутреннее противоречие в одном и том же узле).
 *
 * НЕ трогаю: 5 концепт-каров того же батча (Vision Alpina/M Neue Klasse/
 * Speedtop/Skytop/Vision Neue Klasse X Concept) — шоу-кары этого типа часто
 * ДЕЙСТВИТЕЛЬНО двухдверные купе, без реального подтверждения трогать не стал.
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const FIXES = {
  'ncs-bmw-2027-ix5':              'suv',   // BMW iX5 — электро-X5
  'ncs-bmw-2027-x5-m60e':          'suv',   // X5 M60e
  'ncs-bmw-2027-x3-m50-xdrive':    'suv',   // X3 M50 xDrive
  'ncs-bmw-2027-ix4':              'suv',   // iX4 — электро-X4, как и X4/X6 в графе = suv
  'ncs-bmw-2027-ix4-m60-xdrive':   'suv',   // iX4 M60 xDrive
  'ncs-bmw-2027-ix3-m60-xdrive':   'suv',   // iX3 M60 xDrive
  'ncs-bmw-2027-bmw-x5-first':     'suv',   // 2027 BMW X5 First
  'ncs-bmw-2027-3-series':         'sedan', // голое "3-Series" = седан (купе — это 4-Series); zone уже "midsize_sed"
  'ncs-bmw-2027-m350-xdrive':      'sedan', // zone:"midsize_sed" в том же узле противоречил bodyType:"coupe"
}

let fixed = 0
for (const [id, newType] of Object.entries(FIXES)) {
  const n = g.nodes.find(x => x.id === id)
  if (!n) { console.log(`  пропуск — не найден: ${id}`); continue }
  if (n.bodyType === newType) { console.log(`  уже верно: ${id}`); continue }
  console.log(`${id}: bodyType ${n.bodyType} → ${newType}`)
  n.bodyType = newType
  fixed++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`\nfixed ${fixed} nodes`)
console.log('Total:', g.nodes.length, 'nodes,', g.edges.length, 'edges')
