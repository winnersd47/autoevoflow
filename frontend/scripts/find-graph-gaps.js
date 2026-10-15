#!/usr/bin/env node
/**
 * find-graph-gaps.js — сверяет public/data/latest-cars.json (вывод скрайпера)
 * против public/data/evolution/graph.json и находит модели, которых в графе
 * ещё нет. Первый шаг регулярного цикла "новинки скрайпера → граф эволюции";
 * дальше кандидатов нужно вручную/агентом проверить на реальность и дубли
 * (см. README-секцию ниже) прежде чем писать в граф.
 *
 * КРИТИЧНО про матчинг: бренд обязательно вычитается из токенов КАНДИДАТА
 * (не только из токенов ноды графа) — иначе "Rivian R1T" не матчится с уже
 * добавленным rivian-r1t-gen2 (label "R1T Gen.2"), потому что "rivian" сам
 * становится ложным "核"-токеном и не совпадает с "r1t". Живой баг, пойманный
 * в этой самой сессии — 2026-08-24 v1 без вычитания дал 68 ложных "пропущено"
 * из 101 кандидата (Rivian R1T/R1S, Czinger 21C Spyder, GAC Yue7, оба Geely,
 * Maserati MCPura и др. уже были в графе).
 *
 * Год НЕ участвует в дедупе строго — допуск ±3 года, потому что одна и та же
 * модель у разных источников/статей часто датирована по-разному (год ревила
 * vs год старта продаж vs год статьи). Пропущенных дублей всё равно будет
 * ощутимо больше, чем поймает эта эвристика — следующий шаг цикла (веб-поиск
 * по каждому кандидату) обязан САМ перепроверить существование в графе более
 * широким поиском (см. промпт регулярной задачи), не доверять этому скрипту
 * слепо. Пример живого пропуска в этой же сессии: label ноды "Gordon Murray
 * Automotive S1" не матчился с кандидатом "Gordon Murray S1" — токен
 * "Automotive" в лейбле ноды не входит ни в бренд, ни в основное имя модели,
 * и эвристика приняла его за "核"-токен вместо "s1".
 *
 * Usage: node scripts/find-graph-gaps.js [--out=path.json]
 */
'use strict'
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const LATEST_JSON = path.join(ROOT, 'public/data/latest-cars.json')
const GRAPH_JSON  = path.join(ROOT, 'public/data/evolution/graph.json')
const outArg = process.argv.find(a => a.startsWith('--out='))
const OUT_JSON = outArg ? outArg.slice(6) : path.join(ROOT, 'public/data/graph-gap-candidates.json')

const latest = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf8'))
const cars = latest.cars || []
const g = JSON.parse(fs.readFileSync(GRAPH_JSON, 'utf8'))
const graphBrandIds = new Set(g.nodes.map(n => n.brandId))

function tokenize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
}

// Известные несовпадения между c.brand/brandSlug из скрайпера и brandId графа.
const BRAND_SLUG_MAP = {
  'mercedes-benz': 'mercedes', 'merc': 'mercedes', 'vw': 'volkswagen',
  'aston-martin': 'astonmartin', 'aston martin': 'astonmartin', 'aston': 'astonmartin',
  'rolls-royce': 'rolls-royce', 'rolls royce': 'rolls-royce',
  'land rover': 'land-rover', 'range rover': 'land-rover',
  'gordon': 'gordon-murray', 'gordon murray': 'gordon-murray',
  'brabus': 'astonmartin', // тюнер смоделирован под брендом донора, не своим brandId
}
function toBrandId(brandSlug, brand) {
  const bLower = (brand || '').toLowerCase()
  if (BRAND_SLUG_MAP[bLower]) return BRAND_SLUG_MAP[bLower]
  const s = (brandSlug || brand || '').toLowerCase().replace(/\s+/g, '-')
  return BRAND_SLUG_MAP[s] || s
}

// Кликбейт-заголовки/чисто-редакционные хуки — никогда не часть имени модели.
const CLICKBAIT_PHRASES = /\b(wasn.t (supposed|meant|ready) to|you won.t believe|here.s (why|what|how)|this is why|isn.t what (it|you) (seems|think)|is not what (it|you) (seems|think)|will (shock|surprise) you|the truth about|everything you need to know|what happened (next|when)|nobody (expected|saw)|no one (expected|saw)|why .+ (matters|changes everything)|changes everything|finally|after just \d|brutally|mogs|starts at|price starts|costs \$|test:|-proofed|wants to|driven:)\b/i

// Явные признаки рутинного трима/пакета опций у УЖЕ отслеживаемого поколения —
// не самостоятельный кандидат на новый узел (см. README регулярной задачи —
// финальное решение всё равно за агентом-исследователем, это только фильтр
// самых очевидных случаев для экономии токенов на исследование).
const ROUTINE_TRIM_WORDS = /\b(hybrid|phev|upland|smoky mountain|updated|refresh|estate|celebrates|anniversary|ups screen)\b/i

function coreName(name) {
  let n = (name || '').toLowerCase().replace(/^\d{4}\s+/, '')
  n = n.split(':')[0]
  n = n.split(/['’]/)[0]
  n = n.replace(/\b(test|driven|wants to|finally|looks sleeker|costs|starts at|price starts|after just).*$/i, '')
  return n.replace(/[^a-z0-9]+/g, ' ').trim()
}

const GEN_SUFFIX_RE = /\([a-z]{1,3}\d{0,3}\)|\b(?:gen\.?\s?\d+|mk\s?\d+|\biii\b|\bii\b|\biv\b)\b/gi
function nodeTokens(n) {
  const brandWords = tokenize(n.brandId.replace(/-/g, ' '))
  return tokenize((n.label || '').replace(GEN_SUFFIX_RE, ' ')).filter(t => !brandWords.includes(t))
}

const nodesByBrand = new Map()
for (const n of g.nodes) {
  if (!nodesByBrand.has(n.brandId)) nodesByBrand.set(n.brandId, [])
  nodesByBrand.get(n.brandId).push(n)
}

function findExistingMatch(brandId, name, year) {
  const bucket = nodesByBrand.get(brandId)
  if (!bucket) return null
  // Живой найденный баг: раньше вычитали слова бренда из токенов КАНДИДАТА по
  // сырому car.brand со скрайпера — а он часто урезан ("Gordon" вместо "Gordon
  // Murray", т.к. netcarshow берёт только первое слово названия как "бренд").
  // Токены НОДЫ при этом вычитаются по n.brandId ("gordon-murray" → оба слова).
  // Ассиметрия: "Murray" остаётся в кандидате как "core"-токен, но вычищен из
  // ноды — реально существующий "Gordon Murray Automotive S1" не матчился с
  // "Gordon Murray S1" и вечно всплывал как "отсутствует". Берём brandWords из
  // ТОГО ЖЕ brandId, что и nodeTokens() — гарантированная симметрия.
  const brandWords = tokenize(brandId.replace(/-/g, ' '))
  const candTokens = tokenize(coreName(name)).filter(t => !brandWords.includes(t))
  if (!candTokens.length) return null
  const core = candTokens[0]
  // Живой найденный баг №3: "Denza Z9GT" (кандидат, без пробела) токенизуется
  // в один токен "z9gt", а нода "Denza Z9 GT" (с пробелом в лейбле) — в два
  // токена "z9"+"gt". Разное форматирование одного и того же алфавитно-
  // цифрового кода модели у разных источников — обычное дело. "Склеенное"
  // сравнение без пробелов ловит это независимо от токенизации.
  const candJoined = candTokens.join('')
  let best = null, bestOverlap = -1, bestYearDiff = Infinity
  for (const n of bucket) {
    const nt = nodeTokens(n)
    if (!nt.length) continue
    if (nt.join('') === candJoined) {
      const yearDiff = Math.abs((n.year || 0) - (year || 0))
      if (yearDiff > 3) continue
      if (candTokens.length > bestOverlap || (candTokens.length === bestOverlap && yearDiff < bestYearDiff)) {
        best = n; bestOverlap = candTokens.length; bestYearDiff = yearDiff
      }
      continue
    }
    if (nt[0] !== core && !nt.includes(core)) continue
    const overlap = candTokens.filter(t => nt.includes(t)).length
    // Живой найденный баг №2: старый score = overlap - yearDiff*0.1 с порогом
    // >=1 отбрасывал ДАЖЕ полное совпадение всех токенов кандидата, если год
    // отличался на 2+ (обычная ситуация — год ревила vs год статьи у разных
    // источников). Теперь требуем ПОЛНОГО покрытия токенов кандидата (без
    // компромисса), а год — только как сортировка среди полных совпадений.
    if (overlap < candTokens.length) continue
    const yearDiff = Math.abs((n.year || 0) - (year || 0))
    if (yearDiff > 3) continue
    if (overlap > bestOverlap || (overlap === bestOverlap && yearDiff < bestYearDiff)) {
      best = n; bestOverlap = overlap; bestYearDiff = yearDiff
    }
  }
  return best
}

const missingKnownBrand = new Map()
const unknownBrand = new Map()
const alreadyCovered = []
const routineSkipped = []

for (const c of cars) {
  if (!c.year || !c.name) continue
  if (CLICKBAIT_PHRASES.test(c.name)) continue
  const brandId = toBrandId(c.brandSlug, c.brand)
  const core = coreName(c.name)
  const dedupKey = brandId + '|' + core

  const match = findExistingMatch(brandId, c.name, c.year)
  if (match) {
    alreadyCovered.push({ brand: c.brand, name: c.name, year: c.year, matchedNode: match.id, matchedLabel: match.label, matchedYear: match.year })
    continue
  }

  if (ROUTINE_TRIM_WORDS.test(c.name) && graphBrandIds.has(brandId)) {
    routineSkipped.push({ brand: c.brand, name: c.name, year: c.year, source: c.source })
    continue
  }

  const target = graphBrandIds.has(brandId) ? missingKnownBrand : unknownBrand
  if (!target.has(dedupKey)) target.set(dedupKey, { brand: c.brand, brandSlug: c.brandSlug, name: c.name, year: c.year, sources: [] })
  target.get(dedupKey).sources.push(c.source)
}

const result = {
  generatedAt: new Date().toISOString(),
  alreadyCoveredCount: alreadyCovered.length,
  routineSkippedCount: routineSkipped.length,
  missingKnownBrand: [...missingKnownBrand.values()],
  unknownBrand: [...unknownBrand.values()],
}

console.log(`Уже покрыто (fuzzy match): ${alreadyCovered.length}`)
console.log(`Пропущено как рутинный трим/пакет: ${routineSkipped.length}`)
console.log(`Бренд есть, модели нет: ${result.missingKnownBrand.length}`)
console.log(`Бренда вообще нет: ${result.unknownBrand.length}`)

fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf8')
console.log(`\nКандидаты записаны в ${OUT_JSON}`)
console.log('ВАЖНО: этот список — только первый фильтр. Каждый кандидат ДОЛЖЕН быть')
console.log('проверен веб-поиском на реальность/дубли/рутинность перед записью в граф —')
console.log('этот скрипт сам по себе пропускает реальные совпадения (см. комментарий')
console.log('в шапке файла), доверять его выводу слепо нельзя.')
