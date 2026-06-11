'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Network, ArrowRight } from 'lucide-react'

export default function DashboardEvolutionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
          <Network className="w-10 h-10 text-primary" />
        </div>
        <span className="section-label mb-3 block">Evolution Graph</span>
        <h2 className="font-display text-3xl font-bold text-text-primary mb-3">Interactive Evolution Graph</h2>
        <p className="text-text-secondary leading-relaxed">
          Explore 322 nodes and 383 edges connecting automotive lineages across 11 brands. Navigate the full history of automotive design in one interactive canvas.
        </p>
        <div className="glass rounded-2xl border border-primary/20 p-5 mt-6 text-left">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="text-primary font-mono font-bold text-lg">322</span> nodes
            <span className="text-border">·</span>
            <span className="text-primary font-mono font-bold text-lg">383</span> edges
            <span className="text-border">·</span>
            <span className="text-primary font-mono font-bold text-lg">11</span> brands
          </div>
        </div>
        <div className="mt-8">
          <Link href="/evolution" className="btn-primary text-base px-8 py-4">
            <Network className="w-5 h-5" />
            Open Evolution Graph
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
