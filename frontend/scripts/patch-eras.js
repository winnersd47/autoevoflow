/**
 * Replaces the entire 'eras' layout block in EvolutionGraph.tsx
 * with brand-grouped, visually improved version.
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

// Find exact start/end of eras block
const START_MARKER = "    if (l === 'eras') {";
const END_MARKER   = "      return\n    }\n\n    // Reset all overlays for standard layouts";

const si = src.indexOf(START_MARKER);
const ei = src.indexOf(END_MARKER);
if (si === -1 || ei === -1) { console.error('Markers not found'); process.exit(1); }

const REPLACEMENT = `    if (l === 'eras') {
      setEngineBands([]); setHpLines([])
      setBrandBands([]); setYearTicks([])
      const cyNodes = cy.nodes()
      const years = cyNodes.map(n => n.data('year') as number).filter(Boolean)
      if (years.length === 0) { cy.layout(getLayoutConfig('dagre') as cytoscape.LayoutOptions).run(); return }

      const minYear   = Math.min(...years)
      const maxYear   = Math.max(...years)
      const Y_SCALE   = 56   // px per year (Y = time: top=old, bottom=new)
      const FAM_W     = 84   // px per model-family column
      const BRAND_GAP = 48   // extra gap between brand groups
      const PAD_LEFT  = 90   // left margin (for year axis)
      const PAD_TOP   = 60

      // ── Brand colour palette ─────────────────────────────────────────
      const BRAND_COLOR: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER = ['bmw','mercedes','audi','volkswagen','seat','skoda',
                           'porsche','ferrari','lamborghini','maserati','lotus']

      // ── 1. Group nodes: brand → family ──────────────────────────────
      const getFam2 = (id: string, slug: string | undefined): string => {
        if (slug) return slug
        const p = id.split('-')
        return p.length >= 3 ? p[0] + '-' + p[1] : p[0]
      }
      type FamE = { id: string; yr: number; brandId: string; fam: string }
      const allE: FamE[] = []
      cyNodes.forEach(node => {
        const yr      = (node.data('year')      as number)           ?? minYear
        const slug    = (node.data('modelSlug') as string|undefined)
        const brandId = (node.data('brandId')   as string)           ?? 'unknown'
        allE.push({ id: node.id(), yr, brandId, fam: getFam2(node.id(), slug) })
      })
      const byBrandFam2: Record<string, Record<string, FamE[]>> = {}
      const famMin2: Record<string, number> = {}
      allE.forEach(e => {
        if (!byBrandFam2[e.brandId]) byBrandFam2[e.brandId] = {}
        if (!byBrandFam2[e.brandId][e.fam]) byBrandFam2[e.brandId][e.fam] = []
        byBrandFam2[e.brandId][e.fam].push(e)
        if (famMin2[e.fam] === undefined || e.yr < famMin2[e.fam]) famMin2[e.fam] = e.yr
      })
      const sortedBrands2 = [...new Set(allE.map(e => e.brandId))]
        .sort((a, b) => { const ai = BRAND_ORDER.indexOf(a); const bi = BRAND_ORDER.indexOf(b); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) })

      // ── 2. Assign X: brand groups, families within brand ─────────────
      const nodePos3: Record<string, { x: number; y: number }> = {}
      const famColX2: Record<string, number> = {}
      const brandColRange2: Record<string, { start: number; end: number }> = {}

      let curX = PAD_LEFT
      sortedBrands2.forEach(brandId => {
        const famMap = byBrandFam2[brandId] ?? {}
        const sortedFams2 = Object.keys(famMap)
          .filter(f => famMap[f].length >= 2)
          .sort((a, b) => (famMin2[a] ?? 0) - (famMin2[b] ?? 0))
        if (sortedFams2.length === 0) return
        const brandStart = curX
        sortedFams2.forEach(fam => {
          famColX2[fam] = curX + FAM_W / 2
          const nodes = famMap[fam].sort((a, b) => a.yr - b.yr)
          const subMaxY: number[] = []
          nodes.forEach(({ id, yr }) => {
            const yBase = PAD_TOP + (yr - minYear) * Y_SCALE
            let sub = 0
            while (sub < subMaxY.length && subMaxY[sub] > yBase - 48) sub++
            subMaxY[sub] = yBase
            nodePos3[id] = { x: famColX2[fam] + (sub > 0 ? sub * 18 - 9 : 0), y: yBase }
          })
          curX += FAM_W
        })
        brandColRange2[brandId] = { start: brandStart, end: curX }
        curX += BRAND_GAP
      })
      // Fallback for single-node families
      allE.forEach(e => {
        if (nodePos3[e.id]) return
        const r = brandColRange2[e.brandId]
        nodePos3[e.id] = {
          x: r ? (r.start + r.end) / 2 : PAD_LEFT,
          y: PAD_TOP + (e.yr - minYear) * Y_SCALE,
        }
      })

      const modelW4 = curX + 40
      const modelH4 = PAD_TOP * 2 + (maxYear - minYear) * Y_SCALE
      const FIT_PAD4 = 40
      const containerEl4 = cy.container()
      const containerW4 = containerEl4 ? containerEl4.clientWidth : 1200
      const estZ4 = Math.min((height - FIT_PAD4 * 2) / modelH4, (containerW4 - FIT_PAD4 * 2) / modelW4)
      const estPX4 = (containerW4 - modelW4 * estZ4) / 2
      const estPY4 = (height - modelH4 * estZ4) / 2

      // ── 3. Build overlay functions ────────────────────────────────────
      const firstDec2 = Math.ceil(minYear / 10) * 10
      const decList2: number[] = []
      for (let d = firstDec2; d <= maxYear + 10; d += 10) decList2.push(d)

      const bldEra2 = (pY: number, z: number): EraCol[] =>
        decList2.map(d => ({
          decade: d,
          left: Math.max(0, ((PAD_TOP + (d - minYear) * Y_SCALE) * z + pY) / height * 100),
        })).filter(c => c.left < 100)

      const bldBrands2 = (pX: number, z: number, cW: number): BrandBand[] =>
        sortedBrands2.map(bid => {
          const r = brandColRange2[bid]; if (!r) return null
          return { brandId: bid, label: bid.charAt(0).toUpperCase() + bid.slice(1),
            color: BRAND_COLOR[bid] ?? '#ffffff',
            left:  Math.max(0, (r.start * z + pX) / cW * 100),
            width: Math.max(0.1, (r.end - r.start) * z / cW * 100) }
        }).filter(Boolean) as BrandBand[]

      const bldTicks2 = (pY: number, z: number): YearTick[] => {
        const t: YearTick[] = []
        for (let yr = Math.ceil(minYear / 5) * 5; yr <= maxYear; yr += 5) {
          const top = ((PAD_TOP + (yr - minYear) * Y_SCALE) * z + pY) / height * 100
          if (top > 0 && top < 100) t.push({ year: yr, top })
        }
        return t
      }

      const bldFamSep2 = (pX: number, z: number, cW: number): GenRow[] =>
        Object.entries(famColX2).map(([, xC], idx) => ({
          gen: idx, label: '',
          top:    Math.max(0, ((xC - FAM_W / 2) * z + pX) / cW * 100),
          height: Math.max(0.1, FAM_W * z / cW * 100),
        })).filter(c => c.top < 100)

      const sync4 = (p: { x: number; y: number }, z: number, cW: number) => {
        setEraCols(bldEra2(p.y, z))
        setBrandBands(bldBrands2(p.x, z, cW))
        setYearTicks(bldTicks2(p.y, z))
        setGenRows(bldFamSep2(p.x, z, cW))
      }

      const layout4 = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => nodePos3[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: FIT_PAD4, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)
      layout4.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom()
        const cW = cy.container()?.clientWidth ?? containerW4
        sync4(p, z, cW)
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom()
          sync4(pp, zz, cy.container()?.clientWidth ?? cW)
        })
      })
      layout4.run()
      sync4({ x: estPX4, y: estPY4 }, estZ4, containerW4)
      return
    }

    // Reset all overlays for standard layouts`;

const before = src.slice(0, si);
const after  = src.slice(ei + END_MARKER.length);
const result = before + REPLACEMENT + '\n\n' + after.trimStart();
fs.writeFileSync(path, result, 'utf8');
console.log('✅ Eras block replaced. File size:', result.length);
