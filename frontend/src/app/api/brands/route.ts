/**
 * GET /api/brands — список брендов для /brands.
 *
 * Раньше страница использовала захардкоженный массив из 35 брендов с
 * придуманными цифрами "models: N" (напр. BMW: 48, хотя в графе реально 200
 * узлов) — остаток ранней заглушки, который никогда не синхронизировали с
 * реальными данными. Этот роут считает количество узлов РЕАЛЬНО по
 * public/data/evolution/graph.json (та же статика, что /evolution и /search)
 * и отдаёт все 117 брендов, а не только 35.
 *
 * country/founded/tag — редакционные метаданные из src/lib/brand-meta.ts
 * (в графе таких полей нет, только brandId/brandName).
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getBrandMeta } from '@/lib/brand-meta'

export const dynamic = 'force-dynamic'

export async function GET() {
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  let nodes: { brandId: string; brandName?: string }[]
  try {
    nodes = JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
  } catch {
    return NextResponse.json({ error: 'graph data unavailable' }, { status: 500 })
  }

  const byBrand = new Map<string, { name: string; models: number }>()
  for (const n of nodes) {
    const prev = byBrand.get(n.brandId)
    if (prev) prev.models++
    else byBrand.set(n.brandId, { name: n.brandName || n.brandId, models: 1 })
  }

  const brands = [...byBrand.entries()]
    .map(([id, { name, models }]) => {
      const meta = getBrandMeta(id)
      return { id, name, models, country: meta.country, founded: meta.founded, tag: meta.tag }
    })
    .sort((a, b) => b.models - a.models)

  return NextResponse.json({ brands, total: brands.length })
}
