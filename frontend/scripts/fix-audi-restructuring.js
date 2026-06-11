/**
 * fix-audi-restructuring.js
 *
 * Audi провела реструктуризацию модельного ряда в 2024-2025:
 * - Чётные номера (A4, A6, A8, Q6, Q8) → зарезервированы для EV
 * - Нечётные (A3, A5, A7) → ДВС/гибриды
 *
 * Ключевое изменение: новый A5 (2025, платформа PPC) ЗАМЕНЯЕТ старый A4.
 * A4 B10 никогда не выходил — вместо него вышел A5 (2025).
 *
 * Источники:
 *  - The Car Connection: "Audi A4 replaced by new Audi A5"
 *  - TFLcar: "The Audi A4 Is Dead: Long Live the 2025 Audi A5"
 *  - Motor Authority: "2025 Audi A5/S5 gasses up a smarter, sharper A4 replacement"
 *  - Cars.com: "All-New 2025 Audi A5 Replaces Previous A5 and A4"
 */
const fs   = require('fs')
const path = require('path')
const GRAPH = path.join(__dirname, '../public/data/evolution/graph.json')

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))
let changes = []

// Утилиты
const node = (id, label, year, codeName, modelSlug, zone, hp, eng, extra={}) => ({
  id, label, type:'generation', year, brandId:'audi', brandName:'Audi',
  codeName, modelSlug, bodyType: zone.includes('suv') ? 'suv' : 'sedan',
  segment: zone === 'electric' ? 'electric' : 'premium', zone, hp, engineType: eng, ...extra,
})
const hasNode = id => g.nodes.some(n => n.id === id)
const addNode = n => { if(!hasNode(n.id)){ g.nodes.push(n); changes.push('+ node: '+n.label+' ('+n.year+')') } }
const delNode = id => {
  const i = g.nodes.findIndex(n=>n.id===id)
  if(i>=0){ changes.push('- node: '+g.nodes[i].label); g.nodes.splice(i,1) }
}
const patchNode = (id, patch) => {
  const n = g.nodes.find(n=>n.id===id)
  if(n){ Object.assign(n, patch); changes.push('~ patch: '+id+' → '+JSON.stringify(patch)) }
}
const hasEdge = id => g.edges.some(e=>e.id===id)
const addEdge = (id, source, target, type, strength=0.95) => {
  if(!hasEdge(id) && hasNode(source) && hasNode(target)){
    g.edges.push({id,source,target,type,strength})
    const sn=g.nodes.find(n=>n.id===source), tn=g.nodes.find(n=>n.id===target)
    changes.push('+ edge: '+sn?.label+' —['+type+']→ '+tn?.label)
  }
}
const delEdge = id => {
  const i = g.edges.findIndex(e=>e.id===id)
  if(i>=0){ const e=g.edges[i]; changes.push('- edge: '+e.source+' → '+e.target); g.edges.splice(i,1) }
}
const delEdgeWhere = pred => {
  const toRemove = g.edges.filter(pred)
  toRemove.forEach(e => { const i=g.edges.indexOf(e); if(i>=0){ g.edges.splice(i,1); changes.push('- edge: '+e.source+' → '+e.target+' ['+e.type+']') } })
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. УДАЛИТЬ audi-a4b10 — этот автомобиль НИКОГДА НЕ ВЫХОДИЛ
//    Вместо него вышел новый A5 (2025) на платформе PPC
// ══════════════════════════════════════════════════════════════════════════════
delEdgeWhere(e => e.source==='audi-a4b9' && e.target==='audi-a4b10')
delEdgeWhere(e => e.source==='audi-a4b9-fl' && e.target==='audi-a4b10')
delEdgeWhere(e => e.target==='audi-a4b10')
delEdgeWhere(e => e.source==='audi-a4b10')
delNode('audi-a4b10')

// ══════════════════════════════════════════════════════════════════════════════
// 2. ДОБАВИТЬ новый A5 (2025) — реальный преемник A4 на платформе PPC
//    Заменяет ОБА: старый A4 (седан/авант) И старый A5 (sportback)
//    2.0T 268hp (A5) / 3.0T V6 362hp (S5)
//    Кузов: 4-дверный лифтбэк + Avant
// ══════════════════════════════════════════════════════════════════════════════
addNode(node('audi-a5-2025',  'A5 (2025)',  2025, 'B10',    'audi-a5',   'exec_sed', 268, 'i4t'))
addNode(node('audi-s5-2025',  'S5 (2025)',  2025, 'B10 S',  'audi-s5',   'sports',   362, 'v6t'))
addNode(node('audi-rs5-2025', 'RS5 (2025)', 2026, 'B10 RS', 'audi-rs5',  'sports',   500, 'v6t'))

// A4 B9.5 → новый A5 (A4 умер, A5 — его официальный преемник)
addEdge('au-a4-to-a5', 'audi-a4b9-fl', 'audi-a5-2025', 'evolves_into')
// Старый A5 F5B → новый A5 (A5 также поглощает старую A5 линейку)
addEdge('au-a5-f5b-to-2025', 'audi-a5-f5b', 'audi-a5-2025', 'evolves_into')
// S5 и RS5 — варианты нового A5
addEdge('au-s5-2025-va',  'audi-a5-2025', 'audi-s5-2025',  'variant_of', 0.9)
addEdge('au-rs5-2025-va', 'audi-a5-2025', 'audi-rs5-2025', 'variant_of', 0.9)
// RS5 Sedan 2027 → продолжение RS5 2025
addEdge('au-rs5-2025-to-2027', 'audi-rs5-2025', 'ncs-audi-2027-audi-rs5-sedan', 'evolves_into')
// Убрать прямое ребро RS5 B9 → RS5 Sedan 2027 (теперь через RS5 2025)
delEdgeWhere(e => e.id==='au-rs5-ev2')

// ══════════════════════════════════════════════════════════════════════════════
// 3. ДОБАВИТЬ A6 e-tron (2024) — отдельный EV на платформе PPE
//    НЕ является переименованием A6 C8! Это принципиально новый электромобиль.
//    A6 C8 (ДВС) продолжается параллельно.
// ══════════════════════════════════════════════════════════════════════════════
addNode(node('audi-a6-etron-c9', 'A6 e-tron',    2024, 'C9',    'audi-a6-etron', 'electric', 367, 'ev'))
addNode(node('audi-s6-etron-c9', 'S6 e-tron',    2024, 'C9 S',  'audi-s6-etron', 'electric', 551, 'ev'))
addNode(node('audi-q8-etron-h9', 'Q8 e-tron',    2023, 'H9',    'audi-q8-etron', 'suv_large',408, 'ev'))
// A6 e-tron — электрический наследник концепции A6 (параллельная EV-линия)
addEdge('au-a6-etron-derived',   'audi-a6-c8',     'audi-a6-etron-c9', 'derived_from', 0.7)
addEdge('au-s6-etron-va',        'audi-a6-etron-c9','audi-s6-etron-c9', 'variant_of',   0.9)
// Q8 F8 → Q8 e-tron (в 2023 модель переименована)
addEdge('au-q8-renamed', 'audi-q8-f8', 'audi-q8-etron-h9', 'facelifted_to', 0.9)

// ══════════════════════════════════════════════════════════════════════════════
// 4. ИСПРАВИТЬ ошибочные рёбра
// ══════════════════════════════════════════════════════════════════════════════
// Nuvolari → C Concept: неверная связь (убрать)
delEdgeWhere(e => e.source==='ncs-audi-2028-audi-nuvolari' && e.target==='ncs-audi-2025-audi-c-concept')
// R8 Typ 4S → Nuvolari: правильная, Nuvolari = духовный преемник R8 ✓ (оставить)

// ══════════════════════════════════════════════════════════════════════════════
// 5. ОБНОВИТЬ метаданные A5 F5 (старый A5, неправильный modelSlug)
// ══════════════════════════════════════════════════════════════════════════════
patchNode('audi-a5-f5',  { modelSlug: 'audi-a5', zone: 'gt_coupe' })
patchNode('audi-a5-f5b', { modelSlug: 'audi-a5', zone: 'gt_coupe' })
patchNode('audi-a5-8t',  { zone: 'gt_coupe' })

// Q8 F8: переименован в "Q8 e-tron" в 2023 — обновляем метку
patchNode('audi-q8-f8', { label: 'Q8 F8 (Q8 e-tron)', modelSlug: 'audi-q8-etron' })

// ══════════════════════════════════════════════════════════════════════════════
// 6. ДОБАВИТЬ пропущенные модели (A3 e-tron, Q2 e-tron)
// ══════════════════════════════════════════════════════════════════════════════
// Пока не добавляем неподтверждённые модели

// ── Сохранение ────────────────────────────────────────────────────────────────
fs.writeFileSync(GRAPH, JSON.stringify(g, null, 2), 'utf8')
console.log('=== Изменения Audi реструктуризация ===')
changes.forEach(c => console.log(' ', c))
console.log('\n✅ Граф обновлён:', g.nodes.filter(n=>n.brandId==='audi').length, 'Audi-узлов,', g.edges.filter(e=>{
  const s=g.nodes.find(n=>n.id===e.source); return s?.brandId==='audi';
}).length, 'Audi-рёбер')
console.log('\nКлючевые изменения:')
console.log('  • A4 B10 (фантомная модель) — УДАЛЁН')
console.log('  • A5 (2025) на PPC платформе — ДОБАВЛЕН как преемник A4')
console.log('  • A5 F5B → A5 (2025) + A4 B9.5 → A5 (2025) — ПРАВИЛЬНЫЕ цепи')
console.log('  • A6 e-tron (2024, PPE) — ДОБАВЛЕН как отдельный EV')
console.log('  • Q8 e-tron (2023) — ДОБАВЛЕН как EV-версия Q8')
console.log('  • RS5 (2025) → RS5 Sedan (2027) — СВЯЗЬ ИСПРАВЛЕНА')
