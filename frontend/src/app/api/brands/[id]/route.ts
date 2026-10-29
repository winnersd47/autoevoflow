/**
 * GET /api/brands/[id] — карточка бренда для /brand/[slug].
 *
 * Та же история, что была со /search до фикса: страница всегда ходила на
 * отдельный FastAPI-бэкенд (localhost:8010), которого нет — ERR_CONNECTION_REFUSED
 * на каждый запрос, карточка оставалась пустой. Этот роут считает brand+models
 * прямо из public/data/evolution/graph.json (3900+ узлов уже сгруппированы по
 * modelSlug — это и есть "модели" бренда, а узлы внутри группы — её поколения).
 *
 * DNA-радар и ИИ-анализ бренда (useBrandDNA/useAnalysis) здесь сознательно НЕ
 * реализованы — это требует реального бэкенда (эмбеддинги/LLM), статикой их
 * честно не заменить. Страница уже рассчитана на их отсутствие (условный
 * рендер {dna && ...}/{analysis && ...}) — просто не покажет эти блоки.
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getBrandMeta, COUNTRY_CODE } from '@/lib/brand-meta'

export const dynamic = 'force-dynamic'

interface GraphNode {
  id: string
  label: string
  fullName?: string
  year?: number
  brandId: string
  brandName?: string
  modelSlug?: string
  bodyType?: string
  segment?: string
  note?: string
  isConcept?: boolean
}

function loadNodes(): GraphNode[] {
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  return JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const brandId = params.id
  let nodes: GraphNode[]
  try {
    nodes = loadNodes()
  } catch {
    return NextResponse.json({ error: 'graph data unavailable' }, { status: 500 })
  }

  const brandNodes = nodes.filter(n => n.brandId === brandId)
  if (brandNodes.length === 0) {
    return NextResponse.json({ error: 'brand not found' }, { status: 404 })
  }

  const brandName = brandNodes[0].brandName || brandId
  const meta = getBrandMeta(brandId)
  const years = brandNodes.map(n => n.year).filter((y): y is number => !!y)
  const latestYear = Math.max(...years)
  const thisYear = new Date().getFullYear()

  // Группировка поколений в "модели" — по modelSlug (есть у ~97% узлов);
  // без него узел считается отдельной однопоколенческой моделью (fallback на id).
  const byModel = new Map<string, GraphNode[]>()
  for (const n of brandNodes) {
    const key = n.modelSlug || n.id
    const arr = byModel.get(key) ?? []
    arr.push(n)
    byModel.set(key, arr)
  }

  const models = [...byModel.entries()].map(([slug, group]) => {
    const sorted = [...group].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const modelYears = sorted.map(n => n.year ?? 0)
    const startYear = Math.min(...modelYears)
    const endYear = Math.max(...modelYears)
    // "Активна" — если самое новое поколение этой модели вышло не раньше, чем
    // за 3 года до самого свежего года во всём графе (а не до текущей даты —
    // в графе уже есть узлы на 2027-2029гг из скрейпера анонсов).
    const isActive = endYear >= latestYear - 3 || endYear >= thisYear - 1
    return {
      id: slug,
      slug,
      name: (last.fullName || last.label || first.label).replace(/\s*\(\d{4}\)\s*$/, ''),
      fullName: last.fullName || last.label,
      brandId,
      bodyType: last.bodyType || first.bodyType || 'sedan',
      segment: last.segment || first.segment || 'compact',
      primaryMarket: 'global',
      startYear,
      endYear: isActive ? undefined : endYear,
      isActive,
      description: last.note || first.note || '',
      generationCount: sorted.length,
      thumbnailUrl: undefined,
      heroImageUrl: undefined,
      tags: [],
      aiAnalysisAvailable: false,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }
  }).sort((a, b) => b.endYear! - a.endYear! || b.startYear - a.startYear)

  const brand = {
    id: brandId,
    slug: brandId,
    name: brandName,
    fullName: brandName,
    country: meta.country,
    countryCode: COUNTRY_CODE[meta.country] || 'UN',
    foundingYear: meta.founded || Math.min(...years),
    logoUrl: '',
    logoWhiteUrl: undefined,
    headerImageUrl: undefined,
    description: `${brandName} — ${brandNodes.length} поколений в графе эволюции AutoEvoFlow, от ${Math.min(...years)} до ${latestYear} года.`,
    parentCompany: undefined,
    headquarters: meta.country !== '—' ? meta.country : '—',
    modelCount: models.length,
    generationCount: brandNodes.length,
    tags: [meta.tag],
    aiAnalysisAvailable: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }

  return NextResponse.json({ brand, models })
}
