'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Network, SplitSquareHorizontal, Search, Car, BarChart3, Heart, Zap } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

// caricos.com — картинка существует только под ГОДОМ, реально каталогизированным
// у них (проверено вручную, curl -H Referer). У Porsche/Lambo дашборд был рассинхронен
// с каноничным годом из public/data/models/*.json (2022→2012, 2011→2012 — тот же
// автомобиль, просто другой год в их каталоге). F40 и R8 там не каталогизированы
// вовсе ни под каким годом — img оставлен пустым, карточка красиво деградирует
// на иконку машины (см. рендер ниже), а не показывает чужую машину под своим именем.
const RECOMMENDED = [
  { slug: 'ferrari-f40', name: 'Ferrari F40', brand: 'Ferrari', year: 1987, img: '' },
  { slug: 'porsche-911-carrera', name: 'Porsche 911 Carrera', brand: 'Porsche', year: 2012, img: 'https://images.caricos.com/p/porsche/2012_porsche_911_carrera/images/1920x1080/2012_porsche_911_carrera_1_1920x1080.jpg' },
  { slug: 'bmw-m3', name: 'BMW M3', brand: 'BMW', year: 2021, img: 'https://images.caricos.com/b/bmw/2021_bmw_m3/images/1920x1080/2021_bmw_m3_1_1920x1080.jpg' },
  { slug: 'maserati-mc20', name: 'Maserati MC20', brand: 'Maserati', year: 2021, img: 'https://images.caricos.com/m/maserati/2021_maserati_mc20/images/1920x1080/2021_maserati_mc20_1_1920x1080.jpg' },
  { slug: 'lamborghini-aventador-lp-700-4', name: 'Lamborghini Aventador', brand: 'Lamborghini', year: 2012, img: 'https://images.caricos.com/l/lamborghini/2012_lamborghini_aventador_lp700-4/images/1920x1080/2012_lamborghini_aventador_lp700-4_1_1920x1080.jpg' },
  { slug: 'audi-r8', name: 'Audi R8', brand: 'Audi', year: 2020, img: '' },
]

export default function DashboardPage() {
  const { t } = useLocale()
  const [user, setUser] = useState<{ username: string } | null>(null)

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('autoevoflow_user') : null
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }
  }, [])

  const stats = [
    { label: t('dashboard.statModels'), value: 0, icon: Car },
    { label: t('dashboard.statComparisons'), value: 0, icon: SplitSquareHorizontal },
    { label: t('dashboard.statBrands'), value: 0, icon: Heart },
    { label: t('dashboard.statAnalyses'), value: 0, icon: BarChart3 },
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
          {t('dashboard.welcomeBack', { name: user?.username || 'Explorer' })}
        </h2>
        <p className="text-text-secondary text-sm">{t('dashboard.tagline')}</p>
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
        <h3 className="font-display text-lg font-bold text-text-primary mb-4">{t('dashboard.recentlyViewed')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-border p-3 text-center">
              <div className="aspect-video rounded-lg bg-white/5 mb-2 skeleton" />
              <p className="text-xs text-text-muted">{t('dashboard.noHistory')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended */}
      <section>
        <h3 className="font-display text-lg font-bold text-text-primary mb-4">{t('dashboard.recommended')}</h3>
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
                  <div className="aspect-video bg-white/5 relative overflow-hidden flex items-center justify-center">
                    {car.img ? (
                      <img
                        src={car.img}
                        alt={car.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <Car className="w-6 h-6 text-text-muted" />
                    )}
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
        <h3 className="font-display text-lg font-bold text-text-primary mb-4">{t('dashboard.quickActions')}</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/evolution" className="btn-primary">
            <Network className="w-4 h-4" /> {t('dashboard.actionEvolution')}
          </Link>
          <Link href="/compare" className="btn-secondary">
            <SplitSquareHorizontal className="w-4 h-4" /> {t('dashboard.actionCompare')}
          </Link>
          <Link href="/search" className="btn-secondary">
            <Search className="w-4 h-4" /> {t('dashboard.actionSearch')}
          </Link>
        </div>
      </section>
    </div>
  )
}
