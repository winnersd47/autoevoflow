#!/usr/bin/env node
/**
 * fix-variant-of-direction.js
 *
 * Layout ожидает: source=BASE → variant_of → target=VARIANT
 *   variantParentFK[target] = source  →  target IS A variant OF source
 *
 * Во всех наших скриптах было наоборот: source=VARIANT → target=BASE.
 * Это вызывало инверсию дерева: C6 трактовался как вариант C6 Z06,
 * Camaro Gen.6 — как вариант ZL1, и т.д.
 *
 * Список рёбер для переворота (source ↔ target swap):
 *   Chevrolet: C6/Z06, C7/Z06, C8/Z06, Camaro ZL1, E-Ray
 *   Ford:      GT500 (S550), Dark Horse, GTD, GT500 S650
 *   Dodge:     Viper ACR, Hornet RT→GT, Hornet GLH→RT
 *   Aurus:     Арсен → Senat
 *   AMC:       Hornet SC/360 → Hornet
 *   Lada:      Granta Cross → Granta FL
 *   Lotus NCS: Emira 420 Sport → Emira
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// edge ids, где нужно перевернуть source ↔ target
const TO_REVERSE = new Set([
  // ── Chevrolet ───────────────────────────────────────────────────────────────
  'corvette-c6-z06',            // C6 Z06 → C6  →  C6 → C6 Z06
  'corvette-c7-z06v',           // C7 Z06 → C7  →  C7 → C7 Z06
  'corvette-c8-z06v',           // C8 Z06 → C8  →  C8 → C8 Z06
  'camaro-zl1-var',             // ZL1 → Gen.6  →  Gen.6 → ZL1
  'corvette-e-ray-variant-c8',  // E-Ray → C8   →  C8 → E-Ray

  // ── Ford ─────────────────────────────────────────────────────────────────────
  'f-mus-gt500',                // GT500(2020) → S550  →  S550 → GT500
  'mustang-dark-horse-variant-s650',   // Dark Horse → S650  →  S650 → Dark Horse
  'mustang-gtd-variant-s650',          // GTD → S650  →  S650 → GTD
  'mustang-s650-gt500-variant-s650',   // GT500 S650 → S650  →  S650 → GT500 S650

  // ── Dodge ────────────────────────────────────────────────────────────────────
  'viper-acr-var',              // Viper ACR → Viper SRT  →  SRT → ACR
  'dodge-hornet-rt-variant-gt', // RT PHEV → GT  →  GT → RT PHEV
  'dodge-hornet-glh-variant-rt',// GLH → RT PHEV  →  RT PHEV → GLH

  // ── Aurus ────────────────────────────────────────────────────────────────────
  'aurus-senat-variant-arsen',  // Арсен → Senat  →  Senat → Арсен

  // ── AMC ──────────────────────────────────────────────────────────────────────
  'amc-hornet-1970-variant-sc360', // SC/360 → AMC Hornet  →  AMC Hornet → SC/360

  // ── Lada ─────────────────────────────────────────────────────────────────────
  'lada-granta-fl-variant-cross',  // Granta Cross → Granta FL  →  Granta FL → Cross

  // ── Lotus NCS ────────────────────────────────────────────────────────────────
  'ncs-lotus-emira-420sport-variant-emira', // 420 Sport → Emira  →  Emira → 420 Sport
])

let fixed = 0
g.edges.forEach(e => {
  if (!TO_REVERSE.has(e.id)) return
  const [oldSrc, oldTgt] = [e.source, e.target]
  e.source = oldTgt
  e.target = oldSrc
  console.log(`✅ reversed [${e.id}]: ${oldSrc} ← was → ${oldTgt}`)
  console.log(`                            now: ${e.source} → ${e.target}`)
  fixed++
})

console.log(`\n🔄 Перевёрнуто рёбер: ${fixed} из ${TO_REVERSE.size} целевых`)

// Validate: check no same-brand variant_of edges are cross-brand (sanity check)
const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]))
let crossBrand = 0
g.edges.filter(e => e.type === 'variant_of').forEach(e => {
  const s = byId[e.source], t = byId[e.target]
  if (!s || !t) return
  if (s.brandId !== t.brandId) {
    console.warn(`⚠  кросс-брендовый variant_of [${e.id}]: ${s.label}(${s.brandId}) → ${t.label}(${t.brandId})`)
    crossBrand++
  }
})
if (crossBrand === 0) console.log('✅ Нет кросс-брендовых variant_of')

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
const brands = new Set(g.nodes.map(n => n.brandId)).size
console.log(`\n📦 graph.json: ${g.nodes.length} узлов, ${g.edges.length} рёбер, ${brands} брендов`)
