'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Network, SplitSquareHorizontal, Search, Car, BarChart3, Heart, Zap } from 'lucide-react'

const RECOMMENDED = [
  { slug: 'ferrari-f40', name: 'Ferrari F40', brand: 'Ferrari', year: 1987, img: 'https://images.caricos.com/f/ferrari/1987_ferrari_f40/images/1920x1080/1987_ferrari_f40_1_1920x1080.jpg' },
  { slug: 'porsche-911-carrera', name: 'Porsche 911 Carrera', brand: 'Porsche', year: 2022, img: 'https://images.caricos.com/p/porsche/2022_porsche_911_carrera/images/1920x1080/2022_porsche_911_carrera_1_1920x1080.jpg' },
  { slug: 'bmw-m3', name: 'BMW M3', brand: 'BMW', year: 2021, img: 'https://images.caricos.com/b/bmw/2021_bmw_m3/images/1920x1080/2021_bmw_m3_1_1920x1080.jpg' },
  { slug: 'maserati-mc20', name: 'Maserati MC20', brand: 'Maserati', year: 2021, img: 'https://images.caricos.com/m/maserati/2021_maserati_mc20/images/1920x1080/2021_maserati_mc20_1_1920x1080.jpg' },
  { slug: 'lamborghini-aventador-lp-700-4', name: 'Lamborghini Aventador', brand: 'Lamborghini', year: 2011, img: 'https://images.caricos.com/l/lamborghini/2011_lamborghini_aventador_lp700-4/images/1920x1080/2011_lamborghini_aventador_lp700-4_1_1920x1080.jpg' },
  { slug: 'audi-r8', name: 'Audi R8', brand: 'Audi', year: 2020, img: 'https://images.caricos.com/a/audi/2020_audi_r8/images/1920x1080/2020_audi_r8_1_1920x1080.jpg' },
]

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string } | null>(null)

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('autoevoflow_user') : null
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }
  }, [])

  const stats = [
    { label: 'Models Explored', value: 0, icon: Car },
    { label: 'Comparisons Made', value: 0, icon: SplitSquareHorizontal },
    { label: 'Brands Followed', value: 0, icon: Heart },
    { label: 'Analyses Run', value: 0, icon: BarChart3 },
  ]

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-primary rounded-2xl border border-primary/20 p-6"
      >
        <h2 className="font-display text-2xl font-bold text-text-primary mb-1">
          Welcome back, {user?.username || 'Explorer'} 👋
        </h2>
        <p className="text-text-secondary text-sm">Track your automotive journey across the platform.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="glass rounded-xl border border-border p-4"
          >
            <Icon className="w-5 h-5 text-primary mb-3" />
            <p className="font-display text-3xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recently Viewed */}
      <section>
        <h3 className="font-display text-lg font-bold text-text-primary mb-4">Recently Viewed</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-border p-3 text-center">
              <div className="aspect-video rounded-lg bg-white/5 mb-2 skeleton" />
              <p className="text-xs text-text-muted">No history yet</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended */}
      <section>
        <h3 className="font-display text-lg font-bold text-text-primary mb-4">Recommended For You</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RECOMMENDED.map((car, i) => (
            <motion.div
              key={car.slug}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <Link href={`/model/${car.slug}`} className="block group">
                <div className="glass rounded-xl border border-border hover:border-primary/30
                  hover:bg-primary/5 transition-all duration-300 overflow-hidden">
                  <div className="aspect-video bg-white/5 relative overflow-hidden">
                    <img
                      src={car.img}
                      alt={car.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                      {car.name}
                    </p>
                    <p className="text-[10px] text-text-muted">{car.brand} · {car.year}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="font-display text-lg font-bold text-text-primary mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/evolution" className="btn-primary">
            <Network className="w-4 h-4" /> Evolution Graph
          </Link>
          <Link href="/compare" className="btn-secondary">
            <SplitSquareHorizontal className="w-4 h-4" /> Start Comparison
          </Link>
          <Link href="/search" className="btn-secondary">
            <Search className="w-4 h-4" /> Search Models
          </Link>
        </div>
      </section>
    </div>
  )
}
