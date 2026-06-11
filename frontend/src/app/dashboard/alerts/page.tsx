'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Mail } from 'lucide-react'

const BRANDS = [
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Volkswagen',
  'Ferrari', 'Lamborghini', 'Alfa Romeo', 'Maserati', 'Toyota',
  'Honda', 'Nissan', 'Ford', 'Tesla', 'McLaren',
  'Aston Martin', 'Bentley', 'Rolls-Royce', 'Jaguar', 'Land Rover',
]

export default function AlertsPage() {
  const [globalAlert, setGlobalAlert] = useState(false)
  const [followed, setFollowed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('autoevoflow_followed_brands') : null
    if (raw) { try { setFollowed(new Set(JSON.parse(raw))) } catch {} }
    const ga = localStorage.getItem('autoevoflow_global_alert')
    if (ga) setGlobalAlert(ga === 'true')
  }, [])

  const toggleBrand = (brand: string) => {
    const updated = new Set(followed)
    if (updated.has(brand)) updated.delete(brand)
    else updated.add(brand)
    setFollowed(updated)
    localStorage.setItem('autoevoflow_followed_brands', JSON.stringify([...updated]))
  }

  const toggleGlobal = () => {
    const next = !globalAlert
    setGlobalAlert(next)
    localStorage.setItem('autoevoflow_global_alert', String(next))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-text-primary">Model Alerts</h2>

      {/* Global toggle */}
      <div className="glass rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-text-primary">New model notifications</p>
              <p className="text-xs text-text-muted mt-0.5">Notify me when new models are added for followed brands</p>
            </div>
          </div>
          <button
            onClick={toggleGlobal}
            className={`relative w-12 h-6 rounded-full border transition-all duration-300 ${
              globalAlert ? 'bg-primary/30 border-primary/50' : 'bg-white/5 border-border'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
              globalAlert ? 'left-6 bg-primary' : 'left-0.5 bg-text-muted'
            }`} />
          </button>
        </div>
      </div>

      {/* Email coming soon */}
      <div className="glass rounded-xl border border-border p-5 flex items-center gap-3">
        <Mail className="w-5 h-5 text-text-muted" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">Email notifications</p>
          <p className="text-xs text-text-muted mt-0.5">Get notified via email (requires backend)</p>
        </div>
        <span className="badge-surface text-xs">Coming Soon</span>
      </div>

      {/* Brand list */}
      <div>
        <h3 className="font-display text-base font-bold text-text-primary mb-3">
          Follow Brands ({followed.size} followed)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BRANDS.map((brand, i) => {
            const isFollowed = followed.has(brand)
            return (
              <motion.div
                key={brand}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                  ${isFollowed ? 'bg-primary/10 border-primary/30' : 'glass border-border hover:border-white/20'}`}
              >
                <span className="text-sm font-medium text-text-primary">{brand}</span>
                <button
                  onClick={() => toggleBrand(brand)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200
                    ${isFollowed
                      ? 'bg-primary/20 text-primary hover:bg-red-400/20 hover:text-red-400'
                      : 'bg-white/5 text-text-muted hover:bg-primary/20 hover:text-primary'
                    }`}
                >
                  {isFollowed ? (
                    <><BellOff className="w-3 h-3" /> Unfollow</>
                  ) : (
                    <><Bell className="w-3 h-3" /> Follow</>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
