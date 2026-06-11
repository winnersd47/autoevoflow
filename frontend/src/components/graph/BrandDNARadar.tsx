'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RadarSeries {
  id: string
  label: string
  color: string
  values: Record<string, number> // axis -> 0..100
}

interface BrandDNARadarProps {
  axes?: string[]
  series: RadarSeries[]
  width?: number
  height?: number
  selectedId?: string
  className?: string
}

// ─── Default Axes ──────────────────────────────────────────────────────────────

const DEFAULT_AXES = [
  'Grille Design',
  'Headlight Style',
  'Silhouette',
  'Proportions',
  'Stance',
  'Aerodynamics',
]

// ─── Colours ───────────────────────────────────────────────────────────────────

const SERIES_COLORS = ['#00d4ff', '#ffd700', '#00ff88', '#a78bfa', '#f472b6']

// ─── Helper: polygon points ────────────────────────────────────────────────────

function polygonPoints(
  values: number[],
  axes: string[],
  scale: d3.ScaleLinear<number, number>,
  cx: number,
  cy: number
): string {
  return values
    .map((v, i) => {
      const angle = (i / axes.length) * 2 * Math.PI - Math.PI / 2
      const r = scale(v)
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    .join(' ')
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function BrandDNARadar({
  axes = DEFAULT_AXES,
  series,
  width = 340,
  height = 340,
  selectedId,
  className = '',
}: BrandDNARadarProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<{ label: string; value: number; seriesLabel: string } | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [rendered, setRendered] = useState(false)

  const margin = 60
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - margin
  const levels = 5

  const angleSlice = (2 * Math.PI) / axes.length
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius])

  // Draw grid on mount / update
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('.radar-grid').remove()

    const grid = svg.append('g').attr('class', 'radar-grid')

    // Concentric polygons
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (radius / levels) * lvl
      const pts = axes
        .map((_, i) => {
          const angle = i * angleSlice - Math.PI / 2
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
        })
        .join(' ')

      grid
        .append('polygon')
        .attr('points', pts)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.07)')
        .attr('stroke-width', 1)
    }

    // Axis lines
    axes.forEach((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2
      const x2 = cx + radius * Math.cos(angle)
      const y2 = cy + radius * Math.sin(angle)

      grid
        .append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', 'rgba(255,255,255,0.1)')
        .attr('stroke-width', 1)

      // Axis label
      const labelR = radius + 18
      const lx = cx + labelR * Math.cos(angle)
      const ly = cy + labelR * Math.sin(angle)

      grid
        .append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('dy', '0.35em')
        .attr('text-anchor', Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', 'rgba(255,255,255,0.4)')
        .attr('font-family', 'Inter, sans-serif')
        .text(axis)
    })

    // Level labels
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (radius / levels) * lvl
      grid
        .append('text')
        .attr('x', cx + 4)
        .attr('y', cy - r + 2)
        .attr('font-size', '8px')
        .attr('fill', 'rgba(255,255,255,0.2)')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text((lvl / levels) * 100)
    }

    setRendered(true)
  }, [axes, width, height, cx, cy, radius, angleSlice, levels])

  // Draw data polygons
  useEffect(() => {
    if (!rendered) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('.radar-series').remove()

    series.forEach((s, si) => {
      const color = s.color || SERIES_COLORS[si % SERIES_COLORS.length]!
      const values = axes.map((axis) => s.values[axis] ?? 0)
      const isSelected = selectedId === s.id
      const opacity = selectedId && !isSelected ? 0.3 : 1

      const g = svg
        .append('g')
        .attr('class', 'radar-series')
        .style('opacity', opacity)
        .style('transition', 'opacity 0.3s ease')

      const pts = polygonPoints(values, axes, rScale, cx, cy)

      // Fill
      const fill = g
        .append('polygon')
        .attr('points', pts)
        .attr('fill', color)
        .attr('fill-opacity', 0)
        .attr('stroke', color)
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('stroke-linejoin', 'round')
        .style('filter', isSelected ? `drop-shadow(0 0 6px ${color}80)` : 'none')

      // Animate fill opacity
      fill
        .transition()
        .duration(800)
        .delay(si * 150)
        .ease(d3.easeElasticOut.amplitude(1).period(0.5))
        .attr('fill-opacity', 0.15)

      // Animate polygon by interpolating from center
      const centerPts = axes.map(() => `${cx},${cy}`).join(' ')
      fill
        .attr('points', centerPts)
        .transition()
        .duration(900)
        .delay(si * 150)
        .ease(d3.easeElasticOut.amplitude(0.8).period(0.5))
        .attr('points', pts)

      // Dots on vertices
      values.forEach((v, vi) => {
        const angle = vi * angleSlice - Math.PI / 2
        const r = rScale(v)
        const dx = cx + r * Math.cos(angle)
        const dy = cy + r * Math.sin(angle)

        const dot = g
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('stroke', '#050508')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer')
          .style('filter', `drop-shadow(0 0 4px ${color})`)

        dot
          .transition()
          .duration(900)
          .delay(si * 150 + vi * 30)
          .ease(d3.easeCubicOut)
          .attr('cx', dx)
          .attr('cy', dy)

        dot
          .on('mouseover', (event) => {
            setHovered({ label: axes[vi] ?? '', value: v, seriesLabel: s.label })
            const rect = svgRef.current?.getBoundingClientRect()
            if (rect) {
              setTooltipPos({
                x: event.clientX - rect.left + 12,
                y: event.clientY - rect.top - 10,
              })
            }
            dot.attr('r', 5)
          })
          .on('mouseout', () => {
            setHovered(null)
            dot.attr('r', 3.5)
          })
      })
    })
  }, [series, rendered, selectedId, axes, cx, cy, rScale, angleSlice])

  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute z-50 pointer-events-none px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            background: 'rgba(10,10,20,0.95)',
            border: '1px solid rgba(0,212,255,0.25)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div className="text-white/50 mb-0.5">{hovered.seriesLabel}</div>
          <div className="font-bold text-white">{hovered.label}</div>
          <div className="text-[#00d4ff] font-mono font-bold">{hovered.value}/100</div>
        </div>
      )}

      {/* Legend */}
      {series.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-3 px-4">
          {series.map((s, i) => {
            const color = s.color || SERIES_COLORS[i % SERIES_COLORS.length]!
            const isSelected = selectedId === s.id
            return (
              <motion.div
                key={s.id}
                animate={selectedId && !isSelected ? { opacity: 0.4 } : { opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: color,
                    boxShadow: isSelected ? `0 0 6px ${color}` : 'none',
                  }}
                />
                <span className="text-xs text-white/60 font-medium">{s.label}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BrandDNARadar
