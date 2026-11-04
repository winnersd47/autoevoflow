// Логика резолюции данных для OG-картинок /model/[slug] и /brand/[slug].
// ВАЖНО: этот файл использует fs — его можно импортировать только из
// Node.js-рантайм кода (route handlers), НЕ из самих opengraph-image.tsx.
//
// Почему разделение: next/og — ImageResponse в этом окружении (Next 14.2.5
// + установленный здесь Node 24.x) падает с "empty reply" при любом
// использовании ПОД Node.js-рантаймом самого opengraph-image.tsx (похоже на
// несовместимость способа, которым next/dist/api/og.js лениво резолвит свой
// внутренний импорт, с новым поведением Node 24 для .js-файлов с ESM
// синтаксисом без указания "type":"module") — проверено изолированным
// воспроизведением вне Next.js и через подмену runtime на 'edge', где всё
// рендерится корректно (next/og собирается в единый bundle на этапе
// компиляции, минуя рантайм-резолюцию модулей Node). Поэтому сами
// opengraph-image.tsx держим на runtime='edge' и fs не используют —
// вместо этого они фетчат JSON с крошечных Node-рантайм роутов
// /api/models/[id]/og-data и /api/brands/[id]/og-data, которые используют
// функции отсюда.
//
// Те же источники данных и та же группировка узлов графа, что уже
// использует /api/models/[id] и /api/brands/[id] (см. их комментарии) —
// просто переиспользуем паттерн "читаем public/data/evolution/graph.json
// через fs, без похода на мёртвый FastAPI-бэкенд".
//
// Картинка НЕ берётся из heroImageUrl графового узла — ровно как и
// /api/car-image/route.ts, она читается из public/data/models/<slug>.json,
// это отдельный (более свежий) источник фото моделей.
import fs from 'fs'
import path from 'path'
import { getBrandMeta } from '@/lib/brand-meta'

export interface OgGraphNode {
  id: string
  label: string
  fullName?: string
  year?: number
  brandId: string
  brandName?: string
  modelSlug?: string
}

export function loadOgGraphNodes(): OgGraphNode[] {
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  return JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
}

// Та же проверка, что делает /api/car-image/route.ts (heroImageUrl ||
// thumbnailUrl из public/data/models/<slug>.json) — только наличие, без
// самих байт (их получит сам прокси, когда opengraph-image.tsx укажет на
// него через <img src>).
export function modelHasImage(slug: string): boolean {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'models', `${slug}.json`)
    if (!fs.existsSync(file)) return false
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return !!(data.heroImageUrl || data.thumbnailUrl)
  } catch {
    return false
  }
}

export interface ResolvedModelGroup {
  groupKey: string
  brandName: string
  modelName: string
  startYear?: number
  endYear?: number
  generationCount: number
  isActive: boolean
}

// Идентичная резолюция группы, что в /api/models/[id]/route.ts: [slug] —
// это либо "голый" modelSlug, либо id конкретного узла (ссылки из
// публикаций на конкретное поколение) — сначала проверяем точный узел и
// резолвим в его реальную modelSlug-группу.
export function resolveModelGroup(nodes: OgGraphNode[], key: string): ResolvedModelGroup | null {
  const exactNode = nodes.find(n => n.id === key)
  const groupKey = exactNode ? (exactNode.modelSlug || exactNode.id) : key
  const group = nodes.filter(n => (n.modelSlug || n.id) === groupKey)
  if (group.length === 0) return null

  const sorted = [...group].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const brandName = last.brandName || last.brandId
  // Хиро на /model/[slug] сам приписывает brand.name перед model.name — без
  // среза повтора бренда получилось бы "Audi Audi Q9" (см. api/models/[id]).
  const brandNameRe = new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
  const rawName = (last.fullName || last.label).replace(/\s*\(\d{4}\)\s*$/, '')
  const modelName = rawName.replace(brandNameRe, '')

  const latestGraphYear = Math.max(...nodes.map(n => n.year ?? 0))
  const endYear = last.year ?? 0
  const isActive = endYear >= latestGraphYear - 3 || endYear >= new Date().getFullYear() - 1

  return {
    groupKey,
    brandName,
    modelName: modelName || rawName,
    startYear: first.year,
    endYear: last.year,
    generationCount: sorted.length,
    isActive,
  }
}

export interface ResolvedBrandSummary {
  brandName: string
  country: string
  modelCount: number
  generationCount: number
  imageSlug: string | null
}

// Идентичная группировка, что в /api/brands/[id]/route.ts: модели бренда —
// это узлы, сгруппированные по (modelSlug || id). Представительное фото —
// берём самую свежую модель бренда, у которой реально есть картинка (а не
// буквально "любую" — иначе на обложку мог попасть концепт без фото).
export function resolveBrandSummary(nodes: OgGraphNode[], brandId: string): ResolvedBrandSummary | null {
  const brandNodes = nodes.filter(n => n.brandId === brandId)
  if (brandNodes.length === 0) return null

  const brandName = brandNodes[0]!.brandName || brandId
  const meta = getBrandMeta(brandId)

  const byModel = new Map<string, OgGraphNode[]>()
  for (const n of brandNodes) {
    const key = n.modelSlug || n.id
    const arr = byModel.get(key) ?? []
    arr.push(n)
    byModel.set(key, arr)
  }

  const byRecency = [...byModel.entries()]
    .map(([slug, group]) => ({ slug, latestYear: Math.max(...group.map(n => n.year ?? 0)) }))
    .sort((a, b) => b.latestYear - a.latestYear)

  let imageSlug: string | null = null
  for (const { slug } of byRecency) {
    if (modelHasImage(slug)) {
      imageSlug = slug
      break
    }
  }

  return {
    brandName,
    country: meta.country,
    modelCount: byModel.size,
    generationCount: brandNodes.length,
    imageSlug,
  }
}
