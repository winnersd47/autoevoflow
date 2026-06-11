/**
 * restore-fork-eras.js
 * Re-adds Fork and Eras layout blocks that were lost during the cola patch.
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

const INSERT_BEFORE = '    // ── Синхрон v3: COMPETITIVE view — zones = segments, sub-tracks = model families ─\n    if (l === \'sync\') {';

if (!src.includes(INSERT_BEFORE)) {
  console.error('Sync marker not found'); process.exit(1);
}

const FORK_AND_ERAS = `    // ── Хроника: brand-family columns × time axis ─────────────────────────────
    if (l === 'eras') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])

      const BRAND_COLOR_E: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER_E = ['ferrari','lamborghini','porsche','maserati','lotus',
                             'bmw','mercedes','audi','volkswagen','seat','skoda']

      const eNodes = cy.nodes()
      const eYears = eNodes.map(n => n.data('year') as number).filter(Boolean)
      if (eYears.length === 0) { cy.layout(getLayoutConfig('dagre') as cytoscape.LayoutOptions).run(); return }

      const eMinYear = Math.min(...eYears)
      const eMaxYear = Math.max(...eYears)
      const EY_SCALE  = 56
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

      const bldFamSepE = (pX: number, z: number, cW: number): GenRow[] =>
        Object.entries(famColXE).map(([, xC], idx) => ({
          gen: idx, label: '',
          top:    Math.max(0, ((xC - FAM_W_E / 2) * z + pX) / cW * 100),
          height: Math.max(0.1, FAM_W_E * z / cW * 100),
        })).filter(c => c.top < 100)

      const sync4E = (p: { x: number; y: number }, z: number, cW: number) => {
        setEraCols(bldEraE(p.y, z))
        setBrandBands(bldBrandsE(p.x, z, cW))
        setYearTicks(bldTicksE(p.y, z))
        setGenRows(bldFamSepE(p.x, z, cW))
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
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      cy.off('pan zoom')

      const BRAND_COLOR_FK: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER_FK = ['ferrari','lamborghini','porsche','maserati','lotus',
                              'bmw','mercedes','audi','volkswagen','seat','skoda']

      const fkNodes = cy.nodes()
      if (fkNodes.length === 0) return

      // Depth via evolves_into BFS
      const fkDepth: Record<string, number> = {}
      const fkInDeg: Record<string, number> = {}
      fkNodes.forEach(n => { fkDepth[n.id()] = 0; fkInDeg[n.id()] = 0 })
      cy.edges().forEach(e => {
        if (e.data('type') === 'evolves_into') fkInDeg[e.target().id()] = (fkInDeg[e.target().id()] ?? 0) + 1
      })
      const fkQ = fkNodes.filter(n => (fkInDeg[n.id()] ?? 0) === 0).map(n => n.id())
      const fkVis = new Set<string>()
      while (fkQ.length > 0) {
        const id = fkQ.shift()!
        if (fkVis.has(id)) continue; fkVis.add(id)
        cy.getElementById(id).outgoers('node').forEach(s => {
          if (cy.getElementById(id).edgesTo(s).some(e => e.data('type') === 'evolves_into')) {
            fkDepth[s.id()] = Math.max(fkDepth[s.id()] ?? 0, (fkDepth[id] ?? 0) + 1)
            fkQ.push(s.id())
          }
        })
      }
      // variant_of / derived_from = same depth
      let fkChg = true; let fkIt = 0
      while (fkChg && fkIt < 20) {
        fkChg = false; fkIt++
        cy.edges().forEach(e => {
          const tp = e.data('type') as string
          if (tp !== 'variant_of' && tp !== 'derived_from') return
          const s = e.source().id(), t2 = e.target().id()
          if (fkDepth[s] !== undefined && fkDepth[t2] !== fkDepth[s]) { fkDepth[t2] = fkDepth[s]; fkChg = true }
        })
      }
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
      const sortedBrandsFK = Object.keys(fkByBrand)
        .sort((a, b) => { const ai = BRAND_ORDER_FK.indexOf(a), bi = BRAND_ORDER_FK.indexOf(b); return (ai<0?99:ai)-(bi<0?99:bi) })

      const LEVEL_H_FK = 140
      const NODE_W_FK  = 80
      const BRAND_GAP_FK = 40
      const PAD_FK = 70

      const fkPos: Record<string, { x: number; y: number }> = {}
      const brandRangeFK: Record<string, { startX: number; endX: number }> = {}
      let curXFK = PAD_FK

      sortedBrandsFK.forEach(bid => {
        const nodes = fkByBrand[bid] ?? []
        const brandStartX = curXFK
        const depthMaxX: Record<number, number> = {}
        nodes.sort((a,b) => a.fam.localeCompare(b.fam) || a.yr-b.yr)
        nodes.forEach(n => {
          const rowMaxX = depthMaxX[n.depth] ?? curXFK
          fkPos[n.id] = { x: rowMaxX, y: PAD_FK + n.depth * LEVEL_H_FK + LEVEL_H_FK / 2 }
          depthMaxX[n.depth] = rowMaxX + NODE_W_FK
          if (rowMaxX + NODE_W_FK > curXFK) curXFK = rowMaxX + NODE_W_FK
        })
        brandRangeFK[bid] = { startX: brandStartX, endX: curXFK }
        curXFK += BRAND_GAP_FK
      })

      const fkModelW = curXFK + PAD_FK
      const fkModelH = PAD_FK * 2 + (maxFkDepth + 1) * LEVEL_H_FK
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
          top:    Math.max(0, ((PAD_FK + d * LEVEL_H_FK) * z + pY) / height * 100),
          height: Math.max(0.5, LEVEL_H_FK * z / height * 100),
        })).filter(r => r.top < 100)

      const syncFkOverlay = (p: { x: number; y: number }, z: number, cW: number) => {
        setBrandBands(bldFkBrands(p.x, z, cW))
        setGenRows(bldFkDepth(p.y, z))
      }

      applyEdgeVisibility('fork')

      const fkLayout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => fkPos[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: fkFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)
      fkLayout.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? fkCW
        syncFkOverlay(p, z, cw)
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

`;

src = src.replace(INSERT_BEFORE, FORK_AND_ERAS + INSERT_BEFORE);
fs.writeFileSync(path, src, 'utf8');
console.log('Fork + Eras restored. Size:', src.length);
