'use strict'
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

const existingIds = new Set(g.nodes.map(n => n.id))
const existingEdgeIds = new Set(g.edges.map(e => e.id))

const newEdges = [
  { id: 'taycan-inspires-p7',       source: 'porsche-taycan',      target: 'xpeng-p7',          type: 'inspired_by', strength: 0.78 },
  { id: 'taycan-inspires-et7',      source: 'porsche-taycan',      target: 'nio-et7',           type: 'inspired_by', strength: 0.72 },
  { id: 'bmw-ix-inspires-avatr11',  source: 'bmw-ix-i20',          target: 'avatr-11',          type: 'inspired_by', strength: 0.70 },
  { id: 'etrongt-inspires-avatr12', source: 'audi-etron-gt',       target: 'avatr-12',          type: 'inspired_by', strength: 0.74 },
  { id: 'eqs-inspires-et9',         source: 'merc-eq-eqs',         target: 'nio-et9',           type: 'inspired_by', strength: 0.69 },
  { id: 'sw223-inspires-et9',       source: 'merc-s-w223',         target: 'nio-et9',           type: 'inspired_by', strength: 0.75 },
  { id: 'urus-inspires-yw-u8',      source: 'lambo-urus',          target: 'byd-yangwang-u8',   type: 'inspired_by', strength: 0.73 },
  { id: 'spectre-inspires-et9',     source: 'rolls-royce-spectre', target: 'nio-et9',           type: 'inspired_by', strength: 0.65 },
  { id: 'pan971-inspires-avatr12',  source: 'porsche-pan-971',     target: 'avatr-12',          type: 'inspired_by', strength: 0.68 },
  { id: 'bmwi4-inspires-p7',        source: 'bmw-i4-g26',          target: 'xpeng-p7',          type: 'inspired_by', strength: 0.66 },
  { id: 'maybacheqs-inspires-mega', source: 'merc-maybach-eqs680', target: 'li-auto-mega',      type: 'inspired_by', strength: 0.72 },
  { id: 'q8etron-inspires-zeekr7x', source: 'audi-q8-etron-h9',   target: 'zeekr-7x',          type: 'inspired_by', strength: 0.67 },
  { id: 'macanj1-inspires-zeekrx',  source: 'porsche-mac-j1',      target: 'zeekr-x',           type: 'inspired_by', strength: 0.64 },
  { id: 'bmwi5-inspires-et5',       source: 'bmw-i5-g60',          target: 'nio-et5',           type: 'inspired_by', strength: 0.71 },
  { id: 'et7-platform-to-l9',       source: 'nio-et7',             target: 'li-auto-l9',        type: 'inspired_by', strength: 0.62 },
  { id: 'sealion9-to-denza-z9',     source: 'byd-sea-lion9',       target: 'denza-z9gt',        type: 'shares_platform', strength: 0.80 },
  { id: 'byd-han-vs-et7',           source: 'byd-han-ev',          target: 'nio-et7',           type: 'inspired_by', strength: 0.61 },
]

let added = 0, skipped = 0, missing = 0

for (const edge of newEdges) {
  if (existingEdgeIds.has(edge.id)) { skipped++; continue }
  if (!existingIds.has(edge.source)) { console.log('MISSING source:', edge.source); missing++; continue }
  if (!existingIds.has(edge.target)) { console.log('MISSING target:', edge.target); missing++; continue }
  g.edges.push(edge)
  existingEdgeIds.add(edge.id)
  added++
}

fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log('Done! added:', added, 'skipped:', skipped, 'missing:', missing)
console.log('total nodes:', g.nodes.length, 'total edges:', g.edges.length)
const broken = g.edges.filter(e => !existingIds.has(e.source) || !existingIds.has(e.target))
console.log('integrity:', broken.length ? broken.length + ' broken' : 'no broken edges')
