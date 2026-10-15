#!/usr/bin/env node
/**
 * find-telegram-gaps.js — находит статьи из public/data/latest-cars.json,
 * которые НЕ попали в Telegram не потому что уже опубликованы, а потому что
 * автоматические эвристики publish-new-stories.js их отфильтровали:
 *   - isClickbaitHeadline() — заголовок похож на редакционный кликбейт
 *   - isGenuineNewRelease() — похоже на ретро/архивную статью (не новинка)
 *
 * Обе эвристики судят ТОЛЬКО по заголовку/описанию из RSS — они намеренно
 * консервативны и могут ошибаться (например, реальная новая модель с
 * кликбейтным заголовком у источника вроде Car and Driver). Это первый
 * фильтр для регулярной задачи-аудита: каждый кандидат тут должен быть
 * перепроверен по РЕАЛЬНОМУ тексту статьи, не только по заголовку, прежде
 * чем публиковать через `node scripts/publish-new-stories.js --car-id <id>`.
 *
 * Не трогает: пропуски из-за GOOD_SOURCES (список источников для публикации) —
 * это отдельная, гораздо более редкая категория, и по состоянию на 2026-08-24
 * все скрапящиеся источники уже в GOOD_SOURCES. Не трогает и "просто ещё не
 * дошла очередь" (лимит 3 новых поста за прогон) — это не пропуск, а нормальный
 * бэклог, сам рассосётся за несколько прогонов.
 *
 * Usage: node scripts/find-telegram-gaps.js [--out=path.json]
 */
'use strict'
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const LATEST_JSON = path.join(ROOT, 'public/data/latest-cars.json')
const PUBLISHED_IDS = path.join(ROOT, 'public/data/published-ids.json')
const outArg = process.argv.find(a => a.startsWith('--out='))
const OUT_JSON = outArg ? outArg.slice(6) : path.join(ROOT, 'public/data/telegram-gap-candidates.json')

const latest = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf8'))
const cars = latest.cars || []
const pub = fs.existsSync(PUBLISHED_IDS) ? JSON.parse(fs.readFileSync(PUBLISHED_IDS, 'utf8')) : { ids: [], keys: [] }
const publishedIds = new Set(pub.ids || [])
const publishedKeys = new Set(Object.keys(pub.records || {}))

// ── Копии эвристик publish-new-stories.js (держать в синхроне при правках там) ──
const RETRO_PHRASES = /\b(retrospective|throwback|anniversary of|\d+\s*years?\s*later|remembering|looking?\s+back|history of|reunion|barn find)\b/i
function isGenuineNewRelease(car) {
  const year = parseInt(String(car.year || '').match(/\d{4}/)?.[0] || '0', 10)
  const currentYear = new Date().getFullYear()
  if (year && year < currentYear - 1) return false
  const text = `${car.name || ''} ${car.fullName || ''} ${car.description || ''}`
  if (RETRO_PHRASES.test(text)) return false
  return true
}
const CLICKBAIT_PHRASES = /\b(wasn.t (supposed|meant|ready) to|you won.t believe|here.s (why|what|how)|this is why|isn.t what (it|you) (seems|think)|is not what (it|you) (seems|think)|will (shock|surprise) you|the truth about|everything you need to know|what happened (next|when)|nobody (expected|saw)|no one (expected|saw)|why .+ (matters|changes everything)|changes everything)\b/i
function isClickbaitHeadline(car) {
  const text = `${car.name || ''} ${car.fullName || ''}`
  return CLICKBAIT_PHRASES.test(text)
}
const NCS_SOURCES = new Set(['netcarshow', 'netcarshow-concept'])

const clickbaitCandidates = []
const retroCandidates = []

for (const car of cars) {
  if (publishedIds.has(car.id)) continue
  // NCS не проходит через isGenuineNewRelease в обычном режиме — не проверяем его тут
  if (isClickbaitHeadline(car)) {
    clickbaitCandidates.push({ id: car.id, source: car.source, brand: car.brand, name: car.name, year: car.year, pageUrl: car.pageUrl })
    continue
  }
  if (!NCS_SOURCES.has(car.source) && !isGenuineNewRelease(car)) {
    retroCandidates.push({ id: car.id, source: car.source, brand: car.brand, name: car.name, year: car.year, description: car.description, pageUrl: car.pageUrl })
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  clickbaitCandidates,
  retroCandidates,
}

console.log(`Отфильтровано как кликбейт (требует перепроверки по тексту статьи): ${clickbaitCandidates.length}`)
console.log(`Отфильтровано как ретро/архив (требует перепроверки): ${retroCandidates.length}`)

fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf8')
console.log(`\nКандидаты записаны в ${OUT_JSON}`)
console.log('Каждый кандидат нужно перепроверить по РЕАЛЬНОМУ тексту статьи (pageUrl),')
console.log('не только по заголовку — заголовочные эвристики специально консервативны')
console.log('и намеренно дают false positives (лучше пропустить реальную новинку и найти')
console.log('её тут, чем случайно опубликовать кликбейт/ретро-статью как факт о модели).')
