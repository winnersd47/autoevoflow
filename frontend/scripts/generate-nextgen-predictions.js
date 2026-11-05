'use strict'
/**
 * generate-nextgen-predictions.js — batch-предпосчёт "ИИ-прогноза следующего
 * поколения" (см. src/app/api/nextgen/route.ts + NextGenDesigner.tsx) для
 * АКТИВНЫХ моделей графа, чтобы живой сайт не генерировал это на лету при
 * первом клике каждого посетителя.
 *
 * Важно: в рантайме Vercel serverless-функций (сам роут /api/nextgen)
 * файловая система read-only (EROFS) — попытка записать кэш там падает
 * молча (route это уже обрабатывает). Единственный способ реально заполнить
 * nextgenPrediction в public/data/models/<slug>.json — посчитать здесь,
 * локально/в облачной сессии с обычной записываемой ФС, и закоммитить
 * результат в git, откуда его уже отдаёт статика на проде.
 *
 * buildPrompt/callGroq/parseResult сознательно СКОПИРОВАНЫ из route.ts, а не
 * вынесены в общий модуль — тот же принцип "порт, не шаринг", что уже
 * применён для LLM-цепочки в generate-ai-content.js/publish-new-stories.js.
 *
 * В отличие от живого роута, здесь НЕТ автоматического фоллбека на платный
 * Claude при ошибке Groq — это несупервизируемый batch на ~300 моделей, и
 * тихий переход на платный провайдер для всех них при сбое Groq означал бы
 * неожиданный счёт. При сбое Groq — просто пропускаем модель и идём дальше.
 *
 * Флаги: --limit=N (ограничить число обрабатываемых моделей),
 *        --force (пересчитать даже уже имеющие nextgenPrediction),
 *        --dry-run (показать, что было бы сгенерировано, без вызова Groq).
 */
const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  })
}

const GRAPH_FILE  = path.join(ROOT, 'public', 'data', 'evolution', 'graph.json')
const MODELS_DIR  = path.join(ROOT, 'public', 'data', 'models')

const args  = process.argv.slice(2)
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1] || Infinity)
const FORCE = args.includes('--force')
const DRY_RUN = args.includes('--dry-run')

// ─── Порт из src/app/api/nextgen/route.ts ──────────────────────────────────

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-120b'

const ZONE_LABEL = {
  hypercar: 'гиперкар', supercar: 'суперкар', sports: 'спорткар',
  gt_coupe: 'GT купе', electric: 'электромобиль', suv_large: 'large SUV',
  suv_mid: 'mid SUV', suv_compact: 'compact SUV', exec_sed: 'бизнес-седан',
  flagship_sed: 'флагманский седан', midsize_sed: 'среднеразмерный седан',
  ultra_luxury: 'ultra luxury',
}

function buildPrompt(brandName, modelName, lastYear, lastHp, engineType, zone, notes) {
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

function parseResult(text) {
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

async function callGroq(prompt, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  })
  if (res.status === 429) {
    const err = new Error('rate_limited')
    err.rateLimited = true
    throw err
  }
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ─── Отбор активных моделей (та же формула isActive, что в
// src/app/api/models/[id]/route.ts) ─────────────────────────────────────────

function selectActiveModels() {
  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))
  const byModel = new Map()
  for (const n of graph.nodes) {
    const key = n.modelSlug || n.id
    const arr = byModel.get(key) || []
    arr.push(n)
    byModel.set(key, arr)
  }
  const latestGraphYear = Math.max(...graph.nodes.map(n => n.year ?? 0))
  const currentYear = new Date().getFullYear()

  const result = []
  for (const [slug, nodes] of byModel) {
    const sorted = [...nodes].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    const last = sorted[sorted.length - 1]
    const endYear = last.year ?? 0
    const isActive = endYear >= latestGraphYear - 3 || endYear >= currentYear - 1
    if (!isActive) continue

    const brandName = last.brandName || last.brandId
    // Та же обрезка префикса бренда, что в /api/models/[id]/route.ts —
    // иначе "BMW BMW 3 Series" (fullName/label части графа уже содержат бренд).
    const brandNameRe = new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
    const modelName = (last.fullName || last.label || '')
      .replace(/\s*\(\d{4}\)\s*$/, '')
      .replace(brandNameRe, '')
    result.push({
      slug,
      brandName,
      modelName,
      lastYear: last.year ?? 0,
      lastHp: last.hp,
      engineType: last.engineType,
      zone: last.zone,
      notes: last.note ? [last.note] : undefined,
    })
  }
  return result
}

function hasExistingPrediction(slug) {
  const file = path.join(MODELS_DIR, `${slug}.json`)
  if (!fs.existsSync(file)) return false
  try {
    return !!JSON.parse(fs.readFileSync(file, 'utf-8')).nextgenPrediction
  } catch {
    return false
  }
}

function writePrediction(slug, prediction) {
  const file = path.join(MODELS_DIR, `${slug}.json`)
  let data = {}
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { data = {} }
  }
  data.nextgenPrediction = prediction
  fs.mkdirSync(MODELS_DIR, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

async function main() {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey || groqKey.startsWith('your_')) {
    console.error('GROQ_API_KEY не задан в .env.local — нечего делать.')
    process.exit(1)
  }

  const candidates = selectActiveModels()
    .filter(m => FORCE || !hasExistingPrediction(m.slug))
    .slice(0, LIMIT)

  console.log(`Активных моделей без прогноза: ${candidates.length}${DRY_RUN ? ' (dry-run)' : ''}`)

  let ok = 0, failed = 0, rateLimitRetries = 0

  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i]
    const tag = `[${i + 1}/${candidates.length}] ${m.brandName} ${m.modelName}`

    if (DRY_RUN) {
      console.log(`${tag} ... (dry-run, пропуск вызова)`)
      continue
    }

    const prompt = buildPrompt(m.brandName, m.modelName, m.lastYear, m.lastHp, m.engineType, m.zone, m.notes)

    let attempt = 0
    let success = false
    while (attempt < 2 && !success) {
      attempt++
      try {
        const text = await callGroq(prompt, groqKey)
        const result = { ...parseResult(text), generatedAt: new Date().toISOString() }
        writePrediction(m.slug, result)
        console.log(`${tag} ... OK (${result.predictedYear}, ${result.predictedHp ?? '?'}hp)`)
        ok++
        success = true
      } catch (err) {
        if (err.rateLimited && attempt < 2) {
          rateLimitRetries++
          console.log(`${tag} ... rate-limited, жду 20с и пробую ещё раз`)
          await sleep(20000)
          continue
        }
        console.log(`${tag} ... ОШИБКА: ${err.message}`)
        failed++
      }
    }

    await sleep(3000)
  }

  console.log(`\nГотово: обработано ${candidates.length}, успешно ${ok}, с ошибкой ${failed}, retry по rate-limit ${rateLimitRetries}`)
}

main().catch(err => {
  console.error('Фатальная ошибка:', err)
  process.exit(1)
})
