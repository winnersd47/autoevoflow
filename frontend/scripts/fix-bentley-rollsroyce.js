#!/usr/bin/env node
// Аудит Bentley + Rolls-Royce (британские ультра-люкс марки). Параллельно в
// этом же файле Jaguar+Land Rover ведёт другой агент — их brandId не трогаем.
//
//  1. Bentley Torcal — КЛАСТЕР ИЗ 5 ORPHAN-ДУБЛЕЙ сырых скрейп-дампов netcarshow/
//     autoweek/jalopnik/thedrive об ОДНОМ и том же анонсе Torcal (2026, первый
//     электро-Bentley, EV-SUV на платформе PPE/Porsche Cayenne Electric):
//     ncs-bentley-2028-bentley-torcal-breaks, ncs-bentley-2028-torcal (полностью
//     пустой — hp/engineType undefined), ncs-bentley-2028-bentley-torcal-ev-charts-
//     a-slightly-strange, ncs-bentley-2028-bentley-torcal-first-ride,
//     ncs-bentley-2028-bentley-torcal-aims-to-capture-that-tangibl — 0 рёбер у
//     каждого, противоречивые bodyType (suv/coupe/hatchback) у одной и той же
//     машины. Вся реальная информация уже в bentley-torcal(810лс)/
//     bentley-torcal-s(876лс). Удаляю все 5 без переноса данных — ничего
//     уникального, одни и те же цифры/платформа просто продублированы.
//
//  2. Continental GT Supersports 2027 (design-theme-by-mulliner +
//     bentley-supersports-first-drive) — ПРОВЕРЕНО: это НЕ паттерн Torcal.
//     Оба узла уже корректно связаны цепочкой gt4→first-drive→design-theme
//     (variant_of/variant_of) с полноценными note+источниками — реальный,
//     отдельный от GT4 вариант (V8 без гибрида, "hybrid-delete", только RWD,
//     657лс, лимитировано 500шт). Фикс не нужен, оставляю как есть.
//
//  3. Rolls-Royce Phantom Extended Regatta / Ghost Extended Savile Row —
//     подтверждено веб-поиском (press.rolls-roycemotorcars.com): это РЕАЛЬНЫЕ
//     one-of-one bespoke-заказы Mulliner на базе Phantom Extended / Ghost
//     Extended (EWB) — цветографика/отделка (яхтенная тема Regatta, Goodwood
//     FoS 2026; портновская тема Savile Row), НЕ отдельная модель/кузов. Были
//     грубые ошибки скрейпера: zone "midsize_sed" и bodyType "coupe" (это
//     ПОЛНОРАЗМЕРНЫЕ СЕДАНЫ flagship_sed, никогда не купе) и engineType "i4t"
//     (реально 6.75Л твин-турбо V12). Исправлены zone→flagship_sed,
//     bodyType→sedan, engineType→v12t, добавлен isLimited (one-of-one) и
//     fullName с официальным именем. Рёбра к *-ewb через variant_of уже были
//     верны — не трогаю.
//
//  4. Rolls-Royce Spectre Series II / Black Badge Series II (2027) — ПРОВЕРЕНО
//     веб-поиском: реальный подтверждённый среднециклевой рестайлинг (не шум
//     скрейпера) — батарея 102→112кВтч, запас хода WLTP +18% (390 миль), новые
//     23" диски, отделка Duality Twill. Уже верно смоделирован как
//     facelifted_to от rr-spectre/rr-spectre-blackbadge — структуру не меняю,
//     поправил только hp Black Badge Series II: было 650, реально до 680 PS/
//     670 л.с. в режиме Infinity Mode (самый мощный серийный Rolls-Royce в
//     истории). Добавил note с источниками на оба узла.
//
//  5. Rolls-Royce Project Nightingale Concept (2026) — ПРОВЕРЕНО веб-поиском,
//     включая официальный пресс-релиз press.rolls-roycemotorcars.com: РЕАЛЬНЫЙ
//     проект, не выдумка скрейпера. "Project Nightingale" — коучбилд-коллекция
//     Rolls-Royce, двухместный открытый электромобиль в духе ар-деко (отсылка
//     к 16EX/17EX 1920-30х), ограничен 100 клиентскими экземплярами (поставки
//     с 2028, только по приглашению). Это малая коммерческая коучбилд-серия
//     того же типа, что Sweptail/Boat Tail/Droptail, а не одноразовый шоу-кар
//     — переклассифицирован: zone concept→open_top, codeName→Coachbuild (как
//     у сиблингов), isConcept снят, isLimited=true добавлен. Существующие
//     рёбра (derived_from от Spectre, inspired_by от Arcadia Droptail)
//     остаются — логичны (общая EV-платформа, та же Coachbuild-линия).
//
//  6. Bentley EXP 10 Speed 6 Concept (2015) → inspired_by — БЫЛА ОШИБКА:
//     указывало на Continental GT4 (2025, 4-е поколение). Веб-поиск (3
//     независимых источника: conceptcarz, autoevolution, motorauthority)
//     подтверждает — концепт вдохновил именно 3-е поколение (2018, GT3):
//     фары/решётка и задние "плечи" предсерийного GT3 прямо повторяют EXP 10.
//     Ребро переориентировано gt4→gt3.
//
//  7. Bentley EXP 100 GT Concept (2019, 1341лс EV) — ПРОВЕРЕНО: входящее ребро
//     "inspired_by Mulsanne" ничем не подтверждается, удалено. Официальный
//     источник (bentleymotors.com/designboom) называет ДРУГИЕ прообразы:
//     задние "плечи" — от R-Type Continental (1952), круглые фары над
//     решёткой — от 4½ Litre Blower (1929). Добавлены оба верных ребра.
//     Форвард-связь к Torcal (которую просили проверить) НЕ добавляю —
//     источники её не подтверждают: разные кузова (GT-купе-концепт vs.
//     серийный SUV) и разные платформы (визионерский концепт vs. серийная
//     PPE/Porsche Cayenne Electric) — такая связь была бы придуманной.
//
//  8. Continental GT I→II→III→IV и все trim-рёбра (variant_of/facelifted_to) —
//     ПРОВЕРЕНО: вся цепочка поколений и ~15 тримов (Speed/Supersports/V8/S/
//     Mulliner/GT3-R и т.д.) уже верно привязаны variant_of к СВОЕЙ генерации;
//     "Clio RS200"-паттерна (трим на поколение назад) нигде не найдено.
//     Mulsanne (discontinued 2020, без преемника) — подтверждено, корректный
//     тупик. EXP 9 F→Bentayga — уже верно concept_to_production. Фикс не нужен.
//
// Источники: press.rolls-roycemotorcars.com, robbreport.com, autoblog.com,
// carscoops.com, autoevolution.com, carbuzz.com, bmwblog.com, pistonheads.com,
// conceptcarz.com, motorauthority.com, bentleymotors.com, designboom.com,
// motor1.com, en.wikipedia.org — проверено веб-поиском 2026-10-21 (по каждому
// спорному пункту — независимо минимум двумя источниками).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно по этому же
// файлу работает агент по Jaguar/Land Rover, мерджимся в актуальное состояние.
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id, source, '->', target); return }
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
function retargetEdgeTarget(id, newTarget) {
  const e = g.edges.find(e => e.id === id)
  if (!e) { console.log('  ⚠️  ребро не найдено:', id); return }
  console.log(`  🔀 ${id}: target ${e.target} → ${newTarget}`)
  e.target = newTarget
}
function deleteNode(id) {
  const before = g.nodes.length
  g.nodes = g.nodes.filter(n => n.id !== id)
  byId.delete(id)
  console.log(g.nodes.length < before ? `  🗑️  удалён узел ${id}` : `  ⚠️  узел не найден: ${id}`)
}

console.log('=== 1. Bentley Torcal: удаляем 5 orphan-дублей сырых скрейп-дампов ===')
;[
  'ncs-bentley-2028-bentley-torcal-breaks',
  'ncs-bentley-2028-torcal',
  'ncs-bentley-2028-bentley-torcal-ev-charts-a-slightly-strange',
  'ncs-bentley-2028-bentley-torcal-first-ride',
  'ncs-bentley-2028-bentley-torcal-aims-to-capture-that-tangibl',
].forEach(deleteNode)
// защитная зачистка — на случай, если на эти id успели повиснуть рёбра
;['ncs-bentley-2028-bentley-torcal-breaks','ncs-bentley-2028-torcal','ncs-bentley-2028-bentley-torcal-ev-charts-a-slightly-strange','ncs-bentley-2028-bentley-torcal-first-ride','ncs-bentley-2028-bentley-torcal-aims-to-capture-that-tangibl']
  .forEach(id => { const before = g.edges.length; g.edges = g.edges.filter(e => e.source !== id && e.target !== id); if (g.edges.length < before) console.log(`  🗑️  попутно удалены рёбра, ссылавшиеся на ${id}`) })

console.log('\n=== 2. Continental GT Supersports 2027 (design-theme-by-mulliner / first-drive) ===')
console.log('   ПРОВЕРЕНО: уже верно связаны цепочкой gt4→first-drive→design-theme, реальный отдельный вариант (не Torcal-паттерн) — фикс не нужен')

console.log('\n=== 3. RR Phantom Extended Regatta / Ghost Extended Savile Row: zone/bodyType/engineType были ошибочны ===')
fixNode('ncs-rolls-royce-2026-phantom-extended-regatta', {
  fullName: 'Rolls-Royce Phantom Regatta',
  zone: 'flagship_sed',
  bodyType: 'sedan',
  engineType: 'v12t',
  isLimited: true,
  note: 'Подтверждено веб-поиском (press.rolls-roycemotorcars.com) — уникальный one-of-one bespoke-заказ Mulliner на базе Phantom Extended (EWB), дебютировал на Goodwood Festival of Speed 2026, тема — яхты/регаты южного побережья Англии (Solent). Тот же 6.75Л твин-турбо V12, 563 л.с./664 lb-ft, что и у базового Phantom EWB — не отдельная механическая версия, не отдельный кузов. zone/bodyType/engineType были ошибочно midsize_sed/coupe/i4t (артефакт скрейпера) — это полноразмерный флагманский седан. Источники: press.rolls-roycemotorcars.com, carscoops.com.',
})
fixNode('ncs-rolls-royce-2026-ghost-extended-savile-row', {
  fullName: 'Rolls-Royce Ghost Savile Row',
  zone: 'flagship_sed',
  bodyType: 'sedan',
  engineType: 'v12t',
  isLimited: true,
  note: 'Подтверждено веб-поиском (press.rolls-roycemotorcars.com) — уникальный one-of-one bespoke-заказ Mulliner на базе Ghost Extended (EWB), тема — британский костюмный пошив Savile Row (двухцветная Midnight Sapphire/English White, прострочка-"ёлочка" как у портных). Тот же 6.75Л твин-турбо V12, 563 л.с., что и базовый Ghost EWB. zone/bodyType/engineType были ошибочно midsize_sed/coupe/i4t (артефакт скрейпера). Источники: press.rolls-roycemotorcars.com, autoblog.com, autoevolution.com.',
})

console.log('\n=== 4. RR Spectre Series II / Black Badge Series II (2027): реальный рестайлинг, поправлен hp Black Badge ===')
fixNode('ncs-rolls-royce-2027-rolls-royce-spectre-black-badge-series-', {
  hp: 670,
  note: 'Подтверждено веб-поиском (autoevolution.com, carbuzz.com, bmwblog.com) — реальный среднециклевой рестайлинг Series II (2027): батарея 102→112 кВтч, запас хода WLTP +18% (627км/390 миль), заряд быстрее на 14%, новые 23" диски, отделка Duality Twill. Black Badge Series II в режиме Infinity Mode выдаёт до 680 PS/670 л.с. — самый мощный серийный Rolls-Royce в истории (было ошибочно указано 650 л.с.).',
})
fixNode('ncs-rolls-royce-2027-rolls-royce-spectre-series-ii', {
  note: 'Подтверждено веб-поиском — реальный рестайлинг, не дубль/не шум скрейпера: батарея 102→112 кВтч, запас хода WLTP +18% (627км/390 миль), новые 23" диски, отделка Duality Twill. Мощность базовой (не Black Badge) версии в источниках не меняется относительно rr-spectre (577 л.с.) — прирост мощности, упоминаемый в прессе, относится к Black Badge Series II (см. соседний узел). Источники: autoevolution.com, carbuzz.com, bmwblog.com, pistonheads.com.',
})

console.log('\n=== 5. RR Project Nightingale Concept (2026): подтверждён реальным пресс-релизом, переклассифицирован ===')
fixNode('ncs-rolls-royce-2026-project-nightingale-concept', {
  zone: 'open_top',
  codeName: 'Coachbuild',
  isConcept: undefined,
  isLimited: true,
  note: 'Подтверждено официальным пресс-релизом press.rolls-roycemotorcars.com — реальный проект, не выдумка скрейпера. "Project Nightingale" — коучбилд-коллекция Rolls-Royce: двухместный открытый электромобиль, дизайн в духе ар-деко/Streamline Moderne, отсылка к 16EX/17EX (1920-30е). Ограничен 100 клиентскими экземплярами (поставки с 2028), доступен только по приглашению — малая коммерческая коучбилд-серия, а не одноразовый шоу-кар. Переклассифицирован по аналогии с rr-sweptail/rr-boattail/rr-droptail-*: zone concept→open_top, codeName→Coachbuild, isConcept снят, isLimited=true. Источники: press.rolls-roycemotorcars.com, robbreport.com, autoblog.com.',
})

console.log('\n=== 6. Bentley EXP 10 Speed 6 (2015): inspired_by указывал на GT4(2025) вместо GT3(2018) ===')
retargetEdgeTarget('bentley-exp10-conti4-ip', 'bentley-conti-gt3')
fixNode('bentley-exp10-speed6', {
  note: 'Концепт Женева-2015, дизайн-исследование нового языка Bentley. Подтверждено независимо (conceptcarz.com, autoevolution.com, motorauthority.com) — вдохновил именно 3-е поколение Continental GT (2018, GT3): фары/решётка и задние "плечи" предсерийного GT3 прямо повторяют EXP 10 Speed 6, а не 4-е поколение (2025, GT4), как было указано ранее (ребро inspired_by переориентировано gt4→gt3). Серийной модели "Speed 6" не существует.',
})

console.log('\n=== 7. Bentley EXP 100 GT (2019): ребро "inspired_by Mulsanne" не подтвердилось, заменено верными ===')
deleteEdge('bentley-exp100-mul-ip') // mulsanne → exp100gt, inspired_by — источники не подтверждают, Mulsanne нигде не упоминается как референс дизайна EXP 100 GT
addEdge('bentley-rtype-exp100-ip', 'bentley-rtype', 'bentley-exp100gt', 'inspired_by', 0.6)
addEdge('bentley-blower-exp100-ip', 'bentley-blower', 'bentley-exp100gt', 'inspired_by', 0.5)
fixNode('bentley-exp100gt', {
  note: 'EXP 100 GT (представлен 10 июля 2019 к 100-летию марки) — видение GT-автомобиля 2035г.: полностью электрический, 0-60mph за 2.5с, запас хода ~700км, автономное вождение. Дизайн вдохновлён НЕ Mulsanne (ошибочное ребро удалено — источниками не подтверждается), а историческими моделями: задние "плечи" — отсылка к R-Type Continental (1952), круглые фары, перетекающие в решётку, — отсылка к 4½ Litre Blower (1929); медь/алюминий в отделке — дань материалам авиадвигателя W.O. Bentley времён Первой мировой. Прямой серийный преемник публично не подтверждён; связь с Torcal (2026, SUV на платформе PPE/Porsche Cayenne Electric) источниками НЕ подтверждается (разные кузова и платформы) — не добавляю. Источники: bentleymotors.com, designboom.com, motor1.com, en.wikipedia.org/wiki/Bentley_EXP_100_GT.',
})

console.log('\n=== 8. Continental GT I→II→III→IV и трим-рёбра: проверено — всё верно привязано к своей генерации, фикс не нужен ===')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
const bCount = g.nodes.filter(n => n.brandId === 'bentley').length
const rCount = g.nodes.filter(n => n.brandId === 'rolls-royce').length
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
console.log(`   Bentley: ${bCount} узлов | Rolls-Royce: ${rCount} узлов`)
