'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Copy,
  Share2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Zap,
  BookOpen,
  History,
  TrendingUp,
  Eye,
  Cpu,
  Scroll,
} from 'lucide-react'
import type { AIAnalysis, AIInsight } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AIAnalysisPanelProps {
  analysis?: AIAnalysis
  /** Second analysis variant (different provider/perspective) */
  analysisAlt?: AIAnalysis
  isLoading?: boolean
  onRegenerate?: () => void
  className?: string
}

// ─── Variant tab labels ────────────────────────────────────────────────────────

const VARIANT_META: Record<string, { icon: React.ElementType; labelRu: string; labelEn: string; providerLabel: string }> = {
  groq:     { icon: Cpu,     labelRu: 'Аналитический', labelEn: 'Analytical',  providerLabel: 'Groq · Llama 3.1' },
  gemini:   { icon: Scroll,  labelRu: 'Исторический',  labelEn: 'Historical',  providerLabel: 'Gemini Flash'     },
  anthropic:{ icon: Sparkles,labelRu: 'Углублённый',   labelEn: 'Deep',        providerLabel: 'Claude'           },
  yandex:   { icon: Zap,     labelRu: 'Экспертный',    labelEn: 'Expert',      providerLabel: 'YandexGPT Pro'    },
  default:  { icon: Sparkles,labelRu: 'Анализ',        labelEn: 'Analysis',    providerLabel: 'AI'               },
}

// ─── Typewriter ────────────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0

    function tick() {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
        timeoutRef.current = setTimeout(tick, speed)
      } else {
        setDone(true)
      }
    }

    timeoutRef.current = setTimeout(tick, 200)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [text, speed])

  return { displayed, done }
}

// ─── Confidence Bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const { t } = useLocale()
  const pct = Math.round(score * 100)
  const color =
    pct >= 80 ? '#00ff88' : pct >= 60 ? '#00d4ff' : pct >= 40 ? '#ffd700' : '#ff6b6b'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/40 w-24 flex-shrink-0">{t('aiPanel.confidence')}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
      <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

// ─── Importance label colours ─────────────────────────────────────────────────

const importanceBorder: Record<AIInsight['importance'], string> = {
  critical: 'border-red-500/30 bg-red-500/[0.07]',
  high:     'border-[#00d4ff]/30 bg-[#00d4ff]/[0.07]',
  medium:   'border-[#ffd700]/20 bg-[#ffd700]/[0.05]',
  low:      'border-white/10 bg-white/[0.03]',
}

const importanceDot: Record<AIInsight['importance'], string> = {
  critical: 'bg-red-400',
  high:     'bg-[#00d4ff]',
  medium:   'bg-[#ffd700]',
  low:      'bg-white/40',
}

// ─── Insight Card ──────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: AIInsight }) {
  const { t } = useLocale()

  return (
    <div className={`rounded-xl p-3 border ${importanceBorder[insight.importance]}`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${importanceDot[insight.importance]}`} />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-0.5">
            {insight.category}
          </div>
          <p className="text-sm text-white/80 leading-relaxed">
            {insight.text}
          </p>
          {insight.confidence < 0.7 && (
            <div className="mt-1 text-[10px] text-white/30 font-mono">
              {t('aiPanel.confidenceLow', { pct: Math.round(insight.confidence * 100) })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  count?: number
}

function Section({ title, icon, children, defaultOpen = true, count }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-white/8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#00d4ff]">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/8 text-white/40 leading-none">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/30" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/30" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full skeleton" />
        <div className="h-4 w-32 skeleton rounded" />
        <div className="ml-auto h-3 w-20 skeleton rounded" />
      </div>
      <div className="h-3 w-full skeleton rounded" />
      <div className="h-3 w-5/6 skeleton rounded" />
      <div className="h-3 w-4/5 skeleton rounded" />
      <div className="h-3 w-3/4 skeleton rounded" />
      <div className="h-1.5 w-full skeleton rounded-full mt-4" />
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ─── Importance sort order ─────────────────────────────────────────────────────

const importanceOrder: Record<AIInsight['importance'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

// ─── Insight keyword classifiers (module-level — stable refs) ─────────────────

const DESIGN_KW  = ['design', 'aero', 'style', 'visual', 'form', 'innovation', 'engineering', 'chassis', 'platform', 'bodywork', 'proportion']
const HISTORY_KW = ['heritage', 'history', 'historical', 'legacy', 'context', 'predecessor', 'successor', 'cultural', 'evolution', 'continuity', 'longevity', 'influence', 'impact', 'consistency']
const FUTURE_KW  = ['future', 'prediction', 'trend', 'outlook', 'market', 'brand', 'commercial', 'significance', 'transition', 'collect']

// ─── Main Component ────────────────────────────────────────────────────────────

export function AIAnalysisPanel({
  analysis,
  analysisAlt,
  isLoading = false,
  onRegenerate,
  className = '',
}: AIAnalysisPanelProps) {
  const { t, locale } = useLocale()
  const isRu = locale === 'ru'
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)

  // Dual-variant state: 'main' | 'alt'
  const hasDual = !!analysisAlt
  const [activeVariant, setActiveVariant] = useState<'main' | 'alt'>('main')
  const activeAnalysis = activeVariant === 'alt' && analysisAlt ? analysisAlt : analysis

  const summaryText = activeAnalysis?.summary ?? ''
  const { displayed: typedSummary, done: typingDone } = useTypewriter(summaryText, 16)

  const handleCopy = useCallback(async () => {
    if (!activeAnalysis) return
    await navigator.clipboard.writeText(activeAnalysis.fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [activeAnalysis])

  const handleShare = useCallback(async () => {
    if (!activeAnalysis) return
    if (navigator.share) {
      await navigator.share({
        title: activeAnalysis.headline,
        text: activeAnalysis.summary,
      })
    }
  }, [activeAnalysis])

  const getProviderLabel = (a: AIAnalysis | undefined) => {
    if (!a) return 'AI'
    const key = a.provider as string
    return VARIANT_META[key]?.providerLabel
      ?? (key === 'gpt-4o' ? 'GPT-4o' : key === 'claude-3-5' ? 'Claude 3.5' : key ?? 'AI')
  }
  const providerLabel = getProviderLabel(activeAnalysis)

  const mainMeta = VARIANT_META[analysis?.provider ?? 'default'] ?? VARIANT_META.default
  const altMeta  = VARIANT_META[analysisAlt?.provider ?? 'default'] ?? VARIANT_META.default

  // ── Smart insight categorisation ──────────────────────────────────────────
  // Uses module-level keyword arrays (stable refs — no useMemo dep issues).

  const { designInsights, historyInsights, futureInsights, coreInsights } = useMemo(() => {
    if (!activeAnalysis?.insights) return { designInsights: [], historyInsights: [], futureInsights: [], coreInsights: [] }

    const cat = (i: AIInsight) => i.category.toLowerCase()
    const design  = activeAnalysis.insights.filter(i => DESIGN_KW.some(k => cat(i).includes(k)))
    const history = activeAnalysis.insights.filter(i => !design.includes(i) && HISTORY_KW.some(k => cat(i).includes(k)))
    const future  = activeAnalysis.insights.filter(i => !design.includes(i) && !history.includes(i) && FUTURE_KW.some(k => cat(i).includes(k)))
    const categorised = new Set([...design, ...history, ...future].map(i => i.id))
    const core = activeAnalysis.insights.filter(i => !categorised.has(i.id))
    const sort = (arr: AIInsight[]) => [...arr].sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
    return { designInsights: sort(design), historyInsights: sort(history), futureInsights: sort(future), coreInsights: sort(core) }
  }, [activeAnalysis?.insights])

  const showCore       = coreInsights.length > 0 || (designInsights.length === 0 && historyInsights.length === 0 && futureInsights.length === 0)
  const allInCore      = designInsights.length === 0 && historyInsights.length === 0 && futureInsights.length === 0
  const overviewInsights = allInCore
    ? [...(activeAnalysis?.insights ?? [])].sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
    : coreInsights

  return (
    <motion.div
      layout
      className={`rounded-2xl border border-white/10 overflow-hidden ${className}`}
      style={{
        background: 'rgba(10, 10, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#00d4ff]" />
          </div>
          <span className="font-display font-semibold text-sm text-white">{t('aiPanel.title')}</span>

          {/* Dual-variant tabs */}
          {hasDual ? (
            <div className="flex items-center gap-1 ml-1">
              {([
                { key: 'main' as const, meta: mainMeta },
                { key: 'alt'  as const, meta: altMeta  },
              ]).map(({ key, meta }) => {
                const Icon = meta.icon
                const active = activeVariant === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveVariant(key)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                      uppercase tracking-wider transition-all
                      ${active
                        ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/35 text-[#00d4ff]'
                        : 'border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20'
                      }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {isRu ? meta.labelRu : meta.labelEn}
                  </button>
                )
              })}
            </div>
          ) : (
            activeAnalysis && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                bg-[#00d4ff]/10 border border-[#00d4ff]/25 text-[#00d4ff]">
                {providerLabel}
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Timestamp */}
          {analysis && (
            <div className="flex items-center gap-1 text-white/25 text-xs mr-1">
              <Clock className="w-3 h-3" />
              <span className="font-mono">
                {new Date(analysis.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <button
            onClick={handleCopy}
            disabled={!activeAnalysis}
            title={t('aiPanel.copyTooltip')}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleShare}
            disabled={!activeAnalysis}
            title={t('aiPanel.shareTooltip')}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-30"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              title={t('aiPanel.regenTooltip')}
              className="p-1.5 rounded-lg text-white/30 hover:text-[#00d4ff] hover:bg-[#00d4ff]/8 transition-all disabled:opacity-30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {isLoading && !activeAnalysis ? (
              <LoadingSkeleton />
            ) : activeAnalysis ? (
              <AnimatePresence mode="wait">
              <motion.div
                key={activeVariant}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="max-h-[70vh] overflow-y-auto"
              >

                {/* Headline + Summary */}
                <div className="px-5 pt-4 pb-3">
                  <h3 className="font-display font-bold text-base text-white mb-2 leading-snug">
                    {activeAnalysis.headline}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {typingDone ? summaryText : typedSummary}
                    {!typingDone && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-[#00d4ff] ml-0.5 align-middle"
                      />
                    )}
                  </p>

                  {/* Confidence */}
                  <div className="mt-3">
                    <ConfidenceBar score={activeAnalysis.confidenceScore} />
                  </div>
                </div>

                {/* ── Overview / core insights ───────────────────────────── */}
                {overviewInsights.length > 0 && (
                  <Section
                    title={t('aiPanel.sectionInsights')}
                    icon={<Eye className="w-3.5 h-3.5" />}
                    count={overviewInsights.length}
                  >
                    <div className="space-y-2">
                      {overviewInsights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* ── Design insights ───────────────────────────────────── */}
                {designInsights.length > 0 && (
                  <Section
                    title={t('aiPanel.sectionDesign')}
                    icon={<Zap className="w-3.5 h-3.5" />}
                    count={designInsights.length}
                    defaultOpen={overviewInsights.length === 0}
                  >
                    <div className="space-y-2">
                      {designInsights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* ── Historical context ────────────────────────────────── */}
                {historyInsights.length > 0 && (
                  <Section
                    title={t('aiPanel.sectionHistory')}
                    icon={<History className="w-3.5 h-3.5" />}
                    count={historyInsights.length}
                    defaultOpen={false}
                  >
                    <div className="space-y-2">
                      {historyInsights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* ── Future outlook ────────────────────────────────────── */}
                {futureInsights.length > 0 && (
                  <Section
                    title={t('aiPanel.sectionFuture')}
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    count={futureInsights.length}
                    defaultOpen={false}
                  >
                    <div className="space-y-2">
                      {futureInsights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* ── Full text ─────────────────────────────────────────── */}
                {analysis.fullText && analysis.fullText !== analysis.summary && (
                  <Section
                    title={t('aiPanel.sectionFull')}
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                    defaultOpen={false}
                  >
                    <p className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap">
                      {analysis.fullText}
                    </p>
                  </Section>
                )}

                {/* ── Footer ───────────────────────────────────────────── */}
                <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white/25 text-[11px]">
                    {activeAnalysis.isCached && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('aiPanel.cached')}
                      </span>
                    )}
                    {activeAnalysis.tokensUsed && (
                      <span className="font-mono">
                        {t('aiPanel.tokens', { count: activeAnalysis.tokensUsed.toLocaleString() })}
                      </span>
                    )}
                    <span className="font-mono">{activeAnalysis.processingTimeMs}ms</span>
                    {hasDual && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] border border-white/10">
                        {getProviderLabel(activeAnalysis)}
                      </span>
                    )}
                  </div>
                  {activeAnalysis.isCached && (
                    <span className="text-[10px] text-white/25 italic">
                      {t('aiPanel.resultsCached')}
                    </span>
                  )}
                </div>
              </motion.div>
              </AnimatePresence>
            ) : (
              <div className="px-5 py-8 text-center">
                <Sparkles className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/30">
                  {t('aiPanel.empty')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default AIAnalysisPanel
