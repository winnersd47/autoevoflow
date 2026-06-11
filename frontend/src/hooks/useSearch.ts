import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedCallback } from 'use-debounce'
import {
  searchSemantic,
  searchVisual,
  searchMultimodal,
  getSearchSuggestions,
  QK,
} from '@/lib/api'
import type { SearchMode, SearchFilters, SearchResponse } from '@/lib/types'
import { useAppStore } from '@/store'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  image: File | null
  setImage: (f: File | null) => void
  imagePreviewUrl: string | null
  mode: SearchMode
  setMode: (m: SearchMode) => void
  filters: SearchFilters
  setFilters: (f: Partial<SearchFilters>) => void
  suggestions: string[]
  results: SearchResponse | undefined
  isLoading: boolean
  isSuggestionsLoading: boolean
  error: Error | null
  handleImageUpload: (file: File) => void
  clearSearch: () => void
  executeSearch: () => void
  hasResults: boolean
  totalResults: number
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSearch(): UseSearchReturn {
  const storeQuery = useAppStore((s) => s.searchQuery)
  const setStoreQuery = useAppStore((s) => s.setSearchQuery)
  const storeMode = useAppStore((s) => s.searchMode)
  const setStoreMode = useAppStore((s) => s.setSearchMode)
  const storeFilters = useAppStore((s) => s.searchFilters)
  const setStoreFilters = useAppStore((s) => s.setSearchFilters)
  const addToHistory = useAppStore((s) => s.addToSearchHistory)

  const [query, setQueryLocal] = useState(storeQuery)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [mode, setModeLocal] = useState<SearchMode>(storeMode)
  const [filters, setFiltersLocal] = useState<SearchFilters>(storeFilters)
  const [executedQuery, setExecutedQuery] = useState('')
  const [executedImage, setExecutedImage] = useState<File | null>(null)
  const [executedMode, setExecutedMode] = useState<SearchMode>('semantic')
  const [shouldFetch, setShouldFetch] = useState(false)
  const prevPreviewUrl = useRef<string | null>(null)

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (prevPreviewUrl.current) {
        URL.revokeObjectURL(prevPreviewUrl.current)
      }
    }
  }, [])

  // Debounced suggestions query key
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const updateDebouncedQuery = useDebouncedCallback((q: string) => {
    setDebouncedQuery(q)
  }, 350)

  const setQuery = useCallback(
    (q: string) => {
      setQueryLocal(q)
      setStoreQuery(q)
      updateDebouncedQuery(q)
    },
    [setStoreQuery, updateDebouncedQuery]
  )

  const setMode = useCallback(
    (m: SearchMode) => {
      setModeLocal(m)
      setStoreMode(m)
    },
    [setStoreMode]
  )

  const setFilters = useCallback(
    (f: Partial<SearchFilters>) => {
      setFiltersLocal((prev) => ({ ...prev, ...f }))
      setStoreFilters(f)
    },
    [setStoreFilters]
  )

  // Suggestions — only for semantic + text present
  const { data: suggestionData, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: QK.search.suggestions(debouncedQuery),
    queryFn: () => getSearchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length > 2 && mode !== 'visual',
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })

  // Full search results
  const { data: results, isLoading, error } = useQuery({
    queryKey: [...QK.search.results(executedQuery, executedMode), executedImage?.name ?? null],
    queryFn: async () => {
      if (executedMode === 'visual' && executedImage) {
        return searchVisual(executedImage)
      }
      if (executedMode === 'multimodal' && executedQuery && executedImage) {
        return searchMultimodal(executedQuery, executedImage, filters)
      }
      return searchSemantic(executedQuery, filters)
    },
    enabled: shouldFetch && (!!executedQuery || !!executedImage),
    staleTime: 5 * 60_000,
  })

  const handleImageUpload = useCallback((file: File) => {
    // Revoke previous URL
    if (prevPreviewUrl.current) {
      URL.revokeObjectURL(prevPreviewUrl.current)
    }
    const url = URL.createObjectURL(file)
    prevPreviewUrl.current = url
    setImage(file)
    setImagePreviewUrl(url)
    // Auto-switch mode to visual
    setModeLocal((prev) => (prev === 'semantic' ? 'visual' : 'multimodal'))
  }, [])

  const clearSearch = useCallback(() => {
    setQueryLocal('')
    setStoreQuery('')
    setDebouncedQuery('')
    if (prevPreviewUrl.current) {
      URL.revokeObjectURL(prevPreviewUrl.current)
      prevPreviewUrl.current = null
    }
    setImage(null)
    setImagePreviewUrl(null)
    setModeLocal('semantic')
    setShouldFetch(false)
    setExecutedQuery('')
    setExecutedImage(null)
  }, [setStoreQuery])

  const executeSearch = useCallback(() => {
    if (!query && !image) return
    setExecutedQuery(query)
    setExecutedImage(image)
    setExecutedMode(mode)
    setShouldFetch(true)
    if (query) {
      addToHistory({ query, mode, resultCount: undefined })
    }
  }, [query, image, mode, addToHistory])

  return {
    query,
    setQuery,
    image,
    setImage,
    imagePreviewUrl,
    mode,
    setMode,
    filters,
    setFilters,
    suggestions: suggestionData ?? [],
    results,
    isLoading,
    isSuggestionsLoading,
    error: error as Error | null,
    handleImageUpload,
    clearSearch,
    executeSearch,
    hasResults: (results?.results.length ?? 0) > 0,
    totalResults: results?.total ?? 0,
  }
}
