/**
 * POST /api/nextgen
 * Генерирует предсказание следующего поколения автомобиля.
 * Провайдеры (в приоритете): Groq → Anthropic Claude
 * Body: { slug, brandName, modelName, lastYear, lastHp?, engineType?, zone?, notes?, force? }
 *
 * Публичный роут (страница /model/[slug] открыта всем, значит и эта вкладка
 * тоже) — поэтому результат кэшируется в public/data/models/<slug>.json
 * (поле nextgenPrediction) и повторные визиты не дёргают Groq/Claude заново.
 * force=true (кнопка «Обновить») всегда пересчитывает и перезаписывает кэш.
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 30

const MODELS_DIR = path.join(process.cwd(), 'public', 'data', 'models')

function readCached(slug: string): (Record<string, unknown> & { generatedAt: string }) | null {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, `${slug}.json`), 'utf-8'))
    return data.nextgenPrediction ?? null
  } catch {
    return null
  }
}

function writeCache(slug: string, prediction: Record<string, unknown>) {
  const file = path.join(MODELS_DIR, `${slug}.json`)
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    // файла модели ещё нет — создавать его тут не задача этого роута
    return
  }
  data.nextgenPrediction = prediction
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'openai/gpt-oss-120b'
const CLAUDE_URL   = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const ZONE_LABEL: Record<string, string> = {
  hypercar: 'гиперкар', supercar: 'суперкар', sports: 'спорткар',
  gt_coupe: 'GT купе', electric: 'электромобиль', suv_large: 'large SUV',
  suv_mid: 'mid SUV', suv_compact: 'compact SUV', exec_sed: 'бизнес-седан',
  flagship_sed: 'флагманский седан', midsize_sed: 'среднеразмерный седан',
  ultra_luxury: 'ultra luxury',
}

function buildPrompt(
  brandName: string, modelName: string, lastYear: number,
  lastHp?: number, engineType?: string, zone?: string, notes?: string[],
): string {
  return `Ты эксперт по автомобильному дизайну и технологиям. Проанализируй историю ${brandName} ${modelName} и предскажи следующее поколение.

Данные последнего поколения:
- Год: ${lastYear}
- Мощность: ${lastHp ? lastHp + ' л.с.' : 'не указана'}
- Тип двигателя: ${engineType ?? 'не указан'}
- Класс: ${zone ? (ZONE_LABEL[zone] ?? zone) : 'не указан'}
${notes?.length ? '- Заметки: ' + notes.join('; ') : ''}

Предскажи следующее поколение. Ответь СТРОГО в JSON-формате без markdown-блоков:
{
  "predictedYear": <число, год выхода>,
  "confidence": <число 0.0–1.0>,
  "predictedHp": <число, ожидаемая мощность>,
  "predictedEngine": <строка, тип двигателя: ev/hybrid/v8/v6t/etc>,
  "designTrends": [<3-5 коротких строк о ключевых дизайн-трендах>],
  "techTrends": [<3-5 строк о технологических инновациях>],
  "narrative": <2-3 абзаца на русском о концепции следующего поколения, стиле, философии>,
  "imagePrompt": <строка на английском для генерации изображения через Midjourney/DALL-E>,
  "marketContext": <1-2 предложения о рыночном позиционировании>
}`
}

function parseResult(text: string) {
  const json = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const r = JSON.parse(json)
  return {
    predictedYear:   r.predictedYear,
    confidence:      r.confidence,
    predictedHp:     r.predictedHp,
    predictedEngine: r.predictedEngine,
    designTrends:    r.designTrends   ?? [],
    techTrends:      r.techTrends     ?? [],
    narrative:       r.narrative      ?? '',
    imagePrompt:     r.imagePrompt    ?? '',
    marketContext:   r.marketContext  ?? '',
  }
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content as string
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return (data.content[0] as { type: string; text: string }).text
}

export async function POST(req: NextRequest) {
  const groqKey   = process.env.GROQ_API_KEY
  const claudeKey = process.env.ANTHROPIC_API_KEY

  const hasGroq   = groqKey   && groqKey   !== 'your_groq_api_key_here'
  const hasClaude = claudeKey && claudeKey !== 'your_api_key_here'

  if (!hasGroq && !hasClaude) {
    return NextResponse.json(
      { error: 'Нет API-ключа. Добавь GROQ_API_KEY (бесплатно: console.groq.com) или ANTHROPIC_API_KEY в .env.local' },
      { status: 503 },
    )
  }

  const body = await req.json()
  const { slug, brandName, modelName, lastYear, lastHp, engineType, zone, notes = [], force } = body

  if (!brandName || !modelName || !lastYear) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validSlug = typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug) ? slug : null

  if (validSlug && !force) {
    const cached = readCached(validSlug)
    if (cached) return NextResponse.json({ ...cached, isCached: true })
  }

  const prompt = buildPrompt(brandName, modelName, lastYear, lastHp, engineType, zone, notes)

  try {
    const text = hasGroq
      ? await callGroq(prompt, groqKey!)
      : await callClaude(prompt, claudeKey!)
    const result = { ...parseResult(text), generatedAt: new Date().toISOString() }
    if (validSlug) writeCache(validSlug, result)
    return NextResponse.json({ ...result, isCached: false })
  } catch (primaryErr) {
    // Groq failed → try Claude as fallback
    if (hasGroq && hasClaude) {
      try {
        const text = await callClaude(prompt, claudeKey!)
        const result = { ...parseResult(text), generatedAt: new Date().toISOString() }
        if (validSlug) writeCache(validSlug, result)
        return NextResponse.json({ ...result, isCached: false })
      } catch (fallbackErr) {
        console.error('[nextgen] Claude fallback error:', fallbackErr)
      }
    }
    console.error('[nextgen] AI error:', primaryErr)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
