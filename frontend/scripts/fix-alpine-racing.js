#!/usr/bin/env node
// По запросу пользователя (2026-08-31, скриншот кластера Alpine + "Тут есть
// модификации? В том числе гоночные?"). В графе НИ ОДНОГО гоночного узла у
// Alpine не было — при том, что бренд выиграл Ле-Ман (1978) и первый в
// истории чемпионат WRC (1973). Плюс 2 попутных бага в существующих рёбрах.
// Подтверждено веб-поиском (Wikipedia/supercars.net/24h-lemans.com/Goodwood/
// evo.co.uk/alpine-cars.co.uk, 2026-08-31):
//
//   A442B (1978) — победитель Ле-Ман'78 (Жоссо/Пиронди), ПЕРВЫЙ в истории
//     турбированный победитель Ле-Мана. 2.0Л турбо V6 (Renault-Gordini),
//     ~490-500hp. Чисто гоночный прототип, не имеет отношения к дорожным
//     A110/A310 механически → корневой узел.
//   A110 1800 Gr.IV (1973) — заводская раллийная спецификация (увеличенный
//     до 1.8Л мотор) на базе A110 1600S — выиграла ПЕРВЫЙ в истории титул
//     WRC Manufacturers' (1973), 6 побед в сезоне, весь подиум Монте-Карло.
//   A110 Cup / A110 GT4 Evo / A110 Rally (2022) — современные клиентские
//     гоночные версии текущего поколения A110 (2017+). GT4 Evo: 1.8Т I4,
//     350-400hp (BoP). Rally: 300hp, разработана с Signatech — возврат
//     Alpine в ралли впервые с 1973-го.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 0. Чиним 2 бага в существующих рёбрах ===')
const a290edge = graph.edges.find(e => e.id === 'e-alp-a110mod-a290')
a290edge.strength = 0.8
console.log('  ✅ alpine-a110-2017 -> alpine-a290: strength 0.72 → 0.8 (было ниже порога видимости 0.78)')
const before = graph.edges.length
graph.edges = graph.edges.filter(e => e.id !== 'e-alp-a110-s-r')
console.log('  ✅ убрано задвоенное ребро alpine-a110-s -> alpine-a110-r (R и так подключена от базы)', '(-' + (before - graph.edges.length) + ')')

console.log('\n=== 1. A442B (1978) — победитель Ле-Ман, корневой узел ===')
const a442 = {
  id: 'alpine-a442b', label: 'A442B', fullName: 'Alpine A442B',
  type: 'generation', year: 1978, brandId: 'alpine', brandName: 'Alpine',
  modelSlug: 'alpine-a442', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 500, engineType: 'v6t', isRacing: true,
  note: 'Победитель "24 часов Ле-Мана" 1978г. (экипаж Жан-Пьер Жоссо / Дидье Пиронди) — ПЕРВЫЙ в истории гонки победитель с турбонаддувом. 2.0Л турбо V6 Renault-Gordini (Garrett turbo), ~500hp. Версия "B" отличалась прозрачным аэродинамическим коконом над кокпитом. Чисто гоночный прототип — не связан механически с дорожными A110/A310.',
}
graph.nodes.push(a442)
console.log('  ✅ добавлен A442B (без входящего ребра — самостоятельная гоночная программа)')

console.log('\n=== 2. A110 1800 Gr.IV (1973) — заводская раллийная спецификация, чемпион WRC ===')
const a110rally1973 = {
  id: 'alpine-a110-1800-gr4', label: 'A110 1800 Gr.IV', fullName: 'Alpine A110 1800 Gr.IV',
  type: 'generation', year: 1973, brandId: 'alpine', brandName: 'Alpine',
  modelSlug: 'alpine-a110', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 170, engineType: 'i4', isRacing: true,
  note: 'Заводская раллийная спецификация (увеличенный до 1.8Л мотор, группа IV) на базе A110 1600S — выиграла ПЕРВЫЙ в истории титул производителей WRC (1973): 6 побед за сезон, весь подиум на Ралли Монте-Карло.',
}
graph.nodes.push(a110rally1973)
graph.edges.push({ id: 'alpine-a1101600s-to-rally1973', source: 'alpine-a110-1600s', target: 'alpine-a110-1800-gr4', type: 'derived_from', strength: 0.85 })
console.log('  ✅ добавлен A110 1800 Gr.IV, alpine-a110-1600s --[derived_from]--> alpine-a110-1800-gr4')

console.log('\n=== 3. Современные клиентские гоночные версии A110 (2017+) ===')
const a110cup = {
  id: 'alpine-a110-cup', label: 'A110 Cup', fullName: 'Alpine A110 Cup',
  type: 'generation', year: 2018, brandId: 'alpine', brandName: 'Alpine',
  modelSlug: 'alpine-a110', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 300, engineType: 'i4t', isRacing: true,
  note: 'Клиентская гоночная (кубковая) версия текущего A110 — моно-кубок Alpine Elf Europa Cup.',
}
const a110gt4 = {
  id: 'alpine-a110-gt4-evo', label: 'A110 GT4 Evo', fullName: 'Alpine A110 GT4 Evo',
  type: 'generation', year: 2018, brandId: 'alpine', brandName: 'Alpine',
  modelSlug: 'alpine-a110', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 400, engineType: 'i4t', isRacing: true,
  note: 'Гомологация класса GT4 — 1.8Т I4, 350-400hp (BoP-регулируется), 312 л.с./тонну.',
}
const a110rally2022 = {
  id: 'alpine-a110-rally', label: 'A110 Rally', fullName: 'Alpine A110 Rally',
  type: 'generation', year: 2022, brandId: 'alpine', brandName: 'Alpine',
  modelSlug: 'alpine-a110', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 300, engineType: 'i4t', isRacing: true,
  note: 'Разработана совместно со Signatech для приватных раллийных команд — возврат Alpine в ралли впервые с 1973-го. 300hp.',
}
graph.nodes.push(a110cup, a110gt4, a110rally2022)
graph.edges.push(
  { id: 'alpine-a1102017-to-cup', source: 'alpine-a110-2017', target: 'alpine-a110-cup', type: 'derived_from', strength: 0.85 },
  { id: 'alpine-a1102017-to-gt4', source: 'alpine-a110-2017', target: 'alpine-a110-gt4-evo', type: 'derived_from', strength: 0.85 },
  { id: 'alpine-a1102017-to-rally2022', source: 'alpine-a110-2017', target: 'alpine-a110-rally', type: 'derived_from', strength: 0.85 },
)
console.log('  ✅ добавлены A110 Cup / A110 GT4 Evo / A110 Rally, все derived_from alpine-a110-2017')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
