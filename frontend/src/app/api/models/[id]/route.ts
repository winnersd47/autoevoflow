/**
 * GET /api/models/[id] — страница одной модели (/model/[slug]).
 *
 * Тот же паттерн, что уже применён для /api/brands/[id]: страница раньше
 * безусловно ходила на мёртвый FastAPI-бэкенд (useModel/useModelGenerations),
 * получала ERR_CONNECTION_REFUSED и показывала пустую карточку. Обнаружено
 * при фиксе resolvePageUrl() в publish-new-stories.js — та теперь при
 * найденном совпадении в графе ссылается на /model/{modelSlug} вместо общего
 * /latest/{id}, а сама страница назначения не работала.
 *
 * [id] — это modelSlug (или голый id узла, если modelSlug нет) той же
 * группировки, что уже используют /api/brands/[id] и generate-ai-content.js:
 * узлы graph.json с одинаковым (modelSlug || id) — это "модель", каждый узел
 * внутри группы — её поколение.
 *
 * useModelEvolution (мини-граф на вкладке "Граф эволюции") сознательно НЕ
 * реализован — остаётся на /api/v1/.../evolution мёртвого бэкенда и просто
 * покажет пустое состояние (страница уже на это рассчитана).
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getBrandMeta } from '@/lib/brand-meta'

export const dynamic = 'force-dynamic'

interface GraphNode {
  id: string
  label: string
  fullName?: string
  year?: number
  brandId: string
  brandName?: string
  modelSlug?: string
  codeName?: string
  bodyType?: string
  segment?: string
  hp?: number
  engineType?: string
  note?: string
  description?: string
  heroImageUrl?: string
  thumbnailUrl?: string
  isConcept?: boolean
}

function loadNodes(): GraphNode[] {
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  return JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const key = params.id
  let nodes: GraphNode[]
  try {
    nodes = loadNodes()
  } catch {
    return NextResponse.json({ error: 'graph data unavailable' }, { status: 500 })
  }

  const group = nodes.filter(n => (n.modelSlug || n.id) === key)
  if (group.length === 0) {
    return NextResponse.json({ error: 'model not found' }, { status: 404 })
  }

  const sorted = [...group].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
  // group.length===0 уже отсечён выше (404) — sorted гарантированно непустой.
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const brandId = last.brandId
  const brandName = last.brandName || brandId
  const meta = getBrandMeta(brandId)
  const years = sorted.map(n => n.year ?? 0)
  const startYear = Math.min(...years)
  const endYear = Math.max(...years)
  const latestGraphYear = Math.max(...nodes.map(n => n.year ?? 0))
  const isActive = endYear >= latestGraphYear - 3 || endYear >= new Date().getFullYear() - 1
  // Хиро на /model/[slug] сам приписывает model.brand.name перед model.name —
  // если не срезать повтор бренда здесь, получится "Audi Audi Q9".
  const brandNameRe = new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
  const rawName = (last.fullName || last.label).replace(/\s*\(\d{4}\)\s*$/, '')
  const modelRef = { name: rawName.replace(brandNameRe, ''), slug: key }

  const generations = sorted.map(n => ({
    id: n.id,
    slug: n.id,
    modelId: key,
    model: modelRef,
    brandId,
    codeName: n.codeName || String(n.year ?? ''),
    startYear: n.year ?? 0,
    endYear: undefined,
    isFacelift: /facelift|lci|фейслифт/i.test(n.label + ' ' + (n.note || '')),
    isConcept: !!n.isConcept,
    bodyTypes: [n.bodyType || 'sedan'],
    engineTypes: n.engineType ? [n.engineType] : [],
    specs: n.hp ? { horsepower: n.hp } : undefined,
    description: n.note || n.description || '',
    thumbnailUrl: n.thumbnailUrl,
    heroImageUrl: n.heroImageUrl,
    images: n.heroImageUrl || n.thumbnailUrl
      ? [{ url: n.heroImageUrl || n.thumbnailUrl, thumbnailUrl: n.thumbnailUrl || n.heroImageUrl, altText: n.label }]
      : [],
    tags: [],
    aiAnalysisAvailable: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }))

  const model = {
    id: key,
    slug: key,
    name: modelRef.name,
    fullName: last.fullName || last.label,
    brandId,
    brand: { name: brandName, slug: brandId, country: meta.country },
    bodyType: last.bodyType || first.bodyType || 'sedan',
    segment: last.segment || first.segment || 'compact',
    primaryMarket: 'global',
    startYear,
    endYear: isActive ? undefined : endYear,
    isActive,
    description: last.note || last.description || first.note || '',
    generationCount: sorted.length,
    thumbnailUrl: last.thumbnailUrl,
    heroImageUrl: last.heroImageUrl,
    tags: [],
    aiAnalysisAvailable: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }

  return NextResponse.json({ model, generations })
}
