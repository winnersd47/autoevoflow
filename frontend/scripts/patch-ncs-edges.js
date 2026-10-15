#!/usr/bin/env node
/**
 * patch-ncs-edges.js — подключает 11 «новинок» (ncs-нод) к их линиям эволюции.
 * Было: 13 предупреждений «ncs-нода без связей»
 * Станет: 2 (Frontier, Terrano — нет базовой ноды в графе)
 */

const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

const ADD = [
  // Lotus Emira 420 Sport 2027 → variant_of → Emira 2022
  { id: 'ncs-lotus-emira-420sport-variant-emira',
    source: 'ncs-lotus-2027-lotus-emira-420-sport',
    target: 'lotus-emira',
    type:   'variant_of', strength: 0.92 },

  // Rolls-Royce Project Nightingale 2026 → inspired → Spectre 2023
  { id: 'ncs-rr-nightingale-inspired-spectre',
    source: 'ncs-rolls-royce-2026-rolls-royce-project-nightingale-concept',
    target: 'rr-spectre',
    type:   'inspired', strength: 0.70 },

  // Subaru Trailseeker 2026 → inspired → Forester SK Phase II 2023
  { id: 'ncs-subaru-trailseeker-inspired-forester-sk-fl',
    source: 'ncs-subaru-2026-subaru-trailseeker',
    target: 'subaru-forester-sk-fl',
    type:   'inspired', strength: 0.68 },

  // Subaru Uncharted 2026 → inspired → Forester SK 2018
  { id: 'ncs-subaru-uncharted-inspired-forester-sk',
    source: 'ncs-subaru-2026-subaru-uncharted',
    target: 'subaru-forester-sk',
    type:   'inspired', strength: 0.60 },

  // BMW Vision Alpina Concept 2026 → inspired → 7 Series G70 (Alpina B7 база)
  { id: 'ncs-bmw-vision-alpina-inspired-7g70',
    source: 'ncs-bmw-2026-bmw-vision-alpina-concept',
    target: 'bmw-7-g70',
    type:   'inspired', strength: 0.78 },

  // Bentley EXP 15 Concept 2025 → inspired → Mulsanne 2010 (flagship heritage)
  { id: 'ncs-bentley-exp15-inspired-mulsanne',
    source: 'ncs-bentley-2025-bentley-exp-15-concept',
    target: 'bentley-mulsanne',
    type:   'inspired', strength: 0.68 },

  // Honda 0 SUV Concept 2025 → inspired → CR-V 6th gen 2022
  { id: 'ncs-honda-0suv-inspired-crv-rn1',
    source: 'ncs-honda-2025-honda-0-suv-concept',
    target: 'honda-crv-rn1',
    type:   'inspired', strength: 0.65 },

  // Lotus Evija 2025 (ncs) → inspired → Emira 2022 (sports car DNA)
  { id: 'ncs-lotus-evija-inspired-emira',
    source: 'ncs-lotus-2025-lotus-evija',
    target: 'lotus-emira',
    type:   'inspired', strength: 0.72 },

  // Lotus Theory 1 Concept 2024 → inspired → Emira 2022
  { id: 'ncs-lotus-theory1-inspired-emira',
    source: 'ncs-lotus-2024-lotus-theory-1-concept',
    target: 'lotus-emira',
    type:   'inspired', strength: 0.65 },

  // Nissan Epic Concept 2024 → inspired → Ariya 2021 (EV platform)
  { id: 'ncs-nissan-epic-inspired-ariya',
    source: 'ncs-nissan-2024-nissan-epic-concept',
    target: 'nissan-ariya',
    type:   'inspired', strength: 0.65 },

  // Mercedes AMG GT 4-Door 2018 → evolves_into → AMG GT 4-Door 2027
  { id: 'merc-amg-gt4-x290-evolves-ncs-2027',
    source: 'merc-amg-gt4-x290',
    target: 'ncs-mercedes-2027-amg-gt-4-door',
    type:   'evolves_into', strength: 0.88 },
]

const existingEdgeIds = new Set(g.edges.map(e => e.id))
const nodeIds         = new Set(g.nodes.map(n => n.id))

let added = 0, skipped = 0
for (const e of ADD) {
  if (existingEdgeIds.has(e.id)) { console.log(`⟳  уже есть: ${e.id}`); skipped++; continue }
  if (!nodeIds.has(e.source)) { console.warn(`⚠  source не найден: ${e.source}`); skipped++; continue }
  if (!nodeIds.has(e.target)) { console.warn(`⚠  target не найден: ${e.target}`); skipped++; continue }
  g.edges.push(e)
  added++
  console.log(`✅ ${e.source} --[${e.type}]--> ${e.target}`)
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
console.log(`\n📦 graph.json: +${added} рёбер (пропущено: ${skipped}) → итого ${g.edges.length}`)
