import { NextResponse } from 'next/server'

const YANDEX_API_KEY   = process.env.YANDEX_API_KEY
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID
const YANDEX_LLM_URL   = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'

// ─── YandexGPT call ───────────────────────────────────────────────────────────

async function callYandexGPT(
  prompt: string,
  maxTokens = 2000,
  temperature = 0.4,
): Promise<{ text: string; tokensUsed: number }> {
  if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
    throw new Error('YANDEX_API_KEY и YANDEX_FOLDER_ID не настроены в .env.local')
  }

  const res = await fetch(YANDEX_LLM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${YANDEX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt-pro/latest`,
      completionOptions: {
        stream: false,
        temperature,
        maxTokens: String(maxTokens),
      },
      messages: [
        {
          role: 'system',
          text:
            'Ты эксперт-аналитик в области автомобильного дизайна и истории автопромышленности. ' +
            'Отвечай строго в формате JSON без пояснений и обёрток.',
        },
        { role: 'user', text: prompt },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YandexGPT API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const text         = (data.result?.alternatives?.[0]?.message?.text ?? '') as string
  const inputTokens  = Number(data.result?.usage?.inputTextTokens  ?? 0)
  const outputTokens = Number(data.result?.usage?.completionTokens ?? 0)
  return { text, tokensUsed: inputTokens + outputTokens }
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJSON(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch {}
  }
  return null
}

// ─── POST /api/analysis ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  const startMs = Date.now()

  try {
    const body = await req.json() as {
      modelSlug: string
      modelName: string
      brandName: string
      generations?: Array<{ codeName?: string; startYear?: number; endYear?: number; description?: string }>
      existingAnalysis?: unknown
    }

    const { modelSlug, modelName, brandName, generations = [], existingAnalysis } = body
    const forceRefresh = req.headers.get('x-force-refresh') === '1'

    // Return cached if no force-refresh requested
    if (existingAnalysis && !forceRefresh) {
      return NextResponse.json({ ...(existingAnalysis as Record<string, unknown>), isCached: true })
    }

    // Return placeholder when API keys are not configured
    if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID ||
        YANDEX_API_KEY === 'your_yandex_api_key_here') {
      return NextResponse.json({
        id: `analysis-${modelSlug}-yandex-placeholder`,
        entityType: 'model',
        entityId: modelSlug,
        analysisType: 'design_evolution',
        provider: 'yandex',
        headline: `${brandName} ${modelName}: экспертный анализ YandexGPT`,
        summary:
          'Добавьте YANDEX_API_KEY и YANDEX_FOLDER_ID в .env.local для получения живого анализа от YandexGPT Pro. ' +
          'Инструкция: console.yandex.cloud → Сервисные аккаунты → API-ключ.',
        fullText: '',
        insights: [],
        confidenceScore: 0,
        tokensUsed: 0,
        processingTimeMs: Date.now() - startMs,
        createdAt: new Date().toISOString(),
        isCached: false,
        metadata: { modelVersion: 'yandexgpt-pro', language: 'ru', status: 'keys_missing' },
      })
    }

    // Build generations context for the prompt
    const genContext =
      generations.length > 0
        ? generations
            .map(
              g =>
                `  • ${g.codeName ?? 'Gen'} (${g.startYear ?? '?'}–${g.endYear ?? 'н/в'}): ${g.description ?? ''}`,
            )
            .join('\n')
        : '  • Данные о поколениях недоступны'

    const prompt = `Создай детальный аналитический отчёт об автомобиле ${brandName} ${modelName} для платформы AutoEvoFlow.

ПОКОЛЕНИЯ:
${genContext}

Верни СТРОГО в формате JSON без обёрток:
{
  "headline": "Броский заголовок анализа до 80 символов",
  "summary": "Краткое резюме 2-3 предложения о ключевой роли модели в истории бренда",
  "fullText": "Подробный анализ 4-6 абзацев: история создания, дизайн-философия, технические инновации, культурное значение, влияние на конкурентов",
  "insights": [
    { "id": "ins-01", "category": "Engineering", "text": "Инженерный факт или техническое решение", "confidence": 0.95, "importance": "critical" },
    { "id": "ins-02", "category": "Design",      "text": "Особенность дизайна или стилистическое решение", "confidence": 0.90, "importance": "high" },
    { "id": "ins-03", "category": "Heritage",    "text": "Историческое значение и связь с прошлым бренда", "confidence": 0.85, "importance": "high" },
    { "id": "ins-04", "category": "Market",      "text": "Рыночное позиционирование или коммерческий успех", "confidence": 0.88, "importance": "high" },
    { "id": "ins-05", "category": "Influence",   "text": "Влияние на отрасль или конкурентов", "confidence": 0.80, "importance": "medium" }
  ],
  "confidenceScore": 0.88
}`

    const { text, tokensUsed } = await callYandexGPT(prompt, 2000, 0.4)
    const parsed = extractJSON(text)

    if (!parsed) {
      throw new Error(`YandexGPT вернул невалидный JSON: ${text.slice(0, 200)}`)
    }

    return NextResponse.json({
      id: `analysis-${modelSlug}-yandex-${Date.now()}`,
      entityType: 'model',
      entityId: modelSlug,
      analysisType: 'design_evolution',
      provider: 'yandex',
      headline:        parsed.headline        ?? `${brandName} ${modelName}: анализ YandexGPT`,
      summary:         parsed.summary         ?? '',
      fullText:        parsed.fullText        ?? '',
      insights:        parsed.insights        ?? [],
      confidenceScore: parsed.confidenceScore ?? 0.85,
      tokensUsed,
      processingTimeMs: Date.now() - startMs,
      createdAt: new Date().toISOString(),
      isCached: false,
      metadata: { modelVersion: 'yandexgpt-pro', language: 'ru' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/analysis] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
