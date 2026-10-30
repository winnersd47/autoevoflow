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

  // Белый список доверенных хостов (SSRF-защита) + Referer, нужный тем из
  // них, что проверяют hotlink (caricos/netcarshow). null — Referer не нужен
  // (Wikimedia и обычные новостные CDN hotlink не проверяют).
  const TRUSTED_HOSTS: Record<string, string | null> = {
    'images.caricos.com': 'https://www.caricos.com/',
    'www.netcarshow.com': 'https://www.netcarshow.com/',
    'thumb.wikimedia.org': null,
    'upload.wikimedia.org': null,
    'commons.wikimedia.org': null,
    'www.thedrive.com': null,
    'www.jalopnik.com': null,
    'hips.hearstapps.com': null,
    'electrek.co': null,
    'cdn.motor1.com': null,
  }

  let host: string
  try {
    host = new URL(imgUrl).hostname
  } catch {
    return new NextResponse('bad url', { status: 400 })
  }
  if (!(host in TRUSTED_HOSTS)) {
    return new NextResponse('no image', { status: 404 })
  }

  const referer = TRUSTED_HOSTS[host]
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  }
  if (referer) headers['Referer'] = referer

  try {
    const upstream = await fetch(imgUrl, { headers })
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
