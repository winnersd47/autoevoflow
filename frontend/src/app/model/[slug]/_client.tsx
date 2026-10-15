"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, Network, BarChart3, Layers, Info } from "lucide-react";
import { useModel, useModelGenerations, useModelEvolution, useAnalysis } from "@/lib/api";
import { useDemoModel } from "@/lib/demo-data";
import { useLocale } from "@/contexts/LocaleContext";
import Timeline from "@/components/ui/Timeline";
import AIAnalysisPanel from "@/components/ui/AIAnalysisPanel";
import GenerationCard from "@/components/ui/GenerationCard";
import WallpaperGallery from "@/components/ui/WallpaperGallery";
import dynamic from "next/dynamic";

const EvolutionGraph = dynamic(() => import("@/components/graph/EvolutionGraph"), { ssr: false });

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabId = "timeline" | "graph" | "gallery" | "analysis";

// ─── Spec Table ───────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-text-muted text-sm">{label}</span>
      <span className="text-text-primary text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ModelPageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-56 skeleton rounded-none" />
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModelPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>("timeline");

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "timeline", label: t("model.tabTimeline"), icon: Layers },
    { id: "graph",    label: t("model.tabGraph"),    icon: Network },
    { id: "gallery",  label: t("model.tabGallery"),  icon: BarChart3 },
    { id: "analysis", label: t("model.tabAnalysis"), icon: Info },
  ];

  const { data: apiModel, isLoading } = useModel(slug);
  const { data: apiGenerations } = useModelGenerations(slug);
  const { data: evolutionGraph } = useModelEvolution(slug);
  const { data: apiAnalysis } = useAnalysis("model", slug, "design_evolution", { enabled: !!slug });

  // Fallback to scraped static JSON when backend is unavailable
  const { data: demoData, loading: demoLoading } = useDemoModel(slug);
  const model       = apiModel       ?? demoData?.model;
  const generations = apiGenerations ?? demoData?.generations ?? [];
  const analysis    = apiAnalysis    ?? demoData?.analysis;

  if (isLoading || demoLoading) return <ModelPageSkeleton />;

  if (!model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-12 border border-danger/30 text-center">
          <h2 className="font-display text-2xl font-bold text-danger mb-3">{t("model.notFound")}</h2>
          <Link href="/brands" className="btn-secondary">{t("model.browseAll")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative py-16 border-b border-border bg-surface/30"
      >
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
            <Link href="/" className="hover:text-primary transition-colors">{t("model.home")}</Link>
            <ChevronLeft className="w-3 h-3 rotate-180" />
            {model.brand && (
              <>
                <Link href={`/brand/${model.brand.slug}`} className="hover:text-primary transition-colors">
                  {model.brand.name}
                </Link>
                <ChevronLeft className="w-3 h-3 rotate-180" />
              </>
            )}
            <span className="text-text-primary">{model.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge-primary">{model.bodyType}</span>
                <span className="badge-surface">{model.segment}</span>
                {!model.isActive && <span className="badge-surface opacity-60">{t("model.discontinued")}</span>}
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-black text-text-primary">
                {model.brand?.name && (
                  <span className="text-primary">{model.brand.name} </span>
                )}
                {model.name}
              </h1>
              <p className="text-text-secondary mt-3 max-w-2xl">{model.description}</p>
            </div>

            <div className="flex gap-4 text-center">
              <div>
                <div className="font-display text-3xl font-bold text-primary">
                  {model.startYear}
                </div>
                <div className="text-xs text-text-muted">{t("model.introduced")}</div>
              </div>
              {model.endYear && (
                <div>
                  <div className="font-display text-3xl font-bold text-gold">
                    {model.endYear}
                  </div>
                  <div className="text-xs text-text-muted">{t("model.ended")}</div>
                </div>
              )}
              <div>
                <div className="font-display text-3xl font-bold text-success">
                  {model.generationCount}
                </div>
                <div className="text-xs text-text-muted">{t("model.generationsLabel")}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* Timeline Tab */}
            {activeTab === "timeline" && generations && (
              <Timeline
                generations={generations}
                orientation="horizontal"
                modelSlug={model?.slug}
              />
            )}

            {/* Evolution Graph Tab */}
            {activeTab === "graph" && (
              <div className="glass rounded-2xl border border-border overflow-hidden" style={{ height: 560 }}>
                {evolutionGraph ? (
                  <EvolutionGraph data={evolutionGraph} />
                ) : (
                  <div className="flex items-center justify-center h-full text-text-muted">
                    <div className="text-center">
                      <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{t("model.noGraph")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gallery Tab */}
            {activeTab === "gallery" && generations && (
              <WallpaperGallery generations={generations} />
            )}

            {/* AI Analysis Tab */}
            {activeTab === "analysis" && (
              <div className="max-w-3xl">
                {analysis ? (
                  <AIAnalysisPanel analysis={analysis} />
                ) : (
                  <div className="glass rounded-2xl p-12 border border-border text-center text-text-muted">
                    <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t("model.noAnalysis")}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
