#!/usr/bin/env node
// Аудит Saturn / Scion / Rezvani / Ariel. Первый проход по всем четырём —
// до этого были почти полностью без bodyType и с generic engineType:"gasoline"
// (Saturn 10/12, Scion 9/10, Rezvani 16/17, Ariel 10/10 — подтверждено прямым
// сканом). Параллельно по этому же graph.json работает другой агент по Citroën
// — его brandId не трогаем, он не трогает наш.
//
// === SATURN ===
// Ростер полный (S-Series SL/SC/SW, L-Series, Ion, Vue×2, Relay, Aura,
// Outlook, Sky, Astra) — пропусков поколений нет, не трогаю. Saturn Sky уже
// был полностью заполнен (bodyType/engineType) — похоже, добавлен агентом по
// Pontiac при подключении ребра pontiac-solstice→saturn-sky (shares_platform,
// уже существует, Kappa-платформа). Ребро opel-astra-h→saturn-astra
// (rebadged_as) тоже уже существует. Ничего не фабрикуется после закрытия
// бренда GM в 2009-2010 — у всех узлов year≤2007, исходящих рёбер вперёд нет.
//  - Гигиена bodyType/engineType по реальным моторам каждой модели (S-Series
//    1.9L SOHC/DOHC I4 85hp; L-Series/Ion 2.2 Ecotec I4 140hp на базе GM2900,
//    общей с Opel Vectra B — ребро уже стоит; Vue Gen.1 3.0L V6 181hp; Relay
//    3.5L V6 200hp на GMT200, общей с Chevy Uplander/Buick Terraza/Pontiac
//    Montana SV6 — этих узлов в графе нет, кросс-ребро добавить не на что;
//    Aura/Outlook 3.6L V6 224/281hp — уже в description; Astra 1.8L I4 138hp).
//  - Saturn Vue Gen.2 (saturn-vue-2): engineType уже был "hybrid" (не generic),
//    но hp=222 — это цифра НЕ-гибридного 3.5L V6 трима. Реальный Vue Green
//    Line (BAS mild-hybrid, 2.4L I4) — 172hp/167lb-ft (edmunds.com,
//    usnews.com, truedelta.com, 2008 модель). Раз описание прямо называет
//    "Green Line hybrid" главной фичей поколения — поправляю hp на реальную
//    цифру гибридного трима и engineType на специфичный "i4h" (а не общий
//    "hybrid"), а не наоборот (V6 без hybrid).
//  - Saturn Relay: 0 рёбер (сирота). Его настоящие платформенные близнецы
//    (Chevrolet Uplander/Venture, Buick Terraza, Pontiac Montana SV6) в графе
//    отсутствуют как узлы, а своего другого поколения минивэна у Saturn
//    никогда не было — фабриковать ребро не на что. Оставляю как
//    верифицированную сироту (как X351 в fix-jaguar-landrover.js).
//
// === SCION ===
// Обнаружено: внутри Scion НЕ БЫЛО вообще ни одного ребра между собственными
// поколениями (только scion-frs→toyota-gt86-zn6) — xB Gen.1→Gen.2 и
// tC Gen.1→Gen.2 физически не были соединены. Добавляю оба (реальная прямая
// смена поколений, подтверждено Wikipedia/automobile-catalog). Также добавляю
// xA(2003)→xD(2007): xD — прямая замена xA в модельном ряду Scion (тот же
// сегмент субкомпакт-хэтч), Toyota/Scion официально позиционировали так.
//  - scion-frs: уже привязан к toyota-gt86-zn6 (rebadged_as). НЕ хватало
//    ребра к Subaru — нашёл subaru-brz-zc6 (2012, тот же год!) — Subaru/
//    Toyota/Scion это тройные механические близнецы, со-разработаны вместе
//    (Subaru — боксёрский двигатель и сборка в Гумма, Toyota — экстерьер).
//    Добавляю shares_platform (не rebadged_as — это не ребейдж, а параллельная
//    со-разработка с собственным дизайном Subaru).
//  - scion-ia (2015): описание "Mazda2-based" подтверждено — это американский
//    Mazda2 DJ (2014, узел mazda-2-dj есть в графе), собранный Mazda в Мексике
//    специально для Toyota/Scion (сама Mazda2 в США не продавалась). Добавляю
//    rebadged_as. Разрешает сироту.
//  - scion-im (2015, "Toyota Auris-based"): узла Toyota Auris/E180 в графе
//    нет (ближайший Corolla E160 — это другое, JDM Axio/Fielder шасси, не то
//    же самое, что европейский Auris) — кросс-ребро не провожу, чтобы не
//    приписать неточное платформенное совпадение. Остаётся сиротой.
//  - scion-iq (2011, Toyota iQ ребейдж): узла Toyota iQ в графе нет — кросс-
//    ребро не на что вести. Остаётся сиротой.
//  - Scion 2016 shutdown: toyota-yaris-ia/toyota-corolla-im узлов в графе
//    нет — никакого фиктивного "продолжения" и так не было, фабриковать new
//    node не стал (Toyota уже аудирован в этой сессии как отдельный бренд,
//    не вмешиваюсь в его финальный ростер).
//
// === REZVANI (низковолюмный кастом-билдер — донорские шасси документированы
// в собственных description почти каждого узла, но кросс-брендовых рёбер на
// них не было вообще, кроме Tank Gen1→Jeep Wrangler JK) ===
//  - Полная линейка Beast Gen1(2015)→X(2016)→Alpha(2016)→AlphaX "Blackbird"
//    (2018)→Gen2(2024) уже хронологически верно соединена — не трогаю состав
//    рёбер, только гигиену полей.
//  - Beast X и Alpha X Blackbird: подтверждено 5+ независимыми источниками
//    (carbuzz, maxim, digitaltrends, topspeed, automoblog, Wikipedia) —
//    2.5L turbo I4 (Cosworth, твин Borg Warner), 700hp у обоих. engineType
//    "i4t".
//  - Beast Gen1/Alpha: 500hp supercharged Honda K24 2.4L (K24 прямо назван в
//    description Gen1). У Beast Alpha hp идентичен (500) — похоже, тот же
//    агрегат в хардтоп-кузове на шасси Lotus Elise (а не Cosworth-турбо, как
//    путает Wikipedia в статье про Rezvani Beast — там же сам с собой
//    противоречит по Alpha X). engineType "i4s" для обоих, с пометкой
//    неопределённости в отчёте.
//  - Beast Gen2 (2024): подтверждено Wikipedia — 6.2L twin-turbo V8 (не NA),
//    1000hp на Corvette C8. engineType "v8t".
//  - Tank Gen1/Military: 707hp supercharged 6.2L Hellcat V8 (общеизвестная
//    цифра) → "v8s". Tank X: 1000+hp supercharged 6.2L Demon V8 → "v8s".
//    Tank Hybrid: 375hp — ТОЧНО совпадает с заводской цифрой серийного Jeep
//    Wrangler 4xe PHEV (2.0 turbo I4 + мотор) — это серийный донор-агрегат
//    без апгрейда мощности. engineType "hybrid"→"phev" (точнее — это PHEV с
//    заявленным 30-мильным электрозапасом, а не просто mild-hybrid). Tank
//    2026: заявлено "до 1000hp", та же V8-линейка → "v8s".
//  - Hercules 6x6: 1300hp supercharged 7.0L V8 (тюнингованный Demon-блок) —
//    ПОДТВЕРЖДЕНО 5+ независимыми источниками (thedrive, topgear, drivespark,
//    robbreport, motorbiscuit) с одинаковой цифрой — это НЕ надутый
//    маркетинг-номер, а последовательно воспроизводимая в прессе цифра.
//    Числа НЕ меняю. engineType "v8s" (было generic "gasoline").
//  - Fortress: 850hp supercharged 5.2L V8 (донор — Ford F-150 Raptor R,
//    заводской Predator-агрегат 700-720hp + тюнинг) — подтверждено
//    autoevolution (2 статьи), backfirenews, yankodesign, stupiddope.
//    Числа НЕ меняю. engineType "v8s".
//  - Dune: описание в графе утверждало "5.2L NA V10" — ОШИБКА. Множественные
//    источники (yahoo/autos, maxim, arabwheels, story-cars, autonext×2,
//    stickshifting, autojosh) согласованно подтверждают: двигатель
//    НАДДУВНОЙ (супер-чарджер разработки VF Engineering), именно за счёт
//    наддува получены 800hp (против 610hp атмосферного V10 у донора Huracán
//    Sterrato) — без наддува такой прирост на и так highly-tuned атмосферном
//    V10 был бы крайне маловероятен, что и вызвало исходное подозрение по
//    ТЗ. Поправляю description (NA→supercharged) и engineType на новый код
//    "v10s" (по аналогии с уже существующими в графе "v8s"/"v6s" для
//    наддувных V8/V6 — суффикс "s"=supercharged, "t"=turbo, что подтверждается
//    существованием v8t/v6t/v10t параллельно с v8s/v6s/i4s).
//  - Retro RR1: 750hp Turbo S flat-6 на базе Porsche 911 992 Turbo S
//    (заводские 650hp + тюнинг) — донор-узел p911-992-turbo-s в графе есть
//    (engineType flat6t) — коды совпадают. engineType "flat6t".
//  - Vengeance: 682hp supercharged V8 — ТОЧНО совпадает с заводской цифрой
//    Cadillac Escalade-V (узел cadillac-escalade-v, GM T1, supercharged
//    6.2L LT4, 682hp) — очень сильный сигнал, что донор именно Escalade-V,
//    а не рядовой Escalade. engineType "v8s".
//  - Knight: 1000hp twin-turbo V8 на "customer Lamborghini Urus" — Urus
//    заводской мотор уже twin-turbo 4.0L V8 (650-666hp стоком) — апгрейд
//    буста до 1000hp на штатно турбированном моторе куда правдоподобнее,
//    чем безнаддувный прирост у Dune. engineType "v8t".
//  - Добавлены 9 кросс-брендовых derived_from рёбер на реальные донор-шасси,
//    названные в СОБСТВЕННЫХ description каждого узла (тот же принцип, что
//    уже применён в графе к Ariel→Rezvani Beast Gen1 и Jeep Wrangler JK→Tank
//    Gen1): Hercules←Jeep Gladiator, Tank X←Wrangler JL, Tank Hybrid←Wrangler
//    4xe, Vengeance←Escalade-V, Knight←Urus, Dune←Huracán Sterrato,
//    Fortress←F-150 Raptor R, Beast Alpha/Alpha X←Lotus Elise S3, Beast
//    Gen2←Corvette C8. Все узлы-доноры уже существуют в графе (их бренды
//    аудированы ранее в этой сессии), новых узлов не создаю.
//
// === ARIEL ===
// Линейки Atom 1→2→3→3.5→4→4R и Nomad→NomadR/Nomad2, а также Atom→Rezvani
// Beast Gen1, уже были полностью и верно соединены скриптом
// fix-ferrari296-and-ariel.js (2026-09-01) — состав рёбер не трогаю, включая
// намеренное отсутствие входящего ребра у Hipercar (отдельная EV-платформа,
// это уже зафиксировано комментарием того скрипта и остаётся верным).
//  - bodyType "roadster" для всей линейки Atom/Nomad (открытый безрамочный
//    кокпит без дверей/крыши — ближайшая категория словаря графа; тот же
//    paddern уже используется для Lotus Elise в этом графе).
//  - engineType по каждому мотору из собственных description узлов: NA
//    (Atom 1 160hp база, Nomad 235hp) → "i4"; supercharged (Atom 2/3/3.5,
//    Nomad R) → "i4s"; turbo (Atom 4/4R, Nomad 2 — "Civic Type R engine"
//    K20C1, реально турбо, не наддув) → "i4t".
//  - Hipercar: подтверждено (electrek, carscoops, motorauthority, goodwood,
//    fastestlaps, arielna.com, mikeshouts, drivingeco) — это SERIES hybrid EV:
//    4 мотор-колеса (1180hp суммарно) питаются ИСКЛЮЧИТЕЛЬНО от батареи
//    42/56кВтч, газотурбинный генератор (35кВт) только подзаряжает батарею и
//    НИКОГДА механически не крутит колёса — классическая EREV-архитектура
//    (как Mazda MX-30 R-EV/BMW i3 REx), а не просто "ev" и не "phev" (ДВС/
//    турбина не может напрямую двигать авто). engineType "electric"→"erev"
//    (код уже есть в графе, 5 узлов). bodyType "coupe" (закрытый кузов, в
//    отличие от открытых Atom/Nomad).
//
// Источники: Wikipedia (Saturn, Saturn Vue, Saturn Astra, Scion, Scion xB/
// tC/iA/iM/FR-S, Subaru BRZ, Toyota 86, Rezvani Beast, Rezvani Motors, Ariel
// Atom, Ariel Nomad, Ariel HIPERCAR), automobile-catalog.com, edmunds.com,
// usnews.com, truedelta.com, consumerguide.com, startribune.com (Saturn Vue
// Green Line hybrid specs), carbuzz.com, maxim.com, digitaltrends.com,
// topspeed.com, automoblog.com, carscoops.com (Rezvani Beast X/Alpha X),
// thedrive.com, topgear.com, drivespark.com, robbreport.com, motorbiscuit.com
// (Rezvani Hercules 6x6), autoevolution.com, backfirenews.com,
// yankodesign.com, stupiddope.com (Rezvani Fortress), autos.yahoo.com,
// arabwheels.ae, story-cars.com, autonext.co, stickshifting.com, autojosh.com
// (Rezvani Dune), electrek.co, motorauthority.com, goodwood.com,
// fastestlaps.com, arielna.com, mikeshouts.com, drivingeco.com (Ariel
// Hipercar) — проверено веб-поиском 2026-10-21.
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

// Свежее чтение непосредственно перед мутацией — параллельно по этому же
// файлу работает агент по Citroën, мерджимся в актуальное состояние на диске.
const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(g.nodes.map(n => [n.id, n]))

function fixNode(id, patch) {
  const n = byId.get(id)
  if (!n) { console.log('  ⚠️  узел не найден:', id); return }
  Object.assign(n, patch)
  console.log(`  🔧 ${id}:`, JSON.stringify(patch).slice(0, 200))
}
function addEdge(id, source, target, type, strength) {
  if (!byId.has(source) || !byId.has(target)) { console.log('  ⚠️  узел не найден для ребра', id, source, '->', target); return }
  const dup = g.edges.find(e => e.source === source && e.target === target && e.type === type)
  if (dup) { console.log('  ⚠️  ребро уже существует:', id); return }
  g.edges.push({ id, source, target, type, strength })
  console.log(`  ✅ [${type}] ${source} → ${target}`)
}

console.log('=== 1. Saturn: гигиена bodyType/engineType (11 узлов, Sky уже готов) ===')
fixNode('saturn-sl', { bodyType: 'sedan', engineType: 'i4' })
fixNode('saturn-sc', { bodyType: 'coupe', engineType: 'i4' })
fixNode('saturn-sw', { bodyType: 'wagon', engineType: 'i4' })
fixNode('saturn-ls', { bodyType: 'sedan', engineType: 'i4' })
fixNode('saturn-vue', { bodyType: 'suv', engineType: 'v6' })
fixNode('saturn-ion', { bodyType: 'sedan', engineType: 'i4' })
fixNode('saturn-relay', { bodyType: 'van', engineType: 'v6' })
fixNode('saturn-aura', { bodyType: 'sedan', engineType: 'v6' })
fixNode('saturn-outlook', { bodyType: 'suv', engineType: 'v6' })
fixNode('saturn-astra', { bodyType: 'hatchback', engineType: 'i4' })
console.log('  ℹ️  Saturn Relay: 0 рёбер, настоящие платформенные близнецы (Uplander/Terraza/Montana SV6) в графе отсутствуют — верифицированная сирота, не фабрикую')

console.log('\n=== 2. Saturn Vue Gen.2: hp не соответствовал заявленному engineType ===')
// hp=222 — это цифра НЕ-гибридного 3.5L V6 трима. Реальный Green Line
// (BAS mild-hybrid 2.4L I4, тот что назван в description) — 172hp/167lb-ft
// (edmunds.com, usnews.com, truedelta.com). Поправляю под гибридный трим,
// который и является предметом description, engineType на специфичный i4h.
fixNode('saturn-vue-2', { bodyType: 'suv', engineType: 'i4h', hp: 172 })

console.log('\n=== 3. Saturn: подтверждаю (фикс не нужен) ===')
console.log('   - Ростер полный (SL/SC/SW/LS/Ion/Vue×2/Relay/Aura/Outlook/Sky/Astra), пропусков поколений нет')
console.log('   - pontiac-solstice→saturn-sky (shares_platform) и opel-astra-h→saturn-astra (rebadged_as) уже существуют')
console.log('   - Все узлы year≤2007, исходящих рёбер после закрытия бренда (2009-2010) нет — ничего не фабриковано')

console.log('\n=== 4. Scion: гигиена bodyType/engineType (9 узлов, FR-S уже готов) ===')
fixNode('scion-xa', { bodyType: 'hatchback', engineType: 'i4' })
fixNode('scion-xb-1', { bodyType: 'hatchback', engineType: 'i4' })
fixNode('scion-tc-1', { bodyType: 'coupe', engineType: 'i4' })
fixNode('scion-xd', { bodyType: 'hatchback', engineType: 'i4' })
fixNode('scion-xb-2', { bodyType: 'hatchback', engineType: 'i4' })
fixNode('scion-tc-2', { bodyType: 'coupe', engineType: 'i4' })
fixNode('scion-iq', { bodyType: 'microcar', engineType: 'i4' }) // тот же класс, что Smart Fortwo (microcar) в этом графе
fixNode('scion-ia', { bodyType: 'sedan', engineType: 'i4' })
fixNode('scion-im', { bodyType: 'hatchback', engineType: 'i4' })

console.log('\n=== 5. Scion: внутренние поколения не были соединены рёбрами вообще ===')
addEdge('sci-xb1-xb2', 'scion-xb-1', 'scion-xb-2', 'evolves_into', 0.9)
addEdge('sci-tc1-tc2', 'scion-tc-1', 'scion-tc-2', 'evolves_into', 0.9)
addEdge('sci-xa-xd', 'scion-xa', 'scion-xd', 'evolves_into', 0.85) // xD — прямая замена xA в модельном ряду

console.log('\n=== 6. Scion: кросс-брендовые рёбра ===')
// FR-S/GT86/BRZ — тройные механические близнецы, со-разработаны вместе
// (Subaru — двигатель/сборка, Toyota — экстерьер). shares_platform, не
// rebadged_as (собственный дизайн Subaru, не чистый ребейдж).
addEdge('sci-frs-brz', 'scion-frs', 'subaru-brz-zc6', 'shares_platform', 0.92)
// iA — американский Mazda2 DJ, собранный Mazda в Мексике специально для
// Toyota/Scion (сама Mazda2 в США не продавалась) — разрешает сироту.
addEdge('mazda2-sci-ia', 'mazda-2-dj', 'scion-ia', 'rebadged_as', 0.95)
console.log('  ℹ️  scion-im ("Toyota Auris-based"): узла Auris/E180 в графе нет (Corolla E160 — другое, JDM шасси) — ребро не провожу')
console.log('  ℹ️  scion-iq (Toyota iQ ребейдж): узла Toyota iQ в графе нет — ребро не провожу, остаётся сиротой')
console.log('  ℹ️  Scion shutdown 2016 (iA→Yaris iA, iM→Corolla iM): toyota-yaris-ia/toyota-corolla-im узлов нет — фиктивного продолжения и так не было, новые узлы не создаю (не мой бренд)')

console.log('\n=== 7. Rezvani: гигиена bodyType/engineType (все 17 узлов) ===')
fixNode('rezvani-beast-gen1', { bodyType: 'roadster', engineType: 'i4s' })
fixNode('rezvani-beast-x', { bodyType: 'roadster', engineType: 'i4t' })
fixNode('rezvani-beast-alpha', { bodyType: 'coupe', engineType: 'i4s' })
fixNode('rezvani-beast-alpha-x', { bodyType: 'coupe', engineType: 'i4t' })
fixNode('rezvani-beast-gen2', { bodyType: 'coupe', engineType: 'v8t' })
fixNode('rezvani-tank-gen1', { bodyType: 'suv', engineType: 'v8s' })
fixNode('rezvani-tank-military', { bodyType: 'suv', engineType: 'v8s' })
fixNode('rezvani-tank-x', { bodyType: 'suv', engineType: 'v8s' })
fixNode('rezvani-tank-hybrid', { bodyType: 'suv', engineType: 'phev' })
fixNode('rezvani-tank-2026', { bodyType: 'suv', engineType: 'v8s' })
fixNode('rezvani-hercules', { bodyType: 'pickup', engineType: 'v8s' })
fixNode('rezvani-hercules-military', { bodyType: 'pickup', engineType: 'v8s' })
fixNode('rezvani-vengeance', { bodyType: 'suv', engineType: 'v8s' })
fixNode('rezvani-knight', { bodyType: 'suv', engineType: 'v8t' })
fixNode('rezvani-fortress', { bodyType: 'pickup', engineType: 'v8s' })
fixNode('rezvani-retro-rr1', { bodyType: 'coupe', engineType: 'flat6t' })

console.log('\n=== 8. Rezvani Dune: описание ошибочно называло мотор атмосферным ===')
// Множественные источники (yahoo/autos, maxim, arabwheels, autonext×2,
// stickshifting, autojosh, story-cars) согласованно подтверждают наддувный
// (supercharger VF Engineering) V10 — именно наддув объясняет прирост до
// 800hp против 610hp атмосферного V10 у донора Huracán Sterrato. Новый код
// "v10s" по аналогии с уже существующими в графе v8s/v6s (supercharged).
fixNode('rezvani-dune', {
  bodyType: 'coupe',
  engineType: 'v10s',
  description: '7-unit off-road supercar on Lamborghini Huracan Sterrato. Supercharged 5.2L V10 (VF Engineering, ~190hp over stock N/A Sterrato), 4.5" lift. Sand/mud/rock/Baja/snow modes. Mid-engine.',
})

console.log('\n=== 9. Rezvani: донорские кросс-брендовые рёбра (все платформы названы в собственных description) ===')
addEdge('rz-gladiator-hercules', 'jeep-gladiator', 'rezvani-hercules', 'derived_from', 0.85)
addEdge('rz-wranglerjl-tankx', 'jeep-wrangler-jl', 'rezvani-tank-x', 'derived_from', 0.85)
addEdge('rz-4xe-tankhybrid', 'jeep-wrangler-4xe', 'rezvani-tank-hybrid', 'derived_from', 0.85)
addEdge('rz-escaladev-vengeance', 'cadillac-escalade-v', 'rezvani-vengeance', 'derived_from', 0.85)
addEdge('rz-urus-knight', 'lambo-urus', 'rezvani-knight', 'derived_from', 0.85)
addEdge('rz-sterrato-dune', 'lambo-huracan-sterrato', 'rezvani-dune', 'derived_from', 0.85)
addEdge('rz-raptorr-fortress', 'ford-f150-raptor-r', 'rezvani-fortress', 'derived_from', 0.85)
addEdge('rz-911turbos-retrorr1', 'p911-992-turbo-s', 'rezvani-retro-rr1', 'derived_from', 0.85)
addEdge('rz-elise-beastalpha', 'lotus-elise-s3', 'rezvani-beast-alpha', 'derived_from', 0.85)
addEdge('rz-elise-beastalphax', 'lotus-elise-s3', 'rezvani-beast-alpha-x', 'derived_from', 0.85)
addEdge('rz-c8-beastgen2', 'chevy-corvette-c8', 'rezvani-beast-gen2', 'derived_from', 0.85)
console.log('  ℹ️  Beast Gen1→X→Alpha→AlphaX→Gen2 и Tank Gen1→Military→X→Hybrid→2026, Tank→Hercules — состав уже верный, не трогаю')
console.log('  ℹ️  Hercules/Fortress hp (1300/850) подтверждены 5+/4+ независимыми источниками — НЕ инфлированы, числа не меняю')

console.log('\n=== 10. Ariel: гигиена bodyType/engineType (все 10 узлов) ===')
fixNode('ariel-atom', { bodyType: 'roadster', engineType: 'i4' })
fixNode('ariel-atom-2', { bodyType: 'roadster', engineType: 'i4s' })
fixNode('ariel-atom-3', { bodyType: 'roadster', engineType: 'i4s' })
fixNode('ariel-atom-3s', { bodyType: 'roadster', engineType: 'i4s' })
fixNode('ariel-atom-4', { bodyType: 'roadster', engineType: 'i4t' })
fixNode('ariel-atom-4r', { bodyType: 'roadster', engineType: 'i4t' })
fixNode('ariel-nomad', { bodyType: 'roadster', engineType: 'i4' })
fixNode('ariel-nomad-r', { bodyType: 'roadster', engineType: 'i4s' })
fixNode('ariel-nomad-2', { bodyType: 'roadster', engineType: 'i4t' })

console.log('\n=== 11. Ariel Hipercar: series-hybrid EREV, не чистый EV ===')
// Турбина — ТОЛЬКО генератор подзарядки батареи (35кВт), колёса крутят
// исключительно 4 электромотора (1180hp суммарно) — классическая EREV-
// архитектура (как Mazda MX-30 R-EV/BMW i3 REx), не "ev" и не "phev".
fixNode('ariel-hipercar', { bodyType: 'coupe', engineType: 'erev' })

fs.writeFileSync(GRAPH_FILE, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
