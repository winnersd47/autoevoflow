'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Search, Car, Zap,
  Clock, CheckCircle2, XCircle, SlidersHorizontal,
} from 'lucide-react'
import { useDemoBrand } from '@/lib/demo-data'
import { useLocale } from '@/contexts/LocaleContext'
import type { CarModel, BodyType } from '@/lib/types'

// ─── Body-type grouping ────────────────────────────────────────────────────────

type GroupKey = 'supercar' | 'coupe' | 'convertible' | 'suv' | 'sedan' | 'concept' | 'other'

const GROUP_ORDER: GroupKey[] = ['supercar', 'coupe', 'convertible', 'suv', 'sedan', 'concept', 'other']

function getGroup(model: CarModel): GroupKey {
  if (model.bodyType === 'concept') return 'concept'
  if (model.bodyType === 'suv' || model.bodyType === 'crossover') return 'suv'
  if (model.bodyType === 'sedan') return 'sedan'
  if (model.bodyType === 'convertible' || model.bodyType === 'roadster') return 'convertible'
  if (model.bodyType === 'coupe') {
    return model.segment === 'sports' ? 'supercar' : 'coupe'
  }
  return 'other'
}

const BODY_TYPE_FILTERS: (BodyType | 'all')[] = [
  'all', 'coupe', 'convertible', 'suv', 'sedan', 'concept',
]

// ─── Model card ───────────────────────────────────────────────────────────────

function ModelCard({ model, brandSlug }: { model: CarModel; brandSlug: string }) {
  const { t } = useLocale()
  const yearLabel = model.isActive
    ? t('brand.yearActive', { start: model.startYear })
    : t('brand.yearRange', { start: model.startYear, end: model.endYear ?? '?' })

  return (
    <Link href={`/model/${model.slug}`}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        whileHover={{ y: -2 }}
        className="group glass rounded-xl border border-white/8 hover:border-[#00d4ff]/30
          transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,212,255,0.08)] overflow-hidden"
      >
        {/* Thumbnail (через прокси — caricos.com/netcarshow.com требуют Referer своего домена) */}
        {(model.thumbnailUrl || model.heroImageUrl) && (
          <div className="relative h-36 overflow-hidden bg-white/3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/car-image?slug=${encodeURIComponent(model.slug)}`}
              alt={model.fullName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Active badge */}
            <div className="absolute top-2 right-2">
              {model.isActive ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                  bg-green-500/20 border border-green-500/40 text-green-400">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {t('brand.activeBadge')}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                  bg-white/8 border border-white/15 text-white/40">
                  <XCircle className="w-2.5 h-2.5" />
                  {t('brand.discontinuedBadge')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-sm text-white/90 group-hover:text-[#00d4ff] transition-colors leading-tight">
              {model.name}
            </h3>
            <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#00d4ff] flex-shrink-0 mt-0.5 transition-colors" />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/6 border border-white/10 text-white/50">
              {model.bodyType}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] text-white/35 font-mono">
              {yearLabel}
            </span>
            {model.generationCount > 1 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] text-[#00d4ff]/60 font-mono">
                {t('brand.generationsShort', { count: model.generationCount })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ─── Group section ────────────────────────────────────────────────────────────

interface GroupSectionProps {
  groupKey: GroupKey
  models: CarModel[]
  brandSlug: string
}

const GROUP_ICONS: Record<GroupKey, React.ElementType> = {
  supercar: Zap, coupe: Car, convertible: Car,
  suv: Car, sedan: Car, concept: Car, other: Car,
}

function GroupSection({ groupKey, models, brandSlug }: GroupSectionProps) {
  const { t } = useLocale()
  if (models.length === 0) return null

  const labelKey: Record<GroupKey, string> = {
    supercar: 'brand.catSupercar', coupe: 'brand.catCoupe', convertible: 'brand.catConvertible',
    suv: 'brand.catSuv', sedan: 'brand.catSedan', concept: 'brand.catConcept', other: 'brand.catOther',
  }
  const Icon = GROUP_ICONS[groupKey]

  // Sort: active first, then by year desc
  const sorted = [...models].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return b.startYear - a.startYear
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#00d4ff]" />
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-white/50">
          {t(labelKey[groupKey])}
        </h2>
        <div className="flex-1 h-px bg-white/6" />
        <span className="text-xs text-white/25 font-mono">{models.length}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map((model) => (
          <ModelCard key={model.id} model={model} brandSlug={brandSlug} />
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-12 space-y-8 animate-pulse">
      <div className="h-8 w-48 skeleton rounded" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className="h-52 skeleton rounded-xl" />)}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandModelsPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const { t } = useLocale()
  const [search, setSearch] = useState('')
  const [bodyFilter, setBodyFilter] = useState<BodyType | 'all'>('all')

  const { data, loading } = useDemoBrand(slug)
  const brand  = data?.brand
  const models = data?.models ?? []

  // Filter
  const filtered = useMemo(() => {
    let list = models
    if (bodyFilter !== 'all') list = list.filter(m => m.bodyType === bodyFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.fullName.toLowerCase().includes(q))
    }
    return list
  }, [models, bodyFilter, search])

  // Group
  const groups = useMemo(() => {
    const map = new Map<GroupKey, CarModel[]>()
    GROUP_ORDER.forEach(k => map.set(k, []))
    filtered.forEach(m => {
      const g = getGroup(m)
      map.get(g)!.push(m)
    })
    return map
  }, [filtered])

  if (loading) return <Skeleton />
  if (!brand) return null

  const activeCount = models.filter(m => m.isActive).length
  const discontinuedCount = models.length - activeCount

  return (
    <div className="min-h-screen">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/8 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/35 mb-3">
            <Link href="/brands" className="hover:text-white/60 transition-colors">Brands</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/brand/${slug}`} className="hover:text-white/60 transition-colors">
              {brand.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/60">{t('brand.allModels')}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Link
                  href={`/brand/${slug}`}
                  className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Link>
                <div>
                  <h1 className="font-display text-2xl font-black text-white">
                    {brand.name} — <span className="text-[#00d4ff]">{t('brand.allModels')}</span>
                  </h1>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-white/35">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      {activeCount} {t('brand.activeBadge').toLowerCase()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {discontinuedCount} {t('brand.discontinuedBadge').toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                type="text"
                placeholder="Search models…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10
                  text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-[#00d4ff]/40
                  focus:bg-white/8 transition-all"
              />
            </div>
          </div>

          {/* Body type filter */}
          <div className="flex gap-1.5 mt-4 flex-wrap">
            <SlidersHorizontal className="w-3.5 h-3.5 text-white/30 self-center mr-1" />
            {BODY_TYPE_FILTERS.map(bt => (
              <button
                key={bt}
                onClick={() => setBodyFilter(bt)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border
                  ${bodyFilter === bt
                    ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                    : 'border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
              >
                {bt === 'all' ? t('brand.filterAll') : bt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Model Groups ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-white/30"
            >
              <Car className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t('brand.noModels')}</p>
            </motion.div>
          ) : (
            GROUP_ORDER.map(gk => {
              const gModels = groups.get(gk) ?? []
              if (gModels.length === 0) return null
              return (
                <motion.div
                  key={gk}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <GroupSection groupKey={gk} models={gModels} brandSlug={slug} />
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
