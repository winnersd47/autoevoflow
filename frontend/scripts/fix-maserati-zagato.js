#!/usr/bin/env node
// Zagato × Maserati — по запросу пользователя (2026-08-31, "Делай все
// варианты"). Подтверждено веб-поиском (Wikipedia/conceptcarz/supercars.net/
// RM Sotheby's/Bonhams/carrozzieri-italiani/motor1, 2026-08-31):
//
//   A6G/2000 (база, 1954-56) — 60 шасси всего (кузова от Zagato/Allemano/
//     Frua/Vignale), 1985cc I6, 150hp (однобронировательный) → 160hp
//     (twin-spark, с 1956).
//   A6G/2000 Zagato — 21 экземпляр (20 берлинетта + 1 спайдер), та же
//     мощность 150→160hp. "Double bubble" крыша — НЕ родилась на этой машине
//     (впервые была на Fiat 8V Zagato 1952-55) и встречается лишь на 2 из 21
//     экземпляров — не характерная черта, упомянуто честно в note.
//   A6 1500 "Panoramica" (1948-49) — ПЕРВАЯ известная коллаборация Maserati
//     × Zagato вообще, one-off, большая застеклённая "панорамная" крыша
//     (запатентованный приём Zagato).
//   450S "Costin-Zagato" (1957) — one-off аэродинамическое купе (инженер
//     Фрэнк Костин + постройка Zagato) ОТДЕЛЬНО от стандартного родстера
//     450S работы Fantuzzi ("Il Mostro") — сам родстер 450S НЕ в графе,
//     оставляем корневым узлом, честно отмечено в note. Гонялся на Ле-Мане
//     1957 (Мосс/Шелл), лидировал, сошёл.
//   Zagato Mostro (2015-16, 5 экз.) — трибьют-концепт к 450S "Mostro" на
//     100-летие Maserati, силовая установка Maserati. → Mostro Barchetta
//     (2022-25) — открытая версия.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. A6 1500 Panoramica (1948-49) — первая коллаборация, one-off ===')
const panoramica = {
  id: 'maserati-a6-1500-panoramica', label: 'A6 1500 Panoramica', fullName: 'Maserati A6 1500 Panoramica',
  type: 'generation', year: 1948, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-a6-1500-panoramica', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 65, engineType: 'i6', isLimited: true,
  note: 'Первая известная коллаборация Maserati × Zagato — перекузовка шасси A6 1500 (шасси №052), 1948-49. Большая застеклённая "панорамная" крыша — запатентованный приём Zagato ("Panoramica"). One-off.',
}
graph.nodes.push(panoramica)
console.log('  ✅ добавлен A6 1500 Panoramica (без входящего ребра — база A6 1500 не в графе)')

console.log('\n=== 2. A6G/2000 (база, 1954-56) + A6G/2000 Zagato (21 экз.) ===')
const a6g2000 = {
  id: 'maserati-a6g2000', label: 'A6G/2000', fullName: 'Maserati A6G/2000',
  type: 'generation', year: 1954, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-a6g2000', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 150, engineType: 'i6',
  note: 'Всего 60 шасси (1954-56), кузова от четырёх разных ателье — Zagato, Allemano, Frua, Vignale (см. A6G/2000 Zagato). 2.0Л (1985cc) DOHC I6 на базе гоночного A6GCS, 150hp @ 6000 (однобронировательное зажигание) → 160hp с 1956г. (twin-spark).',
}
const a6g2000zagato = {
  id: 'maserati-a6g2000-zagato', label: 'A6G/2000 Zagato', fullName: 'Maserati A6G/2000 Zagato',
  type: 'generation', year: 1954, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-a6g2000', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 150, engineType: 'i6', isLimited: true,
  note: '21 экземпляр (20 берлинетта + 1 спайдер, шасси №2101) — первый показан на Женевском салоне 1955г. Та же мощность 150→160hp, что у остальных кузовов A6G/2000. Фирменная "double bubble" крыша Zagato (которая НЕ родилась на этой машине — впервые появилась на Fiat 8V Zagato 1952-55г.) встречается лишь на 2 из 21 экземпляров (№2121 изначально, №2155 — после ребилда после аварии на Милле Милья-1956). Победа в чемпионате Италии по спорт-карам 1956г.',
}
graph.nodes.push(a6g2000, a6g2000zagato)
graph.edges.push({ id: 'maserati-a6g2000-to-zagato', source: 'maserati-a6g2000', target: 'maserati-a6g2000-zagato', type: 'derived_from', strength: 0.85 })
console.log('  ✅ добавлены A6G/2000 (база) + A6G/2000 Zagato, derived_from')

console.log('\n=== 3. 450S "Costin-Zagato" (1957) — one-off, корневой узел ===')
const costinZagato = {
  id: 'maserati-450s-costin-zagato', label: '450S Costin-Zagato', fullName: 'Maserati 450S Costin-Zagato',
  type: 'generation', year: 1957, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-450s-costin-zagato', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 400, engineType: 'v8', isRacing: true, isLimited: true,
  note: 'One-off аэродинамическое купе — инженер Фрэнк Костин спроектировал низкий фастбэк-кузов, построен Zagato в спешке перед Ле-Маном 1957г., ОТДЕЛЬНО от стандартного родстера 450S работы Fantuzzi ("Il Mostro", не в графе). За рулём Стирлинг Мосс/Гарри Шелл лидировали гонку, до 2-го места, сошли.',
}
graph.nodes.push(costinZagato)
console.log('  ✅ добавлен 450S Costin-Zagato (без входящего ребра — стандартный родстер 450S не в графе)')

console.log('\n=== 4. Zagato Mostro (2015-16, 5 экз.) → Mostro Barchetta (2022-25) ===')
const mostro = {
  id: 'maserati-zagato-mostro', label: 'Zagato Mostro', fullName: 'Maserati Zagato Mostro',
  type: 'generation', year: 2015, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-zagato-mostro', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 700, engineType: 'v8t', isLimited: true,
  note: 'Трибьют-концепт к 100-летию Maserati и к историческому 450S "Il Mostro" — силовая установка Maserati (Trofeo-класса V8), кузов и постройка Zagato. 5 экземпляров, 2015-16.',
}
const mostroBarchetta = {
  id: 'maserati-zagato-mostro-barchetta', label: 'Zagato Mostro Barchetta', fullName: 'Maserati Zagato Mostro Barchetta',
  type: 'generation', year: 2022, brandId: 'maserati', brandName: 'Maserati',
  modelSlug: 'maserati-zagato-mostro', bodyType: 'roadster', segment: 'racing', zone: 'racing',
  hp: 700, engineType: 'v8t', isLimited: true,
  note: 'Открытая версия Zagato Mostro — та же силовая установка, бесподиумный/бесшовный мелкосерийный выпуск, 2022-25.',
}
graph.nodes.push(mostro, mostroBarchetta)
graph.edges.push({ id: 'maserati-mostro-to-barchetta', source: 'maserati-zagato-mostro', target: 'maserati-zagato-mostro-barchetta', type: 'variant_of', strength: 0.85 })
console.log('  ✅ добавлены Zagato Mostro + Mostro Barchetta, variant_of')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
