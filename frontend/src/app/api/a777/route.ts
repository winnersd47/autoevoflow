/**
 * GET /api/a777?brandId=ferrari&year=2017&name=812+Superfast&codeName=F163
 *
 * Server-side proxy for a777aa77.ru car pages. The site blocks cross-origin
 * browser fetches, so we resolve and parse the HTML here, cache the result
 * in-process for 5 min, and return clean JSON.
 *
 * Query params:
 *   brandId  – our internal brand slug (e.g. "ferrari", "mercedes")
 *   year     – production start year
 *   name     – model name (e.g. "812 Superfast")
 *   codeName – generation code (e.g. "F163") — optional, used as fallback slug
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  A777CarData,
  A777_BRAND_MAP,
  buildCandidateUrls,
  parseA777Html,
  parseTrackTimes,
} from '@/lib/a777'

export const runtime = 'nodejs'

// ─── In-memory cache ──────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000
const PREBUILT_TTL = 24 * 60 * 60 * 1000  // pre-cached entries live 24h

interface CacheEntry {
  data: A777CarData
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

// Pre-built file cache seeded by scripts/enrich-a777.js
const preCache: Record<string, A777CarData> = {}

// Seed from public/data/a777-cache.json at module load time
;(function seedCache() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs   = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path')
    const file = path.join(process.cwd(), 'public', 'data', 'a777-cache.json')
    if (!fs.existsSync(file)) return
    const raw  = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, A777CarData>
    Object.assign(preCache, raw)
  } catch { /* ignore — file may not exist yet */ }
})()

function getCached(key: string): A777CarData | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }
  return entry.data
}

function setCached(key: string, data: A777CarData) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.5',
  'Referer': 'https://www.a777aa77.ru/',
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('html')) return null
    const buf = await res.arrayBuffer()
    return new TextDecoder('utf-8').decode(buf)
  } catch {
    return null
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p       = req.nextUrl.searchParams
  const brandId = p.get('brandId') ?? ''
  const yearStr = p.get('year') ?? ''
  const name    = p.get('name') ?? ''
  const codeName = p.get('codeName') ?? ''

  // Basic validation
  if (!brandId || !yearStr || !name) {
    return NextResponse.json({ error: 'brandId, year and name are required' }, { status: 400 })
  }
  const year = parseInt(yearStr, 10)
  if (isNaN(year) || year < 1900 || year > 2100) {
    return NextResponse.json({ error: 'invalid year' }, { status: 400 })
  }

  const a777Brand = A777_BRAND_MAP[brandId]
  if (!a777Brand) {
    return NextResponse.json<A777CarData>(
      { url: '', found: false, error: `Brand "${brandId}" not in A777 map` },
      { status: 200 },
    )
  }

  const nodeId = p.get('nodeId') ?? ''
  const cacheKey = `${a777Brand}|${year}|${name}|${codeName}`

  // 1. In-memory cache (hot)
  const cached = getCached(cacheKey)
  if (cached) return NextResponse.json(cached)

  // 2. Pre-built file cache (warm, seeded by enrich-a777.js)
  if (nodeId && preCache[nodeId]?.found) {
    setCached(cacheKey, preCache[nodeId])
    return NextResponse.json(preCache[nodeId])
  }

  // Build candidates for this year ± 1
  const candidates: string[] = []
  for (const yr of [year, year - 1, year + 1]) {
    candidates.push(...buildCandidateUrls(a777Brand, yr, name, codeName || undefined))
  }

  // Try candidates until we find valid car page HTML
  let html: string | null = null
  let foundUrl = ''
  for (const url of candidates) {
    if (url.endsWith('/')) continue // skip catalog pages
    const h = await fetchHtml(url)
    if (h && h.length > 5000) {
      html = h
      foundUrl = url
      break
    }
  }

  if (!html) {
    const result: A777CarData = { url: candidates[0] ?? '', found: false, fetchedAt: Date.now() }
    setCached(cacheKey, result)
    return NextResponse.json(result)
  }

  const specs = parseA777Html(html)
  const trackTimes = parseTrackTimes(html)

  const result: A777CarData = {
    ...specs,
    url: foundUrl,
    found: true,
    trackTimes: Object.keys(trackTimes).length > 0 ? trackTimes : undefined,
    fetchedAt: Date.now(),
  }
  setCached(cacheKey, result)
  return NextResponse.json(result)
}
