/**
 * GET /api/generations/[id] — одно поколение (узел графа) для /compare.
 *
 * Та же причина брокенности, что чинили у /brand, /brands, /model: useCompare
 * дёргал fetchGeneration → мёртвый /api/v1/generations/{id} → страница
 * "Сравнение" после выбора машины в поиске просто ничего не показывала.
 *
 * Форма объекта — как у generations[] в /api/models/[id]/route.ts (тот же
 * узел графа, тот же маппинг на Generation), здесь просто отдаём ОДИН узел
 * по его собственному id, без группировки по модели.
 *
 * compareGenerations/getAnalysis('comparison',...) НЕ реализованы — реальное
 * попарное ИИ-сравнение (radar/narrative) требует style-embedding векторов,
 * которых в graph.json нет, и которые нереально посчитать для всех пар
 * (3900+ узлов → миллионы комбинаций). useCompare устроен так, что их отказ
 * не блокирует generation1/generation2 — страница покажет карточки машин
 * без ИИ-радара, это осознанный компромисс, не баг.
 */
import { NextResponse } from 'next/server'
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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  let nodes: GraphNode[]
  try {
    nodes = JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
  } catch {
    return NextResponse.json({ error: 'graph data unavailable' }, { status: 500 })
  }

  const n = nodes.find(x => x.id === params.id)
  if (!n) {
    return NextResponse.json({ error: 'generation not found' }, { status: 404 })
  }

  const modelKey = n.modelSlug || n.id
  const modelName = (n.fullName || n.label).replace(/\s*\(\d{4}\)\s*$/, '')

  const generation = {
    id: n.id,
    slug: n.id,
    modelId: modelKey,
    model: { name: modelName, slug: modelKey },
    brandId: n.brandId,
    brand: { name: n.brandName || n.brandId, slug: n.brandId },
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
  }

  return NextResponse.json(generation)
}
