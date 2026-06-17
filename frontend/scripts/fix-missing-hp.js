/**
 * fix-missing-hp.js — заполняет недостающую/неверную мощность (hp) у узлов графа.
 *
 * Причина: скрапер netcarshow не извлекает мощность → 46 узлов были БЕЗ поля hp.
 * В раскладке «Мощность» такие узлы падают в дефолтный бакет (?? 150 л.с.) и
 * сбиваются в крайний левый столбец (баг, замеченный на Bugatti W16 Mistral).
 *
 * Значения: production/near-production — реальные паспортные; концепты — официальные
 * там где объявлены, иначе обоснованная оценка (помечены EST в отчёте). Где явно
 * неверный engineType ломал ЗОНУ (EV с ярлыком i4t и т.п.) — поправлен заодно.
 *
 * Запуск: node scripts/fix-missing-hp.js  (затем npm run validate)
 */
const fs = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '..', 'public', 'data', 'evolution', 'graph.json')

// id → патч. hp в л.с. (как в остальном графе). engineType/label/year/codeName — опционально.
const PATCH = {
  // ── Pointed-at model: Bugatti W16 Mistral (roadster на двигателе Chiron SS) ──
  'ncs-bugatti-2026-bugatti-w16-mistral-le-retour-du-jeune-prin':
    { hp: 1578, label: 'W16 Mistral', year: 2024, codeName: '' },

  // ── Производственные/близкие к серии — паспортные значения ──────────────────
  'ncs-bmw-2027-bmw-m2-with-m-xdrive':                 { hp: 480 },                 // M2 G87
  'ncs-bmw-2027-bmw-m3-cs-handschalter':               { hp: 543, engineType: 'i6t' }, // S58, не i4t
  'ncs-nissan-2027-nissan-frontier-sport-edition':     { hp: 310, engineType: 'v6' },  // 3.8 V6
  'ncs-volkswagen-2027-volkswagen-id-polo-gti':        { hp: 223, engineType: 'ev' },  // EV GTI
  'ncs-porsche-2026-porsche-911-gt3-touring-tree-of-life': { hp: 502, engineType: 'flat6' }, // GT3 NA
  'ncs-toyota-2026-toyota-grmn-corolla':               { hp: 304 },
  'ncs-lexus-2026-lexus-es-500e-awd':                  { hp: 338 },                 // EV dual-motor
  'ncs-lexus-2026-lexus-es-350e':                      { hp: 224 },                 // EV single-motor
  'ncs-lexus-2026-lexus-es-350h':                      { hp: 245 },                 // hybrid
  'ncs-honda-2026-honda-prelude-uk':                   { hp: 200, engineType: 'i4h' }, // e:HEV
  'ncs-skoda-2027-skoda-epiq':                         { hp: 204, engineType: 'ev' },
  'ncs-bmw-2027-ix3-long-wheelbase':                   { hp: 463 },                 // iX3 50 NK
  'ncs-audi-2027-sq7':                                 { hp: 500 },
  'ncs-audi-2027-q7':                                  { hp: 335 },                 // 55 TFSI
  'ncs-porsche-2026-macan-gts-us':                     { hp: 434, engineType: 'v6t' }, // gas Macan GTS
  'ncs-mercedes-2027-amg-gt-4-door':                   { hp: 577, engineType: 'v8t' }, // GT 63
  'ncs-lotus-2025-lotus-evija':                        { hp: 2000, engineType: 'ev' }, // EV гиперкар!
  'ncs-lotus-2024-lotus-theory-1-concept':             { hp: 986,  engineType: 'ev' },
  'ncs-bmw-2025-bmw-speedtop-concept':                 { hp: 617 },                 // на базе M8
  'ncs-bmw-2024-bmw-skytop-concept':                   { hp: 617 },                 // на базе M8

  // ── Концепты с объявленной мощностью ────────────────────────────────────────
  'concept-audi-a6avant':   { hp: 476 },   // A6 Avant e-tron concept
  'concept-bmw-inext':      { hp: 516 },   // → iX xDrive50
  'concept-nissan-ims':     { hp: 483 },   // 360 kW
  'concept-merc-eqxx':      { hp: 241 },   // 180 kW
  'concept-porsche-missione': { hp: 600 }, // Mission E, 440 kW
  'concept-audi-etrongt':   { hp: 590 },   // e-tron GT concept
  'bentley-exp100gt':       { hp: 1341 },  // EXP 100 GT, 4 мотора

  // ── Оценки (EST): официальной мощности нет / модель спекулятивная ───────────
  'concept-bmw-4':          { hp: 374 },   // EST → previews 4-series (M440i-класс)
  'concept-bmw-z4':         { hp: 382 },   // EST → Z4 M40i
  'concept-bmw-i4dyn':      { hp: 536 },   // EST → i4 M50
  'concept-lexus-lf1':      { hp: 500 },   // EST → флагман-кроссовер концепт
  'ncs-ferrari-2027-ferrari-luce':            { hp: 1000 }, // EST (EV-проект)
  'ncs-porsche-2027-porsche-cayenne-coupe-electric': { hp: 650 }, // EST
  'ncs-subaru-2027-subaru-getaway':           { hp: 215 },  // EST
  'ncs-nissan-2026-nissan-terrano-suv-phev-concept': { hp: 300 }, // EST
  'ncs-rolls-royce-2026-rolls-royce-project-nightingale-concept': { hp: 577 }, // EST (Spectre)
  'ncs-subaru-2026-subaru-trailseeker':       { hp: 375 },  // EST
  'ncs-subaru-2026-subaru-uncharted':         { hp: 338 },  // EST
  'ncs-bmw-2026-bmw-vision-alpina-concept':   { hp: 600 },  // EST
  'ncs-ferrari-2026-ferrari-hc25':            { hp: 830 },  // EST (V12 one-off)
  'ncs-audi-2025-audi-c-concept':             { hp: 400 },  // EST
  'ncs-bentley-2025-bentley-exp-15-concept':  { hp: 800 },  // EST (EV)
  'ncs-honda-2025-honda-0-suv-concept':       { hp: 240 },  // EST (EV)
  'ncs-bmw-2024-bmw-vision-neue-klasse-x-concept': { hp: 400 }, // EST (EV)
  'ncs-nissan-2024-nissan-epic-concept':      { hp: 400 },  // EST (EV)
}

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))

let applied = 0, missing = []
for (const [id, patch] of Object.entries(PATCH)) {
  const n = byId[id]
  if (!n) { missing.push(id); continue }
  Object.assign(n, patch)
  applied++
}

// Контроль: остались ли узлы без валидного hp?
const stillNoHp = g.nodes.filter(n => typeof n.hp !== 'number' || !(n.hp > 0))

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))  // 2-space, как в остальном файле

console.log(`Применено патчей: ${applied} / ${Object.keys(PATCH).length}`)
if (missing.length) console.log(`⚠ не найдены id (${missing.length}):`, missing.join(', '))
console.log(`Узлов всё ещё без hp: ${stillNoHp.length}`,
  stillNoHp.length ? '→ ' + stillNoHp.map(n => n.id).join(', ') : '✓')
