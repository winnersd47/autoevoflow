/**
 * scrape-latest.js — парсит новинки авто с нескольких источников
 *
 * Источники:
 *   1. netcarshow.com/latest-cars.html  — официальные новинки (HTML)
 *   2. netcarshow.com/explore/concept/  — концепт-кары (HTML)
 *   3. carscoops.com/feed/              — новости авто (RSS/XML)
 *
 * Запуск: node scripts/scrape-latest.js
 * Планировщик: node scripts/scheduler.js (встроенный node-cron)
 *              или Windows Task Scheduler (см. scripts/setup-scheduler.bat)
 * Результат: public/data/latest-cars.json
 */
const fs    = require('fs')
const path  = require('path')
const https = require('https')
const http  = require('http')

const OUT = path.join(__dirname, '../public/data/latest-cars.json')

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function fetchUrl(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'))
  const lib = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xml,application/rss+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Referer': 'https://www.netcarshow.com/',
      },
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href
        return fetchUrl(loc, redirectCount + 1).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} ${url}`))
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => { data += c })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('timeout: ' + url)) })
  })
}

// ─── Source 1: netcarshow.com — HTML с классом swSBE ─────────────────────────
async function scrapeNetCarShowPage(url, sourceTag) {
  const html = await fetchUrl(url)
  const cars = []
  const blockRe = /<li\s+class="swSBE">([\s\S]*?)<\/li>/gi
  let m
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1]
    const imgM  = block.match(/src="(\/R\/[^"]+thb\.jpg)"/)
    const yearM = block.match(/class="swTL">\s*(20\d{2}|19\d{2})\s*<\/div>/)
    const descM = block.match(/<p>([\s\S]*?)<\/p>/)
    const nameM = block.match(/class="swLB"><a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!imgM || !nameM) continue

    const thumbRelPath = imgM[1]
    const pageRelPath  = nameM[1]
    const fullLinkText = nameM[2].trim()
    const year         = yearM ? parseInt(yearM[1]) : null
    const description  = descM ? descM[1].replace(/<[^>]+>/g,'').trim() : ''

    const hrefParts = pageRelPath.replace(/^\/|\/$/g,'').split('/')
    const brandSlug = hrefParts[0] || ''
    const modelSlug = hrefParts[1] || ''
    if (!brandSlug || !modelSlug) continue

    const thumbUrl = 'https://www.netcarshow.com' + thumbRelPath
    const baseKey  = thumbRelPath.replace('/R/','').replace(/-thb\.jpg$/,'')
    const imageUrl = `https://www.netcarshow.com/${baseKey}-wallpaper.jpg`

    cars.push({
      id:          `ncs-${brandSlug}-${modelSlug}`,
      source:      sourceTag,
      sourceLabel: 'NetCarShow',
      brand:       fullLinkText.split(' ')[0],
      brandSlug,
      name:        fullLinkText,
      fullName:    year ? `${year} ${fullLinkText}` : fullLinkText,
      year,
      description,
      pageUrl:     'https://www.netcarshow.com' + pageRelPath,
      thumbUrl,
      imageUrl,
      scrapedAt:   new Date().toISOString(),
    })
  }
  return cars
}

async function scrapeNetCarShowLatest() {
  console.log('[netcarshow/latest] Fetching…')
  const cars = await scrapeNetCarShowPage('https://www.netcarshow.com/latest-cars.html', 'netcarshow')
  console.log(`[netcarshow/latest] ${cars.length} cars`)
  return cars
}

// ─── Source 2: netcarshow.com/explore/concept/ — концепт-кары ────────────────
// Структура этой страницы немного другая: <li> без CSS-класса, <span> вместо <div>
async function scrapeNetCarShowConcepts() {
  console.log('[netcarshow/concepts] Fetching…')
  const html = await fetchUrl('https://www.netcarshow.com/explore/concept/')
  const cars = []

  // Два паттерна: swSBE (если используется та же разметка) и plain <li>
  // Пробуем swSBE сначала
  const swSBE = await scrapeNetCarShowPage('https://www.netcarshow.com/explore/concept/', 'netcarshow-concept')
  if (swSBE.length > 0) {
    console.log(`[netcarshow/concepts] ${swSBE.length} concepts (swSBE)`)
    return swSBE
  }

  // Fallback: plain <li> с <a href> + <img src>
  const liRe = /<li>([\s\S]*?)<\/li>/gi
  let m
  while ((m = liRe.exec(html)) !== null) {
    const block = m[1]
    const imgM  = block.match(/src="(\/R\/[^"]+thb\.jpg)"/)
    const aM    = block.match(/<a\s+href="(\/[^"]+\/)"[^>]*>([^<]+)<\/a>/)
    const yearM = block.match(/\b(20\d{2}|19\d{2})\b/)
    const descM = block.match(/<p>([^<]+)<\/p>/)
    if (!imgM || !aM) continue

    const hrefParts = aM[1].replace(/^\/|\/$/g,'').split('/')
    const brandSlug = hrefParts[0]
    const modelSlug = hrefParts[1]
    if (!brandSlug || !modelSlug) continue

    const baseKey  = imgM[1].replace('/R/','').replace(/-thb\.jpg$/,'')
    const imageUrl = `https://www.netcarshow.com/${baseKey}-1280.jpg`

    cars.push({
      id:          `ncs-concept-${brandSlug}-${modelSlug}`,
      source:      'netcarshow-concept',
      sourceLabel: 'NetCarShow Concepts',
      brand:       aM[2].split(' ')[0],
      brandSlug,
      name:        aM[2].trim(),
      fullName:    yearM ? `${yearM[1]} ${aM[2].trim()}` : aM[2].trim(),
      year:        yearM ? parseInt(yearM[1]) : null,
      description: descM ? descM[1].trim() : '',
      pageUrl:     'https://www.netcarshow.com' + aM[1],
      thumbUrl:    'https://www.netcarshow.com' + imgM[1],
      imageUrl,
      scrapedAt:   new Date().toISOString(),
    })
  }
  console.log(`[netcarshow/concepts] ${cars.length} concepts`)
  return cars
}

// ─── Source 3: carscoops.com RSS — автомобильные новости ─────────────────────
async function scrapeCarscoopsRSS() {
  console.log('[carscoops/rss] Fetching feed…')
  const xml = await fetchUrl('https://www.carscoops.com/feed/')

  const cars  = []
  // Parse <item> blocks
  const itemRe = /<item>([\s\S]*?)<\/item>/gi
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]

    // Title
    const titleM = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                   block.match(/<title>([^<]+)<\/title>/)
    // Link
    const linkM  = block.match(/<link>([^<]+)<\/link>/)
    // PubDate
    const dateM  = block.match(/<pubDate>([^<]+)<\/pubDate>/)
    // Image: look for wp-content/uploads image in content:encoded
    const imgM   = block.match(/https:\/\/www\.carscoops\.com\/wp-content\/uploads\/[^\s"']+?-\d+x\d+\.(?:jpg|webp|png)/)
    // Extract year from title or pubDate
    const yearM  = (titleM?.[1] || '').match(/\b(20\d{2})\b/) ||
                   (dateM?.[1] || '').match(/\b(20\d{2})\b/)
    // Description
    const descM  = block.match(/<description><!\[CDATA\[([^\]]{10,300})/)

    if (!titleM || !linkM) continue

    const title = titleM[1].trim()
    const link  = linkM[1].trim()
    const year  = yearM ? parseInt(yearM[1]) : new Date().getFullYear()

    // Extract brand name heuristically from title (first capitalised word that's a car brand)
    const CAR_BRANDS = /\b(BMW|Mercedes|Audi|Porsche|Ferrari|Lamborghini|Toyota|Honda|Ford|Chevrolet|Dodge|Jeep|Cadillac|Tesla|Rivian|Lucid|Volkswagen|Volvo|Jaguar|Range Rover|Land Rover|Bentley|Rolls-Royce|Bugatti|McLaren|Aston Martin|Koenigsegg|Pagani|Lamborghini|Nissan|Mazda|Subaru|Hyundai|Kia|Genesis|Lexus|Infiniti|Acura|Alfa Romeo|Maserati|Fiat|Lotus|Mini|Peugeot|Renault|Citroën|Skoda|Seat|Opel|Vauxhall|GMC|Ram|Lincoln|Cadillac|Buick)\b/i
    const brandM = title.match(CAR_BRANDS)
    const brand  = brandM ? brandM[1] : 'Other'

    // Use 1024x576 image for good quality preview
    let imageUrl = ''
    if (imgM) {
      imageUrl = imgM[0].replace(/-\d+x\d+\.(jpg|webp|png)$/, '-1024x576.$1')
    }

    const description = descM
      ? descM[1].replace(/<[^>]+>/g,'').replace(/\n+/g,' ').trim().substring(0, 200)
      : ''

    // ── Фильтр: только статьи о конкретных новых/обновлённых моделях авто ──────
    // Пропускаем: продажи, скандалы, законы, гаджеты, ДТП, отзывы (recalls)
    const SKIP_PATTERNS = [
      /\bsales\b/i, /\brecall\b/i, /\bcrash\b/i, /\baccident\b/i,
      /\blawsuit\b/i, /\bfine\b/i, /\btax\b/i, /\bprice.*drop\b/i,
      /\bGPS\b/i, /\btrain\b/i, /\bdriver.*exam\b/i, /\bCDL\b/i,
      /\blaptop\b/i, /\bphone\b/i, /\bgadget\b/i, /\btiktok\b/i,
      /\bsunroof.*fly\b/i, /\bshut.*line\b/i, /\bfollowed.*GPS\b/i,
      /\bWarns.*Owner\b/i, /\bFTC\b/i, /\bdealer.*pric\b/i,
      /\bbatch.*produc\b/i, /\bsales.*target\b/i,
    ]
    const REQUIRE_CAR_WORDS = [
      /\b(reveal|debut|launch|introduce|unveil|new|first look|spy shot|concept|production|update|refresh|facelift|successor|replacement|return|next.gen)\b/i,
      // Или конкретная модель с годом в названии
      /\b20\d{2}\s+\w/,
    ]

    const isRelevant = !SKIP_PATTERNS.some(p => p.test(title)) &&
                       REQUIRE_CAR_WORDS.some(p => p.test(title))
    if (!isRelevant) continue

    // Slug from URL
    const urlSlug = link.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '').replace(/\//g,'-')

    cars.push({
      id:          `carscoops-${urlSlug.substring(0,60)}`,
      source:      'carscoops',
      sourceLabel: 'Carscoops',
      brand,
      brandSlug:   brand.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''),
      name:        title,
      fullName:    title,
      year,
      description,
      pageUrl:     link,
      thumbUrl:    imageUrl,
      imageUrl,
      scrapedAt:   new Date().toISOString(),
    })
  }
  console.log(`[carscoops/rss] ${cars.length} relevant car articles`)
  return cars
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const SOURCES = [
    { id: 'netcarshow',         name: 'NetCarShow Latest',   fn: scrapeNetCarShowLatest  },
    { id: 'netcarshow-concept', name: 'NetCarShow Concepts', fn: scrapeNetCarShowConcepts },
    { id: 'carscoops',          name: 'Carscoops RSS',       fn: scrapeCarscoopsRSS      },
  ]

  const run     = { sources: [], cars: [], updatedAt: new Date().toISOString() }
  const results = await Promise.allSettled(SOURCES.map(s => s.fn()))

  results.forEach((r, i) => {
    const s = SOURCES[i]
    if (r.status === 'fulfilled') {
      run.cars.push(...r.value)
      run.sources.push({ id: s.id, name: s.name, count: r.value.length, ok: true, checkedAt: new Date().toISOString() })
    } else {
      console.error(`[${s.id}] ❌ ${r.reason?.message || r.reason}`)
      run.sources.push({ id: s.id, name: s.name, count: 0, ok: false, error: String(r.reason?.message || r.reason), checkedAt: new Date().toISOString() })
    }
  })

  // Дедупликация по id
  const seen = new Set()
  run.cars = run.cars.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })

  // Сортировка: новейший год, потом дата скрапинга
  run.cars.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.scrapedAt.localeCompare(a.scrapedAt))

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(run, null, 2), 'utf8')

  const ok  = run.sources.filter(s => s.ok)
  const err = run.sources.filter(s => !s.ok)
  console.log(`\n✅ ${run.cars.length} новинок → public/data/latest-cars.json`)
  console.log(`   Источники: ${ok.map(s=>s.name+' ('+s.count+')').join(', ')}${err.length ? ' | ❌ '+err.map(s=>s.name).join(', ') : ''}`)
}

main()
  .then(() => {
    // Автоматически синхронизировать во все части проекта
    console.log('\n🔄 Запуск синхронизации…')
    require('./sync-latest-to-project.js')
  })
  .catch(e => { console.error(e); process.exit(1) })
