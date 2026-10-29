/**
 * add-gap-run-2026-10-28b.js — второй регулярный прогон autoevoflow-graph-gap-fill
 * за 2026-10-28 (первый — add-gap-run-2026-10-28.js, уже применён; этот —
 * по свежему скрейпу/find-graph-gaps.js от того же дня, graph-gap-candidates.json
 * с generatedAt 06:55 UTC).
 *
 * Часть А: 6 новых узлов из 38 кандидатов missingKnownBrand (остальные 32
 * отброшены — дубли уже существующих узлов, рутинные трим/пакет-апдейты или
 * неподтверждённые слухи; см. финальный отчёт агента).
 * Часть Б: 8 узлов-сирот — 6 дублей-заглушек от скрапера (поля исправлены для
 * корректного отображения, рёбра НЕ добавлены — это не варианты/поколения,
 * а повторные записи уже отслеживаемой модели) + 1 реальная спецверсия
 * (привязана ребром variant_of) + заодно пойман и исправлен тот же bodyType-баг
 * на нескольких узлах (не-coupe модели получили bodyType=coupe по умолчанию).
 *
 * Идемпотентен: существующие id узлов/рёбер не дублируются.
 * Пишет список изменённых/добавленных узлов в public/data/last-graph-gap-run.json.
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const GRAPH = path.join(ROOT, 'public/data/evolution/graph.json')
const RUN_OUT = path.join(ROOT, 'public/data/last-graph-gap-run.json')

// Читаем заново с диска — другие процессы могут менять граф параллельно.
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
const edgeIds = new Set(g.edges.map(e => e.id))
const touched = []
const log = []

function addNode(n) {
  if (byId[n.id]) { log.push('= узел уже есть: ' + n.id); return }
  g.nodes.push(n); byId[n.id] = n
  touched.push(n.id); log.push('+ узел ' + n.id)
}
function patchNode(id, patch, why) {
  const n = byId[id]
  if (!n) { log.push('! нет узла ' + id); return }
  Object.assign(n, patch)
  if (!touched.includes(id)) touched.push(id)
  log.push('~ ' + id + ' — ' + why)
}
function addEdge(id, source, target, type, strength, note) {
  if (edgeIds.has(id)) { log.push('= ребро уже есть: ' + id); return }
  if (!byId[source] || !byId[target]) { log.push('! ребро ' + id + ' пропущено — нет узла'); return }
  const e = { id, source, target, type, strength }
  if (note) e.note = note
  g.edges.push(e); edgeIds.add(id)
  log.push('+ ребро ' + source + ' -' + type + '-> ' + target)
}

// ════════════════════ ЧАСТЬ А — новые модели ════════════════════

addNode({
  id: 'alfa-romeo-stelvio-2', label: 'Stelvio (2028)', fullName: 'Alfa Romeo Stelvio (2-е поколение)',
  type: 'generation', year: 2028, brandId: 'alfa-romeo', brandName: 'Alfa Romeo', codeName: 'STLA Large',
  modelSlug: 'alfa-romeo-stelvio-2', familyKey: 'alfa-stelvio', bodyType: 'suv', segment: 'exec', zone: 'suv_mid',
  hp: 480, engineType: 'phev',
  note: 'Полностью новое 2-е поколение Stelvio — впервые на платформе Stellantis STLA Large (не эволюция родной Giorgio), общей с новой Giulia. CEO Alfa Romeo Санто Фичили подтвердил перенос запуска на 2028 г. (изначально планировался electric-only запуск в 2027-м, затем отказались от EV-only стратегии). Стартовый ДВС — турбо-четвёрка Hurricane 2.0 (Stellantis) в PHEV-исполнении, 300 л.с. на моторе + суммарная целевая отдача гибридной системы 450-480 л.с. (в hp — верхняя оценка); отдельно заявлен полностью электрический Quadrifoglio с тремя моторами (оценочно 600-700+ л.с.). Платформа поддерживает 400В и 800В архитектуру, батареи 85-118 кВтч, запас хода до 800 км WLTP. Точные финальные цифры производства по состоянию на конец окт. 2026 ещё не раскрыты официально — hp ориентировочный. Источник: carscoops.com, carexpert.com.au, allmotornews.com (2026).',
})
addEdge('alfa-stelvio-1-2', 'alfa-romeo-stelvio', 'alfa-romeo-stelvio-2', 'evolves_into', 0.85)

addNode({
  id: 'ram-ramcharger-suv', label: 'Ram Ramcharger (2028)', fullName: 'Ram Ramcharger SUV',
  type: 'generation', year: 2028, brandId: 'ram', brandName: 'Ram',
  modelSlug: 'ram-ramcharger-suv', familyKey: 'ram-1500', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 395, engineType: 'v8',
  note: 'Возрождение классического имени Ramcharger (SUV на базе пикапа, выпускался 1974-1993) — новый полноразмерный 3-рядный внедорожник на платформе Ram 1500, подтверждён на Investor Day Stellantis в 2026 г., старт производства — 2028 модельный год. Базовый мотор — атмосферный HEMI 5.7 V8 395 л.с. (в hp, как у ram-1500-6), опционально HEMI 6.4 V8 ~470 л.с.; уже подтверждена топовая версия SRT с наддувным 6.2 Hellcat V8 (~777 л.с./680 фунт-фут). Также заявлена версия с удлинённым запасом хода (range-extender/EREV) — отдельная модель от уже выпускаемого пикапа Ram 1500 Ramcharger EREV (старт продаж в 2026-м, в графе пока не отслеживается отдельно). Источник: insideevs.com, motor1.com, hotcars.com, autoguide.com (2026).',
})
addEdge('ram-1500-6-ramcharger-suv', 'ram-1500-6', 'ram-ramcharger-suv', 'derived_from', 0.8)

addNode({
  id: 'gmc-hummer-ev-suv', label: 'GMC Hummer EV SUV', fullName: 'GMC Hummer EV SUV',
  type: 'generation', year: 2024, brandId: 'gmc', brandName: 'GMC', codeName: 'Hummer EV SUV / BT1 (Ultium)',
  modelSlug: 'gmc-hummer-ev-suv', familyKey: 'gmc-hummer', bodyType: 'suv', segment: 'suv_large', zone: 'suv_large',
  hp: 830, engineType: 'ev',
  note: 'Отдельный от пикапа 5-местный (2-рядный) внедорожный кузов на той же платформе Ultium/BT1 — первые поставки начались в начале 2024 (MY2024), вслед за пикапом (2021/2022). Версии: 2X (2 мотора, 625 л.с.) и 3X (3 мотора, 830 л.с./11500 фунт-фут, в hp — топ), запас хода 298-314 миль. В отличие от пикапа, для SUV производитель официально не заявлял форсированный режим «1000 л.с.» (WTF) — максимум серийной версии 830 л.с. Кандидат из скрейпа был датирован 2027 г. (рутинная статья о модельном обновлении), но сама модель на рынке с 2024-го — год в узле соответствует реальному старту продаж. Источник: Wikipedia (GMC Hummer EV), gmauthority.com, cars.usnews.com, truecar.com.',
})
addEdge('gmc-hummer-ev-suv-derived', 'gmc-hummer-ev', 'gmc-hummer-ev-suv', 'derived_from', 0.85)

addNode({
  id: 'cadillac-escalade-v-collector', label: 'Escalade-V Collector Series', fullName: 'Cadillac Escalade-V 125th Anniversary Collector Series',
  type: 'generation', year: 2027, brandId: 'cadillac', brandName: 'Cadillac', codeName: 'Escalade-V 125th Anniversary / T1XX',
  modelSlug: 'cadillac-escalade-v-collector', familyKey: 'cadillac-escalade', bodyType: 'suv', segment: 'luxury_performance', zone: 'suv_large',
  hp: 682, engineType: 'v8s', isLimited: true,
  note: 'Лимитированная серия (252 экз.) в честь 125-летия Cadillac, представлена в окт. 2026 как модель 2027 г. Механически идентична базовой Escalade-V (тот же наддувный 6.2 V8 R2650, 682 л.с./653 фунт-фут, hp не меняется) — отличия чисто косметические: эксклюзивные цвета кузова (Midnight Stone Frost/Vibrant White Tricoat), 24" кованые диски, синие суппорты, карбоновая отделка, именная табличка с номером, выбор VIN/серийного номера. Цена от $239 000. Источник: news.cadillac.com, gmauthority.com, carscoops.com, kbb.com (окт. 2026).',
})
addEdge('cad-escv-collector', 'cadillac-escalade-v', 'cadillac-escalade-v-collector', 'variant_of', 0.9)

addNode({
  id: 'volvo-xc40-1-fl', label: 'Volvo XC40 Facelift (2028)', fullName: 'Volvo XC40 Facelift',
  type: 'generation', year: 2028, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-xc40', familyKey: 'volvo-xc40',
  bodyType: 'suv', segment: 'compact', zone: 'suv_compact', hp: 247, engineType: 'i4t', isFacelift: true,
  note: 'Крупный рестайлинг 1-го поколения XC40 (не новая платформа/не новое поколение) — выход в начале 2027 как модель 2028 г. (модельный год 2027 пропущен). Новая передняя/задняя оптика (утончённый «Молот Тора»), вертикальный экран 11.2" (было 9"), Google-интеграция с Gemini AI. Вся линейка переходит на единый турбо 2.0 mild-hybrid (был опциональным для 2026 г.) — для AWD-версии 247 л.с./258 фунт-фут (в hp, аналог прежнего B5); более слабый 194-сильный мотор снят с производства. Чисто электрическая версия этого кузова продаётся отдельно как Volvo EX40 (уже в графе, volvo-ex40-1). Источник: kbb.com, edmunds.com, cars.usnews.com, carbuzz.com (2026).',
})
addEdge('volvo-xc40-1-facelift', 'volvo-xc40-1', 'volvo-xc40-1-fl', 'facelifted_to', 0.9)

addNode({
  id: 'bmw-m760-g70-lci', label: 'M760 xDrive (G70 LCI)', fullName: 'BMW M760 xDrive (G70 LCI)', codeName: 'G70 LCI M760',
  type: 'generation', year: 2027, brandId: 'bmw', brandName: 'BMW', modelSlug: 'bmw-7-series',
  bodyType: 'sedan', segment: 'luxury', zone: 'flagship_sed', hp: 570, engineType: 'v8t',
  note: 'Возврат V8 во флагманский 7-series — часть большого рестайлинга G70 (LCI), представленного в окт. 2026 вместе с i7 LCI (см. ncs-bmw-2027-i7). M760 xDrive сменяет 760i xDrive (536 л.с., I6 mild-hybrid) в роли топовой ДВС-версии: твин-турбо V8 4.4, 570 л.с. (в hp). Остальная ДВС-линейка LCI: 735i 282 л.с. (RWD, часть рынков), 740 xDrive 394 л.с. (I6 mild-hybrid), 750e xDrive PHEV 483 л.с. комбинированно, M760e PHEV 603 л.с./800 Нм. Источник: bmwblog.com, motor1.com (окт. 2026).',
})
addEdge('bmw-7g70-m760-lci', 'bmw-7-g70', 'bmw-m760-g70-lci', 'facelifted_to', 0.9)

// ════════════════════ ЧАСТЬ Б — сироты ════════════════════

// Jaguar Type 01 — оба узла ниже это ТА ЖЕ серийная машина, что уже полностью
// описана узлом jaguar-type01 (2027, concept_to_production от jaguar-type00,
// уже связан). Дубли от скрапера (разные статьи/даты), не отдельные тримы —
// ребро не добавляется, только исправлены поля для корректного отображения.
patchNode('ncs-jaguar-2028-type-01', {
  bodyType: 'sedan', segment: 'hypercar', zone: 'supercar', hp: 1016, engineType: 'ev',
  note: 'Дубль уже отслеживаемого jaguar-type01 (2027) — та же серийная модель (3 электромотора AWD, платформа JEA, 1016 л.с., запас хода WLTP >700км), другая статья netcarshow. Ребро не добавлено (это не отдельный трим/поколение, а повторная запись). Поля bodyType/zone/hp/engineType приведены в соответствие с jaguar-type01.',
}, 'дубль jaguar-type01 — исправлены bodyType(hatchback→sedan)/zone/hp/engineType, note добавлен')

patchNode('ncs-jaguar-2028-jaguar-type-01-ev', {
  bodyType: 'sedan', segment: 'hypercar', zone: 'supercar', hp: 1016, engineType: 'ev',
  note: 'Дубль уже отслеживаемого jaguar-type01 (2027) — статья Jalopnik про тот же реальный реveal (1015 л.с., запас хода ~400 миль — совпадает с jaguar-type01 в пределах округления). Ребро не добавлено (повторная запись той же модели). Поля приведены в соответствие с jaguar-type01.',
}, 'дубль jaguar-type01 — исправлены bodyType(hatchback→sedan)/zone/hp/engineType, note добавлен')

// Bentley Torcal — четыре узла ниже (из пяти найденных сирот-фрагментов)
// описывают ТУ ЖЕ серийную модель, что уже полностью отслеживается узлом
// bentley-torcal (2026, 810 л.с., связан inspired_by←Bentayga и variant_of→
// Torcal S). Это разные статьи (netcarshow/autoweek/thedrive/jalopnik) про
// один и тот же реальный релиз/первые тест-драйвы — не отдельные тримы.
// Заодно пойман тот же bodyType-баг, что и в остальных ncs-узлах этой партии:
// ncs-bentley-2028-torcal получил bodyType=coupe, ...-first-ride — bodyType=
// hatchback, хотя это один и тот же 5-местный электро-SUV.
patchNode('ncs-bentley-2028-torcal', {
  bodyType: 'suv', segment: 'suv', zone: 'suv_large', hp: 810, engineType: 'ev',
  note: 'Дубль уже отслеживаемого bentley-torcal (2026) — профиль модели с netcarshow (габариты 5м, самый короткий 4-дверный в линейке, багажник 460л). Ребро не добавлено (повторная запись той же модели). Поля приведены в соответствие с bentley-torcal (исправлен bodyType coupe→suv — тот же баг дефолтного значения, что и у BMW/Nissan узлов этой партии).',
}, 'дубль bentley-torcal — исправлены bodyType(coupe→suv)/segment/zone/hp/engineType, note добавлен')

patchNode('ncs-bentley-2028-bentley-torcal-breaks', {
  zone: 'suv_large', segment: 'suv', hp: 810,
  note: 'Дубль уже отслеживаемого bentley-torcal (2026) — статья Autoweek о выходе Bentley в электрическую эру после 107 лет бензиновых моделей. Тот же релиз, что и у bentley-torcal/остальных Torcal-дублей этой партии. Ребро не добавлено (повторная запись).',
}, 'дубль bentley-torcal — исправлены zone/segment, hp добавлен, note добавлен')

patchNode('ncs-bentley-2028-bentley-torcal-first-ride', {
  bodyType: 'suv', zone: 'suv_large', segment: 'suv', hp: 810,
  note: 'Дубль уже отслеживаемого bentley-torcal (2026) — репортаж The Drive о первой поездке на прототипе. Тот же автомобиль (исправлен bodyType hatchback→suv — тот же баг дефолтного значения). Ребро не добавлено (повторная запись той же модели).',
}, 'дубль bentley-torcal — исправлены bodyType(hatchback→suv)/zone/segment, hp добавлен, note добавлен')

patchNode('ncs-bentley-2028-bentley-torcal-aims-to-capture-that-tangibl', {
  zone: 'suv_large', segment: 'suv', hp: 810,
  note: 'Дубль уже отслеживаемого bentley-torcal (2026) — обзор Jalopnik («мощнее любого Bentley до него» — вероятно, отсылка к топовой версии Torcal S, 876 л.с., уже отдельный узел bentley-torcal-s). База hp=810 — как у стандартного Torcal; если статья именно про S-версию, см. bentley-torcal-s. Ребро не добавлено (повторная запись).',
}, 'дубль bentley-torcal — исправлены zone/segment, hp добавлен, note добавлен')

// BMW i3 (NA0) — дубль уже исправленного в прошлом прогоне узла
// ncs-bmw-2027-bmw-i3 (см. add-gap-run-2026-10-28.js: label "i3 (NA0)", sedan,
// 463 л.с., ev, уже связан evolves_into←i4 G26). Этот узел — отдельная
// scraper-запись той же машины под другим id/слагом (другая статья netcarshow).
patchNode('ncs-bmw-2027-i3', {
  bodyType: 'sedan', segment: 'premium_compact', zone: 'electric', hp: 463, engineType: 'ev', codeName: 'NA0',
  note: 'Дубль уже отслеживаемого и связанного ncs-bmw-2027-bmw-i3 ("i3 (NA0)") — тот же электроседан на платформе Neue Klasse (463 л.с., 50 xDrive), другая статья netcarshow. Ребро не добавлено (повторная запись той же модели). Исправлен тот же bodyType-баг (coupe→sedan), что и на сиблинге в прошлом прогоне.',
}, 'дубль ncs-bmw-2027-bmw-i3 — исправлены bodyType(coupe→sedan)/zone/hp/engineType/codeName, note добавлен')

// Nissan Pathfinder Special Edition — РЕАЛЬНАЯ юбилейная спецверсия (40 лет
// нэймплейту), не дубль: отдельный трим уже отслеживаемого 5-го поколения
// (nissan-pathfinder-r53). Та же механика (V6 3.5 атмо, 284 л.с.), только
// ретро-декор/колёса/аудио/отделка салона — получает ребро variant_of.
patchNode('ncs-nissan-2027-pathfinder-special-edition', {
  bodyType: 'suv', segment: 'mid_suv', zone: 'suv_mid', hp: 284, engineType: 'v6', isLimited: true,
  note: 'Юбилейная спецверсия к 40-летию нэймплейта Pathfinder (с 1987 г.), представлена в окт. 2026 как модель 2027 г., в продаже с ноября 2026. Механически идентична базовому Gen.5/R53 (атмосферный V6 3.5, 284 л.с., hp не меняется) — отличия: двухцветный салон (чёрный/бордовый) с отделкой TailorFit, красные экстерьерные акценты, чёрные 20" диски, шильдик «est. 1986», аудиосистема Bose 12 динамиков, панорамная крыша. Цена от $47 390 (FWD) / $49 390 (AWD). Источник: usa.nissannews.com, kbb.com, tflcar.com (окт. 2026).',
}, 'исправлены bodyType(coupe→suv)/segment/zone, hp/engineType/isLimited/note добавлены, подключён к Pathfinder R53')
addEdge('nissan-pf-r53-special-edition', 'nissan-pathfinder-r53', 'ncs-nissan-2027-pathfinder-special-edition', 'variant_of', 0.85)

// ════════════════════ запись ════════════════════

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const run = touched.map(id => { const n = byId[id]; return { id, label: n.label, brandName: n.brandName, year: n.year } })
fs.writeFileSync(RUN_OUT, JSON.stringify(run, null, 2), 'utf8')
log.forEach(l => console.log(l))
console.log(`\nУзлов добавлено/изменено: ${run.length}; всего узлов ${g.nodes.length}, рёбер ${g.edges.length}`)
