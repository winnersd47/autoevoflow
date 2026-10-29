/**
 * GET /api/analysis/[entityType]/[entityId] — текстовый ИИ-анализ для
 * useAnalysis()/getAnalysis(). Читает заранее посчитанный кэш
 * (scripts/generate-ai-content.js -> public/data/ai/{brands,models}.json),
 * без обращения к LLM на лету.
 *
 * entityType="brand"   -> brands.json[entityId].analysis  (analysisType=brand_dna)
 * entityType="model"   -> models.json[entityId].analysis  (analysisType=design_evolution,
 *                          только многопоколенческие модели — см. комментарий в скрипте)
 * entityType="generation"/"comparison" — пока не считается, всегда 404
 * (страницы уже рассчитаны на отсутствие анализа и просто не покажут панель).
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const AI_DIR = path.join(process.cwd(), 'public', 'data', 'ai')

function readStore(file: string): Record<string, { analysis?: unknown }> {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return {}
  }
}

export async function GET(_req: Request, { params }: { params: { entityType: string; entityId: string } }) {
  const { entityType, entityId } = params

  const file = entityType === 'brand' ? 'brands.json' : entityType === 'model' ? 'models.json' : null
  if (!file) {
    return NextResponse.json({ error: `анализ для entityType="${entityType}" ещё не реализован` }, { status: 404 })
  }

  const store = readStore(path.join(AI_DIR, file))
  const analysis = store[entityId]?.analysis
  if (!analysis) {
    return NextResponse.json({ error: 'analysis not generated yet' }, { status: 404 })
  }
  return NextResponse.json(analysis)
}
