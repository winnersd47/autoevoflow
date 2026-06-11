/**
 * scheduler.js — встроенный планировщик обновления новинок авто
 *
 * БЕСПЛАТНЫЕ альтернативы Claude Code Scheduled Tasks:
 *
 *   1. Node-cron (этот файл) — запустить: node scripts/scheduler.js
 *      Работает пока запущен процесс. Добавьте в pm2 / systemd для фона.
 *
 *   2. Windows Task Scheduler (рекомендуется для стабильности):
 *      Запустите: scripts\setup-scheduler.bat
 *      Создаст задание, которое работает независимо от этого сервера.
 *
 *   3. cron-job.org (полностью внешний):
 *      Создайте задание на https://cron-job.org (бесплатно)
 *      URL: http://localhost:3200/api/cron/scrape  (или публичный адрес)
 *      Интервал: каждые 6 часов
 *
 * Интервал по умолчанию: каждые 6 часов (можно изменить INTERVAL_HOURS).
 */

const { execSync, spawn } = require('child_process')
const path   = require('path')
const fs     = require('fs')

const INTERVAL_HOURS = 6           // как часто обновлять (в часах)
const SCRIPT = path.join(__dirname, 'scrape-latest.js')
const LOG    = path.join(__dirname, '../.scheduler.log')

function timestamp() {
  return new Date().toISOString().replace('T',' ').substring(0,19)
}

function log(msg) {
  const line = `[${timestamp()}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG, line + '\n', 'utf8')
}

async function runScraper() {
  log('🔄 Запуск парсера новинок…')
  return new Promise(resolve => {
    const proc = spawn('node', [SCRIPT], {
      cwd: path.dirname(SCRIPT),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    proc.stdout.on('data', d => { out += d; process.stdout.write(d) })
    proc.stderr.on('data', d => { out += d; process.stderr.write(d) })
    proc.on('close', code => {
      if (code === 0) log('✅ Парсер завершён успешно')
      else            log(`❌ Парсер завершён с кодом ${code}`)
      resolve(code === 0)
    })
    proc.on('error', e => { log(`❌ Ошибка запуска: ${e.message}`); resolve(false) })
  })
}

// ─── Проверка зависимостей ────────────────────────────────────────────────────
function tryNativeCron() {
  try {
    require.resolve('node-cron')
    return true
  } catch { return false }
}

// ─── Запуск ───────────────────────────────────────────────────────────────────
async function main() {
  log(`🚀 Планировщик запущен (интервал: каждые ${INTERVAL_HOURS} ч.)`)
  log(`   Для остановки: Ctrl+C`)
  log(`   Лог: ${LOG}`)

  // Запуск сразу при старте
  await runScraper()

  const ms = INTERVAL_HOURS * 60 * 60 * 1000

  if (tryNativeCron()) {
    // ── Вариант A: node-cron (если установлен npm install node-cron) ──────────
    const cron = require('node-cron')
    const expr = `0 */${INTERVAL_HOURS} * * *`  // каждые N часов
    log(`   Расписание (node-cron): ${expr}`)
    cron.schedule(expr, async () => {
      await runScraper()
    })
    log('   node-cron активен. Ожидание…')
  } else {
    // ── Вариант B: встроенный setInterval (всегда доступен) ───────────────────
    log(`   node-cron не установлен → setInterval (каждые ${INTERVAL_HOURS}ч.)`)
    log(`   Для cron-точности: npm install node-cron`)
    setInterval(async () => {
      await runScraper()
    }, ms)
    log('   setInterval активен. Ожидание…')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
