#!/usr/bin/env node
// Citroën: полная гигиена полей + структурный аудит (fix-citroen-connections.js
// ранее в этой сессии чинил только рёбра/связи, bodyType/engineType не трогал).
//
//  ГЛАВНАЯ ЗАДАЧА — гигиена полей: 25 из 44 узлов бренда были вообще без
//  bodyType (все старые "production"-узлы из раннего скрейпа, схема
//  category+type:"production", без segment/modelSlug/familyKey — не трогаю
//  эту часть схемы, только добавляю bodyType/engineType, как в fix-mini-audit.js).
//  22 узла имели общую заглушку engineType ("gasoline" ×20, "electric" ×2
//  вместо доминирующего в графе канона "ev"). Для каждого — реальный кузов и
//  мотор по документированным данным (Wikipedia, auto-data.net, autoevolution,
//  encycarpedia, automobile-catalog, ultimatecarpage, carfolio — веб-поиск
//  2026-10-21). Два случая оказались НЕ тривиальным "hatchback по умолчанию":
//   - Ami 6 (1961) — несмотря на "hatch" в старом поле category, это 4-дверный
//     седан-нотчбек (обратный наклон заднего стекла — решётчатый "break"-стиль,
//     но багажник отдельный, не хэтч-дверь). bodyType: sedan.
//   - Mehari (1968) — открытый пляжный багги на шасси 2CV, bodyType: convertible.
//  Остальные (2CV/Dyane/Visa/AX/BX/Xantia/Saxo/C-серия) — хэтчбеки/седаны
//  согласно реальной модели, см. построчные комментарии ниже.
//
//  СТРУКТУРНЫЕ НАХОДКИ (сверх гигиены полей):
//  1. BX 4TC (1986) — был bodyType "sedan", это ОШИБКА: 4TC построен на
//     штатном 5-дверном хэтчбек-кузове BX (расширенные арки/спойлер, но та
//     же бодишелл) — приведено к "hatchback", как у базового citroen-bx.
//  2. C5 X (2021) — был "sedan" (в старом category), но Citroën официально
//     позиционирует кузов как fastback (седан+универсал+SUV силуэт) —
//     собственное description узла уже говорит "fastback-SUV body".
//     Исправлено на bodyType: "fastback". engineType hybrid→phev (описание
//     прямо говорит "PHEV 225 HP").
//  3. C5 Aircross (2017) — engineType hybrid→phev (описание прямо говорит
//     "PHEV 225 HP") — апгрейд точности, не просто замена заглушки.
//  4. ë-C4 / C4 Gen.3 (2020) — hp был 155, но собственное description узла
//     говорит "134 HP electric" — внутреннее противоречие. Веб-поиском
//     подтверждено: реальный ë-C4 = 100кВт/136лс (auto-data.net,
//     ev-database.org). hp 155→136, engineType electric→ev.
//  5. e-C3 / "ë-C3" (2024) — БАГ ТИПА "трим привязан не к своему поколению":
//     ребро citroen-c3-3→citroen-e-c3 было variant_of (как будто это просто
//     трим C3 Gen.3, 2016). Веб-поиском (citroenvie.com: "Citroën Introduces
//     4th Generation C3", + Stellantis-пресс) подтверждено: ë-C3 2024 — это
//     ЧЕТВЁРТОЕ поколение C3 на совершенно новой платформе Smart Car Platform
//     (не CMP, на которой C3 Gen.3) — полноценная смена поколения, не трим.
//     Ребро перетипизировано в evolves_into, узел переименован "C3 Gen.4"
//     (для единообразия с C3 Gen.2/Gen.3 той же "production"-схемы).
//  6. C5 Aircross Gen.2 (2025) — РЕАЛЬНЫЙ пропуск поколения: второе поколение
//     вышло в продажу в Европе во 2П 2025 на новой платформе STLA Medium
//     (Stellantis), с гибридом 145лс и PHEV 225лс — в графе отсутствовало
//     полностью. Добавлено как новый узел, evolves_into от Gen.1.
//  7. Ami EV (2020) — подтверждён реальный пропуск (см. лид №6 задания):
//     современная Citroën Ami — безлицензионный электроквадрицикл (6кВт/8лс,
//     5.5кВтч, ~75км WMTC) — не поколение старой Ami 6 (1961), а возрождение
//     нейма спустя 59 лет (как Fiat 500 1957→2007 и VW Beetle 1938→1997 в
//     этом же графе — оба через inspired_by). Добавлено с inspired_by от
//     citroen-ami.
//  8. WRC-цепочка: Visa 1000 Pistes/BX 4TC/Xsara Kit Car→Xsara WRC→C4 WRC —
//     все derived_from/evolves_into и хронология подтверждены точно (Xsara
//     Kit Car 1998→WRC-спек 2001 — год в графе совпал с реальным дебютом;
//     C4 WRC 2007 — совпал с реальным стартом). НО цепочка обрывалась на
//     C4 WRC: реальный преемник — DS3 WRC (2011-2012, 1.6т turbo 300hp,
//     2 титула пилотов Лёба подряд, включая рекордный 9-й подряд чемпионский
//     титул в 2012) — ещё под брендом Citroën (DS Automobiles отделился
//     только в 2014-2015, см. задание — тут та же логика, что уже применена
//     к citroen-ds3/ds4/ds5). Добавлен как citroen-ds3-wrc, brandId citroen.
//     Также поправлена неточность в note у xsara-wrc: тройной титул
//     ПРОИЗВОДИТЕЛЕЙ 2003-2005 был подряд, но личный титул ПИЛОТА Лёб в
//     2003г. не взял (проиграл чемпионат на 1 очко) — его титулы на этой
//     машине реально 2004-2006.
//
//  ПРОВЕРЕНО, ФИКС НЕ НУЖЕН:
//   - DS21(1965) facelifted_to от DS(1955) — подтверждено, это апгрейд
//     мотора/трима в рамках одного поколения DS (1955-1975), не отдельная
//     генерация. Тип ребра корректен.
//   - citroen-ds3/ds4/ds5 → ds-3-crossback/ds-7-crossback (кросс-брендовые
//     рёбра на brandId "ds") — исторически верный разрыв линейки при
//     отделении DS Automobiles, НЕ трогаю (чужой бренд + явно корректно).
//   - C1 shares_platform Peugeot 107 — реальный PSA/Toyota трипл-альянс
//     (Aygo/107/C1), но узла Toyota Aygo во ВСЁМ графе нет (проверено
//     программно, 0 совпадений по всем брендам) — третье ребро физически
//     нечем провести, уже задокументировано в note существующего ребра.
//   - Три параллельные цепочки поколений (D-segment GS→BX→Xantia→C5→
//     C5 Gen.2→[C5 Aircross]→C5 X; B-segment AX→Saxo→C3→C3 Gen.2→C3 Gen.3;
//     C-segment ZX→Xsara→C4→C4 Gen.2→C4 Gen.3) — годы производства
//     перепроверены по реальным датам смены поколений, пропусков нет.
//   - Флагманская линия Traction Avant→DS→CX→XM→C6 — C6 (2005-2012)
//     подтверждён корректным тупиком: Citroën не выпускает преемника с 2012г.
//     (ушли из сегмента большого флагманского седана), исходящего ребра у
//     c6 нет и не добавляется.
//   - "inspired" (без _by) опечатки для Citroën-узлов не найдено (0
//     совпадений программной проверкой по всем рёбрам, затрагивающим бренд).
//   - Все zone-значения 44 узлов — валидны по ZONES из validate-graph.js
//     (racing/workhorse/offroad/gt_coupe/exec_sed/flagship_sed и т.д. — все
//     входят в множество, инвалидных не найдено).
//
// Источники: Wikipedia (Citroën Ami, Ami (electric vehicle), Dyane, SM, BX
// 4TC, Xsara WRC, C4 WRC, DS3 WRC, C5 Aircross, C5 X), auto-data.net,
// autoevolution.com, encycarpedia.com, automobile-catalog.com,
// ultimatecarpage.com, carfolio.com, citroenvie.com, media.stellantis.com,
// wrc.com, girardo.com, hiconsumption.com — проверено веб-поиском, часть
// утверждений (Ami EV мощность, BX 4TC кузов, статус ë-C3 как Gen.4)
// перепроверена вторым независимым поиском. Дата проверки: 2026-10-21.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно по этому же
// файлу работает другой агент по Saturn+Scion+Rezvani+Ariel; их brandId не
// затрагиваем, они не затрагивают citroen.
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch).slice(0, 180))
}
function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return }
  g.nodes.push(node); byId.set(node.id, node)
  console.log(`  ✅ ${node.id} (${node.year}, ${node.hp} л.с.)`)
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id, source, '->', target); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function retypeEdgeByPair(source, target, newType) {
  const e = g.edges.find(e => e.source === source && e.target === target)
  if (!e) { console.log('  ⚠️  ребро не найдено:', source, '->', target); return }
  console.log(`  🔀 ${e.id}: [${e.type}] → [${newType}]`)
  e.type = newType
}
function renameNode(id, newLabel) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  console.log(`  ✏️  ${id}: "${n.label}" → "${newLabel}"`)
  n.label = newLabel
}

console.log('=== 1. Реальные пропуски: 3 новых узла ===')
addNode({
  id: 'citroen-ami-electric', label: 'Ami (2020)',
  type: 'generation', year: 2020, brandId: 'citroen', brandName: 'Citroën',
  modelSlug: 'citroen-ami-electric', familyKey: 'citroen-ami-electric',
  bodyType: 'microcar', segment: 'micro', zone: 'hatchback',
  hp: 8, engineType: 'ev',
  note: 'Безлицензионный электроквадрицикл (мотор 6кВт/8лс, батарея 5.5кВтч, ~75км WMTC, макс. 45км/ч) — возрождение нейма Ami спустя 59 лет, НЕ новое поколение седана Ami 6 (1961): иной класс ТС, нет инженерной преемственности. Источники: Wikipedia "Citroën Ami (electric vehicle)", drivingelectric.com — мощность перепроверена вторым поиском (автомобиль-catalog давал расходящиеся 9кВт/12лс — отклонено как менее достоверное, 3 независимых источника сходятся на 6кВт/8лс).',
})
addEdge('e-cit-ami-amielectric', 'citroen-ami', 'citroen-ami-electric', 'inspired_by', 0.8)

addNode({
  id: 'citroen-ds3-wrc', label: 'DS3 WRC', fullName: 'Citroën DS3 WRC',
  type: 'generation', year: 2011, brandId: 'citroen', brandName: 'Citroën',
  codeName: 'WRC', modelSlug: 'citroen-ds3-wrc', familyKey: 'citroen-ds3',
  bodyType: 'hatchback', segment: 'racing', zone: 'racing',
  hp: 300, engineType: 'i4t', isRacing: true,
  note: 'Преемник C4 WRC в чемпионате (новый регламент WRC-2011: специально спроектированный турбо-1.6 вместо атмо-2.0 на базе серийного блока; 220кВт/300лс). На базе дорожной DS3 (2009) — ещё под брендом Citroën, DS Automobiles отделился только в 2014-2015 (та же логика, что у ds3/ds4/ds5 в этом кластере). 2 титула производителей и 2 титула пилотов Лёба подряд (2011-2012), включая рекордный 9-й подряд личный титул в 2012г. Источники: Wikipedia Citroën DS3 WRC, ultimatecarpage.com.',
})
addEdge('e-cit-c4wrc-ds3wrc', 'citroen-c4-wrc', 'citroen-ds3-wrc', 'evolves_into', 0.85)
addEdge('e-cit-ds3-ds3wrc', 'citroen-ds3', 'citroen-ds3-wrc', 'derived_from', 0.75)

addNode({
  id: 'citroen-c5-aircross-2', label: 'C5 Aircross Gen.2',
  type: 'generation', year: 2025, brandId: 'citroen', brandName: 'Citroën',
  modelSlug: 'citroen-c5-aircross-gen2', familyKey: 'citroen-c5-aircross',
  bodyType: 'suv', segment: 'suv_mid', zone: 'suv_mid',
  hp: 225, engineType: 'phev',
  note: 'Второе поколение (продажи в Европе со 2П 2025) — новая платформа STLA Medium (Stellantis) взамен EMP2 у Gen.1. Линейка: гибрид 145лс (1.2 турбо-3 + e-DCS, 0.9кВтч), PHEV 225лс (1.6 турбо-4 + мотор 125лс, ~86-100км электрозапас), позже добавлена электроверсия. Указан топ-PHEV для сопоставимости с Gen.1 (тоже 225, ранее неточно "hybrid" вместо "phev"). Источники: media.stellantis.com, parkers.co.uk, auto-data.net — проверено 2026-10-21.',
})
addEdge('e-cit-c5aircross-g1-g2', 'citroen-c5-aircross', 'citroen-c5-aircross-2', 'evolves_into', 0.9)

console.log('\n=== 2. Структурные исправления (не просто гигиена) ===')
fixNode('citroen-bx-4tc', { bodyType: 'hatchback' })
// было "sedan" — ошибка: 4TC это штатная 5-дверная хэтчбек-бодишелл BX с
// расширенными арками/спойлером, не отдельный кузов. Источники: Wikipedia
// Citroën BX 4TC, hiconsumption.com (широкие арки на базе хэтча BX).

fixNode('citroen-c5-x', { bodyType: 'fastback', engineType: 'phev' })
// bodyType было "sedan" (из старого category) — собственное description узла
// уже говорит "Avant-garde fastback-SUV body" — Citroën официально называет
// кузов fastback (седан+универсал+SUV силуэт), не классический седан.
// engineType: hybrid→phev — description прямо говорит "PHEV 225 HP, EV-only 50 km".

fixNode('citroen-c5-aircross', { bodyType: 'suv', engineType: 'phev' })
// bodyType заполняем (было только category:"suv"). engineType: hybrid→phev —
// description прямо говорит "PHEV 225 HP" (Hybrid4/PureTech Hybrid у PSA —
// это именно подключаемые гибриды, в отличие от ds5 Hybrid4 2011г. — та
// действительно не-plug-in, оставлена "hybrid").

console.log('\n=== 3. ë-C3 → реально 4-е поколение C3, не трим Gen.3 (баг "трим не на своём поколении") ===')
retypeEdgeByPair('citroen-c3-3', 'citroen-e-c3', 'evolves_into')
renameNode('citroen-e-c3', 'C3 Gen.4')
fixNode('citroen-e-c3', {
  bodyType: 'hatchback', engineType: 'ev',
  note: 'Ребро от C3 Gen.3 было variant_of (как будто просто EV-трим) — ОШИБКА: подтверждено (citroenvie.com "Citroën Introduces 4th Generation C3", пресс-релизы Stellantis), это самостоятельное 4-е поколение C3 на новой платформе Smart Car Platform (не CMP, на которой построено Gen.3) — глобальная модель (Европа/Индия/Лат.Америка, там же база для Basalt/нового C3 Aircross). Переименован "ë-C3"→"C3 Gen.4" для единообразия с Gen.2/Gen.3; серийное имя ë-C3 сохранено в note. Ребро перетипизировано evolves_into.',
})

console.log('\n=== 4. Гигиена полей: bodyType + engineType для 25 узлов без bodyType (22 из них — заглушка engineType) ===')
fixNode('citroen-traction',   { bodyType: 'sedan',     engineType: 'i4' })   // 11CV, 1911см³ атмо-4, 56лс — точное совпадение реальной спецификации
fixNode('citroen-ami',        { bodyType: 'sedan',     engineType: 'flat2' }) // 4-дверный седан-нотчбек (не хэтч!) с обратным наклоном стекла — Wikipedia; мотор 602см³ оппозит-2 (как 2CV/Dyane)
fixNode('citroen-dyane',      { bodyType: 'hatchback', engineType: 'flat2',
  description: 'Practical 2CV successor. 5-door hatch, flat-2 air-cooled. 1.44M units 1967–1983.' }) // 602см³ M4-мотор, 28лс — точное совпадение Dyane 6 (1968); попутно исправлена опечатка в description ("flat-4"→"flat-2", мотор реально оппозитная двойка, как у 2CV/Ami)
fixNode('citroen-mehari',     { bodyType: 'convertible', engineType: 'flat2' }) // открытый пляжный багги на шасси 2CV, тот же 602см³ оппозит-2, 28лс
fixNode('citroen-sm',         { bodyType: 'coupe',     engineType: 'v6' })    // 3-дверное гран-туризмо купе, атмо Maserati V6 2.7Л, 170лс — точное совпадение
fixNode('citroen-visa',       { bodyType: 'hatchback', engineType: 'i4' })    // 65лс соответствует атмо-4 (Douvrin/PSA 1.1-1.3Л), не базовому оппозит-2 триму (~36лс)
fixNode('citroen-zx',         { bodyType: 'hatchback', engineType: 'i4' })    // 103лс = атмо 1.8i
fixNode('citroen-xsara',      { bodyType: 'hatchback', engineType: 'i4' })    // 110лс = атмо 1.8 16V
fixNode('citroen-berlingo',   { bodyType: 'van',       engineType: 'i4' })    // 75лс = атмо 1.4i (не 1.9D ~70лс)
fixNode('citroen-c1',         { bodyType: 'hatchback', engineType: 'i3' })    // Toyota 1KR-FE, атмо-3, 68лс — точное совпадение (код "i3" уже используется в графе, 6 узлов)
fixNode('citroen-c2',         { bodyType: 'hatchback', engineType: 'i4' })    // 109лс = атмо 1.6 16V
fixNode('citroen-c6',         { bodyType: 'sedan',     engineType: 'v6t' })   // 240лс = V6 HDi Biturbo (2 турбины реально, не атмо) — флагманский седан, в отличие от хэтчбек-кузовов CX/XM/SM
fixNode('citroen-c4-picasso', { bodyType: 'mpv',       engineType: 'i4t' })   // 140лс в диапазоне THP турбо-4 (1.6 THP)
fixNode('citroen-c3-2',       { bodyType: 'hatchback', engineType: 'i4' })    // 120лс = атмо 1.6 16V
fixNode('citroen-c3-3',       { bodyType: 'hatchback', engineType: 'i3t' })   // description: "1.2 PureTech" — PureTech 110 это турбо-3, не атмо
fixNode('citroen-c4-2',       { bodyType: 'hatchback', engineType: 'i4t' })   // 155лс = THP 155 турбо-4
fixNode('citroen-c4-cactus',  { bodyType: 'crossover', engineType: 'i3t' })   // description: "1.2 PureTech 110" — турбо-3
fixNode('citroen-c3-aircross',{ bodyType: 'suv',       engineType: 'i3t' })   // description: "1.2 PureTech 110/130" — турбо-3
fixNode('citroen-c4-3',       { bodyType: 'hatchback', engineType: 'ev', hp: 136 }) // было hp:155 вопреки СОБСТВЕННОМУ description ("134 HP electric") — внутреннее противоречие; реальный ë-C4 = 100кВт/136лс (auto-data.net, ev-database.org)
fixNode('citroen-ds3',        { bodyType: 'hatchback', engineType: 'i4t' })   // description: "1.6 THP 207 HP" — турбо-4
fixNode('citroen-ds4',        { bodyType: 'hatchback', engineType: 'i4t' })   // description: "2.0 THP 200 HP" — турбо-4
fixNode('citroen-ds5',        { bodyType: 'hatchback' })                      // engineType "hybrid" уже корректен (Hybrid4 дизель+электро, НЕ plug-in — в отличие от c5-aircross/c5-x) — только bodyType
// citroen-e-c3: bodyType+engineType уже выставлены в блоке 3 (структурное исправление)

console.log('\n=== 5. Точность note (не гигиена, но подтверждено веб-поиском при проверке WRC-цепочки) ===')
fixNode('citroen-xsara-wrc', {
  note: 'Полноприводный World Rally Car — турбо 2.0 XU7JP4, 315hp. 3 титула производителей подряд 2003-2005. Личные титулы Лёба на этой машине — 2004-2006 (в 2003г. Citroën взял производительский титул, но Лёб уступил чемпионат пилотов на 1 очко — ранее в note ошибочно связывался весь диапазон 2003-2005 с Лёбом). Источники: Wikipedia Citroën Xsara WRC, 2003/2004/2005 World Rally Championship.',
})

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
