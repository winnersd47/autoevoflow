"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Clock,
  X,
} from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useAppStore } from "@/store";
import type { SearchResult } from "@/lib/types";
import SearchBar from "@/components/ui/SearchBar";
import GenerationCard from "@/components/ui/GenerationCard";
import type { Generation } from "@/lib/types";
import { useLocale } from "@/contexts/LocaleContext";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-border">
          <div className="aspect-video skeleton" />
          <div className="p-4 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function SearchResultCard({ result, index }: { result: SearchResult; index: number }) {
  const gen = result.entity as Generation;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <GenerationCard generation={gen} />
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const { searchHistory } = useAppStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const { t } = useLocale();

  const {
    query,
    setQuery,
    image,
    handleImageUpload,
    imagePreviewUrl,
    mode,
    setMode,
    filters,
    setFilters,
    suggestions,
    results,
    isLoading,
    error,
    executeSearch,
    clearSearch,
    totalResults,
  } = useSearch();

  // Flatten results array from SearchResponse object
  const resultList = results?.results ?? [];

  const handleSearch = () => {
    executeSearch();
  };

  return (
    <div className="min-h-screen">
      {/* ── Hero search header ────────────────────────────────────────────── */}
      <section className="relative py-16 border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <span className="section-label block mb-3">{t("search.badge")}</span>
            <h1 className="font-display text-5xl font-black gradient-text-primary mb-4">
              {t("search.heading")}
            </h1>
            <p className="text-text-secondary text-lg">
              {t("search.desc")}
            </p>
          </motion.div>

          {/* Search bar */}
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onImageUpload={handleImageUpload}
            onClear={clearSearch}
            suggestions={suggestions}
            recentSearches={searchHistory.map((h) => h.query)}
            imagePreviewUrl={imagePreviewUrl}
            mode={mode}
            onModeChange={setMode}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* ── Results area ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start gap-8">
          {/* Filter panel */}
          <AnimatePresence>
            {filterOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-64 shrink-0 glass rounded-2xl p-5 border border-border sticky top-24"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Filters</h3>
                  <button onClick={() => setFilterOpen(false)}>
                    <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                  </button>
                </div>
                <div className="space-y-5">
                  {/* Body Type */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Body Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["sedan", "suv", "coupe", "hatchback", "wagon", "convertible"].map((bt) => {
                        const active = filters.bodyTypes?.includes(bt as never);
                        return (
                          <button
                            key={bt}
                            onClick={() =>
                              setFilters({
                                bodyTypes: active
                                  ? filters.bodyTypes?.filter((t) => t !== bt)
                                  : [...(filters.bodyTypes ?? []), bt as never],
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                              ${active ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-text-muted hover:text-text-primary"}`}
                          >
                            {bt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year range */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Year Range</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="1950"
                        value={filters.yearRange?.[0] ?? ""}
                        onChange={(e) =>
                          setFilters({
                            yearRange: [Number(e.target.value), filters.yearRange?.[1] ?? 2026],
                          })
                        }
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-white/5 border border-border text-text-primary placeholder-text-muted outline-none focus:border-primary/40"
                      />
                      <input
                        type="number"
                        placeholder="2025"
                        value={filters.yearRange?.[1] ?? ""}
                        onChange={(e) =>
                          setFilters({
                            yearRange: [filters.yearRange?.[0] ?? 1950, Number(e.target.value)],
                          })
                        }
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-white/5 border border-border text-text-primary placeholder-text-muted outline-none focus:border-primary/40"
                      />
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            {resultList.length > 0 && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <p className="text-text-secondary text-sm">
                    <span className="text-text-primary font-semibold">{totalResults}</span> results
                  </p>
                </div>
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all
                    ${filterOpen
                      ? "text-primary bg-primary/10 border-primary/30"
                      : "text-text-muted border-border hover:text-text-primary hover:border-border"
                    }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
            )}

            {/* Loading */}
            {isLoading && <ResultSkeleton />}

            {/* Error */}
            {error && !isLoading && (
              <div className="glass rounded-2xl p-10 border border-danger/30 text-center">
                <p className="text-danger mb-2 font-semibold">Search failed</p>
                <p className="text-text-muted text-sm">{String(error)}</p>
              </div>
            )}

            {/* Empty state after search */}
            {!isLoading && !error && resultList.length === 0 && query && results !== undefined && (
              <div className="text-center py-20 text-text-muted">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold mb-2">No results found</p>
                <p className="text-sm">Try a different query or adjust your filters</p>
              </div>
            )}

            {/* Initial idle state */}
            {!isLoading && !error && results === undefined && (
              <div className="text-center py-16">
                <div className="mb-10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-6">Try searching for</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "BMW E30 coupe",
                      "similar to Ferrari 458",
                      "Japanese sports cars 1990s",
                      "electric SUV evolution",
                      "classic American muscle",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setQuery(suggestion);
                          setTimeout(() => executeSearch(), 100);
                        }}
                        className="px-4 py-2 glass rounded-full border border-border text-sm text-text-secondary
                          hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search history */}
                {searchHistory.length > 0 && (
                  <div className="text-left max-w-lg mx-auto">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      History
                    </p>
                    <div className="space-y-1">
                      {searchHistory.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setQuery(item.query);
                            setTimeout(() => executeSearch(), 100);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                        >
                          <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-sm text-text-secondary flex-1 truncate">{item.query}</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/8 border border-border text-xs text-text-muted">{item.mode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results grid */}
            {resultList.length > 0 && !isLoading && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {resultList.map((result, i) => (
                  <SearchResultCard key={result.id} result={result} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
