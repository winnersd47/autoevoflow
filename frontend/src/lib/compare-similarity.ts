// Честный rule-based процент схожести двух поколений — без embedding-векторов
// (которых в graph.json нет и предпосчитать для всех пар физически нереально,
// см. обсуждение /compare в этой сессии). Раньше /compare всегда показывал
// "совпадение 0%" — не расчёт, а просто fallback мёртвого API, абсурдный для
// пары вроде BMW M3 E92 vs M3 E36 (буквально одна модель разных поколений).
// Веса подобраны так, чтобы "та же модель" доминировала над совпадением
// отдельных характеристик — это самый сильный сигнал родства из того, что
// реально есть в данных.

export interface SimilarityInput {
  brandId: string
  modelSlug?: string
  bodyType?: string
  segment?: string
  engineType?: string
  hp?: number
}

export function computeSimilarity(a: SimilarityInput, b: SimilarityInput): number {
  let score = 0

  if (a.brandId === b.brandId) score += 0.2
  if (a.modelSlug && a.modelSlug === b.modelSlug) score += 0.35
  if (a.bodyType && a.bodyType === b.bodyType) score += 0.15
  if (a.segment && a.segment === b.segment) score += 0.1

  if (a.engineType && b.engineType) {
    if (a.engineType === b.engineType) score += 0.1
    else if (sameEngineFamily(a.engineType, b.engineType)) score += 0.05
  }

  if (a.hp && b.hp) {
    const diff = Math.abs(a.hp - b.hp) / Math.max(a.hp, b.hp)
    score += Math.max(0, 0.1 * (1 - diff))
  }

  return Math.max(0, Math.min(1, score))
}

function sameEngineFamily(a: string, b: string): boolean {
  const family = (t: string) => (t === 'ev' ? 'electric' : /^(phev|erev)$/.test(t) ? 'hybrid' : 'ice')
  return family(a) === family(b)
}
