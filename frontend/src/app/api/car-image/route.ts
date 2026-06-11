/**
 * GET /api/car-image?slug=<modelSlug>
 *
 * Прокси для обоев модели. caricos.com отдаёт картинку только при наличии
 * Referer своего домена (hotlink protection) — браузерный <img> с нашего
 * домена получает HTML-заглушку. Этот серверный route запрашивает картинку
 * с правильным Referer и стримит её клиенту.
 *
 * Безопасность: slug валидируется ([a-z0-9-]); URL берётся ТОЛЬКО из
 * локального доверенного JSON (public/data/models/<slug>.json) — без SSRF.
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? ''
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return new NextResponse('bad slug', { status: 400 })
  }

  // Читаем URL картинки только из локального доверенного файла модели
  const file = path.join(process.cwd(), 'public', 'data', 'models', `${slug}.json`)
  if (!fs.existsSync(file)) {
    return new NextResponse('model not found', { status: 404 })
  }

  let imgUrl = ''
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    imgUrl = (data.heroImageUrl || data.thumbnailUrl || '') as string
  } catch {
    return new NextResponse('parse error', { status: 500 })
  }
  if (!imgUrl) return new NextResponse('no image', { status: 404 })

  // Определяем источник изображения и соответствующий Referer
  const isCaricos    = /^https:\/\/images\.caricos\.com\//.test(imgUrl)
  const isNetCarShow = /^https:\/\/www\.netcarshow\.com\//.test(imgUrl)
  if (!isCaricos && !isNetCarShow) {
    return new NextResponse('no image', { status: 404 })
  }

  const referer = isCaricos ? 'https://www.caricos.com/' : 'https://www.netcarshow.com/'

  try {
    const upstream = await fetch(imgUrl, {
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    })
    const ct = upstream.headers.get('content-type') || ''
    if (!upstream.ok || !ct.startsWith('image/')) {
      return new NextResponse('upstream unavailable', { status: 502 })
    }

    const buf = await upstream.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, immutable',  // кэш на неделю
      },
    })
  } catch {
    return new NextResponse('fetch failed', { status: 502 })
  }
}
