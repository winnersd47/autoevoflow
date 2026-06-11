/**
 * patch-fork-brand-zones.js
 * Replaces Fork layout with: vertical brand zones × horizontal generation depth bands
 * Matrix: brand column (X) × evolution depth (Y)
 * Uses custom preset positions + brand color overlays
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

const FORK_START = '      cy.nodes().removeStyle(); cy.edges().removeStyle()\n      setEngineBands([]); setHpLines([])\n      setEraCols([]); setGenRows([])\n      setBrandBands([]); setYearTicks([])\n      setZoneLabels([]); setDecadeLines([])\n      cy.off(\'pan zoom\')';
const FORK_END   = '      forkDagre.run()\n      return\n    }';

const si = src.indexOf(FORK_START);
const ei = src.indexOf(FORK_END);
if (si === -1) { console.error('FORK_START not found'); process.exit(1); }
if (ei === -1) { console.error('FORK_END not found'); process.exit(1); }

const NEW_FORK_BODY = `      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      cy.off('pan zoom')

      // ── Fork v4: BRAND COLUMNS (X) × GENERATION DEPTH (Y) ──────────────
      const fNodes = cy.nodes()
      if (fNodes.length === 0) return

      const BRAND_COLOR_F: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER_F = ['ferrari','lamborghini','porsche','maserati','lotus',
                             'bmw','mercedes','audi','volkswagen','seat','skoda']

      // ── 1. Compute evolution depth (BFS on evolves_into only) ─────────────
      const fDepthV: Record<string, number> = {}
      const fInDegV: Record<string, number> = {}
      fNodes.forEach(n => { fDepthV[n.id()] = 0; fInDegV[n.id()] = 0 })
      cy.edges().forEach(e => {
        if (e.data('type') === 'evolves_into') {
          fInDegV[e.target().id()] = (fInDegV[e.target().id()] ?? 0) + 1
        }
      })
      const fQueueV = fNodes.filter(n => (fInDegV[n.id()] ?? 0) === 0).map(n => n.id())
      const fVisitedV = new Set<string>()
      while (fQueueV.length > 0) {
        const id = fQueueV.shift()!
        if (fVisitedV.has(id)) continue; fVisitedV.add(id)
        cy.getElementById(id).outgoers('node').forEach(s => {
          if (cy.getElementById(id).edgesTo(s).some(e => e.data('type') === 'evolves_into')) {
            fDepthV[s.id()] = Math.max(fDepthV[s.id()] ?? 0, (fDepthV[id] ?? 0) + 1)
            fQueueV.push(s.id())
          }
        })
      }

      // variant_of / derived_from → same depth as source
      let fChanged = true
      while (fChanged) {
        fChanged = false
        cy.edges().forEach(e => {
          const t = e.data('type') as string
          if (t !== 'variant_of' && t !== 'derived_from') return
          const s = e.source().id(), tId = e.target().id()
          if (fDepthV[s] !== undefined && fDepthV[tId] !== fDepthV[s]) {
            fDepthV[tId] = fDepthV[s]; fChanged = true
          }
        })
      }
      const maxForkDepthV = Math.max(0, ...Object.values(fDepthV))

      // ── 2. Group nodes by brand, within brand by depth+family ──────────────
      const getFamF = (id: string, slug: string|undefined) => {
        if (slug) return slug
        const p = id.split('-')
        return p.length >= 3 ? p[0]+'-'+p[1] : p[0]
      }
      const brandNodes: Record<string, { id: string; depth: number; fam: string; yr: number }[]> = {}
      fNodes.forEach(node => {
        const bid  = (node.data('brandId')   as string) ?? 'unknown'
        const slug = (node.data('modelSlug') as string|undefined)
        const yr   = (node.data('year')      as number) ?? 1970
        if (!brandNodes[bid]) brandNodes[bid] = []
        brandNodes[bid].push({ id: node.id(), depth: fDepthV[node.id()] ?? 0, fam: getFamF(node.id(), slug), yr })
      })

      // Sort brands
      const sortedBrandsF = Object.keys(brandNodes)
        .sort((a, b) => { const ai = BRAND_ORDER_F.indexOf(a), bi = BRAND_ORDER_F.indexOf(b); return (ai<0?99:ai)-(bi<0?99:bi) })

      const LEVEL_H_V = 140   // px per depth level
      const NODE_W_V  = 80    // px between node centres within brand column
      const BRAND_GAP_V = 40  // extra gap between brand columns
      const PAD_V = 70

      // Compute X positions: brand column + sub-column within brand
      const forkPosV: Record<string, { x: number; y: number }> = {}
      const brandRangeV: Record<string, { startX: number; endX: number }> = {}
      let curX = PAD_V

      sortedBrandsF.forEach(bid => {
        const nodes = brandNodes[bid] ?? []
        const brandStartX = curX

        // Group by (depth, fam) → greedy sub-columns to avoid X overlap
        const byDepthFam: Record<string, typeof nodes> = {}
        nodes.forEach(n => {
          const k = n.depth + ':' + n.fam
          if (!byDepthFam[k]) byDepthFam[k] = []
          byDepthFam[k].push(n)
        })

        // Sort families within each depth by family name then year
        Object.values(byDepthFam).forEach(arr => arr.sort((a,b) => a.fam.localeCompare(b.fam) || a.yr-b.yr))

        // Assign X using greedy sub-column (avoid overlap per depth row)
        const depthMaxX: Record<number, number> = {}
        nodes.sort((a,b) => a.fam.localeCompare(b.fam) || a.yr-b.yr)
        nodes.forEach(n => {
          const rowMaxX = depthMaxX[n.depth] ?? curX
          forkPosV[n.id] = {
            x: rowMaxX,
            y: PAD_V + n.depth * LEVEL_H_V + LEVEL_H_V / 2,
          }
          depthMaxX[n.depth] = rowMaxX + NODE_W_V
          if (rowMaxX + NODE_W_V > curX) curX = rowMaxX + NODE_W_V
        })

        brandRangeV[bid] = { startX: brandStartX, endX: curX }
        curX += BRAND_GAP_V
      })

      // ── 3. Build overlays ──────────────────────────────────────────────────
      const fModelW = curX + PAD_V
      const fModelH = PAD_V * 2 + (maxForkDepthV + 1) * LEVEL_H_V
      const fFitPad = 50
      const fCEl = cy.container(); const fCW = fCEl ? fCEl.clientWidth : 1200
      const fEstZ = Math.min((height - fFitPad*2)/fModelH, (fCW - fFitPad*2)/fModelW)
      const fEstPX = (fCW - fModelW * fEstZ) / 2
      const fEstPY = (height - fModelH * fEstZ) / 2

      const D_RU_V = ['Основатели','2-е пок.','3-е пок.','4-е пок.','5-е пок.','6-е пок.','7-е пок.','8-е пок.','9-е пок.','10+']
      const D_EN_V = ['Founders','Gen 2','Gen 3','Gen 4','Gen 5','Gen 6','Gen 7','Gen 8','Gen 9','Gen 10+']

      // Vertical brand bands → brandBands state
      const bldForkBrandBands = (pX: number, z: number, cW: number): BrandBand[] =>
        sortedBrandsF.map(bid => {
          const r = brandRangeV[bid]
          if (!r) return null
          return {
            brandId: bid,
            label: bid.charAt(0).toUpperCase() + bid.slice(1),
            color: BRAND_COLOR_F[bid] ?? '#ffffff',
            left:  Math.max(0, (r.startX * z + pX) / cW * 100),
            width: Math.max(0.2, (r.endX - r.startX) * z / cW * 100),
          }
        }).filter(Boolean) as BrandBand[]

      // Horizontal depth bands → genRows state
      const bldForkDepthRows = (pY: number, z: number): GenRow[] =>
        Array.from({ length: maxForkDepthV + 1 }, (_, d) => ({
          gen: d,
          label: (locale === 'ru' ? D_RU_V : D_EN_V)[d] ?? ('Gen ' + (d+1)),
          top:    Math.max(0, ((PAD_V + d * LEVEL_H_V) * z + pY) / height * 100),
          height: Math.max(0.5, LEVEL_H_V * z / height * 100),
        })).filter(r => r.top < 100)

      const syncForkOverlay = (pX: number, pY: number, z: number, cW: number) => {
        setBrandBands(bldForkBrandBands(pX, z, cW))
        setGenRows(bldForkDepthRows(pY, z))
      }

      applyEdgeVisibility('fork')

      const fLayoutV = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => forkPosV[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: fFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)

      fLayoutV.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? fCW
        syncForkOverlay(p.x, p.y, z, cw)
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          syncForkOverlay(pp.x, pp.y, zz, cww)
        })
      })
      fLayoutV.run()
      syncForkOverlay(fEstPX, fEstPY, fEstZ, fCW)
      return
    }`;

src = src.slice(0, si) + NEW_FORK_BODY + src.slice(ei + FORK_END.length);
fs.writeFileSync(path, src, 'utf8');
console.log('Fork brand zones applied. Size:', src.length);
