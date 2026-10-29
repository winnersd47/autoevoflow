// GET /api/search/suggestions?q=<partial> — простые автодополнения для SearchBar,
// та же статика graph.json, без бэкенда (см. комментарий в ../route.ts).
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

let cachedLabels: { label: string; brandName?: string }[] | null = null
function loadLabels() {
  if (cachedLabels) return cachedLabels
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
  cachedLabels = raw.nodes.map((n: { label: string; brandName?: string }) => ({ label: n.label, brandName: n.brandName }))
  return cachedLabels
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json([])

  const seen = new Set<string>()
  const out: string[] = []
  for (const { label, brandName } of loadLabels()) {
    const full = brandName ? `${brandName} ${label}` : label
    if (full.toLowerCase().includes(q) && !seen.has(full)) {
      seen.add(full)
      out.push(full)
      if (out.length >= 8) break
    }
  }
  return NextResponse.json(out)
}
