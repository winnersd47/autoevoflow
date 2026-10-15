#!/usr/bin/env node
// Второй курируемый батч новинок скрайпера (2026-08-24), после фикса дедуп-скрипта
// (Denza — не новый бренд, уже 4 узла в графе: D9/N7/N8/Z9GT; Gordon Murray S1,
// Rivian R2, Kia EV3, Cadillac Celestiq, Chevrolet Bolt Gen.2 и др. — тоже уже
// в графе под другими id/годами). Каждый пункт исследован через веб-поиск
// (реальность, спеки, актуальный статус) перед добавлением.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⏭  узел уже есть:', node.id); return }
  graph.nodes.push(node)
  byId.set(node.id, node)
  console.log('  ✅ узел:', node.id, '-', node.label)
}
function addEdge(id, source, target, type, extra = {}) {
  if (graph.edges.some(e => e.id === id)) { console.log('  ⏭  ребро уже есть:', id); return }
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  пропущено ребро (нет узла):', id); return }
  graph.edges.push({ id, source, target, type, strength: 0.8, ...extra })
  console.log('  ✅ ребро:', source, '--' + type + '-->', target)
}

console.log('=== Jaguar Type 01 — серийная версия Type 00 ===')
addNode({
  id: 'jaguar-type01', label: 'Type 01', fullName: 'Jaguar Type 01', type: 'generation',
  year: 2027, brandId: 'jaguar', brandName: 'Jaguar', modelSlug: 'jaguar-type01',
  bodyType: 'sedan', segment: 'hypercar', zone: 'supercar', hp: 986, engineType: 'electric',
  note: 'Официальное имя серийной версии концепта Type 00 (Jaguar объявил в 2026). Три электромотора AWD, ~986 л.с./959 lb-ft, батарея 120 кВтч, 0-60 меньше 3с, запас хода ~430 миль, зарядка до 350 кВт. Показан 6 окт. 2026 в Нью-Йорке, старт поставок H1 2027, от ~$130-140K.',
})
addEdge('jaguar-type00-to-type01', 'jaguar-type00', 'jaguar-type01', 'concept_to_production')

console.log('\n=== Aston Martin DB12 S Volante ===')
addNode({
  id: 'am-db12-s-volante', label: 'DB12 S Volante', fullName: 'Aston Martin DB12 S Volante', type: 'generation',
  year: 2026, brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'DB12 S',
  modelSlug: 'astonmartin-db12', bodyType: 'convertible', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 690, engineType: 'v8t',
  note: 'Более мощная трим-версия "S" (690 л.с./590 lb-ft против ~671 у базового DB12) в кузове Volante (кабриолет). 4.0Т V8, 0-60 за 3.4с, 202 mph. Заказы открыты в 2026, поставки с Q1 2026.',
})
addEdge('am-db12-to-s-volante', 'am-db12', 'am-db12-s-volante', 'variant_of')

console.log('\n=== Ford Fathom — новый компактный электропикап ===')
addNode({
  id: 'ford-fathom', label: 'Fathom', fullName: 'Ford Fathom', type: 'generation',
  year: 2027, brandId: 'ford', brandName: 'Ford', modelSlug: 'ford-fathom',
  bodyType: 'pickup', segment: 'mainstream', zone: 'electric', engineType: 'ev',
  note: 'Официально анонсирован Ford 6 авг. 2026. Компактный электропикап начального уровня — от $28,350 ($29,945 с доставкой), больше пассажирского объёма чем у RAV4, фрунк + кузов. Мощность пока не раскрыта. Старт производства Q1 2027.',
})

console.log('\n=== Genesis X Skorpio Concept — отдельный от Genesis X Concept (2021) ===')
addNode({
  id: 'genesis-x-skorpio-concept', label: 'X Skorpio Concept', fullName: 'Genesis X Skorpio Concept', type: 'generation',
  year: 2026, brandId: 'genesis', brandName: 'Genesis', modelSlug: 'genesis-x-skorpio-concept',
  bodyType: 'suv', segment: 'offroad', zone: 'concept', hp: 1100, engineType: 'v8',
  isConcept: true,
  note: 'НЕ связан с трилогией Genesis X Concept/Speedium Coupe/Convertible (2021-2023, GT-дизайн) — показан 27 янв. 2026 в пустыне ОАЭ как часть новой концепт-стратегии бренда. Экстремальный внедорожный концепт: трубчатый каркас, каркас безопасности, 40" колёса, V8 1100 л.с./850 lb-ft. Genesis подтвердил очень ограниченный тираж, заказы уже принимаются.',
})

console.log('\n=== Lincoln Nautilus (2024, новое поколение) ===')
addNode({
  id: 'lincoln-nautilus-2024', label: 'Nautilus (2024)', fullName: 'Lincoln Nautilus', type: 'generation',
  year: 2024, brandId: 'lincoln', brandName: 'Lincoln', codeName: 'Nautilus 2024',
  modelSlug: 'lincoln-nautilus', bodyType: 'suv', segment: 'crossover', zone: 'suv_mid',
  hp: 250, engineType: 'turbo4',
  note: 'Полный редизайн (не фейслифт) — новая платформа, производство перенесено в Китай (СП Changan-Ford). Панорамный дисплей 48" на две панели. Базовый 2.0Т I4 250 л.с./275 lb-ft; гибрид (турбо-4 + мотор 100кВт) — 310 л.с. combined.',
})
addEdge('lincoln-nautilus-to-2024', 'lincoln-nautilus', 'lincoln-nautilus-2024', 'evolves_into')

console.log('\n=== 4 новых концепта ===')
addNode({
  id: 'hyundai-boulder-concept', label: 'Boulder Concept', fullName: 'Hyundai Boulder Concept', type: 'generation',
  year: 2026, brandId: 'hyundai', brandName: 'Hyundai', modelSlug: 'hyundai-boulder-concept',
  bodyType: 'suv', segment: 'offroad', zone: 'concept', engineType: 'unknown', isConcept: true,
  note: 'Неожиданный дебют на нью-йоркском автосалоне, апр. 2026. Рамный внедорожник, дизайн-язык "Art of Steel" — первая рамная платформа Hyundai, готовит почву под будущий среднеразмерный пикап для США (~2030). Силовая установка для концепта не раскрыта; платформа рассчитана на ДВС/гибрид/EV, для серии вероятен EREV.',
})
addNode({
  id: 'peugeot-concept-6', label: 'Concept 6', fullName: 'Peugeot Concept 6', type: 'generation',
  year: 2026, brandId: 'peugeot', brandName: 'Peugeot', modelSlug: 'peugeot-concept-6',
  bodyType: 'wagon', segment: 'exec', zone: 'concept', engineType: 'electric', isConcept: true,
  note: 'Показан на автосалоне в Пекине, апр. 2026, вместе с Concept 8. Флагманский шутинг-брейк/седан, предвестник преемника 508. Полностью электрический, серия ожидается ~2027.',
})
addNode({
  id: 'renault-rspace-lab-concept', label: 'R-Space Lab Concept', fullName: 'Renault R-Space Lab Concept', type: 'generation',
  year: 2026, brandId: 'renault', brandName: 'Renault', modelSlug: 'renault-rspace-lab-concept',
  bodyType: 'mpv', segment: 'other', zone: 'concept', engineType: 'electric', isConcept: true,
  note: 'Исследовательский концепт от подразделения Renault "Garage Futurama" (март 2026) — не прямой предвестник серийной модели, а изучение UX/салона на серийной платформе RGEV Medium 2.0. Модульный салон 4.5м, steer-by-wire, датчик алкоголя, панорамный экран openR. Намекает на направление Espace/Mégane после 2030.',
})
addNode({
  id: 'geely-eva-cab-concept', label: 'Eva Cab Concept', fullName: 'Geely Eva Cab Concept', type: 'generation',
  year: 2026, brandId: 'geely', brandName: 'Geely', modelSlug: 'geely-eva-cab-concept',
  bodyType: 'other', segment: 'other', zone: 'concept', engineType: 'electric', isConcept: true,
  note: 'Показан на автосалоне в Пекине, апр. 2026. Первое у Geely беспилотное такси уровня L4 полностью собственной разработки — салон vis-a-vis, ИИ-модель Step3.5 (196B параметров) + вычислитель H9 (1400 TOPS), 43 сенсора/лидары. Коммерческая версия для CaoCao Mobility планируется на 2027.',
})

console.log('\n=== Denza — НЕ новый бренд (уже 4 узла: D9/N7/N8/Z9GT), добавляю 3 новые линейки ===')
addNode({
  id: 'denza-z', label: 'Z', fullName: 'Denza Z', type: 'generation',
  year: 2026, brandId: 'denza', brandName: 'Denza', modelSlug: 'denza-z',
  bodyType: 'coupe', segment: 'sports_gt', zone: 'china_ev', hp: 1604, engineType: 'BEV',
  note: '2-местный гиперкар-халo, показан на Goodwood FoS 2026 — ДРУГАЯ машина, чем 4-местный Z9 GT (не производная). Трёхмоторный, 1604 л.с. combined, батарея 76 кВтч, 409км WLTP, 0-62 за 2.25с, от £142,900.',
})
addNode({
  id: 'denza-z-spider', label: 'Z Spider', fullName: 'Denza Z Spider', type: 'generation',
  year: 2026, brandId: 'denza', brandName: 'Denza', modelSlug: 'denza-z',
  bodyType: 'targa', segment: 'sports_gt', zone: 'china_ev', hp: 1604, engineType: 'BEV',
  note: 'Открытая версия Denza Z, та же платформа/силовая установка. 400км WLTP (чуть меньше купе из-за веса крыши), от £159,900.',
})
addNode({
  id: 'denza-z-racing', label: 'Z Racing', fullName: 'Denza Z Racing', type: 'generation',
  year: 2026, brandId: 'denza', brandName: 'Denza', modelSlug: 'denza-z',
  bodyType: 'coupe', segment: 'sports_gt', zone: 'china_ev', hp: 1604, engineType: 'BEV',
  note: 'Трек-версия Denza Z, та же платформа. Самая быстрая в линейке: 0-62 за 1.96с, ~349км/ч макс. скорость, от £172,900.',
})
addNode({
  id: 'denza-bao5', label: 'Bao 5', fullName: 'Denza Bao 5', type: 'generation',
  year: 2026, brandId: 'denza', brandName: 'Denza', modelSlug: 'denza-bao5',
  bodyType: 'suv', segment: 'offroad', zone: 'china_ev', hp: 544, engineType: 'PHEV',
  note: 'Внедорожный PHEV, другая суббренд-линейка чем D/N/Z (в некоторых рынках маркируется "B5"). 1.5T + два мотора, 544 л.с. combined, ~90км запас хода на электротяге, от £69,500.',
})
addEdge('denza-z9gt-to-z', 'denza-z9gt', 'denza-z', 'derived_from', { strength: 0.6 })
addEdge('denza-z-to-spider', 'denza-z', 'denza-z-spider', 'variant_of')
addEdge('denza-z-to-racing', 'denza-z', 'denza-z-racing', 'variant_of')

console.log('\n=== Уточнение по Genesis GV90 (не новый узел — 2026 ревил и 2028 старт продаж в США это ОДНА машина) ===')
const gv90 = byId.get('gen-gv90-1')
if (gv90 && !gv90.note) {
  gv90.note = 'Глобальный анонс 19 авг. 2026 (флагманский 3-рядный EV SUV, ~660 л.с./590 lb-ft, платформа eM, двери без стойки-B). Старт продаж в Корее — MY2027, в США — только MY2028 (Neolum First Edition, производство с H2 2027). Разные рынки/этапы одной модели, не два разных поколения.'
  console.log('  ✅ добавлен note к gen-gv90-1')
} else {
  console.log('  ⏭  gen-gv90-1 не найден или note уже есть')
}

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Всего узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
