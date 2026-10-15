#!/usr/bin/env node
// Расширенный поиск гоночных пробелов по всему бренду Ford (по запросу
// "Расширь на весь бренд поиск" после проверки Focus).
//
// Найдено:
// А) БАГ в данных: ford-sierra-cosworth (label "Sierra RS Cosworth", год 1986,
//    базовая 3-дверная машина) имел codeName:"RS500" и hp:224 — но это
//    характеристики ДРУГОЙ, более поздней (1987) машины — RS500. Реальный
//    базовый Sierra RS Cosworth 1986г. — 204hp (201bhp), без "RS500" в имени.
//    Правим базовый узел и добавляем RS500 отдельным, полноценным узлом —
//    именно RS500 (500 экз., омологация Group A) доминировал в кузовных
//    гонках (BTCC/DTM/Bathurst/Spa 24h, 1987-1992).
// Б) Escort RS Cosworth имел дорожный узел, но не имел гоночного WRC-узла —
//    в отличие от Focus/Fiesta, у которых по одному "-wrc" узлу уже есть.
//    Escort WRC (1993-98) — предшественник Focus WRC, 8 побед на этапах.
// В) Ford вообще не был представлен в NASCAR — при том, что это одна из
//    крупнейших гоночных программ бренда, причём ДЕЙСТВУЮЩАЯ (Mustang
//    Next Gen с 2022г.).
'use strict'
const fs = require('fs')
const path = require('path')
const GRAPH_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
const byId = new Map(graph.nodes.map(n => [n.id, n]))

console.log('=== А) Sierra RS Cosworth — исправление конфликта данных ===')
const sierra = byId.get('ford-sierra-cosworth')
console.log(`  было: codeName="${sierra.codeName}", hp=${sierra.hp} (это данные RS500, не базовой машины)`)
sierra.codeName = 'Cosworth'
sierra.hp = 204
sierra.note = 'Базовая 3-дверная Sierra RS Cosworth (1986) — 204hp (201bhp), омологация Group A. Не путать с более мощной эволюцией RS500 (1987) — см. отдельный узел.'
console.log('  стало: codeName="Cosworth", hp=204 + note')

function addNode(node, parentId, edgeType, strength) {
  if (byId.has(node.id)) { console.log('  ⚠️  уже существует, пропуск:', node.id); return }
  graph.nodes.push(node)
  byId.set(node.id, node)
  graph.edges.push({ id: `${parentId}-to-${node.id}`, source: parentId, target: node.id, type: edgeType, strength })
  console.log(`  ✅ ${node.id} (${node.hp} л.с.) ← ${edgeType} ← ${parentId}`)
}

addNode({
  id: 'ford-sierra-rs500-cosworth', label: 'Sierra RS500 Cosworth', fullName: 'Ford Sierra RS500 Cosworth',
  type: 'generation', year: 1987, brandId: 'ford', brandName: 'Ford',
  codeName: 'RS500', modelSlug: 'ford-sierra-rs500-cosworth',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 224, engineType: 'i4t', isLimited: true, isRacing: true, familyKey: 'ford-rally',
  note: 'Финальная эволюция для омологации Group A — ровно 500 экз., собраны вручную (Tickford). Усиленный блок YBD, турбина Garrett T04 вместо T03B, больше интеркулер. 224hp дорожная версия, но в заводской гоночной подготовке грузовые двигатели выдавали 500+ л.с. Доминировал в кузовных гонках 1987-92: BTCC, DTM, дважды Bathurst 1000, Spa 24h — один из самых успешных туринг-каров в истории.',
}, 'ford-sierra-cosworth', 'variant_of', 0.75)

console.log('\n=== Б) Escort WRC — гоночный узел, которого не было (в отличие от Focus/Fiesta) ===')
addNode({
  id: 'ford-escort-wrc', label: 'Escort WRC', fullName: 'Ford Escort RS Cosworth WRC',
  type: 'generation', year: 1993, brandId: 'ford', brandName: 'Ford',
  codeName: 'Escort WRC', modelSlug: 'ford-escort-cosworth',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 300, engineType: 'i4t', isRacing: true, familyKey: 'ford-escort',
  note: 'Заводская команда Ford в WRC 1993-1998 — 8 побед на этапах (Group A), ещё 2 в 1997-98 в кузове World Rally Car. Пилоты — Франсуа Делекур (победа дебютного Монте-Карло 1993), Мики Бьязион, Томми Мякинен, Карлос Сайнс. ~300hp — типичный потолок для 2.0Т AWD класса Group A той эры (точная заводская цифра гоночной спецификации не публиковалась). Сменён Focus RS WRC в 1999г.',
}, 'ford-escort-cosworth', 'derived_from', 0.6)

console.log('\n=== В) NASCAR — целая гоночная серия отсутствовала у Ford ===')
addNode({
  id: 'ford-mustang-nascar', label: 'Mustang NASCAR', fullName: 'Ford Mustang NASCAR Cup Series (Next Gen)',
  type: 'generation', year: 2022, brandId: 'ford', brandName: 'Ford',
  codeName: 'Next Gen', modelSlug: 'ford-mustang-nascar',
  bodyType: 'coupe', segment: 'racing', zone: 'racing',
  hp: 670, engineType: 'v8', isRacing: true, familyKey: 'ford-mustang',
  note: 'Действующая программа Ford в NASCAR Cup Series — единый для всех марок "Next Gen" шасси с 2022г., кузов по мотивам Mustang S650. 5.86L (358ci) атмо V8, 670hp на обычных трассах / 510hp с рестриктором на суперскоростных овалах (Дейтона/Талladega). Стальная трубчатая рама, независимая задняя подвеска (впервые в NASCAR), 5-ст. секвентальная КПП. Обновлён под кузов Dark Horse с сезона 2024.',
}, 'ford-mustang-s650', 'derived_from', 0.6)

fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
console.log(`\n✅ Готово. Узлов: ${graph.nodes.length}, рёбер: ${graph.edges.length}`)
