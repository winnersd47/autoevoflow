/**
 * add-gap-run-2026-10-28.js — регулярный прогон autoevoflow-graph-gap-fill (2026-10-28).
 *
 * Часть А: новые модели из скрапера, которых не было в графе (проверены веб-поиском).
 * Часть Б: 8 узлов-сирот (ncs-, ноль рёбер) — исправлены поля + найдены родители/доноры.
 * Доп. фикс: ncs-mercedes-2027-amg-gt-4-door — engineType 'v8t' был ложным
 *   (это электрический AMG GT 4-Door на AMG.EA, ДВС нет вообще).
 *
 * Идемпотентен: существующие id узлов/рёбер не дублируются.
 * Пишет список изменённых/добавленных узлов в public/data/last-graph-gap-run.json.
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const GRAPH = path.join(ROOT, 'public/data/evolution/graph.json')
const RUN_OUT = path.join(ROOT, 'public/data/last-graph-gap-run.json')

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
  id: 'lr-rrs-electric', label: 'Range Rover Sport Electric', fullName: 'Range Rover Sport Electric',
  type: 'generation', year: 2027, brandId: 'land-rover', brandName: 'Land Rover', codeName: 'L461 EV',
  modelSlug: 'land-rover-range-rover-sport', bodyType: 'suv', segment: 'luxury_suv', zone: 'electric',
  hp: 542, engineType: 'ev',
  note: 'Второй электромобиль Range Rover — электрическая версия текущего поколения Range Rover Sport (L461, платформа MLA-Flex, общая с Range Rover Electric). Прототип показан на Goodwood FoS 16 июля 2026, полная премьера — октябрь 2026. Два мотора, полный привод, 542 л.с./627 фунт-фут, батарея 119 кВтч, 0-60 миль/ч за 4.3с, WLTP ~378 миль, активные стабилизаторы, подруливающая задняя ось. Год 2027 — старт продаж (в США идёт как 2028 модельный год). Источник: robbreport.com, wardsauto.com, automotiveaddicts.com (2026).',
})
addEdge('lr-rrs-l461-to-electric', 'lr-rrs-l461', 'lr-rrs-electric', 'variant_of', 0.85)
addEdge('lr-rr-electric-rrs-electric-platform', 'lr-rr-electric', 'lr-rrs-electric', 'shares_platform', 0.8)

addNode({
  id: 'volvo-xc60-2-fl', label: 'Volvo XC60 Gen2 Facelift (2027)', fullName: 'Volvo XC60 Gen2 Facelift',
  type: 'generation', year: 2027, brandId: 'volvo', brandName: 'Volvo', modelSlug: 'volvo-xc60-2',
  familyKey: 'volvo-xc60', bodyType: 'suv', segment: 'exec', zone: 'suv_mid',
  hp: 455, engineType: 'phev', isFacelift: true,
  note: 'Крупное обновление 2-го поколения XC60 (не новое поколение) — представлено в сентябре 2026 вместе с обновлённым XC90. Новые решётка, бампер, капот, передние крылья, переосмысленные ДХО «Молот Тора», Gemini AI в салоне. Главное — новый T8 PHEV: 2.0 турбо + более мощный электромотор и батарея 37.9 кВтч, 455 л.с./523 фунт-фут, 0-60 за 4.5с, до 78 миль на электричестве (рекорд среди PHEV в США). Год 2027 — старт продаж в начале 2027 (в США — 2028 модельный год). Источник: motor1.com, autoblog.com, tflcar.com (2026).',
})
addEdge('volvo-xc60-2-facelift', 'volvo-xc60-2', 'volvo-xc60-2-fl', 'facelifted_to', 0.9)

addNode({
  id: 'smart-2', label: 'Smart #2 (2027)', fullName: 'Smart #2',
  type: 'generation', year: 2027, brandId: 'smart', brandName: 'Smart', modelSlug: 'smart-2',
  bodyType: 'microcar', segment: 'micro', zone: 'hatchback', hp: 80, engineType: 'ev',
  note: 'Возвращение двухместного сити-кара Smart — духовный наследник Fortwo (производство W453 завершено в 2024). Премьера — Парижский автосалон, 12 октября 2026; продажи в Европе — 1-е полугодие 2027. Дизайн Mercedes, новая платформа Electric Compact Architecture (ECA) СП Mercedes/Geely, сборка в Китае. Задний мотор 80 л.с./130 Нм, LFP 35.8 кВтч, WLTP до 290 км, длина 2746 мм, масса 1140 кг, цена от ~20 000 евро. Источник: motor1.com, carscoops.com, autoevolution.com (2026).',
})
addEdge('smt-fw3-2num', 'smart-fortwo-3', 'smart-2', 'evolves_into', 0.75,
  'Не прямой преемник по платформе (новая ECA), но тот же продуктовый слот — двухместный городской микрокар бренда.')

addNode({
  id: 'hyu-ioniq3', label: 'IONIQ 3 (2026)', fullName: 'Hyundai IONIQ 3',
  type: 'generation', year: 2026, brandId: 'hyundai', brandName: 'Hyundai', modelSlug: 'hyundai-ioniq-3',
  familyKey: 'hyu-ioniq3', bodyType: 'hatchback', segment: 'mainstream', zone: 'electric',
  hp: 147, engineType: 'ev',
  note: 'Компактный электрохэтчбек (B/C-сегмент) для Европы — новая модель, представлена в апреле 2026 (Milan Design Week), производство в Турции с августа 2026. Платформа E-GMP в 400-вольтовом исполнении. Мощность 133-147 л.с. (в hp указана версия Standard Range), WLTP 344-496 км. Источник: motor1.com, topgear.com.ph, Wikipedia (2026).',
})
addEdge('hyu-ioniq5-ioniq3-platform', 'hyu-ioniq5', 'hyu-ioniq3', 'shares_platform', 0.6)

addNode({
  id: 'hyu-bayon-1', label: 'Bayon BC3 (2021)', fullName: 'Hyundai Bayon',
  type: 'generation', year: 2021, brandId: 'hyundai', brandName: 'Hyundai', codeName: 'BC3 CUV',
  modelSlug: 'hyundai-bayon', familyKey: 'hyu-bayon', bodyType: 'suv', segment: 'mainstream', zone: 'suv_compact',
  hp: 100, engineType: 'i3t',
  note: 'Первое поколение Bayon — городской кроссовер B-сегмента для Европы на базе i20 (BC3), представлен в марте 2021. Базовый мотор 1.0 T-GDi 100 л.с. (опорное значение), также 1.0 T-GDi 48V mild hybrid 120 л.с. и атмосферный 1.2. Добавлен как предшественник Bayon 2-го поколения (2027). Источник: Wikipedia, hyundai.news.',
})
addNode({
  id: 'hyu-bayon-2', label: 'Bayon Gen.2 (2027)', fullName: 'Hyundai Bayon',
  type: 'generation', year: 2027, brandId: 'hyundai', brandName: 'Hyundai',
  modelSlug: 'hyundai-bayon', familyKey: 'hyu-bayon', bodyType: 'suv', segment: 'mainstream', zone: 'suv_compact',
  hp: 115, engineType: 'i3t',
  note: 'Полностью новое 2-е поколение (не рестайлинг) — мировая премьера на Парижском автосалоне в октябре 2026, продажи — 2027. Длиннее на 65 мм (4245 мм) и шире на 35 мм, более угловатый «внедорожный» дизайн, два изогнутых экрана 12.3", Digital Key 2.0. На старте 1.0 T-GDi 90/115 л.с. (в hp — топ), в 2027 добавится первый полный гибрид 1.6 HEV 138 л.с. Источник: motor1.com, autoevolution.com (2026).',
})
addEdge('hyu-bayon-1-2', 'hyu-bayon-1', 'hyu-bayon-2', 'evolves_into', 0.9)

addNode({
  id: 'lancia-gamma-2026', label: 'Lancia Gamma (2026)', fullName: 'Lancia Gamma',
  type: 'generation', year: 2026, brandId: 'lancia', brandName: 'Lancia', modelSlug: 'lancia-gamma',
  bodyType: 'suv', segment: 'exec', zone: 'suv_mid', hp: 375, engineType: 'ev',
  note: 'Новый флагман возрождённой Lancia — кроссовер-фастбэк на платформе Stellantis STLA Medium (та же, что у Peugeot 3008/e-3008 III и DS No.7), производство в Мельфи. Премьера — май 2026, заказы с осени 2026. Гибрид 145 л.с. и электроверсии 230/245/375 л.с. (в hp — топовая AWD), запас хода до 740 км. Имя Gamma возрождено (оригинальная Gamma 1976-1984 в графе отсутствует). Источник: carscoops.com, arenaev.com, Wikipedia (2026).',
})
addEdge('peu-e3008-lancia-gamma-platform', 'peu-e3008', 'lancia-gamma-2026', 'shares_platform', 0.7)

addNode({
  id: 'infiniti-qx65', label: 'QX65', fullName: 'Infiniti QX65',
  type: 'generation', year: 2027, brandId: 'infiniti', brandName: 'Infiniti', modelSlug: 'infiniti-qx65',
  familyKey: 'infiniti-qx60', bodyType: 'suv', segment: 'exec', zone: 'suv_large', hp: 268, engineType: 'i4t',
  note: 'Двухрядный кросс-купе («фастбэк») на базе QX60 2-го поколения — та же платформа и тот же 2.0 VC-Turbo 268 л.с./286 фунт-фут, 9АКПП, полный привод стандартно. Отличие — покатая крыша и только 2 ряда сидений. Представлен в 2026 как 2027 модельный год, продажи с лета 2026. Структурно аналог пары QX50→QX55 (derived_from). Источник: motor1.com, usa.infinitinews.com (2026).',
})
addEdge('inf-qx60-gen2-qx65-derived', 'infiniti-qx60-gen2-vcturbo', 'infiniti-qx65', 'derived_from', 0.88)

addNode({
  id: 'byd-tang-l', label: 'BYD Tang L / Atto 8', fullName: 'BYD Tang L (экспорт: Atto 8)',
  type: 'generation', year: 2025, brandId: 'byd', brandName: 'BYD', modelSlug: 'byd-tang-l',
  bodyType: 'suv', segment: 'large_suv', zone: 'suv_large', hp: 764, engineType: 'ev',
  note: 'Флагманский 7-местный SUV на 1000-вольтовой Super e-Platform (в Китае — Tang L, с 2025). Экспортная электроверсия Atto 8 представлена на Парижском автосалоне в октябре 2026, продажи в Европе — 1 кв. 2027: заднеприводная 456 л.с. и полноприводная 764 л.с. (в hp), батарея Blade 2.0 115 кВтч, зарядка 10-97% за 9 минут (Flash Charging), WLTP до 653 км. Год 2025 — старт Tang L в Китае. Источник: carnewschina.com, electrek.co, Wikipedia (2026).',
})
addEdge('byd-tang-phev-tang-l', 'byd-tang-phev', 'byd-tang-l', 'inspired_by', 0.6,
  'Tang L — отдельная, более крупная модель семейства Tang на новой платформе; обычный Tang продолжает выпускаться, поэтому не evolves_into.')

addNode({
  id: 'porsche-mission-s', label: 'Porsche Mission S', fullName: 'Porsche Mission S Concept',
  type: 'generation', year: 2026, brandId: 'porsche', brandName: 'Porsche', modelSlug: 'porsche-mission-s',
  bodyType: 'coupe', segment: 'hypercar', zone: 'concept', engineType: 'unknown', isConcept: true,
  note: 'Дизайн-концепт среднемоторного суперкара, представлен 15 октября 2026 в Нью-Йорке (Квинс). Предвещает новую ПОСТОЯННУЮ серийную линейку над 911 (ориентировочно 2029 модельный год). Отсылки: круглые фары 911, нос 911 GT1, крыша 959, горизонтальный вентилятор как у 917; аналоговый салон без центрального экрана. Силовая установка не раскрыта — по словам CEO Михаэля Ляйтерса, электроверсии не будет (ДВС/гибрид/PHEV). Источник: robbreport.com, edmunds.com, octane-magazine.com (2026).',
})
addEdge('porsche-918-mission-s', 'porsche-918', 'porsche-mission-s', 'inspired_by', 0.6)

// ════════════════════ ЧАСТЬ Б — сироты ════════════════════

patchNode('ncs-bmw-2027-i7', {
  label: 'i7 G70 LCI', fullName: 'BMW i7 (G70 LCI)', codeName: 'G70e LCI', bodyType: 'sedan',
  segment: 'luxury', zone: 'electric', hp: 449, engineType: 'ev', isFacelift: true,
  note: 'Рестайлинг i7 (G70) — «самое масштабное обновление модели в истории BMW» по словам компании, представлен 22 апреля 2026, продажи с лета 2026 как 2027 МГ. Батарея на цилиндрических ячейках 6-го поколения (112.5 кВтч полезно), DC-зарядка до 250 кВт, запас хода до 728 км. Версии i7 50 xDrive 449 л.с. (в hp), 60 xDrive 536 л.с., M70 xDrive 680 л.с. Источник: autoevolution.com, bmwblog.com, Wikipedia (2026).',
}, 'исправлены label/bodyType(coupe→sedan)/hp/engineType, подключён к i7 G70')
addEdge('bmw-i7-g70-lci', 'bmw-i7-g70', 'ncs-bmw-2027-i7', 'facelifted_to', 0.9)

patchNode('ncs-bmw-2027-3-series', {
  label: '3 Series G50', fullName: 'BMW 3 Series (G50)', codeName: 'G50', segment: 'premium_compact',
  hp: 255, engineType: 'i4h',
  note: '8-е поколение 3-series с ДВС, представлено 30 сентября 2026. Глубоко переработанная платформа CLAR (не Neue Klasse), но дизайн и салон в стиле Neue Klasse. 48-вольтовый мягкий гибрид стандартно: 330 (B48, 255 л.с./295 фунт-фут; буква «i» из названий убрана) и M350 xDrive (B58, 437 л.с.). Продаётся параллельно с механически не родственным электрическим i3 (NA0). Источник: bimmerfile.com, paultan.org, Wikipedia (2026).',
}, 'заполнены codeName/hp/engineType/note, подключён к G20 LCI и M350')
addEdge('bmw-g20-fl-to-g50', 'bmw-g20-fl', 'ncs-bmw-2027-3-series', 'evolves_into', 0.92)
addEdge('bmw-g50-m350', 'ncs-bmw-2027-3-series', 'bmw-m350-g50', 'variant_of', 0.88)

patchNode('ncs-bmw-2027-bmw-i3', {
  label: 'i3 (NA0)', fullName: 'BMW i3 (NA0)', codeName: 'NA0', bodyType: 'sedan', segment: 'premium_compact',
  hp: 463, engineType: 'ev',
  note: 'Электроседан на платформе Neue Klasse (800 В), часть 8-го поколения 3-series наряду с механически не связанным G50. Представлен 18 марта 2026, производство i3 50 xDrive в Мюнхене с августа 2026, в США — 1-е полугодие 2027. Стартовая версия 50 xDrive: 463 л.с./476 фунт-фут (в hp), WLTP до ~900 км, DC до 400 кВт. Позже: 335-603 л.с. Предшественник по Wikipedia — BMW i4 (G26). С i3 (I01, 2013) общее только имя. Источник: motor1.com, electrek.co, Wikipedia (2026).',
}, 'исправлены label/bodyType(hatchback→sedan)/hp, подключён к i4 G26')
addEdge('bmw-i4-g26-to-i3-na0', 'bmw-i4-g26', 'ncs-bmw-2027-bmw-i3', 'evolves_into', 0.8)

patchNode('ncs-bmw-2027-ix3-m60-xdrive', {
  label: 'iX3 M60 xDrive', fullName: 'BMW iX3 M60 xDrive (Neue Klasse)', bodyType: 'suv', segment: 'other',
  note: 'Топовая M Performance-версия iX3 Neue Klasse, анонсирована в октябре 2026 вместе с iX4. Два мотора, 450 кВт/612 л.с., 875 Нм, адаптивная M-подвеска, электронно управляемая M-блокировка заднего дифференциала. Источник: bmwblog.com, bimmerlife.com, autoevolution.com (2026).',
}, 'исправлен bodyType(hatchback→suv), добавлен note, подключён к iX3 Neue Klasse')
addEdge('bmw-ix3-nk-m60', 'ncs-bmw-2027-ix3-long-wheelbase', 'ncs-bmw-2027-ix3-m60-xdrive', 'variant_of', 0.88)

patchNode('ncs-bmw-2027-ix4', {
  label: 'iX4', fullName: 'BMW iX4 (Neue Klasse)', zone: 'electric', hp: 469, engineType: 'ev',
  note: 'Первый iX4 — электрический кросс-купе на платформе Neue Klasse, производное от iX3 NK (как X4 от X3). Представлен 7 октября 2026, рыночный старт — март 2027. iX4 50 xDrive: два мотора, 469 л.с./645 Нм (в hp), батарея 108.7 кВтч, до ~690 км (428 миль). Позже — M60 xDrive (612 л.с.). Источник: bmwgroup.com, autoevolution.com, jalopnik.com (2026).',
}, 'заполнены hp/engineType/zone/note, подключён к iX3 Neue Klasse')
addEdge('bmw-ix3-nk-ix4-derived', 'ncs-bmw-2027-ix3-long-wheelbase', 'ncs-bmw-2027-ix4', 'derived_from', 0.85)

patchNode('ncs-bmw-2027-ix4-m60-xdrive', {
  label: 'iX4 M60 xDrive', fullName: 'BMW iX4 M60 xDrive', zone: 'electric', hp: 612, engineType: 'ev',
  note: 'Топовая версия iX4 Neue Klasse, выходит вскоре после старта iX4 в марте 2027. 450 кВт/612 л.с., 875 Нм, 0-100 за 3.9с, ограничение 240 км/ч, WLTP до 777 км; адаптивная M-подвеска и M-блокировка заднего дифференциала. Источник: autoevolution.com, bmwblog.com (2026).',
}, 'заполнены hp/engineType/zone/note, подключён к iX4')
addEdge('bmw-ix4-nk-m60', 'ncs-bmw-2027-ix4', 'ncs-bmw-2027-ix4-m60-xdrive', 'variant_of', 0.88)

patchNode('ncs-skoda-2027-skoda-epiq', {
  label: 'Škoda Epiq', fullName: 'Škoda Epiq', hp: 208, zone: 'suv_compact',
  note: 'Компактный электрокроссовер (4171 мм) на MEB+ — серийная версия концепта Epiq (март 2024), серийный показ — май 2026. Технически производное от VW ID.Cross (те же моторы). Три версии: 116/135/211 PS (114/133/208 л.с., в hp — топ Epiq 55 с NMC 55 кВтч, до ~440 км), младшие — LFP 38.5 кВтч. Источник: motor1.com, autoevolution.com, Wikipedia (2026). Узел ncs-skoda-2027-epiq — дубль этого же автомобиля от скрапера.',
}, 'hp 215→208 (211 PS), zone, note; подключён к VW ID.Cross')
addEdge('vw-idcross-skoda-epiq-platform', 'ncs-volkswagen-2027-id-cross', 'ncs-skoda-2027-skoda-epiq', 'shares_platform', 0.8)

patchNode('ncs-mercedes-2027-amg-gt-suv', {
  label: 'AMG GT SUV', fullName: 'Mercedes-AMG GT SUV', segment: 'luxury_suv', hp: 1153, engineType: 'ev',
  note: 'Первый собственный полноразмерный SUV AMG — второй автомобиль на электроплатформе AMG.EA после нового AMG GT 4-Door. Премьера — 17 октября 2026, поставки GT 53 — с конца 2026 (от 112 350 евро в Германии). Версии GT 53/55/63; топ GT 63 — три аксиально-поточных мотора, 860 кВт (1153 л.с./1169 PS, в hp), 800 В, зарядка до 710 кВт, до 700 км. Источник: electrek.co, qz.com, thecarexpert.co.uk (2026). Узел ncs-mercedes-2028-mercedes-amg-gt-suv-one-ups — дубль этой же машины от скрапера.',
}, 'заполнены hp/engineType/note, подключён к AMG GT 4-Door (AMG.EA)')

// Доп. фикс: донор для GT SUV имел ложный engineType
patchNode('ncs-mercedes-2027-amg-gt-4-door', {
  engineType: 'ev', hp: 1153,
  note: 'Новый электрический AMG GT 4-Door — первый автомобиль на собственной платформе AMG.EA (800 В, три аксиально-поточных мотора до 1153 л.с., 0-60 за 2.0с). Представлен 19 мая 2026 в Лос-Анджелесе; GT 55 — с конца 2026, GT 63 — начало 2027. До 2026-10-28 узел ошибочно имел engineType v8t/577 л.с. — ДВС у этой машины нет. Источник: jalopnik.com, autonews.com, kbb.com (2026).',
}, 'ИСПРАВЛЕНА ФАКТ. ОШИБКА engineType v8t→ev, hp 577→1153 (электрический AMG.EA)')
addEdge('merc-amg-gt4-ev-gt-suv-platform', 'ncs-mercedes-2027-amg-gt-4-door', 'ncs-mercedes-2027-amg-gt-suv', 'shares_platform', 0.85)

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const run = touched.map(id => { const n = byId[id]; return { id, label: n.label, brandName: n.brandName, year: n.year } })
fs.writeFileSync(RUN_OUT, JSON.stringify(run, null, 2), 'utf8')
log.forEach(l => console.log(l))
console.log(`\nУзлов добавлено/изменено: ${run.length}; всего узлов ${g.nodes.length}, рёбер ${g.edges.length}`)
