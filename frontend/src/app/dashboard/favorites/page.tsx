'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Car, Globe, X, Search } from 'lucide-react'

interface FavoriteItem {
  type: 'model' | 'brand'
  slug: string
  name: string
  thumbnailUrl?: string
  addedAt: string
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [tab, setTab] = useState<'models' | 'brands'>('models')

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('autoevoflow_favorites') : null
    if (raw) { try { setItems(JSON.parse(raw)) } catch {} }
  }, [])

  const remove = (slug: string) => {
    const updated = items.filter(i => i.slug !== slug)
    setItems(updated)
    localStorage.setItem('autoevoflow_favorites', JSON.stringify(updated))
  }

  const filtered = items.filter(i => i.type === tab.replace('s', '') as 'model' | 'brand')

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold text-text-primary">My Favourites</h2>
          <span className="badge-primary text-xs">{items.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-4">
        {(['models', 'brands'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${tab === t ? 'bg-primary/15 border border-primary/30 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'}`}
          >
            {t === 'models' ? <Car className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="text-xs opacity-60">{items.filter(i => i.type === t.replace('s', '')).length}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Heart className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
          <p className="text-xl font-display font-bold text-text-primary mb-2">No {tab} saved yet</p>
          <p className="text-text-secondary text-sm mb-6">Browse the platform and click the heart icon to save your favourites.</p>
          <Link href={tab === 'models' ? '/search' : '/brands'} className="btn-primary">
            <Search className="w-4 h-4" />
            Browse {tab}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item, i) => (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl border border-border overflow-hidden group relative"
            >
              <button
                onClick={() => remove(item.slug)}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-background/80 border border-border
                  flex items-center justify-center text-text-muted hover:text-red-400 hover:border-red-400/30 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
              <Link href={`/${item.type === 'brand' ? 'brand' : 'model'}/${item.slug}`} className="block">
                {item.thumbnailUrl ? (
                  <div className="aspect-video bg-white/5">
                    <img src={item.thumbnailUrl} alt={item.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="aspect-video bg-white/5 flex items-center justify-center">
                    {item.type === 'brand' ? <Globe className="w-8 h-8 text-text-muted opacity-30" /> : <Car className="w-8 h-8 text-text-muted opacity-30" />}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate">{item.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">Added {new Date(item.addedAt).toLocaleDateString()}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
