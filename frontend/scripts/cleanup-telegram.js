'use strict'
/**
 * cleanup-telegram.js — удаляет последние N сообщений из канала
 * Запуск: node scripts/cleanup-telegram.js [--count 30]
 */
const fs   = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID
const BASE       = `https://api.telegram.org/bot${BOT_TOKEN}`

const args  = process.argv.slice(2)
const ci    = args.indexOf('--count')
const COUNT = ci !== -1 ? parseInt(args[ci + 1]) || 30 : 30

async function tg(method, body) {
  const res  = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  return res.json()
}

async function main() {
  // Отправляем зонд чтобы узнать последний message_id
  const probe = await tg('sendMessage', { chat_id: CHANNEL_ID, text: '🔧' })
  if (!probe.ok) { console.error('Не удалось отправить зонд:', probe.description); process.exit(1) }

  const latestId = probe.result.message_id
  console.log(`Последний message_id: ${latestId}`)
  console.log(`Удаляю ${COUNT} сообщений (id ${latestId - COUNT + 1}…${latestId})…`)

  const ids = Array.from({ length: COUNT }, (_, i) => latestId - i)

  // deleteMessages — Bot API 7.0, до 100 за раз
  const res = await tg('deleteMessages', { chat_id: CHANNEL_ID, message_ids: ids })
  if (res.ok) {
    console.log(`✅ Удалено (или не существовало): ${ids.length} сообщений`)
  } else {
    console.error('deleteMessages failed:', res.description)
    // Fallback: удаляем по одному
    let deleted = 0, skipped = 0
    for (const id of ids) {
      const r = await tg('deleteMessage', { chat_id: CHANNEL_ID, message_id: id })
      if (r.ok) deleted++; else skipped++
    }
    console.log(`✅ Удалено: ${deleted}, пропущено: ${skipped}`)
  }
}

main().catch(e => { console.error('ОШИБКА:', e.message); process.exit(1) })
