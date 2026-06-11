/**
 * patch-sync-v3.js — Competitive layout:
 * Horizontal zones = market segments (not brands)
 * Within each zone = one sub-track per model family
 * BMW 3 Series vs Mercedes C-Class vs Audi A4 in the SAME zone
 * X = year, direct visual comparison of generational timing
 */
const fs = require('fs');
const path = 'C:/Users/v.serdyuk/Desktop/automotive-ai-platform/frontend/src/components/graph/EvolutionGraph.tsx';
let src = fs.readFileSync(path, 'utf8');

// Replace sync block
const SYNC_START = '    // ── Синхрон v2: parallel brand tracks, adaptive heights, dimmed cross-brand edges ─';
const SYNC_END   = '      sLayout.run()\n      bldSyncBands(sEstPY, sEstPX, sEstZ, sCW)\n      return\n    }';

const si = src.indexOf(SYNC_START);
const ei = src.indexOf(SYNC_END);
if (si === -1) { console.error('SYNC_START not found'); process.exit(1); }
if (ei === -1) { console.error('SYNC_END not found'); process.exit(1); }

const NEW_SYNC = `    // ── Синхрон v3: COMPETITIVE view — zones = segments, sub-tracks = model families ─
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
      const SX_SCALE = 62    // px per year
      const NODE_SEP = 78    // min gap between node centres
      const PAD_LEFT = 8     // left margin (families labeled via overlay)
      const PAD_TOP  = 40
      const FAMILY_GAP = 14  // px between families within zone
      const ZONE_GAP   = 28  // px between zones

      // ── Competitive segment zones (coarser than BODY_TYPE_ZONES) ──────────
      const COMP_ZONES: { key: string; label: string; labelRu: string; color: string; zones: string[] }[] = [
        { key: 'hyper',    label: 'Hypercars',          labelRu: 'Гиперкары',         color: '#ffd700', zones: ['hypercar'] },
        { key: 'super',    label: 'Supercars',           labelRu: 'Суперкары',         color: '#ff2800', zones: ['supercar'] },
        { key: 'sports',   label: 'Sports Cars',         labelRu: 'Спорткары',         color: '#ff9500', zones: ['sports'] },
        { key: 'gt',       label: 'GT Coupes & Open',    labelRu: 'GT Купе и Кабрио',  color: '#e879f9', zones: ['gt_coupe','open_top'] },
        { key: 'flagship', label: 'Flagship Sedans',     labelRu: 'Флагманы',          color: '#a78bfa', zones: ['flagship_sed'] },
        { key: 'exec',     label: 'Executive Sedans',    labelRu: 'Бизнес-класс',      color: '#00d4ff', zones: ['exec_sed'] },
        { key: 'compact',  label: 'Premium Compact',     labelRu: 'Компакт Премиум',   color: '#00ff88', zones: ['midsize_sed'] },
        { key: 'suv_l',    label: 'Large SUVs',          labelRu: 'Крупные SUV',       color: '#f97316', zones: ['suv_large'] },
        { key: 'suv_m',    label: 'Mid SUVs',            labelRu: 'Средние SUV',       color: '#fb923c', zones: ['suv_mid'] },
        { key: 'suv_s',    label: 'Compact SUVs',        labelRu: 'Компакт SUV',       color: '#fbbf24', zones: ['suv_compact'] },
        { key: 'hatch',    label: 'Hatchbacks',          labelRu: 'Хэтчбеки',          color: '#34d399', zones: ['hatchback'] },
        { key: 'ev',       label: 'Electric',            labelRu: 'Электро',           color: '#22d3ee', zones: ['electric'] },
        { key: 'other',    label: 'Other',               labelRu: 'Прочие',            color: '#64748b', zones: [] },
      ]

      // Map node zone → comp zone key
      const getCompZone = (nodeZone: string | undefined): string => {
        if (!nodeZone) return 'other'
        for (const cz of COMP_ZONES) {
          if (cz.zones.includes(nodeZone)) return cz.key
        }
        return 'other'
      }

      const BRAND_COLOR: Record<string, string> = {
        bmw: '#00d4ff', mercedes: '#b8b8b8', audi: '#e84040',
        volkswagen: '#3d7bd6', porsche: '#ffd700', ferrari: '#ff2800',
        lamborghini: '#e6b800', maserati: '#1a4fc4', lotus: '#c8e228',
        seat: '#fa0000', skoda: '#4ba82e',
      }
      const BRAND_ORDER = ['ferrari','lamborghini','porsche','maserati','lotus',
                           'bmw','mercedes','audi','volkswagen','seat','skoda']

      // ── 1. Group nodes: compZone → modelFamily → nodes ────────────────────
      const getFam3 = (id: string, slug: string | undefined): string => {
        if (slug) return slug
        const p = id.split('-')
        return p.length >= 3 ? p[0]+'-'+p[1] : p[0]
      }

      type SNode = { id: string; yr: number; brandId: string; fam: string; compZone: string }
      const allS: SNode[] = []
      cyNodes.forEach(node => {
        const yr       = (node.data('year')      as number)           ?? sMinYear
        const slug     = (node.data('modelSlug') as string|undefined)
        const brandId  = (node.data('brandId')   as string)           ?? 'unknown'
        const nodeZone = (node.data('zone')       as string|undefined)
        allS.push({
          id: node.id(), yr, brandId,
          fam: getFam3(node.id(), slug),
          compZone: getCompZone(nodeZone),
        })
      })

      // compZone → fam → nodes
      const byCompZoneFam: Record<string, Record<string, SNode[]>> = {}
      const famMinYr: Record<string, number> = {}
      allS.forEach(e => {
        if (!byCompZoneFam[e.compZone]) byCompZoneFam[e.compZone] = {}
        if (!byCompZoneFam[e.compZone][e.fam]) byCompZoneFam[e.compZone][e.fam] = []
        byCompZoneFam[e.compZone][e.fam].push(e)
        if (famMinYr[e.fam] === undefined || e.yr < famMinYr[e.fam]) famMinYr[e.fam] = e.yr
      })

      // ── 2. Assign Y positions ─────────────────────────────────────────────
      const syncPos3: Record<string, { x: number; y: number }> = {}
      // For overlay: zone bands + family track labels
      const compZoneBands: { label: string; color: string; top: number; height: number }[] = []
      type FamTrackLabel = { label: string; color: string; top: number }
      const famTrackLabels: FamTrackLabel[] = []

      let curY = PAD_TOP

      COMP_ZONES.forEach(cz => {
        const famMap = byCompZoneFam[cz.key]
        if (!famMap || Object.keys(famMap).length === 0) return

        const zoneTopY = curY
        // Sort families: by brand order, then by earliest year
        const sortedFams = Object.keys(famMap).sort((a, b) => {
          const bA = famMap[a][0]?.brandId ?? ''
          const bB = famMap[b][0]?.brandId ?? ''
          const bi = BRAND_ORDER.indexOf(bA), bj = BRAND_ORDER.indexOf(bB)
          if (bi !== bj) return (bi < 0 ? 99 : bi) - (bj < 0 ? 99 : bj)
          return (famMinYr[a] ?? 0) - (famMinYr[b] ?? 0)
        })

        sortedFams.forEach((fam, fi) => {
          const nodes = famMap[fam].sort((a, b) => a.yr - b.yr)
          const famTopY = curY
          // Greedy sub-rows within family
          const subMaxX: number[] = []
          nodes.forEach(({ id, yr }) => {
            const xBase = PAD_LEFT + (yr - sMinYear) * SX_SCALE
            let sub = 0
            while (sub < subMaxX.length && subMaxX[sub] > xBase - NODE_SEP) sub++
            subMaxX[sub] = xBase
            syncPos3[id] = { x: xBase, y: curY + sub * NODE_SEP + NODE_SEP / 2 }
          })
          const rowsUsed = Math.max(1, subMaxX.length)
          const famH = rowsUsed * NODE_SEP

          // Family track label
          const brandId = famMap[fam][0]?.brandId ?? ''
          const shortName = fam.replace(/^(bmw|mercedes|audi|porsche|ferrari|lamborghini|maserati|lotus|vw|volkswagen|seat|skoda)-/, '')
          famTrackLabels.push({
            label: brandId.toUpperCase() + " " + shortName,
            color: BRAND_COLOR[brandId] ?? '#888',
            top: famTopY,
          })

          curY += famH + FAMILY_GAP
        })

        const zoneH = curY - zoneTopY
        compZoneBands.push({
          label: locale === 'ru' ? cz.labelRu : cz.label,
          color: cz.color,
          top: zoneTopY,
          height: zoneH,
        })
        curY += ZONE_GAP
      })

      // ── 3. Dim intra-segment: show only within-segment edges at full opacity ──
      cy.edges().forEach(e => {
        const sn = allS.find(n => n.id === e.source().id())
        const tn = allS.find(n => n.id === e.target().id())
        if (sn && tn && sn.compZone === tn.compZone) {
          e.style({ opacity: 0.88 })
        } else {
          e.style({ opacity: 0.08, width: 1 })
        }
      })

      // ── 4. Compute overlay ─────────────────────────────────────────────────
      const sModelW = PAD_LEFT * 2 + (sMaxYear - sMinYear) * SX_SCALE
      const sModelH = curY + PAD_TOP
      const sFitPad = 30
      const sCEl = cy.container(); const sCW = sCEl ? sCEl.clientWidth : 1200
      const sEstZ = Math.min((height - sFitPad*2)/sModelH, (sCW - sFitPad*2)/sModelW)
      const sEstPX = (sCW - sModelW * sEstZ) / 2
      const sEstPY = (height - sModelH * sEstZ) / 2

      const bldCompBands = (pY: number, pX: number, z: number, cW: number): void => {
        const bands = compZoneBands.map(b => ({
          label: b.label, color: b.color,
          top:    Math.max(0, (b.top    * z + pY) / height * 100),
          height: Math.max(0.2, b.height * z / height * 100),
        }))
        setEngineBands(bands)

        const lines: { hp: number; left: number }[] = []
        for (let yr = Math.ceil(sMinYear/5)*5; yr <= sMaxYear; yr += 5) {
          const left = ((PAD_LEFT + (yr - sMinYear) * SX_SCALE) * z + pX) / cW * 100
          if (left > 0 && left < 100) lines.push({ hp: yr, left })
        }
        setHpLines(lines)

        // Family track labels as genRows (repurposed: top = Y%, height = for positioning)
        const fTracks = famTrackLabels.map((ft, i) => ({
          gen: i,
          label: ft.label,
          top:    Math.max(0, (ft.top * z + pY) / height * 100),
          height: (BRAND_COLOR[ft.color] ? 1 : 0),  // dummy height, color in label
        }))
        setGenRows(fTracks)
      }

      const sLayout3 = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => syncPos3[node.id()] ?? { x: 0, y: 0 },
        fit: true, padding: sFitPad, animate: true, animationDuration: 700,
      } as cytoscape.LayoutOptions)

      sLayout3.one('layoutstop', () => {
        const p = cy.pan(); const z = cy.zoom(); const cw = cy.container()?.clientWidth ?? sCW
        bldCompBands(p.y, p.x, z, cw)
        cy.off('pan zoom')
        cy.on('pan zoom', () => {
          const pp = cy.pan(); const zz = cy.zoom(); const cww = cy.container()?.clientWidth ?? cw
          bldCompBands(pp.y, pp.x, zz, cww)
        })
      })
      sLayout3.run()
      bldCompBands(sEstPY, sEstPX, sEstZ, sCW)
      return
    }`;

src = src.slice(0, si) + NEW_SYNC + src.slice(ei + SYNC_END.length);
fs.writeFileSync(path, src, 'utf8');
console.log('Sync v3 applied. Size:', src.length);
