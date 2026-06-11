import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchGeneration, compareGenerations, getAnalysis, QK } from '@/lib/api'
import type { Generation, ComparisonResult, AIAnalysis } from '@/lib/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UseCompareReturn {
  gen1Id: string | null
  gen2Id: string | null
  setGen1Id: (id: string | null) => void
  setGen2Id: (id: string | null) => void
  generation1: Generation | undefined
  generation2: Generation | undefined
  comparison: ComparisonResult | undefined
  aiNarrative: AIAnalysis | undefined
  isLoading: boolean
  isLoadingGen1: boolean
  isLoadingGen2: boolean
  isLoadingComparison: boolean
  isLoadingNarrative: boolean
  error: Error | null
  reset: () => void
  swapGenerations: () => void
  isReady: boolean
  similarityScore: number
  similarityPercent: number
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useCompare(): UseCompareReturn {
  const [gen1Id, setGen1Id] = useState<string | null>(null)
  const [gen2Id, setGen2Id] = useState<string | null>(null)

  // Fetch generation 1
  const gen1Query = useQuery({
    queryKey: QK.generations.detail(gen1Id ?? ''),
    queryFn: () => fetchGeneration(gen1Id!),
    enabled: !!gen1Id,
    staleTime: 10 * 60_000,
  })

  // Fetch generation 2
  const gen2Query = useQuery({
    queryKey: QK.generations.detail(gen2Id ?? ''),
    queryFn: () => fetchGeneration(gen2Id!),
    enabled: !!gen2Id,
    staleTime: 10 * 60_000,
  })

  const isReady = !!gen1Id && !!gen2Id

  // Comparison result
  const comparisonQuery = useQuery({
    queryKey: QK.comparison.pair(gen1Id ?? '', gen2Id ?? ''),
    queryFn: () => compareGenerations(gen1Id!, gen2Id!),
    enabled: isReady,
    staleTime: 15 * 60_000,
  })

  // AI narrative — depends on comparison being done
  const comparisonId = comparisonQuery.data?.id
  const narrativeQuery = useQuery({
    queryKey: QK.analysis.entity('comparison', comparisonId ?? '', 'generation_comparison'),
    queryFn: () => getAnalysis('comparison', comparisonId!, 'generation_comparison'),
    enabled: !!comparisonId,
    staleTime: 30 * 60_000,
  })

  const reset = useCallback(() => {
    setGen1Id(null)
    setGen2Id(null)
  }, [])

  const swapGenerations = useCallback(() => {
    setGen1Id((prev) => gen2Id)
    setGen2Id((prev) => gen1Id)
  }, [gen1Id, gen2Id])

  const similarityScore = comparisonQuery.data?.similarityScore ?? 0
  const similarityPercent = Math.round(similarityScore * 100)

  const anyError =
    gen1Query.error ?? gen2Query.error ?? comparisonQuery.error ?? narrativeQuery.error

  return {
    gen1Id,
    gen2Id,
    setGen1Id,
    setGen2Id,
    generation1: gen1Query.data,
    generation2: gen2Query.data,
    comparison: comparisonQuery.data,
    aiNarrative: narrativeQuery.data ?? comparisonQuery.data?.aiNarrative,
    isLoading:
      gen1Query.isLoading ||
      gen2Query.isLoading ||
      comparisonQuery.isLoading ||
      narrativeQuery.isLoading,
    isLoadingGen1: gen1Query.isLoading,
    isLoadingGen2: gen2Query.isLoading,
    isLoadingComparison: comparisonQuery.isLoading,
    isLoadingNarrative: narrativeQuery.isLoading,
    error: (anyError as Error | null) ?? null,
    reset,
    swapGenerations,
    isReady,
    similarityScore,
    similarityPercent,
  }
}
