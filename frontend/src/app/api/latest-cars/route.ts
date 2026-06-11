/**
 * GET /api/latest-cars
 * Возвращает public/data/latest-cars.json
 * Клиент может периодически запрашивать этот эндпоинт для обновлений.
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
// Не кэшируем на сервере — данные обновляются по расписанию
export const revalidate = 0

export async function GET() {
  const file = path.join(process.cwd(), 'public', 'data', 'latest-cars.json')
  if (!fs.existsSync(file)) {
    return NextResponse.json({ cars: [], sources: [], updatedAt: null }, { status: 200 })
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
