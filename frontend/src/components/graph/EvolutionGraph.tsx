'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import cola from 'cytoscape-cola'
import dagre from 'cytoscape-dagre'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Layers,
  X,
  Circle,
} from 'lucide-react'
import type { GraphData, GraphNode, GraphLayoutType, CytoscapeNodeData, CytoscapeEdgeData } from '@/lib/types'
import { BODY_TYPE_ZONES } from '@/lib/types'
import { buildCytoscapeElements } from '@/lib/graph-utils'
import { useLocale } from '@/contexts/LocaleContext'

// ── Register extensions once ──────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  try {
    cytoscape.use(cola as Parameters<typeof cytoscape.use>[0])
    cytoscape.use(dagre as Parameters<typeof cytoscape.use>[0])
  } catch {
    // Already registered
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EvolutionGraphProps {
  data: GraphData
  onNodeClick?: (node: GraphNode) => void
  layout?: GraphLayoutType
  height?: number
  className?: string
  /** Show/hide node labels */
  showLabels?: boolean
  /** Active brand filter — used by Fork layout to show one brand tree */
  activeBrands?: Set<string>
  /** Node type filter: all | base | facelifts | variants */
  nodeFilter?: 'all' | 'base' | 'facelifts' | 'variants'
}

// ─── Edge colour map ───────────────────────────────────────────────────────────

const EDGE_COLORS: Record<string, string> = {
  evolves_into: '#00d4ff',
  influenced_by: '#ff9500',
  shares_platform: '#00ff88',
  derived_from: '#a78bfa',
  inspired: '#f472b6',
  concept_to_production: '#ffd700',
  facelifted_to: '#38bdf8',
  rebadged_as: '#94a3b8',
  variant_of: '#e879f9',   // fuchsia — official brand performance/body variant
}

// ─── Cytoscape stylesheet ──────────────────────────────────────────────────────

const STYLESHEET: cytoscape.StylesheetCSS[] = [
  // ── Base node — название МОДЕЛИ внутри кружка ──────────────────────────────
  {
    selector: 'node',
    css: {
      width: 66,
      height: 66,
      'background-color': '#0d0b0e',
      'background-opacity': 0.92,
      'border-width': 3,
      'border-color': '#F97316',   // Saffron Fire — platform primary
      'border-opacity': 0.9,
      'label': 'data(label)',
      'font-size': 7.5,
      'font-family': 'Inter, sans-serif',
      'font-weight': 700,
      'color': '#ffffff',
      'text-valign': 'center',     // ВНУТРИ кружка
      'text-halign': 'center',
      'text-margin-y': 0,
      'text-max-width': 52,        // ширина переноса внутри круга (66 − 2×border − воздух)
      'text-wrap': 'wrap',         // многострочный перенос
      'text-overflow-wrap': 'anywhere',
      'background-image': 'data(imageUrl)',
      'background-fit': 'cover',
      'background-clip': 'none',
      'shape': 'ellipse',
      'overlay-opacity': 0,
      'transition-property': 'border-width background-color',
      'transition-duration': '200ms',
    } as cytoscape.Css.Node,
  },
  // ── Facelift node — круг с ПУНКТИРНЫМ контуром (обновление той же модели) ──
  {
    selector: 'node.facelift',
    css: {
      width: 60,
      height: 60,
      'border-color': '#38bdf8',   // facelifted_to edge colour (light blue)
      'border-width': 2.5,
      'border-style': 'dashed',    // dashed = не новая модель, обновление
      'border-opacity': 0.9,
      'font-size': 7,
    } as cytoscape.Css.Node,
  },
  // ── Variant / modification node — ПЯТИУГОЛЬНИК, фуксия контур ──────────────
  {
    selector: 'node.variant-mod',
    css: {
      shape: 'pentagon',           // форма отличает модификацию от базовой модели
      width: 70,
      height: 70,
      'border-color': '#e879f9',   // variant_of edge colour (fuchsia)
      'border-width': 3,
      'border-style': 'solid',
      'border-opacity': 0.95,
      'text-max-width': 48,        // у пятиугольника центр уже — текст компактнее
    } as cytoscape.Css.Node,
  },
  // ── Concept node (diamond) ──────────────────────────────────────────────────
  {
    selector: 'node.concept',
    css: {
      shape: 'diamond',
      width: 52,
      height: 52,
      'border-color': '#ffd700',
      'border-width': 3,
      'background-color': 'rgba(255,215,0,0.12)',
    } as cytoscape.Css.Node,
  },
  // ── Brand node ─────────────────────────────────────────────────────────────
  {
    selector: 'node.brand',
    css: {
      width: 72,
      height: 72,
      'border-color': '#a78bfa',
      'border-width': 3.5,
      shape: 'hexagon',
    } as cytoscape.Css.Node,
  },
  // ── Selected — НЕ перебивает border-color (бренд/фейслифт/вариант сохраняется) ──
  {
    selector: 'node:selected',
    css: {
      // border-color намеренно НЕ задан — наследуется от facelift/variant-mod/brand
      'border-width': 4.5,
      'border-opacity': 1,
      'background-color': 'rgba(249,115,22,0.18)',
      'overlay-color': '#F97316',
      'overlay-opacity': 0.12,
    } as cytoscape.Css.Node,
  },
  // ── Hovered — только glow overlay, цвет контура не трогаем ──────────────
  {
    selector: 'node.hover',
    css: {
      'border-width': 4,
      'border-opacity': 1,
      'overlay-opacity': 0.07,
      'overlay-color': '#F97316',   // Saffron Fire — не синий
    } as cytoscape.Css.Node,
  },
  // ── Endpoints of a hovered edge — заметная подсветка ОБОИХ концов связи ──
  // Навёл на ребро → оба узла-конца получают яркое сафрановое гало (overlay
  // с padding = кольцо вокруг узла) + толстый контур + поверх соседей (z-index).
  {
    selector: 'node.edge-endpoint, node.node-pinned',
    css: {
      'border-color': '#F97316',
      'border-width': 5,
      'border-opacity': 1,
      'overlay-color': '#F97316',
      'overlay-opacity': 0.28,
      'overlay-padding': 7,
      'z-index': 9999,
    } as cytoscape.Css.Node,
  },
  // ── Base edge ─────────────────────────────────────────────────────────────
  {
    selector: 'edge',
    css: {
      'line-color': '#6b7280',           // нейтральный серый (fallback, конкретные типы переопределяют)
      'target-arrow-color': '#6b7280',
      'target-arrow-shape': 'triangle',
      'target-arrow-size': 8,
      'curve-style': 'bezier',
      width: 2.5,
      opacity: 0.75,
      'line-opacity': 0.75,
      'font-size': 8,
      'label': '',
      'color': 'rgba(255,255,255,0.4)',
      'text-background-color': 'rgba(5,5,10,0.85)',
      'text-background-opacity': 0,
      'text-background-padding': '2px',
      'transition-property': 'opacity width',
      'transition-duration': '200ms',
    } as cytoscape.Css.Edge,
  },
  // ── Edge types ──────────────────────────────────────────────────────────
  ...Object.entries(EDGE_COLORS).map(([type, color]) => ({
    selector: `edge.${type}`,
    css: {
      'line-color': color,
      'target-arrow-color': color,
    } as cytoscape.Css.Edge,
  })),
  // ── Per-type width overrides ─────────────────────────────────────────────
  {
    selector: 'edge.evolves_into',
    css: { width: 3.5 } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge.variant_of',
    css: { width: 3.5 } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge.concept_to_production',
    css: { width: 3 } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge.derived_from',
    css: { width: 2.5 } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge.shares_platform',
    css: { width: 2.5 } as cytoscape.Css.Edge,
  },
  {
    // facelifted_to — short dash, same thickness as variant_of
    selector: 'edge.facelifted_to',
    css: { width: 3, 'line-style': 'dashed', 'line-dash-pattern': [8, 5], 'target-arrow-shape': 'triangle', 'target-arrow-size': 7 } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge.influenced_by, edge.inspired',
    css: { width: 1.8, 'line-style': 'dashed', 'line-dash-pattern': [6, 4] } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge.rebadged_as',
    css: { width: 1.5, 'line-style': 'dashed', 'line-dash-pattern': [8, 4] } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge:selected, edge.hover, edge.edge-pinned',
    css: {
      width: 5,
      opacity: 1,
      label: 'data(type)',
      'text-background-opacity': 1,
      'font-size': 9,
    } as cytoscape.Css.Edge,
  },
  // ── Dimmed (when something else is selected) ────────────────────────────
  {
    selector: '.dimmed',
    css: { opacity: 0.15 } as cytoscape.Css.Node & cytoscape.Css.Edge,
  },
]

// ─── Layout configs ────────────────────────────────────────────────────────────

function getLayoutConfig(layout: GraphLayoutType) {
  const base = { animate: true, animationDuration: 600, fit: true, padding: 40 }
  switch (layout) {
    case 'dagre':
      return { name: 'dagre', rankDir: 'LR', nodeSep: 60, edgeSep: 20, rankSep: 120, ...base }
    case 'cose':
      return {
        name: 'cose',
        idealEdgeLength: 120,
        nodeRepulsion: 8000,
        gravity: 0.1,
        ...base,
      }
    case 'cola':     // Мощность: позиции считаются вручную (сетка л.с.×двигатель) → preset, БЕЗ физики
    case 'timeline':
    case 'zone':
    case 'eras':
    case 'fork':
    case 'sync':
      // These layout modes compute positions manually → pass valid 'preset' to CytoscapeComponent
      return { name: 'preset', animate: true, animationDuration: 600, fit: true, padding: 40 }
    default:
      return { name: layout, ...base }
  }
}

// ─── Side panel ───────────────────────────────────────────────────────────────

interface NodePanelProps {
  node: GraphNode | null
  onClose: () => void
}

function NodeInfoPanel({ node, onClose }: NodePanelProps) {
  const { t, locale } = useLocale()
  if (!node) return null
  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="absolute top-3 right-14 w-52 rounded-2xl border border-white/15 overflow-hidden z-20"
      style={{
        background: 'rgba(8,8,18,0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/8">
        <span className="text-xs font-semibold text-white">
          {locale === 'ru' ? 'Инфо узла' : 'Node Info'}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-white/30 hover:text-white/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        {node.imageUrl && (
          <div className="relative w-full h-24 rounded-lg overflow-hidden bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={node.imageUrl} alt={node.label} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
            {locale === 'ru' ? 'Название' : 'Name'}
          </div>
          <div className="text-sm font-semibold text-white">{node.label}</div>
        </div>
        {node.codeName && (
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
              {locale === 'ru' ? 'Индекс' : 'Code'}
            </div>
            <div className="text-sm font-mono font-bold text-primary">{node.codeName}</div>
          </div>
        )}
        {node.year && (
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
              {locale === 'ru' ? 'Год' : 'Year'}
            </div>
            <div className="text-sm font-mono text-white/70">{node.year}</div>
          </div>
        )}
        {node.brandName && (
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
              {locale === 'ru' ? 'Бренд' : 'Brand'}
            </div>
            <div className="text-sm text-white/70">{node.brandName}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {node.isFacelift && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8]">
              {locale === 'ru' ? 'РЕСТАЙЛИНГ' : 'FACELIFT'}
            </span>
          )}
          {node.isConcept && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ffd700]/15 border border-[#ffd700]/30 text-[#ffd700]">
              {locale === 'ru' ? 'КОНЦЕПТ' : 'CONCEPT'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean
  x: number
  y: number
  content: string
  sub?: string
  imageUrl?: string        // мини-превью модели (caricos hero/thumbnail)
  slug?: string            // modelSlug текущего узла (для асинхронной подгрузки)
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function GraphSkeleton({ height }: { height: number }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden animate-pulse" style={{ height }}>
      <div className="w-full h-full bg-white/3 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full skeleton" />
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full skeleton" />
            <div className="w-8 h-8 rounded-full skeleton" />
            <div className="w-8 h-8 rounded-full skeleton" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const EvolutionGraph: React.FC<EvolutionGraphProps> = ({
  data,
  onNodeClick,
  layout = 'dagre',
  height = 600,
  className = '',
  showLabels = true,
  activeBrands,
  nodeFilter = 'all',
}) => {
  const cyRef = useRef<cytoscape.Core | null>(null)
  const containerRef2 = useRef<HTMLDivElement>(null)
  // Активная раскладка как ref: отложенный пересчёт при смене фильтра всегда
  // берёт свежее значение, НЕ подписываясь на activeLayout в deps (иначе двойной
  // прогон раскладки при переключении layout — это делает отдельный effect).
  const activeLayoutRef = useRef<GraphLayoutType>(layout)
  // Кэш мини-превью моделей: slug → URL картинки (null = нет/ошибка)
  const modelImgCache = useRef<Map<string, string | null>>(new Map())
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' })
  const [activeLayout, setActiveLayout] = useState<GraphLayoutType>(layout)
  activeLayoutRef.current = activeLayout  // держим ref в синхроне с активной раскладкой
  const { locale, t } = useLocale()
  // Zone label overlays for 'zone' layout
  // top/height = horizontal band (legacy); left/width = vertical column (transposed Типаж)
  // stats = межбрендовая аналитика: топ брендов по числу моделей в зоне
  type ZoneStat = { brand: string; count: number; color: string }
  type ZoneLabel = { key: string; label: string; color: string; top: number; height: number; left?: number; width?: number; stats?: ZoneStat[] }
  const [zoneLabels, setZoneLabels] = useState<ZoneLabel[]>([])
  // Vertical decade lines (left% position + label); top% = horizontal decade row (transposed)
  type DecadeLine = { year: number; left: number; top?: number }
  const [decadeLines, setDecadeLines] = useState<DecadeLine[]>([])
  // Powertrain overlay bands (cola layout)
  type PowerBand = { label: string; color: string; top: number; height: number }
  type HpLine = { hp: number; left: number }
  const [engineBands, setEngineBands] = useState<PowerBand[]>([])
  const [hpLines, setHpLines] = useState<HpLine[]>([])
  type PlatZone = { color: string; label: string; count: number }
  type PlatHull = { color: string; points: string }
  const [platformZones, setPlatformZones] = useState<PlatZone[]>([])
  const [platformHulls, setPlatformHulls] = useState<PlatHull[]>([])
  // Eras overlay
  type EraCol  = { decade: number; left: number }
  type GenRow  = { gen: number; label: string; top: number; height: number; spanTop?: number; spanHeight?: number; color?: string }
  type BrandBand = { brandId: string; label: string; color: string; left: number; width: number }
  type YearTick  = { year: number; top: number }
  const [eraCols,    setEraCols]    = useState<EraCol[]>([])
  const [genRows,    setGenRows]    = useState<GenRow[]>([])
  const [brandBands, setBrandBands] = useState<BrandBand[]>([])
  const [yearTicks,  setYearTicks]  = useState<YearTick[]>([])
  // Store model-space state for pan/zoom re-computation
  const decadeModelRef = useRef<{ decades: number[]; minYear: number; xScale: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Engine type display metadata (order = top→bottom in powertrain layout)
  const ENGINE_ZONES = [
    { key: 'ev',      label: locale === 'ru' ? 'Электро' : 'Electric',      color: '#22d3ee', row: 0 },
    { key: 'hybrid',  label: locale === 'ru' ? 'Гибрид' : 'Hybrid',         color: '#a3e635', row: 1 },
    { key: 'w16',     label: 'W16 Quad-Turbo',                               color: '#9333ea', row: 2 },
    { key: 'v12t',    label: 'V12 Turbo',                                    color: '#ff4400', row: 2 },
    { key: 'v12',     label: 'V12',                                          color: '#ff2800', row: 2 },
    { key: 'flat12',  label: 'Flat-12',                                      color: '#ff6b6b', row: 3 },
    { key: 'v10',     label: 'V10',                                          color: '#e6b800', row: 4 },
    { key: 'v8t',     label: 'V8 Turbo',                                     color: '#ff9500', row: 5 },
    { key: 'v8h',     label: 'V8 Hybrid',                                    color: '#fbbf24', row: 6 },
    { key: 'v8',      label: 'V8 NA',                                        color: '#f59e0b', row: 7 },
    { key: 'flat6t',  label: 'Flat-6 Turbo',                                 color: '#ffd700', row: 8 },
    { key: 'flat6',   label: 'Flat-6 NA',                                    color: '#ffe566', row: 9 },
    { key: 'v6t',     label: 'V6 Turbo',                                     color: '#00ff88', row: 10 },
    { key: 'v6h',     label: 'V6 Hybrid',                                    color: '#6ee7b7', row: 11 },
    { key: 'v6',      label: 'V6 NA',                                        color: '#34d399', row: 12 },
    { key: 'i6t',     label: 'I6 Turbo',                                     color: '#00d4ff', row: 13 },
    { key: 'i6',      label: 'I6 NA',                                        color: '#7dd3fc', row: 14 },
    { key: 'i5t',     label: 'I5 Turbo (Quattro)',                           color: '#a78bfa', row: 15 },
    { key: 'i4t',     label: 'I4 Turbo',                                     color: '#c084fc', row: 16 },
    { key: 'i4h',     label: 'I4 Hybrid',                                    color: '#d8b4fe', row: 17 },
    { key: 'i4',      label: 'I4 NA',                                        color: '#e9d5ff', row: 18 },
    { key: 'flat4t',  label: 'Flat-4 Turbo',                                 color: '#94a3b8', row: 19 },
    { key: 'flat4',   label: 'Flat-4 NA',                                    color: '#cbd5e1', row: 20 },
  ] as const

  // Мемоизируем — пересчитывается только при реальном изменении данных,
  // НЕ при каждом setState (тултип, выделение) → классы variant-mod/facelift
  // не переприменяются случайно, нет анимации «мигания» цвета контура.
  const elements = useMemo(
    () => buildCytoscapeElements(data),
    // Зависим от ССЫЛОК на массивы (родитель их мемоизирует и меняет ровно при
    // смене фильтра), а НЕ от длины: смена бренда на другой с тем же числом
    // узлов тоже пересоберёт elements → граф не останется со старым набором.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.nodes, data.edges]
  )

  const layoutConfig = getLayoutConfig(activeLayout)

  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy

    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data() as CytoscapeNodeData
      const gNode: GraphNode = {
        id: nodeData.id,
        label: nodeData.label,
        type: nodeData.type,
        year: nodeData.year,
        brandId: nodeData.brandId,
        brandName: nodeData.brandName,
        codeName: nodeData.codeName,
        isFacelift: nodeData.isFacelift,
        isConcept: nodeData.isConcept,
        imageUrl: nodeData.imageUrl,
        modelSlug: nodeData.modelSlug,
      }
      setSelectedNode(gNode)
      onNodeClick?.(gNode)

      // Dim non-connected (и снять пин со связи, если он был)
      // В «Мощности» пришпиленное ребро получило инлайн opacity:1 → откат до 0.30
      if (activeLayoutRef.current === 'cola') {
        cy.edges('.edge-pinned').forEach(e => {
          if (e.data('type') === 'variant_of') e.style({ opacity: 0.30 })
        })
      }
      cy.elements().removeClass('edge-pinned node-pinned')
      cy.elements().addClass('dimmed')
      evt.target.removeClass('dimmed')
      evt.target.connectedEdges().removeClass('dimmed')
      evt.target.neighborhood().removeClass('dimmed')
    })

    // Клик по связи — ЗАФИКСИРОВАТЬ выделение: связь + оба её узла остаются
    // подсвеченными после ухода курсора. Клик по другой связи снимает прошлый
    // пин (single-select), клик по фону/узлу — тоже сбрасывает.
    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target
      cy.elements().unselect()                                      // сброс нативного выделения (на случай additive)
      // В «Мощности» инлайн opacity:1 пред. пина → откат до 0.30 перед сбросом класса
      if (activeLayoutRef.current === 'cola') {
        cy.edges('.edge-pinned').forEach(e => {
          if (e.data('type') === 'variant_of') e.style({ opacity: 0.30 })
        })
      }
      cy.elements().removeClass('dimmed edge-pinned node-pinned')   // снять прошлый пин / затемнение от выбора узла
      setSelectedNode(null)
      edge.addClass('edge-pinned')
      edge.connectedNodes().addClass('node-pinned')
      // В «Мощности» stylesheet opacity:1 не пробивает инлайн → форсируем вручную
      if (activeLayoutRef.current === 'cola' && edge.data('type') === 'variant_of') {
        edge.style({ opacity: 1 })
      }
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null)
        if (activeLayoutRef.current === 'cola') {
          cy.edges('.edge-pinned').forEach(e => {
            if (e.data('type') === 'variant_of') e.style({ opacity: 0.30 })
          })
        }
        cy.elements().removeClass('dimmed edge-pinned node-pinned')
      }
    })

    cy.on('mouseover', 'node', (evt) => {
      evt.target.addClass('hover')
      const pos = evt.target.renderedPosition()
      const nodeData = evt.target.data() as CytoscapeNodeData
      const slug = nodeData.modelSlug as string | undefined
      const cached = slug ? modelImgCache.current.get(slug) : undefined

      setTooltip({
        visible: true,
        x: pos.x + 30,
        y: pos.y - 10,
        content: nodeData.label,
        sub: nodeData.codeName ? `${nodeData.codeName} · ${nodeData.year ?? ''}` : nodeData.year?.toString() ?? '',
        slug,
        imageUrl: cached ?? undefined,
      })

      // Подгрузка мини-превью модели (один раз на slug, с кэшированием).
      // Проверяем наличие картинки по JSON; src указываем на серверный прокси
      // /api/car-image (caricos требует Referer своего домена — см. route).
      if (slug && cached === undefined) {
        modelImgCache.current.set(slug, null)  // помечаем «в процессе»
        fetch(`/data/models/${slug}.json`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            const raw = (d?.heroImageUrl || d?.thumbnailUrl || '') as string
            const url = raw ? `/api/car-image?slug=${encodeURIComponent(slug)}` : null
            modelImgCache.current.set(slug, url)
            setTooltip(prev =>
              prev.visible && prev.slug === slug && url
                ? { ...prev, imageUrl: url }
                : prev
            )
          })
          .catch(() => { modelImgCache.current.set(slug, null) })
      }
    })

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('hover')
      setTooltip((t) => ({ ...t, visible: false }))
    })

    cy.on('mouseover', 'edge', (evt) => {
      evt.target.addClass('hover')
      evt.target.connectedNodes().addClass('edge-endpoint')   // заметно подсветить оба конца связи
      const edgeData = evt.target.data() as CytoscapeEdgeData
      const rp = (evt as any).renderedPosition
      const pos = typeof rp === 'function' ? rp() : (rp ?? evt.position ?? { x: 0, y: 0 })
      // Translate edge type to locale
      const EDGE_TYPE_KEYS: Record<string, string> = {
        evolves_into: 'evolution.edgeEvolvesInto',
        influenced_by: 'evolution.edgeInfluencedBy',
        shares_platform: 'evolution.edgeSharesPlatform',
        derived_from: 'evolution.edgeDerivedFrom',
        concept_to_production: 'evolution.edgeConcept',
        variant_of: 'evolution.edgeVariantOf',
        facelifted_to: 'evolution.edgeFaceliftedTo',
        rebadged_as: 'evolution.edgeRebadged',
        inspired: 'evolution.edgeInspired',
      }
      const edgeTypeKey = edgeData.type ? EDGE_TYPE_KEYS[edgeData.type] : undefined
      const edgeLabel = edgeTypeKey ? t(edgeTypeKey) : (edgeData.type?.replace(/_/g, ' ') ?? t('evolution.tooltipConnection'))
      setTooltip({
        visible: true,
        x: pos.x + 16,
        y: pos.y - 16,
        content: edgeLabel,
        sub: edgeData.strength ? `${t('evolution.tooltipStrength')}: ${Math.round(edgeData.strength * 100)}%` : '',
      })
    })

    cy.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('hover')
      evt.target.connectedNodes().removeClass('edge-endpoint')
      setTooltip((t) => ({ ...t, visible: false }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNodeClick, t, locale])

  const handleZoomIn = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 1.35), [])
  const handleZoomOut = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 0.74), [])
  const handleFit = useCallback(() => cyRef.current?.fit(undefined, 40), [])

  const handleExportPNG = useCallback(() => {
    if (!cyRef.current) return
    const png = cyRef.current.png({ scale: 2, bg: '#050508', full: true })
    const a = document.createElement('a')
    a.href = png
    a.download = 'evolution-graph.png'
    a.click()
  }, [])

  const handleLayoutChange = useCallback((l: GraphLayoutType) => {
    setActiveLayout(l)
    const cy = cyRef.current
    if (!cy) return

    // ── Edge visibility per layout: show only contextually meaningful edges ─────
    const applyEdgeVisibility = (layoutKey: GraphLayoutType) => {
      cy.batch(() => {  // Single repaint for all edge changes
      // Pre-build node data map for O(1) lookup instead of O(n) getElementById
      const nodeDataMap: Record<string, { zone?: string; brandId?: string }> = {}
      cy.nodes().forEach(n => { nodeDataMap[n.id()] = { zone: n.data('zone'), brandId: n.data('brandId') } })
      cy.edges().forEach(e => {
        const type   = e.data('type') as string
        const srcId  = e.source().id()
        const tgtId  = e.target().id()
        const srcData = nodeDataMap[srcId] ?? {}
        const tgtData = nodeDataMap[tgtId] ?? {}

        switch (layoutKey) {
          case 'cola': {
            // Мощность = классификационная карта (мощность × тип двигателя). Прочие
            // связи (evolves/derived/platform) ортогональны позиционированию → паутина,
            // их скрываем. Оставляем ТОЛЬКО variant_of (база → S/RS): в power-виде
            // осмысленно — ребро показывает скачок мощности/двигателя у заряженной
            // версии. Приглушённо, чтобы не доминировать. Платформы — кольца/легенда.
            const show = type === 'variant_of'
            e.style({ opacity: show ? 0.30 : 0, display: show ? 'element' : 'none' })
            break
          }
          case 'zone': {
            // Силуэт: body-type zones — only within-zone evolves_into + variant_of + facelifted_to
            const srcZone = srcData.zone as string
            const tgtZone = tgtData.zone as string
            const sameZone  = srcZone && tgtZone && srcZone === tgtZone
            const mainType  = ['evolves_into','variant_of'].includes(type)
            const secondary = type === 'derived_from' || type === 'concept_to_production'
            const flType    = type === 'facelifted_to'
            if (sameZone && mainType)        e.style({ opacity: 0.90, display: 'element' })
            else if (sameZone && flType)     e.style({ opacity: 0.75, display: 'element' })
            else if (sameZone && secondary)  e.style({ opacity: 0.45, display: 'element' })
            else                             e.style({ opacity: 0.0,  display: 'none'    })
            break
          }
          case 'eras': {
            // Хроника: brand timeline columns — intra-brand succession + facelifts
            const srcBrand  = srcData.brandId as string
            const tgtBrand  = tgtData.brandId as string
            const sameBrand = srcBrand === tgtBrand
            const chainType = ['evolves_into','variant_of'].includes(type)
            const flType    = type === 'facelifted_to'
            const softType  = type === 'derived_from'
            if (sameBrand && chainType)     e.style({ opacity: 0.90, display: 'element' })
            else if (sameBrand && flType)   e.style({ opacity: 0.80, display: 'element' })
            else if (sameBrand && softType) e.style({ opacity: 0.40, display: 'element' })
            else                            e.style({ opacity: 0.0,  display: 'none'    })
            break
          }
          case 'fork': {
            // Развилка: дерево эволюции — структурные связи + фейслифты + варианты.
            // influenced_by ВНУТРИ бренда — еле заметным пунктиром (дизайн-влияние,
            // напр. M3→M2, 458→LaFerrari). Кросс-брендовые influenced_by и
            // shares_platform скрыты — они дают паутину между далёкими колонками.
            const treeType   = ['evolves_into','variant_of','derived_from','concept_to_production'].includes(type)
            const flType     = type === 'facelifted_to'
            const sameBrand  = srcData.brandId && srcData.brandId === tgtData.brandId
            // Влияние: показываем ТОЛЬКО сильные связи (>60%), внутри бренда.
            // Слабые (≤60%) и кросс-брендовые скрыты — иначе паутина между колонками.
            const inflStr    = (e.data('strength') as number) ?? 0
            const inflShow   = type === 'influenced_by' && sameBrand && inflStr > 0.60
            if (treeType)       e.style({ opacity: 0.88, display: 'element' })
            else if (flType)    e.style({ opacity: 0.80, display: 'element' })
            else if (inflShow)  e.style({ opacity: 0.58, display: 'element' })  // дуга влияния
            else                e.style({ opacity: 0.0,  display: 'none'    })
            break
          }
          case 'sync': {
            // Синхрон: competitive segments — intra-segment main types only
            // (handled separately in sync block, this is fallback)
            const mainS = ['evolves_into','variant_of'].includes(type)
            e.style({ opacity: mainS ? 0.80 : 0.0, display: mainS ? 'element' : 'none' })
            break
          }
          default:
            e.style({ opacity: 0.75, display: 'element' })
        }
      })
      }) // end cy.batch()
    }

    // ── Форсаж: HP axis (X) × Engine type (Y) → logical performance clusters ──
    if (l === 'cola') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([]); setPlatformZones([]); setPlatformHulls([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      cy.off('pan zoom')

      const fCyNodes = cy.nodes()
      if (fCyNodes.length === 0) return

      // Engine type → row index (top = EV/Hybrid, bottom = small I4)
      const ENGINE_ROW: Record<string, number> = {
        ev: 0, hybrid: 1, v16h: 1,
        w16: 2, v16: 2,                            // Bugatti W16 / V16 hybrid
        v12: 2, v12t: 2, flat12: 2,                // V12 NA & turbo (Pagani, Ferrari)
        v10: 3,
        v8t: 4, v8h: 4, v8: 5,
        flat6t: 6, flat6: 7,
        i8: 7,                                      // Bugatti heritage straight-8
        i6t: 8, i6: 9,
        i5t: 10,
        v6t: 11, v6h: 11, v6s: 11, v6: 12,
        i4t: 13, i4h: 13, i4: 14,
        flat4t: 15, flat4: 15,
      }
      const ENGINE_COLOR: Record<string, string> = {
        ev: '#22d3ee', hybrid: '#a3e635', v16h: '#6ee7b7',
        w16: '#9333ea', v16: '#7c3aed',             // Bugatti purple
        v12: '#ff2800', v12t: '#ff4400', flat12: '#ff6b6b',
        v10: '#e6b800',
        v8t: '#ff9500', v8h: '#fbbf24', v8: '#f59e0b',
        flat6t: '#ffd700', flat6: '#ffe566',
        i8: '#c4b5fd',
        i6t: '#00d4ff', i6: '#7dd3fc',
        i5t: '#a78bfa',
        v6t: '#00ff88', v6h: '#6ee7b7', v6s: '#34d399', v6: '#34d399',
        i4t: '#c084fc', i4h: '#d8b4fe', i4: '#e9d5ff',
        flat4t: '#94a3b8', flat4: '#cbd5e1',
      }
      const ENGINE_LABEL: Record<string, string> = {
        ev: 'Electric', hybrid: 'Hybrid', v16h: 'V16 Hybrid',
        w16: 'W16 Quad-Turbo', v16: 'V16',
        v12: 'V12', v12t: 'V12 Turbo', flat12: 'Flat-12',
        v10: 'V10',
        v8t: 'V8 Turbo', v8h: 'V8 Hybrid', v8: 'V8 NA',
        flat6t: 'Flat-6 Turbo', flat6: 'Flat-6 NA',
        i6t: 'I6 Turbo', i6: 'I6 NA',
        i5t: 'I5 Turbo',
        v6t: 'V6 Turbo', v6h: 'V6 Hybrid', v6s: 'V6', v6: 'V6 NA',
        i4t: 'I4 Turbo', i4h: 'I4 Hybrid', i4: 'I4 NA',
        flat4t: 'Flat-4 Turbo', flat4: 'Flat-4 NA',
      }

      // ── Раскладка КАК ТИПАЖ: зоны = тип двигателя (переменная высота, растут под
      //    контент), колонки = бакеты мощности (л.с.), в ячейке (двигатель×бакет) —
      //    сетка GRID_COLS×rows. Модели распределяются с зазором, без наложений/вылезаний.
      const HP_BUCKET  = 100   // л.с. на колонку
      const NODE_R     = 35    // радиус габарита узла
      const CELL_STEP  = 84    // шаг сетки (узел 70 + 14 воздух)
      const ZONE_PAD   = 12
      const HEADER_H   = 40    // строка заголовка зоны (метка двигателя)
      const ZONE_GAP   = 16
      const BUCKET_PAD = 14
      const PAD_L      = 56
      const PAD_T      = 48

      const hpAll  = fCyNodes.map(n => (n.data('hp') as number) ?? 150).filter(h => h > 0)
      const minHP  = hpAll.length ? Math.min(...hpAll) : 100
      const maxHP  = hpAll.length ? Math.max(...hpAll) : 1000
      const minBkt = Math.floor(minHP / HP_BUCKET) * HP_BUCKET
      const maxBkt = Math.floor(maxHP / HP_BUCKET) * HP_BUCKET

      // группировка: engineType → бакет л.с. → id узлов
      const byEngBkt: Record<string, Record<number, string[]>> = {}
      const nodeHpMap: Record<string, number> = {}
      fCyNodes.forEach(n => {
        const eng = (n.data('engineType') as string) ?? 'i4'
        const hp  = (n.data('hp') as number) ?? 150
        const bkt = Math.floor(hp / HP_BUCKET) * HP_BUCKET
        ;((byEngBkt[eng] ??= {})[bkt] ??= []).push(n.id())
        nodeHpMap[n.id()] = hp
      })
      let maxCell = 1
      Object.values(byEngBkt).forEach(bb => Object.values(bb).forEach(a => { if (a.length > maxCell) maxCell = a.length }))
      const GRID_COLS = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(maxCell))))
      const BUCKET_W  = BUCKET_PAD * 2 + GRID_COLS * CELL_STEP

      // порядок зон: присутствующие типы двигателя по ENGINE_ROW (EV сверху → I4 снизу)
      const engPresent = Object.keys(byEngBkt).sort((a, b) => (ENGINE_ROW[a] ?? 14) - (ENGINE_ROW[b] ?? 14))

      const colaSeed: Record<string, { x: number; y: number }> = {}
      const engBandsVar: { label: string; color: string; top: number; height: number }[] = []
      let curY = PAD_T
      engPresent.forEach(eng => {
        const buckets  = byEngBkt[eng]
        const zoneTopY = curY
        const maxRows  = Math.max(...Object.values(buckets).map(a => Math.ceil(a.length / GRID_COLS)))
        const zoneH    = HEADER_H + (maxRows - 1) * CELL_STEP + NODE_R * 2 + ZONE_PAD
        Object.keys(buckets).map(Number).forEach(bkt => {
          const cell     = buckets[bkt].slice().sort((a, b) => nodeHpMap[a] - nodeHpMap[b])
          const bktLeft  = PAD_L + ((bkt - minBkt) / HP_BUCKET) * BUCKET_W
          const usedCols = Math.min(GRID_COLS, cell.length)
          const startX   = bktLeft + BUCKET_W / 2 - ((usedCols - 1) * CELL_STEP) / 2
          cell.forEach((id, idx) => {
            const col = idx % GRID_COLS, rw = Math.floor(idx / GRID_COLS)
            colaSeed[id] = { x: startX + col * CELL_STEP, y: zoneTopY + HEADER_H + NODE_R + rw * CELL_STEP }
          })
        })
        engBandsVar.push({ label: ENGINE_LABEL[eng] ?? eng, color: ENGINE_COLOR[eng] ?? '#888', top: zoneTopY, height: zoneH })
        curY += zoneH + ZONE_GAP
      })
      fCyNodes.forEach(n => { const p = colaSeed[n.id()]; if (p) n.position(p) })

      applyEdgeVisibility('cola')

      // ── Зонирование по ПЛАТФОРМАМ ────────────────────────────────────────────
      //  Группа = компонента связности по shares_platform (MLB-Evo SUV, MQB,
      //  MEB и т.д.). Каждой группе — свой цвет-кольцо у узлов; рёбра
      //  shares_platform в cola короче (см. edgeLength ниже) → платформенные
      //  группы стягиваются в видимые зоны поверх сетки «мощность × двигатель».
      const platAdj: Record<string, string[]> = {}
      cy.edges().forEach(e => {
        if (e.data('type') !== 'shares_platform') return
        const s = e.source().id(), t = e.target().id()
        ;(platAdj[s] ??= []).push(t); (platAdj[t] ??= []).push(s)
      })
      const platGroup: Record<string, number> = {}
      let platGi = 0
      Object.keys(platAdj).forEach(start => {
        if (platGroup[start] !== undefined) return
        const st: string[] = [start]; platGroup[start] = platGi
        while (st.length) {
          const id = st.pop() as string
          ;(platAdj[id] ?? []).forEach(nb => { if (platGroup[nb] === undefined) { platGroup[nb] = platGi; st.push(nb) } })
        }
        platGi++
      })
      const PLAT_PALETTE = ['#f97316','#22d3ee','#a3e635','#e879f9','#60a5fa','#fb7185',
                            '#34d399','#c084fc','#fbbf24','#2dd4bf','#f472b6','#fde047']
      cy.batch(() => {
        cy.nodes().forEach(node => {
          const grp = platGroup[node.id()]
          if (grp !== undefined) {
            node.style({
              'border-color': PLAT_PALETTE[grp % PLAT_PALETTE.length],
              'border-width': 4,
              'border-opacity': 1,
            })
          }
        })
      })

      // легенда + источник для подложек-зон (группы ≥3 узлов или известные платформы)
      const platMembers: Record<number, string[]> = {}
      Object.entries(platGroup).forEach(([id, gi]) => (platMembers[gi] ??= []).push(id))
      const PLAT_NAME: [string, string][] = [
        ['lambo-urus','MLB-Evo (большие SUV)'], ['vw-id4','MEB (EV)'], ['vw-golf7','MQB'],
        ['porsche-taycan','J1/PPE (EV)'], ['porsche-pan-971','MSB'], ['porsche-pan-970','MSB'],
        ['ford-ranger-t6','Ranger / Amarok'], ['ford-focus-2','Ford C1 / Mazda'],
        ['lambo-huracan','Huracán / R8 (V10)'], ['porsche-mac-95b','MLB (Macan/Q5)'],
      ]
      const platLabel = (members: string[]): string => {
        for (const [sig, name] of PLAT_NAME) if (members.includes(sig)) return name
        return members.slice(0, 2).map(id => cy.getElementById(id).data('label') as string).join(' · ')
          + (members.length > 2 ? ` +${members.length - 2}` : '')
      }
      const hullGroups: { color: string; members: string[] }[] = []
      const zones: PlatZone[] = []
      Object.entries(platMembers).forEach(([giStr, members]) => {
        const gi = Number(giStr)
        const color = PLAT_PALETTE[gi % PLAT_PALETTE.length]
        const named = PLAT_NAME.some(([sig]) => members.includes(sig))
        if (members.length >= 3 || named) {
          zones.push({ color, label: platLabel(members), count: members.length })
          if (members.length >= 3) hullGroups.push({ color, members })
        }
      })
      zones.sort((a, b) => b.count - a.count)
      setPlatformZones(zones)

      // Детерминированная карта: узлы строго на сетке X=мощность(л.с.), Y=двигатель
      // (позиции заданы seed выше). preset (без физики) → оси/полосы совпадают с
      // узлами, «Мощность» читается как scatter-plot, а не как force-паутина.
      // Платформы показываются цветом-кольцом + легендой (зонирование без разброса).
      const colaL = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => colaSeed[node.id()] ?? { x: 0, y: 0 },
        fit: true,
        padding: 50,
        animate: true,
        animationDuration: 600,
      } as cytoscape.LayoutOptions)

      // Полосы зон двигателя (ПЕРЕМЕННАЯ высота — из engBandsVar) → проценты
      const buildEngineBands = (pY: number, z: number): void => {
        setEngineBands(engBandsVar.map(b => ({
          label: b.label, color: b.color,
          top:    Math.max(0, (b.top * z + pY) / height * 100),
          height: Math.max(0.3, b.height * z / height * 100),
        })))
      }
      // Вертикальные линии по бакетам мощности (л.с.)
      const buildHpLines = (pX: number, z: number, cW: number): void => {
        const lines: { hp: number; left: number }[] = []
        for (let b = minBkt; b <= maxBkt + HP_BUCKET; b += HP_BUCKET) {
          const left = ((PAD_L + ((b - minBkt) / HP_BUCKET) * BUCKET_W) * z + pX) / cW * 100
          if (left > 0 && left < 100) lines.push({ hp: b, left })
        }
        setHpLines(lines)
      }

      // Выпуклая оболочка (Andrew monotone chain) в модельных координатах
      const convexHull = (pts: {x:number;y:number}[]): {x:number;y:number}[] => {
        if (pts.length < 3) return pts
        const s = pts.slice().sort((a,b) => a.x - b.x || a.y - b.y)
        const cr = (o:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}) =>
          (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x)
        const lo: {x:number;y:number}[] = []
        for (const p of s){ while(lo.length>=2 && cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p) }
        const up: {x:number;y:number}[] = []
        for (let i=s.length-1;i>=0;i--){ const p=s[i]; while(up.length>=2 && cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p) }
        lo.pop(); up.pop(); return lo.concat(up)
      }
      // Подложки-зоны: оболочка членов группы (модель) → экранные % с паддингом наружу
      const buildPlatformHulls = (pX: number, pY: number, z: number, cW: number): void => {
        const hulls = hullGroups.map(({ color, members }) => {
          const pos = members.map(id => cy.getElementById(id).position()).filter(p => p && isFinite(p.x))
          if (pos.length < 3) return null
          const cx = pos.reduce((s,p)=>s+p.x,0)/pos.length, cyy = pos.reduce((s,p)=>s+p.y,0)/pos.length
          const PAD = 48
          const padded = pos.map(p => { const dx=p.x-cx, dy=p.y-cyy, d=Math.hypot(dx,dy)||1; return { x:p.x+dx/d*PAD, y:p.y+dy/d*PAD } })
          const hull = convexHull(padded)
          if (hull.length < 3) return null
          const points = hull.map(p => `${(((p.x*z+pX)/cW)*100).toFixed(2)},${(((p.y*z+pY)/height)*100).toFixed(2)}`).join(' ')
          return { color, points }
        }).filter(Boolean) as PlatHull[]
        setPlatformHulls(hulls)
      }

      colaL.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? 1200
        buildEngineBands(p.y, z)
        buildHpLines(p.x, z, cw)
        buildPlatformHulls(p.x, p.y, z, cw)
        // Рёбра в одной строке двигателя → дуга вверх вместо прямой.
        // Порог dy < 4px (строго та же строка сетки): при dy ≥ 4 ребро наклонено и
        // перпендикуляр к нему уже не вертикален — контрольная точка смещается вбок
        // и дуга уходит вниз. Endpoint-overrides убраны: Cytoscape сам находит точку
        // входа в контур, двигаясь к контрольной точке, которая всегда выше узлов.
        cy.edges().forEach(e => {
          if (e.data('type') !== 'variant_of') return
          const sp = e.source().position()
          const tp = e.target().position()
          if (Math.abs(sp.y - tp.y) < 4) {
            const dx = Math.abs(tp.x - sp.x)
            e.style({
              'curve-style': 'unbundled-bezier',
              'control-point-distances': -(Math.min(72, Math.max(28, dx * 0.20))),
              'control-point-weights': 0.5,
            })
          }
        })
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          buildEngineBands(pp.y, zz)
          buildHpLines(pp.x, zz, cww)
          buildPlatformHulls(pp.x, pp.y, zz, cww)
        })
      })

      colaL.run()
      return
    }

    // ── Хроника: brand-family columns × time axis ─────────────────────────────
    if (l === 'eras') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([]); setPlatformZones([]); setPlatformHulls([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])

      const BRAND_COLOR_E: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
        'rolls-royce': '#68217a', bentley: '#0a4d2c',
        'gordon-murray': '#0e8a7d', zenvo: '#a4161a', 'de-tomaso': '#c08a3e',
        morgan: '#2e5e1e', tvr: '#4a6fa5', caterham: '#8ab500',
        ford: '#0b2e6b', hennessey: '#b33000', ssc: '#5b7a8c', saleen: '#e08a00',
        pininfarina: '#5d6d8a', 'hispano-suiza': '#147a8c', aspark: '#6f5acf',
      }
      const BRAND_ORDER_E = ['ferrari','lamborghini','porsche','maserati','lotus',
                             'bmw','mercedes','audi','volkswagen','seat','skoda']

      const eNodes = cy.nodes()
      const eYears = eNodes.map(n => n.data('year') as number).filter(Boolean)
      if (eYears.length === 0) { cy.layout(getLayoutConfig('dagre') as cytoscape.LayoutOptions).run(); return }

      const eMinYear = Math.min(...eYears)
      const eMaxYear = Math.max(...eYears)
      // Dynamic Y scale for Eras: target ~3500px height, min 12px/yr, max 56px/yr
      const eYearRange = Math.max(1, eMaxYear - eMinYear)
      const EY_SCALE  = Math.min(56, Math.max(12, Math.round(3500 / eYearRange)))
      const FAM_W_E   = 84
      const BRAND_GAP_E = 48
      const PAD_LEFT_E  = 90
      const PAD_TOP_E   = 60

      const getFamE = (id: string, slug: string|undefined) => {
        if (slug) return slug
        const p = id.split('-')
        return p.length >= 3 ? p[0]+'-'+p[1] : p[0]
      }
      type FamEE = { id: string; yr: number; brandId: string; fam: string }
      const allEE: FamEE[] = []
      eNodes.forEach(node => {
        const yr      = (node.data('year')      as number)           ?? eMinYear
        const slug    = (node.data('modelSlug') as string|undefined)
        const brandId = (node.data('brandId')   as string)           ?? 'unknown'
        allEE.push({ id: node.id(), yr, brandId, fam: getFamE(node.id(), slug) })
      })
      const byBrandFamE: Record<string, Record<string, FamEE[]>> = {}
      const famMinE: Record<string, number> = {}
      allEE.forEach(e => {
        if (!byBrandFamE[e.brandId]) byBrandFamE[e.brandId] = {}
        if (!byBrandFamE[e.brandId][e.fam]) byBrandFamE[e.brandId][e.fam] = []
        byBrandFamE[e.brandId][e.fam].push(e)
        if (famMinE[e.fam] === undefined || e.yr < famMinE[e.fam]) famMinE[e.fam] = e.yr
      })
      const sortedBrandsE = [...new Set(allEE.map(e => e.brandId))]
        .sort((a, b) => { const ai = BRAND_ORDER_E.indexOf(a), bi = BRAND_ORDER_E.indexOf(b); return (ai<0?99:ai)-(bi<0?99:bi) })

      const nodePosE: Record<string, { x: number; y: number }> = {}
      const famColXE: Record<string, number> = {}
      const brandColRangeE: Record<string, { start: number; end: number }> = {}
      let curXE = PAD_LEFT_E

      sortedBrandsE.forEach(brandId => {
        const famMap = byBrandFamE[brandId] ?? {}
        const sortedFamsE = Object.keys(famMap)
          .filter(f => famMap[f].length >= 2)
          .sort((a, b) => (famMinE[a] ?? 0) - (famMinE[b] ?? 0))
        if (sortedFamsE.length === 0) return
        const brandStart = curXE
        sortedFamsE.forEach(fam => {
          famColXE[fam] = curXE + FAM_W_E / 2
          const nodes = famMap[fam].sort((a, b) => a.yr - b.yr)
          const subMaxY: number[] = []
          nodes.forEach(({ id, yr }) => {
            const yBase = PAD_TOP_E + (yr - eMinYear) * EY_SCALE
            let sub = 0
            while (sub < subMaxY.length && subMaxY[sub] > yBase - 48) sub++
            subMaxY[sub] = yBase
            nodePosE[id] = { x: famColXE[fam] + (sub > 0 ? sub * 18 - 9 : 0), y: yBase }
          })
          curXE += FAM_W_E
        })
        brandColRangeE[brandId] = { start: brandStart, end: curXE }
        curXE += BRAND_GAP_E
      })
      allEE.forEach(e => {
        if (nodePosE[e.id]) return
        const r = brandColRangeE[e.brandId]
        nodePosE[e.id] = { x: r ? (r.start + r.end) / 2 : PAD_LEFT_E, y: PAD_TOP_E + (e.yr - eMinYear) * EY_SCALE }
      })

      // Метки семейных колонок + годовые диапазоны для lifespan-баров
      const famToLabel: Record<string, string> = {}
      const famRangeE: Record<string, { minYr: number; maxYr: number; brandId: string }> = {}
      sortedBrandsE.forEach(brandId => {
        const famMap = byBrandFamE[brandId] ?? {}
        Object.entries(famMap).forEach(([fam, nodes]) => {
          if (nodes.length < 2) return
          const sorted = nodes.slice().sort((a, b) => a.yr - b.yr)
          famToLabel[fam] = (cy.getElementById(sorted[0].id).data('label') as string) ?? ''
          famRangeE[fam] = { minYr: sorted[0].yr, maxYr: sorted[sorted.length - 1].yr, brandId }
        })
      })

      const eModelW = curXE + 40
      const eModelH = PAD_TOP_E * 2 + (eMaxYear - eMinYear) * EY_SCALE
      const eFitPad = 40
      const eCEl = cy.container(); const eCW = eCEl ? eCEl.clientWidth : 1200
      const eEstZ = Math.min((height - eFitPad*2)/eModelH, (eCW - eFitPad*2)/eModelW)
      const eEstPX = (eCW - eModelW * eEstZ) / 2
      const eEstPY = (height - eModelH * eEstZ) / 2

      const firstDecE = Math.ceil(eMinYear / 10) * 10
      const decListE: number[] = []
      for (let d = firstDecE; d <= eMaxYear + 10; d += 10) decListE.push(d)

      const bldEraE = (pY: number, z: number): EraCol[] =>
        decListE.map(d => ({
          decade: d,
          left: Math.max(0, ((PAD_TOP_E + (d - eMinYear) * EY_SCALE) * z + pY) / height * 100),
        })).filter(c => c.left < 100)

      const bldBrandsE = (pX: number, z: number, cW: number): BrandBand[] =>
        sortedBrandsE.map(bid => {
          const r = brandColRangeE[bid]; if (!r) return null
          return { brandId: bid, label: bid.charAt(0).toUpperCase() + bid.slice(1),
            color: BRAND_COLOR_E[bid] ?? '#ffffff',
            left:  Math.max(0, (r.start * z + pX) / cW * 100),
            width: Math.max(0.1, (r.end - r.start) * z / cW * 100) }
        }).filter(Boolean) as BrandBand[]

      const bldTicksE = (pY: number, z: number): YearTick[] => {
        const t2: YearTick[] = []
        for (let yr = Math.ceil(eMinYear / 5) * 5; yr <= eMaxYear; yr += 5) {
          const top = ((PAD_TOP_E + (yr - eMinYear) * EY_SCALE) * z + pY) / height * 100
          if (top > 0 && top < 100) t2.push({ year: yr, top })
        }
        return t2
      }

      const bldFamSepE = (pX: number, pY: number, z: number, cW: number): GenRow[] =>
        Object.entries(famColXE).map(([famKey, xC], idx) => {
          const range      = famRangeE[famKey]
          const color      = range ? (BRAND_COLOR_E[range.brandId] ?? '#ffffff') : '#ffffff'
          const spanTop    = range ? Math.max(0, ((PAD_TOP_E + (range.minYr - eMinYear) * EY_SCALE) * z + pY) / height * 100) : 0
          const spanHeight = range ? Math.max(0, (range.maxYr - range.minYr) * EY_SCALE * z / height * 100) : 0
          return {
            gen: idx,
            label: famToLabel[famKey] ?? '',
            color, spanTop, spanHeight,
            top:    Math.max(0, ((xC - FAM_W_E / 2) * z + pX) / cW * 100),
            height: Math.max(0.1, FAM_W_E * z / cW * 100),
          }
        }).filter(c => c.top < 100)

      const sync4E = (p: { x: number; y: number }, z: number, cW: number) => {
        setEraCols(bldEraE(p.y, z))
        setBrandBands(bldBrandsE(p.x, z, cW))
        setYearTicks(bldTicksE(p.y, z))
        setGenRows(bldFamSepE(p.x, p.y, z, cW))
      }

      applyEdgeVisibility('eras')

      const layoutE = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => nodePosE[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: eFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)
      layoutE.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? eCW
        sync4E(p, z, cw)
        // variant_of между разными колонками одного года → горизонтальные (dy≈0) → дуга
        cy.edges().forEach(e => {
          if (e.data('type') !== 'variant_of') return
          const sp = e.source().position()
          const tp = e.target().position()
          if (Math.abs(sp.y - tp.y) < 4) {
            const dx = Math.abs(tp.x - sp.x)
            e.style({
              'curve-style': 'unbundled-bezier',
              'control-point-distances': -(Math.min(72, Math.max(28, dx * 0.20))),
              'control-point-weights': 0.5,
            })
          }
        })
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          sync4E(pp, zz, cww)
        })
      })
      layoutE.run()
      sync4E({ x: eEstPX, y: eEstPY }, eEstZ, eCW)
      return
    }

    // ── Развилка: evolution tree — brand columns × depth zones ───────────────────
    if (l === 'fork') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([]); setPlatformZones([]); setPlatformHulls([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      cy.off('pan zoom')

      const BRAND_COLOR_FK: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
        'rolls-royce': '#68217a', bentley: '#0a4d2c',
        'gordon-murray': '#0e8a7d', zenvo: '#a4161a', 'de-tomaso': '#c08a3e',
        morgan: '#2e5e1e', tvr: '#4a6fa5', caterham: '#8ab500',
        ford: '#0b2e6b', hennessey: '#b33000', ssc: '#5b7a8c', saleen: '#e08a00',
        pininfarina: '#5d6d8a', 'hispano-suiza': '#147a8c', aspark: '#6f5acf',
      }
      // Год основания бренда — определяет порядок колонок (старейшие слева)
      const BRAND_FOUNDED_FK: Record<string, number> = {
        skoda:1895, 'rolls-royce':1906, audi:1909, bugatti:1909, astonmartin:1913,
        maserati:1914, bmw:1916, bentley:1919, mazda:1920, mercedes:1926,
        porsche:1931, nissan:1933, toyota:1937, volkswagen:1937, ferrari:1939,
        honda:1948, lotus:1948, seat:1950, subaru:1953, lamborghini:1963,
        mclaren:1963, lexus:1989, pagani:1992, koenigsegg:1994, rimac:2009,
        'de-tomaso':1959, zenvo:2007, 'gordon-murray':2017,
        'hispano-suiza':1904, morgan:1909, tvr:1946, caterham:1973,
        ford:1903, saleen:1983, hennessey:1991, ssc:1998, aspark:2005, pininfarina:2018,
      }
      const foundedYear = (bid: string) => BRAND_FOUNDED_FK[bid] ?? 9999

      const fkNodes = cy.nodes()
      if (fkNodes.length === 0) return

      // ── Расчёт глубины: ЕДИНЫЙ итеративный цикл (evolves + variant) с max ──────
      //  Раньше BFS по evolves_into шёл ОТДЕЛЬНО и ПЕРЕД propagation variant/
      //  derived → потомки в цепях вариантов/производных не пересчитывались после
      //  подъёма базы, и порядок поколений переворачивался (CLK W209 выше W208,
      //  X6 G06 на уровне X6 E71 и т.д.). Объединённый цикл с max это устраняет:
      //    evolves_into:  depth[t] = max(depth[t], depth[s] + 1)
      //    variant/derived/facelifted: depth[t] = max(depth[t], depth[s])
      //  Повторяем до стабилизации — variant-модель «приклеивается» к уровню базы,
      //  а её собственная evolves-цепь корректно растёт вниз от этого уровня.
      const fkDepth: Record<string, number> = {}
      const fkInDeg: Record<string, number> = {}
      fkNodes.forEach(n => { fkDepth[n.id()] = 0; fkInDeg[n.id()] = 0 })
      cy.edges().forEach(e => {
        if (e.data('type') === 'evolves_into') fkInDeg[e.target().id()] = (fkInDeg[e.target().id()] ?? 0) + 1
      })

      const fkEdgesForDepth = cy.edges().filter(e => {
        const tp = e.data('type') as string
        return tp === 'evolves_into' || tp === 'variant_of' || tp === 'derived_from' || tp === 'facelifted_to'
      })
      let fkChg = true; let fkIt = 0
      while (fkChg && fkIt < 60) {
        fkChg = false; fkIt++
        fkEdgesForDepth.forEach(e => {
          const tp = e.data('type') as string
          const s = e.source().id(), t = e.target().id()
          const cand = tp === 'evolves_into' ? (fkDepth[s] ?? 0) + 1 : (fkDepth[s] ?? 0)
          if (cand > (fkDepth[t] ?? 0)) { fkDepth[t] = cand; fkChg = true }
        })
      }
      // Концепты (concept_to_production): концепт = предшественник production,
      // ставим на поколение раньше потомка → связь короткая и наглядная.
      cy.edges().forEach(e => {
        if (e.data('type') !== 'concept_to_production') return
        const concept = e.source().id(), prod = e.target().id()
        if (fkDepth[prod] !== undefined) {
          fkDepth[concept] = Math.max(0, (fkDepth[prod] ?? 0) - 1)
        }
      })
      const maxFkDepth = Math.max(0, ...Object.values(fkDepth))

      // Group by brand
      const fkByBrand: Record<string, { id: string; depth: number; fam: string; yr: number }[]> = {}
      const getFamFK = (id: string, slug: string|undefined) => slug ?? (id.split('-').length >= 3 ? id.split('-')[0]+'-'+id.split('-')[1] : id.split('-')[0])
      fkNodes.forEach(node => {
        const bid  = (node.data('brandId')   as string) ?? 'unknown'
        const slug = (node.data('modelSlug') as string|undefined)
        const yr   = (node.data('year')      as number) ?? 1970
        if (!fkByBrand[bid]) fkByBrand[bid] = []
        fkByBrand[bid].push({ id: node.id(), depth: fkDepth[node.id()] ?? 0, fam: getFamFK(node.id(), slug), yr })
      })
      // Сортировка колонок брендов по году основания (старейшие слева → новейшие справа)
      const sortedBrandsFK = Object.keys(fkByBrand)
        .sort((a, b) => foundedYear(a) - foundedYear(b) || a.localeCompare(b))

      const LEVEL_H_FK = 140
      const NODE_W_FK  = 80
      const BRAND_GAP_FK = 40
      const PAD_FK = 70

      const fkPos: Record<string, { x: number; y: number }> = {}
      const brandRangeFK: Record<string, { startX: number; endX: number }> = {}
      let curXFK = PAD_FK

      // Body-type zone ordering + variant grouping
      const ZONE_RANK_FK: Record<string, number> = {
        hypercar:0, supercar:1, sports:2, gt_coupe:3, open_top:4,
        flagship_sed:5, exec_sed:6, midsize_sed:7, estate:8,
        suv_large:9, suv_mid:10, suv_compact:11,
        hatchback:12, electric:13, pickup:14, concept:15,
      }
      const getZoneRankFK = (nodeId: string): number => {
        const z = cy.getElementById(nodeId).data('zone') as string ?? 'other'
        return ZONE_RANK_FK[z] ?? 99
      }

      // Build variant parent map: child → parent (для группировки в ОДНУ колонку)
      // ВКЛЮЧАЕМ только:
      //   variant_of    = версия той же модели (M3, RS6) → колонка базы
      //   facelifted_to = рестайлинг той же модели (B8.5) → колонка базы
      // ИСКЛЮЧАЕМ:
      //   derived_from  = ОТДЕЛЬНАЯ производная модель (A7 от A6, X6 от X5,
      //                   Cayman от Boxster) → собственная колонка.
      //   Глубину такие модели всё равно наследуют (см. depth-propagation ниже).
      const variantParentFK: Record<string, string> = {}
      cy.edges().forEach(e => {
        if (e.data('type') === 'variant_of' || e.data('type') === 'facelifted_to') {
          const tgt = e.target().id()
          if (!variantParentFK[tgt]) variantParentFK[tgt] = e.source().id()
        }
      })

      // Follow variant chain to root base model
      const getRootFK = (id: string): string => {
        let cur = id; const seen = new Set<string>()
        while (variantParentFK[cur] && !seen.has(cur)) { seen.add(cur); cur = variantParentFK[cur] }
        return cur
      }

      // ── Build evolves_into successor map for column track assignment ─────
      const fkEvolveSucc: Record<string, string[]> = {}
      const fkEvolvePred: Record<string, string | null> = {}
      fkNodes.forEach(n => { fkEvolveSucc[n.id()] = []; fkEvolvePred[n.id()] = null })
      cy.edges().forEach(e => {
        if (e.data('type') !== 'evolves_into') return
        const s = e.source().id(), t = e.target().id()
        if (fkEvolveSucc[s]) fkEvolveSucc[s].push(t)
        if (fkEvolvePred[t] === null) fkEvolvePred[t] = s
      })

      // Find evolves_into chain root for every node (BFS)
      const fkEvolveRoot: Record<string, string> = {}
      const assignEvolveRoot = (id: string, rid: string, seen = new Set<string>()) => {
        if (seen.has(id)) return; seen.add(id)
        fkEvolveRoot[id] = rid
        ;(fkEvolveSucc[id] ?? []).forEach(c => assignEvolveRoot(c, rid, seen))
      }
      // Roots = nodes with no evolves_into predecessor
      fkNodes.filter(n => fkEvolvePred[n.id()] === null).forEach(n => assignEvolveRoot(n.id(), n.id()))

      // Column key: следуем variant→base, затем evolve→root, и ПОВТОРЯЕМ —
      // т.к. evolve-корень сам может быть вариантом (напр. AMG-цепь
      // E55→E63→E63S: evolve-корень E55 AMG — это вариант E-Class).
      // Итерируем до стабилизации, чтобы такие узлы попали в колонку базовой модели.
      const getColumnKey = (id: string): string => {
        let cur = id
        for (let i = 0; i < 10; i++) {
          const base = getRootFK(cur)              // variant_of → базовая модель
          const root = fkEvolveRoot[base] ?? base  // evolves_into → корень поколений
          if (root === cur) break
          cur = root
        }
        return cur
      }

      // ── Slot pre-pass ─────────────────────────────────────────────────────────
      //  LEFT  (slot -1, -2…) = facelifts        ← базовая модель левее
      //  CENTER (slot  0)     = base model
      //  RIGHT  (slot +1,+2…) = variants/mods    → базовая правее
      //
      //  Layout per column:
      //  [FL -2] [FL -1] [Base 0] [Var +1] [Var +2]
      //
      //  colKeyBaseX = curXFK + numFlSlots * NODE_W_FK  (база со сдвигом вправо)
      //  X(node) = colKeyBaseX + slot * NODE_W_FK
      //  Column total width = (numFl + 1 + numVar) * NODE_W_FK
      //
      //  evolves_into arrows stay vertical: all nodes in same chain share same X ✓
      const VAR_STEP_FK  = 78   // px collision-resolution (same slot+depth)
      const VAR_DROP_FK  = 72   // px единый отступ ВНИЗ для модификаций/фейслифтов от базы

      // Build id→{depth,yr} lookup
      const fkNodeById: Record<string, { depth: number; yr: number }> = {}
      sortedBrandsFK.forEach(bid => {
        ;(fkByBrand[bid] ?? []).forEach(n => { fkNodeById[n.id] = { depth: n.depth, yr: n.yr } })
      })

      // Set of all facelift chain roots (targets of facelifted_to edges)
      const flTargetIds = new Set<string>()
      cy.edges().forEach(e => {
        if (e.data('type') === 'facelifted_to') flTargetIds.add(e.target().id())
      })

      // For each columnKey: split variant chains into FL (left) and VAR (right)
      const colKeyFlRoots:  Record<string, string[]> = {}  // facelift chains → LEFT
      const colKeyVarRoots: Record<string, string[]> = {}  // variant chains  → RIGHT

      sortedBrandsFK.forEach(bid => {
        ;(fkByBrand[bid] ?? []).forEach(n => {
          if (getRootFK(n.id) === n.id) return  // skip base models
          const ck      = getColumnKey(n.id)
          const varRoot = fkEvolveRoot[n.id] ?? n.id

          // A chain goes LEFT if its root is a facelift target
          const isFaceliftChain = flTargetIds.has(varRoot)

          if (isFaceliftChain) {
            if (!colKeyFlRoots[ck]) colKeyFlRoots[ck] = []
            if (!colKeyFlRoots[ck].includes(varRoot)) colKeyFlRoots[ck].push(varRoot)
          } else {
            if (!colKeyVarRoots[ck]) colKeyVarRoots[ck] = []
            if (!colKeyVarRoots[ck].includes(varRoot)) colKeyVarRoots[ck].push(varRoot)
          }
        })
      })
      // Sort both lists by year (earlier = slot closer to base)
      const sortByYear = (arr: string[]) =>
        arr.sort((a, b) => (fkNodeById[a]?.yr ?? 9999) - (fkNodeById[b]?.yr ?? 9999))
      Object.keys(colKeyFlRoots).forEach(ck  => sortByYear(colKeyFlRoots[ck]))
      Object.keys(colKeyVarRoots).forEach(ck => sortByYear(colKeyVarRoots[ck]))

      // Dynamic level height: covers all slots vertically
      // Модификации теперь на одном Y с базой (смещение только по X), поэтому
      // высота полосы поколения НЕ зависит от числа слотов — фиксированная.
      const dynLevelH = LEVEL_H_FK

      // Slot assignment:
      //   FL  chains: slot -1, -2, …  (earlier FL = slot -1, next = -2)
      //   base model: slot  0
      //   VAR chains: slot +1, +2, …  (earlier VAR = slot +1)
      const getVariantSlot = (id: string): number => {
        if (getRootFK(id) === id) return 0
        const ck  = getColumnKey(id)
        const vr  = fkEvolveRoot[id] ?? id
        const flIdx  = (colKeyFlRoots[ck]  ?? []).indexOf(vr)
        if (flIdx >= 0) return -(flIdx + 1)           // negative → LEFT
        const varIdx = (colKeyVarRoots[ck] ?? []).indexOf(vr)
        return Math.max(0, varIdx) + 1                 // positive → RIGHT
      }

      sortedBrandsFK.forEach(bid => {
        const nodes = fkByBrand[bid] ?? []
        const brandStartX = curXFK

        // Год первого поколения линии = год корневого узла (columnKey = root цепи evolves_into)
        const colKeyYear = (ck: string): number => {
          const y = cy.getElementById(ck).data('year') as number | undefined
          return y ?? 9999
        }
        // Sort column keys by YEAR of first generation (oldest model line left → newest right)
        const sortedColKeys = (Array.from(new Set(nodes.map(n => getColumnKey(n.id)))) as string[]).sort((a, b) => {
          const ya = colKeyYear(a), yb = colKeyYear(b)
          if (ya !== yb) return ya - yb
          // tie-break: zone → family для стабильного порядка
          const za = getZoneRankFK(a), zb = getZoneRankFK(b)
          if (za !== zb) return za - zb
          const fa = getFamFK(a, cy.getElementById(a).data('modelSlug') as string|undefined) ?? ''
          const fb = getFamFK(b, cy.getElementById(b).data('modelSlug') as string|undefined) ?? ''
          return fa.localeCompare(fb)
        })

        // ── Переупорядочивание колонок относительно родителя:
        //    derived_from   → производная колонка СПРАВА (A6→A7, X5→X6, S→Maybach S)
        //    concept_to_production → концепт-колонка СЛЕВА (предшественник)
        const colSet = new Set(sortedColKeys)
        const parentRight: Record<string, string> = {}  // derived колонка → родитель (вставка справа)
        const parentLeft:  Record<string, string> = {}  // concept колонка → родитель (вставка слева)
        cy.edges().forEach(e => {
          const tp = e.data('type')
          if (tp === 'derived_from') {
            const c = getColumnKey(e.target().id()), p = getColumnKey(e.source().id())
            if (c !== p && colSet.has(c) && colSet.has(p) && !parentRight[c] && !parentLeft[c]) parentRight[c] = p
          } else if (tp === 'concept_to_production') {
            const c = getColumnKey(e.source().id()), p = getColumnKey(e.target().id())  // source=концепт
            if (c !== p && colSet.has(c) && colSet.has(p) && !parentLeft[c] && !parentRight[c]) parentLeft[c] = p
          }
        })
        const rightOf: Record<string, string[]> = {}
        const leftOf:  Record<string, string[]> = {}
        sortedColKeys.forEach(ck => {
          if (parentRight[ck]) (rightOf[parentRight[ck]] ??= []).push(ck)
          if (parentLeft[ck])  (leftOf[parentLeft[ck]]   ??= []).push(ck)
        })
        // Размещение: [концепты-слева] родитель [derived-справа], рекурсивно
        const orderedCols: string[] = []
        const placed = new Set<string>()
        const place = (ck: string) => {
          if (placed.has(ck)) return
          placed.add(ck)
          ;(leftOf[ck]  ?? []).forEach(place)  // концепты перед родителем (слева)
          orderedCols.push(ck)
          ;(rightOf[ck] ?? []).forEach(place)  // производные после родителя (справа)
        }
        sortedColKeys.forEach(ck => { if (!parentRight[ck] && !parentLeft[ck]) place(ck) })
        sortedColKeys.forEach(ck => { if (!placed.has(ck)) place(ck) })

        // Column layout: [FL-slots | base | VAR-slots]
        const colKeyBaseX: Record<string, number> = {}
        orderedCols.forEach(ck => {
          const numFl  = colKeyFlRoots[ck]?.length  ?? 0
          const numVar = colKeyVarRoots[ck]?.length ?? 0
          colKeyBaseX[ck] = curXFK + numFl * NODE_W_FK
          curXFK += (numFl + 1 + numVar) * NODE_W_FK
        })

        // Sort nodes for deterministic collision index assignment
        const slotDepthIdx: Record<string, number> = {}
        const sortedNodes = [...nodes].sort((a, b) => {
          const ckA = getColumnKey(a.id), ckB = getColumnKey(b.id)
          if (ckA !== ckB) {
            const za = getZoneRankFK(ckA), zb = getZoneRankFK(ckB)
            if (za !== zb) return za - zb
            const fa = getFamFK(ckA, cy.getElementById(ckA).data('modelSlug') as string|undefined) ?? ''
            const fb = getFamFK(ckB, cy.getElementById(ckB).data('modelSlug') as string|undefined) ?? ''
            if (fa !== fb) return fa.localeCompare(fb)
          }
          if (a.depth !== b.depth) return a.depth - b.depth
          const sA = getVariantSlot(a.id), sB = getVariantSlot(b.id)
          if (sA !== sB) return sA - sB
          return a.yr - b.yr
        })

        sortedNodes.forEach(n => {
          const ck      = getColumnKey(n.id)
          const slot    = getVariantSlot(n.id)
          // slot определяет ТОЛЬКО смещение по X:
          //   slot < 0 → фейслифты слева, slot 0 → база, slot > 0 → модификации справа
          const x       = (colKeyBaseX[ck] ?? curXFK) + slot * NODE_W_FK
          // Y: база (slot 0) — на линии поколения; ВСЕ модификации/фейслифты (slot≠0)
          //    опускаются на ОДИН И ТОТ ЖЕ отступ VAR_DROP_FK вниз (общий ряд под базой).
          //    Первая, вторая и т.д. модификации — на одинаковом уровне Y, разный X.
          const collKey = ck + ':' + slot + ':' + n.depth
          const collIdx = slotDepthIdx[collKey] ?? 0
          slotDepthIdx[collKey] = collIdx + 1
          const yDrop = slot === 0 ? 0 : VAR_DROP_FK
          const y = PAD_FK + n.depth * dynLevelH + 30 + yDrop + collIdx * VAR_STEP_FK
          fkPos[n.id] = { x, y }
        })

        brandRangeFK[bid] = { startX: brandStartX, endX: curXFK }
        curXFK += BRAND_GAP_FK
      })
      // Note: brandStartX already accounts for FL-left-slots since curXFK
      // was advanced before the first FL reservation in colKeyBaseX

      // ── «Сироты влияния»: узлы БЕЗ структурного родителя/потомка, но с сильным
      //    influenced_by (>60%) → ставим строго на Y влияющего, X сразу СПРАВА от
      //    всех его модификаций. Так ветка эволюции прослеживается, а узел не висит
      //    в ряду «Основатели» (depth 0). Напр. Purosangue←GTC4Lusso, X2←X1, iX3←i3.
      const STRUCT_FK = ['evolves_into','variant_of','derived_from','facelifted_to','concept_to_production']
      const fkStructIn:  Record<string, boolean> = {}
      const fkStructOut: Record<string, boolean> = {}
      cy.edges().forEach(e => {
        if (STRUCT_FK.includes(e.data('type') as string)) {
          fkStructIn[e.target().id()]  = true
          fkStructOut[e.source().id()] = true
        }
      })
      // сильнейший влияющий для каждой сироты (>0.60, тот же бренд, влияющий размещён)
      const fkOrphanInfl: Record<string, { src: string; str: number }> = {}
      cy.edges().forEach(e => {
        if (e.data('type') !== 'influenced_by') return
        const str = (e.data('strength') as number) ?? 0
        if (str <= 0.60) return
        const t = e.target().id(), s = e.source().id()
        if (fkStructIn[t] || fkStructOut[t]) return        // не сирота — у неё есть своя ветка
        if (!fkPos[s]) return
        if (cy.getElementById(s).data('brandId') !== cy.getElementById(t).data('brandId')) return
        if (!fkOrphanInfl[t] || str > fkOrphanInfl[t].str) fkOrphanInfl[t] = { src: s, str }
      })
      // макс X в колонке влияющего (= правее всех его модификаций)
      const fkColMaxX: Record<string, number> = {}
      Object.keys(fkPos).forEach(id => {
        const ck = getColumnKey(id)
        if (fkColMaxX[ck] === undefined || fkPos[id].x > fkColMaxX[ck]) fkColMaxX[ck] = fkPos[id].x
      })
      const fkOrphanSeq: Record<string, number> = {}  // разводим несколько сирот одного влияющего
      const fkOccupied = (x: number, y: number) =>
        Object.values(fkPos).some(p => Math.abs(p.x - x) < NODE_W_FK * 0.75 && Math.abs(p.y - y) < VAR_DROP_FK * 0.75)
      Object.entries(fkOrphanInfl).forEach(([oid, { src }]) => {
        const ck     = getColumnKey(src)
        const rightX = fkColMaxX[ck] ?? fkPos[src].x
        const y      = fkPos[src].y                 // строго Y влияющего (требование)
        const k      = fkOrphanSeq[src] ?? 0
        fkOrphanSeq[src] = k + 1
        delete fkPos[oid]                           // убираем старую (depth 0) позицию из проверки
        let x = rightX + (k + 1) * NODE_W_FK        // сразу справа от всех модификаций влияющего
        let guard = 0                               // если занято соседней колонкой — сдвигаем по X (Y неизменен)
        while (fkOccupied(x, y) && guard++ < 12) x += NODE_W_FK
        fkPos[oid] = { x, y }
      })

      const fkModelW = curXFK + PAD_FK
      const fkModelH = PAD_FK * 2 + (maxFkDepth + 1) * dynLevelH
      const fkFitPad = 50
      const fkCEl = cy.container(); const fkCW = fkCEl ? fkCEl.clientWidth : 1200
      const fkEstZ = Math.min((height - fkFitPad*2)/fkModelH, (fkCW - fkFitPad*2)/fkModelW)
      const fkEstPX = (fkCW - fkModelW * fkEstZ) / 2
      const fkEstPY = (height - fkModelH * fkEstZ) / 2

      const D_RU_FK = ['Основатели','2-е пок.','3-е пок.','4-е пок.','5-е пок.','6-е пок.','7-е пок.','8-е пок.','9-е пок.','10+']
      const D_EN_FK = ['Founders','Gen 2','Gen 3','Gen 4','Gen 5','Gen 6','Gen 7','Gen 8','Gen 9','Gen 10+']

      const bldFkBrands = (pX: number, z: number, cW: number): BrandBand[] =>
        sortedBrandsFK.map(bid => {
          const r = brandRangeFK[bid]; if (!r) return null
          return { brandId: bid, label: bid.charAt(0).toUpperCase() + bid.slice(1),
            color: BRAND_COLOR_FK[bid] ?? '#ffffff',
            left:  Math.max(0, (r.startX * z + pX) / cW * 100),
            width: Math.max(0.2, (r.endX - r.startX) * z / cW * 100) }
        }).filter(Boolean) as BrandBand[]

      const bldFkDepth = (pY: number, z: number): GenRow[] =>
        Array.from({ length: maxFkDepth + 1 }, (_, d) => ({
          gen: d,
          label: (locale === 'ru' ? D_RU_FK : D_EN_FK)[d] ?? ('Gen ' + (d+1)),
          top:    Math.max(0, ((PAD_FK + d * dynLevelH) * z + pY) / height * 100),
          height: Math.max(0.5, dynLevelH * z / height * 100),
        })).filter(r => r.top < 100)

      const syncFkOverlay = (p: { x: number; y: number }, z: number, cW: number) => {
        setBrandBands(bldFkBrands(p.x, z, cW))
        setGenRows(bldFkDepth(p.y, z))
      }

      applyEdgeVisibility('fork')

      // ── Развод endpoints: несколько стрелок к одному узлу целятся в РАЗНЫЕ
      //    точки контура (по направлению к источнику), а не в одну точку.
      const distributeFkEndpoints = () => {
        cy.batch(() => {
          cy.nodes().forEach(node => {
            const pos = node.position()
            const r = ((node.width() as number) || 66) / 2
            // видимые входящие рёбра (кроме влияния — у него своя дуга сверху)
            const inc = node.connectedEdges().filter(e =>
              e.target().id() === node.id() && e.style('display') !== 'none' &&
              e.data('type') !== 'influenced_by'
            )
            if (inc.length < 2) {
              inc.forEach(e => e.removeStyle('target-endpoint'))  // одно ребро — дефолт
              return
            }
            // угол к источнику каждого ребра, сортируем
            const arr = inc.map(e => {
              const sp = e.source().position()
              return { e, ang: Math.atan2(sp.y - pos.y, sp.x - pos.x) }
            }).sort((a, b) => a.ang - b.ang)
            // анти-коллизия: раздвигаем близкие углы (< 0.4 rad ≈ 23°)
            const MIN = 0.4
            for (let i = 1; i < arr.length; i++) {
              if (arr[i].ang - arr[i - 1].ang < MIN) arr[i].ang = arr[i - 1].ang + MIN
            }
            arr.forEach(({ e, ang }) => {
              const x = (r * Math.cos(ang)).toFixed(1)
              const y = (r * Math.sin(ang)).toFixed(1)
              e.style('target-endpoint', `${x}px ${y}px`)
            })
          })
        })
      }

      // ── Дуга влияния: от ВЕРХНЕЙ точки контура влияющего к ВЕРХНЕЙ точке
      //    контура цели, выгибаясь вверх. Только видимые (сильные >60%) рёбра.
      const styleInfluenceArcs = () => {
        cy.batch(() => {
          cy.edges('[type = "influenced_by"]').forEach(e => {
            if (e.style('display') === 'none') return
            const s = e.source(), t = e.target()
            const rs = (((s.width() as number) || 66) / 2)
            const rt = (((t.width() as number) || 66) / 2)
            const sp = s.position(), tp = t.position()
            const ARC  = 78                               // высота выгиба дуги, px
            const dist = (tp.x >= sp.x ? -1 : 1) * ARC    // всегда выгибается ВВЕРХ
            e.style({
              'curve-style': 'unbundled-bezier',
              'source-endpoint': `0px ${(-rs).toFixed(1)}px`,   // верх контура влияющего
              'target-endpoint': `0px ${(-rt).toFixed(1)}px`,   // верх контура цели
              'control-point-distances': `${dist}`,
              'control-point-weights': '0.5',
            })
          })
        })
      }

      // ── Дуга variant_of: вариант (S/RS/M/GT/Spider) на той же глубине (тот же Y)
      //    что и база → горизонтальное ребро → дуга, как в «Мощности» и «Арене».
      const styleVariantArcs = () => {
        cy.edges('[type = "variant_of"]').forEach(e => {
          if (e.style('display') === 'none') return
          const sp = e.source().position()
          const tp = e.target().position()
          if (Math.abs(sp.y - tp.y) < 4) {
            const dx = Math.abs(tp.x - sp.x)
            e.style({
              'curve-style': 'unbundled-bezier',
              'control-point-distances': -(Math.min(72, Math.max(28, dx * 0.20))),
              'control-point-weights': 0.5,
            })
          }
        })
      }

      // ── Дуга «производный от»: производная модель в своей колонке справа, на ТОЙ
      //    ЖЕ глубине (тот же Y). Дуга от верха родителя к верху производной,
      //    выгибаясь вверх — наглядное ответвление ветки (288 GTO←308, Gallardo←
      //    Murciélago, Cayman←Boxster, A7←A6 и т.д.).
      const styleDerivedArcs = () => {
        cy.batch(() => {
          cy.edges('[type = "derived_from"]').forEach(e => {
            if (e.style('display') === 'none') return
            const s = e.source(), t = e.target()
            const rs = (((s.width() as number) || 66) / 2)
            const rt = (((t.width() as number) || 66) / 2)
            const sp = s.position(), tp = t.position()
            const ARC  = 60
            const dist = (tp.x >= sp.x ? -1 : 1) * ARC    // всегда выгибается ВВЕРХ
            e.style({
              'curve-style': 'unbundled-bezier',
              'source-endpoint': `0px ${(-rs).toFixed(1)}px`,   // верх контура родителя
              'target-endpoint': `0px ${(-rt).toFixed(1)}px`,   // верх контура производной
              'control-point-distances': `${dist}`,
              'control-point-weights': '0.5',
            })
          })
        })
      }

      const fkLayout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => fkPos[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: fkFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)
      fkLayout.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? fkCW
        syncFkOverlay(p, z, cw)
        distributeFkEndpoints()
        styleInfluenceArcs()
        styleDerivedArcs()
        styleVariantArcs()
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          syncFkOverlay(pp, zz, cww)
        })
      })
      fkLayout.run()
      syncFkOverlay({ x: fkEstPX, y: fkEstPY }, fkEstZ, fkCW)
      return
    }

    // ── Арена v4: BRAND COMPETITION TRACKS ───────────────────────────────────
    //  Принцип: одна горизонтальная дорожка на БРЕНД внутри каждого сегмента.
    //  X = год (одинаковый масштаб для всего графа).
    //  Конкуренция видна вертикально: BMW E60 (2003) vs Mercedes W211 (2002) —
    //  один год, разные дорожки одного сегмента.
    if (l === 'sync') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([]); setPlatformZones([]); setPlatformHulls([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      const cyNodes = cy.nodes()
      const sYears = cyNodes.map(n => n.data('year') as number).filter(Boolean)
      if (sYears.length === 0) return

      const sMinYear = Math.min(...sYears)
      const sMaxYear = Math.max(...sYears)

      const X_SCALE   = 70    // px per year
      const TRACK_H   = 80    // px per brand track (1 row baseline)
      const SUB_ROW_H = 56    // px per extra sub-row within track (same brand, same year clash)
      const SEG_GAP   = 36    // px between competitive segments
      const PAD_LEFT  = 0
      const PAD_TOP   = 40

      // ── Competitive segments ─────────────────────────────────────────────────
      const COMP_ZONES: { key: string; label: string; labelRu: string; color: string; zones: string[] }[] = [
        { key: 'hyper',    label: 'Hypercars',       labelRu: 'Гиперкары',        color: '#ffd700', zones: ['hypercar'] },
        { key: 'super',    label: 'Supercars',        labelRu: 'Суперкары',        color: '#ff2800', zones: ['supercar'] },
        { key: 'sports',   label: 'Sports Cars',      labelRu: 'Спорткары',        color: '#ff9500', zones: ['sports','gt_coupe'] },
        { key: 'open',     label: 'Open Top',         labelRu: 'Кабриолеты',       color: '#e879f9', zones: ['open_top'] },
        { key: 'flagship', label: 'Flagship Sedans',  labelRu: 'Флагманы',         color: '#a78bfa', zones: ['flagship_sed'] },
        { key: 'exec',     label: 'Executive Sedans', labelRu: 'Бизнес-класс',     color: '#38bdf8', zones: ['exec_sed'] },
        { key: 'compact',  label: 'Premium Compact',  labelRu: 'Компакт Премиум',  color: '#4ade80', zones: ['midsize_sed'] },
        { key: 'suv_l',    label: 'Large SUVs',       labelRu: 'Крупные SUV',      color: '#f97316', zones: ['suv_large'] },
        { key: 'suv_m',    label: 'Mid SUVs',         labelRu: 'Средние SUV',      color: '#fb923c', zones: ['suv_mid'] },
        { key: 'suv_s',    label: 'Compact SUVs',     labelRu: 'Компакт SUV',      color: '#fbbf24', zones: ['suv_compact'] },
        { key: 'hatch',    label: 'Hatchbacks',       labelRu: 'Хэтчбеки',         color: '#34d399', zones: ['hatchback'] },
        { key: 'ev',       label: 'Electric',         labelRu: 'Электро',          color: '#22d3ee', zones: ['electric'] },
        { key: 'other',    label: 'Other',            labelRu: 'Прочее',           color: '#64748b', zones: [] },
      ]
      const getCompZone = (z: string | undefined): string => {
        if (!z) return 'other'
        for (const cz of COMP_ZONES) if (cz.zones.includes(z)) return cz.key
        return 'other'
      }

      // Brand colors + priority order (determines top-to-bottom order within segment)
      const BRAND_COLOR: Record<string, string> = {
        ferrari: '#ff2800', lamborghini: '#e6b800', mclaren: '#FF8000',
        bugatti: '#9333ea', koenigsegg: '#FFD700', pagani: '#c9a96e',
        rimac: '#00CFFF',
        porsche: '#ffd700', astonmartin: '#006A4E',
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
        toyota: '#eb0a1e', lexus: '#8B6914', honda: '#cc0000',
        nissan: '#c3002f', mazda: '#910f22', subaru: '#003399',
      }
      const BRAND_ORDER = [
        'ferrari','lamborghini','mclaren','bugatti','koenigsegg','pagani','rimac',
        'porsche','astonmartin',
        'bmw','mercedes','audi','maserati','lotus',
        'toyota','lexus','honda','nissan','mazda','subaru',
        'volkswagen','seat','skoda',
      ]
      const brandRank = (bid: string) => {
        const i = BRAND_ORDER.indexOf(bid)
        return i < 0 ? 999 : i
      }

      // ── 1. Collect nodes ──────────────────────────────────────────────────────
      type SN4 = { id: string; yr: number; brandId: string; seg: string }
      const allSN: SN4[] = []
      cyNodes.forEach(n => {
        allSN.push({
          id: n.id(),
          yr: (n.data('year') as number) ?? sMinYear,
          brandId: (n.data('brandId') as string) ?? 'unknown',
          seg: getCompZone(n.data('zone') as string|undefined),
        })
      })

      // ── 2. Group: segment → brand → [nodes] ──────────────────────────────────
      const bySegBrand: Record<string, Record<string, SN4[]>> = {}
      allSN.forEach(sn => {
        if (!bySegBrand[sn.seg]) bySegBrand[sn.seg] = {}
        if (!bySegBrand[sn.seg][sn.brandId]) bySegBrand[sn.seg][sn.brandId] = []
        bySegBrand[sn.seg][sn.brandId].push(sn)
      })

      // ── 3. Position nodes — one BRAND TRACK per brand per segment ────────────
      const syncPos4: Record<string, { x: number; y: number }> = {}
      const segBands4: { label: string; color: string; top: number; height: number }[] = []
      type BrandTrack = { label: string; color: string; top: number }
      const brandTracks: BrandTrack[] = []

      let curY4 = PAD_TOP

      COMP_ZONES.forEach(cz => {
        const brands = bySegBrand[cz.key]
        if (!brands || Object.keys(brands).length === 0) return

        const segTop = curY4
        // Sort brands by priority order
        const sortedBrands = Object.keys(brands).sort((a, b) => brandRank(a) - brandRank(b))

        sortedBrands.forEach(bid => {
          const nodes = brands[bid].sort((a, b) => a.yr - b.yr)
          const trackTop = curY4
          const bColor = BRAND_COLOR[bid] ?? '#888888'

          // Greedy sub-row allocation (prevent node overlap within same brand track)
          const subMaxX: number[] = []
          nodes.forEach(({ id, yr }) => {
            const xBase = PAD_LEFT + (yr - sMinYear) * X_SCALE
            let sub = 0
            while (sub < subMaxX.length && subMaxX[sub] > xBase - 70) sub++
            subMaxX[sub] = xBase
            const trackCY = trackTop + TRACK_H / 2 + sub * SUB_ROW_H
            syncPos4[id] = { x: xBase, y: trackCY }
          })

          const rowsUsed = Math.max(1, subMaxX.length)
          const trackH = TRACK_H + (rowsUsed - 1) * SUB_ROW_H

          brandTracks.push({ label: bid.toUpperCase(), color: bColor, top: trackTop + TRACK_H / 2 })
          curY4 += trackH
        })

        segBands4.push({
          label: locale === 'ru' ? cz.labelRu : cz.label,
          color: cz.color,
          top: segTop,
          height: curY4 - segTop,
        })
        curY4 += SEG_GAP
      })

      // ── 4. Edges: only same-brand evolves_into/variant_of/facelifted_to ────────
      const snById: Record<string, SN4> = {}
      allSN.forEach(s => { snById[s.id] = s })
      cy.edges().forEach(e => {
        const type   = e.data('type') as string
        const srcSeg = snById[e.source().id()]?.seg
        const tgtSeg = snById[e.target().id()]?.seg
        const srcBid = snById[e.source().id()]?.brandId
        const tgtBid = snById[e.target().id()]?.brandId
        const sameBrand   = srcBid === tgtBid
        const sameSeg     = srcSeg === tgtSeg
        const mainType    = ['evolves_into','variant_of'].includes(type)
        const softType    = type === 'facelifted_to' || type === 'derived_from'
        if (sameBrand && sameSeg && mainType)    e.style({ opacity: 0.90, display: 'element' })
        else if (sameBrand && softType)           e.style({ opacity: 0.55, display: 'element' })
        else                                      e.style({ opacity: 0.0,  display: 'none'    })
      })

      // ── 5. Color nodes by brand ───────────────────────────────────────────────
      cyNodes.forEach(n => {
        const col = BRAND_COLOR[n.data('brandId') as string ?? ''] ?? '#F97316'
        n.style({
          'border-color': col, 'border-width': 3.5, 'border-opacity': 1,
          'background-color': col + '28',
        })
      })

      // ── 6. Overlay builders ───────────────────────────────────────────────────
      const sModelW = (sMaxYear - sMinYear) * X_SCALE + 120
      const sModelH = curY4 + PAD_TOP
      const sFitPad = 30
      const sCEl = cy.container(); const sCW = sCEl ? sCEl.clientWidth : 1200
      const sEstZ  = Math.min((height - sFitPad*2)/sModelH, (sCW - sFitPad*2)/sModelW)
      const sEstPX = (sCW - sModelW * sEstZ) / 2
      const sEstPY = (height - sModelH * sEstZ) / 2

      const buildArenaOverlay = (pY: number, pX: number, z: number, cW: number): void => {
        // Segment bands → engineBands
        setEngineBands(segBands4.map(b => ({
          label: b.label, color: b.color,
          top:    Math.max(0, (b.top    * z + pY) / height * 100),
          height: Math.max(0.3, b.height * z / height * 100),
        })))
        // Year ticks every 5 years → hpLines
        const lines: { hp: number; left: number }[] = []
        for (let yr = Math.ceil(sMinYear/5)*5; yr <= sMaxYear; yr += 5) {
          const left = ((PAD_LEFT + (yr - sMinYear) * X_SCALE) * z + pX) / cW * 100
          if (left > 0 && left < 100) lines.push({ hp: yr, left })
        }
        setHpLines(lines)
        // Brand track labels → genRows
        setGenRows(brandTracks.map((bt, i) => ({
          gen: i,
          label: bt.label,
          top:    Math.max(0, (bt.top * z + pY) / height * 100),
          height: 1,
        })))
      }

      const sLayout4 = cy.layout({
        name: 'preset',
        positions: (n: cytoscape.NodeSingular) => syncPos4[n.id()] ?? { x: 0, y: 0 },
        fit: true, padding: sFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)

      sLayout4.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? sCW
        buildArenaOverlay(p.y, p.x, z, cw)
        // Рёбра в одном Y-треке (dy < 4px) → дуга, как в «Мощности».
        // evolves_into — горизонтальные линии эволюции (один трек, разные годы).
        // variant_of   — варианты одного года в том же треке.
        cy.edges().forEach(e => {
          const type = e.data('type') as string
          if (!['evolves_into', 'variant_of'].includes(type)) return
          const sp = e.source().position()
          const tp = e.target().position()
          if (Math.abs(sp.y - tp.y) < 4) {
            const dx = Math.abs(tp.x - sp.x)
            e.style({
              'curve-style': 'unbundled-bezier',
              'control-point-distances': -(Math.min(72, Math.max(28, dx * 0.20))),
              'control-point-weights': 0.5,
            })
          }
        })
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          buildArenaOverlay(pp.y, pp.x, zz, cww)
        })
      })
      sLayout4.run()
      buildArenaOverlay(sEstPY, sEstPX, sEstZ, sCW)
      return
    }

    // Reset all overlays for standard layouts
    // Restore node/edge styles (fork layout dims non-active brand)
    cy.nodes().removeStyle()
    cy.edges().removeStyle()

    setEraCols([]); setGenRows([]); setBrandBands([]); setYearTicks([])
    setEngineBands([]); setHpLines([])
    cy.off('pan zoom')

    if (l === 'timeline') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      // ── Chronological preset: each model family gets its own row ────────
      const cyNodes = cy.nodes()
      const years = cyNodes.map(n => n.data('year') as number).filter(Boolean)
      if (years.length === 0) { cy.layout(getLayoutConfig('dagre') as cytoscape.LayoutOptions).run(); return }

      const minYear = Math.min(...years)
      const maxYearE2 = Math.max(...years)
      const yearRangeE2 = Math.max(1, maxYearE2 - minYear)

      // Dynamic X_SCALE: target ~2800px, min 14px/yr, max 44px/yr
      const X_SCALE   = Math.min(44, Math.max(14, Math.round(2800 / yearRangeE2)))
      const ROW_H     = 72   // уплотнено
      const BRAND_GAP = 18
      const PADDING   = 50

      // Derive a stable family key from modelSlug or node ID
      const getFamilyKey = (nodeId: string, modelSlug: string | undefined): string => {
        if (modelSlug) return modelSlug
        const p = nodeId.split('-')
        // 3+ parts: "bmw-m3-e30" → "bmw-m3", "lotus-elise-s1" → "lotus-elise"
        if (p.length >= 3) return `${p[0]}-${p[1]}`
        // 2 parts: "merc-w123" → "merc", "p911-901" → "p911"
        return p[0]
      }

      // Collect brands in encounter order
      const brandOrder: string[] = []
      const brandSeen = new Set<string>()
      cyNodes.forEach(n => {
        const b = (n.data('brandId') as string) ?? 'unknown'
        if (!brandSeen.has(b)) { brandSeen.add(b); brandOrder.push(b) }
      })

      // Group nodes by brand → family; record earliest year per family for ordering
      type FNode = { id: string; year: number }
      const byBrandFamily: Record<string, Record<string, FNode[]>> = {}
      const familyMinYear: Record<string, number> = {}

      cyNodes.forEach(node => {
        const brandId   = (node.data('brandId')   as string)           ?? 'unknown'
        const year      = (node.data('year')       as number)           ?? minYear
        const modelSlug = (node.data('modelSlug')  as string|undefined)
        const family    = getFamilyKey(node.id(), modelSlug)

        if (!byBrandFamily[brandId]) byBrandFamily[brandId] = {}
        if (!byBrandFamily[brandId][family]) byBrandFamily[brandId][family] = []
        byBrandFamily[brandId][family].push({ id: node.id(), year })

        if (familyMinYear[family] === undefined || year < familyMinYear[family])
          familyMinYear[family] = year
      })

      const nodePos: Record<string, { x: number; y: number }> = {}
      let currentY = PADDING

      brandOrder.forEach((brandId, brandIdx) => {
        const families = byBrandFamily[brandId] ?? {}
        // Sort families by their earliest node year
        const sortedFamilies = Object.keys(families)
          .sort((a, b) => (familyMinYear[a] ?? 0) - (familyMinYear[b] ?? 0))

        sortedFamilies.forEach(family => {
          const nodes = families[family].sort((a, b) => a.year - b.year)
          nodes.forEach(({ id, year }) => {
            nodePos[id] = {
              x: PADDING + (year - minYear) * X_SCALE,
              y: currentY,
            }
          })
          currentY += ROW_H
        })

        // Extra gap after each brand (except last)
        if (brandIdx < brandOrder.length - 1) currentY += BRAND_GAP
      })

      setZoneLabels([])
      setDecadeLines([])
      cy.off('pan zoom')
      cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => nodePos[node.id()] ?? { x: 0, y: 0 },
        fit: true,
        padding: 60,
        animate: true,
        animationDuration: 700,
      } as cytoscape.LayoutOptions).run()
      return
    }

    // ── Типаж v3: МАТРИЦА ДИЗАЙН-ЭПОХ ─────────────────────────────────────────
    //  Философия: "Как менялся дизайн каждого архетипа кузова от десятилетия к десятилетию?"
    //
    //  Ось X = ДЕКАДА (дизайнерская эра: 1960е, 1970е, ...)
    //  Ось Y = ЗОНА (архетип кузова: суперкар, спорт, седан, SUV...)
    //
    //  Стрелки evolves_into идут горизонтально внутри своей зоны →
    //  видна непрерывная линия дизайн-преемственности:
    //  Ferrari 250 GT → 308 → 328 → 348 → F355 → 360 → F430 → 488 → F8
    //
    //  Цвет узла = бренд. Форма контура: ─── base / ╌╌╌ facelift / ─·─ variant
    if (l === 'zone') {
      const cyNodes = cy.nodes()
      if (cyNodes.length === 0) { cy.layout(getLayoutConfig('dagre') as cytoscape.LayoutOptions).run(); return }

      const allYears = cyNodes.map(n => n.data('year') as number).filter(Boolean)
      if (allYears.length === 0) { cy.layout(getLayoutConfig('dagre') as cytoscape.LayoutOptions).run(); return }

      const minDecade = Math.floor(Math.min(...allYears) / 10) * 10
      const maxDecade = Math.floor(Math.max(...allYears) / 10) * 10

      // ── Константы ──────────────────────────────────────────────────────────
      //  Название модели ВНУТРИ узла. Узел: круг 66 / пятиугольник 70 → R габарита 35.
      //  ГОРИЗОНТАЛЬНЫЕ зоны (полосы по Y), декады = колонки (X).
      //  Модели в ячейке (зона×декада) компонуются СЕТКОЙ GRID_COLS × rows.
      const NODE_R    = 35   // радиус габарита узла (макс — пятиугольник 70/2)
      const CELL_STEP = 84   // шаг сетки (оба направления): узел 70 + 14 воздух
      const ZONE_PAD  = 12   // отступ от границы зоны до края узла (низ)
      const HEADER_H  = 54   // строка заголовка зоны (метка + чипы брендов) — узлы заметно ниже
      const ZONE_GAP  = 16   // зазор между зонами
      const DECADE_PAD = 14  // отступ внутри декадной колонки
      const PAD_L     = 56
      const PAD_T     = 48
      const containerW = cy.container()?.clientWidth ?? 1200

      const BRAND_COLOR2: Record<string, string> = {
        ferrari:'#ff2800', lamborghini:'#e6b800', mclaren:'#FF8000',
        bugatti:'#9333ea', koenigsegg:'#FFD700', pagani:'#c9a96e', rimac:'#00CFFF',
        porsche:'#ffd700', astonmartin:'#006A4E',
        bmw:'#00d4ff', mercedes:'#b8b8b8', audi:'#e84040',
        maserati:'#1a4fc4', lotus:'#c8e228',
        toyota:'#eb0a1e', lexus:'#8B6914', honda:'#cc0000',
        nissan:'#c3002f', mazda:'#910f22', subaru:'#003399',
        volkswagen:'#3d7bd6', seat:'#fa0000', skoda:'#4ba82e',
      }

      // ── Группировка: zone → decade → nodes ────────────────────────────────
      const ZONE_ORDER = BODY_TYPE_ZONES.map(z => z.key)
      type ZNode3 = { id: string; yr: number; brand: string }
      const byZoneDecade: Record<string, Record<number, ZNode3[]>> = {}

      cyNodes.forEach(n => {
        const zone   = (n.data('zone')    as string) ?? 'midsize_sed'
        const yr     = (n.data('year')    as number) ?? 2000
        const brand  = (n.data('brandId') as string) ?? ''
        const decade = Math.floor(yr / 10) * 10
        if (!byZoneDecade[zone]) byZoneDecade[zone] = {}
        if (!byZoneDecade[zone][decade]) byZoneDecade[zone][decade] = []
        byZoneDecade[zone][decade].push({ id: n.id(), yr, brand })
      })

      // Сортировка внутри ячейки по году (читаемые горизонтальные стрелки)
      Object.values(byZoneDecade).forEach(byDec =>
        Object.values(byDec).forEach(arr => arr.sort((a, b) => a.yr - b.yr))
      )

      // Приоритет брендов: определяет порядок строк внутри зоны (сверху вниз)
      const BRANK: Record<string, number> = {
        ferrari:0, lamborghini:1, mclaren:2, bugatti:3, koenigsegg:4, pagani:5, rimac:6,
        astonmartin:7, porsche:8,
        bmw:9, mercedes:10, audi:11, maserati:12, lotus:13,
        toyota:14, lexus:15, honda:16, nissan:17, mazda:18, subaru:19,
        volkswagen:20, seat:21, skoda:22,
      }

      // ── Для каждой зоны: собрать ВСЕ бренды присутствующие хоть в одной декаде
      //    Порядок этих брендов = фиксированные строки зоны (brand tracks)
      const zoneBrandOrder: Record<string, string[]> = {}
      ZONE_ORDER.forEach(zk => {
        const byDec = byZoneDecade[zk]
        if (!byDec) return
        const brands = new Set<string>()
        Object.values(byDec).forEach(arr => arr.forEach(n => brands.add(n.brand)))
        zoneBrandOrder[zk] = Array.from(brands).sort(
          (a, b) => (BRANK[a] ?? 99) - (BRANK[b] ?? 99)
        )
      })

      // ГОРИЗОНТАЛЬНЫЕ зоны (полосы по Y), декады = колонки (X).
      //  Модели в ячейке (зона×декада) компонуются СЕТКОЙ GRID_COLS × rows.

      // ── Макс. число моделей в одной ячейке (зона×декада) ───────────────────
      let maxCellTotal = 1
      Object.values(byZoneDecade).forEach(byDec =>
        Object.values(byDec).forEach(arr => {
          if (arr.length > maxCellTotal) maxCellTotal = arr.length
        })
      )
      // Колонки сетки: квадратная компоновка, ограничена 4 в ряд (3×3, 4×4…)
      const GRID_COLS = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(maxCellTotal))))
      const DECADE_W  = DECADE_PAD * 2 + GRID_COLS * CELL_STEP  // ширина декадной колонки

      // ── Расстановка позиций ────────────────────────────────────────────────
      const nodePos3: Record<string, { x: number; y: number }> = {}
      const zoneBands: ZoneLabel[] = []
      let curY = PAD_T

      ZONE_ORDER.forEach(zoneKey => {
        const byDec = byZoneDecade[zoneKey]
        if (!byDec || !Object.keys(byDec).length) return

        const zoneMeta  = BODY_TYPE_ZONES.find(z => z.key === zoneKey)
        const zoneTopY  = curY

        // Высота зоны = заголовок + макс. число рядов сетки + нижний отступ
        const maxRowsZone = Math.max(
          ...Object.values(byDec).map(arr => Math.ceil(arr.length / GRID_COLS))
        )
        const zoneH = HEADER_H + (maxRowsZone - 1) * CELL_STEP + NODE_R * 2 + ZONE_PAD

        // Для каждой декады: модели в сетку GRID_COLS × rows
        Object.keys(byDec).map(Number).forEach(decade => {
          const cell    = byDec[decade] ?? []
          const decLeftX = PAD_L + ((decade - minDecade) / 10) * DECADE_W

          // Сортировка: бренд (приоритет) → год → модели одного бренда рядом
          const sorted = [...cell].sort((a, b) =>
            ((BRANK[a.brand] ?? 99) - (BRANK[b.brand] ?? 99)) || (a.yr - b.yr)
          )

          // Центрируем сетку по ширине декадной колонки
          const usedCols = Math.min(GRID_COLS, sorted.length)
          const gridW    = (usedCols - 1) * CELL_STEP
          const startX   = decLeftX + DECADE_W / 2 - gridW / 2

          sorted.forEach(({ id }, idx) => {
            const col = idx % GRID_COLS
            const row = Math.floor(idx / GRID_COLS)
            nodePos3[id] = {
              x: startX + col * CELL_STEP,
              y: zoneTopY + HEADER_H + NODE_R + row * CELL_STEP,  // узлы НИЖЕ строки заголовка
            }
          })
        })

        if (zoneMeta) {
          // ── Межбрендовая аналитика: топ брендов по числу моделей в зоне ──────
          const brandCount: Record<string, number> = {}
          Object.values(byDec).forEach(arr =>
            arr.forEach(nd => { brandCount[nd.brand] = (brandCount[nd.brand] ?? 0) + 1 })
          )
          const stats: ZoneStat[] = Object.entries(brandCount)
            .map(([brand, count]) => ({ brand, count, color: BRAND_COLOR2[brand] ?? '#888' }))
            .sort((a, b) => b.count - a.count)   // по убыванию доминирования
            .slice(0, 5)                          // топ-5 брендов сегмента

          zoneBands.push({
            key: zoneKey,
            label: locale === 'ru' ? zoneMeta.labelRu : zoneMeta.label,
            color: zoneMeta.color,
            top:    zoneTopY,    // горизонтальная полоса (Y)
            height: zoneH,
            stats,
          })
        }
        curY += zoneH + ZONE_GAP
      })

      // ── Цвет контура = бренд ───────────────────────────────────────────────
      cyNodes.forEach(n => {
        const col = BRAND_COLOR2[n.data('brandId') as string ?? ''] ?? '#F97316'
        n.style({ 'border-color': col, 'border-width': 3 })
      })

      // ── Связи СКРЫТЫ: Типаж = классификационная матрица, не родословная.
      //    Генеалогия живёт в Древе/Династии; здесь связи дублировали бы их
      //    и создавали визуальный шум поверх grid-сетки.
      cy.edges().forEach(e => { e.style({ opacity: 0, display: 'none' }) })

      // ── Размеры модели ───────────────────────────────────────────────────
      const decadeCount = (maxDecade - minDecade) / 10 + 1
      const modelW = PAD_L * 2 + decadeCount * DECADE_W
      const modelH = curY + PAD_T
      const FIT_PAD = 50
      const scaleH = (height - FIT_PAD * 2) / Math.max(1, modelH)
      const scaleW = (containerW - FIT_PAD * 2) / Math.max(1, modelW)
      const estZ   = Math.min(scaleH, scaleW)
      const estPX  = (containerW - modelW * estZ) / 2
      const estPY  = (height     - modelH * estZ) / 2 + FIT_PAD / 2

      // Зональные полосы (горизонтальные): top/height в % от высоты контейнера
      const convBands3 = (pY: number, z: number): ZoneLabel[] =>
        zoneBands.map(b => ({
          ...b,
          top:    Math.max(0, (b.top    * z + pY) / height * 100),
          height: Math.max(0.3, b.height * z / height * 100),
        }))

      // Декадные линии (вертикальные): left в % от ширины контейнера
      const buildDecadeLines3 = (pX: number, z: number, cW: number): DecadeLine[] => {
        const lines: DecadeLine[] = []
        for (let d = minDecade; d <= maxDecade + 10; d += 10) {
          const left = ((PAD_L + ((d - minDecade) / 10) * DECADE_W) * z + pX) / cW * 100
          if (left > 0 && left < 100) lines.push({ year: d, left })
        }
        return lines
      }

      const zLayout3 = cy.layout({
        name: 'preset',
        positions: (n: cytoscape.NodeSingular) => nodePos3[n.id()] ?? { x: 0, y: 0 },
        fit: true, padding: FIT_PAD, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)

      decadeModelRef.current = null
      setGenRows([])

      zLayout3.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cW = cy.container()?.clientWidth ?? containerW
        setZoneLabels(convBands3(p.y, z))
        setDecadeLines(buildDecadeLines3(p.x, z, cW))
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cW
          setZoneLabels(convBands3(pp.y, zz))
          setDecadeLines(buildDecadeLines3(pp.x, zz, cww))
        })
      })
      zLayout3.run()
      setZoneLabels(convBands3(estPY, estZ))
      setDecadeLines(buildDecadeLines3(estPX, estZ, containerW))
      return
    }

    setZoneLabels([]); setDecadeLines([])
    setEngineBands([]); setHpLines([])
    setEraCols([]); setGenRows([])
    cy.off('pan zoom')
    cy.layout(getLayoutConfig(l) as cytoscape.LayoutOptions).run()
  }, [locale, height])

  // Sync layout prop from parent whenever it changes
  useEffect(() => {
    handleLayoutChange(layout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // Пересобрать раскладку при смене ОТФИЛЬТРОВАННОГО набора (бренд/год/тип/поиск).
  // Раскладки с ручными позициями (cola/fork/zone/eras/sync) НЕ перестраиваются
  // сами при замене elements — у них getLayoutConfig = preset БЕЗ позиций, поэтому
  // новые узлы валятся в (0,0) и fit зумит в один гигантский узел (баг «не
  // строится в Мощности»). Их надо явно пересчитать через handleLayoutChange.
  // dagre/cose перераскладываются react-cytoscapejs автоматически по layout-пропу.
  // Зависим от ССЫЛОК data.nodes/data.edges (родитель мемоизирует) → срабатывает и
  // при смене бренда на другой с тем же числом узлов. Раскладку берём из ref —
  // не подписываемся на activeLayout, чтобы переключение layout не дублировало прогон.
  useEffect(() => {
    if (!cyRef.current || data.nodes.length === 0) return
    const lyt = activeLayoutRef.current
    const manualPos = lyt === 'cola' || lyt === 'fork' || lyt === 'eras' || lyt === 'sync' || lyt === 'zone'
    if (!manualPos) return  // dagre/cose: автоматически по layout-пропу
    const delay = lyt === 'cola' ? 160 : 360  // тяжёлые preset — чуть позже (защита от частых ре-триггеров)
    const timer = setTimeout(() => {
      if (cyRef.current) handleLayoutChange(activeLayoutRef.current)
    }, delay)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.nodes, data.edges])

  // Toggle node labels via Cytoscape style
  useEffect(() => {
    if (!cyRef.current) return
    cyRef.current.nodes().style('label', showLabels ? 'data(label)' : '')
  }, [showLabels])

  if (!data || data.nodes.length === 0) {
    return (
      <div
        className={`w-full rounded-2xl border border-white/8 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <Circle className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/30">{locale === 'ru' ? 'Нет данных для отображения' : 'No evolution data available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full rounded-2xl overflow-hidden border border-white/10 ${className}`}
      style={{ height }}>

      {/* Cytoscape */}
      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET as cytoscape.StylesheetJson}
        layout={layoutConfig as cytoscape.LayoutOptions}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        cy={handleCyInit}
      />

      {/* ── Типаж overlay: ГОРИЗОНТАЛЬНЫЕ зональные полосы + ВЕРТИКАЛЬНЫЕ декады ── */}
      {activeLayout === 'zone' && (zoneLabels.length > 0 || decadeLines.length > 0) && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">

          {/* ── Horizontal zone bands ───────────────────────────────────── */}
          {zoneLabels.map((band, idx) => (
            <div
              key={band.key}
              className="absolute left-0 right-0"
              style={{
                top:    `${Math.max(0, band.top)}%`,
                height: `${Math.max(1, band.height)}%`,
                background: `linear-gradient(90deg, ${band.color}12 0%, transparent 22%)`,
              }}
            >
              {/* White separator at top of every zone except first */}
              {idx > 0 && (
                <div
                  className="absolute left-0 right-0"
                  style={{
                    top: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.15) 55%, transparent 100%)',
                    boxShadow: '0 0 5px rgba(255,255,255,0.12)',
                  }}
                />
              )}

              {/* Zone label + межбрендовая аналитика (топ брендов сегмента) */}
              <div className="absolute flex items-center gap-2" style={{ top: '4px', left: '8px' }}>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                  style={{
                    color: band.color,
                    background: `${band.color}18`,
                    border: `1px solid ${band.color}35`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {band.label}
                </span>
                {/* Доли брендов в сегменте — цветной чип + число моделей */}
                {band.stats && band.stats.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {band.stats.map(s => (
                      <span key={s.brand} className="flex items-center gap-1 text-[8px] font-semibold"
                        style={{ color: 'rgba(255,255,255,0.55)' }}>
                        <span className="inline-block rounded-full"
                          style={{ width: 6, height: 6, background: s.color, boxShadow: `0 0 4px ${s.color}99` }} />
                        {s.brand.charAt(0).toUpperCase() + s.brand.slice(1)}&nbsp;{s.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* ── Vertical decade lines ───────────────────────────────────── */}
          {decadeLines.map(dec => (
            <div
              key={dec.year}
              className="absolute top-0 bottom-0"
              style={{
                left:  `${dec.left}%`,
                width: '1px',
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.28) 8%, rgba(255,255,255,0.28) 92%, transparent 100%)',
              }}
            >
              {/* Decade label at top */}
              <span
                className="absolute top-2 text-[9px] font-mono font-semibold"
                style={{
                  left: '4px',
                  color: 'rgba(255,255,255,0.45)',
                  whiteSpace: 'nowrap',
                }}
              >
                {dec.year}s
              </span>
            </div>
          ))}

        </div>
      )}

      {/* ── Мощность: оси (двигатель×л.с.) + платформенные зоны ─────────── */}
      {activeLayout === 'cola' && (engineBands.length > 0 || hpLines.length > 0 || platformHulls.length > 0 || platformZones.length > 0) && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* Полосы типов двигателя (ось Y) */}
          {engineBands.map((band, idx) => (
            <div key={band.label + idx} className="absolute left-0 right-0" style={{
              top: `${Math.max(0, band.top)}%`, height: `${Math.max(0.5, band.height)}%`,
              background: `linear-gradient(90deg, ${band.color}14 0%, ${band.color}06 40%, transparent 75%)`,
            }}>
              {idx > 0 && <div className="absolute left-0 right-0" style={{ top: 0, height: '1px', background: band.color + '55' }} />}
              <span className="absolute px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                style={{ top: '2px', left: '6px', color: band.color, background: band.color + '1a', whiteSpace: 'nowrap' }}>{band.label}</span>
            </div>
          ))}
          {/* Линии мощности (ось X, л.с.) */}
          {hpLines.map(line => (
            <div key={line.hp} className="absolute top-0 bottom-0" style={{ left: `${line.left}%`, width: '1px', background: 'rgba(255,255,255,0.09)' }}>
              <span className="absolute font-mono" style={{ top: '2px', left: '3px', fontSize: '8px', color: 'rgba(255,255,255,0.32)', whiteSpace: 'nowrap' }}>{line.hp}</span>
            </div>
          ))}
          {platformHulls.length > 0 && (
            <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {platformHulls.map((h, i) => (
                <polygon key={i} points={h.points} fill={h.color + '1f'} stroke={h.color + 'aa'}
                  strokeWidth={0.25} strokeLinejoin="round" strokeDasharray="1.4 0.9" />
              ))}
            </svg>
          )}
          {platformZones.length > 0 && (
            <div className="absolute top-2 right-2 flex flex-col gap-1 px-2.5 py-2 rounded-lg"
                 style={{ background: 'rgba(9,8,10,0.82)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 220 }}>
              <span className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Платформы</span>
              {platformZones.map((z, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: z.color, flexShrink: 0, boxShadow: `0 0 6px ${z.color}99` }} />
                  <span className="truncate flex-1">{z.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{z.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sync overlay: competitive segment zones + year axis ─────────── */}
      {activeLayout === 'sync' && (engineBands.length > 0 || hpLines.length > 0) && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">

          {/* Competitive segment zone bands */}
          {engineBands.map((band, idx) => (
            <div
              key={band.label + idx}
              className="absolute left-0 right-0"
              style={{
                top:    `${Math.max(0, band.top)}%`,
                height: `${Math.max(0.5, band.height)}%`,
                background: idx % 2 === 0
                  ? `linear-gradient(90deg, ${band.color}16 0%, ${band.color}06 35%, transparent 70%)`
                  : `linear-gradient(90deg, ${band.color}0c 0%, transparent 30%)`,
              }}
            >
              {/* Zone separator — solid, no shadow, high contrast */}
              {idx > 0 && (
                <div className="absolute left-0 right-0" style={{
                  top: 0, height: '2px',
                  background: `linear-gradient(90deg, ${band.color} 0%, ${band.color}bb 30%, ${band.color}44 65%, transparent 100%)`,
                }} />
              )}
              {/* Segment zone label */}
              <span
                className="absolute px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
                style={{
                  top: '4px', left: '6px',
                  color: band.color,
                  background: band.color + '20',
                  border: `1.5px solid ${band.color}40`,
                  whiteSpace: 'nowrap',
                  textShadow: `0 0 10px ${band.color}70`,
                }}
              >
                {band.label}
              </span>
            </div>
          ))}

          {/* Family track labels (genRows repurposed) */}
          {genRows.map((row) => (
            <div
              key={row.gen}
              className="absolute"
              style={{
                top: `${Math.max(0, row.top)}%`,
                left: '4px',
                transform: 'translateY(2px)',
              }}
            >
              <span
                className="text-[8px] font-semibold uppercase tracking-wider"
                style={{
                  color: row.height > 0 ? 'rgba(255,255,255,0.30)' : 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.label}
              </span>
            </div>
          ))}

          {/* Year vertical lines — decades thick, 5-year thin */}
          {hpLines.map(line => {
            const isDecade = line.hp % 10 === 0
            return (
              <div
                key={line.hp}
                className="absolute top-0 bottom-0"
                style={{
                  left:  `${line.left}%`,
                  width: isDecade ? '2px' : '1px',
                  background: isDecade
                    ? 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.65) 4%, rgba(255,255,255,0.65) 96%, transparent 100%)'
                    : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.22) 4%, rgba(255,255,255,0.22) 96%, transparent 100%)',
                }}
              >
                {/* Year label at top for every 5 years */}
                <span
                  className="absolute font-mono font-semibold"
                  style={{
                    top: '4px',
                    left: '3px',
                    fontSize: isDecade ? '10px' : '8px',
                    color: isDecade ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)',
                    whiteSpace: 'nowrap',
                    textShadow: isDecade ? '0 0 8px rgba(249,115,22,0.5)' : 'none',
                    fontWeight: isDecade ? 700 : 400,
                  }}
                >
                  {line.hp}
                </span>
              </div>
            )
          })}

        </div>
      )}

      {/* ── Eras overlay: brand groups + decade bands + year axis ─────── */}
      {activeLayout === 'eras' && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">

          {/* ① Brand column backgrounds with colour tint */}
          {brandBands.map(band => (
            <div
              key={band.brandId}
              className="absolute top-0 bottom-0"
              style={{
                left: band.left + '%',
                width: band.width + '%',
                background: 'linear-gradient(180deg,' + band.color + '12 0%,' + band.color + '06 100%)',
                borderLeft: '2px solid ' + band.color + '40',
              }}
            >
              <span
                className="absolute top-1 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-widest"
                style={{ color: band.color, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {band.label}
              </span>
            </div>
          ))}

          {/* ② Family columns: separators + name labels + lifespan bars */}
          {genRows.map((col, idx) => (
            <React.Fragment key={col.gen}>
              {/* thin vertical separator between adjacent columns */}
              {idx > 0 && (
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: Math.max(0, col.top) + '%',
                    width: '1px',
                    background: 'linear-gradient(180deg,transparent 0%,rgba(255,255,255,0.14) 8%,rgba(255,255,255,0.14) 92%,transparent 100%)',
                  }}
                />
              )}
              {/* lifespan bar: spans minYear→maxYear in the family */}
              {(col.spanHeight ?? 0) > 0.1 && (
                <div
                  className="absolute rounded-sm"
                  style={{
                    left: `calc(${col.top + col.height / 2}% - 2px)`,
                    width: '4px',
                    top:    (col.spanTop    ?? 0) + '%',
                    height: (col.spanHeight ?? 0) + '%',
                    background: col.color ?? '#ffffff',
                    opacity: 0.18,
                  }}
                />
              )}
              {/* family name label at column top */}
              {col.label && col.height > 1.5 && (
                <div
                  className="absolute"
                  style={{
                    left:     Math.max(0, col.top) + '%',
                    width:    col.height + '%',
                    top:      '22px',
                    overflow: 'hidden',
                    textAlign: 'center',
                  }}
                >
                  <span
                    className="text-[6.5px] uppercase font-semibold tracking-wider"
                    style={{
                      color:         col.color ?? '#ffffff',
                      opacity:       0.55,
                      whiteSpace:    'nowrap',
                      overflow:      'hidden',
                      textOverflow:  'ellipsis',
                      display:       'block',
                    }}
                  >
                    {col.label}
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* ③ Decade horizontal bands (zebra stripes + white separator) */}
          {eraCols.map((band, idx) => {
            const nextTop = eraCols[idx + 1]?.left ?? 100
            const bandH   = Math.max(0.3, nextTop - band.left)
            return (
              <div
                key={band.decade}
                className="absolute left-0 right-0"
                style={{
                  top: Math.max(0, band.left) + '%',
                  height: bandH + '%',
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                }}
              >
                {idx > 0 && (
                  <div className="absolute left-0 right-0" style={{
                    top: 0, height: '2px',
                    background: 'linear-gradient(90deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.18) 40%,rgba(255,255,255,0.06) 80%,transparent 100%)',
                  }} />
                )}
                <span
                  className="absolute font-mono"
                  style={{
                    left:      '28px',
                    top:       idx > 0 ? '4px' : '6px',
                    fontSize:  '7px',
                    color:     'rgba(255,255,255,0.20)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {band.decade}s
                </span>
              </div>
            )
          })}

          {/* ④ Year tick labels on left axis */}
          {yearTicks.map(tick => (
            <div
              key={tick.year}
              className="absolute"
              style={{ top: tick.top + '%', left: 0, transform: 'translateY(-50%)' }}
            >
              <span
                className="text-[9px] font-mono"
                style={{
                  color: tick.year % 10 === 0 ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.22)',
                  fontWeight: tick.year % 10 === 0 ? 700 : 400,
                  paddingLeft: '4px',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  textShadow: tick.year % 10 === 0 ? '0 0 8px rgba(249,115,22,0.45)' : 'none',
                }}
              >
                {tick.year}
              </span>
            </div>
          ))}

        </div>
      )}


      {/* ── Fork overlay: BRAND vertical zones + DEPTH horizontal bands ─── */}
      {activeLayout === 'fork' && (brandBands.length > 0 || genRows.length > 0) && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">

          {/* ① Vertical brand zone backgrounds — нейтральный серый, не броско */}
          {brandBands.map((band, idx) => (
            <div
              key={band.brandId}
              className="absolute top-0 bottom-0"
              style={{
                left:  band.left + '%',
                width: band.width + '%',
                // Чередование еле заметных серых тонов вместо ярких цветов бренда
                background: idx % 2 === 0
                  ? 'rgba(255,255,255,0.022)'
                  : 'rgba(255,255,255,0.006)',
                borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.10)' : 'none',
              }}
            >
              {/* Brand label at top — приглушённый серо-белый */}
              <span
                className="absolute top-2 left-0 right-0 text-center text-[10px] font-black uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.42)', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {band.label}
              </span>
            </div>
          ))}

          {/* ② Horizontal generation depth bands */}
          {genRows.map((band, idx) => {
            const D_COL = ['#ffd700','#00d4ff','#a78bfa','#00ff88','#ff9500','#e879f9','#38bdf8','#94a3b8','#fb7185','#34d399']
            const col = D_COL[idx % D_COL.length]
            return (
              <div
                key={band.gen}
                className="absolute left-0 right-0"
                style={{
                  top:    Math.max(0, band.top) + '%',
                  height: Math.max(0.5, band.height) + '%',
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                }}
              >
                {idx > 0 && (
                  <div className="absolute left-0 right-0" style={{
                    top: 0, height: '2px',
                    background: 'linear-gradient(90deg,' + col + ' 0%,' + col + 'aa 30%,' + col + '33 65%,transparent 100%)',
                  }} />
                )}
                <span
                  className="absolute text-[9px] font-bold uppercase tracking-widest"
                  style={{
                    top: '5px', left: '6px',
                    color: col, opacity: 0.75,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {band.label}
                </span>
              </div>
            )
          })}

        </div>
      )}
      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute z-30 pointer-events-none rounded-xl text-xs overflow-hidden"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              width: tooltip.imageUrl ? 200 : undefined,
              background: 'rgba(8,8,18,0.95)',
              border: '1px solid rgba(249,115,22,0.25)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {/* Мини-превью модели (обои из профиля) */}
            {tooltip.imageUrl && (
              <div className="relative w-full" style={{ height: 112, background: 'rgba(255,255,255,0.04)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tooltip.imageUrl}
                  alt={tooltip.content}
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(180deg, transparent 55%, rgba(8,8,18,0.95) 100%)',
                }} />
              </div>
            )}
            <div className="px-3 py-2">
              <div className="font-semibold text-white">{tooltip.content}</div>
              {tooltip.sub && <div className="text-white/40 mt-0.5">{tooltip.sub}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node side panel */}
      <AnimatePresence>
        {selectedNode && (
          <NodeInfoPanel node={selectedNode} onClose={() => {
            setSelectedNode(null)
            cyRef.current?.elements().removeClass('dimmed')
          }} />
        )}
      </AnimatePresence>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        {[
          { icon: ZoomIn, action: handleZoomIn, title: 'Zoom in' },
          { icon: ZoomOut, action: handleZoomOut, title: 'Zoom out' },
          { icon: Maximize2, action: handleFit, title: 'Fit' },
          { icon: Download, action: handleExportPNG, title: 'Export PNG' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center
              text-white/40 hover:text-white/80 hover:border-white/20 transition-all"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Active layout badge — shows current mode, no switching here */}
      <div className="absolute top-3 left-3 z-20">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/30">
          <Layers className="w-3 h-3" />
          {activeLayout}
        </div>
      </div>

      {/* Edge legend */}
      <div className="absolute bottom-3 left-3 z-20">
        <div className="flex flex-wrap gap-x-4 gap-y-1 p-2.5 rounded-xl glass border border-white/8">
          {Object.entries(EDGE_COLORS).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-mono text-white/30">
                {type.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default EvolutionGraph
