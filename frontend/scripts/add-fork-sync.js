/**
 * Adds Fork and Sync layout algorithms to EvolutionGraph.tsx
 * Inserts before the "Reset all overlays" comment block
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

const INSERT_BEFORE = '    // Reset all overlays for standard layouts';
const idx = src.indexOf(INSERT_BEFORE);
if (idx === -1) { console.error('Marker not found'); process.exit(1); }

const FORK_SYNC_CODE = `
    // ── Fork layout: branching evolution tree (founders left, descendants right) ──
    if (l === 'fork') {
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      const cyNodes = cy.nodes()
      if (cyNodes.length === 0) return

      // Compute evolution depth (BFS on evolves_into)
      const fDepth: Record<string, number> = {}
      const fInDeg: Record<string, number> = {}
      cyNodes.forEach(n => { fDepth[n.id()] = 0; fInDeg[n.id()] = 0 })
      cy.edges().forEach(e => {
        if (e.data('type') === 'evolves_into' || e.data('type') === 'derived_from') {
          fInDeg[e.target().id()] = (fInDeg[e.target().id()] ?? 0) + 1
        }
      })
      const fQueue = cyNodes.filter(n => (fInDeg[n.id()] ?? 0) === 0).map(n => n.id())
      const fVisited = new Set<string>()
      while (fQueue.length > 0) {
        const id = fQueue.shift()!
        if (fVisited.has(id)) continue
        fVisited.add(id)
        cy.getElementById(id).outgoers('node').forEach(s => {
          const e = cy.getElementById(id).edgesTo(s)
          if (e.some(e2 => e2.data('type') === 'evolves_into' || e2.data('type') === 'derived_from')) {
            fDepth[s.id()] = Math.max(fDepth[s.id()] ?? 0, (fDepth[id] ?? 0) + 1)
            fQueue.push(s.id())
          }
        })
      }

      // Group by depth, sort within depth by brand → year
      const byDepth: Record<number, string[]> = {}
      cyNodes.forEach(n => {
        const d = fDepth[n.id()] ?? 0
        if (!byDepth[d]) byDepth[d] = []
        byDepth[d].push(n.id())
      })
      const maxDepth = Math.max(...Object.values(fDepth))
      Object.values(byDepth).forEach(ids => ids.sort((a, b) => {
        const na = cy.getElementById(a), nb = cy.getElementById(b)
        const ba = na.data('brandId') ?? '', bb = nb.data('brandId') ?? ''
        if (ba !== bb) return ba.localeCompare(bb)
        return (na.data('year') ?? 0) - (nb.data('year') ?? 0)
      }))

      // Assign positions: X = depth, Y = even spread per depth
      const RANK_W = 200
      const maxNodes = Math.max(...Object.values(byDepth).map(ids => ids.length))
      const SLOT_H = Math.max(72, Math.min(120, 4000 / Math.max(maxNodes, 1)))
      const FPAD = 80
      const forkPos: Record<string, { x: number; y: number }> = {}
      Object.entries(byDepth).forEach(([d, ids]) => {
        const depth = parseInt(d)
        const totalH = ids.length * SLOT_H
        ids.forEach((id, i) => {
          forkPos[id] = {
            x: FPAD + depth * RANK_W,
            y: FPAD + i * SLOT_H + SLOT_H / 2,
          }
        })
      })

      setZoneLabels([])
      setDecadeLines([])
      cy.off('pan zoom')
      cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => forkPos[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: 60, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions).run()
      return
    }

    // ── Sync layout: parallel brand tracks, shared year axis ────────────────
    if (l === 'sync') {
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      const cyNodes = cy.nodes()
      const sYears = cyNodes.map(n => n.data('year') as number).filter(Boolean)
      if (sYears.length === 0) return

      const sMinYear = Math.min(...sYears)
      const sMaxYear = Math.max(...sYears)
      const SX_SCALE  = 44
      const BRAND_H   = 110   // px per brand track
      const SUB_GAP   = 58    // min gap before sub-row
      const SPAD_L    = 100   // left margin for brand labels
      const SPAD_T    = 60

      const BRAND_COLOR: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER = ['bmw','mercedes','audi','volkswagen','seat','skoda',
                           'porsche','ferrari','lamborghini','maserati','lotus']

      // Group nodes by brand, sort each by year
      const sByBrand: Record<string, { id: string; yr: number }[]> = {}
      cyNodes.forEach(node => {
        const yr      = (node.data('year')    as number) ?? sMinYear
        const brandId = (node.data('brandId') as string) ?? 'unknown'
        if (!sByBrand[brandId]) sByBrand[brandId] = []
        sByBrand[brandId].push({ id: node.id(), yr })
      })
      const sSortedBrands = [...new Set(cyNodes.map(n => n.data('brandId') as string))]
        .sort((a, b) => { const ai = BRAND_ORDER.indexOf(a), bi = BRAND_ORDER.indexOf(b); return (ai<0?99:ai)-(bi<0?99:bi) })

      const syncPos: Record<string, { x: number; y: number }> = {}
      const sBrandY: Record<string, number> = {}
      let sCurY = SPAD_T
      sSortedBrands.forEach(brandId => {
        const nodes = (sByBrand[brandId] ?? []).sort((a, b) => a.yr - b.yr)
        sBrandY[brandId] = sCurY
        // Greedy sub-rows within brand track
        const subRowMaxX: number[] = []
        nodes.forEach(({ id, yr }) => {
          const xBase = SPAD_L + (yr - sMinYear) * SX_SCALE
          let sub = 0
          while (sub < subRowMaxX.length && subRowMaxX[sub] > xBase - SUB_GAP) sub++
          subRowMaxX[sub] = xBase
          syncPos[id] = {
            x: xBase,
            y: sCurY + sub * (SUB_GAP * 0.7) + 30,
          }
        })
        const rowsUsed = subRowMaxX.length || 1
        sCurY += Math.max(BRAND_H, rowsUsed * (SUB_GAP * 0.7) + 50)
      })

      // Build overlays: brand horizontal bands + year vertical lines
      const sModelW = SPAD_L * 2 + (sMaxYear - sMinYear) * SX_SCALE
      const sModelH = sCurY + SPAD_T
      const sFitPad = 40
      const sCEl = cy.container()
      const sCW = sCEl ? sCEl.clientWidth : 1200
      const sEstZ = Math.min((height - sFitPad*2)/sModelH, (sCW - sFitPad*2)/sModelW)
      const sEstPX = (sCW - sModelW * sEstZ) / 2
      const sEstPY = (height - sModelH * sEstZ) / 2

      const sBldBands = (pY: number, pX: number, z: number, cW: number): void => {
        // Brand bands → engineBands state (repurposed for sync)
        const bands: { label: string; color: string; top: number; height: number }[] = []
        const sortedWithY = sSortedBrands.map(bid => ({ bid, y: sBrandY[bid] ?? 0 }))
        sortedWithY.sort((a,b)=>a.y-b.y)
        sortedWithY.forEach(({ bid }, idx) => {
          const yModel = sBrandY[bid] ?? 0
          const nextBid = sortedWithY[idx+1]?.bid
          const nextY = nextBid ? (sBrandY[nextBid] ?? yModel + BRAND_H) : sCurY
          bands.push({
            label: bid.charAt(0).toUpperCase() + bid.slice(1),
            color: BRAND_COLOR[bid] ?? '#ffffff',
            top:    Math.max(0, (yModel * z + pY) / height * 100),
            height: Math.max(0.3, (nextY - yModel) * z / height * 100),
          })
        })
        setEngineBands(bands)

        // Year lines → hpLines state (repurposed)
        const lines: { hp: number; left: number }[] = []
        for (let yr = Math.ceil(sMinYear/5)*5; yr <= sMaxYear; yr += 5) {
          const left = ((SPAD_L + (yr - sMinYear) * SX_SCALE) * z + pX) / cW * 100
          if (left > 0 && left < 100) lines.push({ hp: yr, left })
        }
        setHpLines(lines)
      }

      const sLayout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => syncPos[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: sFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)
      sLayout.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? sCW
        sBldBands(p.y, p.x, z, cw)
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          sBldBands(pp.y, pp.x, zz, cww)
        })
      })
      sLayout.run()
      sBldBands(sEstPY, sEstPX, sEstZ, sCW)
      return
    }

`;

src = src.slice(0, idx) + FORK_SYNC_CODE + src.slice(idx);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ Fork + Sync algorithms added. File size:', src.length);
