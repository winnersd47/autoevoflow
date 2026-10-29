'use strict'
/**
 * sync-node-images-to-models.js — Фаза 1 найденного пробела с картинками на
 * /evolution: hover-карточка берёт картинку из public/data/models/<slug>.json
 * (fetch по nodeData.modelSlug — см. EvolutionGraph.tsx), а НЕ напрямую из
 * heroImageUrl узла графа. У 168 групп картинка уже ЕСТЬ на каком-то узле
 * графа (сам узел добавлялся скрейпером с heroImageUrl), но файл модели либо
 * не существует, либо не содержит эту картинку — hover её просто не найдёт.
 * Это бесплатный, без единого запроса в сеть, проход — просто синхронизирует
 * то, что уже есть, в то место, откуда реально читает UI.
 */
const fs   = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const GRAPH_FILE = path.join(ROOT, 'public/data/evolution/graph.json')
const MODELS_DIR = path.join(ROOT, 'public/data/models')

const g = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'))

const byModel = new Map()
for (const n of g.nodes) {
  const key = n.modelSlug || n.id
  const arr = byModel.get(key) || []
  arr.push(n)
  byModel.set(key, arr)
}

let created = 0, updated = 0
for (const [slug, nodes] of byModel) {
  const file = path.join(MODELS_DIR, `${slug}.json`)
  let data = null
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { data = null }
  }
  if (data?.heroImageUrl || data?.thumbnailUrl) continue // уже есть — пропуск

  // Берём картинку с самого информативного узла группы (с hp, т.е. не голый стаб).
  const sorted = [...nodes].sort((a, b) => (b.hp ? 1 : 0) - (a.hp ? 1 : 0) || (b.year ?? 0) - (a.year ?? 0))
  const withImage = sorted.find(n => n.heroImageUrl || n.thumbnailUrl)
  if (!withImage) continue

  const last = sorted[0]
  if (data) {
    data.heroImageUrl = withImage.heroImageUrl || withImage.thumbnailUrl
    data.thumbnailUrl = withImage.thumbnailUrl || withImage.heroImageUrl
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    updated++
  } else {
    const brandId = last.brandId
    const modelName = (last.fullName || last.label || '').replace(/\s*\(\d{4}\)\s*$/, '')
    const years = nodes.map(n => n.year ?? 0)
    fs.mkdirSync(MODELS_DIR, { recursive: true })
    fs.writeFileSync(file, JSON.stringify({
      id: `sync-${slug}`,
      slug,
      name: modelName,
      fullName: last.fullName || last.label,
      brandId,
      bodyType: last.bodyType || 'sedan',
      segment: last.segment || 'other',
      primaryMarket: 'global',
      startYear: Math.min(...years),
      isActive: true,
      description: last.note || last.description || '',
      generationCount: nodes.length,
      heroImageUrl: withImage.heroImageUrl || withImage.thumbnailUrl,
      thumbnailUrl: withImage.thumbnailUrl || withImage.heroImageUrl,
      tags: [],
      aiAnalysisAvailable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, null, 2))
    created++
  }
}

console.log(`Создано файлов: ${created}, обновлено: ${updated}`)
