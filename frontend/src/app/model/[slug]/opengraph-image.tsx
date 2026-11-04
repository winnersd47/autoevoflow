// Динамическая OG-картинка для /model/[slug] (Next.js file-convention —
// https://nextjs.org/docs/app/api-reference/file-conventions/opengraph-image).
// Next сам подключает её в <meta property="og:image"> страницы, роут
// отдаётся по адресу /model/[slug]/opengraph-image.
//
// runtime: 'edge' — ОБЯЗАТЕЛЬНО, не косметика. В этом окружении (Next
// 14.2.5 + установленный здесь Node 24.x) next/og ImageResponse под
// Node.js-рантаймом ломается: соединение рвётся с "empty reply" ещё до
// первого байта ответа (воспроизведено и на абсолютно пустой картинке без
// единой строчки своей логики — т.е. баг на уровне самого next/og, не этого
// кода). Под runtime='edge' всё рендерится корректно, т.к. next/og
// собирается в единый bundle на этапе компиляции, минуя рантайм-резолюцию
// модулей Node, где и всплывает несовместимость. Поэтому fs здесь не
// используем — все данные идут через fetch() к /api/models/[id]/og-data
// (обычный Node.js-рантайм роут, которому next/og не нужен).
import { ImageResponse } from 'next/og'
import { OG_COLORS, ogSiteOrigin, yearRangeText } from '@/lib/og-constants'

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

interface OgModelData {
  found: boolean
  groupKey?: string
  brandName?: string
  modelName?: string
  startYear?: number
  endYear?: number
  generationCount?: number
  isActive?: boolean
  hasImage?: boolean
}

async function loadData(origin: string, slug: string): Promise<OgModelData> {
  try {
    const res = await fetch(`${origin}/api/models/${encodeURIComponent(slug)}/og-data`, { cache: 'no-store' })
    return (await res.json()) as OgModelData
  } catch {
    return { found: false }
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const origin = ogSiteOrigin()
  const data = await loadData(origin, params.slug)

  // Модель не нашлась (сломанная/устаревшая ссылка, или og-data роут
  // недоступен) — всё равно отдаём валидную брендированную картинку вместо
  // 500, просто без фото и с человекочитаемым именем из самого slug.
  const brandName = data.brandName ?? 'AutoEvoFlow'
  const modelName = data.modelName ?? params.slug.replace(/-/g, ' ')
  const years = data.found ? yearRangeText(data.startYear, data.endYear, data.isActive) : ''
  const generationCount = data.generationCount ?? 0
  const titleFontSize = modelName.length > 22 ? 56 : 72

  const imageSrc =
    data.found && data.hasImage && data.groupKey
      ? `${origin}/api/car-image?slug=${encodeURIComponent(data.groupKey)}`
      : ''

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
            // Прокси уже решает hotlink-защиту caricos/netcarshow — не ходим
            // на внешний URL из ImageResponse напрямую.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              width={1200}
              height={630}
              style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }}
            />
          ) : null}

          {/* Затемняющий скрим снизу для читаемости текста поверх фото;
              при отсутствии фото — просто тёмная панель-градиент */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              display: 'flex',
              background: imageSrc
                ? 'linear-gradient(180deg, rgba(9,8,10,0.05) 30%, rgba(9,8,10,0.78) 68%, rgba(9,8,10,0.97) 100%)'
                : `linear-gradient(135deg, ${BG} 0%, ${panelDark} 55%, ${panelDarker} 100%)`,
            }}
          />

          {/* Вордмарк в углу */}
          <div style={{ position: 'absolute', top: 40, right: 48, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>
              Auto<span style={{ color: PRIMARY }}>Evo</span>Flow
            </span>
          </div>

          {/* Бренд + модель + годы, снизу-слева */}
          <div
            style={{
              position: 'absolute',
              left: 64,
              bottom: 58,
              display: 'flex',
              flexDirection: 'column',
              width: 1000,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                fontWeight: 600,
                color: PRIMARY_LIGHT,
                textTransform: 'uppercase',
                letterSpacing: 3,
                marginBottom: 14,
              }}
            >
              {brandName}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: titleFontSize,
                fontWeight: 800,
                color: TEXT,
                lineHeight: 1.08,
              }}
            >
              {modelName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 26 }}>
              {years ? (
                <span style={{ display: 'flex', fontSize: 32, fontWeight: 600, color: PRIMARY }}>{years}</span>
              ) : null}
              {generationCount > 1 ? (
                <span
                  style={{
                    display: 'flex',
                    marginLeft: years ? 20 : 0,
                    fontSize: 24,
                    fontWeight: 500,
                    color: MUTED,
                  }}
                >
                  {generationCount} generations
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ),
      { ...size }
    )
  } catch {
    // Любая ошибка рендера (например, временная недоступность
    // /api/car-image) не должна превращаться в 500 — соцсети/Telegram
    // должны всегда получать валидный image/png, пусть и без фото.
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
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: PRIMARY_LIGHT, marginBottom: 14 }}>
            {brandName}
          </div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: TEXT }}>{modelName}</div>
        </div>
      ),
      { ...size }
    )
  }
}
