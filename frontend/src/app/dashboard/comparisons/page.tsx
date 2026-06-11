'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { SplitSquareHorizontal, Plus, Trash2, ExternalLink, Clock } from 'lucide-react'

interface SavedComparison {
  id: string
  cars: string[]
  savedAt: string
}

export default function ComparisonsPage() {
  const [comparisons, setComparisons] = useState<SavedComparison[]>([])

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('autoevoflow_comparisons') : null
    if (raw) { try { setComparisons(JSON.parse(raw)) } catch {} }
  }, [])

  const remove = (id: string) => {
    const updated = comparisons.filter(c => c.id !== id)
    setComparisons(updated)
    localStorage.setItem('autoevoflow_comparisons', JSON.stringify(updated))
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">Saved Comparisons</h2>
        <Link href="/compare" className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          New Comparison
        </Link>
      </div>

      {comparisons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <SplitSquareHorizontal className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
          <p className="text-xl font-display font-bold text-text-primary mb-2">No comparisons saved yet</p>
          <p className="text-text-secondary text-sm mb-2">
            Comparison saving is coming soon. For now, use the comparison tool directly.
          </p>
          <span className="badge-surface text-xs mb-6 inline-block">Coming Soon</span>
          <div className="mt-4">
            <Link href="/compare" className="btn-primary">
              <SplitSquareHorizontal className="w-4 h-4" />
              Start Comparing
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {comparisons.map((comp, i) => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-xl border border-border p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <SplitSquareHorizontal className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {comp.cars.join(' vs ')}
                  </p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(comp.savedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/compare"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </Link>
                <button
                  onClick={() => remove(comp.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
