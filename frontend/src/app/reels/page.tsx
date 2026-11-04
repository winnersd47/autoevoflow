'use client'

/**
 * /reels — вертикальная лента поколений машин в стиле TikTok/Reels.
 *
 * Данные читаются полностью на клиенте из статического JSON — так же, как
 * это уже делает src/components/graph/EvolutionGraph.tsx (fetch основного
 * графа + fetch /data/models/<slug>.json на узел): отдельный API-роут тут
 * не нужен, public/data/evolution/graph.json и так отдаётся как обычный
 * статический файл.
 *
 * Группировка узлов графа в "линейки" моделей — (modelSlug || id) — та же
 * логика, что уже использует src/app/api/models/[id]/route.ts; из каждой
 * группы берём узел с максимальным годом как представителя линейки.
 *
 * Фото — только через существующий прокси /api/car-image?slug=<slug> (см.
 * src/app/api/car-image/route.ts): он сам читает heroImageUrl/thumbnailUrl
 * из public/data/models/<slug>.json и обходит хотлинк-защиту caricos/
 * netcarshow. Прямые внешние URL принципиально не используем.
 *
 * Кандидатов-групп в графе ~2377 — проверять картинку у всех сразу значило
 * бы ~2377 мелких fetch ещё до первого рендера. Вместо этого подгружаем
 * пачками (resolveCard проверяет /data/models/<slug>.json на наличие фото —
 * та же проверка, что делает сам /api/car-image), сразу показываем первые
 * же валидные карточки и доливаем остальные по мере приближения к концу
 * списка (IntersectionObserver на сентинеле внизу) — бесконечная лента, а
 * не блокирующая загрузка всего каталога.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, Gauge, ArrowRight, Car } from 'lucide-react'

// ─── Исходный узел графа (нужное нам подмножество) ────────────────────────────
// @/lib/types' GraphNode не несёт hp/engineType — как и сам
// /api/models/[id]/route.ts, объявляем свой локальный тип под наши нужды
// вместо того, чтобы тянуть это в общий тип ради одной страницы.
interface RawNode {
  id: string
  label: string
  fullName?: string
  year?: number
  brandName?: string
  modelSlug?: string
  codeName?: string
  hp?: number
  engineType?: string
}

interface ReelCard {
  /** modelSlug || id группы — ключ для /api/car-image, /data/models/<slug>.json и /model/<slug> */
  slug: string
  title: string
  brandName: string
  year?: number
  codeName?: string
  hp?: number
  engineType?: string
}

// ─── Русские подписи типов двигателя (те же коды, что в EvolutionGraph.tsx) ───
const ENGINE_LABEL_RU: Record<string, string> = {
  ev: 'Электро', hybrid: 'Гибрид',
  w16: 'W16 Quad-Turbo', v16: 'V16', v16h: 'V16 Гибрид',
  v12: 'V12', v12t: 'V12 Turbo', flat12: 'Flat-12',
  v10: 'V10',
  v8t: 'V8 Turbo', v8h: 'V8 Гибрид', v8: 'V8',
  flat6t: 'Flat-6 Turbo', flat6: 'Flat-6',
  i6t: 'I6 Turbo', i6h: 'I6 Гибрид', i6: 'I6',
  i5t: 'I5 Turbo',
  v6t: 'V6 Turbo', v6h: 'V6 Гибрид', v6: 'V6',
  i4t: 'I4 Turbo', i4h: 'I4 Гибрид', i4: 'I4',
  flat4t: 'Flat-4 Turbo', flat4: 'Flat-4',
}
function engineLabel(code?: string): string | null {
  if (!code) return null
  return ENGINE_LABEL_RU[code] ?? code.toUpperCase()
}

const BATCH_SIZE = 10       // кандидатов проверяем за один проход подгрузки
const MIN_FIRST_PAINT = 6   // сколько карточек хотим иметь готовыми перед первым показом ленты
// Высота под один экран: 100dvh за вычетом фиксированной шапки сайта (h-16 /
// "64px" в Navigation.tsx + main). Без вычета верх каждой карточки прятался
// бы под шапкой, а скролл "страницы" и скролл ленты спорили бы друг с другом.
const CARD_HEIGHT = 'calc(100dvh - 4rem)'

// ─── Проверка одного кандидата: тянем его model-JSON и смотрим на фото ────────
// Та же проверка (heroImageUrl || thumbnailUrl), что уже делают /api/car-image
// route.ts и hover-превью в EvolutionGraph.tsx — источник истины один файл.
async function resolveCard(node: RawNode): Promise<ReelCard | null> {
  const slug = node.modelSlug || node.id
  try {
    const res = await fetch(`/data/models/${encodeURIComponent(slug)}.json`)
    if (!res.ok) return null
    const data = await res.json()
    const hasImage = !!(data?.heroImageUrl || data?.thumbnailUrl)
    if (!hasImage) return null

    // Некоторые узлы (особенно NCS-скрейп) уже пишут бренд прямо в label/fullName
    // ("Hennessey Blackbird"), другие — нет ("3 Series E21" без "BMW"). Если
    // бренд уже есть в начале строки — не дублируем его ещё раз спереди.
    const brand = (node.brandName ?? '').trim()
    const rawTitle = (node.fullName || node.label || '').trim()
    const title = brand && !rawTitle.toLowerCase().startsWith(brand.toLowerCase())
      ? `${brand} ${rawTitle}`.trim()
      : rawTitle
    return {
      slug,
      title,
      brandName: node.brandName ?? '',
      year: node.year,
      codeName: node.codeName && node.codeName !== String(node.year ?? '') ? node.codeName : undefined,
      hp: node.hp,
      engineType: node.engineType,
    }
  } catch {
    return null
  }
}

// ─── Одна карточка ленты ───────────────────────────────────────────────────────
function ReelCardView({ card, priority, onBroken }: { card: ReelCard; priority: boolean; onBroken: () => void }) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = `/api/car-image?slug=${encodeURIComponent(card.slug)}`
  const engLabel = engineLabel(card.engineType)

  return (
    <section
      className="relative w-full overflow-hidden bg-surface flex flex-col justify-end snap-start"
      style={{ height: CARD_HEIGHT }}
    >
      {/* Фото — через внутренний прокси, никогда напрямую на caricos/netcarshow.
          heroImageUrl/thumbnailUrl в model-JSON гарантирует только то, что ссылка
          ЕСТЬ, а не что она ещё жива (сайты-источники переезжают/404-ят) — при
          реальной ошибке загрузки карточку удаляем из ленты (onBroken), а не
          показываем сломанное превью. */}
      {!imgError ? (
        <>
          <Image
            src={imageUrl}
            alt={card.title}
            fill
            priority={priority}
            sizes="100vw"
            className="object-cover"
            onError={() => { setImgError(true); onBroken() }}
          />
          {/* Тёмный скрим снизу — для читаемости текста поверх фото */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/5 pointer-events-none" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-elevated to-surface">
          <Car className="w-16 h-16 text-primary/20" />
        </div>
      )}

      {/* Контент — брендирование, название, год, спеки, переход на карточку модели */}
      <div className="relative z-10 w-full px-5 pb-12 sm:px-10 sm:pb-16 flex flex-col gap-3">
        {card.brandName && <span className="section-label w-fit">{card.brandName}</span>}

        <h2 className="font-display text-3xl sm:text-5xl font-black text-text-primary leading-[1.08] max-w-[95%]">
          {card.title}
        </h2>

        <div className="flex items-center gap-2 text-sm sm:text-base text-text-secondary font-mono">
          {card.codeName && <span className="text-primary font-semibold">{card.codeName}</span>}
          {card.codeName && card.year && <span className="text-white/20">·</span>}
          {card.year && <span>{card.year}</span>}
        </div>

        {(card.hp || engLabel) && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {card.hp && (
              <span className="badge-primary text-xs px-2.5 py-1">
                <Zap className="w-3.5 h-3.5" />
                {card.hp} л.с.
              </span>
            )}
            {engLabel && (
              <span className="badge-surface text-xs px-2.5 py-1">
                <Gauge className="w-3.5 h-3.5" />
                {engLabel}
              </span>
            )}
          </div>
        )}

        <Link href={`/model/${encodeURIComponent(card.slug)}`} className="btn-primary w-fit mt-3">
          Подробнее
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}

// ─── Страница ──────────────────────────────────────────────────────────────────
export default function ReelsPage() {
  const [cards, setCards] = useState<ReelCard[]>([])
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)

  // Рабочая очередь кандидатов. null, пока граф не загружен — отличаем от
  // "очередь пуста", чтобы сентинел-наблюдатель (который может сработать до
  // того, как граф вообще пришёл) не помечал ленту исчерпанной преждевременно.
  const queueRef = useRef<RawNode[] | null>(null)
  const cursorRef = useRef(0)
  const fetchingRef = useRef(false)
  const firstLoadRef = useRef(true)

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || exhausted) return
    const queue = queueRef.current
    if (!queue) return
    fetchingRef.current = true
    try {
      const minNew = firstLoadRef.current ? MIN_FIRST_PAINT : 1
      let added = 0
      while (added < minNew && cursorRef.current < queue.length) {
        const batch = queue.slice(cursorRef.current, cursorRef.current + BATCH_SIZE)
        cursorRef.current += batch.length
        const results = await Promise.all(batch.map(resolveCard))
        const valid = results.filter((c): c is ReelCard => c !== null)
        if (valid.length > 0) {
          setCards((prev) => [...prev, ...valid])
          added += valid.length
        }
      }
      if (cursorRef.current >= queue.length) setExhausted(true)
    } finally {
      fetchingRef.current = false
      firstLoadRef.current = false
      setLoading(false)
    }
  }, [exhausted])

  // Модель-JSON может указывать картинку, ссылка на которую на деле мертва
  // (источник переехал/404) — <img> узнаёт об этом только в момент реальной
  // загрузки. Такую карточку убираем из ленты вместо показа брака и тут же
  // добираем следующую — живёт тот же принцип "без фото не показываем".
  const handleBroken = useCallback((slug: string) => {
    setCards((prev) => prev.filter((c) => c.slug !== slug))
    loadMore()
  }, [loadMore])

  // ── Загрузка графа + группировка в линейки моделей ─────────────────────────
  useEffect(() => {
    fetch('/data/evolution/graph.json')
      .then((r) => r.json())
      .then((data: { nodes: RawNode[] }) => {
        const groups = new Map<string, RawNode>()
        for (const n of data.nodes ?? []) {
          const key = n.modelSlug || n.id
          const prev = groups.get(key)
          if (!prev || (n.year ?? 0) > (prev.year ?? 0)) groups.set(key, n)
        }
        // Новые — вперёд: простой и предсказуемый порядок для ленты открытий.
        queueRef.current = Array.from(groups.values()).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
        loadMore()
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Сентинел внизу ленты — доливает карточки при приближении к концу ───────
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = containerRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore() },
      { root, rootMargin: '0px 0px 250% 0px' }
    )
    io.observe(target)
    return () => io.disconnect()
  }, [loadMore])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain no-scrollbar"
      style={{ height: CARD_HEIGHT }}
    >
      {cards.map((card, i) => (
        <ReelCardView
          key={card.slug}
          card={card}
          priority={i === 0}
          onBroken={() => handleBroken(card.slug)}
        />
      ))}

      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {loading && cards.length === 0 && (
        <div className="w-full flex flex-col items-center justify-center gap-4 snap-start" style={{ height: CARD_HEIGHT }}>
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-text-muted">Загрузка ленты…</p>
        </div>
      )}

      {!loading && exhausted && cards.length === 0 && (
        <div className="w-full flex flex-col items-center justify-center gap-3 text-center px-8 snap-start" style={{ height: CARD_HEIGHT }}>
          <Car className="w-12 h-12 text-white/10" />
          <p className="text-text-muted text-sm">Не нашлось ни одной модели с фото.</p>
        </div>
      )}

      {exhausted && cards.length > 0 && (
        <div className="w-full flex flex-col items-center justify-center gap-3 text-center px-8 snap-start bg-background" style={{ height: CARD_HEIGHT }}>
          <Car className="w-12 h-12 text-primary/30" />
          <p className="font-display text-lg font-bold text-text-primary">Это все поколения</p>
          <p className="text-sm text-text-muted max-w-xs">
            Вы пролистали всю ленту — {cards.length} моделей. Загляните в «Эволюцию», чтобы увидеть полный граф.
          </p>
          <Link href="/evolution" className="btn-secondary mt-2">
            К графу эволюции
          </Link>
        </div>
      )}
    </div>
  )
}
