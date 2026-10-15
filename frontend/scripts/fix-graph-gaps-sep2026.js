#!/usr/bin/env node
// Обработка партии gap-candidates от 2026-09-02 (find-graph-gaps.js).
// По запросу "Land Rover Range Rover Electric надо и аналогичные ему находки".
//
// Из 31 кандидата большинство — уже покрытые модели (ложные срабатывания,
// задокументированная слабость find-graph-gaps.js: Nuvolari/Torcal/Valen/
// Brabus Bodo Cabriolet/Denza Z/GV70 Electrified/Ford Raptor/DB12 S Volante/
// Ram Power Wagon Cummins — всё уже в графе, проверено вручную grep'ом) или
// рутинные MY-рефреши (Tucson/Traverse/G70/Santa Cruz/Ioniq5/Sentra/A3 и т.п.
// — не трогаем). Chevrolet Camaro Sedan и Toyota MR2 "без шильдика" оставлены
// НЕ добавленными — это инсайдерские слухи без официального подтверждения
// производителя (в отличие от остальных ниже, где есть прямое подтверждение
// от самого бренда/CEO/офиц. пресс-центра).
//
// А) Range Rover Electric — дедуп +3 "sync-ev-" дублей-огрызков (тот же баг,
//    что и с Ferrari 296 ранее) + обновление hp по официальным данным JLR.
// Б) 6 новых узлов — все реально подтверждены производителем/офиц. источником.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== А) Range Rover Electric: дедуп + реальные характеристики ===')
const rre = byId.get('lr-rr-electric')
rre.hp = 542
rre.note = 'Офиц. данные JLR: 542 л.с. (2 мотора), батарея 118.5 кВтч, запас хода 333 мили/536км WLTP, 800В/350кВт зарядка, старт продаж H2 2026, от $138k в США. (Ранее в графе стояла оценка 493 л.с. — заменена на офиц. цифру после реального анонса.)'
const dupIds = new Set([
  'ncs-land-rover-2027-range-rover-electric-finally',
  'ncs-land-rover-2027-range-rover-ev-boasts-531-km-range',
  'ncs-land-rover-2027-rover-range-rover-electric',
])
const nBefore = graph.nodes.length, eBefore = graph.edges.length
graph.nodes = graph.nodes.filter(n => !dupIds.has(n.id))
graph.edges = graph.edges.filter(e => !dupIds.has(e.source) && !dupIds.has(e.target))
console.log(`  🗑️  удалено дублей-огрызков: ${nBefore - graph.nodes.length}, их sync-ev рёбер: ${eBefore - graph.edges.length}`)
console.log('  ✅ lr-rr-electric: hp 493 → 542, note обновлён')

console.log('\n=== Б) Новые узлы — реально подтверждённые находки ===')

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует, пропуск:', node.id); return false }
  graph.nodes.push(node)
  byId.set(node.id, node)
  return true
}
function addEdge(id, source, target, type, strength) {
  graph.edges.push({ id, source, target, type, strength })
}

// 1. Ram ProMaster City (2027) — реанимация нейминга, снят с продаж в 2022,
//    возвращается как отдельная модель. Офиц. подтверждено ramtrucks.com,
//    FleetOwner, Motor1, WardsAuto, Work Truck Week (сент. 2026).
if (addNode({
  id: 'ram-promaster-city-2', label: 'Ram ProMaster City (2027)', fullName: 'Ram ProMaster City',
  type: 'generation', year: 2027, brandId: 'ram', brandName: 'Ram',
  modelSlug: 'ram-promaster-city', familyKey: 'ram-promaster-city',
  bodyType: 'van', segment: 'commercial', zone: 'pickup',
  hp: 166, engineType: 'i4t', engineCC: 1600,
  note: 'Реанимация модели (снята с продаж в 2022) — компактный коммерческий фургон, платформа Stellantis midsize global commercial van (общая с Citroën Jumpy/Dispatch). 1.6T I4, 221 lb-ft, 8-АКПП, >167 куб.футов груз. объёма, от $40k. Производство с конца 2026, в продаже с января 2027. Источники: ramtrucks.com, FleetOwner, Motor1, WardsAuto (сент. 2026).',
})) console.log('  ✅ ram-promaster-city-2 — корневой узел (реанимация нейминга)')

// 2. Porsche Taycan Turbo GT (2024) — самый мощный серийный Porsche на момент
//    анонса. variant_of базового J1 (не фейслифта J1.2 — Turbo GT вышел в
//    2024, до фейслифта 2025).
if (addNode({
  id: 'porsche-taycan-turbo-gt', label: 'Taycan Turbo GT', fullName: 'Porsche Taycan Turbo GT',
  type: 'generation', year: 2024, brandId: 'porsche', brandName: 'Porsche',
  codeName: 'J1 Turbo GT', modelSlug: 'porsche-taycan',
  bodyType: 'sedan', segment: 'sports', zone: 'sports',
  hp: 1019, engineType: 'ev',
  note: 'Самый мощный серийный Porsche на момент анонса (2024). 777hp в обычном режиме, 1019hp (1034PS/760кВт) с Launch Control, 1092hp (1108PS) буст на 2с. С пакетом Weissach 0-100 за 2.2с. Attack Mode (аналог буста Formula E). Офиц. данные Porsche Newsroom.',
})) addEdge('pt-j1-to-turbogt', 'porsche-taycan', 'porsche-taycan-turbo-gt', 'variant_of', 0.8)

// 3. Porsche Taycan Turbo GT Manthey Kit (2026) — трек-пакет, рекорд
//    Нордшляйфе среди электромобилей. derived_from Turbo GT (не отдельный
//    трим от завода, а Manthey Racing пакет, благословлённый Porsche).
if (addNode({
  id: 'porsche-taycan-turbo-gt-manthey', label: 'Taycan Turbo GT Manthey Kit', fullName: 'Porsche Taycan Turbo GT с пакетом Manthey Kit',
  type: 'generation', year: 2026, brandId: 'porsche', brandName: 'Porsche',
  codeName: 'Manthey Kit', modelSlug: 'porsche-taycan',
  bodyType: 'sedan', segment: 'sports', zone: 'sports',
  hp: 1019, engineType: 'ev', isLimited: true,
  note: 'Трек-пакет Manthey Racing (не заводской трим). +27PS к базовому режиму (816PS вместо 789), пик Launch Control без изменений ~1019hp/1034PS, момент до 1270Нм. Полностью новая аэродинамика (диффузоры, антикрыло, юбки) — прижимная сила ×3 к базовой машине, до 740кг при 310км/ч. Тормоза 440/410мм, лёгкие 21" кованые диски. Рекорд Нордшляйфе среди электромобилей — 6:55.533 (Ларс Керн, 2026), отобран у BYD. Офиц. подтверждено Porsche Newsroom/racing.porsche.com.',
})) addEdge('pt-turbogt-to-manthey', 'porsche-taycan-turbo-gt', 'porsche-taycan-turbo-gt-manthey', 'derived_from', 0.7)

// 4. Dodge GLH (2028, производство) — реальный преемник Hornet, объявлен на
//    Investor Day 2026 (Ким Кунисис, CEO Ram/глава северо-амер. брендов
//    Stellantis, на записи). concept_to_production от концепта Hornet GLH
//    2024 года (уже был в графе как isLimited-концепт).
if (addNode({
  id: 'dodge-glh-2028', label: 'GLH', fullName: 'Dodge GLH',
  type: 'generation', year: 2028, brandId: 'dodge', brandName: 'Dodge',
  codeName: 'GLH', modelSlug: 'dodge-glh',
  bodyType: 'hatchback', segment: 'hot_hatch', zone: 'suv_compact',
  hp: 324, engineType: 'i4t',
  note: '"Goes Like Hell" возвращается как отдельная серийная модель — преемник Hornet (продажи которого прекращены после MY2025). Объявлено на Investor Day Stellantis (2026), подтверждено на записи Тимом Кунисисом (глава North American Brands/CEO Ram): "next-generation of Hornet, but the way we should have done it the first time". До 324 л.с., цель цены — ниже $39k. Платформа и точный двигатель Stellantis пока не детализированы официально (только заявленная мощность). Тип кузова описывается источниками то как "performance crossover", то как "muscle hatch" — форма ещё не показана. Источники: Stellantis Investor Day 2026, MoparInsiders, Gear Patrol, The Autopian.',
})) addEdge('dodge-hornetglh-to-glh2028', 'dodge-hornet-rt-glh', 'dodge-glh-2028', 'concept_to_production', 0.6)

// 5. BYD Dolphin G DM-i (2026) — PHEV-версия для Европы, отдельная от
//    чисто-электрического Dolphin. derived_from (та же ниша/сегмент, другая
//    силовая установка — как и было для Range Rover Electric от L460).
if (addNode({
  id: 'byd-dolphin-g-dmi', label: 'Dolphin G DM-i', fullName: 'BYD Dolphin G DM-i',
  type: 'generation', year: 2026, brandId: 'byd', brandName: 'BYD',
  codeName: 'DM-i', modelSlug: 'byd-dolphin-g',
  bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 212, engineType: 'phev', engineCC: 1500,
  note: 'PHEV-версия для Европы (не электрический Dolphin, отдельная линейка). 1.5Т I4 "Xiaoyun" + мотор, Blade-батарея 18.3кВтч (65 миль WLTP на электротяге) или 7.8кВтч (24.8 миль), общий запас хода 1000км, 0-100 за 8.3с. Офиц. подтверждено media.byd.com и bydukmedia.com, старт продаж в Европе — H2 2026.',
})) addEdge('byddolphin-to-g-dmi', 'byd-dolphin-ev', 'byd-dolphin-g-dmi', 'derived_from', 0.65)

// 6. Lotus Esprit revival (2028, Type 135) — возврат ДВС/гибрида после
//    EV-only периода бренда. evolves_into от последней классической Esprit
//    V8 (1996-2004) — тот же нейминг, 24-летний разрыв (аналог других
//    long-gap ревайвлов нейминга в этом графе).
if (addNode({
  id: 'lotus-esprit-revival', label: 'Esprit (Type 135)', fullName: 'Lotus Esprit (возрождение, Type 135)',
  type: 'generation', year: 2028, brandId: 'lotus', brandName: 'Lotus',
  codeName: 'Type 135', modelSlug: 'lotus-esprit',
  bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 986, engineType: 'v8h',
  note: 'Официально подтверждено CEO Lotus Group Цинфэн Фэном в рамках стратегии "Focus 2030" — возврат ДВС/гибрида после периода EV-only. Гибридный V8 ≥986 л.с. + 8-ст. DCT, ожидается опция гибридного V6. Производство в Европе (предположительно Хетел, Великобритания) с 2028. Кодовое имя Type 135, имя "Esprit" пока неофициальное (утечка), но факт возврата модели подтверждён самой Lotus.',
})) addEdge('lotusesprit-v8-to-revival', 'lotus-esprit-v8', 'lotus-esprit-revival', 'evolves_into', 0.5)

console.log('\n=== Пропущено (проверено — уже в графе, действий не требуется) ===')
;[
  ['Audi Nuvolari', 'ncs-audi-2028-audi-nuvolari — уже полноценный узел, подключен от audi-r8-typ4s'],
  ['Bentley Torcal (3 статьи)', 'bentley-torcal — уже узел, подключен от bentley-bentayga'],
  ['Aston Martin Valen', 'ncs-astonmartin-2028-martin-valen — уже полноценный узел с note'],
  ['Brabus Bodo Cabriolet', 'brabus-bodo-cabriolet — уже узел, подключен от brabus-bodo'],
  ['Denza Z Coupe', 'denza-z — уже существует, bodyType уже "coupe"'],
  ['Genesis Electrified GV70', 'gen-gv70-e — уже узел с 2023г., это просто MY2027-рефреш статья'],
  ['Ford F-150 Raptor', 'ford-f150-raptor — уже узел с 2017г.'],
  ['Aston Martin DB12 S Volante', 'am-db12-s-volante — уже узел, подключен от am-db12-volante'],
  ['Ram Power Wagon Cummins First', 'ram-power-wagon.note уже содержит этот факт (MY2027 Cummins-опция)'],
  ['Dodge Charger Super Bee Launch Edition', 'dodge-charger-super-bee(-4dr) — уже узлы, это лишь launch-edition той же модели'],
].forEach(([name, why]) => console.log(`  ⏭️  ${name}: ${why}`))

console.log('\n=== НЕ добавлено — только инсайдерские слухи, нет офиц. подтверждения бренда ===')
;[
  ['Chevrolet Camaro Sedan (2029)', 'широко перепечатано (CarExpert/Motor1/Carscoops/GM Authority), но GM НЕ подтвердил официально — источники сами пишут "unofficial reports and insider sources"'],
  ['Toyota MR2 "без единого шильдика Toyota" (2028)', 'Carscoops/MyProStreet со ссылкой на инсайдеров, нет офиц. слов Toyota/Gazoo Racing'],
].forEach(([name, why]) => console.log(`  ❌ ${name}: ${why}`))

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
