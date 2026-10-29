#!/usr/bin/env node
// Аудит Dodge (свежий, скептический проход поверх уже сделанных ранее в этой
// сессии fix-dodge-graph.js / fix-dodge-structure.js / fix-challenger-codes-
// facelift.js / fix-ford-plymouth.js — базовые цепочки поколений считаем уже
// в целом верными, искали именно то, что эти проходы могли упустить).
//
//  1. Copperhead (2029, SRT, преемник Viper по позиционированию) — hp и
//     engineType НЕ подтверждаю. Веб-поиск даёт реальный, неразрешённый
//     разнобой в прессе на момент написания: шеф SRT Тим Кунискис отверг
//     гибридный V8, подтвердил ДВС, но детали не раскрыл; Car and Driver
//     склоняется к V8; MotorTrend — «выбор из Hurricane I6 ИЛИ V8»; TheDrive
//     прямо пишет «может не быть V8» и «не на базе Charger» (конфликт даже с
//     платформой — другие источники говорят, что это STLA Large, как и
//     Charger). hp нигде не публиковался. Было engineType:"v8" — это
//     фальшивая точность, у которой нет опоры в фактах; меняю на null,
//     добавляю note с разбором разногласий и источниками. hp остаётся null.
//     Источники: caranddriver.com, motortrend.com, thedrive.com,
//     autoguide.com, moparinsiders.com (доступ 2026-10-21).
//
//  2. dodge-charger-sixpack(-4dr)/super-bee(-4dr): engineType был сырой
//     строкой "I6 Hurricane TT" (4 узла) — не матчит доминирующую в графе
//     нотацию для турбо-R6 (i6t, используется 76 раз, напр. bmw-m3-g80).
//     Привожу к "i6t" + добавляю engineCC:2993 (реальный рабочий объём
//     Stellantis Hurricane TT — 2993см³, маркетингово «3.0L»). Мощности уже
//     верны (420/420/600/600 — подтверждено официальным dodge.com и Hagerty/
//     TopGear/MotorWeek). Источник объёма: en.wikipedia.org/Stellantis_
//     Hurricane_engine.
//     Заодно обновляю note у Super Bee: на момент его прошлой фиксации было
//     известно только про Launch Edition без анонса продолжения — сейчас уже
//     подтверждено расширение выпуска на MY2028 (TFLcar, CarPro, PRNewswire,
//     08.2026). isLimited:true у Launch Edition остаётся верным как есть.
//
//  3. Пропущен реальный средний трим Charger «Scat Pack» (550 л.с., Hurricane
//     HO) между R/T (420, SO) и Super Bee (600, HO+) — официально на
//     dodge.com/dodge-muscle/sixpack.html, подтверждено MotorWeek/
//     JayMaloneCDJR. Это НЕ домысел: собственный description существующего
//     dodge-charger-super-bee уже ссылался на него текстом («на 50 л.с.
//     мощнее Scat Pack»), но узла не было — явный пропуск предыдущего
//     прохода. Добавляю 2 узла (2-Door/4-Door) и вставляю их в variant_of
//     цепочку R/T → Scat Pack → Super Bee (по образцу уже существующей пары
//     4dr/2dr у Sixpack и Super Bee).
//
//  4. dodge-charger-daytona-ev(-4dr): zone:"electric" — тот же ленивый
//     плейсхолдер, что чинили на ~30 узлах в других брендах в этой сессии
//     (вместо класса кузова). ЭТИ узлы — та же генерация (STLA Large,
//     2024+), что и Sixpack/Super Bee, и у ВСЕХ ICE-сиблингов этой генерации
//     (2-Door и 4-Door одинаково) zone="gt_coupe", а не exec_sed, который
//     использовался только у ПРЕДЫДУЩЕГО, чисто-седанного поколения LX/LD.
//     Привожу Daytona EV 2-Door/4-Door к zone="gt_coupe" — согласуется со
//     своим собственным поколением, а не с чужим.
//
//  5. Avenger Gen.2 — классический баг «якорь тайно = топ-трим» (см. прим.
//     к gmc-sierra-4-base в этой же сессии). dodge-avenger-2 честно
//     подписан "Avenger R/T" (не врёт в лейбле), НО это единственный узел на
//     всё поколение 2008-2014 — официальный пресс-кит Stellantis
//     подтверждает линейку SE/SXT/R/T, т.е. базовый SE (2.4L I4, 173hp)
//     вообще не представлен в графе. Добавляю dodge-avenger-2-base
//     ("Avenger Gen.2", 173hp, по образцу Avenger Gen.1), переподключаю
//     R/T через variant_of, и переставляю на новый базовый узел ДВЕ
//     структурные связи уровня поколения/платформы (которые были
//     прицеплены к триму R/T, хотя по смыслу относятся ко всему поколению):
//     inspired_by Avenger Gen.1→(revival) и shares_platform →Journey.
//     Отдельно: само ребро Avenger Gen.1→Gen.2 оставляю inspired_by (не
//     меняю тип) — это настоящее возрождение имени через 7-8 лет паузы
//     (купе 1995-2000 на платформе Mitsubishi DSM → седан 2008-2014 на
//     независимой платформе JS), БЕЗ инженерной преемственности, та же
//     семантика, что уже используется в графе для подобных кейсов
//     ( срав. azlk→moskvich-3, inspired_by 0.3). evolves_into тут было бы
//     неверно. Источники: Wikipedia Dodge Avenger, Stellantis Media press
//     kit 2008, jdpower.com.
//
//  6. Journey — тот же баг: только dodge-journey-rt/-rt-2011 (R/T и его
//     фейслифт), настоящего базового узла поколения нет. Единственное
//     поколение JC (2009-2020), базовый SE — 2.4L I4, 173hp (подтверждено
//     carsdirect/cars.com/edmunds). Добавляю dodge-journey (база),
//     R/T → variant_of него; переставляю на базовый узел ребро
//     shares_platform от Avenger (платформенный факт уровня поколения, не
//     трима) и оба конца ребра inspired_by от Nitro (Nitro вдохновил нишу
//     Journey в целом, не конкретно трим R/T). facelifted_to R/T→R/T
//     Pentastar не трогаю — это честная трим-к-триму связь (та же R/T,
//     сменился мотор на Pentastar при фейслифте 2011).
//
//  7. Nitro — аналогично: только dodge-nitro-rt. Единственное поколение KA
//     (2007-2011/2012), базовый трим на старте — SXT, 3.7L V6, 210hp
//     (подтверждено cars.com/carfax/thecarconnection; четырёхцилиндровой
//     версии у Nitro не было вообще). Добавляю dodge-nitro (база),
//     R/T → variant_of него; переставляю источник ребра inspired_by от
//     Caliber на новый базовый узел.
//
//  8. Durango Gen.3 (2011-...): проверил актуальный статус — НЕ
//     прекращено без преемника, как можно было предположить по старым
//     данным. Выпуск текущего поколения (WD) продлён минимум до MY2028
//     (решение озвучено в 2026), поколение 4 (кодовое D6U, по контракту
//     UAW 2023г.) перенесено на 2029+ — характеристик/дизайна в публичном
//     поле ещё нет вообще, добавлять как узел рано (тот же принцип, что и
//     для Copperhead — не фабриковать неподтверждённое). Структура в графе
//     (Gen.1→2→3) остаётся верной как есть, добавляю только поясняющий note
//     со источниками на Gen.3, узел/рёбра не меняю.
//
//  9. Caravan Gen.5: note уже корректно (из прошлого прохода) фиксирует
//     полный цикл 2008-2020 — проверил повторно, претензий нет, не трогаю.
//     Проверил кросс-брендовое ребро на преемника (Chrysler Voyager/
//     Pacifica) — реальный прямой преемник Grand Caravan в низком ценовом
//     сегменте это Chrysler Voyager (2020), которого В ГРАФЕ НЕТ как узла
//     (есть только chrysler-pacifica-2016 — другая, более дорогая модель,
//     и chrysler-voyager-1 — это 1984г., 1-е поколение, не 2020-й ребейдж).
//     Создавать новый узел Chrysler не буду — это нода ЧУЖОГО бренда,
//     который прямо сейчас параллельно аудirует другой агент (риск
//     коллизии); к тому же нигде в графе НЕ нашлось даже заявленного в ТЗ
//     прецедента «Plymouth→Chrysler nameplate-retirement» (проверил все
//     рёбра от вымерших брендов — такого паттерна просто не существует).
//     Фиксирую как проверено-но-не-исправлено ниже в отчёте.
//
// 10. "inspired" (без _by) / "evolved_into" — целенаправленно прогреплены
//     ВСЕ рёбра графа на эти 2 опечатки: обе встречаются точечно в других
//     брендах (Ford, BMW, Lynk&Co, Haval, Li Auto, Lotus/Caterham), но ни
//     разу не касаются узлов Dodge (ни как source, ни как target). Исправлений
//     не требуется, чисто.
//
// Источники (общие): en.wikipedia.org (Dodge Avenger/Journey/Nitro/Durango/
// Stellantis Hurricane engine), dodge.com/dodge-muscle/sixpack.html,
// media.stellantisnorthamerica.com, moparinsiders.com, topgear.com,
// hagerty.com, motorweek.org, caranddriver.com, motortrend.com,
// thedrive.com, carsdirect.com, cars.com, edmunds.com, carfax.com —
// проверено веб-поиском 2026-10-21 (двойная проверка на Copperhead и
// Durango — конфликтующие источники перепроверены вторым запросом).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно работает агент
// по Chrysler/Jeep/Ram над тем же файлом, мерджимся в актуальное состояние.
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
function retargetEdgeTarget(id, newTarget) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  console.log(`  🔀 ${id}: target ${e.target} → ${newTarget}`)
  e.target = newTarget
}

console.log('=== 1. Copperhead: hp/engineType — не фабрикуем неподтверждённое ===')
fixNode('dodge-copperhead', {
  engineType: null,
  description: 'Planned Dodge Copperhead — спортивный флагман SRT, позиционируется прессой как духовный преемник Viper (сам Dodge это так не называет). Показан журналистам на Investor Day, серийные характеристики не раскрыты.',
  note: 'hp и engineType намеренно оставлены null/неизвестны — реальный паблик-рекорд на 2026-10 содержит прямой конфликт источников: шеф SRT Тим Кунискис отверг гибридный V8 и подтвердил ДВС, но детали не раскрыл; Car and Driver склоняется к V8; MotorTrend пишет про «выбор из Hurricane I6 или V8»; The Drive прямо допускает, что V8 может не быть вообще, и спорит даже платформу (не точно STLA Large/не точно на базе Charger). Было engineType:"v8" без опоры в фактах — убрано. Источники: caranddriver.com, motortrend.com, thedrive.com, autoguide.com, moparinsiders.com (доступ 2026-10-21, перепроверено двумя независимыми запросами).',
})

console.log('\n=== 2. Sixpack/Super Bee: engineType → i6t (графовая нотация турбо-R6) ===')
;['dodge-charger-sixpack', 'dodge-charger-sixpack-4dr', 'dodge-charger-super-bee', 'dodge-charger-super-bee-4dr']
  .forEach(id => fixNode(id, { engineType: 'i6t', engineCC: 2993 }))
fixNode('dodge-charger-super-bee', {
  note: 'Launch Edition 2027г. — изначально заявлялся как ограниченный первый релиз; с 08.2026 подтверждено расширение выпуска Super Bee на MY2028 для широкой аудитории (TFLcar, CarPro, PRNewswire). isLimited=true верно описывает именно Launch Edition, не модель в целом.',
})
fixNode('dodge-charger-super-bee-4dr', {
  note: 'Технически идентичен 2-Door версии. Launch Edition 2027г. — с 08.2026 подтверждено расширение выпуска на MY2028 для широкой аудитории (TFLcar, CarPro, PRNewswire).',
})

console.log('\n=== 3. Charger Scat Pack (550hp) — пропущенный средний трим Sixpack-линейки ===')
addNode({
  id: 'dodge-charger-scatpack', label: 'Charger Scat Pack 2-Door', fullName: 'Dodge Charger Scat Pack',
  type: 'generation', year: 2026, brandId: 'dodge', brandName: 'Dodge', codeName: 'Sixpack',
  modelSlug: 'dodge-charger', bodyType: 'coupe', segment: 'muscle', zone: 'gt_coupe',
  hp: 550, engineType: 'i6t', engineCC: 2993,
  description: 'Средний трим: тот же твин-турбо Hurricane I6, что и R/T, но в настройке High Output (550 л.с./531 lb-ft) — между R/T (420, Standard Output) и Super Bee (600, HO+).',
})
addNode({
  id: 'dodge-charger-scatpack-4dr', label: 'Charger Scat Pack 4-Door',
  type: 'generation', year: 2026, brandId: 'dodge', brandName: 'Dodge', codeName: 'Sixpack',
  modelSlug: 'dodge-charger', bodyType: 'sedan', segment: 'muscle', zone: 'gt_coupe',
  hp: 550, engineType: 'i6t', engineCC: 2993,
  description: 'Технически идентичен 2-Door версии — отличие только в кузове.',
})
retargetEdgeTarget('e-charger-sixpack-superbee', 'dodge-charger-scatpack-4dr') // было R/T напрямую в Super Bee, пропуская реальный средний трим
addEdge('e-scatpack-superbee-4dr', 'dodge-charger-scatpack-4dr', 'dodge-charger-super-bee-4dr', 'variant_of', 0.85)
addEdge('e-scatpack-4dr-2dr', 'dodge-charger-scatpack-4dr', 'dodge-charger-scatpack', 'variant_of', 0.9)

console.log('\n=== 4. Charger Daytona EV: zone electric → gt_coupe (матч со своим поколением) ===')
fixNode('dodge-charger-daytona-ev', { zone: 'gt_coupe' })
fixNode('dodge-charger-daytona-ev-4dr', { zone: 'gt_coupe' })

console.log('\n=== 5. Avenger Gen.2: добавляем настоящий базовый узел поколения (якорь был только R/T) ===')
addNode({
  id: 'dodge-avenger-2-base', label: 'Avenger Gen.2', fullName: 'Dodge Avenger SE',
  type: 'generation', year: 2008, brandId: 'dodge', brandName: 'Dodge', codeName: 'JS Avenger',
  modelSlug: 'dodge-avenger-2', familyKey: 'dodge-avenger',
  bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 173, engineType: 'petrol_i4', engineCC: 2400,
  note: '2-е поколение (2008-2014), базовый трим SE/SXT: 2.4L I4 World Engine, 173 л.с./166 lb-ft, 4-ст. АКПП, FWD. Топ-трим R/T (3.5L V6, 235hp) — см. отдельный узел dodge-avenger-2 — вынесен через variant_of; ранее R/T ошибочно был единственным узлом на всё поколение. Источники: Stellantis Media press kit 2008, jdpower.com, auto123.com.',
})
addEdge('e-avenger2-base-rt', 'dodge-avenger-2-base', 'dodge-avenger-2', 'variant_of', 0.9)
retargetEdgeTarget('e-avenger1-avenger2', 'dodge-avenger-2-base') // возрождение имени — факт уровня поколения, не трима R/T
retargetEdgeSource('e-avenger2-journey-platform', 'dodge-avenger-2-base') // платформенный факт (JS→JC) уровня поколения

console.log('\n=== 6. Journey: добавляем базовый узел поколения (якорь был только R/T) ===')
addNode({
  id: 'dodge-journey', label: 'Journey', fullName: 'Dodge Journey SE',
  type: 'generation', year: 2009, brandId: 'dodge', brandName: 'Dodge', codeName: 'JC Journey',
  modelSlug: 'dodge-journey', bodyType: 'suv', segment: 'midsize_suv', zone: 'suv_mid',
  hp: 173, engineType: 'petrol_i4', engineCC: 2400,
  note: 'Единственное поколение JC (2009-2020). Базовый трим SE: 2.4L I4, 173 л.с./166 lb-ft, 4-ст. АКПП, FWD. Топ-трим R/T (3.5L→3.6L Pentastar с 2011) — см. dodge-journey-rt/-rt-2011 — вынесен через variant_of; ранее R/T ошибочно был единственным узлом на всё поколение. Источники: carsdirect.com, cars.com, edmunds.com.',
})
addEdge('e-journey-base-rt', 'dodge-journey', 'dodge-journey-rt', 'variant_of', 0.9)
retargetEdgeTarget('e-avenger2-journey-platform', 'dodge-journey') // платформенный факт на базовый узел, не на трим R/T
retargetEdgeTarget('e-nitro-journey', 'dodge-journey') // источник этого ребра (Nitro) переставляется ниже, в шаге 7

console.log('\n=== 7. Nitro: добавляем базовый узел поколения (якорь был только R/T) ===')
addNode({
  id: 'dodge-nitro', label: 'Nitro', fullName: 'Dodge Nitro SXT',
  type: 'generation', year: 2007, brandId: 'dodge', brandName: 'Dodge', codeName: 'KA Nitro',
  modelSlug: 'dodge-nitro', bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 210, engineType: 'petrol_v6', engineCC: 3700,
  note: 'Единственное поколение KA (2007-2011/2012), на платформе Jeep KK (общая с Jeep Liberty). Базовый трим на старте (SXT): 3.7L V6, 210 л.с./235 lb-ft — четырёхцилиндровой версии не было вообще. Топ-трим R/T (4.0L V6, 260hp) — см. dodge-nitro-rt — вынесен через variant_of; ранее R/T ошибочно был единственным узлом на всё поколение. Источники: cars.com, carfax.com, thecarconnection.com.',
})
addEdge('e-nitro-base-rt', 'dodge-nitro', 'dodge-nitro-rt', 'variant_of', 0.9)
retargetEdgeSource('e-nitro-journey', 'dodge-nitro') // Nitro вдохновил нишу Journey в целом, не конкретно трим R/T
retargetEdgeTarget('e-caliber-nitro', 'dodge-nitro') // Caliber вдохновил нишу Nitro в целом, не трим R/T

console.log('\n=== 8. Durango Gen.3: структура верна, добавляю поясняющий note по актуальному статусу ===')
fixNode('dodge-durango-gen3', {
  note: 'Проверено 2026-10: текущее поколение (WD) НЕ прекращено без преемника — выпуск продлён минимум до MY2028. Поколение 4 (кодовое D6U, заявлено контрактом UAW 2023г.) перенесено на 2029+, публичных данных по дизайну/силовым установкам пока нет — не добавляю как узел (та же логика, что для Copperhead: не фабриковать неподтверждённое). Источники: moparinsiders.com, topspeed.com, hellcat.org forum (производственные анонсы Stellantis), доступ 2026-10-21.',
})

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
