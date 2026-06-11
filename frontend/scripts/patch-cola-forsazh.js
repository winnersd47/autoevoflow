/**
 * Fixes cola block: replaces misplaced Fork v4 code with proper Форсаж algorithm.
 * Форсаж: X = HP, Y = engine type group → shows performance clusters.
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

const COLA_START = '    // ── Форсаж (Force/Cola): clean physics simulation, no zone overlays ──────\n    if (l === \'cola\') {';
const COLA_END   = '      fLayoutV.run()\n      syncForkOverlay(fEstPX, fEstPY, fEstZ, fCW)\n      return\n    }';

const si = src.indexOf(COLA_START);
const ei = src.indexOf(COLA_END);
if (si === -1) { console.error('COLA_START not found'); process.exit(1); }
if (ei === -1) { console.error('COLA_END not found'); process.exit(1); }

const NEW_COLA = `    // ── Форсаж: HP axis (X) × Engine type (Y) → logical performance clusters ──
    if (l === 'cola') {
      cy.nodes().removeStyle(); cy.edges().removeStyle()
      setEngineBands([]); setHpLines([])
      setEraCols([]); setGenRows([])
      setBrandBands([]); setYearTicks([])
      setZoneLabels([]); setDecadeLines([])
      cy.off('pan zoom')

      const fCyNodes = cy.nodes()
      if (fCyNodes.length === 0) return

      // Engine type → row index (top = EV/Hybrid, bottom = small I4)
      const ENGINE_ROW: Record<string, number> = {
        ev: 0, hybrid: 1,
        v12: 2, flat12: 2,
        v10: 3,
        v8t: 4, v8h: 4, v8: 5,
        flat6t: 6, flat6: 7,
        i6t: 8, i6: 9,
        i5t: 10,
        v6t: 11, v6h: 11, v6s: 11, v6: 12,
        i4t: 13, i4h: 13, i4: 14,
        flat4t: 15, flat4: 15,
      }
      const ENGINE_COLOR: Record<string, string> = {
        ev: '#22d3ee', hybrid: '#a3e635',
        v12: '#ff2800', flat12: '#ff6b6b',
        v10: '#e6b800',
        v8t: '#ff9500', v8h: '#fbbf24', v8: '#f59e0b',
        flat6t: '#ffd700', flat6: '#ffe566',
        i6t: '#00d4ff', i6: '#7dd3fc',
        i5t: '#a78bfa',
        v6t: '#00ff88', v6h: '#6ee7b7', v6s: '#34d399', v6: '#34d399',
        i4t: '#c084fc', i4h: '#d8b4fe', i4: '#e9d5ff',
        flat4t: '#94a3b8', flat4: '#cbd5e1',
      }
      const ENGINE_LABEL: Record<string, string> = {
        ev: 'Electric', hybrid: 'Hybrid',
        v12: 'V12', flat12: 'Flat-12',
        v10: 'V10',
        v8t: 'V8 Turbo', v8h: 'V8 Hybrid', v8: 'V8 NA',
        flat6t: 'Flat-6 Turbo', flat6: 'Flat-6 NA',
        i6t: 'I6 Turbo', i6: 'I6 NA',
        i5t: 'I5 Turbo',
        v6t: 'V6 Turbo', v6h: 'V6 Hybrid', v6s: 'V6', v6: 'V6 NA',
        i4t: 'I4 Turbo', i4h: 'I4 Hybrid', i4: 'I4 NA',
        flat4t: 'Flat-4 Turbo', flat4: 'Flat-4 NA',
      }

      const HP_SCALE  = 1.1   // px per hp
      const ROW_H     = 95    // px per engine row
      const PAD_LEFT  = 60
      const PAD_TOP   = 50
      const JITTER    = 20    // random spread within same HP bucket

      // Collect HP range
      const hpVals = fCyNodes.map(n => (n.data('hp') as number) ?? 150).filter(h => h > 0)
      const minHP = Math.min(...hpVals)

      // Assign initial positions: X = HP, Y = engine row + small jitter
      const hpBucketCount: Record<string, number> = {}
      fCyNodes.forEach(node => {
        const hp  = (node.data('hp') as number) ?? 150
        const eng = (node.data('engineType') as string) ?? 'i4'
        const row = ENGINE_ROW[eng] ?? 14
        const bucket = Math.round(hp / 50) * 50 + ':' + row
        const jIdx = hpBucketCount[bucket] ?? 0
        hpBucketCount[bucket] = jIdx + 1
        const jX = (jIdx % 3) * JITTER - JITTER
        const jY = Math.floor(jIdx / 3) * (JITTER * 0.6)
        node.position({
          x: PAD_LEFT + (hp - minHP) * HP_SCALE + jX,
          y: PAD_TOP  + row * ROW_H + jY + ROW_H / 2,
        })
      })

      applyEdgeVisibility('cola')

      // Run short cola physics from seeded positions → organic clusters
      const colaL = cy.layout({
        name: 'cola',
        nodeSpacing: 22,
        edgeLength: 80,
        maxSimulationTime: 800,
        convergenceThreshold: 0.005,
        animate: true,
        animationDuration: 700,
        fit: true,
        padding: 50,
        randomize: false,  // use seeded positions
      } as cytoscape.LayoutOptions)

      // Build engine zone overlays after physics settles
      const buildEngineBands = (pY: number, z: number): void => {
        const rows = new Set(fCyNodes.map(n => ENGINE_ROW[(n.data('engineType') as string) ?? 'i4'] ?? 14))
        const sortedRows = [...rows].sort((a,b) => a-b)
        const bands = sortedRows.map(row => {
          const eng = Object.keys(ENGINE_ROW).find(k => ENGINE_ROW[k] === row) ?? 'i4'
          return {
            label: ENGINE_LABEL[eng] ?? eng,
            color: ENGINE_COLOR[eng] ?? '#888',
            top:    Math.max(0, ((PAD_TOP + row * ROW_H) * z + pY) / height * 100),
            height: Math.max(0.3, ROW_H * z / height * 100),
          }
        })
        setEngineBands(bands)
      }

      const buildHpLines = (pX: number, z: number, cW: number): void => {
        const maxHP = Math.max(...hpVals)
        const lines: {hp: number; left: number}[] = []
        for (let hp = 100; hp <= maxHP + 100; hp += 100) {
          const left = ((PAD_LEFT + (hp - minHP) * HP_SCALE) * z + pX) / cW * 100
          if (left > 0 && left < 100) lines.push({ hp, left })
        }
        setHpLines(lines)
      }

      colaL.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? 1200
        buildEngineBands(p.y, z)
        buildHpLines(p.x, z, cw)
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          buildEngineBands(pp.y, zz)
          buildHpLines(pp.x, zz, cww)
        })
      })

      colaL.run()
      return
    }`;

src = src.slice(0, si) + NEW_COLA + src.slice(ei + COLA_END.length);
fs.writeFileSync(path, src, 'utf8');
console.log('Форсаж algorithm fixed. Size:', src.length);
