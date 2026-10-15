'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Car, Zap, Clock, Tag, ChevronRight } from 'lucide-react'
import type { Generation, BodyType } from '@/lib/types'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface GenerationCardProps {
  generation: Generation
  similarityScore?: number
  showEvolutionBadge?: boolean
  onClick?: () => void
  variant?: 'default' | 'compact' | 'featured'
  /** Модель-владелец, если известна вызывающей стороне (иначе берётся generation.model?.slug). */
  modelSlug?: string
}

// ─── Body Type Icon ────────────────────────────────────────────────────────────

function BodyTypeIcon({ type }: { type: BodyType }) {
  const icons: Record<BodyType, string> = {
    sedan: '🚗',
    coupe: '🏎',
    suv: '🚙',
    crossover: '🚙',
    wagon: '🚗',
    hatchback: '🚗',
    convertible: '🏎',
    pickup: '🛻',
    van: '🚐',
    minivan: '🚐',
    roadster: '🏎',
    concept: '✨',
  }
  return <span className="text-base">{icons[type] ?? '🚗'}</span>
}

// ─── Circular Score ────────────────────────────────────────────────────────────

function CircularScore({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#00d4ff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.6))' }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-primary font-mono">{pct}%</span>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

export function GenerationCardSkeleton({ variant = 'default' }: { variant?: GenerationCardProps['variant'] }) {
  if (variant === 'compact') {
    return (
      <div className="glass rounded-xl p-3 border border-white/10 flex items-center gap-3 animate-pulse">
        <div className="w-16 h-12 rounded-lg skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 skeleton rounded w-3/4" />
          <div className="h-2 skeleton rounded w-1/2" />
        </div>
      </div>
    )
  }
  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden animate-pulse">
      <div className="aspect-[16/9] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 w-16 skeleton rounded-full" />
          <div className="h-6 w-16 skeleton rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function GenerationCard({
  generation,
  similarityScore,
  showEvolutionBadge = true,
  onClick,
  variant = 'default',
  modelSlug,
}: GenerationCardProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  // caricos.com/netcarshow.com отдают картинку только с правильным Referer —
  // прямой src с нашего домена виснет/не грузится (см. /api/car-image route).
  // Поэтому всегда идём через серверный прокси, а не raw thumbnailUrl/heroImageUrl.
  const resolvedModelSlug = modelSlug ?? generation.model?.slug
  const hasImage = !!(resolvedModelSlug && (generation.thumbnailUrl ?? generation.heroImageUrl))
  const imageUrl = hasImage ? `/api/car-image?slug=${encodeURIComponent(resolvedModelSlug!)}` : null
  const yearLabel =
    generation.endYear
      ? `${generation.startYear}–${generation.endYear}`
      : `${generation.startYear}–`

  const primaryBodyType = generation.bodyTypes[0] ?? 'sedan'

  // ── Compact Variant ────────────────────────────────────────────────────────

  if (variant === 'compact') {
    return (
      <motion.div
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.97 }}
        className="group relative glass rounded-xl p-3 border border-white/10 flex items-center gap-3
          cursor-pointer transition-all duration-300 hover:border-[#00d4ff]/30 hover:bg-white/5"
      >
        {/* Thumbnail */}
        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={generation.codeName}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-5 h-5 text-white/20" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white truncate">
            {generation.model?.name ?? 'Unknown'}{' '}
            <span className="text-[#00d4ff]">{generation.codeName}</span>
          </div>
          <div className="text-xs text-white/40 mt-0.5">{yearLabel}</div>
        </div>

        {similarityScore !== undefined && (
          <div className="text-xs font-bold text-[#00d4ff] font-mono">
            {Math.round(similarityScore * 100)}%
          </div>
        )}
        <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-[#00d4ff] transition-colors flex-shrink-0" />
      </motion.div>
    )
  }

  // ── Featured Variant ───────────────────────────────────────────────────────

  if (variant === 'featured') {
    return (
      <motion.div
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ y: -6, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10
          hover:border-[#00d4ff]/40 transition-all duration-500"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          boxShadow: hovered
            ? '0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.15)'
            : '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Image */}
        <div className="relative aspect-[16/7] overflow-hidden">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={`${generation.model?.name} ${generation.codeName}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-white/3 flex items-center justify-center">
              <Car className="w-16 h-16 text-white/10" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Concept badge */}
          {generation.isConcept && (
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold
              bg-[#ffd700]/20 border border-[#ffd700]/50 text-[#ffd700] backdrop-blur-sm">
              CONCEPT
            </div>
          )}

          {/* Facelift badge */}
          {generation.isFacelift && showEvolutionBadge && (
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold
              bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff] backdrop-blur-sm">
              FACELIFT
            </div>
          )}

          {/* Score overlay */}
          {similarityScore !== undefined && (
            <div className="absolute top-3 right-3">
              <CircularScore score={similarityScore} />
            </div>
          )}

          {/* Code name large */}
          <div className="absolute bottom-3 left-4">
            <div className="font-display text-3xl font-black text-white/20 select-none">
              {generation.codeName}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-lg text-white leading-tight">
                {generation.model?.name ?? 'Unknown Model'}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-white/40" />
                <span className="text-xs text-white/50 font-mono">{yearLabel}</span>
                <BodyTypeIcon type={primaryBodyType} />
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/25 text-[#00d4ff] text-xs font-mono font-bold">
              {generation.codeName}
            </div>
          </div>

          {/* Hover: specs teaser */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={hovered ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/10 grid grid-cols-2 gap-3">
              {generation.specs?.horsepower && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#00d4ff]" />
                  <span className="text-xs text-white/70">
                    {generation.specs.horsepower} hp
                  </span>
                </div>
              )}
              {generation.specs?.acceleration0to100 && (
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#ffd700]" />
                  <span className="text-xs text-white/70">
                    0–100: {generation.specs.acceleration0to100}s
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Electric glow on hover */}
        <motion.div
          animate={hovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(0,212,255,0.3), 0 0 30px rgba(0,212,255,0.1)',
          }}
        />
      </motion.div>
    )
  }

  // ── Default Variant ────────────────────────────────────────────────────────

  return (
    <motion.div
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10
        hover:border-[#00d4ff]/30 transition-all duration-400"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        boxShadow: hovered
          ? '0 16px 48px rgba(0,0,0,0.7), 0 0 24px rgba(0,212,255,0.12)'
          : '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={`${generation.model?.name} ${generation.codeName}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-white/3 flex items-center justify-center">
            <Car className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {generation.isConcept && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold
            bg-[#ffd700]/20 border border-[#ffd700]/40 text-[#ffd700]">
            CONCEPT
          </div>
        )}
        {generation.isFacelift && !generation.isConcept && showEvolutionBadge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold
            bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8]">
            FACELIFT
          </div>
        )}
        {similarityScore !== undefined && (
          <div className="absolute top-2 right-2">
            <CircularScore score={similarityScore} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-white leading-tight truncate">
              {generation.model?.name ?? 'Unknown'}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-white/40 font-mono">{yearLabel}</span>
              <span className="text-white/20">·</span>
              <BodyTypeIcon type={primaryBodyType} />
            </div>
          </div>
          <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-[#00d4ff]/10 border border-[#00d4ff]/20
            text-[#00d4ff] text-[10px] font-mono font-bold">
            {generation.codeName}
          </span>
        </div>

        {/* Hover specs teaser */}
        <motion.div
          initial={false}
          animate={hovered ? { opacity: 1, height: 'auto', marginTop: 8 } : { opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/8">
            {generation.specs?.horsepower && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#00d4ff]" />
                <span className="text-[11px] text-white/60">{generation.specs.horsepower}hp</span>
              </div>
            )}
            {generation.specs?.acceleration0to100 && (
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#ffd700]" />
                <span className="text-[11px] text-white/60">{generation.specs.acceleration0to100}s</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Glow ring */}
      <motion.div
        animate={hovered ? { opacity: 1 } : { opacity: 0 }}
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(0,212,255,0.2)' }}
      />
    </motion.div>
  )
}

export default GenerationCard
