'use strict'
const fs = require('fs')
const path = require('path')

const BRANDS_FILE = path.join(__dirname, '../public/data/brands.json')
const BRANDS_DIR = path.join(__dirname, '../public/data/brands')
const MODELS_FILE = path.join(__dirname, '../public/data/evolution/graph.json')

const brands = JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf-8'))
const graph = JSON.parse(fs.readFileSync(MODELS_FILE, 'utf-8'))

const CHINA_SLUGS = ['byd','nio','xpeng','geely','zeekr','lynk-co','li-auto','denza','aito','hiphi','avatr','seres']

// Build models list from graph nodes for a given brandId
function buildModelsForBrand(brandSlug) {
  const nodes = graph.nodes.filter(n => n.brandId === brandSlug)
  // Group by modelSlug to collapse generations into "models"
  const modelMap = new Map()
  for (const n of nodes) {
    const key = n.modelSlug || n.id
    if (!modelMap.has(key)) {
      modelMap.set(key, {
        id: 'm-' + key,
        slug: key,
        name: n.label,
        fullName: (n.brandName || '') + ' ' + n.label,
        brandId: 'brand-' + brandSlug,
        bodyType: n.bodyType || 'suv',
        segment: n.segment || 'crossover',
        primaryMarket: 'china',
        startYear: n.year,
        endYear: null,
        isActive: true,
        description: null,
        generationCount: 1,
        thumbnailUrl: '',
        heroImageUrl: '',
        tags: [brandSlug, n.bodyType || 'suv', String(n.year)].filter(Boolean),
        aiAnalysisAvailable: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      })
    } else {
      modelMap.get(key).generationCount++
      // Use earliest year as startYear
      if (n.year < modelMap.get(key).startYear) modelMap.get(key).startYear = n.year
    }
  }
  return Array.from(modelMap.values())
}

let created = 0
for (const slug of CHINA_SLUGS) {
  const outPath = path.join(BRANDS_DIR, slug + '.json')
  if (fs.existsSync(outPath)) {
    console.log('  = skip (exists):', slug + '.json')
    continue
  }

  const brand = brands.find(b => b.slug === slug)
  if (!brand) { console.log('  ⚠ brand not found in brands.json:', slug); continue }

  const models = buildModelsForBrand(slug)

  const brandFile = {
    ...brand,
    models,
  }

  fs.writeFileSync(outPath, JSON.stringify(brandFile, null, 2))
  console.log('  + created:', slug + '.json', '(' + models.length + ' models)')
  created++
}

console.log('\nCreated:', created, 'brand files')
