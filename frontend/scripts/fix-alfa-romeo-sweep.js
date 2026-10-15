#!/usr/bin/env node
// Полная доливка Alfa Romeo: было всего 23 узла на весь бренд. Плюс баг —
// alfa-155 имел ДВА сильных evolves_into одновременно (в 156 и в 147),
// хотя 147 — это компакт-хэтч, наследующий совсем другой линейке (33 →
// 145/146 → 147), а не седану 155/156.
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

console.log('=== БАГ: удаляем ложное 155→147 (147 не наследует от 155) ===')
const nBefore = graph.edges.length
graph.edges = graph.edges.filter(e => e.id !== 'e-alfa-155-147')
console.log(`  🗑️  удалено рёбер: ${nBefore - graph.edges.length}`)

console.log('\n=== Классика: Giulietta → Alfasud/Alfetta → 33/90/75 → 145-146 → 159/166 ===')

addNode({ id: 'alfa-giulietta-1954', label: 'Giulietta', fullName: 'Alfa Romeo Giulietta (1954)',
  type: 'generation', year: 1954, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-giulietta-1954', bodyType: 'coupe', segment: 'sports', zone: 'sports',
  hp: 80, engineType: 'i4', engineCC: 1290,
  note: 'Первая по-настоящему массовая модель Alfa (177690 экз.) — частично профинансирована через публичную облигационную лотерею, вывела фирму из почти-банкротного состояния. Первый серийный алюминиевый DOHC-мотор Alfa 1.3L ("Twin Cam"). Кузова: Berlina (седан), Sprint-купе (Bertone), Spider (Pininfarina); топ-версия Sprint Zagato/SZ — 118PS, всего 217 экз. Заложила формулу "компактная спортивная Alfa", которую позже унаследовала Giulia.' })
addEdge('e-alfa-giulietta-giulia', 'alfa-giulietta-1954', 'alfa-giulia-105', 'evolves_into', 0.85)

addNode({ id: 'alfa-alfasud', label: 'Alfasud', fullName: 'Alfa Romeo Alfasud',
  type: 'generation', year: 1971, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-alfasud', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 63, engineType: 'flat4', engineCC: 1186,
  note: 'Самая массовая модель в истории Alfa — 893719 седанов + 121434 купе Sprint. Оппозитный "боксёр" (инж. Рудольф Груска), 1.2-1.5L, топ-версии ti/Sprint до 105PS. Построена на новом заводе в Помильяно-д\'Арко (Неаполь) — промышленно-политический проект итал. госхолдинга IRI для юга страны, отсюда и имя. Дизайн Джуджаро, отличная управляемость благодаря низкому центру тяжести боксёра — но переработанная сталь низкого качества и приморская влажность дали Alfa худшую в истории репутацию по коррозии.' })

addNode({ id: 'alfa-alfetta-1972', label: 'Alfetta', fullName: 'Alfa Romeo Alfetta',
  type: 'generation', year: 1972, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-alfetta-1972', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 122, engineType: 'i4', engineCC: 1800,
  note: 'Ввела трансэксл-компоновку Alfa — сцепление/КПП/дифференциал единым блоком сзади (с De Dion подвеской) для развесовки ближе к 50/50. 1.8L I4, 122PS на старте; позже до 2.0L/130PS. Купе Alfetta GT на той же платформе быстро отделилось в собственный нейминг — стало "GTV" к 1976г., полностью сбросив имя "Alfetta" к 1980г. (GTV6 с V6-мотором продержался до 1987г.) — та же инженерия, но формально другая линейка уже не связанная напрямую с седаном.' })
addEdge('e-alfa-alfetta-90', 'alfa-alfetta-1972', 'alfa-90-1984', 'evolves_into', 0.8)
addEdge('e-alfa-alfetta-75', 'alfa-alfetta-1972', 'alfa-75-milano', 'evolves_into', 0.7)

addNode({ id: 'alfa-90-1984', label: '90', fullName: 'Alfa Romeo 90',
  type: 'generation', year: 1984, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-90-1984', bodyType: 'sedan', segment: 'midsize', zone: 'midsize_sed',
  hp: 156, engineType: 'v6', engineCC: 2500,
  note: 'Малозаметная модель — консервативный дизайн Bertone сложно отличим по тримам, не унаследовала спортивной репутации Alfetta, быстро сменена 164 (1987). Шасси/трансэксл от Alfetta, моторы общие с Alfa 6. Топ-версия Quadrifoglio Oro — 2.5 V6, 156PS. Всего 56428 экз. за неполные 4 года.' })
addEdge('e-alfa-90-164', 'alfa-90-1984', 'alfa-164', 'evolves_into', 0.75)

addNode({ id: 'alfa-75-milano', label: '75 / Milano', fullName: 'Alfa Romeo 75 (Milano в Северной Америке)',
  type: 'generation', year: 1985, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-75-milano', bodyType: 'sedan', segment: 'sports', zone: 'sports',
  hp: 155, engineType: 'i4t', engineCC: 1800,
  note: 'Последний заднеприводный седан Alfa (трансэксл-шасси Alfetta) перед переходом на передний привод. Имя "75" — в честь 75-летия марки; в Северной Америке (1987-89, только V6) продавалась как "Milano". 1.8 Turbo — 155PS топ-версия массовой линейки (были и V6 2.5-3.0, дизели).' })

addNode({ id: 'alfa-75-turbo-evo', label: '75 Turbo Evoluzione', fullName: 'Alfa Romeo 75 Turbo Evoluzione',
  type: 'generation', year: 1987, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-75-turbo-evo', bodyType: 'sedan', segment: 'sports', zone: 'sports',
  hp: 155, engineType: 'i4t', engineCC: 1800, isLimited: true,
  note: 'Гомологационная спецверсия Group A — ровно 500 экз., весна 1987г. Дорожная версия — те же 155PS 1.8 Turbo, но заводская гоночная подготовка Alfa Corse выжимала ~280hp. Кузов "75 IMSA" построен по амер. регламенту IMSA Endurance — но вопреки распространённому мифу в самой IMSA никогда не выступал: вместо этого дважды подряд (1988, 1989) выиграл итальянское ралли Giro d\'Italia automobilistico с Риккардо Патрезе и Мики Бьязионом за рулём.' })
addEdge('e-alfa-75-evo', 'alfa-75-milano', 'alfa-75-turbo-evo', 'variant_of', 0.8)

console.log('\n=== Хэтч-линейка: 33 (не Stradale!) → 145/146 → 147 (настоящий предок, не 155) ===')
addNode({ id: 'alfa-33-1983', label: '33', fullName: 'Alfa Romeo 33 (1983, серийный хэтчбек)',
  type: 'generation', year: 1983, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-33-1983', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 105, engineType: 'flat4', engineCC: 1500,
  note: 'НЕ путать с "33 Stradale" (1967) — это массовый серийный хэтч/универсал (~1 млн экз.), продолжение боксёрной архитектуры Alfasud. Топ 1.7 16V Cloverleaf/QV — до 137PS. С 1984г. — версия 4x4 (частичный привод), с 1992г. — постоянный полный привод "Q4". 33 4x4 1.5 омологирована в Group A для ралли в апреле 1985г., выступала в итальянских ралли-чемпионатах до 1990-х.' })
addEdge('e-alfa-alfasud-33', 'alfa-alfasud', 'alfa-33-1983', 'evolves_into', 0.85)

addNode({ id: 'alfa-145-146', label: '145 / 146', fullName: 'Alfa Romeo 145 (3-дв.) / 146 (5-дв.)',
  type: 'generation', year: 1994, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-145-146', bodyType: 'hatchback', segment: 'compact', zone: 'hatchback',
  hp: 150, engineType: 'i4', engineCC: 2000,
  note: 'Прямой предок 147 (не 155 — то ошибочное ребро в графе исправлено). Платформа Fiat Group "Tipo Due" (общая с Fiat Tipo/Bravo/Brava). На старте — боксёрные моторы Alfasud (последние боксёры в истории Alfa!), с 1996г. — рядные Twin Spark. Топ-версия 145 Quadrifoglio / 146 Ti (Cloverleaf на рынке UK) — 2.0 Twin Spark, 150-155PS.' })
addEdge('e-alfa-33-145146', 'alfa-33-1983', 'alfa-145-146', 'evolves_into', 0.85)
addEdge('e-alfa-145146-147', 'alfa-145-146', 'alfa-romeo-147', 'evolves_into', 0.9)

console.log('\n=== Седан-флагманы: 156→159 (реальный преемник, с оговоркой к Giulia), 164→166 ===')
addNode({ id: 'alfa-159', label: '159', fullName: 'Alfa Romeo 159',
  type: 'generation', year: 2005, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-159', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 260, engineType: 'v6', engineCC: 3200,
  note: 'Прямой преемник 156 (представлен как таковой на Женевском автосалоне 2005г.), с версией универсал Sportwagon (2006). Платформа GM/Fiat "Premium" (разработана в основном инженерами Saab в рамках альянса Fiat-GM) — в серию, вопреки расхожему мнению, пошла ТОЛЬКО с Alfa Brera/Spider (939); ни Cadillac, ни Saab на неё так и не попали (проекты свёрнуты/перенесены на другую архитектуру). Топ — 3.2 V6 JTS, 260hp. Снята с производства в 2011г. БЕЗ прямого преемника — планировавшийся флагман "169" отменён, следующий седан такого класса (Giulia) появился лишь в 2016г.' })
addEdge('e-alfa-156-159', 'alfa-romeo-156', 'alfa-159', 'evolves_into', 0.85)
addEdge('e-alfa-159-giulia', 'alfa-159', 'alfa-romeo-giulia', 'inspired', 0.5)

addNode({ id: 'alfa-166-1998', label: '166', fullName: 'Alfa Romeo 166',
  type: 'generation', year: 1998, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-166-1998', bodyType: 'sedan', segment: 'exec', zone: 'flagship_sed',
  hp: 226, engineType: 'v6', engineCC: 3000,
  note: 'Прямой флагманский преемник 164 (кодовое имя 936 — в одном ряду с 932=156, 937=147 в нумерации Alfa). Дизайн Вальтера де Сильвы. До рестайлинга (2003) топ — 3.0 V6, 226PS; после — новый 3.2 V6, 240PS (максимум за всю историю модели). Снята с производства в 2007г. тоже без прямого преемника (тот же отменённый проект "169"). После закрытия права на платформу/оснастку выкуплены китайской GAC Group — легли в основу ранних седанов GAC/Trumpchi.' })
addEdge('e-alfa-164-166', 'alfa-164', 'alfa-166-1998', 'evolves_into', 0.9)

console.log('\n=== Гоночное наследие ===')
addNode({ id: 'alfa-158-159-f1', label: 'Alfetta 158/159', fullName: 'Alfa Romeo Alfetta 158/159 (Формула 1)',
  type: 'generation', year: 1950, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-158-159-f1', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 425, engineType: 'i8t', engineCC: 1500, isRacing: true,
  note: 'Доминация в первые 2 сезона чемпионата мира Ф1. Наддувная рядная "восьмёрка" 1.5L: ~350hp (1950, модель 158) → 425hp @ 9300rpm (1951, эволюция 159, наддув до ~42psi). 1950 — Джузеппе Фарина выиграл самый первый чемпионский титул Ф1 на 158, Alfa заняла весь подиум чемпионата (Фарина/Фанджо/Фаджоли). 1951 — Хуан-Мануэль Фанхио выиграл титул на доработанной 159 (подвеска De Dion, облегчённая рама). После сезона-1951 Alfa снялась с Гран-при — непобеждённой заводской командой оба чемпионских года.' })

addNode({ id: 'alfa-tipo33-racing', label: 'Tipo 33', fullName: 'Alfa Romeo Tipo 33 (спортпрототипы, 1967-1977)',
  type: 'generation', year: 1967, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-tipo33-racing', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 640, engineType: 'flat12t', engineCC: 3000, isRacing: true,
  note: 'Гонщик появился ПЕРВЫМ (дебют на хилклаймбе Флерон, Бельгия, 12 марта 1967) — на 7 месяцев раньше дорожной "33 Stradale" (Парижский салон, окт. 1967), которая как раз ВЗЯЛА укороченное шасси гонщика (удлинено на ~100мм для дорожного использования, сталь вместо магния/алюминия, мощность снижена с 270 до 230hp). Эволюция: 33/2 (1968, V8 2.0L, 270hp, класс-победа в Дайтоне) → 33TT12 (1975, оппозитная "12", ~500hp, титул Чемпионата мира по производителям спорткаров) → 33SC12 (1976-77, 520hp атмо/640hp турбо, титул Кубка мира спортивных автомобилей 1977г. — Мерцарио/Жарье/Брамбилла выиграли ВСЕ этапы сезона).' })
addEdge('e-alfa-tipo33-stradale', 'alfa-tipo33-racing', 'alfa-33-stradale-1967', 'derived_from', 0.85)

addNode({ id: 'alfa-155-dtm', label: '155 V6 TI', fullName: 'Alfa Romeo 155 V6 TI (DTM)',
  type: 'generation', year: 1993, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-155-dtm', bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 426, engineType: 'v6', engineCC: 2500, isRacing: true,
  note: 'Разгромная доминация в DTM 1993г. — 2.5L V6 60°, 426PS/11500об/мин, полный привод (лазейку в регламенте закрыли уже со следующего сезона). Никола Ларини — чемпион (10 побед из 20 гонок), напарник Алессандро Наннини добавил ещё 2 — команда Alfa Corse выиграла 12 из 20 гонок сезона (60%), плюс кубок производителей. Alfa Romeo — единственный не-немецкий производитель, когда-либо бравший титул DTM. Всего 38 побед в DTM за карьеру модели.' })
addEdge('e-alfa155-dtm', 'alfa-155', 'alfa-155-dtm', 'derived_from', 0.75)

addNode({ id: 'alfa-sauber-f1', label: 'Alfa Romeo F1 Team (Sauber)', fullName: 'Alfa Romeo Racing / Alfa Romeo F1 Team (Sauber, 2019-2023)',
  type: 'generation', year: 2019, brandId: 'alfa-romeo', brandName: 'Alfa Romeo',
  modelSlug: 'alfa-sauber-f1', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 1000, engineType: 'v6h', isRacing: true,
  note: 'Титульное спонсорство/брендинг, НЕ инженерное участие Alfa Romeo — команда Sauber оставалась независимым клиентом Ferrari (мотор, коробка, часть техники — от Ferrari, не от Alfa). За 5 сезонов (2019-2023) — ни одного подиума; лучший результат в Кубке конструкторов — 6-е место (2022, Боттас/Чжоу). Партнёрство завершилось после 2023г.' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
