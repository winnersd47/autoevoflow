#!/usr/bin/env node
// Аудит Chrysler / Jeep / Ram (без Dodge — его параллельно ведёт другой агент
// в этом же файле; кросс-брендовые рёбра НА dodge-* узлы допустимы, сами
// dodge-* узлы не трогаем):
//
//  1. Chrysler Sebring: между Gen.1 (1995) и Chrysler 200 Gen.1 (2011) было
//     прямое ребро evolves_into, пропускавшее СРАЗУ ДВА реальных поколения:
//     Sebring Gen.2 (2001-2006, купе на платформе-потомке Mitsubishi Eclipse,
//     седан/кабриолет на Chrysler JR — наследник Cirrus) и Gen.3 (2007-2010,
//     платформа JS, седан+кабриолет, купе снято с продаж). Добавлены оба
//     поколения, старое прямое ребро удалено и заменено цепочкой
//     1→2→3→200(2011). Gen.3 (JS) — родная платформа-близнец Dodge Avenger
//     Gen.2/R/T (dodge-avenger-2, уже есть в графе, тот же мотор 3.5 V6
//     235лс) — добавлено shares_platform, чтобы обе линейки сходились.
//
//  2. Chrysler 200: существовал только Gen.1 (2011-2014). Добавлено Gen.2
//     (2015-2017, платформа CUSW, та же, что у Jeep Cherokee KL — добавлено
//     shares_platform к jeep-cherokee-kl). Gen.2 стал последним — в 2016
//     Marchionne объявил снятие 200 с производства (слабые продажи седанов
//     на фоне кроссоверов), прямой замены в модельном ряду не было. Это и
//     есть сжатие бренда Chrysler, о котором просили проверить (в note).
//
//  3. Chrysler 300: подтверждено — пропуска поколения НЕТ, 300(LX,2004)→
//     300(LD,2011)→SRT8(2012, трим LD) — это реально один очень долгий цикл
//     LD (2011-2023). Добавлен узел финальной спецсерии Last Call 2023
//     (300C, 6.4L Hemi 485лс, 2200 экз. — последний Hemi V8 в истории
//     Chrysler, конвейер Brampton встал на переоснастку под электроплатформу
//     сразу после), variant_of от 300-srt8 (прямой наследник линейки
//     392/SRT в рамках LD).
//
//  4. Chrysler Voyager/Town & Country: проверено целенаправленно — реальная
//     история (минивэн Chrysler 1984→1991→1996→2001→2008→Pacifica 2017)
//     генеалогически та же физическая платформа, что и Dodge Caravan
//     (dodge-caravan-1..5 — уже ПОЛНОСТЬЮ покрывает все 5 поколений шасси
//     в графе), а Town & Country все эти годы был не отдельной моделью, а
//     топовым тримом/под-брендом ТОЙ ЖЕ генерации миниавэна (с 1990г.),
//     отдельного chrysler-town-country-* узла в графе нет и намеренно не
//     добавляю — это дублировало бы уже смоделированную по Dodge-стороне
//     поколенческую цепочку без новой информации, а T&C-vs-Voyager трим-
//     деление внутри одной генерации рискованно моделировать как отдельные
//     "поколения". Вместо форс-фикса структуры — уточняющая note на
//     chrysler-voyager-1 с объяснением находки (пункт 4 чек-листа закрыт
//     через документирование решения, не через рискованную догадку).
//
//  5. Jeep Cherokee (SJ, 1974): перед XJ(1984) отсутствовало самое первое
//     поколение Cherokee — 2-дверная "спортивная" версия того же шасси SJ,
//     что и Wagoneer SJ(1962), выпускалась 1974-1983 (197338 экз.), прямо
//     сменена на XJ в 1984м. Добавлен узел + shares_platform от Wagoneer SJ
//     (тот же SJ-чассис, не отдельная платформа) + evolves_into → XJ.
//
//  6. Jeep Cherokee KL: подтверждено состояние — производство остановлено
//     конец февраля 2023 (простой завода Belvidere), это НЕ прекращение
//     нейминга навсегда: бренд в мае 2025 анонсировал возрождение как
//     Cherokee (KM) — новый гибрид (1.6T турбо-I4 + 2 э/мотора, 210лс
//     суммарно, впервые для Jeep в Северной Америке), сборка Toluca
//     (Мексика, НЕ Belvidere), рыночно — "2026 Jeep Cherokee". Добавлен
//     узел + evolves_into KL→KM, цепочка закрыта без разрыва.
//
//  7. Jeep Wrangler JL: подтверждено — преемник НЕ анонсирован (на сентябрь
//     2026 выходят только спецверсии вроде JL-2A на той же платформе JL,
//     Jeep официально не объявляла редизайн). Пропуска нет, узел не нужен.
//
//  7b. Jeep Compass MP (2017): попутно найдено (тот же чек-лист "пропущенные
//     поколения") — новое поколение представлено весной 2025, платформа
//     STLA Medium (общая с Peugeot 3008/5008, Opel Grandland, DS7),
//     производство Мельфи (Италия), линейка e-Hybrid(145лс)/
//     e-Hybrid Plug-in(195лс)/BEV(до 375лс, 650км). Добавлен узел (основной
//     трим — топовый ICE-гибрид 195лс, по конвенции графа; электро-версии
//     отмечены в note, отдельным узлом не выделяю, т.к. это не входило в
//     явный чек-лист и решение потребовало бы ещё 2-3 узлов на варианты).
//
//  8. Jeep Avenger (2023, EV, европейский компактный кроссовер) — проверено:
//     ребро/связи с dodge-avenger-* отсутствуют, путаницы в графе нет (это
//     просто совпадение имени между сиблинг-брендами Stellantis). Не трогаю.
//
//  9. "jeep-lr-cross" (inspired_by, Cherokee XJ(1984)→Wrangler JL(2018),
//     strength 0.5) — УДАЛЯЮ. Id явно означает "Jeep×Land Rover cross-
//     inspiration" (по аналогии с уже существующим верным
//     e-xb-def83-wrjk: Defender110→Wrangler JK), но реальные source/target
//     ребра — два Jeep'а без всякого Land Rover. Целевой поиск не нашёл НИ
//     ОДНОГО источника, утверждающего, что дизайн XJ Cherokee (юнibody,
//     1984) как-то повлиял на Wrangler JL (рамный, 2018) — разные классы
//     кузова, разные линейки. Похоже на артефакт синка (id/контент не
//     совпадают) — тот же паттерн, что уже чистили в этой сессии
//     (gaz-volga-m24→uaz-patriot, см. fix-gaz-uaz-aurus-moskvich.js).
//
// 10. Ram-Dodge "мост" 2010 года — ПРОВЕРЕНО, уже смоделировано верно:
//     dodge-ram-3(2002)→ram-1500-4(2009) и dodge-ram-hd-2(2003)→
//     ram-hd-3(2010) оба derived_from (не evolves_into — тот кросс-брендово
//     запрещён валидатором). Бренд-ребрендинг 2010г. не потерян. Фикс не
//     нужен.
//
// 11. Ram ProMaster/ProMaster City — донора Fiat Ducato/Doblo для
//     shares_platform НЕ добавляю: соответствующих узлов Fiat Ducato/Doblo
//     в графе НЕТ вообще (проверено по всем 34 fiat-* узлам). Аналогично нет
//     узла Citroën Jumpy/Dispatch (donor нового ProMaster City 2027 по его
//     же note) — только Citroën Berlingo (другая модель). Создавать новые
//     чужие бренд-узлы вне скоупа этого аудита не буду — оставляю как
//     находку для будущего Fiat/Citroën-аудита.
//
// 12. Ram 1500 Roush (2027) — найдена фактическая ошибка в данных: узел
//     указывал 540лс/petrol_v8_supercharged. Реальная модель — "Ram 1500
//     Direct Connection by Roush" (2027), атмосферный 5.7L Hemi V8,
//     395лс/410 lb-ft (explicитно БЕЗ наддува — это модернизация подвески/
//     внедорожного пакета, не форсировка мотора), "младший TRX". Поправлены
//     hp/engineType/label; zone "performance" (не входит в ZONES валидатора,
//     больше нигде в графе не используется) заменена на "pickup" — как у
//     соседних Ram TRX/Power Wagon/SRT-10.
//
// Источники: en/ru Wikipedia (Chrysler Sebring/200/Town & Country, Jeep
// Cherokee SJ/XJ/KL/KM, Jeep Wagoneer SJ, Jeep Wrangler JL, Jeep Compass),
// autoevolution.com, automobile-catalog.com, carscoops.com, thedrive.com,
// moparinsiders.com, detroitnews.com, carpro.com, media.stellantisnorthamerica.com,
// media.stellantis.com, roushperformance.com, motor1.com, tfltruck.com,
// carbuzz.com, kbb.com — проверено веб-поиском 2026-10-21.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно по этому же
// файлу работает агент по Dodge, мерджимся в актуальное состояние на диске.
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

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

console.log('=== 1. Chrysler Sebring: Gen.2(2001) + Gen.3(2007), закрываем пропуск 1995→2011 ===')
addNode({
  id: 'chrysler-sebring-2', label: 'Chrysler Sebring Gen.2 (2001)',
  year: 2001, brandId: 'chrysler', brandName: 'Chrysler',
  modelSlug: 'chrysler-sebring', familyKey: 'chrysler-sebring',
  type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 200, engineType: 'v6', codeName: 'JR (седан/кабрио) / Eclipse-платформа (купе)',
  note: 'Кузова: купе (платформа-потомок Mitsubishi Eclipse, снято с продаж в 2005), седан и кабриолет (Chrysler JR — наследник Cirrus). Указан топ-мотор 2.7L V6 200лс/193 lb-ft (седан/кабрио, 4-ст. АКПП).',
})
addNode({
  id: 'chrysler-sebring-3', label: 'Chrysler Sebring Gen.3 (2007)',
  year: 2007, brandId: 'chrysler', brandName: 'Chrysler',
  modelSlug: 'chrysler-sebring', familyKey: 'chrysler-sebring',
  type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 235, engineType: 'v6', codeName: 'JS',
  note: 'Платформа JS — родная платформа-близнец Dodge Avenger Gen.2/R/T (тот же 3.5L V6 235лс/232 lb-ft на топ-триме Limited, см. shares_platform). Седан с 2007, кабриолет добавлен в 2008; купе в этом поколении больше не предлагалось. Последнее поколение под именем Sebring — в 2011 заменено на Chrysler 200.',
})
deleteEdge('e-chr-seb-200') // прямой прыжок 1995→2011, пропускал Gen.2 и Gen.3
addEdge('e-chr-seb1-seb2', 'chrysler-sebring-1', 'chrysler-sebring-2', 'evolves_into', 0.9)
addEdge('e-chr-seb2-seb3', 'chrysler-sebring-2', 'chrysler-sebring-3', 'evolves_into', 0.9)
addEdge('e-chr-seb3-200', 'chrysler-sebring-3', 'chrysler-200-1', 'evolves_into', 0.9)
addEdge('e-chr-seb3-avenger2-platform', 'chrysler-sebring-3', 'dodge-avenger-2', 'shares_platform', 0.95) // JS-платформа, идентичный топ-мотор 3.5 V6 235лс

console.log('\n=== 2. Chrysler 200: добавляем Gen.2 (2015-2017), сжатие бренда после ===')
addNode({
  id: 'chrysler-200-2', label: 'Chrysler 200 Gen.2 (2015)',
  year: 2015, brandId: 'chrysler', brandName: 'Chrysler',
  modelSlug: 'chrysler-200', familyKey: 'chrysler-200',
  type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 295, engineType: 'v6', codeName: 'CUSW',
  note: 'Полностью новая платформа CUSW (Fiat Compact US Wide) — та же, что у Jeep Cherokee KL (см. shares_platform), 9-ст. АКПП. Топ-мотор 3.6L Pentastar V6 295лс (база — 2.4L I4 184лс). В 2016 CEO FCA Серджо Маркионне объявил снятие с производства (слабые продажи седана на фоне спроса на кроссоверы/пикапы); выпуск завершён в 2017г БЕЗ прямой замены в модельном ряду — после этого у Chrysler остались только 300/Pacifica/Voyager, а с декабря 2023 (см. Last Call) — только минивэны Pacifica/Voyager.',
})
addEdge('e-chr-200-1-2', 'chrysler-200-1', 'chrysler-200-2', 'evolves_into', 0.9)
addEdge('e-chr-200-2-cherokeekl-platform', 'jeep-cherokee-kl', 'chrysler-200-2', 'shares_platform', 0.85) // платформа CUSW, общая с Jeep Cherokee KL (и Dodge Dart)

console.log('\n=== 3. Chrysler 300: подтверждён один долгий цикл LD, добавлена финальная Last Call (2023) ===')
addNode({
  id: 'chrysler-300-last-call', label: 'Chrysler 300C Last Call (2023)',
  year: 2023, brandId: 'chrysler', brandName: 'Chrysler',
  modelSlug: 'chrysler-300', familyKey: 'chrysler-300',
  type: 'generation', bodyType: 'sedan', segment: 'full-size', zone: 'gt_coupe',
  hp: 485, engineType: 'v8', isLimited: true,
  note: 'Финальная спецсерия, закрывающая 12-летний цикл платформы LD (2011-2023) — 6.4L Hemi V8 485лс/574 lb-ft, всего 2200 экз. (2000 США + 200 Канада), раскуплены за 12 часов. Последний автомобиль Chrysler с атмосферным Hemi V8; последний экземпляр сошёл с конвейера Brampton (Онтарио) 8 декабря 2023г., после чего завод встал на переоснастку под электроплатформу. Подтверждает, что между 300(LX,2004)→300(LD,2011)→SRT8(2012) НЕТ пропущенного 3-го поколения — это один очень долгий модельный цикл LD.',
})
addEdge('e-chr-300srt8-lastcall', 'chrysler-300-srt8', 'chrysler-300-last-call', 'variant_of', 0.85)

console.log('\n=== 4. Chrysler Voyager/Town & Country: найдена тангл-история, форс-фикс НЕ делаю, уточняю note ===')
fixNode('chrysler-voyager-1', {
  note: 'Поколения 2-5 (1991/1996/2001/2008) этого минивэна в графе отдельными Chrysler-узлами не представлены осознанно: вся линейка поколений уже полностью смоделирована через dodge-caravan-1..5 (та же физическая платформа каждого цикла, shares_platform уже стоит на этом узле), а "Town & Country" все эти годы был не отдельной моделью/поколением, а топовым тримом/под-брендом ТОЙ ЖЕ генерации минивэна (с 1990г.) — отдельного chrysler-town-country-* узла нет и намеренно не добавлялся, чтобы не дублировать Dodge-цепочку псевдо-поколениями по именам трима. В 2017 Voyager и Town & Country одновременно заменены на Pacifica (см. evolves_into) — 32-летний интервал ребра отражает реальный факт, что Chrysler-сторона этого семейства моделировалась по бренду-владельцу платформы (Dodge), а не дублировалась от узла к узлу.',
})

console.log('\n=== 5. Jeep Cherokee SJ (1974): закрываем пропуск перед XJ(1984) ===')
addNode({
  id: 'jeep-cherokee-sj', label: 'Jeep Cherokee SJ (1974)',
  year: 1974, brandId: 'jeep', brandName: 'Jeep',
  modelSlug: 'jeep-cherokee-sj', familyKey: 'jeep-cherokee',
  type: 'generation', bodyType: 'suv', segment: 'offroad', zone: 'suv_large',
  hp: 195, engineType: 'v8n', codeName: 'SJ',
  note: 'Первое поколение Cherokee вообще — 2-дверная "спортивная" версия того же шасси SJ, что и Wagoneer SJ (1962, см. shares_platform), 4-дверная версия добавлена в 1977. Топ-мотор 360 cu in (5.9L) V8 4-barrel, 195лс (SAE net)/295 lb-ft. Выпускалась 1974-1983 (197338 экз.), в 1984 напрямую сменена на XJ.',
})
addEdge('e-jeep-wagoneersj-cherokeesj-platform', 'jeep-wagoneer-sj', 'jeep-cherokee-sj', 'shares_platform', 0.9)
addEdge('e-jeep-cherokeesj-xj', 'jeep-cherokee-sj', 'jeep-cherokee-xj', 'evolves_into', 0.9)

console.log('\n=== 6. Jeep Cherokee KM (2026): возрождение после паузы 2023-2025 ===')
addNode({
  id: 'jeep-cherokee-km', label: 'Cherokee KM (2026)',
  year: 2026, brandId: 'jeep', brandName: 'Jeep',
  modelSlug: 'jeep-cherokee-km', familyKey: 'jeep-cherokee',
  type: 'generation', bodyType: 'suv', segment: 'other', zone: 'suv_mid',
  hp: 210, engineType: 'hybrid', codeName: 'KM',
  note: 'Возрождение имени после паузы: KL снят с производства в конце февраля 2023 (простой завода Belvidere, Иллинойс). KM анонсирован в мае 2025, рыночно — "2026 Jeep Cherokee", сборка на заводе Toluca (Мексика, НЕ Belvidere). Только гибрид: новый для Jeep в Сев. Америке турбо 1.6L I4 + 2 электромотора, суммарно 210лс/230 lb-ft, запас хода >800км. Платформа STLA Large (не STLA Medium, вопреки части ранних слухов).',
})
addEdge('e-jeep-cherokeekl-km', 'jeep-cherokee-kl', 'jeep-cherokee-km', 'evolves_into', 0.9)

console.log('\n=== 7. Jeep Wrangler JL: преемник не анонсирован — пропуска нет, узел не нужен (проверено) ===')
console.log('   (2027 Wrangler JL-2A — спецверсия на текущей платформе JL, не новое поколение, не добавляю)')

console.log('\n=== 7b. Jeep Compass: новое поколение (2025, STLA Medium) — попутная находка по чек-листу ===')
addNode({
  id: 'jeep-compass-2025', label: 'Compass (2025)',
  year: 2025, brandId: 'jeep', brandName: 'Jeep',
  modelSlug: 'jeep-compass', type: 'generation',
  bodyType: 'suv', segment: 'other', zone: 'suv_compact',
  hp: 195, engineType: 'hybrid',
  note: 'Полностью новое поколение, платформа STLA Medium (общая с Peugeot 3008/5008, Opel/Vauxhall Grandland, DS7, Citroën C5 Aircross). Представлено весной 2025 (Европа), производство — завод Мельфи (Италия). Линейка: e-Hybrid 145лс (мягкий гибрид, база), e-Hybrid Plug-in 195лс (указан как топ-ICE-трим), полностью электрические версии до 375лс/650км (4WD) — BEV-варианты отдельным узлом не выделены (вне исходного чек-листа, кандидат на будущий точечный фикс).',
})
addEdge('e-jeep-compassmp-2025', 'jeep-compass-mp', 'jeep-compass-2025', 'evolves_into', 0.9)

console.log('\n=== 8. Jeep Avenger (2023, EV): проверено — не путается с dodge-avenger-*, не трогаю ===')

console.log('\n=== 9. "jeep-lr-cross" (Cherokee XJ → Wrangler JL, inspired_by): недостоверное, удаляю ===')
deleteEdge('e-jeep-lr-cross') // id предполагает Jeep×Land Rover cross-inspiration (как у e-xb-def83-wrjk), но source/target — два Jeep'а; целевой поиск не подтвердил связь XJ-дизайна с Wrangler JL — похоже на артефакт синка

console.log('\n=== 10. Ram↔Dodge мост 2010г.: проверено — уже верно смоделирован (derived_from), фикс не нужен ===')
console.log('   dodge-ram-3→ram-1500-4 и dodge-ram-hd-2→ram-hd-3 оба derived_from — кросс-брендовый evolves_into запрещён валидатором')

console.log('\n=== 11. Ram ProMaster/ProMaster City ↔ Fiat/Citroën: доноры отсутствуют в графе, edge не добавляю ===')
console.log('   Fiat Ducato/Doblo — нет узлов (проверены все 34 fiat-* узла); Citroën Jumpy/Dispatch — нет узла (есть только Berlingo)')

console.log('\n=== 12. Ram 1500 Roush: исправление реальных характеристик (было 540лс/supercharged — ошибка) ===')
fixNode('ram-1500-roush', {
  label: 'Ram 1500 Direct Connection by Roush (2027)',
  hp: 395, engineType: 'v8', zone: 'pickup',
  note: 'Официальное имя — "Ram 1500 Direct Connection by Roush". Атмосферный 5.7L Hemi V8, 395лс/410 lb-ft, мост 3.92, электронная блокировка заднего диффа — БЕЗ наддува (пакет Roush это подвеска/внедорожный апгрейд: 2.0" coil-over, 33" шины, не форсировка мотора). Позиционируется как "младший TRX". Старт продаж $78960.',
})

console.log('\n=== 13. Финальный orphan-check выявил 2 изолированных Ram-узла (0 рёбер вообще) ===')
addNode({
  id: 'ram-promaster-city-1', label: 'Ram ProMaster City (2015)',
  year: 2015, brandId: 'ram', brandName: 'Ram',
  modelSlug: 'ram-promaster-city', familyKey: 'ram-promaster-city',
  type: 'generation', bodyType: 'van', segment: 'commercial', zone: 'pickup',
  hp: 178, engineType: 'i4',
  note: 'Ребейдж Fiat Doblò — компактный коммерческий фургон, 2.4L Tigershark I4 178лс/174 lb-ft, 9-ст. АКПП, колёсная база 122.4in. Снят с продаж в 2022г. Преемник — возрождённая ProMaster City (2027) на другой платформе (см. evolves_into).',
}) // "ram-promaster-city-2" уже существовал в графе с суффиксом "-2" — явно подразумевавшим пропущенный "-1" (оригинал 2015-2022). Без этого узла "-2" также был полным сиротой (0 рёбер).
addNode({
  id: 'ram-promaster-ev', label: 'Ram ProMaster EV (2024)',
  year: 2024, brandId: 'ram', brandName: 'Ram',
  modelSlug: 'ram-promaster', familyKey: 'ram-promaster',
  type: 'generation', bodyType: 'van', segment: 'commercial', zone: 'pickup',
  hp: 268, engineType: 'ev',
  note: 'Первый серийный электрофургон Ram — тот же кузов/поколение, что и ICE ProMaster (2014, донор Fiat Ducato), электропривод передних колёс, 110кВтч батарея (с 2025 м.г.), до 162 миль (260км) запаса хода WLTP-подобного цикла. Источники: electrek.com, kbb.com, autoblog.com (2025-2026).',
}) // ram-promaster-1 (2014) был полным сиротой (0 рёбер) — донора Fiat Ducato в графе нет (см. п.11), но реальный ICE/EV-партнёр того же кузова нашёлся и решает это чище, чем кросс-брендовая связь
addEdge('e-ram-promastercity-1-2', 'ram-promaster-city-1', 'ram-promaster-city-2', 'evolves_into', 0.7) // та же "City" линейка, платформа сменилась (Doblò → Stellantis Jumpy-based), но нейминг/позиционирование продолжены напрямую
addEdge('e-ram-promaster-1-ev', 'ram-promaster-1', 'ram-promaster-ev', 'variant_of', 0.85) // ICE/EV пара того же поколения кузова ProMaster, как Pacifica ICE/hybrid или Avenger ICE/4xe в этом же графе

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
