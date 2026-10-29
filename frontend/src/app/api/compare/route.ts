/**
 * POST /api/compare — заменяет мёртвый /api/v1/compare/generations.
 *
 * similarityScore — честный rule-based расчёт (src/lib/compare-similarity.ts)
 * из реальных полей graph.json, не fallback-ноль и не выдуманные embeddings.
 *
 * aiNarrative — генерируется здесь же, на лету (не предпосчитан батчем, как
 * DNA брендов/моделей в generate-ai-content.js) — пар для сравнения
 * комбинаторно много, предпосчитать все нереально, а конкретную пару
 * пользователь запрашивает раз в 15 минут (staleTime в useCompare.ts), так
 * что живой ИИ-вызов на запрос — единственный практичный вариант. Та же
 * цепочка из 8 провайдеров, что и в scripts/generate-ai-content.js — код не
 * шарится между scripts/ и src/app/api по уже сложившейся в проекте
 * конвенции (/api/analysis/route.ts тоже имеет свою копию Yandex-вызова).
 *
 * radarData/designElements/embeddingDistance оставлены пустыми — честнее,
 * чем рисовать мульти-осевой радар по единственной реальной числовой
 * характеристике (hp), которая есть в graph.json.
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { computeSimilarity } from '@/lib/compare-similarity'

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
}

function loadNode(id: string): GraphNode | null {
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  const nodes: GraphNode[] = JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
  return nodes.find(n => n.id === id) ?? null
}

// ─── LLM providers — тот же набор/порядок, что в scripts/generate-ai-content.js ──

const OPENROUTER_FREE_MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'poolside/laguna-s-2.1:free',
]

async function callGemini(messages: { role: string; content: string }[]) {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.startsWith('your_')) return null
  const system = messages.find(m => m.role === 'system')?.content || ''
  const user = messages.find(m => m.role === 'user')?.content || ''
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2500 },
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('') || null
}

async function callDeepSeek(messages: { role: string; content: string }[]) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callYandex(messages: { role: string; content: string }[]) {
  const apiKey = process.env.YANDEX_API_KEY
  const folderId = process.env.YANDEX_FOLDER_ID
  if (!apiKey || apiKey.startsWith('your_') || !folderId) return null
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST', headers: { Authorization: `Api-Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/yandexgpt-pro/latest`,
      completionOptions: { stream: false, temperature: '0.4', maxTokens: '2500' },
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', text: m.content })),
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`Yandex ${res.status}`)
  const data = await res.json()
  return data.result?.alternatives?.[0]?.message?.text ?? null
}

async function callQwen(messages: { role: string; content: string }[]) {
  const key = process.env.QWEN_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen-plus', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Qwen ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callOpenRouter(messages: { role: string; content: string }[]) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || key.startsWith('your_')) return null
  let lastErr: Error | null = null
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://autoevoflow.local', 'X-Title': 'AutoEvoFlow' },
        body: JSON.stringify({ model, messages, max_tokens: 2500, temperature: 0.4 }),
        signal: AbortSignal.timeout(40_000),
      })
      if (!res.ok) { lastErr = new Error(`OpenRouter ${model} ${res.status}`); continue }
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content) return content
      lastErr = new Error(`OpenRouter ${model}: empty`)
    } catch (e) { lastErr = e as Error }
  }
  throw lastErr || new Error('OpenRouter: all models unavailable')
}

async function callCerebras(messages: { role: string; content: string }[]) {
  const key = process.env.CEREBRAS_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Cerebras ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callNvidia(messages: { role: string; content: string }[]) {
  const key = process.env.NVIDIA_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`NVIDIA ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callMistral(messages: { role: string; content: string }[]) {
  const key = process.env.MISTRAL_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-small-latest', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Mistral ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

const PROVIDER_CHAIN = [callGemini, callDeepSeek, callYandex, callQwen, callOpenRouter, callCerebras, callNvidia, callMistral]

function extractJSON(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch { /* fallthrough */ }
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch { /* ignore */ }
  }
  return null
}

async function generateNarrative(a: GraphNode, b: GraphNode): Promise<{ parsed: Record<string, unknown> | null; provider: string | null }> {
  const messages = [
    {
      role: 'system',
      content: 'Ты эксперт-аналитик в области автомобильного дизайна и истории автопромышленности. Отвечай строго в формате JSON без пояснений, без markdown-обёрток.',
    },
    {
      role: 'user',
      content: `Сравни две машины для платформы AutoEvoFlow:

А: ${a.brandName || a.brandId} ${a.fullName || a.label} (${a.year ?? '?'}) — ${a.bodyType || '?'}, ${a.hp ? a.hp + ' л.с.' : '?'}, ${a.engineType || '?'}. ${a.note || ''}
Б: ${b.brandName || b.brandId} ${b.fullName || b.label} (${b.year ?? '?'}) — ${b.bodyType || '?'}, ${b.hp ? b.hp + ' л.с.' : '?'}, ${b.engineType || '?'}. ${b.note || ''}

Верни СТРОГО JSON:
{
  "headline": "<заголовок сравнения до 80 символов>",
  "summary": "<2-3 предложения — главное отличие/сходство>",
  "fullText": "<3-5 абзацев: что общего, в чём разница (дизайн/техника/позиционирование), какой путь эволюции связывает эти машины, для кого какая подойдёт>",
  "insights": [
    {"id":"ins-01","category":"Engineering","text":"<факт>","confidence":0.9,"importance":"high"},
    {"id":"ins-02","category":"Design","text":"<факт>","confidence":0.85,"importance":"high"},
    {"id":"ins-03","category":"Market","text":"<факт>","confidence":0.8,"importance":"medium"}
  ],
  "confidenceScore": <0-1>
}`,
    },
  ]

  for (const fn of PROVIDER_CHAIN) {
    try {
      const text = await fn(messages)
      if (text) {
        const parsed = extractJSON(text)
        if (parsed) return { parsed, provider: fn.name.replace('call', '').toLowerCase() }
      }
    } catch { /* пробуем следующего провайдера */ }
  }
  return { parsed: null, provider: null }
}

export async function POST(req: Request) {
  const startMs = Date.now()
  let body: { generationIdA?: string; generationIdB?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.generationIdA || !body.generationIdB) {
    return NextResponse.json({ error: 'generationIdA and generationIdB are required' }, { status: 400 })
  }

  const a = loadNode(body.generationIdA)
  const b = loadNode(body.generationIdB)
  if (!a || !b) {
    return NextResponse.json({ error: 'generation not found' }, { status: 404 })
  }

  const similarityScore = computeSimilarity(a, b)
  const { parsed, provider } = await generateNarrative(a, b)

  const comparisonId = `${a.id}--${b.id}`
  const aiNarrative = parsed
    ? {
        id: `analysis-compare-${comparisonId}`,
        entityType: 'comparison' as const,
        entityId: comparisonId,
        analysisType: 'generation_comparison' as const,
        provider: provider as string,
        headline: (parsed.headline as string) ?? `${a.label} vs ${b.label}`,
        summary: (parsed.summary as string) ?? '',
        fullText: (parsed.fullText as string) ?? '',
        insights: (parsed.insights as unknown[]) ?? [],
        confidenceScore: (parsed.confidenceScore as number) ?? 0.8,
        processingTimeMs: Date.now() - startMs,
        createdAt: new Date().toISOString(),
        isCached: false,
        metadata: { language: 'ru' },
      }
    : undefined

  return NextResponse.json({
    id: comparisonId,
    generationA: null,
    generationB: null,
    dimensions: [],
    similarityScore,
    embeddingDistance: 1 - similarityScore,
    aiNarrative,
    radarData: [],
    designElements: [],
    createdAt: new Date().toISOString(),
  })
}
