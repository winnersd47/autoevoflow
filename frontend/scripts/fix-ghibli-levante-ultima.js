#!/usr/bin/env node
// Завершение "полной проверки" линейки Maserati (2026-08-27). Ghibli/Levante/
// Quattroporte закончили производство в конце 2023 (подтверждено веб-поиском —
// autoguide/carscoops/jalopnik/media.maserati.com) БЕЗ преемника по сей день
// (текущий модельный ряд на maserati.com: Grecale/GranTurismo/GranCabrio/
// MCPura/GT2 Stradale — Quattroporte нет вообще, несмотря на анонс 2025 EV-
// преемника в 2023-м — планы, судя по всему, не реализовались). Существующая
// структура графа (обрыв на "Phase II" без продолжения) уже фактически верна
// для всех трёх линеек — НЕ трогаем.
//
// Единственный реальный пробел: прощальные лимитированные серии "Ultima" —
// V8 Твин-турбо 572hp (последний экземпляр легендарного V8 бренда), дебют на
// Goodwood FoS июль 2023. Ghibli 334 Ultima — 103 экз., Levante Ultima —
// 206 экз. (поровну между 2 цветами). Добавляем как isLimited-узлы,
// завершающие соответствующие цепочки.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

const ghibliUltima = {
  id: 'maserati-ghibli3-ultima', label: 'Ghibli 334 Ultima', fullName: 'Maserati Ghibli 334 Ultima',
  type: 'generation', year: 2023, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-ghibli', bodyType: 'sedan', segment: 'executive', zone: 'exec_sed',
  hp: 572, engineType: 'v8t', isLimited: true,
  note: 'Прощальная лимитированная серия — последний Ghibli с V8 Твин-турбо 572hp (тот же блок, что у Trofeo) перед полным прекращением производства модели в конце 2023-го. Дебют на Goodwood Festival of Speed, июль 2023. Тираж 103 экземпляра. Название "334" — по легендарному Maserati 450S "Ghibli" шасси №334 (гоночная история имени). После Ultima преемника у Ghibli нет по сей день (2026).',
}
const levanteUltima = {
  id: 'maserati-levante-ultima', label: 'Levante Ultima', fullName: 'Maserati Levante Ultima',
  type: 'generation', year: 2023, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-levante', bodyType: 'suv', segment: 'premium_suv', zone: 'suv_large',
  hp: 572, engineType: 'v8t', isLimited: true,
  note: 'Прощальная лимитированная серия — последний Levante с V8 Твин-турбо 572hp перед прекращением производства модели в конце 2023-го (преемника нет по сей день, 2026 — линейку заменил Grecale среднего класса). Дебют на Goodwood Festival of Speed, июль 2023. Тираж 206 экземпляров, поровну между 2 цветами кузова.',
}
graph.nodes.push(ghibliUltima, levanteUltima)
console.log('✅ добавлен:', ghibliUltima.label, '(' + ghibliUltima.year + ', ' + ghibliUltima.hp + 'hp, limited)')
console.log('✅ добавлен:', levanteUltima.label, '(' + levanteUltima.year + ', ' + levanteUltima.hp + 'hp, limited)')

graph.edges.push(
  { id: 'mas-ghibli3fl-to-ultima', source: 'maserati-ghibli3-fl', target: 'maserati-ghibli3-ultima', type: 'variant_of', strength: 0.85 },
  { id: 'mas-levantefl-to-ultima', source: 'maserati-levante-fl', target: 'maserati-levante-ultima', type: 'variant_of', strength: 0.85 },
)
console.log('✅ maserati-ghibli3-fl --[variant_of]--> maserati-ghibli3-ultima')
console.log('✅ maserati-levante-fl --[variant_of]--> maserati-levante-ultima')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
