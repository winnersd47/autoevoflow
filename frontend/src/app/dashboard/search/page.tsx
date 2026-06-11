'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Sparkles } from 'lucide-react'

export default function DashboardSearchPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="section-label">Visual Search</span>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-display text-3xl font-bold text-text-primary mb-3">AI-Powered Visual Search</h2>
        <p className="text-text-secondary leading-relaxed">
          Search across 3,000+ car models using natural language, visual similarity, and semantic embeddings powered by CLIP and DINOv2.
        </p>
        <div className="mt-8">
          <Link href="/search" className="btn-primary text-base px-8 py-4">
            <Search className="w-5 h-5" />
            Open Visual Search
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
