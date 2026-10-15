#!/usr/bin/env node
// Финальная зачистка: Chevrolet SS + Camaro Z/28.R (хвосты из собственных
// note), плюс 3 совершенно новых линейки — Monte Carlo, El Camino, Nova —
// которые ни разу не проверялись в этой сессии, хотя прямо связаны с уже
// добавленными Malibu/Chevelle SS и цепочкой NASCAR-кузовов.
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
function chain(prefix, ids, type = 'evolves_into', strength = 0.85) {
  for (let i = 0; i < ids.length - 1; i++) addEdge(`${prefix}-${i + 1}-${i + 2}`, ids[i], ids[i + 1], type, strength)
}

console.log('=== 1) Chevrolet SS (2014-17) + достройка цепочки NASCAR-кузовов ===')
addNode({ id: 'chev-ss-2014', label: 'Chevrolet SS', fullName: 'Chevrolet SS (2014-2017)',
  type: 'generation', year: 2014, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-ss', bodyType: 'sedan', segment: 'exec', zone: 'exec_sed',
  hp: 415, engineType: 'v8', engineCC: 6200,
  note: 'Заднеприводный седан на платформе Zeta — фактически перебейдженный Holden Commodore SS (VF), собирался в Австралии. LS3 6.2L V8, 415hp, 6-АКПП (с 2015г. опция МКПП Tremec TR-6060). 0-60 за 4.5с. Не связан с Malibu/Impala платформенно — отдельная разработка на австралийской архитектуре GM.' })
addNode({ id: 'chev-ss-nascar', label: 'Chevrolet SS NASCAR', fullName: 'Chevrolet SS NASCAR Cup',
  type: 'generation', year: 2013, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-ss-nascar', bodyType: 'sedan', segment: 'racing', zone: 'racing',
  hp: 750, engineType: 'v8', engineCC: 5900, isRacing: true,
  note: 'Кузов NASCAR Sprint Cup/Monster Energy Cup 2013-2017 (правила Gen6, тот же общий 358ci мотор, что и у сменившей его Camaro ZL1). Сменил Impala SS. 2 титула: Кевин Харвик (2014), Джимми Джонсон (2016, рекордный для эры 7-й титул). 70 побед за карьеру. Связь с дорожным Chevrolet SS — только внешняя стилизация (решётка/фонари), не механика — шасси НАСКАРовское трубчатое, единое для всех марок.' })
addEdge('e-chevss-to-nascar', 'chev-ss-2014', 'chev-ss-nascar', 'derived_from', 0.5)
addEdge('e-impalanascar-to-ssnascar', 'chev-impala-nascar', 'chev-ss-nascar', 'evolves_into', 0.85)
addEdge('e-ssnascar-to-zl1nascar', 'chev-ss-nascar', 'chevy-camaro-zl1-nascar', 'evolves_into', 0.85)
console.log('  ✅ Impala NASCAR → SS NASCAR → Camaro ZL1 NASCAR — цепочка кузовов замкнута')

console.log('\n=== 2) Camaro Z/28.R — гоночный предшественник GT4.R ===')
addNode({ id: 'chevy-camaro-z28r', label: 'Camaro Z/28.R', fullName: 'Chevrolet Camaro Z/28.R',
  type: 'generation', year: 2014, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chevy-camaro-z28r', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 505, engineType: 'v8', engineCC: 7000, isRacing: true,
  note: 'Заводской клиентский гонщик Pratt & Miller на базе дорожного Z/28 (тот же LS7 7.0L, 505hp, сухой картер). Дебют январь 2014, победа во 2-м же старте (Себринг). IMSA Continental Tire GS-класс 2014-16 (55 побед, 2 титула производителя) + Pirelli World Challenge GTS 2015-16 (титул 2015, Michael Cooper). Сменена Camaro GT4.R (2017) под официальные SRO GT4-правила.' })
addEdge('e-camaro5z28-to-z28r', 'chevy-camaro-gen5-z28', 'chevy-camaro-z28r', 'derived_from', 0.7)
addEdge('e-z28r-to-gt4r', 'chevy-camaro-z28r', 'chevy-camaro-gt4r', 'evolves_into', 0.75)
console.log('  ✅ Z/28 (дорожный) → Z/28.R (гонка) → GT4.R')

console.log('\n=== 3) Monte Carlo — 6 поколений + гоночный кузов (2 захода в NASCAR) ===')
addNode({ id: 'chev-montecarlo-1', label: 'Monte Carlo Gen.1', year: 1970, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo', familyKey: 'chev-montecarlo', type: 'generation', bodyType: 'coupe', segment: 'exec', zone: 'gt_coupe',
  hp: 360, engineType: 'v8', note: 'Первый "личный люкс-купе" Chevrolet — ответ Ford Thunderbird/Pontiac Grand Prix. SS454 (LS5) — 360hp gross (1970)/365 (1971), опция снята в 1972г. База — 350 V8, 250hp gross.' })
addNode({ id: 'chev-montecarlo-2', label: 'Monte Carlo Gen.2', year: 1973, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo', familyKey: 'chev-montecarlo', type: 'generation', bodyType: 'coupe', segment: 'exec', zone: 'gt_coupe',
  hp: 145, engineType: 'v8', note: '350 V8, 145hp net (1973г., переход на нетто-замер) — SS не предлагался. 1973г. — Motor Trend Car of the Year. Пик продаж — 1976г. (~353 тыс.).' })
addNode({ id: 'chev-montecarlo-3', label: 'Monte Carlo Gen.3', year: 1978, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo', familyKey: 'chev-montecarlo', type: 'generation', bodyType: 'coupe', segment: 'exec', zone: 'gt_coupe',
  hp: 160, engineType: 'v8', note: 'Программа даунсайзинга GM — минус ~300-360кг. Базовый V6 (Buick 231ci), опционально 305 V8 до 160hp (1979). SS не предлагался.' })
addNode({ id: 'chev-montecarlo-4', label: 'Monte Carlo Gen.4', year: 1981, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo', familyKey: 'chev-montecarlo', type: 'generation', bodyType: 'coupe', segment: 'exec', zone: 'gt_coupe',
  hp: 180, engineType: 'v8', note: 'То же шасси переименовано в G-body (1982, GM отдал имя A-body новым переднеприводным моделям). SS возвращается в 1983г. (L69 305 HO, 175→180hp к 1988). Aerocoupe-фастбек (1986-87, 200 экз.) — построен исключительно для омологации в NASCAR.' })
addNode({ id: 'chev-montecarlo-5', label: 'Monte Carlo Gen.5', year: 1995, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo', familyKey: 'chev-montecarlo', type: 'generation', bodyType: 'coupe', segment: 'exec', zone: 'gt_coupe',
  hp: 210, engineType: 'v6', note: 'Впервые передний привод (GM W-body, общий с Grand Prix/Lumina/Impala/Regal того времени). Z34 — 3.4 DOHC, 210hp (1995-97), позже 3.8 Series II, 200hp. В этом же году имя вернулось в NASCAR.' })
addNode({ id: 'chev-montecarlo-6', label: 'Monte Carlo Gen.6', year: 2000, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo', familyKey: 'chev-montecarlo', type: 'generation', bodyType: 'coupe', segment: 'exec', zone: 'gt_coupe',
  hp: 303, engineType: 'v8', note: 'Финальное поколение (W-body GMX230/231). SS 2006-07 — 5.3 LS4 V8 (поперечно), 303hp — первый V8 в Monte Carlo с 1988г. Снята с производства в 2007г.' })
chain('e-chev-mc', ['chev-montecarlo-1', 'chev-montecarlo-2', 'chev-montecarlo-3', 'chev-montecarlo-4'])
addEdge('e-chev-mc-4-5', 'chev-montecarlo-4', 'chev-montecarlo-5', 'evolves_into', 0.85) // разрыв 1989-94 (Lumina вместо неё)
addEdge('e-chev-mc-5-6', 'chev-montecarlo-5', 'chev-montecarlo-6', 'evolves_into', 0.85)

addNode({ id: 'chev-montecarlo-nascar', label: 'Monte Carlo NASCAR', fullName: 'Chevrolet Monte Carlo NASCAR',
  type: 'generation', year: 1983, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-montecarlo-nascar', bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 700, engineType: 'v8', engineCC: 5900, isRacing: true, familyKey: 'chev-montecarlo',
  note: 'Кузов NASCAR в ДВА захода: 1983-88 и 1995-2007 (между ними, 1989-94, роль исполняла Lumina). Именно на Monte Carlo Дейл Эрнхардт взял оба своих первых титула Cup (1986, 1987) и разбился на Дайтоне-2001 (хотя его культовая чёрная "тройка" в 1990-94гг. была технически Lumina, не Monte Carlo). При Hendrick Motorsports — 4 подряд титула 1995-98 (Джефф Гордон×3, Терри Лабонте), позже Тони Стюарт (2005), Джимми Джонсон (2006). Мотор — единая для всех марок формула NASCAR 358ci, ~700-750hp без рестриктора / ~430-450hp на суперскоростных овалах. Сменён Impala SS в 2007-08гг. (COT переходно делил сезон 2007 пополам).' })
addEdge('e-malibunascar-to-mcnascar', 'chev-malibu-nascar', 'chev-montecarlo-nascar', 'evolves_into', 0.8)
addEdge('e-mcnascar-to-impalanascar', 'chev-montecarlo-nascar', 'chev-impala-nascar', 'evolves_into', 0.85)
addEdge('e-mc4-to-mcnascar', 'chev-montecarlo-4', 'chev-montecarlo-nascar', 'derived_from', 0.6)
console.log('  ✅ Malibu NASCAR → Monte Carlo NASCAR → Impala NASCAR → SS NASCAR → Camaro ZL1 NASCAR — полная цепочка кузовов Chevrolet в NASCAR, 1973-2021')

console.log('\n=== 4) El Camino — 5 поколений + SS396/SS454 (близнецы Malibu/Chevelle SS) ===')
addNode({ id: 'chev-elcamino-1', label: 'El Camino Gen.1', year: 1959, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-elcamino', familyKey: 'chev-elcamino', type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
  hp: 185, engineType: 'v8', note: 'Купе-пикап на шасси полноразмерного Chevrolet (НЕ Chevelle — той ещё не существовало). Ответ на Ford Ranchero. 283ci V8, 185hp. Снят с производства всего через 2 года.' })
addNode({ id: 'chev-elcamino-2', label: 'El Camino Gen.2', year: 1964, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-elcamino', familyKey: 'chev-elcamino', type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
  hp: 195, engineType: 'v8', note: 'Возрождение после 3-летнего перерыва (1961-63) — теперь на шасси Chevelle A-body. 283ci V8, 195hp. С 1966г. опционально 396 big-block (325-375hp), но ещё без бейджа SS.' })
addNode({ id: 'chev-elcamino-3', label: 'El Camino Gen.3', year: 1968, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-elcamino', familyKey: 'chev-elcamino', type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
  hp: 200, engineType: 'v8', note: 'Рестайлинг на том же Chevelle A-body. 307ci V8, 200hp (база). Первый год с полноценным бейджем SS.' })
addNode({ id: 'chev-elcamino-ss396', label: 'El Camino SS 396', fullName: 'Chevrolet El Camino SS 396 (L78)',
  year: 1968, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'chev-elcamino-ss396',
  type: 'generation', bodyType: 'pickup', segment: 'muscle', zone: 'muscle',
  hp: 375, engineType: 'v8', engineCC: 6489, note: 'L78, те же 325/350/375hp настройки, что у Chevelle SS396 — но бейдж на El Camino появился только в 1968г. (Chevelle получил его на 2 года раньше). Регулярная заводская опция, не спецверсия — 667 экз. в 1968г., ~5262 в 1969г.' })
addNode({ id: 'chev-elcamino-ss454', label: 'El Camino SS 454 LS6', fullName: 'Chevrolet El Camino SS 454 LS6',
  year: 1970, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'chev-elcamino-ss454',
  type: 'generation', bodyType: 'pickup', segment: 'muscle', zone: 'muscle',
  hp: 450, engineType: 'v8', engineCC: 7440, isLimited: true, note: 'Прямой близнец Chevelle SS454 LS6 — тот же мотор, та же официальная (заниженная) цифра 450hp/500lb-ft, тот же единственный год выпуска (1970). ~500 экземпляров с этим двигателем.' })
addNode({ id: 'chev-elcamino-4', label: 'El Camino Gen.4', year: 1973, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-elcamino', familyKey: 'chev-elcamino', type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
  hp: 115, engineType: 'v8', note: '307 V8, 115hp net (переход на нетто-замер + нормы по выбросам). SS сохраняется как пакет управляемости/внешности; SS454 (LS4) дотянул до 1975г. на ~245hp net.' })
addNode({ id: 'chev-elcamino-5', label: 'El Camino Gen.5', year: 1978, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-elcamino', familyKey: 'chev-elcamino', type: 'generation', bodyType: 'pickup', segment: 'truck', zone: 'pickup',
  hp: 95, engineType: 'v6', note: 'Даунсайзинг, шасси позже переименовано в G-body (1982) — общее с Malibu, но El Camino пережила Malibu на этом шасси на 4 года (Malibu снята в 1983г., El Camino — в 1987г.). База V6 200ci, 95hp (1978) → финальный 4.3L V6, 145hp (1987). SS к этому времени — чисто внешний пакет (топ-мотор — 350 V8, ~170hp).' })
chain('e-chev-ec', ['chev-elcamino-1', 'chev-elcamino-2', 'chev-elcamino-3', 'chev-elcamino-4', 'chev-elcamino-5'])
addEdge('e-ec3-to-ss396', 'chev-elcamino-3', 'chev-elcamino-ss396', 'variant_of', 0.85)
addEdge('e-ec3-to-ss454', 'chev-elcamino-3', 'chev-elcamino-ss454', 'variant_of', 0.85)
addEdge('e-ec1-2-platform', 'chev-elcamino-2', 'chev-malibu-1', 'shares_platform', 0.9)
addEdge('e-ec3-malibu2-platform', 'chev-elcamino-3', 'chev-malibu-2', 'shares_platform', 0.9)
addEdge('e-ecss454-malibuss454-twins', 'chev-elcamino-ss454', 'chev-malibu2-ss454', 'shares_platform', 0.95)
addEdge('e-ec4-malibu3-platform', 'chev-elcamino-4', 'chev-malibu-3', 'shares_platform', 0.9)
addEdge('e-ec5-malibu4-platform', 'chev-elcamino-5', 'chev-malibu-4', 'shares_platform', 0.85)
console.log('  ✅ El Camino Gen.1-5 + SS396/SS454, привязаны платформенно к Malibu/Chevelle')

console.log('\n=== 5) Nova — классика (4 пок.) + FWD-ревайвл (Corolla-близнец) + COPO 9010 ===')
addNode({ id: 'chev-nova-1', label: 'Nova Gen.1', year: 1962, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-nova', familyKey: 'chev-nova', type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'hatchback',
  hp: 195, engineType: 'v8', note: 'Изначально "Chevy II" — "Nova" была лишь топ-тримом до 1969г. Разработана GM за ~18 месяцев как ответ Ford Falcon/Plymouth Valiant. 283ci V8, 195hp (SS-версия, дебют 1963г.).' })
addNode({ id: 'chev-nova-2', label: 'Nova Gen.2', year: 1966, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-nova', familyKey: 'chev-nova', type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'hatchback',
  hp: 350, engineType: 'v8', note: 'Рестайлинг по мотивам шоу-кара "Super Nova". 327ci L79 V8, 350hp — доступен только в 1966г. "Chevy II" ещё официальное имя линейки до 1969г.' })
addNode({ id: 'chev-nova-3', label: 'Nova Gen.3', year: 1968, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-nova', familyKey: 'chev-nova', type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'hatchback',
  hp: 200, engineType: 'v8', note: 'Имя "Chevy II" окончательно снято в 1969г. Новая раздельная передняя подрама (как у полноразмерных GM). База — 307 V8 (~200hp у аналогичных моделей Chevrolet того года). На этом кузове — все COPO/Yenko спецверсии (см. отдельные узлы).' })
addNode({ id: 'chev-nova-ss396', label: 'Nova SS 396', fullName: 'Chevrolet Nova SS 396 (L78)',
  year: 1968, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'chev-nova-ss396',
  type: 'generation', bodyType: 'sedan', segment: 'muscle', zone: 'muscle',
  hp: 375, engineType: 'v8', engineCC: 6489, note: 'Обычная заводская опция (RPO), не гомологационная спецверсия — 667 экз. в 1968г., ~5262 в 1969г. (4951 чугунная головка L78 + 311 алюминиевая L89).' })
addNode({ id: 'chev-nova-copo9010', label: 'Nova COPO 9010 "Yenko Deuce"', fullName: 'Chevrolet Nova COPO 9010 "Yenko Deuce"',
  year: 1970, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'chev-nova-copo9010',
  type: 'generation', bodyType: 'sedan', segment: 'muscle', zone: 'muscle',
  hp: 360, engineType: 'v8', engineCC: 5700, isLimited: true,
  note: 'В 1970г. корпоративный запрет GM на моторы свыше 400 куб.дюймов в компактных моделях исключил биг-блок из Nova вообще (вопреки расхожему мифу о "COPO 427/454 Nova" — такого не существовало). Йенко добился спецкода COPO 9010 на решётчато-клапанный LT1 350 (тот же, что у Z/28 Camaro и Corvette) — 360hp. Всего 175 экз. (плюс код COPO 9737 — задний мост 4.10 Positraction).' })
addNode({ id: 'chev-nova-4', label: 'Nova Gen.4', year: 1975, brandId: 'chevrolet', brandName: 'Chevrolet',
  modelSlug: 'chev-nova', familyKey: 'chev-nova', type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'hatchback',
  hp: 165, engineType: 'v8', note: '350 V8, 165-170hp (смог-эра). В 1976г. топ-трим переименован в "Concours" (в пику Ford Granada). Сменена переднеприводной Citation в 1980г.' })
addNode({ id: 'chev-nova-5', label: 'Nova Gen.5 (FWD)', fullName: 'Chevrolet Nova (1985, FWD, NUMMI)',
  year: 1985, brandId: 'chevrolet', brandName: 'Chevrolet', modelSlug: 'chev-nova-5',
  type: 'generation', bodyType: 'sedan', segment: 'compact', zone: 'hatchback',
  hp: 110, engineType: 'i4', note: 'Полный разрыв инженерной преемственности — фактически перебейдженная Toyota Corolla/Sprinter (шасси E80), собиралась на совместном заводе NUMMI (Фримонт, Калифорния). Топ-версия 1988г. — 1.6L 4A-GE Twin Cam, 110hp. Сменена Geo Prizm в 1989г.' })
chain('e-chev-nova', ['chev-nova-1', 'chev-nova-2', 'chev-nova-3', 'chev-nova-4', 'chev-nova-5'])
addEdge('e-nova3-to-ss396', 'chev-nova-3', 'chev-nova-ss396', 'variant_of', 0.85)
addEdge('e-nova3-to-copo9010', 'chev-nova-3', 'chev-nova-copo9010', 'variant_of', 0.8)
addEdge('e-nova5-corolla-twins', 'chev-nova-5', 'toyota-corolla-e80', 'shares_platform', 0.95)
console.log('  ✅ Nova Gen.1-5 + SS396 + COPO 9010, FWD-ревайвл привязан к Toyota Corolla E80 (настоящий близнец)')

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
