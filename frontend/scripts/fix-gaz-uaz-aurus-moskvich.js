#!/usr/bin/env node
// Аудит GAZ / UAZ / Aurus / Moskvich (АЗЛК):
//
//  1. Москвич: весь ребрендинг 2022+ (Москвич 3/3e/6/8) отсутствовал в графе.
//     АЗЛК обанкротился в начале 2000х (последний узел — 2141-20 Svyatogor,
//     1997). В 2022 моск. правительство запустило НОВОЕ юрлицо "Москвич" на
//     бывшей площадке Renault — это ребейджи JAC (при поддержке КамАЗа),
//     НЕ преемник АЗЛК по инженерии/собственности, только по имени бренда.
//     JAC как бренд в графе отсутствует (проверено) — по инструкции делаю
//     донор JAC ссылкой в note, а не кросс-брендовым ребром.
//     Добавлены: Москвич 3 (2022, JAC Sehol X4/JS4, 150лс), Москвич 3e
//     (2023, электро, донор Sehol E40X, 193лс/142кВт/65.7кВтч/410км —
//     ОСТОРОЖНО: один источник давал неправдоподобные "68 л.с.", отброшено
//     как выброс, перепроверено по 5+ независимым дилерским источникам),
//     Москвич 6 (2023, лифтбек, донор JAC Sehol A5 Plus — НЕ "JS6", как
//     можно было предположить; в ОТТС ошибочно значится "седан"), Москвич 8
//     (2024, 7-местный кроссовер, донор JAC Sehol/X8 Plus; на китайском
//     рынке мотор 184лс, для РФ дефорсирован до 174лс/128кВт — использую
//     РФ-спек по аналогии с остальным графом).
//     АЗЛК-2141-20 → Москвич 3: НЕ evolves_into (это был бы правильный тип
//     для Scirocco-кейса этой сессии — там ТА ЖЕ компания возрождала СВОЙ
//     нейминг на новой платформе). Здесь — 25 лет простоя + другое юрлицо
//     (мэрия Москвы, не АЗЛК) + нет никакой инженерной преемственности.
//     Ставлю слабый inspired_by (0.3, самый слабый в графе) — связь чисто
//     по имени бренда. Для сравнения: gaz-siber→volga-c40 (та же компания
//     ГАЗ возрождает свою Волгу) закономерно остаётся evolves_into (0.65).
//     Остальные новые модели подвешены к Москвич-3 по образцу уже готового
//     в графе паттерна gaz-volga-c40→k30/k40 (inspired_by, разные доноры
//     Changan у параллельных моделей одного релонча) — Москвич-6/8 на
//     ДРУГИХ донорах JAC, чем Москвич-3, поэтому не shares_platform.
//     Москвич-3→3e — variant_of (тот же кузов/поколение, только силовая
//     установка, как ICE/EV-пара).
//
//  2. "inspired" (опечатка, без "_by") — найдено 4 шт. в этих 4 брендах:
//     - gaz-m21→m22: это НЕ "вдохновение", а универсал той же генерации
//       M21 (база — седан ГАЗ-21Р 3-й серии, различия от средней стойки).
//       Меняю на variant_of (источник=M21 как база, цель=M22 вариант).
//     - lada-niva-2121→uaz-patriot: оставляю как inspired_by (мягкая
//       смысловая связь правдоподобна — Niva задала моду на "цивильный"
//       4x4 в СССР/РФ, что соответствует философии Patriot; это НЕ прямое
//       заимствование конструкции, для чего inspired_by и предназначен).
//     - gaz-volga-c40→k30 и →k40: тоже просто опечатка, по смыслу верно
//       (разные доноры Changan у параллельных моделей одного релонча
//       Волги — ни engineering-то derived, ни shares_platform не подходят).
//
//  3. gaz-volga-m24→uaz-patriot "inspired"(0.4, самая низкая сила в выборке):
//     целенаправленный поиск НЕ нашёл вообще никакой реальной связи между
//     седаном ГАЗ-24 (1970) и внедорожником UAZ Patriot (2005) — разные
//     КБ, разные классы автомобилей, разные эпохи. Похоже на фантазию
//     скрейпера. УДАЛЯЮ как неподтверждённое.
//
//  4. UAZ Patriot: реальный прямой предшественник — НЕ UAZ-469 напрямую и
//     НЕ Hunter, а UAZ-3162 "Симбир" (2000-2005, удлинённая база от
//     UAZ-3160/1997, тот же рестайлинг кузова на мостах Spicer), которого
//     в графе не было вообще. Patriot официально считается "созданным
//     полной модернизацией UAZ-3162 Simbir" (Wikipedia). Добавляю узел
//     uaz-simbir (2000, ЗМЗ-409.10 2.7л/128лс) и перестраиваю цепочку:
//     469→simbir→patriot (evolves_into), вместо чего удаляю прежнее прямое
//     469→patriot (influenced_by, с "битым" id "uaz-hunter-influenced-
//     patriot", хотя source там всегда был uaz-469, не uaz-hunter) — тот
//     же паттерн, что чинили в Opel Kadett A→C при находке пропущенного B.
//     Hunter (2003) остаётся отдельной, параллельной 469-ветвью (реальная
//     модернизация того же шасси 469/3151, прямого отношения к Patriot не
//     имеет) — edges 469→hunter не трогаю, уже верно смоделировано.
//
//  5. Aurus "Арсен" → реальное название "Arsenal" (минивэн для кортежа, НЕ
//     лимузин/седан-вариант). Куча ошибок разом: название обрезано и
//     написано кириллицей вперемешку с латиницей соседей (Senat/Komendant
//     оба латиницей), bodyType "limousine" вместо реального "van" (минивэн
//     со сдвижными дверями), zone "flagship_sed" — по устоявшейся в графе
//     конвенции для люксовых минивэнов (Mercedes V-Klasse/Viano/V-Class/
//     EQV/VLS Maybach, Toyota Alphard, Nissan Elgrand — ВСЕ zone=suv_large,
//     segment=luxury) верно suv_large, не flagship_sed/exec_sed. Ребро
//     Senat→Arsenal (variant_of) тоже переквалифицирую в derived_from —
//     Arsenal другого класса кузова (минивэн, не седан/лимузин-вариант
//     Senat), ровно как уже смоделирован Komendant (SUV, derived_from) —
//     привожу к единому паттерну для обоих "непрямых" кузовов Kortezh.
//     Код "L783" в источниках не подтверждён и не опровергнут — оставляю,
//     флагирую как непроверяемое.
//     Senat/Komendant/452↔469 (shares_platform)/469→Hunter (evolves_into)
//     /M24→24-10 (facelifted_to, уже верно!)/Komendant derived_from —
//     все перепроверены веб-поиском, уже смоделированы верно, не трогаю.
//
//  6. gaz-pobeda-m20: zone "midsize_sed" расходилась с собственным же полем
//     segment="midsize" (тем же, что у gaz-volga-m21/m22, которые при этом
//     zone=exec_sed). Linии Pobeda→Volga — прямое производственное
//     преемство на одном заводе ГАЗ в той же товарной нише ("средний
//     класс" в сов. классификации, но фактический статусный автомобиль
//     эпохи — "безусловный маркер положения в обществе"). Привожу zone к
//     exec_sed — согласуется с собственным segment="midsize" (как у
//     Volga), а не с segment="mainstream" группой (Москвич-400 и т.п.).
//
// Источники: ru/en Wikipedia (ГАЗ-21/22/24/24-10/3110, UAZ-469/Simbir/
// Patriot/Hunter, Aurus Arsenal/Komendant/Senat, Moskvitch 3/Sehol X4),
// autoevolution.com, autonews.ru, kolesa.ru, rg.ru, drom.ru, drive2.ru,
// mir-automoto.ru, moscowteslaclub.ru + 4 независимых дилерских сайта
// Москвич (петровский/авантаauto/самарские-автомобили) для Москвич 3e —
// проверено веб-поиском 2026-10-19.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно работает агент
// по Lada над тем же файлом, мерджимся в актуальное состояние на диске.
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
function deleteEdge(id) {
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.id !== id)
  console.log(g.edges.length < before ? `  🗑️  удалено ребро ${id}` : `  ⚠️  ребро не найдено: ${id}`)
}
function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch))
}
function retypeEdgeByPair(source, target, newType) {
  const e = g.edges.find(e => e.source === source && e.target === target)
  if (!e) { console.log(`  ⚠️  ребро не найдено: ${source} -> ${target}`); return }
  console.log(`  🔄 ${source} -> ${target}: ${e.type} → ${newType}`)
  e.type = newType
}
function renameNode(oldId, newId) {
  const n = byId.get(oldId)
  if (!n) { console.log('  ⚠️  узел не найден для переименования:', oldId); return }
  if (byId.has(newId)) { console.log('  ⚠️  целевой id уже занят:', newId); return }
  n.id = newId
  byId.delete(oldId); byId.set(newId, n)
  let touched = 0
  g.edges.forEach(e => {
    if (e.source === oldId) { e.source = newId; touched++ }
    if (e.target === oldId) { e.target = newId; touched++ }
  })
  console.log(`  🔀 id: ${oldId} → ${newId} (обновлено рёбер: ${touched})`)
}

console.log('=== 1. Aurus "Арсен" → Arsenal: имя/кузов/zone/ребро ===')
renameNode('aurus-arsen', 'aurus-arsenal')
fixNode('aurus-arsenal', {
  label: 'Aurus Arsenal', modelSlug: 'aurus-arsenal',
  bodyType: 'van', segment: 'luxury', zone: 'suv_large',
  note: 'Представительский минивэн (не лимузин/седан-вариант Senat) со сдвижными дверями, на той же модульной платформе ЕМП/Kortezh. Код "L783" не подтверждён независимым источником — оставлен без изменений, под вопросом.',
})
retypeEdgeByPair('aurus-senat', 'aurus-arsenal', 'derived_from') // другой класс кузова (минивэн), как уже смоделирован Komendant (SUV) — не variant_of

console.log('\n=== 2. "inspired" → опечатка/семантика (4 ребра) ===')
retypeEdgeByPair('gaz-volga-m21', 'gaz-volga-m22', 'variant_of') // М22 — кузов-универсал той же генерации М21, не отдельная генерация и не "вдохновение"
retypeEdgeByPair('lada-niva-2121', 'uaz-patriot', 'inspired_by') // опечатка; по смыслу связь правдоподобна (Niva задала моду на "цивильный" 4x4), не трогаю семантику
retypeEdgeByPair('gaz-volga-c40', 'gaz-volga-k30', 'inspired_by') // опечатка; разные доноры Changan — по смыслу верно уже
retypeEdgeByPair('gaz-volga-c40', 'gaz-volga-k40', 'inspired_by') // опечатка; аналогично

console.log('\n=== 3. gaz-volga-m24 → uaz-patriot: неподтверждённая связь, удаляю ===')
deleteEdge('gaz-volga-m24-influenced-uaz-patriot') // целевой веб-поиск не нашёл никакой реальной связи седана ГАЗ-24 с дизайном Patriot; самая низкая сила (0.4) в выборке — похоже на артефакт скрейпера

console.log('\n=== 4. UAZ Simbir (2000): закрываем пропуск 469→Patriot ===')
addNode({
  id: 'uaz-simbir', label: 'UAZ Simbir', type: 'generation', year: 2000,
  brandId: 'uaz', brandName: 'UAZ', codeName: 'UAZ-3162',
  modelSlug: 'uaz-simbir', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 128, engineType: 'i4',
  note: 'Удлинённая версия UAZ-3160 (1997) с мостами Spicer — рестайлинг кузова на той же раме/шасси линейки 469/31512, мотор ЗМЗ-409.10 2.7л/128лс. Официально заменена Patriot в 2005г как прямой преемник в модельном ряду.',
})
deleteEdge('uaz-hunter-influenced-patriot') // прямое 469→patriot (хотя id упоминает hunter, source всегда был uaz-469) заменяется точной цепочкой через реального предшественника Simbir — паттерн как у Kadett A→C при находке пропущенного B
addEdge('uaz-469-evolves-simbir', 'uaz-469', 'uaz-simbir', 'evolves_into', 0.75)
addEdge('uaz-simbir-evolves-patriot', 'uaz-simbir', 'uaz-patriot', 'evolves_into', 0.85)

console.log('\n=== 5. gaz-pobeda-m20: zone midsize_sed → exec_sed (своя же segment="midsize") ===')
fixNode('gaz-pobeda-m20', { zone: 'exec_sed' }) // сверка с собственным segment="midsize" (как у volga-m21/m22, zone=exec_sed), а не с segment="mainstream" группой (azlk-*); прямой производственный преемник на том же заводе ГАЗ

console.log('\n=== 6. Москвич 2022+: возрождение бренда (JAC-ребейджи), 4 новых узла ===')
addNode({
  id: 'moskvich-3', label: 'Москвич 3', type: 'generation', year: 2022,
  brandId: 'moskvich', brandName: 'Москвич', modelSlug: 'moskvich-3', familyKey: 'moskvich-3',
  bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 150, engineType: 'i4t',
  note: 'Ребейдж JAC Sehol X4 (экспортно — JAC JS4/Jiayue X4, КНР 2020). JAC не выделен отдельным брендом в графе — донор указан здесь, без кросс-брендового ребра. Производство — завод "Москвич" в Москве (бывшая площадка Renault), при поддержке КамАЗа; старт 23.11.2022.',
})
addNode({
  id: 'moskvich-3e', label: 'Москвич 3e', type: 'generation', year: 2023,
  brandId: 'moskvich', brandName: 'Москвич', modelSlug: 'moskvich-3', familyKey: 'moskvich-3',
  bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 193, engineType: 'ev',
  note: 'Электроверсия на базе JAC Sehol E40X (тот же типоразмер кузова, что донор Москвич 3 — Sehol X4). 142кВт/340Нм, батарея 65.7кВтч, запас хода 410км (WLTP-подобный цикл), передний привод. Фигура "~68лс" из части источников — явный выброс/ошибка, отброшена, перепроверено по 5+ независимым дилерским сайтам.',
})
addNode({
  id: 'moskvich-6', label: 'Москвич 6', type: 'generation', year: 2023,
  brandId: 'moskvich', brandName: 'Москвич', modelSlug: 'moskvich-6',
  bodyType: 'liftback', segment: 'mainstream', zone: 'midsize_sed',
  hp: 150, engineType: 'i4t',
  note: 'Ребейдж JAC Sehol A5 Plus (не JS6 — это сплав лифтбека Sehol A5 и "оспортивленного" Sehol Yao, донор представлен в КНР в 2021г). Кузов — лифтбек с поднимающейся дверью багажника, хотя в ОТТС ошибочно указан как "5-дверный седан". Представлен в апреле 2023г.',
})
addNode({
  id: 'moskvich-8', label: 'Москвич 8', type: 'generation', year: 2024,
  brandId: 'moskvich', brandName: 'Москвич', modelSlug: 'moskvich-8',
  bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid',
  hp: 174, engineType: 'i4t',
  note: '7-местный 3-рядный кроссовер, донор JAC Sehol X8 Plus (дебют в КНР в 2022г, там же мотор 184лс/300Нм). Для РФ-рынка тот же турбомотор 1.5л дефорсирован до 174лс(128кВт)/300Нм — указан РФ-спек. Только передний привод, полноприводной версии нет.',
})
addEdge('azlk-2141-20-inspired-moskvich-3', 'azlk-2141-20', 'moskvich-3', 'inspired_by', 0.3) // НЕ evolves_into: 25 лет простоя + другое юрлицо (мэрия Москвы, не АЗЛК) + нет инженерной преемственности — связь только по имени бренда
addEdge('moskvich-3-variant-3e', 'moskvich-3', 'moskvich-3e', 'variant_of', 0.9) // тот же кузов/поколение, силовая установка — ICE/EV-пара
addEdge('moskvich-3-inspired-6', 'moskvich-3', 'moskvich-6', 'inspired_by', 0.75) // паттерн как у gaz-volga-c40→k30/k40: параллельная модель одного релонча, но на ДРУГОМ доноре JAC
addEdge('moskvich-3-inspired-8', 'moskvich-3', 'moskvich-8', 'inspired_by', 0.75)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
