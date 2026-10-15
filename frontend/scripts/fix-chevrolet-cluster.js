#!/usr/bin/env node
// Большая доливка кластера Chevrolet (Impala/Malibu/Blazer/Camaro Z28) —
// по запросу "тут как-то мало всего". Обе флагманские седан-линейки
// (Impala, Malibu) были почти пустыми, ПЛЮС у обеих нашлась ошибка в
// нумерации поколений уже существующих узлов (см. ниже) — не только
// пробелы, но и баги в данных, которые были в графе раньше.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

function addNode(node) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует:', node.id); return false }
  graph.nodes.push(node); byId.set(node.id, node); return true
}
function addEdge(id, source, target, type, strength) {
  graph.edges.push({ id, source, target, type, strength })
}
function renameNode(oldId, newId) {
  const n = byId.get(oldId)
  n.id = newId
  byId.delete(oldId); byId.set(newId, n)
  let edgeCount = 0
  graph.edges.forEach(e => {
    if (e.source === oldId) { e.source = newId; edgeCount++ }
    if (e.target === oldId) { e.target = newId; edgeCount++ }
  })
  console.log(`  🔧 переименован узел ${oldId} → ${newId} (обновлено рёбер: ${edgeCount})`)
  return n
}

console.log('=== IMPALA — было 2 узла (Gen.1, ошибочно "Gen.9"=2014) вместо 10 ===')
// Баг нумерации: возрождение 1994-96 SS (стандартно Gen.7) не учитывалось
// при подсчёте, из-за чего 2006г. называли "Gen.8", а 2014г. — "Gen.9".
// По стандартной нумерации: Gen.9=2006-13, Gen.10=2014-20.
const impala10 = renameNode('chev-impala-9', 'chev-impala-10')
impala10.label = 'Impala Gen.10'
impala10.note = 'Финальное поколение (2014-2020) — архитектура GM Epsilon II (E2XX), общая с Cadillac XTS/Buick LaCrosse; официально снова "полноразмерный" класс. 3.6L LFX V6, 305hp SAE. Последний экземпляр сошёл с конвейера 27 февраля 2020г. на заводе Detroit-Hamtramck (который затем переоборудовали под электромобили).'
graph.edges = graph.edges.filter(e => e.id !== 'e-chev-imp1-9')

addNode({ id: 'chev-impala-2', label: 'Impala Gen.2', year: 1959, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 335, engineType: 'v8', note: '348ci Tri-Power V8, 335hp (позднее изменение 1959г., степень сжатия поднята до 11.25:1). Impala стала отдельной серией (не топ-трим Bel Air). ~490 тыс. продано.' })
addNode({ id: 'chev-impala-3', label: 'Impala Gen.3', year: 1961, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 425, engineType: 'v8', note: '409ci dual-quad V8, 425hp (1963) — та самая "409", обессмерченная Beach Boys. Опция SS дебютировала в 1961г.' })
addNode({ id: 'chev-impala-4', label: 'Impala Gen.4', year: 1965, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 425, engineType: 'v8', note: '427ci L72 V8, 425hp (1966-69). Новый плавный "coke-bottle" силуэт. 1965г. — более 1 000 000 продаж за год, до сих пор рекорд для одной модели в истории отрасли.' })
addNode({ id: 'chev-impala-5', label: 'Impala Gen.5', year: 1971, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 365, engineType: 'v8', note: '454ci LS5 V8, 365hp (gross, 1971) — самая крупная Impala за всю историю. 1975г. — последний год полноразмерного кабриолета Chevrolet.' })
addNode({ id: 'chev-impala-6', label: 'Impala Gen.6', year: 1977, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 170, engineType: 'v8', note: '350ci V8, 170hp (топ-опция). Программа GM "Great Downsizing" — минус ~270кг и ~25см длины. Последняя Impala перед 9-летним переименованием в Caprice (1986-93 — имя Impala не выпускалось).' })
addNode({ id: 'chev-impala-7', label: 'Impala Gen.7', year: 1994, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 260, engineType: 'v8', note: 'LT1 5.7L V8, 260hp (net). Возрождение только в версии SS, на базе Caprice Classic — последний классический RWD полноразмерный седан GM того поколения кузова. Выпуск всего 3 года, до переоснащения завода в Арлингтоне.' })
addNode({ id: 'chev-impala-8', label: 'Impala Gen.8', year: 2000, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 240, engineType: 'v6t', note: 'Смена архитектуры на передний привод (GM W-body/GMX210) — впервые в истории имени. 3.8L компрессорный V6, 240hp (SS, 2004-05). При запуске V8 не предлагался.' })
addNode({ id: 'chev-impala-9', label: 'Impala Gen.9', year: 2006, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-impala', familyKey: 'chev-impala', type: 'generation', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 303, engineType: 'v8', note: 'Полностью новый кузов/платформа (GMX211), тот же класс W-body. LS4 5.3L V8 (поперечно установлен), 303hp (SS, 2006-09) — последний передне-приводный американский седан с V8 в продаже в США. С 2014г. распродавался флотам как "Impala Limited".' })

;['1-2','2-3','3-4','4-5','5-6','6-7','7-8','8-9','9-10'].forEach(pair => {
  const [a, b] = pair.split('-')
  addEdge(`e-chev-imp${a}-${b}`, `chev-impala-${a}`, `chev-impala-${b}`, 'evolves_into', 0.85)
})
console.log('  ✅ добавлены Gen.2-9, восстановлена полная цепочка 1→2→...→10')

console.log('\n=== MALIBU — был 1 узел ("Gen.7"=2004, на деле Gen.6) ===')
const malibu6 = renameNode('chevy-malibu-7', 'chev-malibu-6')
malibu6.label = 'Malibu Gen.6'
malibu6.note = '2.2L Ecotec I4, 145hp (база). Платформа GM Epsilon (GMX380) — общая с Saab 9-3 и Opel Vectra C. Ранее в графе ошибочно значилась как "Gen.7" — по стандартной нумерации (Wikipedia и др.) это 6-е поколение.'

addNode({ id: 'chev-malibu-1', label: 'Malibu Gen.1', year: 1964, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 120, engineType: 'i6', note: '194ci I6, 120hp (база). Изначально — топ-трим Chevrolet Chevelle, не отдельная модель (историч. корректное имя — "Chevelle Malibu"); большинство энциклопедий тем не менее ведут отсчёт поколений Malibu именно отсюда. SS 396 — опция с 1965г.' })
addNode({ id: 'chev-malibu-2', label: 'Malibu Gen.2', year: 1968, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 140, engineType: 'i6', note: '230ci I6, 140hp (база). Полный рестайлинг, "coke-bottle" силуэт. Пик эры маслкаров (опционально SS 454, не базовая цифра).' })
addNode({ id: 'chev-malibu-3', label: 'Malibu Gen.3', year: 1973, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 110, engineType: 'i6', note: '250ci I6 / 307ci V8, 110hp (база). Редизайн под новые федеральные нормы безопасности при опрокидывании ("Colonnade" — без настоящего хардтопа). Мощность резко падает из-за норм по выбросам.' })
addNode({ id: 'chev-malibu-4', label: 'Malibu Gen.4', year: 1978, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 95, engineType: 'v6', note: '200ci V6, 95hp (база). Malibu окончательно отделяется от имени Chevelle. Радикальное даунсайзинг-поколение GM конца 70-х. Снята с производства после 1983г. — далее 13-летний перерыв без Malibu (1984-96).' })
addNode({ id: 'chev-malibu-5', label: 'Malibu Gen.5', year: 1997, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 150, engineType: 'i4', note: '2.4L I4, 150hp (база). Возрождение имени после 13-летнего перерыва — и смена архитектуры на передний привод (платформа P-90/расширенная N-body).' })
addNode({ id: 'chev-malibu-7', label: 'Malibu Gen.7', year: 2008, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 169, engineType: 'i4', note: '2.4L Ecotec I4, 169hp (база; топ-трим V6 LTZ — 252hp). Полный редизайн (не рестайлинг) — увеличенная платформа GM Epsilon II (GMX386).' })
addNode({ id: 'chev-malibu-8', label: 'Malibu Gen.8', year: 2013, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 197, engineType: 'i4', note: '2.5L I4, 197hp (база). Платформа Epsilon II SWB (укороченная). V6 полностью убран из линейки в пользу турбо-I4.' })
addNode({ id: 'chev-malibu-9', label: 'Malibu Gen.9', year: 2016, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-malibu', familyKey: 'chev-malibu', type: 'generation', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 160, engineType: 'i4t', note: '1.5T I4, 160hp (база). Финальное поколение — платформа GM E2XX. Снята с производства после MY2024 — GM уходит из сегмента седанов.' })

;['1-2','2-3','3-4'].forEach(pair => {
  const [a, b] = pair.split('-')
  addEdge(`e-chev-mal${a}-${b}`, `chev-malibu-${a}`, `chev-malibu-${b}`, 'evolves_into', 0.85)
})
;['5-6','6-7','7-8','8-9'].forEach(pair => {
  const [a, b] = pair.split('-')
  addEdge(`e-chev-mal${a}-${b}`, `chev-malibu-${a}`, `chev-malibu-${b}`, 'evolves_into', 0.85)
})
console.log('  ✅ добавлены Gen.1-5,7-9, переименован Gen.6, восстановлена цепочка (с разрывом 1984-96)')

console.log('\n=== BLAZER — вставлен пропущенный S-10 Blazer между K5 и TrailBlazer ===')
addNode({ id: 'chev-s10-blazer-1', label: 'S-10 Blazer Gen.1', year: 1983, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-s10-blazer', familyKey: 'chev-blazer', type: 'generation', bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 110, engineType: 'v6', note: 'Компактный внедорожник на платформе пикапа S-10 — младший брат полноразмерного K5 Blazer (сосуществовали параллельно, не сменяют друг друга). 2.8L V6, 110hp SAE net. Только 2-дверный до 1991г.' })
addNode({ id: 'chev-s10-blazer-2', label: 'Blazer Gen.2 (S-10)', year: 1995, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-s10-blazer-2', familyKey: 'chev-blazer', type: 'generation', bodyType: 'suv', segment: 'compact_suv', zone: 'suv_compact',
  hp: 200, engineType: 'v6', note: 'Редизайн, приставка "S-10" убрана из названия (K5 в этом же 1995г. стал Tahoe, освободив имя). 4.3L Vortec V6, 200hp. Прекращён в 2005г. — трим "TrailBlazer" (с 1999г.) к тому моменту уже отпочковался в отдельную модель (2002г.), 3 года они продавались параллельно.' })
addEdge('e-chev-k5-s10', 'chev-k5-blazer', 'chev-s10-blazer-1', 'inspired', 0.6)
addEdge('e-chev-s10-1-2', 'chev-s10-blazer-1', 'chev-s10-blazer-2', 'evolves_into', 0.85)
addEdge('e-chev-s10-2-trail', 'chev-s10-blazer-2', 'chev-trailblazer', 'evolves_into', 0.7)
console.log('  ✅ K5 --[inspired]--> S-10 Gen.1 --[evolves_into]--> Gen.2 --[evolves_into]--> TrailBlazer')

console.log('\n=== CAMARO — добавлен Z/28 (2014, Gen.5) ===')
addNode({ id: 'chevy-camaro-gen5-z28', label: 'Camaro Z/28', fullName: 'Chevrolet Camaro Z/28 (2014)',
  year: 2014, brandId: 'chevrolet', brandName: 'Chevrolet', codeName: 'Gen5 Z/28', modelSlug: 'camaro-z28',
  type: 'generation', bodyType: 'coupe', segment: 'track', zone: 'track', hp: 505, engineType: 'v8', isLimited: true,
  note: 'Экстремальный трек-спецвыпуск на базе Gen.5 — не топовый по мощности (уступает ZL1), но самый быстрый на круге. LS7 7.0L V8 (от Corvette Z06), 505hp/481lb-ft, только 6-МКПП. На 100фунтов легче SS и на 300 легче ZL1 (без кондиционера в базе, урезаны шумоизоляция/динамики), демпферы Multimatic DSSV (впервые на серийном авто), керамические тормоза. ~$75000. Имя Z/28 существовало как периодический трим-пакет ещё с 1967г. (омологация Trans-Am), но именно эта версия — единственная, заслуживающая отдельного узла.' })
addEdge('e-camaro5-z28', 'chevy-camaro-gen5', 'chevy-camaro-gen5-z28', 'variant_of', 0.85)
console.log('  ✅ Camaro Gen.5 --[variant_of]--> Z/28')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
