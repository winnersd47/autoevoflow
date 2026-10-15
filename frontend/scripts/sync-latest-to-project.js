/**
 * sync-latest-to-project.js
 * Синхронизирует новинки из latest-cars.json во все части проекта:
 *   1. public/data/evolution/graph.json  → узлы для Эволюции
 *   2. public/data/brands/<brand>.json   → модели в разделе Бренды
 *   3. public/data/models/<slug>.json    → страницы моделей
 *
 * Запуск: node scripts/sync-latest-to-project.js
 * Вызывается автоматически из scrape-latest.js после каждого парсинга.
 */
const fs   = require('fs')
const path = require('path')

const ROOT        = path.join(__dirname, '..')
const LATEST_FILE = path.join(ROOT, 'public/data/latest-cars.json')
const GRAPH_FILE  = path.join(ROOT, 'public/data/evolution/graph.json')
const BRANDS_DIR  = path.join(ROOT, 'public/data/brands')
const MODELS_DIR  = path.join(ROOT, 'public/data/models')
const A777_CATALOG_FILE = path.join(ROOT, 'public/data/a777-catalog-cache.json')

const A777_BRAND_MAP = require('./a777-brand-map.js')
const { crawlBrandCatalog, lookupA777ForNode } = require('./a777-lib.js')

// ─── Парсинг технических данных из описания ───────────────────────────────────
function inferFromDescription(name, desc = '') {
  const text = (name + ' ' + desc).toLowerCase()

  // Лошадиные силы
  let hp = 0
  const hpM = desc.match(/(\d[\d,]+)\s*(?:ps|hp|ch|cv)/i) ||
               desc.match(/(\d[\d,]+)\s*(?:bhp)/i) ||
               desc.match(/(\d+)\s*kw/i)
  if (hpM) {
    const raw = parseInt(hpM[1].replace(',',''))
    // kW → hp: ×1.341
    hp = hpM[0].toLowerCase().includes('kw') ? Math.round(raw * 1.341) : raw
  }
  if (hp < 50 || hp > 3000) hp = 0

  // Тип двигателя — БЕЗ дефолта. Живой найденный баг: 'i4t' как fallback
  // молча приписывался машинам, чей реальный двигатель просто не упомянут в
  // обрезанном description (netcarshow режет описание на первый абзац — там
  // часто история/контекст, а спеки двигателя идут позже и не долетают до
  // скрапа). Bugatti Veyron (W16) и Koenigsegg CCGT1 (V8T) оба получили
  // ложный 'i4t' именно так. Ненайденный тип двигателя — не турбочетвёрка по
  // умолчанию, а неизвестность: оставляем undefined, заполнит энrichment
  // (A777) или ручная/агентская проверка.
  let engineType
  if (/\belectric\b|\bev\b|\bbev\b/.test(text))              engineType = 'ev'
  else if (/\bhybrid\b/.test(text) && /v8/.test(text))        engineType = 'v8h'
  else if (/\bhybrid\b/.test(text) && /v6/.test(text))        engineType = 'v6h'
  else if (/\bhybrid\b/.test(text))                           engineType = 'i4h'
  else if (/w16/.test(text))                                  engineType = 'w16'
  else if (/v12/.test(text) && /turbo/.test(text))            engineType = 'v12t'
  else if (/v12/.test(text))                                  engineType = 'v12'
  else if (/v10/.test(text))                                  engineType = 'v10'
  else if (/v8/.test(text) && /turbo|biturbo|twinturbo/.test(text)) engineType = 'v8t'
  else if (/v8/.test(text))                                   engineType = 'v8'
  else if (/flat.?6|boxer.?6|h6/.test(text) && /turbo/.test(text)) engineType = 'flat6t'
  else if (/flat.?6|boxer.?6|h6/.test(text))                 engineType = 'flat6'
  else if (/v6/.test(text) && /turbo/.test(text))             engineType = 'v6t'
  else if (/v6/.test(text))                                   engineType = 'v6'
  else if (/i6|inline.?6|straight.?6/.test(text) && /turbo/.test(text)) engineType = 'i6t'
  else if (/i6|inline.?6|straight.?6/.test(text))            engineType = 'i6'
  else if (/i5|five.?cyl/.test(text) && /turbo/.test(text))  engineType = 'i5t'
  else if (/i4|four.?cyl|2\.0|1\.6|1\.8|2\.5|2\.3/.test(text) && /turbo/.test(text)) engineType = 'i4t'

  return { hp: hp || undefined, engineType }
}

// ─── Определение zone по названию и описанию ─────────────────────────────────
function inferZone(name, desc = '', brandSlug = '') {
  const text = (name + ' ' + desc).toLowerCase()

  // Суперкары / гиперкары
  const SUPER_BRANDS = ['ferrari','lamborghini','mclaren','bugatti','koenigsegg','pagani','rimac','astonmartin']
  const isSuperBrand = SUPER_BRANDS.includes(brandSlug)

  if (/\bhypercar\b|\bhyper car\b/.test(text)) return 'hypercar'
  if (isSuperBrand && /\bgts\b|\bgt\d\b|\bxx\b|\blm\b|\bfxx\b/.test(text)) return 'hypercar'
  if (/\bsupercar\b/.test(text) || (isSuperBrand && !/suv|crossover|sedan/.test(text))) return 'supercar'
  if (/\bsuv\b|\bcrossover\b|\boffroad\b|\boff-road\b/.test(text)) {
    if (/\bfull.?size\b|\bfullsize\b|\blarge\b/.test(text)) return 'suv_large'
    if (/\bcompact\b|\bsmall\b|\bsubcompact\b/.test(text)) return 'suv_compact'
    return 'suv_mid'
  }
  if (/\belectric\b|\bev\b|\bbev\b|\bzero.?emission\b/.test(text)) return 'electric'
  if (/\bconcept\b|\bstudy\b|\bshocar\b/.test(text)) return 'concept'
  if (/\bpickup\b|\btruck\b/.test(text)) return 'pickup'
  if (/\bconvertible\b|\broadster\b|\bcabrio\b|\bspider\b|\bspyder\b/.test(text)) return 'open_top'
  if (/\bgt coupe\b|\bgran turismo\b|\bgranturismo\b/.test(text)) return 'gt_coupe'
  if (/\bcoupe\b|\bsportscar\b|\bsports car\b/.test(text)) return 'sports'
  if (/\bflagship\b|\bluxury sedan\b/.test(text)) return 'flagship_sed'
  if (/\bexecutive\b|\bbusiness class\b/.test(text)) return 'exec_sed'
  if (/\bsedan\b|\blimousine\b/.test(text)) return 'midsize_sed'
  if (/\bhatchback\b|\bhotch\b/.test(text)) return 'hatchback'
  if (/\bestate\b|\bwagon\b|\btourer\b/.test(text)) return 'estate'

  // По бренду — дефолтная зона
  if (isSuperBrand) return 'supercar'
  return 'midsize_sed'
}

// ─── Поиск ближайшего родителя в графе ────────────────────────────────────────
function findParentNode(car, graphNodes) {
  const nameLower = car.name.toLowerCase()
  const brand     = car.brandSlug

  // Сначала ищем по ключевым словам в названии новинки
  const SUCCESSORS = [
    { keys: ['nuvolari', 'r8 successor'],          parent: 'audi-r8-typ4s'          },
    { keys: ['rs7', 'rs 7'],                       parent: 'audi-rs7-4k'             },
    { keys: ['rs6', 'rs 6'],                       parent: 'audi-rs6-c8'             },
    { keys: ['a4', 'b11'],                         parent: 'audi-a4b10'              },
    { keys: ['m3 cs', 'm3 competition', 'm3 touring', 'm3 gts'], parent: 'bmw-m3-g80', variant: true },
    { keys: ['m4 cs', 'm4 competition', 'm4 gts'],             parent: 'bmw-m4-g82', variant: true },
    { keys: ['m5 cs', 'm5 competition'],                       parent: 'bmw-m5-g30', variant: true },
    { keys: ['m3'],                                parent: 'bmw-m3-g80'              },
    { keys: ['m4'],                                parent: 'bmw-m4-g82'              },
    { keys: ['m5'],                                parent: 'bmw-m5-g30'              },
    { keys: ['x5 m', 'x5m'],                        parent: 'bmw-x5m-f95'            },
    { keys: ['ix5'],                               parent: 'bmw-ix5-g05e'           },
    { keys: ['x5'],                                parent: 'bmw-x5-g65'             },
    { keys: ['7 series', '7-series', 'g71'],       parent: 'bmw-7-g70'              },
    { keys: ['5 series', '5-series', 'g61'],       parent: 'bmw-i5-g60'             },
    { keys: ['c-class', 'c class'],                parent: 'merc-c-w206'             },
    { keys: ['e-class', 'e class'],                parent: 'merc-w213'               },
    { keys: ['s-class', 's class'],                parent: 'merc-s-w223'             },
    { keys: ['911 gt3', '992 gt3', '911 gt2'],     parent: 'p911-gt3-992',  variant: true },
    { keys: ['911 turbo s', '992 turbo'],          parent: 'p911-turbo-992t', variant: true },
    { keys: ['911 gts', '911 targa', '992 gts', '911 carrera gts'], parent: 'p911-992-fl', variant: true },
    { keys: ['911', '992'],                        parent: 'p911-992-fl'             },
    { keys: ['cayenne turbo', 'cayenne gts', 'cayenne coupe e', 'cayenne s coupe'], parent: 'porsche-cay9-9ya', variant: true },
    { keys: ['cayenne'],                           parent: 'porsche-cay9-9ya'        },
    { keys: ['panamera turbo', 'panamera gts'],    parent: 'porsche-pan-971', variant: true },
    { keys: ['panamera'],                          parent: 'porsche-pan-971'         },
    { keys: ['macan gts', 'macan turbo', 'macan s coupe'], parent: 'porsche-mac-j1', variant: true },
    { keys: ['macan'],                             parent: 'porsche-mac-j1'          },
    { keys: ['chiron', 'veyron successor'],        parent: 'bugatti-chiron'          },
    { keys: ['huracán', 'huracan'],                parent: 'lambo-huracan'           },
    { keys: ['urus'],                              parent: 'lambo-urus'              },
    { keys: ['aventador', 'revuelto'],             parent: 'lamborghini-revo'        },
    { keys: ['sf90', 'sf 90'],                     parent: 'ferrari-sf90'            },
    { keys: ['296'],                               parent: 'ferrari-296'             },
    { keys: ['812'],                               parent: 'ferrari-12cil'           },
    { keys: ['roma'],                              parent: 'ferrari-roma-node'       },
    { keys: ['purosangue'],                        parent: 'ferrari-puros'           },
    { keys: ['supra'],                             parent: 'toyota-supra-a90'        },
    { keys: ['gr86', 'gr 86'],                     parent: 'toyota-gr86-zn8'        },
    { keys: ['corolla'],                           parent: 'toyota-corolla-e210'     },
    { keys: ['camry'],                             parent: 'toyota-camry-v80'        },
    { keys: ['rav4'],                              parent: 'toyota-rav4-5'           },
    { keys: ['land cruiser'],                      parent: 'toyota-lc-300'           },
    { keys: ['civic'],                             parent: 'honda-civic-fl'          },
    { keys: ['accord'],                            parent: 'honda-accord-cv'         },
    { keys: ['cr-v', 'crv'],                       parent: 'honda-crv-rn1'           },
    { keys: ['nsx'],                               parent: 'honda-nsx-nc1'           },
    { keys: ['skyline', 'gtr', 'gt-r'],            parent: 'nissan-gtr-r35'          },
    { keys: ['nissan z', 'fairlady'],               parent: 'nissan-z-rz34'           },
    { keys: ['mx-5', 'miata'],                     parent: 'mazda-mx5-nd'            },
    { keys: ['rx-'],                               parent: 'mazda-rx8-se3p'          },
    { keys: ['wrx', 'impreza'],                    parent: 'subaru-wrx-vb'           },
    { keys: ['brz'],                               parent: 'subaru-brz-zd8'          },
    { keys: ['nevera'],                            parent: 'rimac-nevera'            },
    { keys: ['valkyrie', 'valhalla'],              parent: 'am-valhalla'             },
    { keys: ['db12', 'db 12'],                     parent: 'am-db12'                 },
    { keys: ['jesko'],                             parent: 'kgsegg-jesko'            },
    { keys: ['regera'],                            parent: 'kgsegg-regera'           },
    { keys: ['utopia'],                            parent: 'pagani-utopia'           },
    // Jaguar
    { keys: ['f-type', 'ftype'],                   parent: 'jag-ftype'               },
    { keys: ['f-pace', 'fpace'],                   parent: 'jag-fpace'               },
    { keys: ['e-pace', 'epace'],                   parent: 'jag-epace'               },
    { keys: ['i-pace', 'ipace'],                   parent: 'jag-ipace'               },
    { keys: ['xf'],                                parent: 'jag-xf-x260'             },
    { keys: ['xe'],                                parent: 'jag-xe'                  },
    { keys: ['xj'],                                parent: 'jag-xj-x351'             },
    // Land Rover
    { keys: ['defender 90'],                       parent: 'lr-def-l663-90'          },
    { keys: ['defender 110'],                      parent: 'lr-def-l663-110'         },
    { keys: ['defender 130'],                      parent: 'lr-def-l663-130'         },
    { keys: ['range rover sport'],                 parent: 'lr-rrs-l461'             },
    { keys: ['range rover evoque', 'evoque'],      parent: 'lr-evoque-l551'          },
    { keys: ['range rover velar', 'velar'],        parent: 'lr-velar'                },
    { keys: ['range rover'],                       parent: 'lr-rr-l460'              },
    { keys: ['discovery sport'],                   parent: 'lr-disco-sport'          },
    { keys: ['discovery'],                         parent: 'lr-disco5'               },
    { keys: ['freelander'],                        parent: 'lr-freelander2'          },
    // Volvo
    { keys: ['ex90'],                              parent: 'volvo-ex90-1'            },
    { keys: ['ex60'],                              parent: 'volvo-ex60-1'            },
    { keys: ['ex40'],                              parent: 'volvo-ex40-1'            },
    { keys: ['c40'],                               parent: 'volvo-c40-1'             },
    { keys: ['xc90'],                              parent: 'volvo-xc90-2'            },
    { keys: ['xc60'],                              parent: 'volvo-xc60-2'            },
    { keys: ['xc40'],                              parent: 'volvo-xc40-1'            },
    { keys: ['s60'],                               parent: 'volvo-s60-3'             },
    // GMC
    { keys: ['sierra'],                            parent: 'gmc-sierra-5'            },
    { keys: ['hummer ev'],                         parent: 'gmc-hummer-ev'           },
    { keys: ['yukon'],                             parent: 'gmc-yukon-5'             },
    { keys: ['canyon'],                            parent: 'gmc-canyon-3'            },
    // Ram
    { keys: ['ram trx', '1500 trx'],               parent: 'ram-1500-trx'            },
    { keys: ['backcountry', 'back country'],        parent: 'ram-1500-bc'             },
    { keys: ['ram 1500', '1500'],                  parent: 'ram-1500-6'              },
    // Chevrolet trucks
    { keys: ['silverado'],                         parent: 'chev-silverado-5'        },
    { keys: ['bolt ev', 'bolt euv'],               parent: 'chev-bolt-2'             },
  ]

  for (const s of SUCCESSORS) {
    if (s.keys.some(k => nameLower.includes(k))) {
      if (graphNodes.some(n => n.id === s.parent)) return { parent: s.parent, variant: !!s.variant }
    }
  }

  // Без УВЕРЕННОГО совпадения родителя НЕ создаём ребро. Раньше тут бралась
  // «самая свежая нода бренда» → мусорные evolves_into (i5→M2, цепочки концептов,
  // обратная хронология). Лучше оставить узел без родителя для ручной привязки.
  // См. CLAUDE.md → ловушка авто-родителя скрапера.
  return null
}

// ─── Проверка: это ТРИМ/эдишн той же генерации, а не новое поколение? ─────────
// Баг-триггер: запись { keys: ['aventador','revuelto'], parent: 'lamborghini-revo' }
// в SUCCESSORS без variant:true — Revuelto SV/Impavido/Miura 60 Homage (все три —
// трим и юбилейные издания ТОЙ ЖЕ генерации, реальный SV у Lamborghini НИКОГДА не
// был новым поколением: Murciélago SV, Aventador SV — всегда топ-трим текущей
// модели) уехали в граф как evolves_into, будто это следующее поколение после
// самих себя. Ручная правка одной записи чинит именно "revuelto" — но со временем
// появится ещё десяток проектов SUCCESSORS без variant:true для будущих
// трим/эдишн-неймов, которые никто заранее не впишет как ключевое слово (Impavido,
// Miura 60 Homage — одноразовые имена, их не заложить в keys заранее). Поэтому
// проверяем СТРУКТУРНО, а не по ключевым словам: если имя новинки = "<точное имя
// базовой ноды без маркеров поколения> + доп. слово(а)" — это трим, а не поколение,
// НЕЗАВИСИМО от того, что написано в SUCCESSORS.
const GEN_MARKERS_RE = /\b(gen\.?\s?\d+|mk\s?\d+|generation\s*\d*|\bii\b|\biii\b|\biv\b|\(\d{4}\)|\d{4})\b/gi
function isSameGenerationTrim(carName, parentNode) {
  if (!carName || !parentNode?.label) return false
  const brand = parentNode.brandName || parentNode.brandId || ''
  const stripBrand = (s) => brand ? s.replace(new RegExp(`^${brand}\\s+`, 'i'), '') : s
  const normalize  = (s) => stripBrand(s).toLowerCase().replace(GEN_MARKERS_RE, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  const parentCore = normalize(parentNode.label)
  const carCore     = normalize(carName)
  if (parentCore.length < 3) return false          // слишком общее имя ("S", "M") — не проверяем
  if (!carCore.startsWith(parentCore)) return false

  const extra = carCore.slice(parentCore.length).trim()
  return extra.length > 1                           // есть содержательное слово ПОСЛЕ имени базовой модели
}

// ─── Создание ноды для графа ──────────────────────────────────────────────────
function makeGraphNode(car) {
  const { hp, engineType } = inferFromDescription(car.name, car.description)
  const zone = inferZone(car.name, car.description, car.brandSlug)

  // Генерируем стабильный id: ncs-<brandslug>-<year>-<modelslug>
  // Убираем бренд из начала названия перед созданием slug (иначе audi-audi-...)
  const nameWithoutBrand = car.name
    .replace(new RegExp(`^${car.brand}\\s+`, 'i'), '')
  const modelSlug = nameWithoutBrand
    .toLowerCase()
    .replace(/^\d{4}\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const nodeId = `ncs-${car.brandSlug}-${car.year || 'x'}-${modelSlug}`.substring(0, 60)

  return {
    id:         nodeId,
    label:      car.name,
    type:       'generation',
    year:       car.year,
    brandId:    car.brandSlug,
    brandName:  car.brand,
    codeName:   String(car.year || ''),
    modelSlug:  `${car.brandSlug}-${modelSlug}`,
    bodyType:   zone.includes('suv') ? 'suv' : zone === 'electric' ? 'hatchback' : 'coupe',
    segment:    zone === 'hypercar' ? 'hypercar' : zone === 'supercar' ? 'supercar' : 'other',
    zone,
    hp:         hp || undefined,
    engineType, // undefined когда не удалось определить — см. inferFromDescription
    heroImageUrl: car.imageUrl || '',
    thumbnailUrl: car.thumbUrl || '',
    description:  car.description || '',
    sourceUrl:    car.pageUrl || '',
    isLatest:   true,   // маркер — новинка из скрапера
    scrapedAt:  car.scrapedAt,
  }
}

// ─── Синхронизация с graph.json ───────────────────────────────────────────────
async function syncToGraph(latestCars) {
  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'))
  const existingIds = new Set(graph.nodes.map(n => n.id))
  const existingEdgeIds = new Set(graph.edges.map(e => e.id))

  // Время круга (Нюрбургринг/Top Gear) для новых нод — сразу при добавлении, не
  // отдельным ручным прогоном crawl-a777.js. Каталог по бренду кэшируется здесь
  // же (a777-catalog-cache.json) — новых нод за один прогон обычно единицы, так
  // что редкий "холодный" краул нового бренда (десяток запросов) не проблема.
  let a777Catalog = {}
  if (fs.existsSync(A777_CATALOG_FILE)) { try { a777Catalog = JSON.parse(fs.readFileSync(A777_CATALOG_FILE, 'utf8')) } catch {} }
  let a777CatalogDirty = false

  // Нечёткий дедуп по (бренд+год+нормализованное имя) — ловит случай, когда
  // ncs-нода была вручную удалена/слита в другую (не-ncs) ноду при ревью, но
  // скрапер на следующем прогоне видит "этого id больше нет" и создаёт его
  // заново (id зависит только от текста заголовка, не помнит прошлых решений).
  // Пример: bugatti-destrier (ручная нода) удалили ncs-bugatti-2026-destrier —
  // через 6 часов скрапер принёс её обратно под тем же именем.
  const normLabel = (s) => (s || '').toLowerCase().replace(/^\d{4}\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const existingByBrandYear = new Map()
  for (const n of graph.nodes) {
    const key = `${n.brandId}|${n.year}`
    if (!existingByBrandYear.has(key)) existingByBrandYear.set(key, [])
    existingByBrandYear.get(key).push(normLabel(n.label))
  }

  let addedNodes = 0, addedEdges = 0, skippedFuzzy = 0

  for (const car of latestCars) {
    // Пропускаем слишком расплывчатые записи (новости, а не модели)
    if (!car.year || !car.brandSlug || car.name.length > 80) continue

    const node   = makeGraphNode(car)
    // Дедуп по РЕАЛЬНОМУ id ноды (раньше candidateId строился иначе, чем node.id,
    // и не совпадал → одни и те же модели добавлялись дублями КАЖДЫЙ прогон).
    if (existingIds.has(node.id)) continue

    // Дедуп по смыслу: та же марка+год+похожее имя УЖЕ есть под другим id —
    // значит, это либо ручная нода из прошлого ревью, либо более ранний
    // прогон скрапера уже добавил то же самое под чуть другим заголовком.
    const candLabel = normLabel(node.label)
    const bucket = existingByBrandYear.get(`${node.brandId}|${node.year}`) || []
    if (candLabel && bucket.some(l => l && (l.includes(candLabel) || candLabel.includes(l)))) {
      skippedFuzzy++
      continue
    }

    const parentResult = findParentNode(car, graph.nodes)

    // Время круга — best-effort: бренда может не быть в A777_BRAND_MAP, каталог
    // может не скраулиться (сайт лёг/бренда там нет) — тогда просто нет полей,
    // это не должно ронять синхронизацию остальных нод.
    const a777Brand = A777_BRAND_MAP[node.brandId]
    if (a777Brand) {
      try {
        if (!a777Catalog[node.brandId]) {
          const catalog = await crawlBrandCatalog(a777Brand)
          a777Catalog[node.brandId] = { catalog, crawledAt: Date.now() }
          a777CatalogDirty = true
        }
        const a777Result = await lookupA777ForNode(node, a777Catalog[node.brandId].catalog)
        if (a777Result) {
          if (a777Result.topSpeed)     node.a777TopSpeed   = a777Result.topSpeed
          if (a777Result.acceleration) node.a777Accel      = a777Result.acceleration
          if (a777Result.torque)       node.a777Torque     = a777Result.torque
          if (a777Result.weightKg)     node.a777Weight     = a777Result.weightKg
          if (a777Result.priceUsd)     node.a777Price      = a777Result.priceUsd
          if (a777Result.hpPerTon)     node.a777HpPerTon   = a777Result.hpPerTon
          if (a777Result.hpPerLiter)   node.a777HpPerLiter = a777Result.hpPerLiter
          const tt = a777Result.trackTimes ?? {}
          if (tt.nurburgring) node.a777Nurb       = tt.nurburgring
          if (tt.topgear)     node.a777TopGear    = tt.topgear
          if (tt.hockenheim)  node.a777Hockenheim = tt.hockenheim
          if (tt.tsukuba)     node.a777Tsukuba    = tt.tsukuba
        }
      } catch { /* best-effort — сеть не должна ронять синк графа */ }
    }

    graph.nodes.push(node)
    existingIds.add(node.id)
    addedNodes++

    // Добавляем ребро от родителя: variant_of для модификаций, evolves_into для новых поколений.
    // variant НЕ полагается только на явный флаг в SUCCESSORS (его легко забыть на новой
    // записи — см. isSameGenerationTrim) — структурная проверка имени подстраховывает.
    if (parentResult) {
      const { parent, variant: explicitVariant } = parentResult
      const parentNode = graph.nodes.find(n => n.id === parent)
      const variant = explicitVariant || isSameGenerationTrim(car.name, parentNode)
      const edgeType = variant ? 'variant_of' : 'evolves_into'
      const edgeId = `sync-${variant ? 'var' : 'ev'}-${parent}-${node.id}`.substring(0, 80)
      if (!existingEdgeIds.has(edgeId)) {
        graph.edges.push({ id: edgeId, source: parent, target: node.id, type: edgeType, strength: 0.9 })
        existingEdgeIds.add(edgeId)
        addedEdges++
      }
    }
  }

  if (a777CatalogDirty) fs.writeFileSync(A777_CATALOG_FILE, JSON.stringify(a777Catalog, null, 2), 'utf8')

  if (addedNodes > 0) {
    fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8')
    console.log(`[graph] +${addedNodes} узлов, +${addedEdges} рёбер${skippedFuzzy ? `, пропущено как дубль: ${skippedFuzzy}` : ''}`)
  } else {
    console.log(`[graph] нет новых узлов (${latestCars.length} проверено)${skippedFuzzy ? `, пропущено как дубль: ${skippedFuzzy}` : ''}`)
  }
  return addedNodes
}

// ─── Синхронизация с brand JSONs ─────────────────────────────────────────────
function syncToBrands(latestCars) {
  let updated = 0
  const byBrand = {}
  latestCars.forEach(c => {
    if (!c.brandSlug) return
    if (!byBrand[c.brandSlug]) byBrand[c.brandSlug] = []
    byBrand[c.brandSlug].push(c)
  })

  for (const [brandSlug, cars] of Object.entries(byBrand)) {
    // Найдём файл бренда (имя может быть brand.json или brand_name.json)
    const candidates = [
      path.join(BRANDS_DIR, `${brandSlug}.json`),
      path.join(BRANDS_DIR, `${brandSlug.replace(/-/g,'_')}.json`),
    ]
    const brandFile = candidates.find(f => fs.existsSync(f))
    if (!brandFile) continue

    const brand = JSON.parse(fs.readFileSync(brandFile, 'utf8'))
    if (!brand.latestCars) brand.latestCars = []

    let changed = false
    for (const car of cars) {
      const exists = brand.latestCars.some(lc => lc.id === car.id)
      if (!exists) {
        brand.latestCars.push({
          id: car.id, name: car.name, year: car.year,
          imageUrl: car.imageUrl, pageUrl: car.pageUrl,
          description: car.description, scrapedAt: car.scrapedAt,
        })
        changed = true
      }
    }

    if (changed) {
      // Держим только последние 20 новинок на бренд
      brand.latestCars.sort((a, b) => (b.year || 0) - (a.year || 0))
      brand.latestCars = brand.latestCars.slice(0, 20)
      fs.writeFileSync(brandFile, JSON.stringify(brand, null, 2), 'utf8')
      updated++
    }
  }

  console.log(`[brands] обновлено файлов: ${updated}`)
  return updated
}

// ─── Создание/обновление model JSONs ─────────────────────────────────────────
function syncToModels(latestCars) {
  let created = 0
  for (const car of latestCars) {
    if (!car.year || !car.brandSlug || !car.name) continue
    const { hp, engineType } = inferFromDescription(car.name, car.description)
    const modelSlug = `${car.brandSlug}-${car.name.toLowerCase().replace(/^\d{4}\s+/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}`
    const modelFile = path.join(MODELS_DIR, `${modelSlug}.json`)

    if (fs.existsSync(modelFile)) continue  // уже есть

    const model = {
      id:          `ncs-${modelSlug}`,
      slug:        modelSlug,
      name:        car.name,
      fullName:    car.fullName,
      brandId:     car.brandSlug,
      bodyType:    'other',
      segment:     'other',
      primaryMarket: 'global',
      startYear:   car.year,
      isActive:    true,
      description: car.description || '',
      generationCount: 1,
      heroImageUrl:  car.imageUrl || '',
      thumbnailUrl:  car.thumbUrl || '',
      tags:          ['new', car.year ? String(car.year) : 'upcoming'],
      aiAnalysisAvailable: false,
      sourceUrl:     car.pageUrl,
      isLatest:      true,
      scrapedAt:     car.scrapedAt,
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    }

    fs.mkdirSync(MODELS_DIR, { recursive: true })
    fs.writeFileSync(modelFile, JSON.stringify(model, null, 2), 'utf8')
    created++
  }

  console.log(`[models] создано файлов: ${created}`)
  return created
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(LATEST_FILE)) {
    console.error('latest-cars.json не найден. Сначала запустите scrape-latest.js')
    process.exit(1)
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf8'))
  const cars   = latest.cars || []
  console.log(`Синхронизация ${cars.length} новинок…\n`)

  // ── БЕЛЫЙ СПИСОК брендов: граф = 25 курируемых брендов (см. CLAUDE.md). ──────
  //  Нормализуем алиасы (mercedes-benz→mercedes) и ОТБРАСЫВАЕМ вне-брендовое,
  //  иначе скрапер тащит Ford/Cadillac/BAIC/Hyundai/… и засоряет граф.
  const BRAND_WHITELIST = new Set(['bmw','mercedes','audi','volkswagen','porsche',
    'ferrari','lamborghini','mclaren','astonmartin','bugatti','pagani','koenigsegg',
    'rimac','seat','skoda','lotus','maserati','rolls-royce','bentley',
    'gordon-murray','zenvo','de-tomaso','morgan','tvr','caterham',
    'ford','hennessey','ssc','saleen','pininfarina','hispano-suiza',
    'toyota','lexus','honda','nissan','mazda','subaru','aspark',
    'jaguar','land-rover'])
  const BRAND_ALIAS = { 'mercedes-benz':'mercedes', 'merc':'mercedes', 'vw':'volkswagen',
    'aston-martin':'astonmartin', 'aston_martin':'astonmartin',
    'rollsroyce':'rolls-royce', 'rolls_royce':'rolls-royce', 'rolls':'rolls-royce',
    'land rover':'land-rover', 'land_rover':'land-rover', 'landrover':'land-rover',
    'range rover':'land-rover', 'range-rover':'land-rover', 'rangerover':'land-rover',
    'jlr':'jaguar' }
  cars.forEach(c => { if (c.brandSlug && BRAND_ALIAS[c.brandSlug]) c.brandSlug = BRAND_ALIAS[c.brandSlug] })
  const whitelisted = cars.filter(c => c.brandSlug && BRAND_WHITELIST.has(c.brandSlug))
  const droppedN = cars.length - whitelisted.length
  if (droppedN > 0) {
    const off = [...new Set(cars.filter(c => !c.brandSlug || !BRAND_WHITELIST.has(c.brandSlug)).map(c => c.brandSlug || '?'))]
    console.log(`⛔ Отброшено вне-брендовых новинок: ${droppedN} (${off.join(', ')})`)
  }

  // Фильтруем только актуальные автомобили (не расплывчатые новости)
  // carscoops, caranddriver, motor1, roadandtrack = новостные статьи, не отдельные модели
  const NEWS_SOURCES = new Set(['carscoops', 'caranddriver', 'motor1', 'roadandtrack'])
  const validCars = whitelisted.filter(c =>
    c.year && c.year >= 2024 &&
    c.brandSlug &&
    c.name && c.name.length < 80 &&
    !NEWS_SOURCES.has(c.source)
  )
  console.log(`Валидных для синхронизации: ${validCars.length}`)

  await syncToGraph(validCars)
  syncToBrands(whitelisted)   // только бренды из белого списка
  syncToModels(validCars)

  console.log('\n✅ Синхронизация завершена')
}

main().catch(e => { console.error('[sync] ОШИБКА:', e.message); process.exit(1) })
