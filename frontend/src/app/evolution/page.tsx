"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Network, GitBranch, Clock, Filter, Download,
  ToggleLeft, ToggleRight, X, Search, Info, LayoutGrid, TableProperties, GitFork, AlignLeft,
  Sparkles, MousePointer2, Layers3, SlidersHorizontal, ArrowRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { EvolutionEdgeType, GraphLayoutType, GraphNode, GraphEdge } from "@/lib/types";
import { getEdgeColor } from "@/lib/graph-utils";
import { useLocale } from "@/contexts/LocaleContext";

const EvolutionGraph = dynamic(() => import("@/components/graph/EvolutionGraph"), { ssr: false });

// ─── Filter options ───────────────────────────────────────────────────────────

const BRANDS = [
  // ── European ─────────────────────────────────────────────────────────────
  { id: "bmw",         name: "BMW",          color: "#00d4ff" },
  { id: "mercedes",    name: "Mercedes-Benz",color: "#c0c0c0" },
  { id: "audi",        name: "Audi",         color: "#bb0a1e" },
  { id: "volkswagen",  name: "Volkswagen",   color: "#001e50" },
  { id: "porsche",     name: "Porsche",      color: "#ffd700" },
  { id: "ferrari",     name: "Ferrari",      color: "#ff2800" },
  { id: "lamborghini", name: "Lamborghini",  color: "#e6b800" },
  { id: "mclaren",     name: "McLaren",      color: "#FF8000" },
  { id: "astonmartin", name: "Aston Martin", color: "#006A4E" },
  { id: "bugatti",     name: "Bugatti",      color: "#6B0AC9" },
  { id: "pagani",      name: "Pagani",       color: "#8B7355" },
  { id: "koenigsegg",  name: "Koenigsegg",   color: "#FFD700" },
  { id: "rimac",       name: "Rimac",        color: "#00CFFF" },
  { id: "seat",        name: "SEAT",         color: "#fa0000" },
  { id: "skoda",       name: "Škoda",        color: "#4ba82e" },
  { id: "lotus",       name: "Lotus",        color: "#c8e228" },
  { id: "maserati",    name: "Maserati",     color: "#1a4fc4" },
  { id: "rolls-royce", name: "Rolls-Royce",  color: "#68217a" },
  { id: "bentley",     name: "Bentley",      color: "#0a4d2c" },
  { id: "gordon-murray", name: "Gordon Murray", color: "#0e8a7d" },
  { id: "zenvo",       name: "Zenvo",        color: "#a4161a" },
  { id: "de-tomaso",   name: "De Tomaso",    color: "#c08a3e" },
  { id: "morgan",      name: "Morgan",       color: "#2e5e1e" },
  { id: "tvr",         name: "TVR",          color: "#4a6fa5" },
  { id: "caterham",    name: "Caterham",     color: "#8ab500" },
  { id: "pininfarina", name: "Pininfarina",  color: "#5d6d8a" },
  { id: "hispano-suiza", name: "Hispano Suiza", color: "#147a8c" },
  // ── American ─────────────────────────────────────────────────────────────
  { id: "hennessey",   name: "Hennessey",    color: "#b33000" },
  { id: "ssc",         name: "SSC",          color: "#5b7a8c" },
  { id: "saleen",      name: "Saleen",       color: "#e08a00" },
  // ── Japanese ─────────────────────────────────────────────────────────────
  { id: "toyota",      name: "Toyota",       color: "#eb0a1e" },
  { id: "lexus",       name: "Lexus",        color: "#8B6914" },
  { id: "honda",       name: "Honda",        color: "#cc0000" },
  { id: "nissan",      name: "Nissan",       color: "#c3002f" },
  { id: "mazda",       name: "Mazda",        color: "#910f22" },
  { id: "subaru",      name: "Subaru",       color: "#003399" },
  { id: "aspark",      name: "Aspark",       color: "#6f5acf" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function EvolutionPageInner() {
  const { t, locale } = useLocale();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isRu = locale === 'ru';

  // ── Read initial state from URL params ────────────────────────────────
  const initLayout    = (searchParams.get('layout') ?? 'cola') as GraphLayoutType;
  const initBrands    = new Set(searchParams.get('brands')?.split(',').filter(Boolean) ?? []);
  const initYearMin   = parseInt(searchParams.get('ymin') ?? '1935');
  const initYearMax   = parseInt(searchParams.get('ymax') ?? '2030');
  const initLabels    = searchParams.get('labels') !== '0';
  const initConcepts  = searchParams.get('concepts') !== '0';
  const initCross     = searchParams.get('cross') !== '0';
  type NodeFilter = 'all' | 'base' | 'facelifts' | 'variants'
  const initNodeFilter = (searchParams.get('nf') ?? 'all') as NodeFilter;

  const [layout, setLayoutState]        = useState<GraphLayoutType>(initLayout);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [showLabels, setShowLabelsState]   = useState(initLabels);
  const [showConcepts, setShowConceptsState] = useState(initConcepts);
  const [crossBrand, setCrossBrandState]  = useState(initCross);
  const [nodeFilter, setNodeFilterState]  = useState<NodeFilter>(initNodeFilter);
  const [yearMin, setYearMinState]        = useState(initYearMin);
  const [yearMax, setYearMaxState]        = useState(initYearMax);
  const [activeBrands, setActiveBrandsState] = useState<Set<string>>(initBrands);
  const [search, setSearch]               = useState(searchParams.get('q') ?? "");
  const [selectedNode, setSelectedNode]   = useState<GraphNode | null>(null);
  const [legendOpen, setLegendOpen]       = useState(false);

  // Welcome screen: show on first visit (not dismissed before)
  const [showWelcome, setShowWelcome]   = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasParams = !!searchParams.get('layout') || !!searchParams.get('brands');
    return !hasParams && !sessionStorage.getItem('evo_welcomed');
  });

  // Graph only loads when user has explicitly selected a brand
  // URL must have 'brands' param — navigation from other pages always starts empty
  const [graphReady, setGraphReady] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!searchParams.get('brands');
  });

  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(true);

  useEffect(() => {
    fetch('/data/evolution/graph.json')
      .then(r => r.json())
      .then(d => { setGraphData(d); setGraphLoading(false); })
      .catch(() => setGraphLoading(false));
  }, []);

  // ── Sync URL params whenever filters change ───────────────────────────
  const syncUrl = useCallback((
    l: GraphLayoutType, brands: Set<string>, yMin: number, yMax: number,
    labels: boolean, concepts: boolean, cross: boolean, q: string
  ) => {
    const p = new URLSearchParams();
    if (l !== 'cola')          p.set('layout', l);
    if (brands.size > 0)       p.set('brands', [...brands].join(','));
    if (yMin !== 1935)         p.set('ymin', String(yMin));
    if (yMax !== 2030)         p.set('ymax', String(yMax));
    if (!labels)               p.set('labels', '0');
    if (!concepts)             p.set('concepts', '0');
    if (!cross)                p.set('cross', '0');
    if (q.trim())              p.set('q', q);
    const qs = p.toString();
    router.replace(`/evolution${qs ? '?' + qs : ''}`, { scroll: false });
  }, [router]);

  // ── Wrapped setters that also update URL ──────────────────────────────
  const setLayout = (l: GraphLayoutType) => {
    setLayoutState(l);
    syncUrl(l, activeBrands, yearMin, yearMax, showLabels, showConcepts, crossBrand, search);
  };
  const setActiveBrands = (fn: (prev: Set<string>) => Set<string>) => {
    setActiveBrandsState(prev => {
      const next = fn(prev);
      syncUrl(layout, next, yearMin, yearMax, showLabels, showConcepts, crossBrand, search);
      return next;
    });
  };
  const setYearMin = (v: number) => { setYearMinState(v); syncUrl(layout, activeBrands, v, yearMax, showLabels, showConcepts, crossBrand, search); };
  const setYearMax = (v: number) => { setYearMaxState(v); syncUrl(layout, activeBrands, yearMin, v, showLabels, showConcepts, crossBrand, search); };
  const setShowLabels   = (v: boolean) => { setShowLabelsState(v);   syncUrl(layout, activeBrands, yearMin, yearMax, v, showConcepts, crossBrand, search); };
  const setShowConcepts = (v: boolean) => { setShowConceptsState(v); syncUrl(layout, activeBrands, yearMin, yearMax, showLabels, v, crossBrand, search); };
  const setCrossBrand   = (v: boolean) => { setCrossBrandState(v);   syncUrl(layout, activeBrands, yearMin, yearMax, showLabels, showConcepts, v, search); };
  const setNodeFilter   = (v: NodeFilter) => { setNodeFilterState(v); };

  const dismissWelcome = () => {
    sessionStorage.setItem('evo_welcomed', '1');
    setShowWelcome(false);
    // Don't set graphReady here — user must select a brand first
    // setGraphReady(true) will be called when first brand is selected
  };

  // ── Translated option arrays (must be inside component) ────────────────
  const EDGE_TYPES: { type: EvolutionEdgeType; label: string; desc: string }[] = [
    { type: "evolves_into",          label: t("evolution.edgeEvolvesInto"),    desc: t("evolution.edgeEvolvesDesc") },
    { type: "influenced_by",         label: t("evolution.edgeInfluencedBy"),   desc: t("evolution.edgeInfluencedDesc") },
    { type: "shares_platform",       label: t("evolution.edgeSharesPlatform"), desc: t("evolution.edgeSharesDesc") },
    { type: "derived_from",          label: t("evolution.edgeDerivedFrom"),    desc: t("evolution.edgeDerivedDesc") },
    { type: "concept_to_production", label: t("evolution.edgeConcept"),        desc: t("evolution.edgeConceptDesc") },
    { type: "variant_of",            label: t("evolution.edgeVariantOf"),      desc: t("evolution.edgeVariantDesc") },
  ];

  // Sorted simple → complex:
  // 1. Форсаж  — физика без структуры (просто запустить)
  // 2. Силуэт  — тип кузова, статичные зоны
  // 3. Синхрон — дорожки брендов × ось лет
  // 4. Хроника — колонки семейств × вертикальная ось времени
  // 5. Развилка — дерево эволюции с глубиной поколений
  const LAYOUTS: { id: GraphLayoutType; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "cola", label: t("evolution.layoutForce"), icon: Network,         desc: t("evolution.layoutForceDesc") },
    { id: "zone", label: t("evolution.layoutZone"),  icon: LayoutGrid,      desc: t("evolution.layoutZoneDesc") },
    { id: "sync", label: t("evolution.layoutSync"),  icon: AlignLeft,       desc: t("evolution.layoutSyncDesc") },
    { id: "eras", label: t("evolution.layoutEras"),  icon: TableProperties, desc: t("evolution.layoutErasDesc") },
    { id: "fork", label: t("evolution.layoutFork"),  icon: GitFork,         desc: t("evolution.layoutForkDesc") },
  ];

  const DISPLAY_TOGGLES = [
    { label: t("evolution.nodeLabels"),      val: showLabels,   set: setShowLabels },
    { label: t("evolution.conceptCars"),     val: showConcepts, set: setShowConcepts },
    { label: t("evolution.crossBrandEdges"), val: crossBrand,   set: setCrossBrand },
  ];

  // ── Info panel text (split at placeholder for span injection) ──────────
  const infoBodyParts = t("evolution.infoBody").split("{node}");
  const infoNoteParts = t("evolution.infoNote").split("{goldDiamonds}");

  // ── Filtered graph ──────────────────────────────────────────────────────
  const { nodes, edges } = useMemo(() => {
    let nodes = graphData.nodes;

    if (!showConcepts) nodes = nodes.filter((n) => !n.isConcept);
    if (yearMin || yearMax) nodes = nodes.filter((n) => (n.year ?? 0) >= yearMin && (n.year ?? 9999) <= yearMax);
    if (activeBrands.size > 0) nodes = nodes.filter((n) => activeBrands.has(n.brandId ?? ""));
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(
        (n) => n.label.toLowerCase().includes(q) || (n.codeName ?? "").toLowerCase().includes(q)
      );
    }

    // ── Node type filter ──────────────────────────────────────────────────
    if (nodeFilter !== 'all') {
      const allEdges = graphData.edges;
      // Sets of node IDs that are facelift targets or variant targets
      const flTargets  = new Set(allEdges.filter(e => e.type === 'facelifted_to').map(e => e.target));
      const varTargets = new Set(allEdges.filter(e => e.type === 'variant_of').map(e => e.target));

      if (nodeFilter === 'base') {
        // Only nodes that are neither a facelift nor a modification
        nodes = nodes.filter(n => !flTargets.has(n.id) && !varTargets.has(n.id));
      } else if (nodeFilter === 'facelifts') {
        // Base models + their facelifts (exclude pure modifications)
        const flSources = new Set(allEdges.filter(e => e.type === 'facelifted_to').map(e => e.source));
        nodes = nodes.filter(n => !varTargets.has(n.id) || flTargets.has(n.id));
        // Keep: not a modification target OR is a facelift target, plus facelift sources
        nodes = nodes.filter(n => flTargets.has(n.id) || flSources.has(n.id) || (!varTargets.has(n.id) && !flTargets.has(n.id)));
      } else if (nodeFilter === 'variants') {
        // Base models + their modifications (exclude facelifts)
        const varSources = new Set(allEdges.filter(e => e.type === 'variant_of').map(e => e.source));
        nodes = nodes.filter(n => varTargets.has(n.id) || varSources.has(n.id) || (!varTargets.has(n.id) && !flTargets.has(n.id)));
      }
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    let edges = graphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    if (!crossBrand) {
      edges = edges.filter((e) => {
        const src = graphData.nodes.find((n) => n.id === e.source);
        const tgt = graphData.nodes.find((n) => n.id === e.target);
        return src?.brandId === tgt?.brandId;
      });
    }

    return { nodes, edges };
  }, [graphData, showConcepts, yearMin, yearMax, activeBrands, crossBrand, search, nodeFilter]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const toggleBrand = (id: string) => {
    setGraphReady(true);  // first brand selection activates the graph
    setActiveBrands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (graphLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-text-muted">{isRu ? 'Загрузка графа…' : 'Loading graph data…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background relative">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="w-72 shrink-0 border-r border-border bg-surface/95 backdrop-blur-xl overflow-y-auto z-20 flex flex-col"
          >
            <div className="p-4 space-y-5 flex-1">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-text-primary">
                    {t("evolution.graphControls")}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t("evolution.nodeEdgeCount", { nodes: nodes.length, edges: edges.length })}
                  </p>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search nodes…"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                />
              </div>

              {/* Layout */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                  {t("evolution.layout")}
                </p>
                <div className="space-y-1">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
                        ${layout === l.id ? "bg-primary/15 border border-primary/30 text-primary" : "text-text-secondary hover:bg-white/5 border border-transparent"}`}
                    >
                      <l.icon className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{l.label}</div>
                        <div className="text-[10px] text-text-muted">{l.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Node type filter */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                  {isRu ? 'Тип узлов' : 'Node type'}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { id: 'all',      labelRu: 'Все',          labelEn: 'All'         },
                    { id: 'base',     labelRu: 'Базовые',      labelEn: 'Base only'   },
                    { id: 'facelifts',labelRu: 'Фейслифты',   labelEn: 'Facelifts'   },
                    { id: 'variants', labelRu: 'Модификации',  labelEn: 'Variants'    },
                  ] as { id: NodeFilter; labelRu: string; labelEn: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setNodeFilter(opt.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-center
                        ${nodeFilter === opt.id
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'border-border text-text-muted hover:border-white/20 hover:text-text-secondary'}`}
                    >
                      {isRu ? opt.labelRu : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                  {t("evolution.display")}
                </p>
                <div className="space-y-1">
                  {DISPLAY_TOGGLES.map(({ label, val, set }) => (
                    <button
                      key={label}
                      onClick={() => set((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm text-text-secondary">{label}</span>
                      {val
                        ? <ToggleRight className="w-5 h-5 text-primary" />
                        : <ToggleLeft  className="w-5 h-5 text-text-muted" />
                      }
                    </button>
                  ))}
                </div>
              </div>

              {/* Year range */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                  {t("evolution.yearRange")}
                </p>
                <div className="flex items-center gap-2">
                  <input type="number" value={yearMin} onChange={(e) => setYearMin(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-border text-sm text-center text-text-primary focus:outline-none" min={1886} max={2030} />
                  <div className="flex-1 h-px bg-border" />
                  <input type="number" value={yearMax} onChange={(e) => setYearMax(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-border text-sm text-center text-text-primary focus:outline-none" min={1886} max={2030} />
                </div>
              </div>

              {/* Brand filter */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                  {t("evolution.brandsLabel")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[...BRANDS].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => toggleBrand(b.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all
                        ${activeBrands.has(b.id) ? "text-white border-white/40 bg-white/15" :
                          activeBrands.size === 0 ? "text-text-primary/90 border-border hover:border-white/30 hover:text-white" :
                          "text-text-secondary border-border/60 hover:text-white"}`}
                    >
                      {b.name}
                    </button>
                  ))}
                  {activeBrands.size > 0 && (
                    <button onClick={() => setActiveBrands(new Set())}
                      className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-danger border border-border hover:border-danger/30 transition-all">
                      {t("evolution.clear")}
                    </button>
                  )}
                </div>
              </div>

              {/* Edge legend */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                  {t("evolution.edgeTypes")}
                </p>
                <div className="space-y-2">
                  {EDGE_TYPES.map(({ type, label, desc }) => (
                    <div key={type} className="flex items-start gap-2.5">
                      <div className="w-6 h-0.5 rounded-full mt-2 shrink-0"
                        style={{ backgroundColor: getEdgeColor(type) }} />
                      <div>
                        <div className="text-xs font-medium text-text-secondary">{label}</div>
                        <div className="text-[10px] text-text-muted">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Graph Canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 text-sm text-text-secondary hover:text-text-primary transition-all">
                <Filter className="w-4 h-4" />
                {t("evolution.filters")}
              </button>
            )}
          </div>

          <div className="flex-1" />

          {/* Stats pill */}
          <div className="pointer-events-auto glass rounded-xl px-4 py-1.5 border border-white/8 flex items-center gap-3 text-xs text-text-muted">
            {t("evolution.nodeEdgeCount", { nodes: nodes.length, edges: edges.length })}
            <span className="w-px h-3 bg-border" />
            <span>
              {BRANDS.filter(b => nodes.some(n => n.brandId === b.id)).length}{' '}
              {t("evolution.brandsLabel").toLowerCase()}
            </span>
          </div>

          {/* Info button */}
          <button
            onClick={() => setLegendOpen((v) => !v)}
            className="pointer-events-auto w-8 h-8 glass rounded-xl border border-white/10 flex items-center justify-center text-text-muted hover:text-primary transition-all"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Concept info panel */}
        <AnimatePresence>
          {legendOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-14 right-3 z-20 w-80 glass rounded-2xl border border-white/10 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-bold text-text-primary">
                  {t("evolution.infoTitle")}
                </h3>
                <button onClick={() => setLegendOpen(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
                <p>
                  {infoBodyParts[0]}
                  <span className="text-primary font-semibold">{t("evolution.infoNode")}</span>
                  {infoBodyParts[1] ?? ""}
                </p>
                <div className="space-y-1.5 pt-1">
                  {EDGE_TYPES.map(({ type, label, desc }) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-5 h-0.5 rounded shrink-0" style={{ backgroundColor: getEdgeColor(type) }} />
                      <span className="font-medium text-text-primary">{label}</span>
                      <span className="text-text-muted">— {desc}</span>
                    </div>
                  ))}
                </div>
                <p className="pt-1 text-text-muted">
                  {infoNoteParts[0]}
                  <span className="text-gold">{t("evolution.infoGoldDiamonds")}</span>
                  {infoNoteParts[1] ?? ""}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The graph — empty until user selects a brand */}
        {graphReady ? (
          <EvolutionGraph
            data={{ nodes, edges }}
            layout={layout}
            onNodeClick={handleNodeClick}
            activeBrands={activeBrands}
            showLabels={showLabels}
            nodeFilter={nodeFilter}
            className="w-full h-full"
          />
        ) : (
          /* Empty state: guide user to select a brand */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Network className="w-8 h-8 text-primary/50" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-text-primary mb-2">
                  {isRu ? 'Выберите бренд для начала' : 'Select a brand to start'}
                </h3>
                <p className="text-sm text-text-muted max-w-xs">
                  {isRu
                    ? 'Нажмите на бренд в боковой панели слева — граф загрузится автоматически'
                    : 'Click a brand in the left sidebar — the graph will load automatically'}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {["BMW", "Ferrari", "Porsche", "Audi", "Mercedes"].map(b => (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b.toLowerCase())}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-primary/25 text-primary/70 hover:border-primary/50 hover:text-primary hover:bg-primary/8 transition-all"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Selected node detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="absolute bottom-6 right-6 w-64 glass rounded-2xl border border-primary/25 p-4 z-10"
            >
              <button onClick={() => setSelectedNode(null)}
                className="absolute top-3 right-3 text-text-muted hover:text-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="badge-primary text-[10px] mb-2 inline-flex">{selectedNode.type}</span>
              <h3 className="font-display text-base font-bold text-text-primary mb-0.5">{selectedNode.label}</h3>
              {selectedNode.codeName && (
                <p className="text-primary text-xs font-mono mb-2">{selectedNode.codeName}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                {selectedNode.year && <span>{selectedNode.year}</span>}
                {selectedNode.brandName && (
                  <span className="px-1.5 py-0.5 rounded bg-white/8 text-white/50">{selectedNode.brandName}</span>
                )}
                {selectedNode.isConcept && (
                  <span className="px-1.5 py-0.5 rounded bg-gold/15 text-gold text-[10px] font-bold">CONCEPT</span>
                )}
              </div>
              <div className="text-xs text-text-muted mb-3">
                <span className="font-semibold text-text-secondary">{t("evolution.connectedTo")} </span>
                {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}{' '}
                {t("evolution.edgesWord")}
              </div>
              <a
                href={
                  selectedNode.modelSlug
                    ? `/model/${selectedNode.modelSlug}`
                    : `/brand/${selectedNode.brandId}`
                }
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
              >
                {selectedNode.modelSlug
                  ? t("evolution.viewDetails")
                  : t("evolution.viewBrand")}
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Welcome / Instructions overlay ──────────────────────────── */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(5,5,10,0.88)', backdropFilter: 'blur(16px)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="glass-primary rounded-3xl border border-primary/25 p-8 max-w-xl w-full mx-6 shadow-[0_0_60px_rgba(0,212,255,0.12)]"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black text-text-primary">
                    {isRu ? 'Граф эволюции' : 'Evolution Graph'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {isRu ? `${graphData.nodes.length} узлов · ${graphData.edges.length} связей · 11 брендов` : `${graphData.nodes.length} nodes · ${graphData.edges.length} edges · 11 brands`}
                  </p>
                </div>
              </div>

              {/* Layout descriptions */}
              <div className="space-y-2.5 mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
                  {isRu ? 'Доступные расположения' : 'Available Layouts'}
                </p>
                {[
                  { icon: '⚙️', name: isRu ? 'Форсаж' : 'Thrust',     desc: isRu ? 'Кластеры по типу двигателя и мощности (л.с.)' : 'Engine type clusters × HP axis' },
                  { icon: '🔷', name: isRu ? 'Силуэт' : 'Silhouette', desc: isRu ? 'Зоны по типу кузова (NetCarShow)' : 'Body-type zones (NetCarShow)' },
                  { icon: '📋', name: isRu ? 'Хроника' : 'Chronicle',  desc: isRu ? 'Колонки брендов × ось времени сверху вниз' : 'Brand columns × vertical time axis' },
                  { icon: '🌳', name: isRu ? 'Развилка' : 'Fork',      desc: isRu ? 'Дерево эволюции бренда — выбери бренд слева' : 'Brand evolution tree — select a brand first' },
                  { icon: '🔄', name: isRu ? 'Синхрон' : 'Sync',       desc: isRu ? 'Параллельные дорожки брендов по оси лет' : 'Parallel brand tracks on shared year axis' },
                ].map(item => (
                  <div key={item.name} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-base leading-none mt-0.5">{item.icon}</span>
                    <div>
                      <span className="text-sm font-semibold text-text-primary">{item.name}</span>
                      <span className="text-xs text-text-muted ml-2">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="grid grid-cols-2 gap-2 mb-6 text-xs text-text-muted">
                {[
                  { icon: MousePointer2, text: isRu ? 'Нажми на узел → страница модели' : 'Click node → model page' },
                  { icon: SlidersHorizontal, text: isRu ? 'Бренды слева → фильтр графа' : 'Brands in sidebar → filter graph' },
                  { icon: Search, text: isRu ? 'Поиск по коду / названию' : 'Search by code or name' },
                  { icon: Layers3, text: isRu ? 'Развилка: выбери 1 бренд' : 'Fork: select 1 brand first' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <Icon className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={dismissWelcome}
                className="btn-primary w-full justify-center text-sm"
              >
                <Sparkles className="w-4 h-4" />
                {isRu ? 'Начать исследование' : 'Start Exploring'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-xs text-text-muted mt-3 opacity-60">
                {isRu ? 'Это окно больше не появится в этой сессии' : 'This dialog won\'t appear again this session'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EvolutionPage() {
  return (
    <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Загрузка…</div>}>
      <EvolutionPageInner />
    </React.Suspense>
  );
}
