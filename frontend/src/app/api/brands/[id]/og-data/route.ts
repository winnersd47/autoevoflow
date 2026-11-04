/**
 * GET /api/brands/[id]/og-data — внутренний JSON-хелпер ТОЛЬКО для
 * src/app/brand/[slug]/opengraph-image.tsx.
 *
 * См. подробный комментарий в src/app/api/models/[id]/og-data/route.ts —
 * та же причина (next/og ImageResponse ломается под Node.js-рантаймом в
 * этом окружении, картинка рендерится на runtime='edge' без доступа к fs)
 * и тот же приём вложения под уже публичный префикс (api/brands уже
 * исключён в matcher'е src/middleware.ts).
 */
import { NextResponse } from 'next/server'
import { loadOgGraphNodes, resolveBrandSummary } from '@/lib/og-image'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const nodes = loadOgGraphNodes()
    const summary = resolveBrandSummary(nodes, params.id)
    if (!summary) {
      return NextResponse.json({ found: false }, { status: 404 })
    }
    return NextResponse.json({ found: true, ...summary })
  } catch {
    return NextResponse.json({ found: false }, { status: 500 })
  }
}
