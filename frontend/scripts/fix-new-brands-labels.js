/**
 * Исправляет ошибки после добавления новых брендов:
 * 1. Переименовывает ноды Evo с суффиксами MR/TME/Final Edition → чистые имена поколений
 * 2. 3000GT VR-4 Final: evolves_into → facelifted_to
 * 3. Alpine A110 → A110 S: facelifted_to → variant_of
 * 4. Удаляет старое прямое ребро Carnival 1→4 (теперь есть цепочка через Gen 2/3)
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'))

let fixes = 0

// ─── 1. Переименование нод ─────────────────────────────────────────────────────
const LABEL_FIXES = {
  'mit-lancer-evo6':  'Lancer Evolution VI (1999)',    // TME — спецверсия, не название поколения
  'mit-lancer-evo8':  'Lancer Evolution VIII (2003)',  // MR — трансмиссионный вариант
  'mit-lancer-evo9':  'Lancer Evolution IX (2005)',    // MR — трансмиссионный вариант
  'mit-lancer-evo10': 'Lancer Evolution X (2008)',     // Final Edition — ограниченный выпуск
  'mit-3000gt-2':     '3000GT VR-4 (1997)',            // Убираем "Final"
}

for (const node of g.nodes) {
  if (LABEL_FIXES[node.id]) {
    console.log(`  RENAME: "${node.label}" → "${LABEL_FIXES[node.id]}"`)
    node.label = LABEL_FIXES[node.id]
    fixes++
  }
}

// ─── 2. 3000GT: evolves_into → facelifted_to (это рестайлинг, не новое поколение) ──
for (const edge of g.edges) {
  if (edge.id === 'e-mit-3000gt-2') {
    console.log(`  EDGE TYPE: 3000GT chain evolves_into → facelifted_to`)
    edge.type = 'facelifted_to'
    edge.strength = 0.85
    fixes++
  }
}

// ─── 3. Alpine A110 → A110 S: facelifted_to → variant_of ─────────────────────
// A110 S — параллельная версия (другой тюн), не рестайлинг
for (const edge of g.edges) {
  if (edge.id === 'e-ren-a110-s') {
    console.log(`  EDGE TYPE: Alpine A110→S facelifted_to → variant_of`)
    edge.type = 'variant_of'
    fixes++
  }
}

// ─── 4. Удалить старое прямое ребро Carnival 1→4 (заменено цепочкой 1→2→3→4) ─
const prevLen = g.edges.length
g.edges = g.edges.filter(e => e.id !== 'e-carnival1-4')
if (g.edges.length < prevLen) {
  console.log(`  REMOVED: direct Carnival 1→4 edge (replaced by 1→2→3→4 chain)`)
  fixes++
}

// ─── Запись ───────────────────────────────────────────────────────────────────
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2))
console.log(`\nApplied ${fixes} fix(es). Total: ${g.nodes.length} nodes, ${g.edges.length} edges`)
