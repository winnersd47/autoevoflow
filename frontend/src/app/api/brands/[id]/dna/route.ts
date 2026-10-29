/**
 * GET /api/brands/[id]/dna — DNA-радар бренда для useBrandDNA().
 *
 * Отдаёт то, что заранее посчитал scripts/generate-ai-content.js (LLM-анализ
 * по данным graph.json) и сохранил в public/data/ai/brands.json. Никаких
 * вызовов ИИ на лету — страница должна открываться мгновенно. Если бренда
 * в кэше ещё нет (скрипт не добегал до него) — 404, и страница просто не
 * покажет блок радара (уже рассчитана на отсутствие dna).
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const file = path.join(process.cwd(), 'public', 'data', 'ai', 'brands.json')
  let store: Record<string, { dna?: unknown }>
  try {
    store = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return NextResponse.json({ error: 'ai cache unavailable' }, { status: 500 })
  }

  const entry = store[params.id]
  if (!entry?.dna) {
    return NextResponse.json({ error: 'dna not generated yet' }, { status: 404 })
  }
  return NextResponse.json(entry.dna)
}
