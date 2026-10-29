#!/usr/bin/env node
// Еженедельный аудит бренда 2026-10-28: Kia (64 узла) + контроль качества
// свежих добавлений graph-gap-fill / скрейпера (ЧАСТЬ B).
//
// ЧАСТЬ A — Kia. Механических сигналов (generic engineType / нет bodyType /
// опечатки рёбер) по графу не осталось, поэтому ручная сверка с историей:
//  - Пропущенные поколения: Rio I (DC, 2000), Cerato I (LD, 2003 — предшественник
//    Forte), Optima I (MS, 2000) и Optima II (MG/Magentis/Lotze, 2005) — линейка
//    K5 начиналась сразу с TF 2010, причём подписи "Optima II/III/IV" были
//    сдвинуты на одно поколение (TF — это 3-я Optima, JF — 4-я, DL3 — 5-я).
//  - Пропущенные модели: флагман K9/Quoris/K900 (KH 2012, RJ 2018), пикап Tasman
//    (2025), EV9 GT (2025), EV2 (2026).
//  - Неверное ребро shares_platform Santa Fe SM → Sorento I: Sorento BL был
//    рамным (на базе Terracan), общая с Santa Fe платформа — только с XM (2009).
//  - Недостающие shares_platform с Hyundai: Palisade↔Telluride (обе пары),
//    Ioniq↔Niro I, Elantra XD/HD/MD/AD/CN7 ↔ Cerato/Forte/K4, i30 PD↔Ceed III,
//    Tucson NX5↔Sportage VI, Sonata EF/NF ↔ Optima MS/MG, Genesis BH↔K9.
//  - engineType: Niro I "hybrid" → i4h; Niro II анкор был EV-версией (204hp),
//    хотя базовая и основная линия — HEV 141hp как у Niro I → выровнено;
//    Sorento I/II: engineType "v6" при hp 140/194, что соответствует дизелям
//    2.5/2.2 CRDi → i4d.
//
// ЧАСТЬ B — свежие узлы (scrapedAt за 8 дней, ncs-*-2025+, last-graph-gap-run):
//  - дубли-сироты: 5× ncs-bentley-2028-*torcal* (есть bentley-torcal),
//    2× ncs-jaguar-2028-type-01* (есть jaguar-type01), AMG GT SUV "One-Ups",
//    GLE53 PHEV (дубль GLE 53 Hybrid), ncs-skoda-2027-epiq (есть *-skoda-epiq),
//    ncs-astonmartin-2028-martin-valen (есть am-valen), "2027 BMW X5 First"
//    (обзор того же G65, ошибочно ev + evolves_into), "C-Class Refresh"
//    (дубль "C-Class Updated", ошибочно evolves_into), C-Class EV [UK]
//    (дубль merc-c-w206-ev).
//  - generic/неверные поля: GLS 680 Maybach (ICE/eu), GMA Le Mans GTR (ICE/uk),
//    Koenigsegg Sadair's Spear (hybrid/eu — у Jesko нет гибрида),
//    Huayra Codalunga Speedster (ICE/eu), Lexus ES (zone jp), Crown (hybrid),
//    Valhalla Spider (bodyType coupe), C-Class Estate (coupe).
//  - сироты без полей: Mach-E Trail, Pathfinder Special Edition, Lexus RZ 2027.
// Источники: Wikipedia (Kia Sorento/K5/Magentis/Rio/Cerato/K9/Tasman),
// automobile-catalog.com, motor1, autoblog (GLE 53 577hp), electrek (RZ 2027),
// motor1/electrive (Mach-E Trail), nissannews (Pathfinder SE), kia press office
// (EV9 GT) — проверено веб-поиском 2026-10-28.
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
  if (g.edges.some(e => e.id === id || (e.source === source && e.target === target && e.type === type))) {
    console.log('  ⚠️  ребро уже есть:', id); return
  }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}
function deleteEdge(id) {
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.id !== id)
  console.log(g.edges.length < before ? `  🗑️  удалено ребро ${id}` : `  ⚠️  ребро не найдено: ${id}`)
}
function deleteNode(id, why) {
  if (!byId.has(id)) { console.log('  ⚠️  узел не найден:', id); return }
  g.nodes = g.nodes.filter(n => n.id !== id); byId.delete(id)
  const before = g.edges.length
  g.edges = g.edges.filter(e => e.source !== id && e.target !== id)
  console.log(`  🗑️  ${id} (+${before - g.edges.length} рёбер) — ${why}`)
}
function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete n[k]; else n[k] = v
  }
  console.log(`  ✏️  ${id}: ${Object.keys(patch).join(', ')}`)
}
const kia = (o) => ({ type: 'generation', brandId: 'kia', brandName: 'Kia', segment: 'mainstream', ...o })

// ═════════════════════════════ ЧАСТЬ A — KIA ═════════════════════════════
console.log('=== A1. Rio I (DC, 2000) ===')
addNode(kia({
  id: 'kia-rio-1', label: 'Rio I (2000)', fullName: 'Kia Rio I (DC)', year: 2000, codeName: 'DC',
  modelSlug: 'kia-rio', familyKey: 'kia-rio', bodyType: 'hatchback', segment: 'subcompact', zone: 'hatchback',
  hp: 96, engineType: 'i4',
  note: 'Первое поколение Rio — заменило сразу две модели: Pride (лицензионный Ford Festiva) и Avella. Седан и универсал/хэтчбек Rio Cinco, моторы 1.3/1.5/1.6 (75-104hp); указан 1.5 96hp. Источник: Wikipedia, cars-data.com.',
}))
addEdge('e-rio-1-2', 'kia-rio-1', 'kia-rio-2', 'evolves_into', 0.9)

console.log('\n=== A2. Cerato I (LD, 2003) — предшественник Forte ===')
addNode(kia({
  id: 'kia-cerato-1', label: 'Cerato / Spectra (2003)', fullName: 'Kia Cerato / Spectra (LD)', year: 2003, codeName: 'LD',
  modelSlug: 'kia-k4', familyKey: 'kia-k4', bodyType: 'sedan', zone: 'midsize_sed',
  hp: 141, engineType: 'i4',
  note: 'Первая Cerato (в Сев. Америке — Spectra/Spectra5 с 2004 МГ), платформа общая с Hyundai Elantra XD, моторы Beta II. Диапазон 1.5-2.0 (101-141hp); указан 2.0. Сменила Sephia/Spectra, сменена Forte/Cerato TD (2008). Источник: Wikipedia, automobile-catalog.com.',
}))
addEdge('e-k4-0-1', 'kia-cerato-1', 'kia-forte-1', 'evolves_into', 0.9)
addEdge('e-nc-el3-cer1', 'hyu-elantra-3', 'kia-cerato-1', 'shares_platform', 0.8)

console.log('\n=== A3. Optima I (MS) / II (MG) + исправление нумерации K5 ===')
addNode(kia({
  id: 'kia-optima-ms', label: 'Optima I (2000)', fullName: 'Kia Optima / Magentis I (MS)', year: 2000, codeName: 'MS',
  modelSlug: 'kia-k5', familyKey: 'kia-k5', bodyType: 'sedan', zone: 'exec_sed',
  hp: 169, engineType: 'v6',
  note: 'Первая Optima (вне США — Magentis) — по сути перелицованная Hyundai Sonata EF. Моторы 1.8/2.0 I4 (131-147hp) и 2.5/2.7 V6; указан 2.5 V6 169hp. Источник: Wikipedia (Kia K5), automobile-catalog.com.',
}))
addNode(kia({
  id: 'kia-optima-mg', label: 'Optima II / Magentis (2005)', fullName: 'Kia Optima II / Magentis / Lotze (MG)', year: 2005, codeName: 'MG',
  modelSlug: 'kia-k5', familyKey: 'kia-k5', bodyType: 'sedan', zone: 'exec_sed',
  hp: 185, engineType: 'v6',
  note: 'Второе поколение (в Корее — Lotze, в мире — Magentis), запуск ноябрь 2005, платформа Hyundai Sonata NF. I4 2.0/2.4 и V6 2.5/2.7; указан 2.7 V6 185hp (после рестайлинга 2008 — до 193hp). Источник: Wikipedia (Kia Magentis), automobile-catalog.com.',
}))
addEdge('e-k5-ms-mg', 'kia-optima-ms', 'kia-optima-mg', 'evolves_into', 0.9)
addEdge('e-k5-mg-1', 'kia-optima-mg', 'kia-k5-1', 'evolves_into', 0.85)
addEdge('e-n3-son3-optms', 'hyu-sonata-3', 'kia-optima-ms', 'shares_platform', 0.85)
addEdge('e-n3-son4-optmg', 'hyu-sonata-4', 'kia-optima-mg', 'shares_platform', 0.85)
fixNode('kia-k5-1', { label: 'K5 I / Optima III (2010)', year: 2010, codeName: 'TF',
  note: 'Первая модель под именем K5 (в Корее, май 2010), в мире — 3-е поколение Optima. Платформа Hyundai Sonata YF; дизайн Петера Шрайера. Ранее ошибочно подписана как "Optima II".' })
fixNode('kia-k5-2', { label: 'K5 II / Optima IV (2015)', year: 2015, codeName: 'JF',
  note: '2-е поколение K5 / 4-е Optima (июль 2015), платформа Hyundai Sonata LF. Ранее ошибочно подписана как "Optima III".' })
fixNode('kia-k5-3', { label: 'K5 III / Optima V (2020)', codeName: 'DL3',
  note: '3-е поколение K5 (премьера дек. 2019) — имя Optima упразднено и в экспорте. Платформа N3, общая с Sonata DN8. Ранее ошибочно подписана как "Optima IV".' })

console.log('\n=== A4. Флагман K9 / Quoris / K900 ===')
addNode(kia({
  id: 'kia-k9-1', label: 'K9 / Quoris (2012)', fullName: 'Kia K9 / Quoris / K900 (KH)', year: 2012, codeName: 'KH',
  modelSlug: 'kia-k9', familyKey: 'kia-k9', bodyType: 'sedan', segment: 'luxury', zone: 'flagship_sed',
  hp: 334, engineType: 'v6',
  note: 'Заднеприводный флагман на платформе Hyundai Genesis BH. На старте — V6 3.3 (300hp) и 3.8 (334hp, указан как основной); 5.0 V8 Tau (420hp) добавлен в 2014 и стал единственным мотором K900 в США. Источник: Wikipedia, automobile-catalog.com.',
}))
addNode(kia({
  id: 'kia-k9-2', label: 'K9 / K900 II (2018)', fullName: 'Kia K9 / K900 II (RJ)', year: 2018, codeName: 'RJ',
  modelSlug: 'kia-k9', familyKey: 'kia-k9', bodyType: 'sedan', segment: 'luxury', zone: 'flagship_sed',
  hp: 365, engineType: 'v6t',
  note: '2-е поколение. В Корее V6 3.8 (315hp), V6 3.3 twin-turbo (365hp) и V8 5.0; в США K900 — только 3.3TT 365hp (указан), V8 убран. Продажи в США свернуты после 2020 МГ. Источник: Wikipedia, KBB, MotorWeek.',
}))
addEdge('e-k9-1-2', 'kia-k9-1', 'kia-k9-2', 'evolves_into', 0.9)
addEdge('e-gbh-k9-1', 'hyu-genesis-bh', 'kia-k9-1', 'shares_platform', 0.75)

console.log('\n=== A5. Новые модели: Tasman, EV9 GT, EV2 ===')
addNode(kia({
  id: 'kia-tasman', label: 'Kia Tasman (2025)', fullName: 'Kia Tasman', year: 2025, codeName: 'TK',
  modelSlug: 'kia-tasman', familyKey: 'kia-tasman', bodyType: 'pickup', zone: 'pickup',
  hp: 281, engineType: 'i4t',
  note: 'Первый среднеразмерный рамный пикап Kia (премьера окт. 2024 в Джидде, продажи 2025 — Корея, Австралия, Ближний Восток; в США не поставляется). Бензин 2.5T 281hp (в Корее 277hp) и дизель 2.2 CRDi; 8АКПП. Рама — собственная, по сообщениям прессы, развитие конструкции Mohave — единственного другого рамного Kia. Источник: Wikipedia, motor1, Hagerty.',
}))
addEdge('e-mohave-tasman', 'kia-mohave-fl', 'kia-tasman', 'inspired_by', 0.4)
addNode(kia({
  id: 'kia-ev9-gt', label: 'EV9 GT', fullName: 'Kia EV9 GT', year: 2025, codeName: 'MV',
  modelSlug: 'kia-ev9', familyKey: 'kia-ev9', bodyType: 'suv', segment: 'exec_sports', zone: 'suv_large',
  hp: 501, engineType: 'ev',
  note: 'Производительная версия EV9: два мотора, 374 кВт (501-509 л.с. в зависимости от рынка/норматива), электронно-управляемая подвеска, e-LSD, Virtual Gear Shift. Запуск в Корее фев. 2025, Европа/США — 2026 МГ. Источник: Kia press office, Edmunds, electrek.',
}))
addEdge('e-ev9-gt', 'kia-ev9', 'kia-ev9-gt', 'variant_of', 0.9)
addNode(kia({
  id: 'kia-ev2', label: 'Kia EV2 (2026)', fullName: 'Kia EV2', year: 2026,
  modelSlug: 'kia-ev2', familyKey: 'kia-ev2', bodyType: 'suv', segment: 'compact', zone: 'suv_compact',
  hp: 133, engineType: 'ev',
  note: 'Самый младший электрокроссовер Kia (B-сегмент) для Европы, производство в Жилине (Словакия), продажи с весны 2026. 99.5 кВт/133 л.с. (Standard), старшие версии до ~146 л.с. Дизайн по канонам EV3/EV4. Источник: automobile-catalog.com, auto-data.net.',
}))
addEdge('e-ev3-ev2', 'kia-ev3', 'kia-ev2', 'inspired_by', 0.6)

console.log('\n=== A6. Sorento I не делила платформу с Santa Fe SM ===')
deleteEdge('e-nlg-sf1-sor1')
fixNode('kia-sorento-1', { engineType: 'i4d',
  note: 'Рамный SUV (BL) на базе Hyundai Terracan — НЕ на платформе Santa Fe (общая платформа появилась только с XM 2009). Моторы 2.4 I4, 3.5 V6 (192hp), 2.5 CRDi (140hp, указан). Источник: Wikipedia.' })
fixNode('kia-sorento-2', { engineType: 'i4d',
  note: 'XM — первый несущий Sorento, платформа общая с Hyundai Santa Fe CM. Указан дизель 2.2 CRDi (197PS/194hp); бензин 2.4 I4 и 3.5 V6 (276hp) в США. Источник: Wikipedia.' })

console.log('\n=== A7. Niro: единый HEV-анкор ===')
fixNode('kia-niro-1', { engineType: 'i4h' })
fixNode('kia-niro-2', { engineType: 'i4h', hp: 141,
  note: '2-е поколение (SG2), три версии: HEV 1.6 GDi 141hp (указан как основная линия, как у Niro I), PHEV 183hp и Niro EV 204hp/64.8 кВтч. Ранее анкор ошибочно был EV-версией.' })

console.log('\n=== A8. Недостающие shares_platform с Hyundai ===')
addEdge('e-pal1-tel1', 'hyu-palisade-1', 'kia-telluride-1', 'shares_platform', 0.85)
addEdge('e-pal2-tel2', 'hyu-palisade-2', 'kia-telluride-2', 'shares_platform', 0.85)
addEdge('e-ioniq-niro1', 'hyu-ioniq-classic', 'kia-niro-1', 'shares_platform', 0.85)
addEdge('e-nc-el4-fo1', 'hyu-elantra-4', 'kia-forte-1', 'shares_platform', 0.8)
addEdge('e-nc-el5-fo2', 'hyu-elantra-5', 'kia-forte-2', 'shares_platform', 0.8)
addEdge('e-nc-el6-fo3', 'hyu-elantra-6', 'kia-forte-3', 'shares_platform', 0.8)
addEdge('e-nc-el7-k4', 'hyu-elantra-7', 'kia-k4', 'shares_platform', 0.8)
addEdge('e-i30pd-ceed3', 'hyu-i30-pd', 'kia-ceed-3', 'shares_platform', 0.85)
addEdge('e-nsuv-tuc5-sp6', 'hyu-tucson-5', 'kia-sportage-6', 'shares_platform', 0.85)

// ════════════════════════ ЧАСТЬ B — свежие узлы ════════════════════════
console.log('\n=== B1. Дубли-сироты ===')
const torcal = byId.get('bentley-torcal')
if (torcal && !/autoweek/.test(torcal.note || '')) {
  torcal.note = (torcal.note || '') + ' Доп. обзоры (из удалённых дублей скрейпера): autoweek.com, jalopnik.com (2 статьи), thedrive.com, netcarshow.com.'
}
;['ncs-bentley-2028-torcal', 'ncs-bentley-2028-bentley-torcal-breaks',
  'ncs-bentley-2028-bentley-torcal-ev-charts-a-slightly-strange',
  'ncs-bentley-2028-bentley-torcal-first-ride',
  'ncs-bentley-2028-bentley-torcal-aims-to-capture-that-tangibl'].forEach(id => deleteNode(id, 'дубль bentley-torcal'))
;['ncs-jaguar-2028-type-01', 'ncs-jaguar-2028-jaguar-type-01-ev'].forEach(id => deleteNode(id, 'дубль jaguar-type01'))
deleteNode('ncs-mercedes-2028-mercedes-amg-gt-suv-one-ups', 'дубль ncs-mercedes-2027-amg-gt-suv')
deleteNode('ncs-mercedes-2027-mercedes-amg-gle53-phev', 'дубль GLE 53 Hybrid')
deleteNode('ncs-skoda-2027-epiq', 'дубль ncs-skoda-2027-skoda-epiq')
deleteNode('ncs-astonmartin-2028-martin-valen', 'дубль am-valen')
deleteNode('ncs-bmw-2027-bmw-x5-first', 'обзор того же X5 G65 (ошибочно ev + evolves_into)')
deleteNode('ncs-mercedes-2027-mercedes-benz-c-class-refresh', 'дубль C-Class Updated (ошибочно evolves_into)')
deleteNode('ncs-mercedes-2027-c-class-ev-uk', 'UK-версия, дубль merc-c-w206-ev')

console.log('\n=== B2. Исправление полей и привязка сирот ===')
fixNode('ncs-mercedes-2027-mercedes-amg-gle-53-hybrid', { label: 'AMG GLE 53 Hybrid (2027)', engineType: 'i6h', hp: 577, zone: 'suv_large',
  note: 'AMG GLE 53 стал полноценным PHEV: 3.0 I6 турбо + электромотор 181hp, суммарно 577hp/553 lb-ft. Часть обновления GLE 2027 МГ. Источник: motor1, autoblog, jalopnik.' })
addEdge('e-gle167fl-53h', 'merc-gle-w167-fl', 'ncs-mercedes-2027-mercedes-amg-gle-53-hybrid', 'variant_of', 0.85)
fixNode('ncs-mercedes-2027-mercedes-c-class-updated', { label: 'C-Class W206 Phase II (2027)', bodyType: 'sedan',
  note: 'Рестайлинг W206 (2027 МГ): новая оптика/решётка, обновлённые моторы с 48В mild-hybrid. Источник: jalopnik, autoweek (дубль-узел "C-Class Refresh" удалён).' })
fixNode('ncs-mercedes-2027-c-class-estate', { bodyType: 'wagon' })
fixNode('merc-c-w206-ev', { bodyType: 'sedan' })
fixNode('ncs-astonmartin-2028-valhalla-spider', { bodyType: 'roadster', zone: 'hypercar' })
fixNode('ncs-ford-2027-mustang-mach-e-trail', { label: 'Mustang Mach-E Trail', engineType: 'ev', bodyType: 'suv', zone: 'electric',
  note: 'Пакет Trail ($2295) только для Select eAWD 2027 МГ: +10/15 мм клиренса, рулевая рейка и 19" диски от Rally, шины CrossClimate 2, розетки Pro Power 400W. Ориентирован на грунтовки, а не на ралли. Источник: motor1, electrive, KBB (окт. 2026).' })
addEdge('e-mache-trail', 'ford-mustang-mache', 'ncs-ford-2027-mustang-mach-e-trail', 'variant_of', 0.8)
fixNode('ncs-nissan-2027-pathfinder-special-edition', { engineType: 'v6', hp: 284, bodyType: 'suv', zone: 'suv_mid',
  note: 'Юбилейная версия к 40-летию Pathfinder: бордово-чёрный салон в честь оригинала 1987 г., 20" чёрные диски. 3.5 V6 284hp. От $47 390, продажи с ноября 2026. Источник: nissannews, KBB.' })
addEdge('e-pf-r53-se', 'nissan-pathfinder-r53', 'ncs-nissan-2027-pathfinder-special-edition', 'variant_of', 0.75)
fixNode('ncs-lexus-2027-lexus-rz', { label: 'Lexus RZ (2027)', engineType: 'ev', hp: 221, bodyType: 'suv', zone: 'electric',
  note: 'Обновлённый RZ 2027 МГ: RZ 350e FWD 221hp/79.6 кВтч до 301 мили (указан), RZ 450e AWD 308hp, RZ 550e F Sport 402hp. От $47 495. Платформа e-TNGA, общая с Toyota bZ4X. Источник: electrek, carbuzz (окт. 2026).' })
addEdge('e-bz4x-rz', 'toyota-bz4x', 'ncs-lexus-2027-lexus-rz', 'shares_platform', 0.8)
fixNode('ncs-mercedes-2027-gls-680-maybach', { engineType: 'v8t', zone: 'suv_large' })
fixNode('ncs-gordon-murray-2026-automotive-le-mans', { engineType: 'v12', zone: 'hypercar' })
fixNode('ncs-koenigsegg-2025-sadairs-spear', { engineType: 'v8t', zone: 'hypercar' })
fixNode('ncs-pagani-2025-huayra-codalunga-speedster', { engineType: 'v12', zone: 'hypercar' })
fixNode('ncs-lexus-2026-lexus-es-500e-awd', { zone: 'exec_sed' })
fixNode('ncs-lexus-2026-lexus-es-350e', { zone: 'exec_sed' })
fixNode('ncs-lexus-2026-lexus-es-350h', { zone: 'exec_sed', engineType: 'i4h' })
fixNode('ncs-toyota-2027-toyota-crown', { engineType: 'i4h' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
