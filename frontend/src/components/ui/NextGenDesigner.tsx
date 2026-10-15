"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Cpu, TrendingUp, Palette, Copy, Check, RefreshCw } from "lucide-react";

interface NextGenResult {
  predictedYear: number;
  confidence: number;
  predictedHp: number;
  predictedEngine: string;
  designTrends: string[];
  techTrends: string[];
  narrative: string;
  imagePrompt: string;
  marketContext: string;
}

interface Props {
  brandName: string;
  modelName: string;
  lastYear: number;
  lastHp?: number;
  engineType?: string;
  zone?: string;
  notes?: string[];
}

const ENGINE_LABEL: Record<string, string> = {
  ev: 'Электро', hybrid: 'Гибрид', phev: 'PHEV',
  v8s: 'V8 SC', v8t: 'V8 Turbo', v8: 'V8 NA',
  v6t: 'V6 Turbo', v6: 'V6 NA', i4t: 'I4 Turbo',
  flat6: 'Flat-6', flat6t: 'Flat-6T', w16: 'W16',
}

function ConfidenceRing({ value }: { value: number }) {
  const r = 36, circ = 2 * Math.PI * r
  const dash = circ * value
  const color = value >= 0.75 ? '#22d3ee' : value >= 0.5 ? '#ffd700' : '#ff6b35'
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
      <motion.circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="44" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">
        {Math.round(value * 100)}%
      </text>
      <text x="48" y="58" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
        уверен.
      </text>
    </svg>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-muted hover:text-text-primary">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-white/5 rounded-lg w-2/3" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_,i) => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
      </div>
      <div className="h-32 bg-white/5 rounded-xl" />
      <div className="h-24 bg-white/5 rounded-xl" />
      <div className="h-16 bg-white/5 rounded-xl" />
    </div>
  )
}

export default function NextGenDesigner({ brandName, modelName, lastYear, lastHp, engineType, zone, notes }: Props) {
  const [result, setResult] = useState<NextGenResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/nextgen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, modelName, lastYear, lastHp, engineType, zone, notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Ошибка генерации')
      }
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Дизайнер следующего поколения
          </h3>
          <p className="text-text-muted text-sm mt-1">
            ИИ-анализ трендов и предсказание развития {brandName} {modelName}
          </p>
        </div>
        {result && !loading && (
          <button onClick={generate} className="btn-surface flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
        )}
      </div>

      {/* Empty state */}
      {!result && !loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-border p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h4 className="font-display text-lg font-bold text-text-primary mb-2">
            Предсказать следующее поколение
          </h4>
          <p className="text-text-muted text-sm max-w-sm mx-auto mb-6">
            ИИ проанализирует историю модели, технологические тренды и дизайн-философию бренда
          </p>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Сгенерировать предсказание
          </button>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="glass rounded-2xl border border-danger/30 p-6 text-center">
          <p className="text-danger text-sm mb-3">{error}</p>
          <button onClick={generate} className="btn-secondary text-sm">Попробовать снова</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-text-muted text-sm">ИИ анализирует историю модели…</span>
          </div>
          <Skeleton />
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Top stats */}
            <div className="grid grid-cols-3 gap-3">
              {/* Confidence */}
              <div className="glass rounded-2xl border border-border p-4 flex flex-col items-center justify-center">
                <ConfidenceRing value={result.confidence} />
                <span className="text-xs text-text-muted mt-1">уверенность</span>
              </div>
              {/* Year */}
              <div className="glass rounded-2xl border border-border p-4 flex flex-col items-center justify-center gap-1">
                <TrendingUp className="w-5 h-5 text-primary mb-1" />
                <span className="font-display text-3xl font-black text-primary">{result.predictedYear}</span>
                <span className="text-xs text-text-muted">ожид. год</span>
              </div>
              {/* HP */}
              <div className="glass rounded-2xl border border-border p-4 flex flex-col items-center justify-center gap-1">
                <Zap className="w-5 h-5 text-gold mb-1" />
                <span className="font-display text-3xl font-black text-gold">{result.predictedHp ?? '—'}</span>
                <span className="text-xs text-text-muted">
                  {result.predictedHp ? 'л.с. · ' : ''}{ENGINE_LABEL[result.predictedEngine] ?? result.predictedEngine}
                </span>
              </div>
            </div>

            {/* Narrative */}
            <div className="glass rounded-2xl border border-border p-5">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Концепция
              </h4>
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{result.narrative}</p>
            </div>

            {/* Design + Tech trends */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-2xl border border-border p-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-primary" /> Дизайн-тренды
                </h4>
                <ul className="space-y-2">
                  {result.designTrends.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-primary mt-0.5">▸</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Технологии
                </h4>
                <ul className="space-y-2">
                  {result.techTrends.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-cyan-400 mt-0.5">▸</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Market context */}
            {result.marketContext && (
              <div className="glass rounded-2xl border border-border/50 p-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Рыночный контекст</h4>
                <p className="text-text-secondary text-sm">{result.marketContext}</p>
              </div>
            )}

            {/* Image prompt */}
            {result.imagePrompt && (
              <div className="glass rounded-2xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Промпт для Midjourney / DALL·E
                  </h4>
                  <CopyButton text={result.imagePrompt} />
                </div>
                <p className="text-text-muted text-xs font-mono leading-relaxed">{result.imagePrompt}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
