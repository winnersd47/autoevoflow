/**
 * GET /api/models/[id]/og-data — внутренний JSON-хелпер ТОЛЬКО для
 * src/app/model/[slug]/opengraph-image.tsx.
 *
 * Зачем отдельный роут, а не прямой fs-доступ внутри opengraph-image.tsx:
 * next/og ImageResponse в этом окружении падает под Node.js-рантаймом (см.
 * комментарий в src/lib/og-image.ts), поэтому сама картинка рендерится на
 * runtime='edge', где fs недоступен. Этот роут остаётся на обычном
 * Node.js-рантайме (как /api/models/[id] рядом) и просто отдаёт JSON,
 * который edge-рантайм картинки получает через fetch().
 *
 * Вложен под /api/models/[id]/, чтобы подпадать под уже существующее
 * исключение api/models в matcher'е src/middleware.ts (публичный
 * API-прокси, без этого факто-fetch из edge-функции без cookie получил бы
 * 307 на /login).
 */
import { NextResponse } from 'next/server'
import { loadOgGraphNodes, modelHasImage, resolveModelGroup } from '@/lib/og-image'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const nodes = loadOgGraphNodes()
    const resolved = resolveModelGroup(nodes, params.id)
    if (!resolved) {
      return NextResponse.json({ found: false }, { status: 404 })
    }
    return NextResponse.json({
      found: true,
      ...resolved,
      hasImage: modelHasImage(resolved.groupKey),
    })
  } catch {
    return NextResponse.json({ found: false }, { status: 500 })
  }
}
