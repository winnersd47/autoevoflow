/**
 * telegram-sender.js — низкоуровневый модуль отправки в Telegram
 *
 * Принципы (из TELEGRAM_AUTOPOST_PROMPT.md):
 *  - Только sendMessage/sendPhoto/sendVideo, БЕЗ polling (BOT_POLLING=false)
 *  - UTF-8 через явный encode → bytes → Content-Type: application/json; charset=utf-8
 *  - Обрезка: текст ≤ 4096, подпись к медиа ≤ 1024
 *  - Пауза 1.5 сек между отправками в цикле
 */
'use strict'
const https = require('https')
const fs    = require('fs')
const path  = require('path')

// ── .env.local загрузка ───────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

const TOKEN      = process.env.TELEGRAM_BOT_TOKEN
const MAIN_ID    = process.env.TELEGRAM_CHANNEL_ID        // основной VIP-канал
const SECOND_ID  = process.env.TELEGRAM_CHANNEL_SECONDARY // второй канал (тизер, опционально)

if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN не задан в .env.local')

// ── HTTP POST через bytes (защита от кириллицы в PowerShell) ──────────────────
function tgPost(method, body) {
  return new Promise((resolve, reject) => {
    const bytes = Buffer.from(JSON.stringify(body), 'utf-8')
    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${TOKEN}/${method}`,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json; charset=utf-8',
        'Content-Length': bytes.length,
      },
    }
    const req = https.request(options, res => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const r = JSON.parse(data)
          if (!r.ok) reject(new Error(`TG API error: ${r.description} (method=${method})`))
          else resolve(r.result)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(bytes)
    req.end()
  })
}

// ── Обрезка по длине (по границе строки или пробела) ─────────────────────────
function truncate(text, limit) {
  if (!text || text.length <= limit) return text || ''
  const cut = text.slice(0, limit - 1)
  const lastNl = cut.lastIndexOf('\n')
  const lastSp = cut.lastIndexOf(' ')
  return cut.slice(0, Math.max(lastNl, lastSp, limit - 30)) + '…'
}

// ── Задержка ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Отправить текстовое сообщение (HTML parse_mode)
 * @param {string} chatId
 * @param {string} text
 */
async function sendText(chatId, text) {
  const safe = truncate(text, 4096)
  return tgPost('sendMessage', {
    chat_id:              chatId,
    text:                 safe,
    parse_mode:           'HTML',
    disable_notification: false,
    disable_web_page_preview: false,
  })
}

/**
 * Отправить фото по URL + подпись (HTML)
 * Подпись обрезается до 1024 символов.
 * @param {string} chatId
 * @param {string} photoUrl  — публичный URL изображения
 * @param {string} caption
 */
async function sendPhoto(chatId, photoUrl, caption) {
  const safe = truncate(caption, 1024)
  return tgPost('sendPhoto', {
    chat_id:              chatId,
    photo:                photoUrl,
    caption:              safe,
    parse_mode:           'HTML',
    disable_notification: false,
  })
}

/**
 * Отправить фото или fallback на текст если URL невалидный.
 */
async function sendPhotoOrText(chatId, photoUrl, caption, fallbackText) {
  try {
    if (photoUrl?.startsWith('http')) {
      return await sendPhoto(chatId, photoUrl, caption)
    }
  } catch (e) {
    console.warn(`sendPhoto failed (${e.message}), falling back to text`)
  }
  return sendText(chatId, fallbackText || caption)
}

/**
 * Отправить один пост в ОБА канала (main + secondary тизер).
 * Для вторичного канала obрезает текст и добавляет CTA.
 *
 * @param {object} opts
 * @param {string}  opts.mainText    — полный HTML-текст для VIP-канала
 * @param {string}  opts.teaserText  — короткий тизер (если не задан — авто-обрезка mainText)
 * @param {string}  [opts.photoUrl]  — URL изображения (опционально)
 * @param {string}  [opts.ctaUrl]    — ссылка для тизера «читать полностью»
 */
async function broadcast({ mainText, teaserText, photoUrl, ctaUrl }) {
  const results = {}

  // 1. Основной VIP-канал
  try {
    results.main = await sendPhotoOrText(MAIN_ID, photoUrl, truncate(mainText, 1024), mainText)
    console.log(`  ✓ main channel (${MAIN_ID})`)
  } catch (e) {
    console.error(`  ✗ main channel: ${e.message}`)
    results.mainError = e.message
  }

  // 2. Второй (бесплатный) канал — только если задан
  if (SECOND_ID) {
    await sleep(1500) // флуд-лимит
    const teaser = teaserText || buildAutoTeaser(mainText, ctaUrl)
    try {
      results.secondary = await sendText(SECOND_ID, teaser)
      console.log(`  ✓ secondary channel (${SECOND_ID})`)
    } catch (e) {
      console.error(`  ✗ secondary channel: ${e.message}`)
      results.secondaryError = e.message
    }
  }

  return results
}

/**
 * Авто-тизер: первые 600 символов + ссылка на VIP-канал
 */
function buildAutoTeaser(fullText, ctaUrl) {
  const preview = truncate(fullText, 600)
  const cta = ctaUrl
    ? `\n\n🔗 <a href="${ctaUrl}">Полный обзор</a>`
    : '\n\n<i>Полный разбор — в основном канале</i>'
  return preview + cta
}

module.exports = { sendText, sendPhoto, sendPhotoOrText, broadcast, sleep, truncate, MAIN_ID, SECOND_ID }
