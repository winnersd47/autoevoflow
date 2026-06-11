/**
 * patch-fork-tree.js
 * Replaces the Fork layout algorithm with a proper top-down tree
 * (Reingold-Tilford style): roots at top, children branch downward,
 * each node centred over its subtree.
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

// Find the fork block
const FORK_START = "    // ── Fork: ONE brand tree with depth zones + brand filter ──────────────────\n    if (l === 'fork') {";
const FORK_RETURN = "      fLayout.run()\n      setGenRows(buildForkZones(fEstPX, fEstZ, fCW))\n      return\n    }";

const si = src.indexOf(FORK_START);
const ri = src.indexOf(FORK_RETURN);
if (si === -1 || ri === -1) { console.error('Markers not found'); process.exit(1); }

const NEW_FORK = `    // ── Fork: top-down TREE (Reingold-Tilford), depth = Y, spread = X ─────────
    if (l === 'fork') {
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])

      // Active brand (from prop or default bmw)
      const fBrand = (activeBrands && activeBrands.size >= 1) ? [...activeBrands][0] : 'bmw'

      // Dim/show nodes
      cy.nodes().forEach(n => {
        if (n.data('brandId') === fBrand) n.style({ opacity: 1, 'pointer-events': 'auto' })
        else n.style({ opacity: 0.05, 'pointer-events': 'none' })
      })
      cy.edges().forEach(e => {
        const sb = cy.getElementById(e.source().id()).data('brandId')
        const tb = cy.getElementById(e.target().id()).data('brandId')
        e.style({ opacity: (sb === fBrand || tb === fBrand) ? 0.9 : 0.02 })
      })

      const activeNodes = cy.nodes().filter(n => n.data('brandId') === fBrand)
      if (activeNodes.length === 0) return

      // ── 1. Build parent-child tree via evolves_into + derived_from ───────
      const children: Record<string, string[]> = {}
      const treeParent: Record<string, string | null> = {}
      activeNodes.forEach(n => { children[n.id()] = []; treeParent[n.id()] = null })

      cy.edges().forEach(e => {
        const s = e.source().id(), t = e.target().id()
        const type = e.data('type') as string
        if (type !== 'evolves_into' && type !== 'derived_from' && type !== 'variant_of') return
        if (!children[s] || !children[t]) return
        if (!children[s].includes(t)) {
          children[s].push(t)
          if (treeParent[t] === null) treeParent[t] = s  // first parent wins
        }
      })

      // Sort children by year
      Object.keys(children).forEach(pid => {
        children[pid].sort((a, b) => {
          return (cy.getElementById(a).data('year') ?? 0) - (cy.getElementById(b).data('year') ?? 0)
        })
      })

      // ── 2. Compute BFS depth from roots ──────────────────────────────────
      const fDepth: Record<string, number> = {}
      const roots = activeNodes.filter(n => !treeParent[n.id()]).map(n => n.id())
      const bfsQ = roots.map(r => ({ id: r, d: 0 }))
      while (bfsQ.length > 0) {
        const { id, d } = bfsQ.shift()!
        fDepth[id] = Math.max(fDepth[id] ?? 0, d)
        ;(children[id] ?? []).forEach(c => bfsQ.push({ id: c, d: d + 1 }))
      }
      const maxForkDepth = Math.max(0, ...Object.values(fDepth))

      // ── 3. Reingold-Tilford X assignment ─────────────────────────────────
      const LEAF_W  = 94    // px per leaf slot
      const LEVEL_H = 140   // px per depth level
      const FPAD    = 80

      const subtreeSize: Record<string, number> = {}
      const computeSize = (id: string): number => {
        const ch = children[id] ?? []
        if (ch.length === 0) { subtreeSize[id] = 1; return 1 }
        const s = ch.reduce((acc: number, c: string) => acc + computeSize(c), 0)
        subtreeSize[id] = s
        return s
      }
      roots.forEach(r => computeSize(r))

      let leafIdx = 0
      const assignX: Record<string, number> = {}
      const assignPositions = (id: string) => {
        const ch = children[id] ?? []
        if (ch.length === 0) {
          assignX[id] = leafIdx * LEAF_W
          leafIdx++
        } else {
          ch.forEach((c: string) => assignPositions(c))
          assignX[id] = ch.reduce((s: number, c: string) => s + (assignX[c] ?? 0), 0) / ch.length
        }
      }
      roots.forEach(r => assignPositions(r))

      // Nodes not reached by BFS (disconnected within brand) → place after tree
      activeNodes.forEach(n => {
        if (fDepth[n.id()] === undefined) {
          fDepth[n.id()] = maxForkDepth + 1
          assignX[n.id()] = leafIdx * LEAF_W
          leafIdx++
        }
      })

      // ── 4. Build position map ─────────────────────────────────────────────
      const treePos: Record<string, { x: number; y: number }> = {}
      activeNodes.forEach(n => {
        const d = fDepth[n.id()] ?? 0
        treePos[n.id()] = {
          x: FPAD + (assignX[n.id()] ?? 0),
          y: FPAD + d * LEVEL_H,
        }
      })
      cy.nodes().forEach(n => { if (!treePos[n.id()]) treePos[n.id()] = { x: -9999, y: -9999 } })

      // ── 5. Build HORIZONTAL depth zone overlays ───────────────────────────
      const fModelW = FPAD * 2 + leafIdx * LEAF_W
      const fModelH = FPAD * 2 + (maxForkDepth + 2) * LEVEL_H
      const fFitPad = 60
      const fCEl = cy.container(); const fCW = fCEl ? fCEl.clientWidth : 1200
      const fEstZ = Math.min((height - fFitPad*2)/fModelH, (fCW - fFitPad*2)/fModelW)
      const fEstPX = (fCW - fModelW * fEstZ) / 2
      const fEstPY = (height - fModelH * fEstZ) / 2

      const D_EN = ['Founders','Generation 2','Generation 3','Generation 4','Generation 5','Generation 6','Generation 7','Gen 8+']
      const D_RU = ['Основатели','2-е поколение','3-е поколение','4-е поколение','5-е поколение','6-е поколение','7-е поколение','8+']
      const D_COL = ['#ffd700','#00d4ff','#a78bfa','#00ff88','#ff9500','#e879f9','#38bdf8','#94a3b8']

      const buildForkHBands = (pY: number, z: number): GenRow[] =>
        Array.from({ length: maxForkDepth + 2 }, (_, d) => {
          const yTop  = FPAD + d * LEVEL_H - LEVEL_H * 0.45
          const yBot  = FPAD + d * LEVEL_H + LEVEL_H * 0.55
          return {
            gen: d,
            label: (locale === 'ru' ? D_RU : D_EN)[d] ?? ('Gen ' + (d+1)),
            top:    Math.max(0, (yTop * z + pY) / height * 100),
            height: Math.max(0.5, (yBot - yTop) * z / height * 100),
          }
        }).filter(b => b.top < 100)

      const fLayout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => treePos[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: fFitPad, animate: true, animationDuration: 750,
      } as cytoscape.LayoutOptions)
      fLayout.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom()
        setGenRows(buildForkHBands(p.y, z))
        cy.off('pan zoom')
        cy.on('pan zoom', () => { setGenRows(buildForkHBands(cy.pan().y, cy.zoom())) })
      })
      fLayout.run()
      setGenRows(buildForkHBands(fEstPY, fEstZ))
      return
    }`;

src = src.slice(0, si) + NEW_FORK + src.slice(ri + FORK_RETURN.length);
fs.writeFileSync(path, src, 'utf8');
console.log('Fork tree algorithm applied. Size:', src.length);
