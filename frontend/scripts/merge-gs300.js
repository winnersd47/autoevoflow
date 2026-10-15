#!/usr/bin/env node
// Разовый скрипт: публикует ОДИН объединённый пост про 1994 Lexus GS300 вместо
// двух дублей (были опубликованы в один прогон из-за бага в extractModelKey,
// уже исправленного). Старые два поста НЕ трогаем (нет их message_id) — по
// решению пользователя просто добавляем один новый, обобщающий оба источника.
//
// НЕ 'use strict': eval() ниже должен остаться СЛАБЫМ (sloppy) режимом — иначе
// function-декларации из publish-new-stories.js не утекут в эту область
// видимости (в strict-eval вообще ничего не утекает, даже function-декларации).
const fs   = require('fs')
const path = require('path')

// Тот же самодельный .env.local загрузчик, что в publish-new-stories.js (dotenv
// не установлен как зависимость проекта) — нужен ДО eval, т.к. eval начинается
// после этого блока в оригинальном файле.
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

// const-биндинги (LATEST_JSON и т.п.) НЕ утекают наружу из eval даже в нестрогом
// режиме — это поведение let/const по спеке, а не strict mode. Функции же
// (function-декларации) утекают и работают нормально: их замыкания по-прежнему
// видят BRAND_MAP/GRAPH_JSON/т.п. изнутри eval, просто снаружи нельзя обратиться
// к самим константам по имени — поэтому пути ниже продублированы локально.
const LATEST_JSON   = path.join(__dirname, '../public/data/latest-cars.json')
const PUBLISHED_IDS = path.join(__dirname, '../public/data/published-ids.json')

const src = fs.readFileSync(path.join(__dirname, 'publish-new-stories.js'), 'utf8')
const body = src.slice(src.indexOf('const LATEST_JSON'), src.indexOf('main().catch'))
eval(body)

async function run() {
  const data = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf-8'))
  const ids = [
    'cad-photos-g71109611-1994-lexus-gs300-archive-test-gallery',
    'cad-reviews-a71051423-1994-lexus-gs300-archive-test',
  ]
  const cars = ids.map(id => data.cars.find(c => c.id === id)).filter(Boolean)
  if (cars.length !== 2) throw new Error(`Ожидал 2 car объекта, нашёл ${cars.length}`)

  const car = mergeGroup(cars)
  console.log('Объединяю:', cars.map(c => c.name).join(' + '))
  console.log('Источники для ресёрча:', car._sourceUrls)

  const channelId = process.env.TELEGRAM_CHANNEL_ID
  if (!channelId) throw new Error('TELEGRAM_CHANNEL_ID не задан')

  const graph  = loadGraph()
  const ctx    = getGraphContext(car, graph)
  const format = pickFormat(car.id || car.name)
  const { story, research, provider } = await generateStory(car, ctx, format)

  // Картинка — та же логика, что в publishCar
  const scraperImage = car.imageUrl?.startsWith('http') ? car.imageUrl
    : car.thumbUrl?.startsWith('http') ? car.thumbUrl : null
  car.imageUrl = null
  car.previewUrl = null
  if (scraperImage) {
    car.imageUrl = scraperImage
    console.log('Картинка: скрапер')
  } else if (research.pressImage) {
    car.imageUrl = research.pressImage
    console.log('Картинка: пресс-фото')
  }

  const sent = await publishToTelegram(car, story, channelId)
  console.log(`✅ Опубликовано объединённое сообщение [${provider}], message_id=${sent.messageId}`)

  // Помечаем обе исходные статьи как опубликованные под общим ключом, чтобы
  // будущий скрейп той же пары не создал третий дубль.
  const key = extractModelKey(car)
  const saved = fs.existsSync(PUBLISHED_IDS) ? JSON.parse(fs.readFileSync(PUBLISHED_IDS, 'utf-8')) : { ids: [], keys: [], records: {} }
  const publishedIds = new Set(saved.ids || [])
  ids.forEach(id => publishedIds.add(id))
  const publishedKeys = new Set(saved.keys || [])
  publishedKeys.add(key)
  const records = saved.records || {}
  records[key] = { messageId: sent.messageId, hasPhoto: !!sent.hasPhoto, ids, updatedAt: new Date().toISOString() }
  fs.writeFileSync(PUBLISHED_IDS, JSON.stringify({
    ids: [...publishedIds], keys: [...publishedKeys], records,
    updatedAt: new Date().toISOString(), total: publishedIds.size,
  }, null, 2))
  console.log('published-ids.json обновлён (ключ:', key, ')')
}

run().catch(e => { console.error('ОШИБКА:', e.message); process.exit(1) })
