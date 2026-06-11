import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBrandGraph, fetchModelEvolution, QK } from '@/lib/api'
import { buildCytoscapeElements, filterGraphData } from '@/lib/graph-utils'
import type { GraphNode, GraphLayoutType, CytoscapeElements, GraphData } from '@/lib/types'
import { useAppStore } from '@/store'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UseEvolutionGraphOptions {
  brandId?: string
  modelSlug?: string
}

interface UseEvolutionGraphReturn {
  elements: CytoscapeElements
  rawData: GraphData | undefined
  selectedNode: GraphNode | null
  setSelectedNode: (node: GraphNode | null) => void
  layout: GraphLayoutType
  setLayout: (layout: GraphLayoutType) => void
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  stats: {
    nodeCount: number
    edgeCount: number
    brandCount: number
  }
  refetch: () => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useEvolutionGraph({
  brandId,
  modelSlug,
}: UseEvolutionGraphOptions = {}): UseEvolutionGraphReturn {
  const graphViewSettings = useAppStore((s) => s.graphViewSettings)
  const graphFilters = useAppStore((s) => s.graphFilters)
  const setGraphLayout = useAppStore((s) => s.setGraphLayout)

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  // Decide which query to run
  const queryEnabled = !!(brandId || modelSlug)

  // Brand graph
  const brandQuery = useQuery({
    queryKey: QK.brands.graph(brandId ?? ''),
    queryFn: () => fetchBrandGraph(brandId!),
    enabled: !!brandId,
    staleTime: 10 * 60_000,
  })

  // Model evolution graph
  const modelQuery = useQuery({
    queryKey: QK.models.evolution(modelSlug ?? ''),
    queryFn: () => fetchModelEvolution(modelSlug!),
    enabled: !!modelSlug && !brandId,
    staleTime: 10 * 60_000,
  })

  const activeQuery = brandId ? brandQuery : modelQuery
  const rawData = activeQuery.data

  // Apply filters
  const filteredData = useMemo(() => {
    if (!rawData) return undefined
    return filterGraphData(rawData, {
      brandIds: graphFilters.brandIds.length ? graphFilters.brandIds : undefined,
      yearRange: graphFilters.yearRange,
      edgeTypes: graphFilters.edgeTypes.length ? graphFilters.edgeTypes : undefined,
      nodeTypes: graphViewSettings.showConceptCars
        ? undefined
        : ['generation', 'model', 'brand'],
    })
  }, [rawData, graphFilters, graphViewSettings.showConceptCars])

  // Build Cytoscape elements
  const elements = useMemo<CytoscapeElements>(() => {
    if (!filteredData) return []
    return buildCytoscapeElements(filteredData)
  }, [filteredData])

  const setLayout = useCallback(
    (layout: GraphLayoutType) => {
      setGraphLayout(layout)
    },
    [setGraphLayout]
  )

  // Stats
  const stats = useMemo(() => {
    if (!filteredData) return { nodeCount: 0, edgeCount: 0, brandCount: 0 }
    const brandIds = new Set(filteredData.nodes.map((n) => n.brandId).filter(Boolean))
    return {
      nodeCount: filteredData.nodes.length,
      edgeCount: filteredData.edges.length,
      brandCount: brandIds.size,
    }
  }, [filteredData])

  return {
    elements,
    rawData: filteredData,
    selectedNode,
    setSelectedNode,
    layout: graphViewSettings.layout,
    setLayout,
    isLoading: activeQuery.isLoading,
    error: (activeQuery.error as Error | null) ?? null,
    isEmpty: queryEnabled && !activeQuery.isLoading && elements.length === 0,
    stats,
    refetch: activeQuery.refetch,
  }
}
