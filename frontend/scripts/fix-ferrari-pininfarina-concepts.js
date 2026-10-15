#!/usr/bin/env node
// Pininfarina × Ferrari — знаковые one-off концепты/спецверсии (аналог
// Zagato). Подтверждено веб-поиском (Wikipedia/Hagerty/conceptcarz/Classic
// Driver/carrozzieri-italiani/Ferrari.com, 2026-08-31). Отобраны только те,
// где есть чёткая, уверенная связь с СУЩЕСТВУЮЩИМ узлом графа — Pinin (1980,
// 4-дверный седан) и ряд более редких/спорных концептов (512 S Berlinetta
// Speciale, 250 P5, CR25) сознательно пропущены — либо база не подтверждена
// в графе, либо сам источник агента отмечает лишь среднюю уверенность.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))

console.log('=== 1. Modulo (1970) — корневой узел (база 512 S — гоночный прототип, не в графе) ===')
const modulo = {
  id: 'ferrari-modulo', label: 'Modulo', fullName: 'Ferrari Modulo',
  type: 'generation', year: 1970, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-modulo', bodyType: 'concept', segment: 'concept', zone: 'concept',
  hp: 550, engineType: 'v12', isConcept: true,
  note: 'Концепт Pininfarina (Паоло Мартин) — Женева, март 1970. На шасси гоночного прототипа 512 S (не в графе — Group 5 прототип, никогда не был дорожной моделью), 5.0Л V12, 550hp. 44 года статичный шоу-кар без ходовой части — куплен коллекционером Джеймсом Гликенхаусом в 2014-м, восстановлен до ходового состояния, впервые проехал в июне 2018-го.',
}
graph.nodes.push(modulo)
console.log('  ✅ добавлен Modulo (без входящего ребра — донор-прототип 512 S отсутствует в графе)')

console.log('\n=== 2. Dino Berlinetta Speciale (1965) — concept_to_production → Dino 246 ===')
const dinoSpeciale = {
  id: 'ferrari-dino-berlinetta-speciale', label: 'Dino Berlinetta Speciale', fullName: 'Ferrari Dino Berlinetta Speciale',
  type: 'generation', year: 1965, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-dino-berlinetta-speciale', bodyType: 'concept', segment: 'concept', zone: 'concept',
  hp: 0, engineType: 'other', isConcept: true,
  note: 'Концепт Pininfarina (Альдо Брованелли) — Парижский салон 1965, на гоночном шасси Dino №0840, БЕЗ двигателя/трансмиссии (чистый дизайн-макет). Именно этот концепт убедил Энцо Феррари запустить в серию среднемоторный Dino 206/246 GT — прямой концептуальный предок производственной линейки.',
}
graph.nodes.push(dinoSpeciale)
graph.edges.push({ id: 'ferrari-dinospeciale-to-dino246', source: 'ferrari-dino-berlinetta-speciale', target: 'ferrari-dino246', type: 'concept_to_production', strength: 0.85 })
console.log('  ✅ добавлен Dino Berlinetta Speciale, --[concept_to_production]--> ferrari-dino246')

console.log('\n=== 3. Rossa (2000) — derived_from 550 Maranello ===')
const rossa = {
  id: 'ferrari-rossa', label: 'Rossa', fullName: 'Ferrari Rossa by Pininfarina',
  type: 'generation', year: 2000, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-rossa', bodyType: 'concept', segment: 'concept', zone: 'concept',
  hp: 485, engineType: 'v12', isConcept: true,
  note: 'Концепт Pininfarina (Кен Окуяма) к 70-летию ателье — Парижский салон 2000. На базе 550 Maranello (тот же 5.5Л V12, 485hp), бар× кузов без крыши, дань уважения 250 Testa Rossa 1957г. НЕ путать с отдельной серийной "550 Barchetta Pininfarina" (448 экз., представлена там же и тогда же, но другая машина с обычным тентом).',
}
graph.nodes.push(rossa)
graph.edges.push({ id: 'ferrari-550-to-rossa', source: 'ferrari-550', target: 'ferrari-rossa', type: 'derived_from', strength: 0.75 })
console.log('  ✅ добавлен Rossa, ferrari-550 --[derived_from]--> ferrari-rossa')

console.log('\n=== 4. Sergio (2013/2015, 6 экз.) — derived_from 458 Spider ===')
const sergio = {
  id: 'ferrari-sergio', label: 'Sergio', fullName: 'Ferrari Sergio by Pininfarina',
  type: 'generation', year: 2013, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-sergio', bodyType: 'roadster', segment: 'supercar', zone: 'open_top',
  hp: 562, engineType: 'v8', isLimited: true,
  note: 'Дань памяти Серджо Пининфарине (ум. июль 2012) — концепт Женева-2013, серийная версия 2015г. (6 экземпляров, ~$3М каждый). На механике 458 Spider (4.5Л V8, 562hp) — для омологации добавлены лобовое стекло, съёмная жёсткая крыша, обычные двери со стеклоподъёмниками.',
}
graph.nodes.push(sergio)
graph.edges.push({ id: 'ferrari-458spider-to-sergio', source: 'ferrari-458-spider', target: 'ferrari-sergio', type: 'derived_from', strength: 0.8 })
console.log('  ✅ добавлен Sergio, ferrari-458-spider --[derived_from]--> ferrari-sergio')

console.log('\n=== 5. P4/5 by Pininfarina (2006) — derived_from Enzo (рестайлинг, тот же VIN) ===')
const p45 = {
  id: 'ferrari-p4-5', label: 'P4/5 by Pininfarina', fullName: 'Ferrari P4/5 by Pininfarina',
  type: 'generation', year: 2006, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-p4-5', bodyType: 'coupe', segment: 'hypercar', zone: 'hypercar',
  hp: 652, engineType: 'v12', isLimited: true,
  note: 'Заказ коллекционера Джеймса Гликенхауса (позже он же купил Modulo) — Пебл-Бич, 18 авг. 2006. Официально — рестайлинг конкретного экземпляра Enzo (тот же VIN, двигатель, трансмиссия), НЕ отдельная гомологированная модель, но с официального одобрения Ferrari (Лука ди Монтедземоло) носит имя "Ferrari P4/5 by Pininfarina". Новый угле-кузов (200+ уникальных деталей), вес снижен на ~270кг, F140 B V12 652hp.',
}
graph.nodes.push(p45)
graph.edges.push({ id: 'ferrari-enzo-to-p45', source: 'ferrari-enzo', target: 'ferrari-p4-5', type: 'derived_from', strength: 0.7 })
console.log('  ✅ добавлен P4/5, ferrari-enzo --[derived_from]--> ferrari-p4-5')

console.log('\n=== 6. 456 GT Venice (сер. 1990х, 6-7 экз.) — derived_from 456 GT ===')
const venice = {
  id: 'ferrari-456-venice', label: '456 GT Venice', fullName: 'Ferrari 456 GT Venice',
  type: 'generation', year: 1995, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-456-venice', bodyType: 'wagon', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 442, engineType: 'v12', isLimited: true,
  note: 'Кузов "универсал-купе" (shooting brake) от Pininfarina по заказу принца Джефри Болкиа (Бруней) — на базе 456 GT (5.5Л V12). По разным источникам 6-7 экземпляров, большинство — брунейской королевской семье, один продан в Великобританию.',
}
graph.nodes.push(venice)
graph.edges.push({ id: 'ferrari-456gt-to-venice', source: 'ferrari-456gt', target: 'ferrari-456-venice', type: 'derived_from', strength: 0.8 })
console.log('  ✅ добавлен 456 GT Venice, ferrari-456gt --[derived_from]--> ferrari-456-venice')

console.log('\n=== 7. 612 Kappa (2006) — derived_from 612 Scaglietti ===')
const kappa = {
  id: 'ferrari-612-kappa', label: '612 Kappa', fullName: 'Ferrari 612 Kappa',
  type: 'generation', year: 2006, brandId: 'ferrari', brandName: 'Ferrari',
  modelSlug: 'ferrari-612-kappa', bodyType: 'coupe', segment: 'gt_coupe', zone: 'gt_coupe',
  hp: 540, engineType: 'v12', isLimited: true,
  note: 'One-off Pininfarina для американского коллекционера Питера Каликова — дебют на Villa d\'Este 2006. Сохраняет конструкцию 612 Scaglietti (5.7Л V12, 540hp), но с эксклюзивной алюминиевой отделкой кузова ручной работы.',
}
graph.nodes.push(kappa)
graph.edges.push({ id: 'ferrari-612-to-kappa', source: 'ferrari-612', target: 'ferrari-612-kappa', type: 'derived_from', strength: 0.8 })
console.log('  ✅ добавлен 612 Kappa, ferrari-612 --[derived_from]--> ferrari-612-kappa')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
