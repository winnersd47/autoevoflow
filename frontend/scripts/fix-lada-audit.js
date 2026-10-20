#!/usr/bin/env node
// Lada/АвтоВАЗ: аудит 15 узлов бренда. Найдено и исправлено:
//  - Пропуск поколения ВАЗ-2105/2107 (1980-2012, самое долгоживущее семейство
//    Lada) между 2103/2106(1972) и 2110(1995) — 20-летняя дыра. 2105(1980) —
//    рестайлинг-замена базового 2101; 2107(1982) — рестайлинг-замена 2103/2106,
//    изначально ставились ИХ ЖЕ моторы 1.5/1.6л. Добавлен один узел (по тому же
//    принципу слияния, что уже применён к 2103/2106 в этом графе), встроен в
//    цепь 2103→2105→2110 (приём "вставить пропущенное звено" как в fix-opel-audit.js).
//  - Пропуск поколения Samara-2 (ВАЗ-2113/2114/2115, 1997-2013) между 2108(1984)
//    и Kalina(2004) — тот же приём вставки звена: 2108→Samara-2→Kalina.
//  - ОШИБОЧНАЯ линия наследования Priora: ребро шло Samara(2108)→Priora, хотя
//    Priora — глубокая модернизация именно семейства ВАЗ-2110 (950+ изменений,
//    сменила "Lada 110" в 2009г), к Самаре отношения не имеет. Перецепляем
//    источник на lada-2110. Заодно у Vesta (объявлена как замена ИМЕННО Priora
//    на ММАС-2014, продажи с 2015) источник ребра был 2110 напрямую — вставляем
//    пропущенное звено: 2110→Priora→Vesta (та же проблема "skip-generation",
//    что и у 2105/2107 выше).
//  - 2 опечатки типа ребра "inspired" (без "_by") — тот же класс бага, что и
//    почти у всех брендов в этой сессии (Škoda/VW/Tesla/Geely/BYD/Changan).
//  - lada-niva-2121 →(evolves_into)→ lada-niva-travel: фактически НЕ эволюция.
//    Niva Travel — это ВАЗ-2123, отдельный проект СП GM-АвтоВАЗ (другая
//    колёсная база 2.45м), запущенный в 1998-2002г и продававшийся ПАРАЛЛЕЛЬНО
//    с классической Нивой 20+ лет под именем "Chevrolet Niva" до ребрендинга в
//    "Lada Niva Travel" 21.12.2020 (тогда же 2121/21214 стала "Niva Legend").
//    Меняем на inspired_by — та же конвенция "одна марка, разные одновременные
//    модели", что и у Geely Atlas/Tugella/Monjaro. Заодно год узла исправлен с
//    2020 (дата ребрендинга) на 2002 (реальный старт продаж) — иначе граф
//    скрывает 18 лет истории под брендом Chevrolet.
//  - lada-evesta: zone/segment="electric" — тот же ленивый плейсхолдер, что уже
//    чинили у NIO/XPeng/Zeekr/BYD. e-Vesta/Vesta EV документирована как визуально
//    неотличимая от обычной Vesta (тот же кузов) → zone/segment приведены к
//    значениям lada-vesta. engineType "electric"→"ev" (доминирующая конвенция,
//    271 узел графа против 17 на "electric").
//  - lada-granta-cross: bodyType="hatchback" при zone="suv_compact" — редкая
//    комбинация (всего 1 другой такой узел на весь граф, у несвязанного бренда).
//    Her прямой аналог в этом же кластере — lada-xray (тот же класс "приподнятый
//    хэтч-кроссовер", отвечала именно XRAY Cross по собственному note узла) —
//    помечен bodyType="suv". Приводим Granta Cross к тому же внутрикластерному
//    стандарту.
//  - Добавлено кросс-брендовое ребро lada-2101 --shares_platform--> Fiat 124:
//    по соглашению 1966г ВАЗ-2101 — доработанная версия именно СЕДАНА Fiat 124
//    (800+ инженерных изменений). Отдельного узла седана 124 в графе нет —
//    есть только fiat-124-spider-1966, который использует УКОРОЧЕННУЮ версию
//    той же платформы/пола кузова седана (не идентичный кузов, но та же
//    платформа — отсюда пониженная strength 0.65).
// НЕ ТРОГАЛ (проверил, но счёл корректным/неоднозначным):
//  - Слияние 2103+2106 в один узел lada-2103 — оставлено как есть: отличия
//    (1.5→1.6л, подголовники, задние фонари) типичны для фейслифта в рамках
//    одного поколения, несопоставимы по масштабу с реальным рестайлингом
//    2105/2107 (новая передняя/задняя оптика, новое название). Соответствует
//    уже принятому в графе паттерну схлопывания мелких фейслифтов.
//  - Niva 2131 (5-дв. длиннобазная, с 1995г) — не заводим отдельным узлом,
//    это кузовной вариант уже существующей генерации (как 2110/2111/2112 в
//    этом графе тоже не разнесены по узлам), не отдельное поколение. Добавил
//    поясняющий note на lada-niva-legend, что узел покрывает оба кузова.
//  - granta-fl→granta-cross уже стоит variant_of (не evolves_into) — бага
//    "Clio RS200" здесь нет, перепроверено и подтверждено верным.
//  - lada-evesta: hp=136/year=2023 НЕ подтверждены веб-поиском (находится только
//    более ранний концепт "Lada Vesta EV" 2016г, 82лс/60кВт/25кВтч — другие
//    цифры). Не стал менять hp/year без подтверждения (могла быть более новая
//    версия/прототип со слабым освещением в сети) — флагирую для ручной проверки.
// Источники: ru.wikipedia.org (ВАЗ-2105/2107/2106/2103), en.wikipedia.org
// (Lada Priora, Lada Niva Travel, Fiat 124, Lada Kalina, Lada Granta),
// kolesa.ru, autostat.ru, carson/wheel-size, drive2.ru технические разборы
// моторов 11183/21114/21124 — проверено веб-поиском 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  g.nodes.push(node); byId.set(node.id, node)
  console.log(`  ✅ ${node.id} (${node.year}, ${node.hp} л.с.)`)
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch))
}
function retargetEdgeSource(id, newSource) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  console.log(`  🔀 ${id}: source ${e.source} → ${newSource}`)
  e.source = newSource
}
function retypeEdgeByPair(source, target, newType) {
  const e = g.edges.find(e => e.source === source && e.target === target)
  if (!e) { console.log(`  ⚠️  ребро не найдено: ${source} -> ${target}`); return }
  console.log(`  🔄 ${source} -> ${target}: ${e.type} → ${newType}`)
  e.type = newType
}

console.log('=== 1. ВАЗ-2105/2107 (1980): закрываем 20-летний пропуск 2103→2110 ===')
addNode({
  id: 'lada-2105', label: 'ВАЗ-2105/2107',
  type: 'generation', year: 1980, brandId: 'lada', brandName: 'Lada',
  codeName: 'ВАЗ-2105', modelSlug: 'lada-2105',
  bodyType: 'sedan', segment: 'compact', zone: 'midsize_sed',
  hp: 75, engineType: 'i4',
  note: 'Рестайлинг "классики" (новая передняя/задняя оптика, торпедо) на платформе Fiat124/2101. 2105(1980) — замена базового 2101 (1.3-1.5л); 2107(1982) — замена 2103/2106 (изначально их же моторы 1.5/1.6л). Выпускались параллельно до 17.04.2012 (последний седан собран на ИжАвто). Полный диапазон модификаций 1.3-1.7л/64-90лс; указан распространённый трим 1.5-1.6л карбюратор ~75лс (экспортная "Lada Riva").',
})
retargetEdgeSource('lada-2103-evolves-2110', 'lada-2105') // было 2103→2110 напрямую, пропуская 2105/2107
addEdge('lada-2103-evolves-2105', 'lada-2103', 'lada-2105', 'evolves_into', 0.85)

console.log('\n=== 2. Lada Samara-2 (1997): закрываем пропуск 2108→Kalina ===')
addNode({
  id: 'lada-samara-2114', label: 'Lada Samara-2 (ВАЗ-2113/2114/2115)',
  type: 'generation', year: 1997, brandId: 'lada', brandName: 'Lada',
  codeName: 'ВАЗ-2114', modelSlug: 'lada-samara2',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 81, engineType: 'i4',
  note: 'Глубокий рестайлинг 1-й Самары (новые бамперы/оптика/торпедо, тот же передний привод). Три кузова вышли на конвейер не одновременно: седан 2115 (опытная серия 1997, главный конвейер 2001, до дек.2012), 5-дв хэтчбек 2114 (2001, до дек.2013), 3-дв хэтчбек 2113 (2004-2013). Моторы: 1.5л/77лс (11183) и 1.6л 8-кл/81лс (21114/2116) до 2007г, позже 1.6л 16-кл/89лс (21124); указан самый массовый — 1.6л 8-кл.',
})
retargetEdgeSource('lada-samara-evolves-kalina', 'lada-samara-2114') // было 2108→Kalina напрямую, пропуская Samara-2
addEdge('lada-samara-evolves-samara2', 'lada-samara-2108', 'lada-samara-2114', 'evolves_into', 0.85)

console.log('\n=== 3. Priora: неверная линия наследования (была от Samara, не от 2110) ===')
// Priora — не потомок Samara; это рестайлинг именно семейства ВАЗ-2110
// (950+ изменений, 2000+ новых деталей, сменила "Lada 110" в 2009г).
retargetEdgeSource('lada-samara-evolves-priora', 'lada-2110')
// Vesta анонсирована на ММАС-2014 как замена ИМЕННО Priora (продажи с сент.2015,
// Priora снята с производства июль 2018) — вставляем пропущенное звено 2110→Priora→Vesta.
retargetEdgeSource('lada-2110-evolves-vesta', 'lada-priora')

console.log('\n=== 4. Опечатки типа ребра "inspired" → "inspired_by" ===')
retypeEdgeByPair('lada-niva-2121', 'uaz-patriot', 'inspired_by')
retypeEdgeByPair('lada-granta-cross', 'lada-xray', 'inspired_by')

console.log('\n=== 5. Niva Travel: не эволюция 2121, а параллельный проект (ВАЗ-2123) ===')
retypeEdgeByPair('lada-niva-2121', 'lada-niva-travel', 'inspired_by')
fixNode('lada-niva-travel', {
  year: 2002,
  note: 'ВАЗ-2123 — отдельный проект СП GM-АвтоВАЗ (колёсная база 2.45м, НЕ растянутая версия 2121), разработан в 1998-2002г, продавался как "Chevrolet Niva" ПАРАЛЛЕЛЬНО с классической Нивой 20+ лет. После выхода GM из СП переименован 21.12.2020 в "Lada Niva Travel" (тогда же 2121/21214 стала "Niva Legend"). Год исправлен с 2020 (дата ребрендинга) на 2002 (реальный старт продаж) — иначе граф скрывает 18 лет истории под брендом Chevrolet.',
})
fixNode('lada-niva-legend', {
  note: 'Узел покрывает обе версии текущего модельного ряда Legend: короткобазную 3-дверную (ВАЗ-21214) и длиннобазную 5-дверную (ВАЗ-2131, выпускается с 1995г как удлинённая версия 2121) — отдельного узла для 2131 не заводим: это кузовной вариант той же платформы/поколения, а не отдельное поколение (аналогично тому, что 2110/2111/2112 в этом графе тоже не разнесены по отдельным узлам).',
})

console.log('\n=== 6. e-Vesta: ленивые плейсхолдеры zone/segment/engineType ===')
// e-Vesta/Vesta EV документирована как внешне неотличимая от обычной Vesta
// (тот же кузов) — zone/segment приводим к значениям lada-vesta.
// engineType "electric"→"ev": доминирующая конвенция графа (271 узел на "ev"
// против 17 на "electric"), как уже делали у VW/Mini/Tesla/NIO/XPeng/Zeekr/BYD.
// hp=136 и year=2023 НЕ подтверждены поиском (нашёлся только более ранний
// концепт "Lada Vesta EV" 2016г на 82лс/60кВт/25кВтч) — не меняю без
// подтверждения, см. итоговый отчёт.
fixNode('lada-evesta', { zone: 'midsize_sed', segment: 'compact', engineType: 'ev' })

console.log('\n=== 7. Granta Cross: bodyType не соответствует внутрикластерной конвенции ===')
// XRAY — прямой аналог (тот же класс "приподнятый хэтч-кроссовер", Granta Cross
// по собственному note "отвечал на XRAY Cross") — помечен bodyType="suv".
// Приводим Granta Cross к тому же стандарту вместо редкой на весь граф
// комбинации hatchback+suv_compact.
fixNode('lada-granta-cross', { bodyType: 'suv' })

console.log('\n=== 8. Fiat 124: добавляем реальное историческое shares_platform ===')
// Соглашение Fiat-СССР от 1966г: ВАЗ-2101 — доработанная версия СЕДАНА Fiat 124
// (800+ инженерных изменений для советских условий). Отдельного узла седана 124
// в графе нет — есть только fiat-124-spider-1966, который использует укороченную
// версию ТОЙ ЖЕ платформы/пола кузова седана (Pininfarina срезал 14см базы) —
// не идентичный кузов, поэтому strength снижена до 0.65.
addEdge('lada-2101-shares-fiat124', 'lada-2101', 'fiat-124-spider-1966', 'shares_platform', 0.65)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
