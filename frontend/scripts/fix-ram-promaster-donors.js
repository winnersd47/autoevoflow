#!/usr/bin/env node
// Ram ProMaster / ProMaster City — добавляем отсутствующих доноров-платформ
// (находка, оставленная "на потом" в fix-chrysler-jeep-ram.js, пункт 11: все
// 4 узла ram-promaster-* существовали без единого Fiat-донора в графе, т.к.
// узлов Fiat Ducato/Doblò не было вообще — проверено заново: grep -i ducato
// и grep -i doblo/doblò по graph.json на момент старта этой задачи — 0 совпадений).
//
// Веб-поиск с перепроверкой по ≥2 независимым источникам на каждый факт:
//
//  1. Ram ProMaster (2014) — ребейдж ТРЕТЬЕГО поколения Fiat Ducato
//     (платформа X250, дебют сент.2006 как MY2007, выпускается по наст.
//     время). Старт продаж в Северной Америке — май 2014 (MY2014). Кузов/
//     платформа — те же; адаптация под NAFTA: усиленная подвеска, другая
//     решётка/фары, эксклюзивный для Ram мотор 3.6L Pentastar V6 284лс
//     (в Европе не предлагался; там — дизели Iveco/Sofim F1C Multijet
//     2.0-3.0L, 100-180лс). Подтверждено: en.wikipedia.org/wiki/Fiat_Ducato,
//     en.wikipedia.org/wiki/Ram_ProMaster, promasterforum.com,
//     news.ycombinator.com (цитата из автомобильного треда) — независимо
//     согласуются на "3rd-gen Ducato, X250".
//
//  2. Ram ProMaster City (2015-2022) — ребейдж ВТОРОГО поколения Fiat Doblò
//     (Type 263, дебют дек.2009/нач.2010, фейслифт 2015г. — именно эта
//     фейслифтовая версия стала донором ProMaster City). Эксклюзивный для
//     NA мотор 2.4L Tigershark I4 179лс (в Европе — дизели Multijet
//     1.3-2.0L, 90-135лс), сборка на заводе Tofaş (Турция). Doblò снят с
//     продаж в Европе в сент.2022; Ram прекратил ProMaster City после
//     MY2022 — синхронно. Подтверждено: en.wikipedia.org/wiki/Fiat_Dobl%C3%B2,
//     en.wikipedia.org/wiki/Ram_ProMaster_City, greencarcongress.com,
//     jalopnik.com, kbb.com, autos.yahoo.com, foxnews.com.
//
//  3. Ram ProMaster EV (2024) — отдельный узел/ребро НЕ добавляю: это
//     электровариант ТОГО ЖЕ поколения кузова ProMaster/Ducato X250
//     (платформенный аналог Fiat E-Ducato: 110кВтч/200кВт/268лс,
//     идентичный пакет после фейслифта окт.2023/MY2024 — см.
//     electrive.com, autoevolution.com, insideevs.com). В графе уже стоит
//     ram-promaster-1→ram-promaster-ev (variant_of) — этого достаточно по
//     аналогии с fiat-500-2007→fiat-500e в этом же графе (ICE/EV пара
//     внутри бренда без дублирующего кросс-брендового ребра). Факт
//     задокументирован в note нового fiat-ducato-3.
//
//  4. Ram ProMaster City (2027, возрождение) — ПРОВЕРЕНО и НЕ является
//     ребейджем Doblò, вопреки умолчанию в исходном тех.задании: новая
//     генерация построена на другой, более крупной платформе Stellantis,
//     общей с Citroën Jumpy/Dispatch, Peugeot Expert, Fiat Scudo, Opel
//     Vivaro, Toyota Proace (ProMaster City "сменил сторону" с итальянской
//     на французскую — цитата autoevolution/carscoops). Существующая note
//     на ram-promaster-city-2 уже верно это описывает — подтверждено
//     независимо (autoevolution.com, jalopnik.com, motor1.com,
//     carscoops.com, autoguide.com), правка не требуется. Третье поколение
//     самого Doblò (2022, платформа K9) — это, в свою очередь, ребейдж
//     Citroën Berlingo — к ProMaster City отношения не имеет, упомянуто в
//     note нового fiat-doblo-2 для полноты, отдельный узел не создаю (вне
//     скоупа — это самостоятельная ветка Fiat/Citroën-аудита).
//
//  5. Связь Citroën Jumpy/Peugeot Expert/Fiat Scudo (Sevelnord) с ОРИГИНАЛЬНЫМ
//     (2015) ProMaster City — ПРОВЕРЕНО и НЕ подтвердилось: это платформа
//     ДРУГОГО размерного класса (среднеразмерные фургоны), донор оригинала
//     2015г. — именно Doblò. Связь Jumpy-семейства релевантна только
//     возрождению 2027г. (см. п.4) — новые узлы для Jumpy/Expert/Scudo не
//     создаю, это отдельная задача вне скоупа (нет ни одного такого узла в
//     графе вообще, не только применительно к Ram).
//
// Тип ребра — rebadged_as, а НЕ derived_from (вопреки умолчанию в исходном
// т.з.): проверены все существующие кросс-брендовые ребейджи в графе
// (opel-astra-h→saturn-astra 0.85, mazda-2-dj→scion-ia 0.95,
// seres-sf5→aito-m5 0.8, lotus-seven-s4→caterham-seven 0.95,
// scion-frs→toyota-gt86-zn6 0.98) — ВСЕ они используют rebadged_as для
// случая "идентичный кузов/платформа, другой бренд/рынок", а derived_from
// в графе зарезервирован под другой паттерн (платформа общая, но модель
// структурно другая — BMW X5→X3, Camry→Lexus ES, S-class→Maybach) либо под
// брендовый ребрендинг той же линейки (dodge-ram-3→ram-1500-4). Ducato→
// ProMaster и Doblò→ProMaster City — это однозначно первый паттерн
// (идентичный кузов, только грille/фары/мотор/подвеска под NAFTA), поэтому
// rebadged_as — более точное соответствие конвенции графа. Направление
// ребра (donor=source, rebadge=target) проверено на тех же 5 примерах —
// везде оригинальный/инженерный донор стоит в source.
//
// Источники (все проверены веб-поиском 2026-10-23): en.wikipedia.org (Fiat
// Ducato, Fiat Doblò, Ram ProMaster, Ram ProMaster City), promasterforum.com,
// news.ycombinator.com, greencarcongress.com, jalopnik.com, kbb.com,
// foxnews.com, autos.yahoo.com, universe.byu.edu, autoevolution.com,
// insideevs.com, electrive.com, carscoops.com, motor1.com, autoguide.com,
// guideautoweb.com.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией/записью — на случай, если граф
// изменился на диске, пока шло исследование этой задачи.
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

console.log('=== Fiat Ducato Gen.3 (X250, 2006) — донор Ram ProMaster (2014) ===')
addNode({
  id: 'fiat-ducato-3',
  label: 'Fiat Ducato Gen.3',
  fullName: 'Fiat Ducato Gen.3',
  type: 'generation',
  year: 2006,
  brandId: 'fiat',
  brandName: 'Fiat',
  codeName: 'X250',
  modelSlug: 'fiat-ducato',
  bodyType: 'van',
  segment: 'commercial',
  zone: 'pickup',
  hp: 180,
  engineType: 'i4t',
  note: 'Третье поколение Ducato (платформа X250, дебют сент.2006 как MY2007, выпускается по наст. время) — крупный коммерческий фургон. С мая 2014 (MY2014) поставляется в США/Канаду как Ram ProMaster (см. rebadged_as) — тот же кузов/платформа, адаптация под Северную Америку: усиленная подвеска под дороги NAFTA, другая решётка/фары, эксклюзивный для Ram мотор 3.6L Pentastar V6 284лс (в Европе не предлагался) вместо дизелей. Дизель Iveco/Sofim F1C Multijet 2.0-3.0L, 100-180лс (указан топ). Электроверсия E-Ducato — с апр.2021 (47/79кВтч, 90кВт/120лс), обновлена в рамках фейслифта окт.2023/MY2024 до 110кВтч/200кВт/270лс — идентичный пакет у Ram ProMaster EV (2024): тот же кузов/поколение, связь через уже существующее ребро ram-promaster-1→ram-promaster-ev (variant_of), отдельное кросс-брендовое ребро для EV не добавляю. Источники: en.wikipedia.org (Fiat Ducato, Ram ProMaster), promasterforum.com, news.ycombinator.com, autoevolution.com, insideevs.com, electrive.com — проверено веб-поиском окт.2026.',
})

console.log('\n=== Fiat Doblò Gen.2 (Type 263, 2010) — донор Ram ProMaster City (2015) ===')
addNode({
  id: 'fiat-doblo-2',
  label: 'Fiat Doblò Gen.2',
  fullName: 'Fiat Doblò Gen.2',
  type: 'generation',
  year: 2010,
  brandId: 'fiat',
  brandName: 'Fiat',
  codeName: 'Type 263',
  modelSlug: 'fiat-doblo',
  bodyType: 'van',
  segment: 'commercial',
  zone: 'pickup',
  hp: 135,
  engineType: 'i4t',
  note: 'Второе поколение Doblò (Type 263, дебют дек.2009/нач.2010) — компактный коммерческий фургон. С MY2015 поставлялся в США/Канаду как Ram ProMaster City (см. rebadged_as) — тот же кузов/платформа Doblò (донор — именно фейслифт 2015г.: новая приборная панель, фары, решётка), эксклюзивный для NA мотор 2.4L Tigershark I4 179лс (в Европе не предлагался) вместо дизелей, сборка на заводе Tofaş в Турции. Дизель Multijet 1.3-2.0L, 90-135лс (указан топ). Doblò снят с продаж в Европе в сент.2022; синхронно Ram прекратил ProMaster City после MY2022. Важно: возрождённая в 2027г. ProMaster City — это НЕ ребейдж Doblò: новая генерация построена на другой, более крупной платформе Stellantis, общей с Citroën Jumpy/Dispatch, Peugeot Expert, Fiat Scudo, Toyota Proace (см. уже существующую note на ram-promaster-city-2, независимо подтверждено). Само третье поколение Doblò (2022, платформа K9) тоже сменило архитектуру — но на ребейдж Citroën Berlingo, и к ProMaster City отношения не имеет. Источники: en.wikipedia.org (Fiat Doblò, Ram ProMaster City), greencarcongress.com, jalopnik.com, kbb.com, autos.yahoo.com, foxnews.com, universe.byu.edu — проверено веб-поиском окт.2026.',
})

console.log('\n=== Рёбра донор→ребейдж (rebadged_as, донор=source — по конвенции графа) ===')
addEdge('e-fiat-ducato3-rampromaster1', 'fiat-ducato-3', 'ram-promaster-1', 'rebadged_as', 0.9)
addEdge('e-fiat-doblo2-rampromastercity1', 'fiat-doblo-2', 'ram-promaster-city-1', 'rebadged_as', 0.9)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
