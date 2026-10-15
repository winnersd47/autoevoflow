"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Factory, TrendingUp, ChevronRight, Network, Zap, Car, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useBrand, useBrandModels, useBrandDNA, useAnalysis } from "@/lib/api";
import { useDemoBrand } from "@/lib/demo-data";
import { useLocale } from "@/contexts/LocaleContext";
import { BrandDNARadar, type RadarSeries } from "@/components/graph/BrandDNARadar";
import AIAnalysisPanel from "@/components/ui/AIAnalysisPanel";
import type { CarModel } from "@/lib/types";

// ─── Country flag emoji helper ────────────────────────────────────────────────

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ─── Loading State ────────────────────────────────────────────────────────────

function BrandPageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-64 skeleton w-full rounded-none" />
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { t } = useLocale();

  const { data: apiBrand, isLoading: brandLoading } = useBrand(slug);
  const { data: apiModels, isLoading: modelsLoading } = useBrandModels(slug);
  const { data: apiDna } = useBrandDNA(slug);
  const { data: apiAnalysis } = useAnalysis("brand", slug, "brand_dna", { enabled: !!slug });

  // Fallback to scraped static JSON when backend is unavailable
  const { data: demoData, loading: demoLoading } = useDemoBrand(slug);
  const brand    = apiBrand    ?? demoData?.brand;
  const models   = apiModels   ?? demoData?.models;
  const dna      = apiDna      ?? demoData?.dna;
  const analysis    = apiAnalysis ?? demoData?.analysis;
  const analysisAlt = (demoData as { analysisAlt?: typeof analysis } | undefined)?.analysisAlt;

  // Build RadarSeries from DNA dimensions
  const radarSeries = useMemo<RadarSeries[]>(() => {
    if (!dna?.dimensions?.length || !brand) return [];
    return [{
      id: brand.id ?? slug,
      label: brand.name,
      color: '#00d4ff',
      values: Object.fromEntries(dna.dimensions.map((d) => [d.label, d.score])),
    }];
  }, [dna, brand, slug]);

  if (brandLoading || demoLoading) return <BrandPageSkeleton />;

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-12 border border-danger/30">
          <h2 className="font-display text-2xl font-bold text-danger mb-3">
            {t("brand.notFound")}
          </h2>
          <p className="text-text-secondary mb-6">
            {t("brand.notFoundDesc", { slug })}
          </p>
          <Link href="/brands" className="btn-secondary">{t("brand.browseAll")}</Link>
        </div>
      </div>
    );
  }

  const QUICK_STATS = [
    { icon: Calendar,   label: t("brand.founded"),          value: brand.foundingYear },
    { icon: Factory,    label: t("brand.hq"),               value: brand.headquarters },
    { icon: TrendingUp, label: t("brand.modelsLabel"),      value: brand.modelCount },
    { icon: Network,    label: t("brand.generationsLabel"), value: brand.generationCount },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-72 md:h-96 overflow-hidden"
      >
        {brand.headerImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${brand.headerImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-surface to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        {/* Animated scan lines */}
        <div className="absolute inset-0 scan-effect opacity-30" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-end pb-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-end gap-6"
          >
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl glass border border-border flex items-center justify-center shrink-0">
              {brand.logoWhiteUrl ? (
                <img src={brand.logoWhiteUrl} alt={brand.name} className="w-12 h-12 object-contain" />
              ) : (
                <span className="font-display text-2xl font-black text-primary">{brand.name[0]}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{countryFlag(brand.countryCode)}</span>
                <span className="section-label">{brand.country}</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-black text-text-primary tracking-tight">
                {brand.name}
              </h1>
              {brand.parentCompany && (
                <p className="text-text-muted text-sm mt-1">
                  {t("brand.partOf", { name: brand.parentCompany })}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Quick Stats ───────────────────────────────────────────────────── */}
      <section className="bg-surface/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {QUICK_STATS.map(({ icon: Icon, label, value }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs text-text-muted">{label}</div>
                  <div className="text-sm font-semibold text-text-primary">{value}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">
        {/* Left column: description + AI analysis */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 border border-border"
          >
            <h2 className="font-display text-xl font-bold mb-4">
              {t("brand.about", { name: brand.name })}
            </h2>
            <p className="text-text-secondary leading-relaxed">{brand.description}</p>
          </motion.div>

          {/* Model Lineup — grouped by family */}
          {modelsLoading ? (
            <div className="h-64 skeleton rounded-2xl" />
          ) : models?.length ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-bold">
                  {t("brand.modelLineup")}
                </h2>
                <span className="badge-surface">
                  {t("brand.modelsCount", { count: models.length })}
                </span>
              </div>
              <ModelFamilyGrid models={models} slug={slug} t={t} />
            </motion.div>
          ) : null}

          {/* AI Analysis */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AIAnalysisPanel analysis={analysis} analysisAlt={analysisAlt} />
            </motion.div>
          )}
        </div>

        {/* Right column: DNA radar + cross-brand */}
        <div className="space-y-6">
          {/* DNA Radar */}
          {dna && radarSeries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6 border border-border"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold">{t("brand.designDna")}</h3>
                <span className="text-2xl font-bold text-primary">{dna.overallScore}</span>
              </div>
              <BrandDNARadar
                series={radarSeries}
                axes={dna.dimensions.map((d) => d.label)}
                width={280}
                height={280}
              />
            </motion.div>
          )}

          {/* Tags */}
          {brand.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6 border border-border"
            >
              <h3 className="font-display text-lg font-bold mb-4">{t("brand.brandIdentity")}</h3>
              <div className="flex flex-wrap gap-2">
                {brand.tags.map((tag) => (
                  <span key={tag} className="badge-surface">{tag}</span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Cross-brand connections CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href={`/evolution?brand=${brand.id}`}>
              <div className="glass-primary rounded-2xl p-6 border border-primary/20 hover:border-primary/40
                transition-all duration-300 hover:shadow-glow-sm group cursor-pointer">
                <Network className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-display text-base font-bold text-text-primary mb-2">
                  {t("brand.evolutionGraph")}
                </h3>
                <p className="text-text-secondary text-sm">
                  {t("brand.evolutionGraphDesc", { count: brand.generationCount })}
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Model Family Grid ────────────────────────────────────────────────────────

type GroupKey = 'supercar' | 'coupe' | 'convertible' | 'suv' | 'sedan' | 'concept' | 'other'

function getGroup(model: CarModel): GroupKey {
  if (model.bodyType === 'concept') return 'concept'
  if (model.bodyType === 'suv' || model.bodyType === 'crossover') return 'suv'
  if (model.bodyType === 'sedan') return 'sedan'
  if (model.bodyType === 'convertible' || model.bodyType === 'roadster') return 'convertible'
  if (model.bodyType === 'coupe') return model.segment === 'sports' ? 'supercar' : 'coupe'
  return 'other'
}

const GROUP_LABELS: Record<GroupKey, string> = {
  supercar: 'brand.catSupercar', coupe: 'brand.catCoupe', convertible: 'brand.catConvertible',
  suv: 'brand.catSuv', sedan: 'brand.catSedan', concept: 'brand.catConcept', other: 'brand.catOther',
}
const GROUP_ORDER: GroupKey[] = ['supercar', 'coupe', 'convertible', 'suv', 'sedan', 'concept', 'other']

interface ModelFamilyGridProps {
  models: CarModel[]
  slug: string
  t: (key: string, params?: Record<string, string | number>) => string
}

// ── Карточка модели с изображением 3/4 (через прокси) ──────────────────────
function ModelCard({ model }: { model: CarModel }) {
  const hasImg = !!(model.heroImageUrl || model.thumbnailUrl)
  const proxyUrl = hasImg ? `/api/car-image?slug=${encodeURIComponent(model.slug)}` : null

  return (
    <Link href={`/model/${model.slug}`}>
      <div className="group relative rounded-xl overflow-hidden border border-white/8
        hover:border-primary/30 bg-surface transition-all duration-200 cursor-pointer
        hover:shadow-[0_4px_20px_rgba(249,115,22,0.12)]">

        {/* Изображение 3/4 (ракурс спереди-сбоку) */}
        <div className="relative w-full bg-surface-elevated overflow-hidden"
          style={{ aspectRatio: '16/9' }}>
          {proxyUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxyUrl}
                alt={model.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500
                  group-hover:scale-105"
                onError={(e) => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  const fb = t.nextElementSibling as HTMLElement | null
                  if (fb) fb.style.display = 'flex'
                }}
              />
              {/* Fallback если картинка не грузится */}
              <div className="absolute inset-0 items-center justify-center hidden">
                <Car className="w-8 h-8 text-white/10" />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className="w-8 h-8 text-white/10" />
            </div>
          )}
          {/* Градиент снизу для плавного перехода к тексту */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent
            opacity-90 pointer-events-none" />
          {/* Бейдж активной модели */}
          {model.isActive && (
            <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5
              rounded-full text-[9px] font-semibold text-green-400 bg-green-400/15
              border border-green-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Информация */}
        <div className="px-3 pb-3 pt-1">
          <div className="font-semibold text-sm text-white/90 group-hover:text-primary
            transition-colors truncate leading-tight">
            {model.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/35 font-mono">
            <span>
              {model.startYear}
              {model.isActive ? '–' : model.endYear ? `–${model.endYear}` : ''}
            </span>
            {model.generationCount > 1 && (
              <span className="text-primary/40">
                {model.generationCount} gen
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function ModelFamilyGrid({ models, slug, t }: ModelFamilyGridProps) {
  // Build groups
  const groups = useMemo(() => {
    const map = new Map<GroupKey, CarModel[]>()
    GROUP_ORDER.forEach(k => map.set(k, []))
    models.forEach(m => {
      const g = getGroup(m)
      map.get(g)!.push(m)
    })
    // Sort: active first, then by year desc
    map.forEach(arr => arr.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return b.startYear - a.startYear
    }))
    return map
  }, [models])

  const nonEmpty = GROUP_ORDER.filter(k => (groups.get(k)?.length ?? 0) > 0)

  return (
    <div className="space-y-8">
      {nonEmpty.map(gk => {
        const gModels = groups.get(gk)!
        const preview = gModels.slice(0, 8)   // показываем до 8 моделей с фото
        const rest    = gModels.length - preview.length

        return (
          <div key={gk}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                {t(GROUP_LABELS[gk])}
              </span>
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-[10px] text-white/20 font-mono">{gModels.length}</span>
            </div>

            {/* Cards grid с изображениями 3/4 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {preview.map(model => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>

            {/* "Show more" if truncated */}
            {rest > 0 && (
              <Link href={`/brand/${slug}/models`}
                className="block mt-3 text-center text-xs text-white/30 hover:text-primary/70
                  transition-colors py-1.5 rounded-lg border border-white/5 hover:border-primary/20">
                + {rest} {t('brand.showMore', { count: rest })}
              </Link>
            )}
          </div>
        )
      })}

      {/* View all button */}
      <Link href={`/brand/${slug}/models`}>
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/8
          hover:border-primary/25 text-white/40 hover:text-primary/80 transition-all text-sm
          hover:bg-primary/4 cursor-pointer">
          <Car className="w-4 h-4" />
          {t('brand.viewAllModels', { count: models.length })}
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>
    </div>
  )
}
