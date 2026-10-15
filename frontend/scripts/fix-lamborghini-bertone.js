#!/usr/bin/env node
// Bertone × Lamborghini — атрибуция уже существующих узлов (аналогично
// Touring × Aston Martin: Bertone проектировал СТАНДАРТНЫЙ кузов, не
// альтернативную спецверсию). Общеизвестные факты (дизайнер — Марчелло
// Гандини, работавший в Bertone): Miura (1966), Espada (1968), Jarama (1970),
// Countach (1974) — все спроектированы Bertone. NB: 350 GT (1964) — это
// Touring, НЕ Bertone (первый серийный Lamborghini, до начала сотрудничества
// с Bertone); LM002 (1986) — собственная разработка Lamborghini, тоже НЕ
// Bertone — оба сознательно НЕ трогаем.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

byId.get('lamborghini-miura').note = 'Дизайн — ателье Bertone (Марчелло Гандини) — первый совместный проект Lamborghini и Bertone, начало многолетнего партнёрства.'
byId.get('lambo-espada').note = 'Дизайн — Bertone (Марчелло Гандини), напрямую развивает язык форм концепта Marzal (1967, тоже Bertone/Гандини) — тот же гигантский плоский лобовой профиль и пропорции 2+2.'
byId.get('lambo-jarama').note = 'Дизайн — Bertone (Марчелло Гандини).'
byId.get('lamborghini-cnt').note = 'Дизайн — Bertone (Марчелло Гандини) — самый узнаваемый силуэт бренда, клиновидная форма и ножницы-двери определили язык Lamborghini на десятилетия вперёд.'

console.log('✅ lamborghini-miura / lambo-espada / lambo-jarama / lamborghini-cnt — note: атрибуция Bertone')
console.log('ℹ️  350 GT (Touring) и LM002 (собственная разработка) сознательно не тронуты — не Bertone')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово.`)
