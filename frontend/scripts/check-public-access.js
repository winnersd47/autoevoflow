/**
 * check-public-access.js — регресс-гард доступности витрины.
 *
 * Ловит баг, когда auth-middleware (src/middleware.ts) ошибочно гейтит
 * статические данные/витрину → fetch('/data/...') редиректится на /login →
 * «Нет данных». Запуск: `npm run check:access` (нужен запущенный dev/prod-сервер).
 *
 * Публичные пути НЕ должны редиректиться на /login. Gated — должны.
 * Выход 1 при нарушении публичного доступа (можно ставить в CI/после деплоя).
 */
const http = require('http')
const BASE = process.env.BASE_URL || 'http://localhost:3200'

// должны быть доступны БЕЗ auth (НЕ редирект на /login)
const PUBLIC = [
  '/data/evolution/graph.json',
  '/data/brands/volkswagen.json',
  '/evolution',
  '/brands',
  '/api/car-image?slug=ford-mustang',  // прокси: 200/404 ок, лишь бы не /login
]
// должны быть ПОД auth (редирект на /login без токена)
const GATED = ['/dashboard', '/compare']

function probe(path) {
  return new Promise(resolve => {
    const req = http.get(BASE + path, res => {
      res.resume()  // drain без хранения тела
      resolve({ status: res.statusCode, location: res.headers.location || '' })
    })
    req.on('error', () => resolve({ status: 0, location: '' }))
    req.setTimeout(20000, () => { req.destroy(); resolve({ status: 0, location: 'timeout' }) })
  })
}
const toLogin = r => r.status >= 300 && r.status < 400 && /\/login/.test(r.location)

;(async () => {
  let fail = 0
  console.log('Проверка публичного доступа на', BASE, '\n')
  for (const p of PUBLIC) {
    const r = await probe(p)
    if (toLogin(r) || r.status === 0) { console.log('✖ PUBLIC заблокирован:', p, '→', r.status, r.location); fail++ }
    else console.log('✓ public:', p, '→', r.status)
  }
  for (const p of GATED) {
    const r = await probe(p)
    if (toLogin(r)) console.log('✓ gated:', p, '→ /login (auth работает)')
    else console.log('⚠ gated НЕ под auth:', p, '→', r.status, '(ожидался редирект на /login)')
  }
  if (fail) {
    console.log('\n✖ Публичный доступ НАРУШЕН. Проверь src/middleware.ts: matcher ОБЯЗАН исключать')
    console.log('  /data, /images и публичные API-прокси (см. ARCHITECTURE.md → границы доступа).')
    process.exit(1)
  }
  console.log('\n✅ Публичный доступ в порядке — статика и витрина доступны без auth.')
  process.exit(0)
})()
