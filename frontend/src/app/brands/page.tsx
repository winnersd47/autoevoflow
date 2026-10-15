'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Globe, Zap, TrendingUp } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

const ALL_BRANDS = [
  { name: 'BMW', country: 'Germany', founded: 1916, models: 48, tag: 'premium' },
  { name: 'Mercedes-Benz', country: 'Germany', founded: 1926, models: 62, tag: 'luxury' },
  { name: 'Audi', country: 'Germany', founded: 1909, models: 41, tag: 'premium' },
  { name: 'Porsche', country: 'Germany', founded: 1931, models: 18, tag: 'sports' },
  { name: 'Volkswagen', country: 'Germany', founded: 1937, models: 35, tag: 'mainstream' },
  { name: 'Ferrari', country: 'Italy', founded: 1939, models: 52, tag: 'supercar' },
  { name: 'Lamborghini', country: 'Italy', founded: 1963, models: 24, tag: 'supercar' },
  { name: 'Alfa Romeo', country: 'Italy', founded: 1910, models: 38, tag: 'sports' },
  { name: 'Maserati', country: 'Italy', founded: 1914, models: 16, tag: 'luxury' },
  { name: 'Toyota', country: 'Japan', founded: 1937, models: 72, tag: 'mainstream' },
  { name: 'Honda', country: 'Japan', founded: 1948, models: 58, tag: 'mainstream' },
  { name: 'Nissan', country: 'Japan', founded: 1933, models: 44, tag: 'mainstream' },
  { name: 'Mazda', country: 'Japan', founded: 1920, models: 31, tag: 'mainstream' },
  { name: 'Subaru', country: 'Japan', founded: 1953, models: 22, tag: 'mainstream' },
  { name: 'Lexus', country: 'Japan', founded: 1989, models: 28, tag: 'luxury' },
  { name: 'Mitsubishi', country: 'Japan', founded: 1917, models: 26, tag: 'mainstream' },
  { name: 'Ford', country: 'USA', founded: 1903, models: 55, tag: 'mainstream' },
  { name: 'Chevrolet', country: 'USA', founded: 1911, models: 47, tag: 'mainstream' },
  { name: 'Dodge', country: 'USA', founded: 1900, models: 22, tag: 'sports' },
  { name: 'Cadillac', country: 'USA', founded: 1902, models: 31, tag: 'luxury' },
  { name: 'Tesla', country: 'USA', founded: 2003, models: 8, tag: 'ev' },
  { name: 'Rivian', country: 'USA', founded: 2009, models: 4, tag: 'ev' },
  { name: 'Peugeot', country: 'France', founded: 1882, models: 39, tag: 'mainstream' },
  { name: 'Renault', country: 'France', founded: 1899, models: 42, tag: 'mainstream' },
  { name: 'Citroën', country: 'France', founded: 1919, models: 35, tag: 'mainstream' },
  { name: 'Lotus', country: 'UK', founded: 1948, models: 7, tag: 'sports' },
  { name: 'McLaren', country: 'UK', founded: 1963, models: 20, tag: 'supercar' },
  { name: 'Aston Martin', country: 'UK', founded: 1913, models: 24, tag: 'luxury' },
  { name: 'Bentley', country: 'UK', founded: 1919, models: 12, tag: 'luxury' },
  { name: 'Rolls-Royce', country: 'UK', founded: 1906, models: 8, tag: 'luxury' },
  { name: 'Jaguar', country: 'UK', founded: 1922, models: 28, tag: 'luxury' },
  { name: 'Land Rover', country: 'UK', founded: 1948, models: 16, tag: 'premium' },
  { name: 'Hyundai', country: 'S.Korea', founded: 1967, models: 38, tag: 'mainstream' },
  { name: 'Kia', country: 'S.Korea', founded: 1944, models: 34, tag: 'mainstream' },
  { name: 'Genesis', country: 'S.Korea', founded: 2015, models: 10, tag: 'luxury' },
]

const TAG_COLORS: Record<string, string> = {
  supercar: 'text-red-400 bg-red-400/10 border-red-400/30',
  luxury:   'text-gold bg-gold/10 border-gold/30',
  sports:   'text-orange-400 bg-orange-400/10 border-orange-400/30',
  premium:  'text-primary bg-primary/10 border-primary/30',
  mainstream:'text-text-secondary bg-white/5 border-border',
  ev:       'text-green-400 bg-green-400/10 border-green-400/30',
}

const TAGS = ['all', 'supercar', 'luxury', 'sports', 'premium', 'mainstream', 'ev']

export default function BrandsPage() {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('all')
  const { t } = useLocale()

  const TAG_LABELS: Record<string, string> = {
    all: t('brands.tagAll'),
    supercar: t('brands.tagSupercar'),
    luxury: t('brands.tagLuxury'),
    sports: t('brands.tagSports'),
    premium: t('brands.tagPremium'),
    mainstream: t('brands.tagMainstream'),
    ev: t('brands.tagEv'),
  }

  const filtered = ALL_BRANDS.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
                        b.country.toLowerCase().includes(search.toLowerCase())
    const matchTag = activeTag === 'all' || b.tag === activeTag
    return matchSearch && matchTag
  }).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <span className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary block mb-3">
            {t('brands.badge')}
          </span>
          <h1 className="font-display text-5xl font-black text-text-primary mb-4">
            {t('brands.heading')}
          </h1>
          <p className="text-text-secondary text-lg max-w-xl">
            {t('brands.desc', { count: ALL_BRANDS.length })}
          </p>
        </motion.div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder={t('brands.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-xl pl-10 pr-4 py-3 text-sm
                text-text-primary placeholder:text-text-muted outline-none
                focus:border-primary/50 focus:bg-primary/5 transition-all duration-200"
            />
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all duration-200
                  ${activeTag === tag
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-white/5 border-border text-text-secondary hover:text-text-primary hover:border-white/20'
                  }`}
              >
                {TAG_LABELS[tag] ?? tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-6 mb-8 text-sm text-text-muted"
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t('brands.statsCount', { count: filtered.length })}
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('brands.statsModels', { count: filtered.reduce((s, b) => s + b.models, 0).toLocaleString() })}
          </span>
        </motion.div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((brand, i) => (
            <motion.div
              key={brand.name}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
            >
              <Link href={`/brand/${brand.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>
                <div className="group p-5 rounded-2xl bg-white/[0.03] border border-white/8
                  hover:border-primary/30 hover:bg-primary/[0.04]
                  transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,212,255,0.1)]
                  cursor-pointer"
                >
                  {/* Brand initial avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5
                    border border-white/10 group-hover:border-primary/30
                    flex items-center justify-center mb-4 transition-all duration-300"
                  >
                    <span className="font-display font-black text-lg text-text-secondary group-hover:text-primary transition-colors">
                      {brand.name[0]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="mb-3">
                    <h3 className="font-display font-bold text-base text-text-primary group-hover:text-white transition-colors">
                      {brand.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                      <span>{brand.country}</span>
                      <span>·</span>
                      <span>{t('brands.est')} {brand.founded}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                      font-semibold uppercase tracking-wider border ${TAG_COLORS[brand.tag] ?? TAG_COLORS.mainstream}`}
                    >
                      {TAG_LABELS[brand.tag] ?? brand.tag}
                    </span>
                    <span className="text-xs text-text-muted">
                      {brand.models} {t('brands.modelsLabel')}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-24 text-text-muted">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">{t('brands.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
