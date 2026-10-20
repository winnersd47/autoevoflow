/**
 * GET /api/published-stories
 * Возвращает public/data/published-stories.json — реально опубликованные в
 * VIP Telegram-канале посты (AI-текст + картинка), а не сырой дамп скрапера.
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET() {
  const file = path.join(process.cwd(), 'public', 'data', 'published-stories.json')
  if (!fs.existsSync(file)) {
    return NextResponse.json({ stories: [], updatedAt: null }, { status: 200 })
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ error: 'parse error' }, { status: 500 })
  }
}
