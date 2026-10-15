const g = require('../public/data/evolution/graph.json')

const NEW_BRANDS = new Set(['hyundai','genesis','kia','mitsubishi','peugeot','renault','alfa-romeo','acura','infiniti','moskvich'])
const newNodes = new Map(g.nodes.filter(n => NEW_BRANDS.has(n.brandId)).map(n => [n.id, n]))
const nodeById = new Map(g.nodes.map(n => [n.id, n]))

console.log('=== evolves_into цепочки (новые бренды) ===')
g.edges
  .filter(e => e.type === 'evolves_into' && (newNodes.has(e.source) || newNodes.has(e.target)))
  .forEach(e => {
    const s = nodeById.get(e.source), t = nodeById.get(e.target)
    if (s && t) console.log(`  ${s.label} (${s.year}) → ${t.label} (${t.year})`)
  })

console.log('\n=== variant_of рёбра (новые бренды) ===')
g.edges
  .filter(e => e.type === 'variant_of' && (newNodes.has(e.source) || newNodes.has(e.target)))
  .forEach(e => {
    const s = nodeById.get(e.source), t = nodeById.get(e.target)
    if (s && t) console.log(`  BASE: ${s.label} → VARIANT: ${t.label}`)
  })

console.log('\n=== facelifted_to рёбра (новые бренды) ===')
g.edges
  .filter(e => e.type === 'facelifted_to' && (newNodes.has(e.source) || newNodes.has(e.target)))
  .forEach(e => {
    const s = nodeById.get(e.source), t = nodeById.get(e.target)
    if (s && t) console.log(`  ${s.label} → FL: ${t.label}`)
  })
