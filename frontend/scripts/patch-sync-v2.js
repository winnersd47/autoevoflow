/**
 * patch-sync-v2.js — rewrites the Sync layout for clarity:
 * - Dynamic track height per brand (based on actual sub-rows needed)
 * - X_SCALE=65px/year (was 44) for better node separation
 * - Minimum 80px gap between node centres (node=58px + gap=22px)
 * - Cross-brand edges dimmed to 0.15 opacity in sync mode (reduce noise)
 * - Decade labels at top, brand labels prominent on left
 * - Only evolves_into + variant_of edges shown at full opacity within a brand track
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

const SYNC_START = '    // ── Sync layout: parallel brand tracks, shared year axis ────────────────\n    if (l === \'sync\') {';
const SYNC_END   = '      sLayout.run()\n      sBldBands(sEstPY, sEstPX, sEstZ, sCW)\n      return\n    }';

const si = src.indexOf(SYNC_START);
const ei = src.indexOf(SYNC_END);
if (si === -1) { console.error('SYNC_START not found'); process.exit(1); }
if (ei === -1) { console.error('SYNC_END not found'); process.exit(1); }

const NEW_SYNC = `    // ── Синхрон v2: parallel brand tracks, adaptive heights, dimmed cross-brand edges ─
    if (l === 'sync') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      const cyNodes = cy.nodes()
      const sYears = cyNodes.map(n => n.data('year') as number).filter(Boolean)
      if (sYears.length === 0) return

      const sMinYear = Math.min(...sYears)
      const sMaxYear = Math.max(...sYears)
      const SX_SCALE = 65    // px/year — wider than before for better readability
      const NODE_SEP = 80    // minimum horizontal gap between node centres
      const PAD_LEFT = 110   // left margin for brand label + year axis
      const PAD_TOP  = 50

      const BRAND_COLOR: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER = ['bmw','mercedes','audi','volkswagen','seat','skoda',
                           'porsche','ferrari','lamborghini','maserati','lotus']

      // Group by brand
      const sByBrand: Record<string, { id: string; yr: number }[]> = {}
      cyNodes.forEach(node => {
        const yr      = (node.data('year')    as number) ?? sMinYear
        const brandId = (node.data('brandId') as string) ?? 'unknown'
        if (!sByBrand[brandId]) sByBrand[brandId] = []
        sByBrand[brandId].push({ id: node.id(), yr })
      })

      const sSortedBrands = [...new Set(cyNodes.map(n => n.data('brandId') as string))]
        .sort((a, b) => {
          const ai = BRAND_ORDER.indexOf(a), bi = BRAND_ORDER.indexOf(b)
          return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
        })

      // For each brand compute sub-rows needed (greedy algorithm)
      const sBrandSubRows: Record<string, number> = {}
      const syncPos: Record<string, { x: number; y: number }> = {}
      const sBrandTopY: Record<string, number> = {}

      let sCurY = PAD_TOP
      sSortedBrands.forEach(brandId => {
        const nodes = (sByBrand[brandId] ?? []).sort((a, b) => a.yr - b.yr)
        sBrandTopY[brandId] = sCurY
        const subRowMaxX: number[] = []

        nodes.forEach(({ id, yr }) => {
          const xBase = PAD_LEFT + (yr - sMinYear) * SX_SCALE
          let sub = 0
          while (sub < subRowMaxX.length && subRowMaxX[sub] > xBase - NODE_SEP) sub++
          subRowMaxX[sub] = xBase
          syncPos[id] = { x: xBase, y: sCurY + sub * NODE_SEP + NODE_SEP / 2 }
        })

        const rowsUsed = Math.max(1, subRowMaxX.length)
        sBrandSubRows[brandId] = rowsUsed
        const trackH = rowsUsed * NODE_SEP + 30   // 30px gap between brands
        sCurY += Math.max(100, trackH)
      })

      // Dim cross-brand edges (keep within-brand edges at full opacity)
      cy.edges().forEach(e => {
        const sBrand = cy.getElementById(e.source().id()).data('brandId')
        const tBrand = cy.getElementById(e.target().id()).data('brandId')
        if (sBrand !== tBrand) {
          e.style({ opacity: 0.12, width: 1 })
        } else {
          const type = e.data('type') as string
          const isMain = type === 'evolves_into' || type === 'variant_of' || type === 'derived_from'
          e.style({ opacity: isMain ? 0.90 : 0.45 })
        }
      })

      // Build overlay builders
      const sModelW = PAD_LEFT * 2 + (sMaxYear - sMinYear) * SX_SCALE
      const sModelH = sCurY + PAD_TOP
      const sFitPad = 40
      const sCEl = cy.container(); const sCW = sCEl ? sCEl.clientWidth : 1200
      const sEstZ = Math.min((height - sFitPad*2)/sModelH, (sCW - sFitPad*2)/sModelW)
      const sEstPX = (sCW - sModelW * sEstZ) / 2
      const sEstPY = (height - sModelH * sEstZ) / 2

      const bldSyncBands = (pY: number, pX: number, z: number, cW: number): void => {
        // Brand horizontal bands → engineBands state
        const bands: { label: string; color: string; top: number; height: number }[] = []
        sSortedBrands.forEach(bid => {
          const topY = sBrandTopY[bid] ?? 0
          const rows = sBrandSubRows[bid] ?? 1
          const botY = topY + rows * NODE_SEP + 30
          bands.push({
            label: bid.charAt(0).toUpperCase() + bid.slice(1),
            color: BRAND_COLOR[bid] ?? '#ffffff',
            top:    Math.max(0, (topY * z + pY) / height * 100),
            height: Math.max(0.3, (botY - topY) * z / height * 100),
          })
        })
        setEngineBands(bands)

        // Year lines every 5 years → hpLines state
        const lines: { hp: number; left: number }[] = []
        for (let yr = Math.ceil(sMinYear/5)*5; yr <= sMaxYear; yr += 5) {
          const left = ((PAD_LEFT + (yr - sMinYear) * SX_SCALE) * z + pX) / cW * 100
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
        bldSyncBands(p.y, p.x, z, cw)
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          bldSyncBands(pp.y, pp.x, zz, cww)
        })
      })

      sLayout.run()
      bldSyncBands(sEstPY, sEstPX, sEstZ, sCW)
      return
    }`;

src = src.slice(0, si) + NEW_SYNC + src.slice(ei + SYNC_END.length);
fs.writeFileSync(path, src, 'utf8');
console.log('Sync v2 applied. Size:', src.length);
