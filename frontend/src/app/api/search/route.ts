/**
 * GET /api/search?q=<query>&bodyTypes=suv,sedan&yearFrom=1990&yearTo=2010
 *
 * Полноценный /search раньше ходил на отдельный FastAPI-бэкенд (CLIP/DINOv2
 * семантический + визуальный поиск, Postgres+Neo4j) — он требует Docker,
 * который на этой машине не запускается (нет виртуализации), и никогда не
 * был задеплоен. Результат — /search был мёртв целиком (AxiosError: Network
 * Error на любой запрос), хотя вся остальная база (3900+ поколений) уже
 * лежит в public/data/evolution/graph.json и доступна статически.
 *
 * Этот роут — прагматичная замена: обычный текстовый поиск по той же самой
 * статике, без ИИ-эмбеддингов (это НЕ семантический поиск "похоже на..." —
 * честно, просто надёжный полнотекстовый). Работает и на Vercel (просто
 * читает JSON-файл), в отличие от Python-бэкенда.
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

interface GraphNode {
  id: string
  label: string
  fullName?: string
  year?: number
  brandId: string
  brandName?: string
  codeName?: string
  modelSlug?: string
  bodyType?: string
  segment?: string
  zone?: string
  hp?: number
  engineType?: string
  note?: string
  isConcept?: boolean
  isLimited?: boolean
}

let cachedNodes: GraphNode[] | null = null
function loadNodes(): GraphNode[] {
  if (cachedNodes) return cachedNodes
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
  cachedNodes = raw.nodes as GraphNode[]
  return cachedNodes
}

function toGeneration(n: GraphNode) {
  return {
    id: n.id,
    slug: n.modelSlug || n.id,
    modelId: n.modelSlug || n.id,
    model: { slug: n.modelSlug || n.id, name: n.brandName ? `${n.brandName} ${n.label}` : n.label },
    brandId: n.brandId,
    codeName: n.codeName || n.label,
    generationNumber: 1,
    startYear: n.year ?? 0,
    endYear: undefined,
    isFacelift: false,
    isConcept: !!n.isConcept,
    bodyTypes: n.bodyType ? [n.bodyType] : [],
    engineTypes: n.engineType ? [n.engineType] : [],
    markets: [],
    specs: n.hp ? { horsepower: n.hp } : undefined,
    description: n.note || '',
    thumbnailUrl: undefined,
    heroImageUrl: undefined,
    images: [],
    platformCode: undefined,
    tags: [],
    aiAnalysisAvailable: false,
    evolutionSummary: undefined,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }
}

// Простая, но не наивная оценка релевантности: точное совпадение id/codeName
// важнее совпадения где-то в примечании. Без эмбеддингов — честный полнотекст.
function score(n: GraphNode, qLower: string, qTokens: string[]): number {
  const codeName = (n.codeName || '').toLowerCase()
  const label = n.label.toLowerCase()
  const fullName = (n.fullName || '').toLowerCase()
  const brandName = (n.brandName || '').toLowerCase()
  const yearStr = String(n.year ?? '')
  const haystack = [label, fullName, codeName, brandName, n.segment, n.bodyType, n.engineType, n.note]
    .filter(Boolean).join(' ').toLowerCase()

  if (codeName === qLower) return 1.0
  if (label === qLower || fullName === qLower) return 0.97
  if (codeName.startsWith(qLower) || label.startsWith(qLower)) return 0.9
  if (codeName.includes(qLower) || label.includes(qLower) || fullName.includes(qLower)) return 0.8

  // Многословный запрос — оцениваем долю найденных токенов
  const matched = qTokens.filter(t => haystack.includes(t) || yearStr === t)
  if (matched.length === 0) return 0
  return 0.35 + 0.35 * (matched.length / qTokens.length)
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
  const bodyTypes = searchParams.get('bodyTypes')?.split(',').filter(Boolean)
  const yearFrom = searchParams.get('yearFrom') ? Number(searchParams.get('yearFrom')) : undefined
  const yearTo = searchParams.get('yearTo') ? Number(searchParams.get('yearTo')) : undefined
  const brandIds = searchParams.get('brandIds')?.split(',').filter(Boolean)

  const started = Date.now()
  if (!q) {
    return NextResponse.json({
      results: [], total: 0, query: q, mode: 'semantic',
      processingTimeMs: Date.now() - started, sessionId: 'local',
    })
  }

  let nodes: GraphNode[]
  try {
    nodes = loadNodes()
  } catch {
    return NextResponse.json({ error: 'graph data unavailable' }, { status: 500 })
  }

  const qLower = q.toLowerCase()
  const qTokens = qLower.split(/\s+/).filter(Boolean)

  let candidates = nodes
  if (bodyTypes?.length) candidates = candidates.filter(n => n.bodyType && bodyTypes.includes(n.bodyType))
  if (brandIds?.length) candidates = candidates.filter(n => brandIds.includes(n.brandId))
  if (yearFrom) candidates = candidates.filter(n => (n.year ?? 0) >= yearFrom)
  if (yearTo) candidates = candidates.filter(n => (n.year ?? 9999) <= yearTo)

  const scored = candidates
    .map(n => ({ n, s: score(n, qLower, qTokens) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)

  const results = scored.map((x, i) => ({
    id: x.n.id,
    entityType: 'generation' as const,
    entity: toGeneration(x.n),
    score: x.s,
    rank: i + 1,
  }))

  return NextResponse.json({
    results,
    total: results.length,
    query: q,
    mode: 'semantic',
    processingTimeMs: Date.now() - started,
    sessionId: 'local',
  })
}
