#!/usr/bin/env node
// Пакетное добавление моделей из скрапер-листа latest-cars.json (запрос "добавь весь"
// кандидатский список), проверенных через параллельное веб-исследование (7 агентов) +
// ручной кросс-чек на дубли/близкие года против graph.json.
'use strict'
const fs   = require('fs')
const path = require('path')

const GRAPH_PATH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

const addNode = (n) => {
  if (byId[n.id]) { console.log(`SKIP node (exists): ${n.id}`); return }
  g.nodes.push(n); byId[n.id] = n
  console.log(`ADD  node ${n.id} | ${n.label} | ${n.year}`)
}
const addEdge = (id, source, target, type, extra = {}) => {
  if (!byId[source] || !byId[target]) { console.log(`SKIP edge ${id} — missing node (${source} / ${target})`); return }
  if (g.edges.some(e => e.id === id)) { console.log(`SKIP edge (exists): ${id}`); return }
  g.edges.push({ id, source, target, type, strength: 0.85, ...extra })
  console.log(`ADD  edge ${id} (${type}): ${byId[source].label} -> ${byId[target].label}`)
}
const removeNode = (id) => {
  const before = g.nodes.length
  g.nodes = g.nodes.filter(n => n.id !== id)
  if (g.nodes.length < before) console.log(`DELETE node ${id} (дубль без рёбер)`)
  delete byId[id]
}

console.log('── 1. Porsche Panamera: правка мислейбла + реальное поколение 972 ──')
// porsche-panamera-972 на самом деле описывает 971.2 (2021, 630hp non-hybrid Turbo S) —
// реальное поколение 972 (нояб.2023/MY2024) вообще другое, дропнуло чистый Turbo без
// гибрида. Исправляем лейбл существующей ноды, добавляем настоящий 972 отдельно.
if (byId['porsche-panamera-972']) {
  byId['porsche-panamera-972'].label = 'Panamera 971.2'
  byId['porsche-panamera-972'].codeName = '971.2'
  console.log('FIX  porsche-panamera-972 label -> "Panamera 971.2" (было "971.2 / 972", год/hp совпадали только с 971.2)')
}
addNode({ id: 'porsche-panamera-972-mk3', label: 'Panamera 972', fullName: 'Porsche Panamera Turbo E-Hybrid (972)',
  type: 'generation', year: 2024, brandId: 'porsche', brandName: 'Porsche', codeName: '972',
  modelSlug: 'porsche-panamera-972', bodyType: 'sedan', segment: 'exec', zone: 'gt_coupe',
  hp: 670, engineType: 'v8h',
  note: 'Новое поколение (представлено нояб.2023, MY2024) — не фейслифт 971.2. Turbo E-Hybrid: V8T+электромотор, 670 л.с. суммарно, батарея 25.9 кВтч, ~91 км на электротяге.' })
addEdge('e-panamera-9712-972', 'porsche-panamera-972', 'porsche-panamera-972-mk3', 'evolves_into')
addNode({ id: 'porsche-panamera-972-turbos-ehybrid', label: 'Panamera Turbo S E-Hybrid', fullName: 'Porsche Panamera Turbo S E-Hybrid (972)',
  type: 'generation', year: 2024, brandId: 'porsche', brandName: 'Porsche', codeName: '972 Turbo S E-Hybrid',
  modelSlug: 'porsche-panamera-972', bodyType: 'sedan', segment: 'exec', zone: 'gt_coupe',
  hp: 771, engineType: 'v8h',
  note: '771 л.с. суммарно, 1000 Нм, 0-100 за 2.8с — топ-трим поколения 972.' })
addEdge('e-panamera972-turbos', 'porsche-panamera-972-mk3', 'porsche-panamera-972-turbos-ehybrid', 'variant_of', { strength: 0.9 })

console.log('\n── 2. Porsche Taycan: фейслифт MY2025 (938 л.с.) ──')
addNode({ id: 'porsche-taycan-facelift', label: 'Taycan Turbo S facelift', fullName: 'Porsche Taycan Turbo S (J1.2 facelift)',
  type: 'generation', year: 2025, brandId: 'porsche', brandName: 'Porsche', codeName: 'J1.2',
  modelSlug: 'porsche-taycan', bodyType: 'sedan', segment: 'sports', zone: 'sports',
  hp: 938, engineType: 'ev',
  note: 'Фейслифт того же поколения J1 (не новая платформа — J2 ожидается не раньше конца 2027). Новая батарея 105 кВтч, 938 л.с. у Turbo S против 761 л.с. на запуске 2019.' })
addEdge('e-taycan-facelift', 'porsche-taycan', 'porsche-taycan-facelift', 'facelifted_to')

console.log('\n── 3. Aston Martin Vantage S Roadster ──')
addNode({ id: 'am-vantage-s-roadster', label: 'Vantage S Roadster', fullName: 'Aston Martin Vantage S Roadster',
  type: 'generation', year: 2026, brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'Vantage S',
  modelSlug: 'astonmartin-vantage', bodyType: 'roadster', segment: 'sports', zone: 'sports',
  hp: 671, engineType: 'v8t',
  note: 'Возрождение исторического суффикса "S" (был у первого поколения V8 Vantage 2011-2018) на текущей (2018+) платформе. 671 л.с. против 656 у обычного Vantage. Roadster = кузов кабриолет.' })
addEdge('e-vantage2-s-roadster', 'am-vantage2', 'am-vantage-s-roadster', 'variant_of', { strength: 0.9 })

console.log('\n── 4. Land Rover Defender Dakar: концепт -> серия ──')
addNode({ id: 'landrover-defender-dakar', label: 'Defender Dakar', fullName: 'Land Rover Defender Dakar',
  type: 'generation', year: 2027, brandId: 'land-rover', brandName: 'Land Rover', codeName: 'Defender Dakar',
  modelSlug: 'land-rover-defender', bodyType: 'suv', segment: 'offroad', zone: 'offroad',
  hp: 626, engineType: 'v8t',
  note: 'Подтверждённая серийная версия концепта Dakar (2026) — доступна для резервирования с начала 2027. Основана на гоночном Defender D7X-R (победитель класса Dakar Rally 2026). 4.4T V8 без гоночных ограничений по регламенту, 20" колёса, дорожный выхлоп, 2+2 салон.' })
addEdge('e-dakar-concept-production', 'ncs-land-rover-2026-rover-defender-dakar-concept', 'landrover-defender-dakar', 'concept_to_production')

console.log('\n── 5. Maserati MCPura: реальное базовое поколение + переподключение Cielo ──')
addNode({ id: 'maserati-mcpura', label: 'MCPura', fullName: 'Maserati MCPura',
  type: 'generation', year: 2026, brandId: 'maserati', brandName: 'Maserati', codeName: 'MCPura',
  modelSlug: 'maserati-mcpura', bodyType: 'coupe', segment: 'supercar', zone: 'supercar',
  hp: 621, engineType: 'v6t',
  note: 'Ребрендинг/фейслифт MC20 (имя MC20 закрыто), Goodwood FoS июль 2025, MY2026. Тот же Nettuno V6 3.0Т (F1-технология pre-chamber), 621 л.с., карбоновый монокок. Обновлены бампера/аэродинамика/салон.' })
addEdge('e-mc20-mcpura', 'maserati-mc20', 'maserati-mcpura', 'facelifted_to')
// Cielo Tributo 1926 реально висел как variant_of MC20 напрямую — правильнее теперь
// от MCPura (это её актуальный ребрендинг), плюс это подтверждённый one-off — isLimited.
g.edges = g.edges.filter(e => e.id !== 'mase-mcpura-mc20-var')
console.log('DELETE edge mase-mcpura-mc20-var (переподключаем ниже к mcpura, не mc20)')
addEdge('mase-mcpura-cielo-var', 'maserati-mcpura', 'ncs-maserati-2026-mcpura-cielo-tributo-1926', 'variant_of', { strength: 0.9 })
if (byId['ncs-maserati-2026-mcpura-cielo-tributo-1926']) {
  byId['ncs-maserati-2026-mcpura-cielo-tributo-1926'].isLimited = true
  console.log('FIX  ncs-maserati-2026-mcpura-cielo-tributo-1926: isLimited=true (подтверждённый one-off, 1 экз., Fuoriserie)')
}

console.log('\n── 6. Ferrari Amalfi Spider + чистка дублей ──')
addNode({ id: 'ferrari-amalfi-spider', label: 'Amalfi Spider', fullName: 'Ferrari Amalfi Spider',
  type: 'generation', year: 2027, brandId: 'ferrari', brandName: 'Ferrari', codeName: 'F169M Spider',
  modelSlug: 'ferrari-amalfi', bodyType: 'convertible', segment: 'grand_tourer', zone: 'gt_coupe',
  hp: 631, engineType: 'v8t',
  note: 'Кабриолет-версия Amalfi (2025), тот же 3.9Т V8. Мягкий верх складывается за 13.5с на ходу до 60 км/ч.' })
addEdge('e-amalfi-spider', 'ferrari-amalfi', 'ferrari-amalfi-spider', 'variant_of', { strength: 0.9 })
// Осиротевшие ncs-дубли того же Amalfi (0 рёбер, живая нода ferrari-amalfi уже полностью
// смоделирована с ancestry на ferrari-roma-node) — безопасно удалить.
removeNode('ncs-ferrari-2025-amalfi-ferrari-amalfi')
removeNode('ncs-ferrari-2025-amalfi')

console.log('\n── 7. Czinger 21C Spyder ──')
addNode({ id: 'czinger-21c-spyder', label: '21C Spyder', fullName: 'Czinger 21C Spyder',
  type: 'generation', year: 2026, brandId: 'czinger', brandName: 'Czinger', codeName: '21C Spyder',
  modelSlug: 'czinger-21c', bodyType: 'targa', segment: 'hypercar', zone: 'hypercar',
  hp: 1250, engineType: 'v8h', isLimited: true,
  note: 'Первая открытая версия 21C, показана Monterey Car Week авг.2026. ~30 экземпляров (против 80 хардтопов), от $2.75М. Год модели официально не указан прессой — 2026 = год премьеры, поставки вероятно захватят 2027.' })
addEdge('e-21c-spyder', 'czinger-21c', 'czinger-21c-spyder', 'variant_of', { strength: 0.9 })

console.log('\n── 8. Lucid Gravity GT-S ──')
addNode({ id: 'lucid-gravity-gts', label: 'Gravity GT-S', fullName: 'Lucid Gravity GT-S',
  type: 'generation', year: 2027, brandId: 'lucid', brandName: 'Lucid', codeName: 'Gravity GT-S',
  modelSlug: 'lucid-gravity', bodyType: 'suv', segment: 'suv_large', zone: 'electric',
  hp: 1070, engineType: 'ev',
  note: 'Топ-трим линейки Gravity (Touring 560 -> Grand Touring 828 -> GT-S 1070 л.с.), объявлен авг.2026 на Monterey Car Week, $125,900, только США.' })
addEdge('e-gravity-gts', 'lucid-gravity', 'lucid-gravity-gts', 'variant_of', { strength: 0.9 })

console.log('\n── 9. Tesla Model Y L ──')
addNode({ id: 'tesla-model-y-l', label: 'Model Y L', fullName: 'Tesla Model Y L',
  type: 'generation', year: 2027, brandId: 'tesla', brandName: 'Tesla', codeName: 'Model Y L',
  modelSlug: 'tesla-model-y', bodyType: 'suv', segment: 'suv_mid', zone: 'electric',
  hp: 500, engineType: 'ev',
  note: 'Удлинённая (+150мм база) 6-местная версия Model Y на базе рефреша Juniper — сначала Китай (авг.2025), США с июля 2026 как MY2027, от $61,990. EPA 325 миль.' })
addEdge('e-modely-l', 'tesla-model-y-juniper', 'tesla-model-y-l', 'variant_of', { strength: 0.85 })

console.log('\n── 10. Rivian R1T/R1S Gen.2 (реальное поколение — не то, что просилось, но по факту то, что стоит за скраперным "2027") ──')
addNode({ id: 'rivian-r1t-gen2', label: 'R1T Gen.2', fullName: 'Rivian R1T Second Generation',
  type: 'generation', year: 2025, brandId: 'rivian', brandName: 'Rivian', codeName: 'Gen.2',
  modelSlug: 'rivian-r1t', bodyType: 'pickup', segment: 'pickup', zone: 'electric',
  hp: 850, engineType: 'ev',
  note: 'Анонсировано июнь 2024, MY2025. Новые собственные моторы, полный редизайн платформы/электроники. Trimы: Dual 533-665 л.с., Tri-Motor 850 л.с. (топ на запуске), Quad-Motor 1025 л.с. добавлен MY2026.' })
addEdge('e-r1t-gen2', 'rivian-r1t', 'rivian-r1t-gen2', 'evolves_into')
addNode({ id: 'rivian-r1s-gen2', label: 'R1S Gen.2', fullName: 'Rivian R1S Second Generation',
  type: 'generation', year: 2025, brandId: 'rivian', brandName: 'Rivian', codeName: 'Gen.2',
  modelSlug: 'rivian-r1s', bodyType: 'suv', segment: 'suv_large', zone: 'electric',
  hp: 850, engineType: 'ev',
  note: 'Тот же Gen.2 редизайн, что и R1T Gen.2 — новые моторы/платформа/электроника, MY2025.' })
addEdge('e-r1s-gen2', 'rivian-r1s', 'rivian-r1s-gen2', 'evolves_into')

console.log('\n── 11. Dodge Charger Super Bee Launch Edition — это САМИ существующие ноды, не дубль ──')
// Агент подтвердил: отдельного "широкого релиза" Super Bee ещё не было — Launch Edition
// это и есть первоначальное предложение. Существующие ноды уже 2027/600hp/I6 Hurricane TT
// (в точности совпадает) — помечаем isLimited, не создаём вторую ноду на то же самое.
for (const id of ['dodge-charger-super-bee', 'dodge-charger-super-bee-4dr']) {
  if (byId[id]) {
    byId[id].isLimited = true
    byId[id].note = (byId[id].note ? byId[id].note + ' ' : '') + 'Launch Edition — ограниченный первый релиз (эксклюзивные цвета/графика/колёса), других широких релизов Super Bee пока не анонсировано.'
    console.log(`FIX  ${id}: isLimited=true + note про Launch Edition`)
  }
}

console.log('\n── 12. Ram Power Wagon (2027) — пропускаем, дубль того же поколения (2019 DT платформа) ──')
if (byId['dodge-ram-power-wagon-05'] || true) {
  const rpw = g.nodes.find(n => n.label === 'Ram Power Wagon' && n.year === 2019)
  if (rpw) {
    rpw.note = (rpw.note ? rpw.note + ' ' : '') + 'MY2027: впервые доступен 6.7L Cummins HO дизель (430hp/1075 Нм) как опция, $89,560 с доставкой — та же платформа DT (2019), не новое поколение.'
    console.log('FIX  ' + rpw.id + ': note про дизельную опцию MY2027 (платформа та же, новую ноду не создаём)')
  }
}

console.log('\n── 13-15. Китайские EV: GAC Yue 7, Geely Galaxy Zhanjian 700, Geely Xingrui L Plus ──')
addNode({ id: 'gac-trumpchi-yue7', label: 'Trumpchi Yue 7', fullName: 'GAC Trumpchi Yue 7',
  type: 'generation', year: 2027, brandId: 'gac', brandName: 'GAC', codeName: 'Yue 7',
  modelSlug: 'gac-trumpchi-yue7', bodyType: 'suv', segment: 'offroad', zone: 'offroad',
  hp: 544, engineType: 'phev',
  note: 'Первый рамный хардкорный внедорожник у суббренда Trumpchi (не Aion). Показан май 2026, предзаказы с сент.2026. PHEV-система "Xingyuan GMC 3.0": 1.5T + электромоторы, суммарно до 400кВт (~544hp), 3 варианта батарей 28-46кВтч.' })

addNode({ id: 'geely-galaxy-zhanjian700', label: 'Galaxy Zhanjian 700', fullName: 'Geely Galaxy Zhanjian 700 (Cruiser 700)',
  type: 'generation', year: 2026, brandId: 'geely', brandName: 'Geely', codeName: 'Zhanjian 700',
  modelSlug: 'geely-galaxy-zhanjian700', bodyType: 'suv', segment: 'offroad', zone: 'offroad',
  hp: 1113, engineType: 'phev',
  note: '战舰700 — боксовый off-road SUV, отдельная модель линейки Galaxy (не переименование L7/TT). Концепт апр.2025, серия 2026, экспорт в UK подтверждён янв.2026. 3-моторный PHEV, суммарно ~830кВт/1113 л.с.' })

addNode({ id: 'geely-xingrui-l-plus', label: 'Xingrui L PLUS', fullName: 'Geely Xingrui L PLUS',
  type: 'generation', year: 2026, brandId: 'geely', brandName: 'Geely', codeName: 'Xingrui L PLUS',
  modelSlug: 'geely-xingrui', bodyType: 'sedan', segment: 'midsize_sed', zone: 'midsize_sed',
  hp: 254, engineType: 'phev',
  note: 'Не то же самое, что Xingyue L (разные иероглифы 瑞/越 — скрапер перепутал транслитерацию). Новое поколение седана Xingrui, показан июль 2026, продажи с сент-дек.2026. Доступен 1.5T/2.0T ДВС и 1.5T PHEV.' })

console.log('\n── 16-17. Aston Martin Vanquish (донор) + Brabus Bodo/Bodo Cabriolet ──')
addNode({ id: 'am-vanquish-2024', label: 'Vanquish', fullName: 'Aston Martin Vanquish',
  type: 'generation', year: 2024, brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'Vanquish',
  modelSlug: 'astonmartin-vanquish', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 824, engineType: 'v12t',
  note: 'Возрождение имени, показан сент.2024 (MY2025). 5.2Т V12, 824hp/835PS, 738 lb-ft, 0-60 за 3.2с, 214mph — самый мощный и быстрый Aston Martin в истории марки на момент выхода.' })
// Brabus Bodo — донор Vanquish (АНЕ Mercedes, впервые в истории Brabus), поэтому
// brandId остаётся astonmartin (донор), не отдельный "brabus" бренд — как RUF/Gemballa
// на Porsche-донорах, а не как Hennessey (у которого своя признанная линейка).
addNode({ id: 'brabus-bodo', label: 'Bodo', fullName: 'Brabus Bodo',
  type: 'generation', year: 2026, brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'Brabus Bodo',
  modelSlug: 'astonmartin-vanquish', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 986, engineType: 'v12t', isTuning: true, atelierName: 'Brabus', isLimited: true,
  note: 'Первый НЕ-Mercedes суперкар Brabus за 48 лет истории — назван в честь основателя Bodo Buschmann. Донор — Aston Martin Vanquish (сохранена только крыша, весь остальной кузов — бespoke карбон). Доработанный V12 5.2Т: 1000PS/986hp, 1200Нм. 77 экземпляров, от €1.077M (год = год основания Brabus).' })
addEdge('e-vanquish-bodo', 'am-vanquish-2024', 'brabus-bodo', 'derived_from')
addNode({ id: 'brabus-bodo-cabriolet', label: 'Bodo Cabriolet', fullName: 'Brabus Bodo Cabriolet',
  type: 'generation', year: 2027, brandId: 'astonmartin', brandName: 'Aston Martin', codeName: 'Brabus Bodo Cabriolet',
  modelSlug: 'astonmartin-vanquish', bodyType: 'convertible', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 986, engineType: 'v12t', isTuning: true, atelierName: 'Brabus', isLimited: true,
  note: 'Кабриолет-версия Bodo, дебют The Quail (Кармел) авг.2026, MY2027. Те же 986hp/1200Нм. 77 экземпляров.' })
addEdge('e-bodo-cabrio', 'brabus-bodo', 'brabus-bodo-cabriolet', 'variant_of', { strength: 0.9 })

console.log(`\nИтого: ${g.nodes.length} узлов, ${g.edges.length} рёбер`)
fs.writeFileSync(GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8')
console.log('Done.')
