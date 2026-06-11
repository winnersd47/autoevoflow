"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Cpu,
  Network,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Car,
  BarChart3,
  Globe,
  ChevronRight,
  Zap,
  Brain,
  Database,
  Search,
  Compass,
  GitBranch,
  Lightbulb,
  Check,
  Star,
  Crown,
  ChevronDown,
  Quote,
  Shield,
  RefreshCw,
  Mail,
} from "lucide-react";
import { usePlatformStats } from "@/lib/api";
import type { PlatformStats } from "@/lib/types";
import { useLocale } from "@/contexts/LocaleContext";
import dynamic from "next/dynamic";
import { AppMark as AppLogoMark } from "@/components/ui/AppLogo";

const CarScene = dynamic(() => import("@/components/three/CarScene"), { ssr: false });

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 2000, bounce: 0 });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(target);
  }, [inView, target, motionVal]);

  useEffect(() => spring.on("change", (v) => setDisplayed(Math.round(v))), [spring]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl font-bold text-primary counter-display">
        {displayed.toLocaleString()}
        {suffix}
      </div>
      <div className="text-text-secondary text-sm mt-1">{label}</div>
    </div>
  );
}

// ─── Stat Fallback ────────────────────────────────────────────────────────────

const DEMO_STATS: PlatformStats = {
  totalBrands: 142,
  totalModels: 3_847,
  totalGenerations: 18_230,
  totalImages: 94_560,
  totalAnalyses: 7_812,
  evolutionConnections: 42_180,
  countriesRepresented: 38,
  yearRange: [1886, 2026],
  lastUpdated: new Date().toISOString(),
};

// ─── Featured Cards are built inside HomePage using t() ──────────────────────

// ─── Tech Stack ───────────────────────────────────────────────────────────────

const TECH_STACK = [
  { icon: Brain, label: "CLIP", desc: "Vision-Language Embeddings", color: "text-primary" },
  { icon: Sparkles, label: "DINOv2", desc: "Self-Supervised Vision", color: "text-gold" },
  { icon: Database, label: "Neo4j", desc: "Graph Database", color: "text-success" },
  { icon: Network, label: "pgvector", desc: "Vector Similarity", color: "text-purple-400" },
  { icon: Cpu, label: "GPT-4o", desc: "AI Analysis", color: "text-orange-400" },
  { icon: Globe, label: "FastAPI", desc: "High-Performance API", color: "text-pink-400" },
];

// ─── Brand Logos (placeholder grid) ──────────────────────────────────────────

const BRANDS = [
  "BMW", "Mercedes", "Audi", "Porsche", "Ferrari", "Lamborghini",
  "Toyota", "Honda", "Nissan", "Mazda", "Subaru", "Lexus",
  "Ford", "Chevrolet", "Dodge", "Cadillac", "Tesla", "Rivian",
  "Volkswagen", "Skoda", "Seat", "Peugeot", "Renault", "Citroën",
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data: stats } = usePlatformStats();
  const displayStats = stats ?? DEMO_STATS;
  const { t, locale } = useLocale();

  const FEATURED_STORIES = [
    {
      id: "bmw-3-series",
      title: t("home.story1Title"),
      subtitle: t("home.story1Sub"),
      desc: t("home.story1Desc"),
      tag: t("home.story1Tag"),
      color: "from-blue-500/20 to-primary/10",
      border: "border-primary/30",
      year: t("home.story1Year"),
    },
    {
      id: "porsche-911",
      title: t("home.story2Title"),
      subtitle: t("home.story2Sub"),
      desc: t("home.story2Desc"),
      tag: t("home.story2Tag"),
      color: "from-gold/20 to-warning/10",
      border: "border-gold/30",
      year: t("home.story2Year"),
    },
    {
      id: "honda-civic",
      title: t("home.story3Title"),
      subtitle: t("home.story3Sub"),
      desc: t("home.story3Desc"),
      tag: t("home.story3Tag"),
      color: "from-success/20 to-emerald-500/10",
      border: "border-success/30",
      year: t("home.story3Year"),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <div className="relative">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0">
          <CarScene />
        </div>

        {/* Radial overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background z-[1]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[1]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            <motion.div variants={itemVariants}>
              <span className="section-label mb-4 block">{t("home.badge")}</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-display text-6xl md:text-8xl font-black leading-none tracking-tight mb-6"
            >
              <span className="gradient-text-primary">AutoEvoFlow</span>
              <br />
              <span className="text-text-primary">AI Platform</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-text-secondary text-xl leading-relaxed max-w-xl mb-10"
            >
              {t("home.heroText")}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
              <Link href="/search" className="btn-primary text-base px-8 py-4">
                <Search className="w-5 h-5" />
                {t("home.startExploring")}
              </Link>
              <Link href="/evolution" className="btn-secondary text-base px-8 py-4">
                <Network className="w-5 h-5" />
                {t("home.evolutionGraph")}
              </Link>
            </motion.div>
          </motion.div>
        </div>

      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8"
          >
            <AnimatedCounter target={displayStats.totalBrands} label={t("home.statBrands")} />
            <AnimatedCounter target={displayStats.totalModels} label={t("home.statModels")} />
            <AnimatedCounter target={displayStats.totalGenerations} label={t("home.statGenerations")} />
            <AnimatedCounter target={displayStats.totalImages} label={t("home.statImages")} suffix="+" />
            <AnimatedCounter target={displayStats.evolutionConnections} label={t("home.statLinks")} />
            <AnimatedCounter target={displayStats.totalAnalyses} label={t("home.statAnalyses")} />
          </motion.div>
        </div>
      </section>

      {/* ── Featured Evolution Stories ────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <span className="section-label block mb-3">{t("home.featuredBadge")}</span>
            <h2 className="section-heading text-4xl">{t("home.featuredHeading")}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURED_STORIES.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              >
                <Link href={`/model/${story.id}`} className="block group">
                  <div
                    className={`relative p-6 rounded-2xl bg-gradient-to-br ${story.color} border ${story.border}
                    backdrop-blur-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-card-hover
                    overflow-hidden`}
                  >
                    {/* Year badge */}
                    <div className="absolute top-4 right-4 text-xs text-text-muted font-mono">{story.year}</div>

                    {/* Glint effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                      bg-gradient-to-br from-white/5 via-transparent to-transparent" />

                    <span className="badge-surface mb-4 inline-flex">{story.tag}</span>
                    <h3 className="font-display text-xl font-bold text-text-primary mb-1">{story.title}</h3>
                    <p className="text-primary text-sm font-semibold mb-3">{story.subtitle}</p>
                    <p className="text-text-secondary text-sm leading-relaxed">{story.desc}</p>

                    <div className="flex items-center gap-2 mt-5 text-primary text-sm font-medium">
                      {t("home.exploreLineage")}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand Universe ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-surface/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="section-label block mb-3">{t("home.brandsBadge")}</span>
            <h2 className="section-heading text-4xl mb-4">{t("home.brandsHeading")}</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              {t("home.brandsDesc")}
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3"
          >
            {BRANDS.map((brand, i) => (
              <motion.div
                key={brand}
                variants={itemVariants}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/brand/${brand.toLowerCase()}`}>
                  <div className="group aspect-square rounded-xl glass border border-border flex items-center justify-center
                    transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-glow-sm
                    cursor-pointer">
                    <span className="text-xs font-display font-semibold text-text-muted group-hover:text-primary transition-colors">
                      {brand}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-8">
            <Link href="/brands" className="btn-ghost">
              {t("home.viewAllBrands", { count: displayStats.totalBrands })}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Technology Section ────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="section-label block mb-3">{t("home.techBadge")}</span>
            <h2 className="section-heading text-4xl mb-4">{t("home.techHeading")}</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              {t("home.techDesc")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH_STACK.map((tech, i) => (
              <motion.div
                key={tech.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="glass rounded-xl p-5 border border-border hover:border-primary/30 transition-all duration-300 group"
              >
                <tech.icon className={`w-8 h-8 ${tech.color} mb-3 group-hover:scale-110 transition-transform`} />
                <h3 className="font-display text-base font-bold text-text-primary mb-1">{tech.label}</h3>
                <p className="text-text-muted text-sm">{tech.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-primary rounded-3xl p-12 border border-primary/20">
              <Zap className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="font-display text-4xl font-bold text-text-primary mb-4">
                {t("home.ctaHeading")}
              </h2>
              <p className="text-text-secondary text-lg mb-8">
                {t("home.ctaDesc")}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/search" className="btn-primary text-base px-8 py-4">
                  <Search className="w-5 h-5" />
                  {t("home.aiSearch")}
                </Link>
                <Link href="/compare" className="btn-secondary text-base px-8 py-4">
                  <BarChart3 className="w-5 h-5" />
                  {t("home.compareGenerations")}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Live Graph Demo ───────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="section-label block mb-3">{t('home.graphBadge')}</span>
            <h2 className="section-heading text-4xl mb-4">{t('home.graphHeading')}</h2>
            <p className="text-text-secondary max-w-xl mx-auto">{t('home.graphDesc')}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="glass-primary rounded-3xl border border-primary/30 p-10 flex flex-col items-center gap-6
              shadow-[0_0_60px_rgba(0,212,255,0.08)]">
              <Network className="w-20 h-20 text-primary opacity-80" />
              <div className="flex items-center gap-6 text-center">
                <div>
                  <p className="font-display text-3xl font-bold text-primary">322</p>
                  <p className="text-xs text-text-muted mt-1">{t('home.graphNodes')}</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="font-display text-3xl font-bold text-primary">383</p>
                  <p className="text-xs text-text-muted mt-1">{t('home.graphEdges')}</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="font-display text-3xl font-bold text-primary">11</p>
                  <p className="text-xs text-text-muted mt-1">{t('home.graphBrands')}</p>
                </div>
              </div>
              <Link href="/evolution" className="btn-primary text-base px-8 py-4">
                <Network className="w-5 h-5" />
                {t('home.graphOpen')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="section-label block mb-3">{t('home.howBadge')}</span>
            <h2 className="section-heading text-4xl">{t('home.howHeading')}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Compass, title: t('home.howStep1Title'), desc: t('home.howStep1Desc') },
              { step: '02', icon: GitBranch, title: t('home.howStep2Title'), desc: t('home.howStep2Desc') },
              { step: '03', icon: Lightbulb, title: t('home.howStep3Title'), desc: t('home.howStep3Desc') },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="glass rounded-2xl border border-border p-7 relative group
                  hover:border-primary/30 transition-all duration-300"
              >
                <span className="absolute top-5 right-5 font-mono text-4xl font-black text-white/5 group-hover:text-primary/10 transition-colors">
                  {item.step}
                </span>
                <item.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-display text-xl font-bold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample Analysis ───────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-surface/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="section-label block mb-3">{t('home.analysisBadge')}</span>
            <h2 className="section-heading text-4xl">{t('home.analysisBadge')}</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="glass-primary rounded-3xl border border-primary/20 p-8 md:p-10">
              <div className="flex items-start gap-4 mb-6">
                <Brain className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-2">Ferrari · Design DNA Analysis</p>
                  <h3 className="font-display text-2xl font-bold text-text-primary leading-tight">
                    {t('home.analysisHeadline')}
                  </h3>
                </div>
              </div>
              <p className="text-text-secondary leading-relaxed mb-6 text-sm">
                Across eight decades, Ferrari has continuously redefined what it means to build the ideal sports car — while desperately trying to preserve the soul that made the F40 transcend mere machinery. The tension between raw mechanical purity and modern hybrid complexity defines the brand's contemporary identity crisis.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {[t('home.analysisInsight1'), t('home.analysisInsight2'), t('home.analysisInsight3')].map(tag => (
                  <span key={tag} className="badge-primary text-xs">{tag}</span>
                ))}
              </div>
              <Link href="/brand/ferrari" className="btn-primary">
                <Sparkles className="w-4 h-4" />
                {t('home.analysisLink')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="section-label block mb-3">{t('home.pricingBadge')}</span>
            <h2 className="section-heading text-4xl mb-4">{t('home.pricingHeading')}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: t('home.pricingFreeTitle'), price: t('home.pricingFreePrice'), icon: Star, color: 'border-border',
                period: t('home.pricingFreePeriod'),
                features: [
                  t('home.graphBadge') + ' (322 ' + t('home.graphNodes').toLowerCase() + ')',
                  t('home.statModels') + ' 180+',
                  'AI ' + t('home.statAnalyses') + ' (7 ' + t('nav.brands').toLowerCase() + ')',
                ],
                cta: t('home.pricingFreeCta'), ctaHref: '/register', ctaClass: 'btn-secondary w-full justify-center',
              },
              {
                name: t('home.pricingProTitle'), price: t('home.pricingProPrice'), sub: t('home.pricingPaidPeriod'), icon: Zap, color: 'border-primary/40', highlight: true,
                badge: t('home.pricingMostPopular'),
                features: [
                  'Visual Search (CLIP)',
                  'AI ' + t('home.statAnalyses').toLowerCase() + ' ' + (locale === 'ru' ? 'по запросу' : 'on demand'),
                  locale === 'ru' ? 'Экспорт графа JSON / PNG' : 'Graph export JSON / PNG',
                ],
                cta: t('home.pricingProCta'), ctaHref: '/dashboard/store', ctaClass: 'btn-primary w-full justify-center',
              },
              {
                name: t('home.pricingPremiumTitle'), price: t('home.pricingPremiumPrice'), sub: t('home.pricingPaidPeriod'), icon: Crown, color: 'border-gold/40',
                features: [
                  'Pro +',
                  'REST API',
                  locale === 'ru' ? 'Виджеты + встраивание' : 'Embeds + widgets',
                ],
                cta: t('home.pricingPremiumCta'), ctaHref: '/dashboard/store', ctaClass: 'w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30 transition-all flex items-center gap-2',
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`glass rounded-2xl border ${plan.color} p-7 flex flex-col
                  ${plan.highlight ? 'ring-1 ring-primary/30 shadow-[0_0_32px_rgba(0,212,255,0.1)]' : ''}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <plan.icon className={`w-5 h-5 ${plan.highlight ? 'text-primary' : plan.name === 'Premium' ? 'text-gold' : 'text-text-muted'}`} />
                    <span className="font-display font-bold text-text-primary">{plan.name}</span>
                  </div>
                  {plan.badge && <span className="badge-primary text-[10px]">{plan.badge}</span>}
                </div>
                <div className="mb-6">
                  <span className="font-display text-3xl font-black text-text-primary">{plan.price}</span>
                  {plan.sub && <span className="text-text-muted text-sm">{plan.sub}</span>}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.ctaHref} className={plan.ctaClass}>{plan.cta}</Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="section-label block mb-3">{t('home.testimonialsBadge')}</span>
            <h2 className="section-heading text-4xl">{t('home.testimonialsHeading')}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: t('home.testimonial1Text'), author: t('home.testimonial1Author'), role: t('home.testimonial1Role') },
              { text: t('home.testimonial2Text'), author: t('home.testimonial2Author'), role: t('home.testimonial2Role') },
              { text: t('home.testimonial3Text'), author: t('home.testimonial3Author'), role: t('home.testimonial3Role') },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="glass rounded-2xl border border-border p-6 flex flex-col"
              >
                <Quote className="w-6 h-6 text-primary/40 mb-4" />
                <p className="text-text-secondary text-sm leading-relaxed flex-1 italic">&ldquo;{item.text}&rdquo;</p>
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-sm font-semibold text-text-primary">{item.author}</p>
                  <p className="text-xs text-text-muted">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <FAQSection t={t} />

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <AppLogoMark />
                <span className="font-display font-black text-lg text-text-primary tracking-tight">
                  AutoEvo<span className="text-primary">Flow</span>
                </span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed max-w-xs">
                The world&apos;s first automotive evolution intelligence platform. Explore 80+ years of design history through AI.
              </p>
            </div>
            {/* Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">{t('home.footerLinks')}</p>
              <div className="space-y-2">
                {[[t('nav.brands'), '/brands'], [t('nav.evolution'), '/evolution'], [t('nav.compare'), '/compare'], [t('nav.search'), '/search']].map(([label, href]) => (
                  <Link key={href} href={href} className="block text-sm text-text-secondary hover:text-primary transition-colors">{label}</Link>
                ))}
              </div>
            </div>
            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">{t('home.footerLegal')}</p>
              <div className="space-y-2">
                {[[t('home.footerTerms'), '/terms'], [t('home.footerPrivacy'), '/privacy']].map(([label, href]) => (
                  <Link key={href} href={href} className="block text-sm text-text-secondary hover:text-primary transition-colors">{label}</Link>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/register" className="btn-primary text-sm">
                  {t('home.pricingFreeCta')}
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <span>{t('home.footerCopyright')}</span>
            <span>{t('home.footerPowered')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────────────

function FAQSection({ t }: { t: (key: string) => string }) {
  const [open, setOpen] = useState<number | null>(null)
  const faqItems = [
    { q: t('home.faqQ1'), a: t('home.faqA1') },
    { q: t('home.faqQ2'), a: t('home.faqA2') },
    { q: t('home.faqQ3'), a: t('home.faqA3') },
    { q: t('home.faqQ4'), a: t('home.faqA4') },
    { q: t('home.faqQ5'), a: t('home.faqA5') },
    { q: t('home.faqQ6'), a: t('home.faqA6') },
  ]
  return (
    <section className="relative z-10 py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="section-label block mb-3">{t('home.faqBadge')}</span>
          <h2 className="section-heading text-4xl">{t('home.faqHeading')}</h2>
        </motion.div>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-sm font-semibold text-text-primary pr-4">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm text-text-secondary leading-relaxed border-t border-border pt-4">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
