'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Timer, Gauge, Zap, TrendingUp, Weight } from 'lucide-react'
import type { Generation } from '@/lib/types'
import type { A777CarData, TrackKey } from '@/lib/a777'
import { TRACK_META } from '@/lib/a777'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  gen1: Generation
  gen2: Generation
}

interface CarA777 {
  label: string
  data: A777CarData | null
  loading: boolean
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

function buildQuery(gen: Generation) {
  const params = new URLSearchParams({
    brandId:  gen.brandId ?? '',
    year:     String(gen.startYear ?? gen.endYear ?? ''),
    name:     gen.model?.name ?? gen.codeName ?? '',
    codeName: gen.codeName ?? '',
    nodeId:   gen.id ?? '',
  })
  return `/api/a777?${params}`
}

function useA777(gen: Generation): CarA777 {
  const label = `${gen.model?.name ?? ''} ${gen.codeName}`.trim()
  const [data, setData] = useState<A777CarData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    const ctl = new AbortController()
    fetch(buildQuery(gen), { signal: ctl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: A777CarData | null) => { if (!ctl.signal.aborted) { setData(d); setLoading(false) } })
      .catch(() => { if (!ctl.signal.aborted) setLoading(false) })
    return () => ctl.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.id])

  return { label, data, loading }
}

// ─── Rating bar ───────────────────────────────────────────────────────────────

interface BarProps {
  label:   string
  icon:    React.ReactNode
  val1?:   number
  val2?:   number
  unit:    string
  higherIsBetter?: boolean
  format?: (n: number) => string
}

function RatingBar({ label, icon, val1, val2, unit, higherIsBetter = true, format }: BarProps) {
  const fmt = format ?? ((n: number) => n.toLocaleString('ru-RU'))
  const max = Math.max(val1 ?? 0, val2 ?? 0)
  if (!max) return null

  const pct = (v?: number) => (v && max ? Math.round((v / max) * 100) : 0)

  const better = (v1?: number, v2?: number) => {
    if (!v1 || !v2) return 0
    if (higherIsBetter) return v1 > v2 ? 1 : v1 < v2 ? 2 : 0
    return v1 < v2 ? 1 : v1 > v2 ? 2 : 0
  }
  const winner = better(val1, val2)

  return (
    <div className="grid gap-y-1 text-xs">
      <div className="flex items-center gap-1.5 text-white/50">
        {icon}
        <span>{label}</span>
        <span className="ml-1 text-white/25">{unit}</span>
      </div>
      {/* Car 1 */}
      <div className="flex items-center gap-2">
        <div className="w-24 text-right font-mono text-[11px]" style={{ color: '#00d4ff' }}>
          {val1 != null ? fmt(val1) : '—'}
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#00d4ff', opacity: winner === 1 ? 1 : 0.45 }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(val1)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
        {winner === 1 && <span className="text-[10px] text-yellow-400">▶</span>}
      </div>
      {/* Car 2 */}
      <div className="flex items-center gap-2">
        <div className="w-24 text-right font-mono text-[11px]" style={{ color: '#ffd700' }}>
          {val2 != null ? fmt(val2) : '—'}
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#ffd700', opacity: winner === 2 ? 1 : 0.45 }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(val2)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
          />
        </div>
        {winner === 2 && <span className="text-[10px] text-yellow-400">▶</span>}
      </div>
    </div>
  )
}

// ─── Track times table ────────────────────────────────────────────────────────

function TrackTable({
  label1,
  label2,
  times1,
  times2,
}: {
  label1: string
  label2: string
  times1?: Partial<Record<TrackKey, string>>
  times2?: Partial<Record<TrackKey, string>>
}) {
  const tracks = Object.keys(TRACK_META) as TrackKey[]
  const anyTime = tracks.some(k => times1?.[k] || times2?.[k])
  if (!anyTime) return null

  const parseTime = (t?: string): number | null => {
    if (!t) return null
    const m = t.match(/^(\d+):(\d+\.\d+)$/)
    if (m) return parseFloat(m[1]) * 60 + parseFloat(m[2])
    return parseFloat(t) || null
  }

  return (
    <div>
      <div className="text-[11px] text-white/40 mb-2 flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5" />
        <span>Треки</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left text-white/30 font-normal py-1.5 pr-4 whitespace-nowrap">Трасса</th>
              <th className="text-right font-mono py-1.5 px-2 whitespace-nowrap" style={{ color: '#00d4ff' }}>
                {label1}
              </th>
              <th className="text-right font-mono py-1.5 px-2 whitespace-nowrap" style={{ color: '#ffd700' }}>
                {label2}
              </th>
              <th className="text-center py-1.5 pl-2 text-white/30 font-normal">Лучший</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(k => {
              const t1 = times1?.[k]
              const t2 = times2?.[k]
              if (!t1 && !t2) return null
              const n1 = parseTime(t1)
              const n2 = parseTime(t2)
              let winner: 0 | 1 | 2 = 0
              if (n1 && n2) winner = n1 < n2 ? 1 : n1 > n2 ? 2 : 0
              else if (n1) winner = 1
              else if (n2) winner = 2

              const { label, emoji } = TRACK_META[k]
              return (
                <tr key={k} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-1.5 pr-4 text-white/50 whitespace-nowrap">
                    {emoji} {label}
                  </td>
                  <td className={`text-right font-mono py-1.5 px-2 ${winner === 1 ? 'text-white' : 'text-white/40'}`}>
                    {t1 ?? '—'}
                  </td>
                  <td className={`text-right font-mono py-1.5 px-2 ${winner === 2 ? 'text-white' : 'text-white/40'}`}>
                    {t2 ?? '—'}
                  </td>
                  <td className="text-center py-1.5 pl-2 text-yellow-400 text-[11px]">
                    {winner === 1 ? '🏆 1' : winner === 2 ? '🏆 2' : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function A777Section({ gen1, gen2 }: Props) {
  const c1 = useA777(gen1)
  const c2 = useA777(gen2)

  const loading = c1.loading || c2.loading
  const noData  = !c1.data?.found && !c2.data?.found && !loading

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-white/10 p-6"
        style={{ background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-white/60 text-sm">🏁 A777 Рейтинги</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (noData) return null

  const d1 = c1.data
  const d2 = c2.data

  const hasSpecs = [
    d1?.topSpeed ?? d2?.topSpeed,
    d1?.acceleration ?? d2?.acceleration,
    d1?.horsepower ?? d2?.horsepower,
    d1?.weightKg ?? d2?.weightKg,
  ].some(Boolean)

  const sourceUrl1 = d1?.found ? d1.url : undefined
  const sourceUrl2 = d2?.found ? d2.url : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl border border-white/10 p-6 space-y-6"
      style={{
        background: 'rgba(10,10,20,0.7)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/80">🏁 A777 Рейтинги</span>
          <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">
            a777aa77.ru
          </span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1" style={{ color: '#00d4ff' }}>
            ● {c1.label}
          </span>
          <span className="flex items-center gap-1" style={{ color: '#ffd700' }}>
            ● {c2.label}
          </span>
        </div>
      </div>

      {/* Rating bars */}
      {hasSpecs && (
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          <RatingBar
            label="Макс. скорость"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            val1={d1?.topSpeed}
            val2={d2?.topSpeed}
            unit="км/ч"
          />
          <RatingBar
            label="Разгон 0–100"
            icon={<Timer className="w-3.5 h-3.5" />}
            val1={d1?.acceleration}
            val2={d2?.acceleration}
            unit="с"
            higherIsBetter={false}
            format={n => n.toFixed(1)}
          />
          <RatingBar
            label="Мощность"
            icon={<Zap className="w-3.5 h-3.5" />}
            val1={d1?.horsepower}
            val2={d2?.horsepower}
            unit="л.с."
          />
          <RatingBar
            label="Крутящий момент"
            icon={<Gauge className="w-3.5 h-3.5" />}
            val1={d1?.torque}
            val2={d2?.torque}
            unit="Нм"
          />
          <RatingBar
            label="Снаряжённая масса"
            icon={<Weight className="w-3.5 h-3.5" />}
            val1={d1?.weightKg}
            val2={d2?.weightKg}
            unit="кг"
            higherIsBetter={false}
          />
          {(d1?.hpPerTon ?? d2?.hpPerTon) && (
            <RatingBar
              label="Удельная мощность"
              icon={<Zap className="w-3.5 h-3.5" />}
              val1={d1?.hpPerTon}
              val2={d2?.hpPerTon}
              unit="л.с./т"
            />
          )}
        </div>
      )}

      {/* Track times */}
      <TrackTable
        label1={c1.label}
        label2={c2.label}
        times1={d1?.trackTimes}
        times2={d2?.trackTimes}
      />

      {/* Source links */}
      {(sourceUrl1 || sourceUrl2) && (
        <div className="flex flex-wrap gap-3 pt-1 border-t border-white/5">
          {sourceUrl1 && (
            <a
              href={sourceUrl1}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {c1.label} на A777
            </a>
          )}
          {sourceUrl2 && (
            <a
              href={sourceUrl2}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {c2.label} на A777
            </a>
          )}
        </div>
      )}
    </motion.div>
  )
}
