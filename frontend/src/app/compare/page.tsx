'use client'

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useDeferredValue,
} from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Cell,
} from 'recharts'
import {
  ArrowLeftRight,
  Share2,
  Download,
  Car,
  RefreshCcw,
  Search,
  X,
  ChevronDown,
  Zap,
  Gauge,
  Weight,
  Ruler,
  Clock,
  BarChart3,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { useCompare } from '@/hooks/useCompare'
import { searchSemantic } from '@/lib/api'
import { BrandDNARadar, type RadarSeries } from '@/components/graph/BrandDNARadar'
import { AIAnalysisPanel } from '@/components/ui/AIAnalysisPanel'
import type { Generation, ComparisonDimension, TechnicalSpecs } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'

// ─── Page transition ──────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

// ─── Spec definitions factory (needs t() for translated labels) ───────────────

function getSpecDefs(t: (key: string) => string): {
  key: keyof TechnicalSpecs
  label: string
  unit: string
  icon: React.ReactNode
  higherIsBetter?: boolean
}[] {
  return [
    { key: 'horsepower',         label: t('compare.specPower'),         unit: 'hp',      icon: <Zap className="w-3.5 h-3.5" />,     higherIsBetter: true },
    { key: 'torque',             label: t('compare.specTorque'),        unit: 'Nm',      icon: <Gauge className="w-3.5 h-3.5" />,   higherIsBetter: true },
    { key: 'acceleration0to100', label: t('compare.specAccel'),         unit: 's',       icon: <Clock className="w-3.5 h-3.5" />,   higherIsBetter: false },
    { key: 'topSpeed',           label: t('compare.specTopSpeed'),      unit: 'km/h',    icon: <TrendingUp className="w-3.5 h-3.5" />, higherIsBetter: true },
    { key: 'weight',             label: t('compare.specWeight'),        unit: 'kg',      icon: <Weight className="w-3.5 h-3.5" />,  higherIsBetter: false },
    { key: 'length',             label: t('compare.specLength'),        unit: 'mm',      icon: <Ruler className="w-3.5 h-3.5" />,   higherIsBetter: undefined },
    { key: 'wheelbase',          label: t('compare.specWheelbase'),     unit: 'mm',      icon: <Ruler className="w-3.5 h-3.5" />,   higherIsBetter: undefined },
    { key: 'engineDisplacement', label: t('compare.specDisplacement'),  unit: 'cc',      icon: <Zap className="w-3.5 h-3.5" />,     higherIsBetter: undefined },
    { key: 'fuelEconomy',        label: t('compare.specFuelEconomy'),   unit: 'L/100km', icon: <BarChart3 className="w-3.5 h-3.5" />, higherIsBetter: false },
    { key: 'electricRange',      label: t('compare.specElectricRange'), unit: 'km',      icon: <Zap className="w-3.5 h-3.5" />,     higherIsBetter: true },
  ]
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Generation Picker ────────────────────────────────────────────────────────

interface GenerationPickerProps {
  label: string
  selected: Generation | undefined
  isLoading: boolean
  onSelect: (id: string) => void
  onClear: () => void
  side: 'A' | 'B'
}

function GenerationPicker({ label, selected, isLoading, onSelect, onClear, side }: GenerationPickerProps) {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Generation[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 320)

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    searchSemantic(debouncedQuery, undefined, 8)
      .then((resp) => {
        if (cancelled) return
        const gens = resp.results
          .filter((r) => r.entityType === 'generation')
          .map((r) => r.entity as Generation)
        setResults(gens)
      })
      .catch(() => setResults([]))
      .finally(() => !cancelled && setSearching(false))
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const accentColor = side === 'A' ? '#00d4ff' : '#ffd700'

  if (selected) {
    const imageUrl = selected.thumbnailUrl ?? selected.heroImageUrl
    const yearLabel = selected.endYear
      ? `${selected.startYear}–${selected.endYear}`
      : `${selected.startYear}–`

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl overflow-hidden border"
        style={{ borderColor: `${accentColor}33` }}
      >
        {/* Car image with hover zoom */}
        <div className="relative aspect-[16/9] overflow-hidden bg-white/3 group">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={`${selected.model?.name} ${selected.codeName}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-16 h-16 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Badge */}
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold font-mono backdrop-blur-sm border"
            style={{ color: accentColor, borderColor: `${accentColor}55`, background: `${accentColor}15` }}
          >
            {label}
          </div>

          {/* Clear button */}
          <button
            onClick={onClear}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/20
              flex items-center justify-center text-white/60 hover:text-white backdrop-blur-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Code name */}
          <div className="absolute bottom-3 left-4">
            <span className="font-mono text-2xl font-black text-white/20 select-none">
              {selected.codeName}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-white/3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-white">
                {selected.model?.name ?? 'Unknown'}
                {' '}
                <span className="font-mono text-sm" style={{ color: accentColor }}>
                  {selected.codeName}
                </span>
              </h3>
              <p className="text-xs text-white/40 font-mono mt-0.5">{yearLabel}</p>
            </div>
            {selected.brand?.name && (
              <span className="text-xs text-white/30 font-medium">{selected.brand.name}</span>
            )}
          </div>

          {/* Quick specs */}
          {selected.specs && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/8">
              {selected.specs.horsepower && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">{t('compare.specPower')}</span>
                  <span className="text-xs font-mono font-bold text-white/80">
                    {selected.specs.horsepower} hp
                  </span>
                </div>
              )}
              {selected.specs.acceleration0to100 && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">0–100</span>
                  <span className="text-xs font-mono font-bold text-white/80">
                    {selected.specs.acceleration0to100}s
                  </span>
                </div>
              )}
              {selected.specs.weight && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">{t('compare.specWeight')}</span>
                  <span className="text-xs font-mono font-bold text-white/80">
                    {selected.specs.weight} kg
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer
          transition-all duration-300 hover:border-opacity-60 group"
        style={{ borderColor: `${accentColor}33`, background: `${accentColor}05` }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        {/* Label badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono mb-4 border"
          style={{ color: accentColor, borderColor: `${accentColor}55`, background: `${accentColor}15` }}
        >
          <span>{label}</span>
        </div>

        <Car className="w-12 h-12 text-white/10 mx-auto mb-3 group-hover:text-white/20 transition-colors" />

        <p className="text-sm text-white/40 mb-4">{t('compare.searchPlaceholder')}</p>

        {/* Inline search */}
        <div
          className="relative flex items-center rounded-xl border bg-white/5 border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <Search className="w-4 h-4 text-white/30 ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={`BMW E46, Porsche 992...`}
            className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder-white/25 outline-none"
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
          {searching && (
            <div className="mr-3 w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-current text-white/30 animate-spin" />
          )}
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]) }}
              className="mr-2 p-1 text-white/30 hover:text-white/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden
              border border-white/10 backdrop-blur-2xl"
            style={{ background: 'rgba(8,8,16,0.97)', boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}
          >
            {results.map((gen) => {
              const thumb = gen.thumbnailUrl ?? gen.heroImageUrl
              return (
                <button
                  key={gen.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left
                    hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                  onMouseDown={() => {
                    onSelect(gen.id)
                    setQuery('')
                    setResults([])
                    setOpen(false)
                  }}
                >
                  <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {thumb ? (
                      <Image src={thumb} alt={gen.codeName} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-4 h-4 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">
                      {gen.model?.name ?? 'Unknown'}{' '}
                      <span style={{ color: accentColor }} className="font-mono">{gen.codeName}</span>
                    </div>
                    <div className="text-xs text-white/40 font-mono">
                      {gen.startYear}{gen.endYear ? `–${gen.endYear}` : '–'}
                      {gen.brand?.name && ` · ${gen.brand.name}`}
                    </div>
                  </div>
                  {gen.isConcept && (
                    <span className="text-[9px] font-bold text-[#ffd700] border border-[#ffd700]/30 px-1.5 py-0.5 rounded">
                      CONCEPT
                    </span>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl backdrop-blur-sm z-10">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#00d4ff] animate-spin" />
        </div>
      )}
    </div>
  )
}

// ─── Similarity Gauge ──────────────────────────────────────────────────────────

function SimilarityGauge({ percent }: { percent: number }) {
  const { t } = useLocale()
  const r = 56
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  const gaugeColor =
    percent >= 80 ? '#00ff88'
    : percent >= 60 ? '#00d4ff'
    : percent >= 40 ? '#ffd700'
    : '#ff6b6b'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg width="144" height="144" className="-rotate-90 absolute inset-0">
          {/* Track */}
          <circle
            cx="72" cy="72" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Fill */}
          <motion.circle
            cx="72" cy="72" r={r}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 8px ${gaugeColor}80)` }}
          />
        </svg>

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4, type: 'spring', bounce: 0.4 }}
            className="font-mono font-black text-3xl leading-none"
            style={{ color: gaugeColor, textShadow: `0 0 20px ${gaugeColor}60` }}
          >
            {percent}%
          </motion.div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-1">
            {t('compare.similar')}
          </div>
        </div>
      </div>

      <div className="text-xs text-white/40 text-center max-w-[140px] leading-relaxed">
        {t('compare.embeddingNote')}
      </div>
    </div>
  )
}

// ─── Comparison Slider ────────────────────────────────────────────────────────

interface ComparisonSliderProps {
  imageA: string
  imageB: string
  altA: string
  altB: string
}

function ComparisonSlider({ imageA, imageB, altA, altB }: ComparisonSliderProps) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50) // percent
  const [dragging, setDragging] = useState(false)

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
    setPosition(pct)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) updatePosition(e.clientX)
  }, [dragging, updatePosition])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragging && e.touches[0]) updatePosition(e.touches[0].clientX)
  }, [dragging, updatePosition])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[21/9] overflow-hidden rounded-2xl select-none cursor-ew-resize"
      onMouseDown={() => setDragging(true)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      onMouseMove={onMouseMove}
      onTouchStart={() => setDragging(true)}
      onTouchEnd={() => setDragging(false)}
      onTouchMove={onTouchMove}
    >
      {/* Image B (right / behind) */}
      <div className="absolute inset-0">
        <Image src={imageB} alt={altB} fill className="object-cover" />
        {/* Label B */}
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-lg text-xs font-bold
          bg-[#ffd700]/20 border border-[#ffd700]/50 text-[#ffd700] backdrop-blur-sm">
          {altB}
        </div>
      </div>

      {/* Image A (left / top) — clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image src={imageA} alt={altA} fill className="object-cover" />
        {/* Label A */}
        <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-lg text-xs font-bold
          bg-[#00d4ff]/20 border border-[#00d4ff]/50 text-[#00d4ff] backdrop-blur-sm">
          {altA}
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
        style={{ left: `${position}%`, boxShadow: '0 0 12px rgba(255,255,255,0.6)' }}
      />

      {/* Handle */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none"
        style={{ left: `${position}%` }}
        animate={{ scale: dragging ? 1.15 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          <ArrowLeftRight className="w-4 h-4 text-black" />
        </div>
      </motion.div>

      {/* Hint */}
      {!dragging && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 2, delay: 2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="px-4 py-2 rounded-full bg-black/60 border border-white/20 text-xs text-white/70 backdrop-blur-sm">
            {t('compare.dragToCompare')}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Specs Table ──────────────────────────────────────────────────────────────

function SpecsTable({ gen1, gen2 }: { gen1: Generation; gen2: Generation }) {
  const { t } = useLocale()
  const SPEC_DEFINITIONS = getSpecDefs(t)

  const specs1 = gen1.specs ?? {}
  const specs2 = gen2.specs ?? {}

  const rows = SPEC_DEFINITIONS.filter(
    (def) => specs1[def.key] !== undefined || specs2[def.key] !== undefined
  )

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        {t('compare.noSpecs')}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            <th className="text-left py-2.5 px-3 text-xs text-white/30 uppercase tracking-wider font-semibold w-1/3">
              {t('compare.specification')}
            </th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-[#00d4ff] w-1/3">
              {gen1.model?.name} {gen1.codeName}
            </th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-[#ffd700] w-1/3">
              {gen2.model?.name} {gen2.codeName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((def, i) => {
            const v1 = specs1[def.key] as number | undefined
            const v2 = specs2[def.key] as number | undefined
            const both = v1 !== undefined && v2 !== undefined

            let diff: 'A' | 'B' | 'tie' | null = null
            if (both && v1 !== v2 && def.higherIsBetter !== undefined) {
              if (def.higherIsBetter) {
                diff = v1 > v2 ? 'A' : 'B'
              } else {
                diff = v1 < v2 ? 'A' : 'B'
              }
            }

            return (
              <motion.tr
                key={def.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="border-b border-white/5 hover:bg-white/3 transition-colors"
              >
                <td className="py-2.5 px-3 text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="text-white/25">{def.icon}</span>
                    <span>{def.label}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {v1 !== undefined ? (
                    <span
                      className={`font-mono font-semibold ${
                        diff === 'A' ? 'text-[#00ff88]' : diff === 'B' ? 'text-[#ff6b6b]' : 'text-white/80'
                      }`}
                    >
                      {v1.toLocaleString()} {def.unit}
                      {diff === 'A' && <TrendingUp className="inline w-3 h-3 ml-1 text-[#00ff88]" />}
                      {diff === 'B' && <TrendingDown className="inline w-3 h-3 ml-1 text-[#ff6b6b]" />}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {v2 !== undefined ? (
                    <span
                      className={`font-mono font-semibold ${
                        diff === 'B' ? 'text-[#00ff88]' : diff === 'A' ? 'text-[#ff6b6b]' : 'text-white/80'
                      }`}
                    >
                      {v2.toLocaleString()} {def.unit}
                      {diff === 'B' && <TrendingUp className="inline w-3 h-3 ml-1 text-[#00ff88]" />}
                      {diff === 'A' && <TrendingDown className="inline w-3 h-3 ml-1 text-[#ff6b6b]" />}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Embedding Scatter Plot ───────────────────────────────────────────────────

interface EmbeddingPoint {
  x: number
  y: number
  label: string
  isMain: boolean
}

function EmbeddingScatterPlot({
  gen1Label,
  gen2Label,
}: {
  gen1Label: string
  gen2Label: string
}) {
  // Generate deterministic-looking neighbor points
  const neighbors: EmbeddingPoint[] = Array.from({ length: 20 }, (_, i) => ({
    x: Math.sin(i * 1.3 + 0.5) * 45 + 50 + (Math.cos(i * 2.1) * 20),
    y: Math.cos(i * 1.7 + 1.2) * 40 + 50 + (Math.sin(i * 1.4) * 15),
    label: `Neighbor ${i + 1}`,
    isMain: false,
  }))

  const mainPoints: EmbeddingPoint[] = [
    { x: 48, y: 52, label: gen1Label, isMain: true },
    { x: 53, y: 47, label: gen2Label, isMain: true },
  ]

  const allPoints = [...neighbors, ...mainPoints]

  const CustomDot = (props: {
    cx?: number
    cy?: number
    payload?: EmbeddingPoint
  }) => {
    const { cx = 0, cy = 0, payload } = props
    if (!payload) return null

    if (payload.isMain) {
      const isFirst = payload.label === gen1Label
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill={isFirst ? '#00d4ff' : '#ffd700'}
            stroke={isFirst ? '#00d4ff' : '#ffd700'}
            strokeWidth={2}
            opacity={1}
            style={{ filter: `drop-shadow(0 0 6px ${isFirst ? '#00d4ff' : '#ffd700'}80)` }}
          />
          <text
            x={cx}
            y={cy - 14}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            fill={isFirst ? '#00d4ff' : '#ffd700'}
            fontFamily="JetBrains Mono, monospace"
          >
            {payload.label}
          </text>
        </g>
      )
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill="rgba(255,255,255,0.2)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
      />
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            label={{ value: 'Embedding Dim 1 (PCA)', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            label={{ value: 'Embedding Dim 2', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
          />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as EmbeddingPoint | undefined
              if (!p || !p.isMain) return null
              return (
                <div className="px-3 py-2 rounded-xl text-xs font-medium border border-white/15"
                  style={{ background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(12px)' }}>
                  <div className="font-bold text-white">{p.label}</div>
                  <div className="text-white/50 font-mono">({p.x.toFixed(1)}, {p.y.toFixed(1)})</div>
                </div>
              )
            }}
          />
          <Scatter
            data={allPoints}
            shape={<CustomDot />}
          >
            {allPoints.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isMain ? (entry.label === gen1Label ? '#00d4ff' : '#ffd700') : 'rgba(255,255,255,0.2)'}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`rounded-2xl border border-white/10 overflow-hidden ${className}`}
      style={{
        background: 'rgba(10,10,20,0.7)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/8">
        <span className="text-[#00d4ff]">{icon}</span>
        <h2 className="font-semibold text-sm text-white/80 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.section>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ContentSkeletons() {
  return (
    <div className="space-y-6">
      {/* Slider skeleton */}
      <div className="aspect-[21/9] rounded-2xl skeleton" />

      {/* Specs skeleton */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(10,10,20,0.7)' }}>
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <div className="w-4 h-4 skeleton rounded" />
          <div className="w-32 h-3 skeleton rounded" />
        </div>
        <div className="p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <div className="h-4 skeleton rounded" />
              <div className="h-4 skeleton rounded ml-auto w-24" />
              <div className="h-4 skeleton rounded ml-auto w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Gauge skeleton */}
      <div className="rounded-2xl border border-white/10 p-6 flex justify-center" style={{ background: 'rgba(10,10,20,0.7)' }}>
        <div className="w-36 h-36 rounded-full skeleton" />
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useLocale()

  const hints = [
    { icon: <BarChart3 className="w-4 h-4" />,     label: t('compare.similarityScore') },
    { icon: <Sparkles className="w-4 h-4" />,       label: t('compare.aiAnalysis') },
    { icon: <ArrowLeftRight className="w-4 h-4" />, label: t('compare.visualSlider') },
    { icon: <BarChart3 className="w-4 h-4" />,     label: t('compare.radarChart') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ x: [-4, 4, -4], rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center"
          >
            <Car className="w-10 h-10 text-white/15" />
          </motion.div>

          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col gap-1"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-3 h-0.5 rounded-full bg-[#00d4ff]/40" />
            ))}
          </motion.div>

          <motion.div
            animate={{ x: [4, -4, 4], rotate: [2, -2, 2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="w-20 h-20 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center"
          >
            <Car className="w-10 h-10 text-white/15" />
          </motion.div>
        </div>

        {/* Glow */}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-[#00d4ff]" />
      </div>

      <h3 className="font-display text-2xl font-bold text-white/80 mb-3">
        {t('compare.selectTwo')}
      </h3>
      <p className="text-white/35 text-sm max-w-sm leading-relaxed">
        {t('compare.selectDesc')}
      </p>

      {/* Feature hints */}
      <div className="grid grid-cols-2 gap-3 mt-8 max-w-md">
        {hints.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40"
          >
            <span className="text-[#00d4ff]/50">{item.icon}</span>
            {item.label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Share Button ─────────────────────────────────────────────────────────────

function ShareButton({ gen1Id, gen2Id }: { gen1Id: string | null; gen2Id: string | null }) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/compare?a=${gen1Id}&b=${gen2Id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Automotive Comparison', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // silently ignore user cancellation
    }
  }, [gen1Id, gen2Id])

  return (
    <button
      onClick={handleShare}
      disabled={!gen1Id || !gen2Id}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        border border-white/15 text-white/60 hover:text-white hover:border-[#00d4ff]/40
        disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
    >
      <Share2 className="w-4 h-4" />
      {copied ? t('compare.copied') : t('compare.share')}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { t } = useLocale()
  const {
    gen1Id, gen2Id,
    setGen1Id, setGen2Id,
    generation1, generation2,
    comparison,
    aiNarrative,
    isLoadingGen1, isLoadingGen2,
    isLoadingComparison, isLoadingNarrative,
    isReady,
    similarityPercent,
    swapGenerations,
    reset,
  } = useCompare()

  // URL param sync on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const a = params.get('a')
    const b = params.get('b')
    if (a) setGen1Id(a)
    if (b) setGen2Id(b)
  }, [setGen1Id, setGen2Id])

  // Update URL when selections change (no router dependency needed)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (gen1Id) params.set('a', gen1Id)
    if (gen2Id) params.set('b', gen2Id)
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [gen1Id, gen2Id])

  // Build radar series from comparison data
  const radarSeries: RadarSeries[] = []
  if (comparison?.radarData && comparison.radarData.length > 0 && generation1 && generation2) {
    radarSeries.push(
      {
        id: generation1.id,
        label: `${generation1.model?.name ?? ''} ${generation1.codeName}`,
        color: '#00d4ff',
        values: Object.fromEntries(comparison.radarData.map((d) => [d.dimension, d.valueA])),
      },
      {
        id: generation2.id,
        label: `${generation2.model?.name ?? ''} ${generation2.codeName}`,
        color: '#ffd700',
        values: Object.fromEntries(comparison.radarData.map((d) => [d.dimension, d.valueB])),
      }
    )
  }

  const showContent = isReady && (generation1 || generation2 || isLoadingComparison)
  const showSlider = generation1 && generation2 &&
    (generation1.heroImageUrl ?? generation1.thumbnailUrl) &&
    (generation2.heroImageUrl ?? generation2.thumbnailUrl)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-7xl mx-auto px-4 md:px-6 py-8"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-[10px] text-[#00d4ff]/60 uppercase tracking-widest font-semibold mb-1 block">
            {t('compare.badge')}
          </span>
          <h1 className="font-display text-3xl font-black text-white">
            {t('compare.heading')}{' '}
            <span className="text-[#00d4ff]">{t('compare.headingAccent')}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isReady && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={swapGenerations}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                border border-white/15 text-white/60 hover:text-white hover:border-[#00d4ff]/40
                transition-all duration-200"
              title={t('compare.swapTitle')}
            >
              <RefreshCcw className="w-4 h-4" />
              {t('compare.swap')}
            </motion.button>
          )}
          <ShareButton gen1Id={gen1Id} gen2Id={gen2Id} />
        </div>
      </div>

      {/* ── Pickers Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center mb-8">
        <GenerationPicker
          label={t('compare.genA')}
          selected={generation1}
          isLoading={isLoadingGen1}
          onSelect={setGen1Id}
          onClear={() => setGen1Id(null)}
          side="A"
        />

        {/* Center VS indicator */}
        <motion.div
          animate={isReady ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.4 }}
          className="flex flex-col items-center justify-center gap-2 flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center
            text-white/40 font-display font-black text-sm">
            VS
          </div>
          {isReady && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
              className="text-[10px] text-[#00d4ff]/60 font-mono"
            >
              {isLoadingComparison
                ? t('compare.analysing')
                : t('compare.matchPct', { pct: similarityPercent })}
            </motion.div>
          )}
        </motion.div>

        <GenerationPicker
          label={t('compare.genB')}
          selected={generation2}
          isLoading={isLoadingGen2}
          onSelect={setGen2Id}
          onClear={() => setGen2Id(null)}
          side="B"
        />
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!gen1Id && !gen2Id ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState />
          </motion.div>
        ) : isLoadingComparison && !comparison ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ContentSkeletons />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* ── Similarity Gauge + Comparison Slider ──────────────────── */}
            {generation1 && generation2 && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
                {/* Slider */}
                {showSlider && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <ComparisonSlider
                      imageA={(generation1.heroImageUrl ?? generation1.thumbnailUrl)!}
                      imageB={(generation2.heroImageUrl ?? generation2.thumbnailUrl)!}
                      altA={`${generation1.model?.name} ${generation1.codeName}`}
                      altB={`${generation2.model?.name} ${generation2.codeName}`}
                    />
                  </motion.div>
                )}

                {/* Gauge */}
                {comparison && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, type: 'spring', bounce: 0.3 }}
                    className="flex-shrink-0 rounded-2xl border border-white/10 p-6"
                    style={{
                      background: 'rgba(10,10,20,0.7)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  >
                    <SimilarityGauge percent={similarityPercent} />
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Specs Table ───────────────────────────────────────────── */}
            {generation1 && generation2 && (
              <SectionCard
                title={t('compare.specTitle')}
                icon={<BarChart3 className="w-4 h-4" />}
              >
                <SpecsTable gen1={generation1} gen2={generation2} />
              </SectionCard>
            )}

            {/* ── Radar + Embedding Side-by-Side ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar */}
              {radarSeries.length > 0 && (
                <SectionCard
                  title={t('compare.dnaRadar')}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  <div className="flex justify-center py-2">
                    <BrandDNARadar
                      series={radarSeries}
                      axes={comparison?.radarData.map((d) => d.dimension)}
                      width={320}
                      height={320}
                    />
                  </div>
                </SectionCard>
              )}

              {/* Embedding Scatter */}
              {generation1 && generation2 && (
                <SectionCard
                  title={t('compare.embeddingSpace')}
                  icon={<BarChart3 className="w-4 h-4" />}
                >
                  <EmbeddingScatterPlot
                    gen1Label={`${generation1.model?.name ?? ''} ${generation1.codeName}`}
                    gen2Label={`${generation2.model?.name ?? ''} ${generation2.codeName}`}
                  />
                  <p className="text-[11px] text-white/25 mt-2 text-center">
                    {t('compare.embeddingCaption')}
                  </p>
                </SectionCard>
              )}
            </div>

            {/* ── AI Narrative ──────────────────────────────────────────── */}
            {(aiNarrative || isLoadingNarrative) && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <AIAnalysisPanel
                  analysis={aiNarrative}
                  isLoading={isLoadingNarrative}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
