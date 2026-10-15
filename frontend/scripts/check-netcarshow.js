/**
 * check-netcarshow.js — лёгкая проверка доступности NetCarShow, отдельно от
 * основного 6-часового цикла scrape-latest.js.
 *
 * NetCarShow лежит (TCP-коннект виснет по таймауту — похоже на блокировку на
 * уровне сети, не на стороне самого скрипта). Пока ждём, когда отдаст — гонять
 * из-за этого весь тяжёлый scrape-latest.js (все источники + AI-генерация +
 * публикация) слишком часто не нужно. Этот скрипт делает только один быстрый
 * fetch, пишет статус в public/data/netcarshow-status.json и, если сайт ожил
 * после серии неудач, сам поднимает полный цикл — чтобы не ждать следующего
 * 6-часового окна.
 *
 * Запуск вручную: node scripts/check-netcarshow.js
 * Авто: планировщик Windows, каждые 15 минут (см. run-check-netcarshow.bat)
 */
'use strict'
const fs   = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT        = path.join(__dirname, '..')
const STATUS_JSON = path.join(ROOT, 'public/data/netcarshow-status.json')
const URL         = 'https://www.netcarshow.com/latest-cars.html'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Accept': 'text/html,application/xml,application/rss+xml,*/*;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

function loadStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_JSON, 'utf-8'))
  } catch {
    return { ok: false, consecutiveFails: 0, consecutiveOk: 0, lastSuccess: null, lastCheck: null, lastFailReason: null }
  }
}

function saveStatus(status) {
  fs.mkdirSync(path.dirname(STATUS_JSON), { recursive: true })
  fs.writeFileSync(STATUS_JSON, JSON.stringify(status, null, 2))
}

async function main() {
  const prev = loadStatus()
  const now  = new Date().toISOString()

  let ok = false
  let failReason = null
  try {
    const res = await fetch(URL, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000), redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await res.text()
    ok = true
  } catch (e) {
    failReason = e.message || String(e)
  }

  const wasDown = prev.consecutiveFails > 0
  const status = {
    ok,
    lastCheck: now,
    lastSuccess: ok ? now : prev.lastSuccess,
    lastFailReason: ok ? null : failReason,
    consecutiveFails: ok ? 0 : (prev.consecutiveFails || 0) + 1,
    consecutiveOk: ok ? (prev.consecutiveOk || 0) + 1 : 0,
  }
  saveStatus(status)

  if (ok && wasDown) {
    console.log(`[check-netcarshow] 🎉 NCS ОЖИЛ после ${prev.consecutiveFails} неудачных проверок подряд — запускаю полный цикл скрапинга`)
    try {
      execFileSync('node', [path.join(__dirname, 'scrape-latest.js')], {
        cwd: ROOT, stdio: 'inherit', timeout: 10 * 60 * 1000,
      })
    } catch (e) {
      console.error('[check-netcarshow] ошибка при запуске scrape-latest.js:', e.message)
    }
  } else if (ok) {
    console.log('[check-netcarshow] ✅ доступен')
  } else {
    console.log(`[check-netcarshow] ❌ недоступен (${status.consecutiveFails}x подряд): ${failReason}`)
  }
}

main().catch(e => { console.error('[check-netcarshow] ОШИБКА:', e.message); process.exit(0) })
