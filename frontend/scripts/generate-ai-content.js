/**
 * Предпосчёт ИИ-контента (DNA-радар бренда + текстовые ИИ-анализы) для
 * AutoEvoFlow. Раньше это делал отдельный Python-бэкенд (FastAPI+Postgres+
 * Neo4j), который никогда не был задеплоен — все вызовы с фронтенда падали
 * на ERR_CONNECTION_REFUSED. Контракт фронтенда (DesignDNA.dimensions,
 * AIAnalysis.insights) этот бэкенд в итоге бы и не удовлетворил: его
 * /brands/{slug}/dna отдавал граф Neo4j (nodes/edges), а не радарные оси —
 * формы никогда не совпадали. Поэтому пишем заново и считаем ИИ-контент
 * прямо по public/data/evolution/graph.json, результат кэшируем в JSON
 * рядом (public/data/ai/*.json), страницы просто читают готовое — без
 * обращения к LLM на каждый визит.
 *
 * Два прохода:
 *   --only=brands  — DNA + анализ бренда, по всем 117 брендам.
 *   --only=models  — текстовый "design_evolution"-анализ, только для
 *                    МНОГОпоколенческих моделей (generationCount>=2, 477 из
 *                    2366 групп) — у одно-поколенческой модели по смыслу
 *                    нет "эволюции", которую стоило бы пересказывать.
 *   (без --only)   — оба прохода подряд.
 *
 * Чекпоинт/резюме: результат каждого прохода пишется в СУЩЕСТВУЮЩИЙ JSON
 * (если он уже есть) — уже посчитанные ключи пропускаются, --force считает
 * заново всё. Так скрипт можно безопасно прервать и перезапустить, не теряя
 * уже оплаченные LLM-вызовы.
 */
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

const GRAPH_FILE   = path.join(__dirname, '..', 'public', 'data', 'evolution', 'graph.json')
const AI_DIR        = path.join(__dirname, '..', 'public', 'data', 'ai')
const BRANDS_OUT    = path.join(AI_DIR, 'brands.json')
const MODELS_OUT    = path.join(AI_DIR, 'models.json')

const args = process.argv.slice(2)
const ONLY  = (args.find(a => a.startsWith('--only=')) || '').split('=')[1]
const FORCE = args.includes('--force')
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1] || Infinity)

// ─── LLM providers — тот же проверенный в продакшене (6-часовая публикация
// в Telegram) набор из 8 независимых провайдеров и тот же порядок перебора,
// что в scripts/publish-new-stories.js. Один живой ключ — и батч не встанет;
// на момент написания Yandex (403 — не выдана роль в IAM) и DeepSeek (402 —
// нулевой баланс) оба недоступны, поэтому остальные 6 обязательны, а не
// просто подстраховка. ──────────────────────────────────────────────────────

const OPENROUTER_FREE_MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'poolside/laguna-s-2.1:free',
]

async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.startsWith('your_')) return null
  const system = messages.find(m => m.role === 'system')?.content || ''
  const user = messages.find(m => m.role === 'user')?.content || ''
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 4000 },
  })
  for (const model of ['gemini-flash-latest', 'gemini-pro-latest']) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    let lastErr
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 6000))
      let res
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(90_000) })
      } catch (e) { lastErr = e; break }
      if (res.status === 503) { lastErr = new Error('Gemini 503 overloaded'); continue }
      if (!res.ok) { lastErr = new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 150)}`); break }
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts ?? []
      const text = parts.filter(p => !p.thought).map(p => p.text || '').join('')
      if (text) return text
      lastErr = new Error(`Gemini ${model}: empty response`)
      break
    }
    if (lastErr?.message?.includes('503') || lastErr?.message?.includes('overloaded')) continue
    if (lastErr) throw lastErr
  }
  throw new Error('Gemini: all models unavailable')
}

async function callDeepSeek(messages) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callYandex(messages) {
  const apiKey = process.env.YANDEX_API_KEY
  const folderId = process.env.YANDEX_FOLDER_ID
  if (!apiKey || apiKey.startsWith('your_') || !folderId) return null
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: { Authorization: `Api-Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/yandexgpt-pro/latest`,
      completionOptions: { stream: false, temperature: '0.4', maxTokens: '2500' },
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', text: m.content })),
    }),
    signal: AbortSignal.timeout(40_000),
  })
  if (!res.ok) throw new Error(`Yandex ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.result?.alternatives?.[0]?.message?.text ?? null
}

async function callQwen(messages) {
  const key = process.env.QWEN_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen-plus', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Qwen ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callOpenRouter(messages) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || key.startsWith('your_')) return null
  let lastErr
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://autoevoflow.local',
          'X-Title': 'AutoEvoFlow',
        },
        body: JSON.stringify({ model, messages, max_tokens: 2500, temperature: 0.4 }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) { lastErr = new Error(`OpenRouter ${model} ${res.status}: ${await res.text()}`); continue }
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content) return content
      lastErr = new Error(`OpenRouter ${model}: empty response`)
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('OpenRouter: all free models unavailable')
}

async function callCerebras(messages) {
  const key = process.env.CEREBRAS_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Cerebras ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callNvidia(messages) {
  const key = process.env.NVIDIA_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`NVIDIA NIM ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callMistral(messages) {
  const key = process.env.MISTRAL_API_KEY
  if (!key || key.startsWith('your_')) return null
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-small-latest', messages, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

const PROVIDER_CHAIN = [callGemini, callDeepSeek, callYandex, callQwen, callOpenRouter, callCerebras, callNvidia, callMistral]

const SYSTEM_PROMPT =
  'Ты эксперт-аналитик в области автомобильного дизайна и истории автопромышленности. ' +
  'Отвечай строго в формате JSON без пояснений, без markdown-обёрток ```json.'

function extractJSON(text) {
  const clean = String(text).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch {}
  }
  return null
}

async function callLLM(systemText, userText) {
  const messages = [
    { role: 'system', content: systemText },
    { role: 'user', content: userText },
  ]
  for (const fn of PROVIDER_CHAIN) {
    try {
      const text = await fn(messages)
      if (text) {
        const parsed = extractJSON(text)
        if (parsed) return { parsed, provider: fn.name.replace('call', '').toLowerCase() }
      }
    } catch (err) {
      console.warn(`  [warn] ${fn.name} failed: ${err.message}`)
    }
  }
  return { parsed: null, provider: null }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Данные из графа ────────────────────────────────────────────────────────

function loadGraph() {
  return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8')).nodes
}

// Ключ БЕЗ префикса бренда — ровно то же "modelSlug || id", что уже
// подтверждено глобально уникальным по всему графу (0 коллизий между
// брендами) и что ожидает URL /model/{slug} (без бренда в пути).
function groupByModel(nodes) {
  const byModel = new Map()
  for (const n of nodes) {
    const key = n.modelSlug || n.id
    const arr = byModel.get(key) || []
    arr.push(n)
    byModel.set(key, arr)
  }
  return byModel
}

function loadOut(file) {
  if (FORCE) return {}
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return {} }
}

function saveOut(file, data) {
  fs.mkdirSync(AI_DIR, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

// ─── Проход 1: бренды (DNA + анализ) ────────────────────────────────────────

async function runBrands() {
  const nodes = loadGraph()
  const byBrand = new Map()
  for (const n of nodes) {
    const arr = byBrand.get(n.brandId) || []
    arr.push(n)
    byBrand.set(n.brandId, arr)
  }

  const out = loadOut(BRANDS_OUT)
  const brandIds = [...byBrand.keys()].filter(id => FORCE || !out[id]).slice(0, LIMIT)
  console.log(`[brands] к обработке: ${brandIds.length} из ${byBrand.size} (пропущено уже готовых: ${byBrand.size - brandIds.length})`)

  let done = 0, failed = 0
  for (const brandId of brandIds) {
    const brandNodes = byBrand.get(brandId)
    const brandName = brandNodes[0].brandName || brandId
    const sample = [...brandNodes]
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
      .slice(0, 18)
      .map(n => `  • ${n.fullName || n.label} (${n.year ?? '?'}) — ${n.bodyType || '?'}, ${n.segment || '?'}, ${n.hp ? n.hp + ' л.с.' : ''} ${n.engineType || ''}`.trim())
      .join('\n')

    const userPrompt = `Бренд: ${brandName}. Примеры моделей из каталога (${brandNodes.length} поколений всего):
${sample}

Верни СТРОГО JSON (без обёрток) ровно такой структуры:
{
  "dna": {
    "overallScore": <0-100>,
    "dimensions": [
      {"key":"grille","label":"Решётка радиатора","score":<0-100>,"description":"<1 предложение>","trend":"increasing|decreasing|stable"},
      {"key":"headlights","label":"Форма фар","score":<0-100>,"description":"<1 предложение>","trend":"increasing|decreasing|stable"},
      {"key":"silhouette","label":"Силуэт","score":<0-100>,"description":"<1 предложение>","trend":"increasing|decreasing|stable"},
      {"key":"proportions","label":"Пропорции","score":<0-100>,"description":"<1 предложение>","trend":"increasing|decreasing|stable"},
      {"key":"stance","label":"Посадка/стойка","score":<0-100>,"description":"<1 предложение>","trend":"increasing|decreasing|stable"},
      {"key":"aero","label":"Аэродинамика","score":<0-100>,"description":"<1 предложение>","trend":"increasing|decreasing|stable"}
    ],
    "dominantStyle": "<2-4 слова, доминирующий дизайн-язык бренда>",
    "colorPalette": ["<цвет часто ассоциируемый с брендом>", "...", "..."],
    "keyElements": ["<узнаваемый элемент дизайна>", "...", "..."],
    "influencedBy": ["<реальный бренд, повлиявший на дизайн>"],
    "hasInfluenced": ["<реальный бренд, на который повлиял этот>"]
  },
  "analysis": {
    "headline": "<броский заголовок до 80 символов>",
    "summary": "<2-3 предложения о дизайн-философии и роли бренда>",
    "fullText": "<4-6 абзацев: история дизайн-языка, ключевые вехи, инженерная философия, культурное значение>",
    "insights": [
      {"id":"ins-01","category":"Design","text":"<факт>","confidence":0.9,"importance":"critical"},
      {"id":"ins-02","category":"Engineering","text":"<факт>","confidence":0.85,"importance":"high"},
      {"id":"ins-03","category":"Heritage","text":"<факт>","confidence":0.85,"importance":"high"},
      {"id":"ins-04","category":"Market","text":"<факт>","confidence":0.8,"importance":"medium"},
      {"id":"ins-05","category":"Influence","text":"<факт>","confidence":0.8,"importance":"medium"}
    ],
    "confidenceScore": <0-1>
  }
}`

    process.stdout.write(`[brands] ${brandName}... `)
    const { parsed, provider } = await callLLM(SYSTEM_PROMPT, userPrompt)
    if (!parsed?.dna || !parsed?.analysis) {
      console.log('FAIL (все провайдеры недоступны или вернули невалидный JSON)')
      failed++
      continue
    }

    const now = new Date().toISOString()
    out[brandId] = {
      dna: {
        id: `dna-${brandId}`,
        entityType: 'brand',
        entityId: brandId,
        overallScore: parsed.dna.overallScore ?? 70,
        dimensions: parsed.dna.dimensions ?? [],
        dominantStyle: parsed.dna.dominantStyle ?? '',
        colorPalette: parsed.dna.colorPalette ?? [],
        keyElements: parsed.dna.keyElements ?? [],
        influencedBy: parsed.dna.influencedBy ?? [],
        hasInfluenced: parsed.dna.hasInfluenced ?? [],
        createdAt: now,
      },
      analysis: {
        id: `analysis-brand-${brandId}`,
        entityType: 'brand',
        entityId: brandId,
        analysisType: 'brand_dna',
        provider,
        headline: parsed.analysis.headline ?? brandName,
        summary: parsed.analysis.summary ?? '',
        fullText: parsed.analysis.fullText ?? '',
        insights: parsed.analysis.insights ?? [],
        confidenceScore: parsed.analysis.confidenceScore ?? 0.8,
        processingTimeMs: 0,
        createdAt: now,
        isCached: true,
        metadata: { language: 'ru' },
      },
    }
    saveOut(BRANDS_OUT, out)
    console.log(`OK (${provider})`)
    done++
    await sleep(2500)
  }
  console.log(`[brands] готово: ${done}, провалено: ${failed}`)
}

// ─── Проход 2: модели (design_evolution), только многопоколенческие ────────

async function runModels() {
  const nodes = loadGraph()
  const byModel = groupByModel(nodes)
  const out = loadOut(MODELS_OUT)

  const candidates = [...byModel.entries()].filter(([, arr]) => arr.length >= 2)
  const todo = candidates.filter(([key]) => FORCE || !out[key]).slice(0, LIMIT)
  console.log(`[models] многопоколенческих моделей: ${candidates.length}, к обработке: ${todo.length} (пропущено готовых: ${candidates.length - todo.length})`)

  let done = 0, failed = 0
  for (const [key, group] of todo) {
    const sorted = [...group].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    const brandName = sorted[0].brandName || sorted[0].brandId
    const modelName = (sorted[sorted.length - 1].fullName || sorted[sorted.length - 1].label).replace(/\s*\(\d{4}\)\s*$/, '')
    const genContext = sorted
      .map(n => `  • ${n.codeName || n.label} (${n.year ?? '?'}): ${n.hp ? n.hp + ' л.с.' : ''} ${n.engineType || ''}, ${n.bodyType || ''}. ${n.note || ''}`.trim())
      .join('\n')

    const userPrompt = `Создай аналитический отчёт об эволюции модели ${brandName} ${modelName} для платформы AutoEvoFlow.

ПОКОЛЕНИЯ (хронологически):
${genContext}

Верни СТРОГО JSON (без обёрток):
{
  "headline": "<заголовок до 80 символов>",
  "summary": "<2-3 предложения о ключевой роли модели в линейке бренда>",
  "fullText": "<4-6 абзацев: как менялся дизайн/техника между поколениями, ключевые инновации, культурное значение>",
  "insights": [
    {"id":"ins-01","category":"Engineering","text":"<факт>","confidence":0.9,"importance":"critical"},
    {"id":"ins-02","category":"Design","text":"<факт>","confidence":0.85,"importance":"high"},
    {"id":"ins-03","category":"Heritage","text":"<факт>","confidence":0.8,"importance":"high"},
    {"id":"ins-04","category":"Market","text":"<факт>","confidence":0.8,"importance":"medium"},
    {"id":"ins-05","category":"Influence","text":"<факт>","confidence":0.75,"importance":"medium"}
  ],
  "confidenceScore": <0-1>
}`

    process.stdout.write(`[models] ${brandName} ${modelName}... `)
    const { parsed, provider } = await callLLM(SYSTEM_PROMPT, userPrompt)
    if (!parsed) {
      console.log('FAIL')
      failed++
      continue
    }

    out[key] = {
      analysis: {
        id: `analysis-model-${key}`,
        entityType: 'model',
        entityId: key,
        analysisType: 'design_evolution',
        provider,
        headline: parsed.headline ?? `${brandName} ${modelName}`,
        summary: parsed.summary ?? '',
        fullText: parsed.fullText ?? '',
        insights: parsed.insights ?? [],
        confidenceScore: parsed.confidenceScore ?? 0.8,
        processingTimeMs: 0,
        createdAt: new Date().toISOString(),
        isCached: true,
        metadata: { language: 'ru' },
      },
    }
    saveOut(MODELS_OUT, out)
    console.log(`OK (${provider})`)
    done++
    await sleep(2500)
  }
  console.log(`[models] готово: ${done}, провалено: ${failed}`)
}

async function main() {
  if (!ONLY || ONLY === 'brands') await runBrands()
  if (!ONLY || ONLY === 'models') await runModels()
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})
