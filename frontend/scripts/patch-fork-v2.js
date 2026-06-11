const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

// Find exact fork block start/end
const FORK_START = "    // ── Fork layout: branching evolution tree (founders left, descendants right) ──\n    if (l === 'fork') {";
const FORK_END   = "      setZoneLabels([])\n      setDecadeLines([])\n      cy.off('pan zoom')\n      cy.layout({\n        name: 'preset',\n        positions: (node: cytoscape.NodeSingular) => forkPos[node.id()] ?? { x: 0, y: 0 },\n        fit: true, padding: 60, animate: true, animationDuration: 700,\n      } as cytoscape.LayoutOptions).run()\n      return\n    }";

const si = src.indexOf(FORK_START);
const ei = src.indexOf(FORK_END);
if (si === -1) { console.error('FORK_START not found'); process.exit(1); }
if (ei === -1) { console.error('FORK_END not found'); process.exit(1); }
const afterFork = FORK_END.length;

const NEW_FORK = `    // ── Fork: ONE brand tree with depth zones + brand filter ──────────────────
    if (l === 'fork') {
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])

      // Determine brand: use activeBrands prop if set, else default bmw
      const fBrand = (activeBrands && activeBrands.size >= 1) ? [...activeBrands][0] : 'bmw'

      // Dim non-active brand nodes/edges
      cy.nodes().forEach(n => {
        if (n.data('brandId') === fBrand) {
          n.style({ opacity: 1, 'pointer-events': 'auto' })
        } else {
          n.style({ opacity: 0.06, 'pointer-events': 'none' })
        }
      })
      cy.edges().forEach(e => {
        const sBrand = cy.getElementById(e.source().id()).data('brandId')
        const tBrand = cy.getElementById(e.target().id()).data('brandId')
        e.style({ opacity: (sBrand === fBrand || tBrand === fBrand) ? 0.85 : 0.03 })
      })

      const activeNodes = cy.nodes().filter(n => n.data('brandId') === fBrand)
      if (activeNodes.length === 0) return

      // BFS depth within active brand
      const fDepth: Record<string, number> = {}
      const fInDeg: Record<string, number> = {}
      activeNodes.forEach(n => { fDepth[n.id()] = 0; fInDeg[n.id()] = 0 })
      cy.edges().forEach(e => {
        const src2 = e.source().id(), tgt = e.target().id()
        if ((e.data('type') === 'evolves_into' || e.data('type') === 'derived_from')
            && fDepth[src2] !== undefined && fDepth[tgt] !== undefined) {
          fInDeg[tgt] = (fInDeg[tgt] ?? 0) + 1
        }
      })
      const fQueue = activeNodes.filter(n => (fInDeg[n.id()] ?? 0) === 0).map(n => n.id())
      const fVisited = new Set<string>()
      while (fQueue.length > 0) {
        const id = fQueue.shift()!
        if (fVisited.has(id)) continue
        fVisited.add(id)
        cy.getElementById(id).outgoers('node').forEach(s => {
          if (fDepth[s.id()] === undefined) return
          const ed = cy.getElementById(id).edgesTo(s)
          if (ed.some(e2 => e2.data('type') === 'evolves_into' || e2.data('type') === 'derived_from')) {
            fDepth[s.id()] = Math.max(fDepth[s.id()] ?? 0, (fDepth[id] ?? 0) + 1)
            fQueue.push(s.id())
          }
        })
      }

      // Group by depth, sort by family → year
      const byDepth: Record<number, string[]> = {}
      activeNodes.forEach(n => {
        const d = fDepth[n.id()] ?? 0
        if (!byDepth[d]) byDepth[d] = []
        byDepth[d].push(n.id())
      })
      const maxForkDepth = Math.max(0, ...Object.values(fDepth))
      const getFamFork = (id: string, slug: string|undefined) => {
        if (slug) return slug
        const p = id.split('-')
        return p.length >= 3 ? p[0]+'-'+p[1] : p[0]
      }
      Object.values(byDepth).forEach(ids => ids.sort((a, b) => {
        const na = cy.getElementById(a), nb = cy.getElementById(b)
        const fa = getFamFork(a, na.data('modelSlug')), fb = getFamFork(b, nb.data('modelSlug'))
        if (fa !== fb) return fa.localeCompare(fb)
        return (na.data('year') ?? 0) - (nb.data('year') ?? 0)
      }))

      const RANK_W = 210
      const FPAD   = 80
      const maxAtDepth = Math.max(1, ...Object.values(byDepth).map(ids => ids.length))
      const SLOT_H = Math.max(74, Math.min(130, 5000 / maxAtDepth))

      const forkPos: Record<string, { x: number; y: number }> = {}
      Object.entries(byDepth).forEach(([d, ids]) => {
        const depth = parseInt(d)
        ids.forEach((id, i) => {
          forkPos[id] = { x: FPAD + depth * RANK_W, y: FPAD + i * SLOT_H + SLOT_H / 2 }
        })
      })
      // Park hidden nodes off-screen
      cy.nodes().forEach(n => { if (!forkPos[n.id()]) forkPos[n.id()] = { x: -9999, y: -9999 } })

      // Build depth zone overlays (vertical bands, repurpose genRows)
      const fModelW = FPAD * 2 + (maxForkDepth + 1) * RANK_W
      const fModelH = FPAD * 2 + maxAtDepth * SLOT_H
      const fFitPad = 60
      const fCEl = cy.container(); const fCW = fCEl ? fCEl.clientWidth : 1200
      const fEstZ = Math.min((height - fFitPad*2)/fModelH, (fCW - fFitPad*2)/fModelW)
      const fEstPX = (fCW - fModelW * fEstZ) / 2

      const D_EN = ['Founders','2nd Gen','3rd Gen','4th Gen','5th Gen','6th Gen','7th Gen','8th+']
      const D_RU = ['Основатели','2-е пок.','3-е пок.','4-е пок.','5-е пок.','6-е пок.','7-е пок.','8+']

      const buildForkZones = (pX: number, z: number, cW: number): GenRow[] =>
        Array.from({ length: maxForkDepth + 1 }, (_, d) => ({
          gen: d,
          label: (locale === 'ru' ? D_RU : D_EN)[d] ?? ('Gen ' + (d+1)),
          top:    Math.max(0, ((FPAD + d * RANK_W - RANK_W*0.45) * z + pX) / cW * 100),
          height: Math.max(0.5, RANK_W * z / cW * 100),
        })).filter(z2 => z2.top < 100)

      const fLayout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => forkPos[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: fFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)
      fLayout.one('layoutstop', () => {
        const p = cy.pan(); const z2 = cy.zoom(); const cw = cy.container()?.clientWidth ?? fCW
        setGenRows(buildForkZones(p.x, z2, cw))
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          setGenRows(buildForkZones(pp.x, zz, cww))
        })
      })
      fLayout.run()
      setGenRows(buildForkZones(fEstPX, fEstZ, fCW))
      return
    }`;

src = src.slice(0, si) + NEW_FORK + src.slice(ei + afterFork);
fs.writeFileSync(path, src, 'utf8');
console.log('Fork v2 applied. Size:', src.length);
