/**
 * GET /api/netcarshow-image?url=<encoded-netcarshow-url>
 * Прокси для изображений netcarshow.com (hotlink protection требует Referer).
 * URL должен быть из домена images.netcarshow.com или www.netcarshow.com.
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_HOST = /^https:\/\/(www\.)?netcarshow\.com\//

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') ?? ''
  if (!raw || !ALLOWED_HOST.test(raw)) {
    return new NextResponse('invalid url', { status: 400 })
  }

  try {
    const upstream = await fetch(raw, {
      headers: {
        'Referer':    'https://www.netcarshow.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept':     'image/webp,image/jpeg,image/*',
      },
    })
    const ct = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !ct.startsWith('image/')) {
      // Возвращаем прозрачный 1x1 вместо ошибки → UI показывает fallback
      return new NextResponse(null, { status: 204 })
    }
    const buf = await upstream.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':  ct,
        'Cache-Control': 'public, max-age=86400',   // кэш 1 день
      },
    })
  } catch {
    return new NextResponse('fetch error', { status: 502 })
  }
}
