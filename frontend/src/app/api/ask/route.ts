/**
 * POST /api/ask — публичный ИИ-ассистент "спросите об истории авто".
 *
 * Retrieval — не векторный, а дешёвый keyword-поиск по graph.json: токенизируем
 * вопрос, скорим ноды по вхождению токенов в label/fullName/brandName/codeName/
 * note (с весами по полю — codeName/label точнее note), берём top-N. Этого
 * достаточно для графа с понятными текстовыми полями (годы, индексы кузовов
 * типа E46/E36, названия брендов) — embeddings/векторная БД для v1 избыточны.
 *
 * graph.json (~3-4 МБ) кешируется в module-level переменной между вызовами —
 * см. ADR в комментарии к loadNodes().
 *
 * Генерация — та же цепочка из 8 провайдеров (Gemini→DeepSeek→Yandex→Qwen→
 * OpenRouter→Cerebras→Nvidia→Mistral) с теми же URL/shape/env-именами, что и в
 * src/app/api/compare/route.ts. Код скопирован, а не вынесен в common lib —
 * так уже сделано для /api/analysis и /api/compare (см. комментарий в
 * compare/route.ts), следуем той же конвенции проекта.
 *
 * Сильный принцип проекта: не выдумывать данные (см. историю с удалённым
 * decorative-чартом, рисовавшим придуманные цифры). Поэтому system-промпт
 * явно требует отвечать только по предоставленному контексту и честно
 * признавать нехватку данных, а не галлюцинировать характеристики.
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

// ─── graph.json — кеш между вызовами ───────────────────────────────────────────
//
// Файл весит несколько МБ и не меняется во время работы процесса (это статичные
// данные эволюции, не БД) — перечитывать и парсить JSON на каждый запрос было бы
// расточительно. Кешируем распарсенный массив нод в module-level переменной:
// в dev/standalone Node-процессе (как в этом проекте, см. `npm run dev`/`start`)
// это переживает между запросами; в serverless-окружении кеш просто не
// переживёт холодный старт — не хуже, чем без кеша, поэтому безопасно.
let cachedNodes: GraphNode[] | null = null

function loadNodes(): GraphNode[] {
  if (cachedNodes) return cachedNodes
  const file = path.join(process.cwd(), 'public', 'data', 'evolution', 'graph.json')
  const nodes: GraphNode[] = JSON.parse(fs.readFileSync(file, 'utf-8')).nodes
  cachedNodes = nodes
  return nodes
}

// ─── Токенизация и скоринг ──────────────────────────────────────────────────────

// Короткие служебные слова русского языка — если их не отсеивать, они совпадают
// как подстрока почти с любым текстом в поле note (это связная русская проза) и
// смещают ранжирование в сторону нод с длинными заметками вместо реально
// релевантных нод. Однокоренные/однобуквенные токены (длина < 2) отсекаются
// отдельно ниже и здесь не перечислены.
const STOPWORDS = new Set([
  'на', 'по', 'до', 'из', 'не', 'но', 'то', 'же', 'ли', 'их', 'об', 'от', 'за', 'со', 'во',
  'уж', 'ну', 'да', 'мы', 'вы', 'он', 'она', 'оно', 'они',
  'как', 'что', 'это', 'для', 'при', 'или', 'так', 'все', 'всё', 'был', 'была', 'было', 'есть',
  // 'про' и подобные — не только предлог, но и частая подстрока внутри слов
  // (происхождение, производство, продажи...), из-за substring-матчинга это
  // давало бы ложный сигнал почти в каждой note — отсеиваем явно.
  'про', 'над', 'под', 'без', 'чем', 'кто', 'его', 'её', 'уже', 'ещё', 'тут', 'там',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t))
}

// Вес поля при совпадении токена — codeName/label/fullName это точные
// идентификаторы поколения (E46, M3, Plaid...), note — более шумный свободный
// текст, поэтому его вклад в скор ниже.
const FIELD_WEIGHTS = {
  codeName: 4,
  label: 3,
  fullName: 3,
  brandName: 2,
  note: 1,
} as const

function scoreNode(node: GraphNode, tokens: string[]): number {
  if (tokens.length === 0) return 0
  let score = 0
  for (const token of tokens) {
    for (const field of Object.keys(FIELD_WEIGHTS) as (keyof typeof FIELD_WEIGHTS)[]) {
      const value = node[field]
      if (typeof value === 'string' && value.toLowerCase().includes(token)) {
        score += FIELD_WEIGHTS[field]
      }
    }
  }
  return score
}

// Бренды для запасной выборки, если вопрос вообще не даёт сигнала (например,
// нерелевантный графу вопрос) — берём узнаваемые бренды с богатыми данными,
// чтобы модель могла честно сказать "нет данных по вашему вопросу, но вот что
// у меня есть вообще" вместо пустого контекста.
const FALLBACK_BRAND_IDS = ['bmw', 'porsche', 'mercedes', 'audi', 'toyota', 'ferrari', 'tesla']

function buildFallbackSample(nodes: GraphNode[]): GraphNode[] {
  const sample: GraphNode[] = []
  for (const brandId of FALLBACK_BRAND_IDS) {
    const candidates = nodes.filter(n => n.brandId === brandId)
    const enriched = candidates.filter(n => n.note || n.fullName)
    const pool = enriched.length > 0 ? enriched : candidates
    sample.push(...pool.slice(0, 2))
  }
  return sample
}

const MAX_CONTEXT_NODES = 20
// Ниже этого скора совпадение считается случайным шумом (один слабый hit по
// note), а не реальным сигналом — тогда используем fallback-выборку.
const MIN_SCORE_THRESHOLD = 2

/**
 * Отбирает ноды графа, релевантные вопросу. Токены текущего вопроса весят
 * вдвое больше токенов истории диалога — это даёт истории дотягивать контекст
 * на коротких уточнениях ("а что насчёт следующего поколения?"), которые сами
 * по себе почти не содержат узнаваемых сущностей, но не позволяет старой теме
 * полностью перебить новый явный вопрос пользователя.
 */
interface ContextResult {
  nodes: GraphNode[]
  // true, когда ни одна нода не набрала реального скора по вопросу/истории и
  // мы отдали модели запасную подборку "для примера" — модель должна явно
  // знать, что эта подборка НЕ подобрана под вопрос (см. buildUserContent).
  usedFallback: boolean
}

function selectContext(question: string, history: ChatTurn[], nodes: GraphNode[]): ContextResult {
  const currentTokens = tokenize(question)
  const historyTokens = tokenize(history.map(h => h.content).join(' '))

  const scored = nodes
    .map(node => ({
      node,
      score: scoreNode(node, currentTokens) * 2 + scoreNode(node, historyTokens),
    }))
    .filter(s => s.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTEXT_NODES)

  if (scored.length === 0) return { nodes: buildFallbackSample(nodes), usedFallback: true }
  return { nodes: scored.map(s => s.node), usedFallback: false }
}

// ─── Компактная сериализация контекста для промпта ─────────────────────────────

function serializeNode(n: GraphNode): string {
  const name = n.fullName || n.label
  const specParts: string[] = [String(n.year ?? '?')]
  if (n.hp) specParts.push(`${n.hp} л.с.`)
  if (n.engineType) specParts.push(n.engineType)
  if (n.bodyType) specParts.push(n.bodyType)
  let line = `- [${n.id}] ${n.brandName ?? n.brandId} ${name} (${specParts.join(', ')})`
  if (n.note) line += ` — ${n.note}`
  return line
}

function buildContextBlock(nodes: GraphNode[]): string {
  if (nodes.length === 0) return '(в базе не нашлось ничего по этому запросу)'
  return nodes.map(serializeNode).join('\n')
}

// ─── LLM providers — тот же набор/порядок/endpoints, что в compare/route.ts ────

// Тот же обновлённый 2026-11-11 список, что в publish-new-stories.js
// (старые nemotron-3-super/laguna сняты с каталога OpenRouter, 404).
const OPENROUTER_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/free',
]

async function callGemini(messages: { role: string; content: string }[]) {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.startsWith('your_')) return null
  const system = messages.find(m => m.role === 'system')?.content || ''
  const rest = messages.filter(m => m.role !== 'system')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: rest.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
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

async function generateAnswer(messages: { role: string; content: string }[]): Promise<{ text: string | null; provider: string | null }> {
  for (const fn of PROVIDER_CHAIN) {
    try {
      const text = await fn(messages)
      if (text && text.trim()) return { text: text.trim(), provider: fn.name.replace('call', '').toLowerCase() }
    } catch { /* пробуем следующего провайдера */ }
  }
  return { text: null, provider: null }
}

// ─── Промпт ─────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — ИИ-ассистент автомобильного портала AutoEvoFlow, который рассказывает об истории, поколениях и характеристиках автомобилей.

ПРАВИЛА (обязательны):
1. Отвечай СТРОГО на основе данных из блока "ДАННЫЕ ИЗ БАЗЫ", который будет приложен к вопросу пользователя. Это единственный источник фактов (годы, индексы поколений вроде E46/E36, мощность, тип двигателя и т.д.).
2. НИКОГДА не выдумывай и не додумывай цифры, годы, названия модификаций или факты, которых нет в предоставленных данных — даже если они кажутся правдоподобными. Лучше честно сказать, что данных нет.
3. Если вопрос касается модели/факта, не покрытого приложенными данными, прямо скажи об этом ("в базе AutoEvoFlow нет точных данных об этом") вместо того, чтобы отвечать по общим знаниям.
4. КРИТИЧНО: ноды в "ДАННЫЕ ИЗ БАЗЫ" подобраны автоматическим поиском по ключевым словам и иногда НЕ имеют отношения к вопросу (например, вопрос вообще не об автомобилях, или о бренде/модели, которых нет в списке). Если ни одна нода из блока реально не отвечает на заданный вопрос — НЕ пытайся притянуть их за уши и не пересказывай их просто потому, что они есть. Вместо этого прямо скажи, что по этому вопросу у тебя нет релевантных данных.
5. Отвечай только на русском языке, по существу, живым языком — обычно 2-5 предложений, можно больше для сравнений нескольких поколений.
6. Используй историю диалога (предыдущие сообщения) для понимания уточняющих вопросов типа "а следующее поколение?" — но факты по-прежнему бери только из блока "ДАННЫЕ ИЗ БАЗЫ" текущего сообщения.`

function buildUserContent(question: string, context: ContextResult): string {
  const header = context.usedFallback
    ? 'ДАННЫЕ ИЗ БАЗЫ — поиск по ключевым словам вопроса не нашёл совпадений, ниже просто несколько случайных моделей из базы ДЛЯ ПРИМЕРА (вероятно, они НЕ относятся к вопросу — если это так, честно скажи, что данных по вопросу нет, не пересказывай их):'
    : 'ДАННЫЕ ИЗ БАЗЫ (используй только их для фактов — id, бренд и модель, год, мощность, тип двигателя, тип кузова, заметка):'

  return `${header}
${buildContextBlock(context.nodes)}

ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${question}`
}

// ─── Route handler ──────────────────────────────────────────────────────────────

const MAX_HISTORY_TURNS = 10
const MAX_QUESTION_LENGTH = 1000

export async function POST(req: Request) {
  let body: { question?: string; history?: ChatTurn[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const question = (body.question ?? '').trim().slice(0, MAX_QUESTION_LENGTH)
  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((h): h is ChatTurn =>
          !!h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim().length > 0
        )
        .slice(-MAX_HISTORY_TURNS)
    : []

  const nodes = loadNodes()
  const context = selectContext(question, history, nodes)

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: buildUserContent(question, context) },
  ]

  const { text } = await generateAnswer(messages)

  if (!text) {
    return NextResponse.json(
      { error: 'Все ИИ-провайдеры сейчас недоступны (возможно, исчерпан дневной лимит запросов). Попробуйте, пожалуйста, чуть позже.' },
      { status: 503 }
    )
  }

  return NextResponse.json({ answer: text })
}
