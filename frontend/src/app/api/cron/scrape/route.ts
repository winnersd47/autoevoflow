/**
 * GET /api/cron/scrape?secret=<CRON_SECRET>
 *
 * HTTP-эндпоинт для внешних планировщиков (cron-job.org, uptime kuma, etc.)
 * Вызывает node scripts/scrape-latest.js на сервере.
 *
 * Настройка secret: CRON_SECRET=your_secret в .env.local
 * Если CRON_SECRET не задан — принимает любой запрос (для локальной разработки).
 *
 * Примеры использования:
 *   cron-job.org  → URL: https://yoursite.com/api/cron/scrape?secret=xxx  каждые 6ч
 *   curl locally  → curl http://localhost:3200/api/cron/scrape
 *   Vercel Cron   → vercel.json crons: path=/api/cron/scrape schedule=0-star-slash-6-star-star
 */
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = req.nextUrl.searchParams.get('secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const script = path.join(process.cwd(), 'scripts', 'scrape-latest.js')
  const start  = Date.now()

  return new Promise<NextResponse>(resolve => {
    exec(`node "${script}"`, { cwd: process.cwd(), timeout: 60000 }, (err, stdout, stderr) => {
      const elapsed = Date.now() - start
      if (err) {
        console.error('[/api/cron/scrape] error:', err.message)
        return resolve(NextResponse.json({
          ok: false, error: err.message, stderr: stderr.substring(0, 500), elapsed,
        }, { status: 500 }))
      }
      const lines  = stdout.trim().split('\n')
      const result = lines[lines.length - 1] || stdout.trim()
      return resolve(NextResponse.json({ ok: true, result, elapsed }))
    })
  })
}
