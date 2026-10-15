'use strict'
/**
 * test-telegram-post.js — тестовый пост в Telegram-канал
 * Публикует историю Ferrari 12Cilindri Manuale (сгенерировано Claude)
 * с реальным эволюционным контекстом из графа.
 *
 * Запуск: node scripts/test-telegram-post.js
 */
const fs   = require('fs')
const path = require('path')

// Загрузка .env.local
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

if (!BOT_TOKEN || BOT_TOKEN.startsWith('your_')) {
  console.error('TELEGRAM_BOT_TOKEN не задан в .env.local'); process.exit(1)
}
if (!CHANNEL_ID || CHANNEL_ID.startsWith('your_')) {
  console.error('TELEGRAM_CHANNEL_ID не задан в .env.local'); process.exit(1)
}

// ──── История ─────────────────────────────────────────────────────────────────
const CAR = {
  name:     'Ferrari 12Cilindri Manuale',
  year:     2027,
  brand:    'Ferrari',
  imageUrl: 'https://www.netcarshow.com/Ferrari-12Cilindri_Manuale-2027-wallpaper.jpg',
  pageUrl:  'https://www.netcarshow.com/ferrari/2027-12cilindri_manuale/',
}

// Эволюционная цепочка из графа:
// 1956 250 GT (300 л.с.) → 1968 Daytona (352) → 1984 Testarossa (390)
// → 1996 550 Maranello (485) → 2006 599 GTB (620) → 2012 F12 (730)
// → 2017 812 Superfast (800) → 2024 12Cilindri (830) → 2027 12Cilindri Manuale

const STORY = `🏛 <b>ИСТОРИЯ</b>

В 1947 году Энцо Феррари построил свой первый двигатель — <b>1.5-литровый V12</b>, рождённый из гоночной одержимости. С тех пор двенадцать цилиндров стали не просто техническим решением — они стали <i>душой Ferrari</i>.

Семь десятилетий. Восемь поколений флагманского V12 — каждое острее предыдущего.

🧬 <b>ЭВОЛЮЦИЯ</b>

Цепочка мощности Ferrari V12 — это хроника в цифрах:

<b>1956</b> · 250 GT — 300 л.с.
<b>1968</b> · 365 GTB/4 Daytona — 352 л.с.
<b>1984</b> · Testarossa — 390 л.с.
<b>1996</b> · 550 Maranello — 485 л.с.
<b>2006</b> · 599 GTB Fiorano — 620 л.с.
<b>2012</b> · F12 Berlinetta — 730 л.с.
<b>2017</b> · 812 Superfast — 800 л.с.
<b>2024</b> · 12Cilindri — 830 л.с.
<b>2027</b> · 12Cilindri <i>Manuale</i> — ∞

Каждые 10–12 лет — новый предел. Но в 2027 году Ferrari сделала нечто неожиданное: вернула ручную коробку передач.

⚡ <b>ЧТО ДЕЛАЕТ ЕЁ ОСОБЕННОЙ</b>

<b>1 499 экземпляров.</b> Число выбрано неслучайно: именно <i>1499 кубических сантиметров</i> составлял объём первого V12, построенного Феррари в 1947 году. ДНК, зашитая в тираж.

<b>830 л.с. через три педали.</b> Люди годами спорили, возможно ли это — слишком высокие обороты, слишком агрессивная кривая момента. Ferrari решила, что возможно.

Никакой автоматики сцепления. Никакого электро-ассистента. Только <i>рука, рычаг и момент.</i>

В мире, где каждый суперкар поставляется с PDK/DCT — это радикальный жест. Это не маркетинг «последнего шанса». Это заявление: аналоговое вождение — <b>не прошлое, это привилегия.</b>

🔮 <b>ПРОГНОЗ</b>

Ferrari последовательно строит «последние V12» уже лет десять — и каждый раз V12 оказывается живее, чем казалось. F12 tdf, 812 Competizione, Daytona SP3, 12Cilindri — это не прощания, это <i>апофеозы.</i>

С 2027-го у Ferrari появится полностью электрический суперкар. Но V12 с ручной коробкой — умышленный контрапункт. Ferrari говорит: мы идём в будущее, но мы не забываем, откуда пришли.

Через 10 лет эти 1 499 машин будут стоить неприличных денег. У каждого владельца — не просто Ferrari, а <b>последнее рукопожатие с 1947 годом.</b>`

// ──── Telegram API ────────────────────────────────────────────────────────────
async function tgRequest(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`TG ${method}: ${data.description}`)
  return data
}

async function main() {
  console.log(`📤 Публикация: ${CAR.name} → ${CHANNEL_ID}`)

  // Фото с подписью
  const caption = `<b>${CAR.name}</b> · ${CAR.year}\n<i>Ferrari — 75 лет эволюции V12</i>`
  try {
    await tgRequest('sendPhoto', {
      chat_id: CHANNEL_ID,
      photo:   CAR.imageUrl,
      caption,
      parse_mode: 'HTML',
    })
    console.log('  ✅ Фото отправлено')
    await new Promise(r => setTimeout(r, 1200))
  } catch (e) {
    console.log('  ⚠️  Фото не удалось:', e.message, '— продолжаю без фото')
  }

  // Заголовок поста
  const header = `<b>🏎 ${CAR.name}</b>\n` +
                 `<i>${CAR.year} · ${CAR.brand}</i>\n` +
                 `━━━━━━━━━━━━━━━━━━━━\n`

  const footer = `\n\n🔗 <a href="${CAR.pageUrl}">NetCarShow — первые подробности</a>`

  const fullText = header + STORY + footer

  // Разбивка если длиннее 4000 символов
  const chunks = []
  let text = fullText
  while (text.length > 4000) {
    const cut = text.lastIndexOf('\n\n', 4000)
    chunks.push(text.slice(0, cut > 0 ? cut : 4000))
    text = text.slice(cut > 0 ? cut : 4000)
  }
  chunks.push(text)

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 800))
    await tgRequest('sendMessage', {
      chat_id: CHANNEL_ID,
      text:    chunks[i],
      parse_mode: 'HTML',
      disable_web_page_preview: i > 0,
    })
    console.log(`  ✅ Часть ${i + 1}/${chunks.length} отправлена`)
  }

  console.log('\n🎉 Пост опубликован в канале!')
  console.log(`   Символов: ${fullText.length}`)
}

main().catch(e => {
  console.error('ОШИБКА:', e.message)
  process.exit(1)
})
