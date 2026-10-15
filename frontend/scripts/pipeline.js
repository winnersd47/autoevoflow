'use strict'
/**
 * pipeline.js — полный цикл: скрапинг → публикация в Telegram
 *
 * Запуск вручную: node scripts/pipeline.js
 * Запуск без публикации: node scripts/pipeline.js --dry-run
 */
const { spawnSync } = require('child_process')
const path = require('path')
const fs   = require('fs')

const ROOT    = path.join(__dirname, '..')
const LOG     = path.join(ROOT, '.pipeline.log')
const DRY_RUN = process.argv.includes('--dry-run')

function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19) }
function log(msg) {
  const line = `[${ts()}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG, line + '\n', 'utf8')
}

function run(label, scriptName, extraArgs = []) {
  const scriptPath = path.join(__dirname, scriptName)
  log(`▶ ${label}…`)
  const result = spawnSync('node', [scriptPath, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5 * 60 * 1000, // 5 min
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    log(`✗ ${label} завершился с кодом ${result.status}`)
    return false
  }
  log(`✓ ${label} завершён`)
  return true
}

async function main() {
  log('═══════════════════════════════════════')
  log(`🚀 Pipeline старт${DRY_RUN ? ' (dry-run)' : ''}`)

  // Шаг 1: парсинг новинок → latest-cars.json
  const scraped = run('Scraper', 'scrape-latest.js')
  if (!scraped) {
    log('⚠ Скрапер упал — публикацию пропускаем')
    process.exit(1)
  }

  // Шаг 2: публикация в Telegram (до 3 постов за раз)
  const publishArgs = DRY_RUN ? ['--dry-run'] : []
  run('Telegram publisher', 'publish-new-stories.js', publishArgs)

  log('✅ Pipeline завершён')
}

main().catch(e => { log(`💥 Fatal: ${e.message}`); process.exit(1) })
