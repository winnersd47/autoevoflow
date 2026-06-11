'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, Download, RotateCcw } from 'lucide-react'
import type { D3HierarchyData, GraphNode } from '@/lib/types'
import { downloadSVG } from '@/lib/graph-utils'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface LineageTreeProps {
  data: D3HierarchyData
  onNodeClick?: (node: GraphNode) => void
  orientation?: 'horizontal' | 'vertical'
  height?: number
  className?: string
}

// ─── Node dimensions ──────────────────────────────────────────────────────────

const NODE_W = 80
const NODE_H = 60
const IMG_SIZE = 44
const H_SEP = 160
const V_SEP = 90

// ─── Main Component ────────────────────────────────────────────────────────────

export function LineageTree({
  data,
  onNodeClick,
  orientation = 'horizontal',
  height = 500,
  className = '',
}: LineageTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [orientation2, setOrientation2] = useState<'horizontal' | 'vertical'>(orientation)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    if (svgRef.current) downloadSVG(svgRef.current, 'lineage-tree.svg')
  }, [])

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
  }, [])

  const handleFit = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !gRef.current) return
    const svgEl = svgRef.current
    const gEl = gRef.current
    const svgW = svgEl.clientWidth || 800
    const svgH = svgEl.clientHeight || height

    const bounds = gEl.getBBox()
    const scale = Math.min(svgW / (bounds.width + 80), svgH / (bounds.height + 80)) * 0.9
    const tx = svgW / 2 - (bounds.x + bounds.width / 2) * scale
    const ty = svgH / 2 - (bounds.y + bounds.height / 2) * scale

    d3.select(svgEl)
      .transition()
      .duration(600)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      )
  }, [height])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const svgEl = svgRef.current
    const containerEl = containerRef.current
    const containerW = containerEl.clientWidth || 900

    d3.select(svgEl).selectAll('*').remove()

    const svg = d3.select(svgEl).attr('width', containerW).attr('height', height)

    // Defs: clip-paths, gradients
    const defs = svg.append('defs')

    // Gradient for edges
    const edgeGrad = defs
      .append('linearGradient')
      .attr('id', 'edge-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
    edgeGrad.append('stop').attr('offset', '0%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.6)
    edgeGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0044aa').attr('stop-opacity', 0.3)

    // Zoom group
    const g = svg.append('g').attr('class', 'tree-group')
    gRef.current = g.node()

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })
    zoomRef.current = zoom
    svg.call(zoom)

    // Build hierarchy (filter collapsed)
    function filterData(node: D3HierarchyData): D3HierarchyData {
      if (collapsed.has(node.id)) {
        return { ...node, children: [] }
      }
      return {
        ...node,
        children: node.children?.map(filterData) ?? [],
      }
    }

    const filteredData = filterData(data)
    const root = d3.hierarchy<D3HierarchyData>(filteredData, (d) => d.children)

    // Tree layout
    const treeLayout = d3.tree<D3HierarchyData>()

    if (orientation2 === 'horizontal') {
      treeLayout.nodeSize([V_SEP, H_SEP])
    } else {
      treeLayout.nodeSize([H_SEP, V_SEP])
    }

    const treeData = treeLayout(root)

    // Swap coordinates for horizontal
    if (orientation2 === 'horizontal') {
      treeData.each((d) => {
        const tmp = d.x
        d.x = d.y
        d.y = tmp
      })
    }

    // Initial translate to center root
    const rootNode = treeData
    const tx = orientation2 === 'horizontal' ? 80 : containerW / 2
    const ty = orientation2 === 'horizontal' ? height / 2 - rootNode.y : 60

    g.attr('transform', `translate(${tx}, ${ty})`)

    // ── Edges ──────────────────────────────────────────────────────────────────

    const links = g.append('g').attr('class', 'links')

    treeData.links().forEach((link, i) => {
      const edgeId = `edge-${link.source.data.id}-${link.target.data.id}`

      // Build path
      let pathD: string
      if (orientation2 === 'horizontal') {
        const midX = (link.source.x + link.target.x) / 2
        pathD = `M ${link.source.x} ${link.source.y}
                 C ${midX} ${link.source.y},
                   ${midX} ${link.target.y},
                   ${link.target.x} ${link.target.y}`
      } else {
        const midY = (link.source.y + link.target.y) / 2
        pathD = `M ${link.source.x} ${link.source.y}
                 C ${link.source.x} ${midY},
                   ${link.target.x} ${midY},
                   ${link.target.x} ${link.target.y}`
      }

      const isFacelift = link.target.data.isFacelift
      const strokeColor = isFacelift ? '#38bdf8' : '#00d4ff'

      const path = links
        .append('path')
        .attr('id', edgeId)
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5)
        .attr('stroke-dasharray', isFacelift ? '5,3' : 'none')
        .style('cursor', 'pointer')
        .style('transition', 'stroke-opacity 0.2s, stroke-width 0.2s')

      // Animate path drawing
      const length = (path.node() as SVGPathElement).getTotalLength?.() ?? 200
      path
        .attr('stroke-dashoffset', length)
        .attr('stroke-dasharray', `${length} ${length}`)
        .transition()
        .duration(800)
        .delay(i * 40)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0)
        .on('end', () => {
          if (isFacelift) path.attr('stroke-dasharray', '5,3')
          else path.attr('stroke-dasharray', 'none')
        })

      // Hover for similarity label
      path
        .on('mouseover', function () {
          d3.select(this).attr('stroke-opacity', 0.9).attr('stroke-width', 2.5)
          setHoveredEdgeId(edgeId)
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke-opacity', 0.5).attr('stroke-width', 1.5)
          setHoveredEdgeId(null)
        })
    })

    // ── Nodes ──────────────────────────────────────────────────────────────────

    const nodes = g.append('g').attr('class', 'nodes')

    treeData.descendants().forEach((d, i) => {
      const nodeG = nodes
        .append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${d.x}, ${d.y})`)
        .style('cursor', 'pointer')
        .style('opacity', 0)

      // Animate entrance
      d3.select(nodeG.node())
        .transition()
        .duration(500)
        .delay(i * 60)
        .ease(d3.easeBackOut.overshoot(1.2))
        .style('opacity', 1)

      const isConcept = d.data.isConcept
      const isFacelift = d.data.isFacelift
      const hasChildren = (d.data.children?.length ?? 0) > 0
      const isCollapsed = collapsed.has(d.data.id)

      // Card background
      const cardColor = isConcept
        ? 'rgba(255,215,0,0.12)'
        : isFacelift
        ? 'rgba(56,189,248,0.08)'
        : 'rgba(0,212,255,0.08)'
      const cardBorder = isConcept ? '#ffd700' : isFacelift ? '#38bdf8' : '#00d4ff'

      nodeG
        .append('rect')
        .attr('x', -NODE_W / 2)
        .attr('y', -NODE_H / 2)
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', cardColor)
        .attr('stroke', cardBorder)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5)

      // Image placeholder / thumbnail
      if (d.data.imageUrl) {
        // Use foreignObject for image
        const fo = nodeG
          .append('foreignObject')
          .attr('x', -IMG_SIZE / 2)
          .attr('y', -NODE_H / 2 + 6)
          .attr('width', IMG_SIZE)
          .attr('height', IMG_SIZE - 10)

        fo.append('xhtml:img')
          .attr('src', d.data.imageUrl)
          .attr('width', IMG_SIZE)
          .attr('height', IMG_SIZE - 10)
          .style('object-fit', 'cover')
          .style('border-radius', '6px')
          .style('display', 'block')
      } else {
        // Placeholder car icon
        nodeG
          .append('rect')
          .attr('x', -IMG_SIZE / 2)
          .attr('y', -NODE_H / 2 + 6)
          .attr('width', IMG_SIZE)
          .attr('height', IMG_SIZE - 10)
          .attr('rx', 6)
          .attr('fill', 'rgba(255,255,255,0.05)')
      }

      // Year label
      nodeG
        .append('text')
        .attr('y', NODE_H / 2 - 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', 'rgba(255,255,255,0.5)')
        .text(d.data.year ?? '')

      // Code name badge
      nodeG
        .append('text')
        .attr('y', NODE_H / 2 - 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8.5px')
        .attr('font-weight', '700')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', cardBorder)
        .text(d.data.codeName ?? d.data.name.slice(0, 6))

      // Collapse/expand indicator
      if (hasChildren) {
        const toggleBtn = nodeG
          .append('g')
          .attr('transform', `translate(${NODE_W / 2 - 2}, 0)`)
          .style('cursor', 'pointer')

        toggleBtn
          .append('circle')
          .attr('r', 7)
          .attr('fill', isCollapsed ? '#00d4ff' : 'rgba(0,212,255,0.2)')
          .attr('stroke', '#00d4ff')
          .attr('stroke-width', 1)

        toggleBtn
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '900')
          .attr('fill', '#ffffff')
          .text(isCollapsed ? '+' : '−')

        toggleBtn.on('click', (event) => {
          event.stopPropagation()
          toggleCollapse(d.data.id)
        })
      }

      // Click to select
      nodeG.on('click', () => {
        if (onNodeClick) {
          onNodeClick({
            id: d.data.id,
            label: d.data.name,
            type: 'generation',
            year: d.data.year,
            codeName: d.data.codeName,
            isFacelift: d.data.isFacelift,
            isConcept: d.data.isConcept,
            imageUrl: d.data.imageUrl,
          })
        }
      })

      // Hover
      nodeG
        .on('mouseover', function () {
          d3.select(this)
            .select('rect')
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 2)
            .attr('filter', `drop-shadow(0 0 8px ${cardBorder}60)`)
        })
        .on('mouseout', function () {
          d3.select(this)
            .select('rect')
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', 1)
            .attr('filter', 'none')
        })
    })

    // Initial fit
    setTimeout(() => handleFit(), 100)
  }, [data, collapsed, orientation2, height, toggleCollapse, onNodeClick, handleFit])

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full rounded-xl overflow-hidden"
        style={{ height, background: 'transparent', cursor: 'grab' }}
      />

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {[
          { icon: ZoomIn, action: handleZoomIn, title: 'Zoom in' },
          { icon: ZoomOut, action: handleZoomOut, title: 'Zoom out' },
          { icon: Maximize2, action: handleFit, title: 'Fit to screen' },
          { icon: Download, action: handleExport, title: 'Export SVG' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center
              text-white/40 hover:text-white/80 hover:border-white/20 transition-all duration-200"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Orientation toggle */}
      <div className="absolute top-3 left-3">
        <button
          onClick={() => setOrientation2((o) => o === 'horizontal' ? 'vertical' : 'horizontal')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/10
            text-xs font-semibold text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          {orientation2 === 'horizontal' ? 'Vertical' : 'Horizontal'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px bg-[#00d4ff] opacity-60" />
          <span>Evolves</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px border-t border-dashed border-[#38bdf8] opacity-60" />
          <span>Facelift</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-[#ffd700] opacity-60" style={{ backgroundColor: 'rgba(255,215,0,0.12)' }} />
          <span>Concept</span>
        </div>
      </div>
    </div>
  )
}

export default LineageTree
