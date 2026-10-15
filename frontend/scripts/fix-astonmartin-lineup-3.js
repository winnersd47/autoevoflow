#!/usr/bin/env node
// "Полная проверка" Aston Martin — часть 3: Vantage GT3 EVO (2024) — гоночная
// гомологация НОВОГО поколения Vantage. Подтверждено веб-поиском (motorsport.com/
// evo.co.uk/supercars.net/duPont Registry): представлена в 2024-м вместе с новым
// дорожным поколением, участвует в WEC/IMSA/GT World Challenge/ELMS/NLS, включая
// новый класс LMGT3. Старый узел astonmartin-vantage-gt3 (2019, derived_from
// СТАРОГО am-vantage2) остаётся как историческая, корректная для своей эпохи —
// НЕ трогаем и не удаляем.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const gt3evo = {
  id: 'am-vantage-gt3-evo', label: 'Vantage GT3 EVO', fullName: 'Aston Martin Vantage GT3 EVO',
  type: 'generation', year: 2024, brandId: 'astonmartin', brandName: 'Aston Martin',
  modelSlug: 'astonmartin-vantage-gt3-evo', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 550, engineType: 'v8t', isRacing: true,
  note: 'Гоночная гомологация НОВОГО (2024) поколения дорожного Vantage — заметно переработанная аэродинамика (особенно нос) и подвеска. Тот же 4.0Т Mercedes-AMG M177 V8, мощность регулируется BoP (Balance of Performance) как у всего класса GT3, ~550hp — сравнимо с предшественником. Участвует в WEC/IMSA/GT World Challenge/ELMS/NLS, включая новый класс LMGT3.',
}
graph.nodes.push(gt3evo)
console.log('✅ добавлен:', gt3evo.label, '(' + gt3evo.year + ', ' + gt3evo.hp + 'hp, racing)')

graph.edges.push({ id: 'am-vantage3-to-gt3evo', source: 'am-vantage3', target: 'am-vantage-gt3-evo', type: 'derived_from', strength: 0.85 })
console.log('✅ am-vantage3 --[derived_from]--> am-vantage-gt3-evo')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Часть 3 готова. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
