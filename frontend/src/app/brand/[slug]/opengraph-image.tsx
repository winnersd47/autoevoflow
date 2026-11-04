// Динамическая OG-картинка для /brand/[slug] (Next.js file-convention —
// https://nextjs.org/docs/app/api-reference/file-conventions/opengraph-image).
// См. соседний src/app/model/[slug]/opengraph-image.tsx — тот же подход и та
// же причина runtime='edge' + fetch() вместо fs (next/og ImageResponse
// ломается под Node.js-рантаймом в этом окружении).
import { ImageResponse } from 'next/og'
import { OG_COLORS, ogSiteOrigin } from '@/lib/og-constants'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const alt = 'AutoEvoFlow'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const {
  background: BG,
  text: TEXT,
  muted: MUTED,
  primary: PRIMARY,
  primaryLight: PRIMARY_LIGHT,
  panelDark,
  panelDarker,
} = OG_COLORS

interface OgBrandData {
  found: boolean
  brandName?: string
  country?: string
  modelCount?: number
  generationCount?: number
  imageSlug?: string | null
}

async function loadData(origin: string, slug: string): Promise<OgBrandData> {
  try {
    const res = await fetch(`${origin}/api/brands/${encodeURIComponent(slug)}/og-data`, { cache: 'no-store' })
    return (await res.json()) as OgBrandData
  } catch {
    return { found: false }
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const origin = ogSiteOrigin()
  const data = await loadData(origin, params.slug)

  const brandName = data.brandName ?? params.slug.replace(/-/g, ' ')
  const country = data.country && data.country !== '—' ? data.country : ''
  const modelCount = data.modelCount ?? 0
  const generationCount = data.generationCount ?? 0
  const titleFontSize = brandName.length > 16 ? 64 : 84

  const imageSrc = data.found && data.imageSlug ? `${origin}/api/car-image?slug=${encodeURIComponent(data.imageSlug)}` : ''

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            background: BG,
          }}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              width={1200}
              height={630}
              style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }}
            />
          ) : null}

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              display: 'flex',
              background: imageSrc
                ? 'linear-gradient(180deg, rgba(9,8,10,0.10) 25%, rgba(9,8,10,0.82) 65%, rgba(9,8,10,0.98) 100%)'
                : `linear-gradient(135deg, ${BG} 0%, ${panelDark} 55%, ${panelDarker} 100%)`,
            }}
          />

          <div style={{ position: 'absolute', top: 40, right: 48, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>
              Auto<span style={{ color: PRIMARY }}>Evo</span>Flow
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 64,
              bottom: 64,
              display: 'flex',
              flexDirection: 'column',
              width: 1000,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 600,
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: 4,
                marginBottom: 16,
              }}
            >
              Brand Profile
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: titleFontSize,
                fontWeight: 800,
                color: TEXT,
                lineHeight: 1.05,
              }}
            >
              {brandName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 28 }}>
              {country ? (
                <span style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: PRIMARY }}>{country}</span>
              ) : null}
              {modelCount > 0 ? (
                <span
                  style={{
                    display: 'flex',
                    marginLeft: country ? 24 : 0,
                    fontSize: 26,
                    fontWeight: 500,
                    color: MUTED,
                  }}
                >
                  {modelCount} models · {generationCount} generations
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ),
      { ...size }
    )
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 64,
            background: BG,
          }}
        >
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: MUTED, marginBottom: 16 }}>
            Brand Profile
          </div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, color: TEXT }}>{brandName}</div>
        </div>
      ),
      { ...size }
    )
  }
}
