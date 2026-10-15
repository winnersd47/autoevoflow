'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import type { Generation } from '@/lib/types'

// Some scraped datasets stamp every generation's startYear/codeName with the
// scrape date instead of the real model year (seen live: all 8 BMW M5
// generations show startYear=2025, codeName="2025", collapsing the whole
// timeline to one repeated year). The press photo's caricos.com URL embeds
// the real per-generation year and stays correct even when that metadata
// isn't, so prefer it when available.
function deriveYear(gen: Generation): number {
  const url = gen.images?.[0]?.url
  const y = url?.match(/\/(\d{4})_/)?.[1]
  return y ? parseInt(y, 10) : gen.startYear
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TimelineProps {
  generations: Generation[]
  orientation?: 'horizontal' | 'vertical'
  onSelect?: (generation: Generation) => void
  selectedId?: string
  /** Модель-владелец (для прокси картинок /api/car-image — см. использование ниже). */
  modelSlug?: string
}

// ─── Year Marker ───────────────────────────────────────────────────────────────

function YearMarker({ year }: { year: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-3 bg-white/20" />
      <span className="text-[10px] font-mono text-white/30 mt-1">{year}</span>
    </div>
  )
}

// ─── Timeline Node ─────────────────────────────────────────────────────────────

interface NodeProps {
  gen: Generation
  isSelected: boolean
  index: number
  onClick: () => void
}

function TimelineNode({ gen, isSelected, index, onClick }: NodeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  const isConcept = gen.isConcept
  const isFacelift = gen.isFacelift
  const displayYear = deriveYear(gen)
  // codeName is sometimes just a copy of the (possibly wrong) startYear rather
  // than a real chassis code — showing it as a second badge would just repeat
  // the corrected year above, so only render it when it adds information.
  const hasRealCodeName = gen.codeName && gen.codeName !== String(gen.startYear)

  const nodeSize = isConcept ? 'w-6 h-6' : isFacelift ? 'w-7 h-7' : 'w-10 h-10'
  const nodeColor = isConcept
    ? 'border-[#ffd700] bg-[#ffd700]/20'
    : isFacelift
    ? 'border-[#38bdf8] bg-[#38bdf8]/15'
    : isSelected
    ? 'border-[#00d4ff] bg-[#00d4ff]/20'
    : 'border-white/20 bg-white/5'

  const nodeShape = isConcept ? 'rotate-45' : 'rounded-full'

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
    >
      {/* Node dot */}
      <div className="relative">
        <motion.div
          className={`${nodeSize} ${nodeShape} border-2 ${nodeColor}
            flex items-center justify-center transition-all duration-300`}
          whileHover={{ scale: 1.3 }}
          animate={
            isSelected
              ? { scale: [1, 1.15, 1], boxShadow: '0 0 0 4px rgba(0,212,255,0.2)' }
              : { scale: 1, boxShadow: 'none' }
          }
          transition={{ duration: 0.4 }}
        />

        {/* Selection ring */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 rounded-full border border-[#00d4ff]/50"
            style={{ margin: '-4px', borderRadius: isConcept ? '0' : '50%' }}
          />
        )}
      </div>

      {/* Year label */}
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-mono font-bold text-white/60 group-hover:text-white/90 transition-colors">
          {displayYear}
        </span>
        {/* Code name badge */}
        {hasRealCodeName && (
          <span
            className={`mt-0.5 px-1.5 py-px rounded text-[9px] font-bold font-mono transition-all duration-300
              ${isSelected
                ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40'
                : 'bg-white/5 text-white/30 border border-white/10 group-hover:text-white/60'
              }`}
          >
            {gen.codeName}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function Timeline({
  generations,
  orientation = 'horizontal',
  onSelect,
  selectedId,
  modelSlug,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })

  // Sort generations by year (derived — see deriveYear for why not startYear directly)
  const sorted = [...generations].sort((a, b) => deriveYear(a) - deriveYear(b))

  // Generate year markers between first and last year
  const firstGen = sorted[0]
  const lastGen = sorted[sorted.length - 1]
  const minYear = firstGen ? deriveYear(firstGen) : 2000
  const maxYear = lastGen ? deriveYear(lastGen) : 2024
  const yearSpan = maxYear - minYear
  const yearStep = yearSpan > 40 ? 10 : yearSpan > 20 ? 5 : 2

  const yearMarkers: number[] = []
  for (let y = Math.ceil(minYear / yearStep) * yearStep; y <= maxYear; y += yearStep) {
    yearMarkers.push(y)
  }

  // Scroll to selected
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-id="${selectedId}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedId])

  // Mouse drag to scroll
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      scrollLeft: scrollRef.current?.scrollLeft ?? 0,
    }
  }, [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollRef.current) return
      const dx = e.clientX - dragStart.current.x
      scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx
    },
    [isDragging]
  )

  const stopDrag = useCallback(() => setIsDragging(false), [])

  if (orientation === 'vertical') {
    return (
      <div className="flex gap-6 relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

        <div className="flex flex-col gap-4 w-full">
          {sorted.map((gen, i) => (
            <motion.div
              key={gen.id}
              data-id={gen.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="relative flex items-center gap-4 group cursor-pointer"
              onClick={() => onSelect?.(gen)}
            >
              {/* Dot */}
              <div
                className={`relative z-10 w-10 h-10 rounded-full border-2 flex-shrink-0 transition-all duration-300 flex items-center justify-center
                  ${selectedId === gen.id
                    ? 'border-[#00d4ff] bg-[#00d4ff]/20 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                    : gen.isConcept
                    ? 'border-[#ffd700] bg-[#ffd700]/10 rotate-45'
                    : gen.isFacelift
                    ? 'border-[#38bdf8] bg-[#38bdf8]/10'
                    : 'border-white/20 bg-white/5 group-hover:border-white/40'
                  }`}
              >
                {gen.isFacelift && !gen.isConcept && (
                  <span className="text-[8px] font-bold text-[#38bdf8]">FL</span>
                )}
              </div>

              {/* Content */}
              <div
                className={`flex-1 p-3 rounded-xl transition-all duration-300 border
                  ${selectedId === gen.id
                    ? 'bg-[#00d4ff]/8 border-[#00d4ff]/30'
                    : 'bg-white/3 border-white/8 group-hover:bg-white/5 group-hover:border-white/15'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">
                    {gen.model?.name}
                    {gen.codeName && gen.codeName !== String(gen.startYear) && (
                      <> <span className="text-[#00d4ff] font-mono text-xs">{gen.codeName}</span></>
                    )}
                  </span>
                  <span className="text-xs font-mono text-white/40">{deriveYear(gen)}</span>
                </div>
                {gen.isConcept && (
                  <span className="text-[10px] text-[#ffd700] font-semibold">Concept</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // ── Horizontal Layout ────────────────────────────────────────────────────────

  return (
    <div className="relative w-full overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      <div
        ref={scrollRef}
        className={`overflow-x-auto no-scrollbar pb-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <div className="relative inline-flex flex-col px-16 pt-4">
          {/* Track line */}
          <div className="absolute top-[2.85rem] left-0 right-0 h-px">
            {/* Animated dash */}
            <svg className="w-full h-full overflow-visible" style={{ position: 'absolute' }}>
              <motion.line
                x1="0" y1="0"
                x2="100%" y2="0"
                stroke="rgba(0,212,255,0.25)"
                strokeWidth="1"
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />
            </svg>
          </div>

          {/* Nodes */}
          <div className="flex items-center gap-6 relative z-10">
            {sorted.map((gen, i) => (
              <div key={gen.id} data-id={gen.id}>
                <TimelineNode
                  gen={gen}
                  isSelected={selectedId === gen.id}
                  index={i}
                  onClick={() => !isDragging && onSelect?.(gen)}
                />
              </div>
            ))}
          </div>

          {/* Year markers row */}
          <div className="relative flex items-start mt-2 h-8">
            {yearMarkers.map((yr) => {
              const pct = yearSpan > 0 ? ((yr - minYear) / yearSpan) * 100 : 0
              return (
                <div
                  key={yr}
                  className="absolute flex flex-col items-center"
                  style={{ left: `calc(${pct}%)` }}
                >
                  <div className="w-px h-3 bg-white/10" />
                  <span className="text-[10px] font-mono text-white/25 mt-0.5">{yr}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected info card */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 mx-4 p-3 rounded-xl bg-[#00d4ff]/8 border border-[#00d4ff]/20 flex items-start gap-3"
          >
            {(() => {
              const gen = sorted.find((g) => g.id === selectedId)
              if (!gen) return null
              // caricos.com/netcarshow.com требуют Referer своего домена — raw url виснет,
              // поэтому всегда через серверный прокси (см. /api/car-image route).
              const ownerSlug = modelSlug ?? gen.model?.slug
              const hasThumb = !!(ownerSlug && (gen.images?.[0]?.thumbnailUrl || gen.images?.[0]?.url))
              const thumb = hasThumb ? `/api/car-image?slug=${encodeURIComponent(ownerSlug!)}` : null
              return (
                <>
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={gen.images?.[0]?.altText ?? gen.model?.name ?? ''}
                      className="w-16 h-11 object-cover rounded-lg flex-shrink-0 border border-white/10"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-semibold">
                        {gen.model?.name}
                        {gen.codeName && gen.codeName !== String(gen.startYear) ? ` ${gen.codeName}` : ''}
                      </span>
                      <span className="text-xs text-white/40 font-mono">
                        {deriveYear(gen)}{gen.endYear ? `–${gen.endYear}` : '–'}
                      </span>
                      {gen.isFacelift && (
                        <span className="text-[10px] text-[#38bdf8] font-bold">FACELIFT</span>
                      )}
                      {gen.isConcept && (
                        <span className="text-[10px] text-[#ffd700] font-bold">CONCEPT</span>
                      )}
                    </div>
                    {/* Often carries distinguishing detail the year/codeName alone
                        don't — e.g. "BMW M5 UK-Version | 2012MY" vs the US import
                        sold the same nominal year, which is otherwise invisible. */}
                    {gen.description && (
                      <p className="text-xs text-white/50 mt-1 truncate">{gen.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onSelect?.(gen)}
                    className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 text-xs leading-none px-1 py-1"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Timeline
