#!/usr/bin/env node
/**
 * announce-graph-additions.js — постит в Telegram сводку о моделях, которые
 * регулярный цикл (см. scripts/find-graph-gaps.js + промпт задачи) только что
 * добавил в граф эволюции. Отдельный от publish-new-stories.js смысл: там —
 * пост-факт про КОНКРЕТНУЮ новую машину со своей AI-историей и связями, тут —
 * короткая сводка "вот что добавилось в базу графа за этот проход", без
 * генерации текста моделью (только факты из уже принятых решений).
 *
 * Использует ту же пару env-переменных, что publish-new-stories.js
 * (TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID) — тот же канал.
 *
 * Usage:
 *   node scripts/announce-graph-additions.js --file=path/to/additions.json
 *   (additions.json — массив объектов {id, label, brandName, year, note?})
 *
 *   node scripts/announce-graph-additions.js --dry --file=...   # без отправки
 */
'use strict'
const fs = require('fs')
const path = require('path')

// ─── Загрузка .env.local (тот же паттерн, что publish-new-stories.js) ────────
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

function tgBase() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
}
async function tgRequest(method, body) {
  const res = await fetch(`${tgBase()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`TG ${method}: ${data.description}`)
  return data
}

function buildMessage(additions) {
  const lines = []
  lines.push(`🗂 <b>Обновление графа эволюции</b> — добавлено ${additions.length} ${plural(additions.length)}:`)
  lines.push('')
  for (const a of additions) {
    // Некоторые label уже сами оканчиваются на "(год)" — не дублировать его.
    const labelHasYear = /\(\d{4}\)\s*$/.test(a.label || '')
    const year = (a.year && !labelHasYear) ? ` (${a.year})` : ''
    lines.push(`• <b>${escapeHtml(a.brandName || '')} ${escapeHtml(a.label)}</b>${year}`)
  }
  lines.push('')
  lines.push('Подробности и связи — в интерактивном графе на сайте.')
  return lines.join('\n')
}
function plural(n) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'модель'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'модели'
  return 'моделей'
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function main() {
  const fileArg = process.argv.find(a => a.startsWith('--file='))
  const isDry = process.argv.includes('--dry')
  if (!fileArg) { console.error('Нужен --file=path/to/additions.json'); process.exit(1) }
  const additions = JSON.parse(fs.readFileSync(fileArg.slice(7), 'utf8'))
  if (!Array.isArray(additions) || additions.length === 0) {
    console.log('[announce] Пустой список добавлений — рассылка не нужна.')
    return
  }

  const text = buildMessage(additions)

  if (isDry) {
    console.log('--- DRY RUN, сообщение не отправлено ---')
    console.log(text)
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.TELEGRAM_CHANNEL_ID
  if (!token || token === 'your_bot_token_here') { console.log('[announce] TELEGRAM_BOT_TOKEN не задан — пропускаю'); return }
  if (!channelId || channelId === 'your_channel_id_here') { console.log('[announce] TELEGRAM_CHANNEL_ID не задан — пропускаю'); return }

  await tgRequest('sendMessage', { chat_id: channelId, text, parse_mode: 'HTML' })
  console.log(`[announce] ✅ Отправлено в Telegram: ${additions.length} ${plural(additions.length)}`)
}

main().catch(e => { console.error('[announce] ОШИБКА:', e.message); process.exit(1) })
