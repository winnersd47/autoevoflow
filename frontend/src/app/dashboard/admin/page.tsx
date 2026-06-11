'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Car, Globe, Network, Play, Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react'

const CRAWLER_SOURCES = [
  { name: 'caricos.com', lastCrawled: '2026-05-29 14:23', itemsFound: 1204, status: 'Idle' },
  { name: 'netcarshow.com', lastCrawled: '2026-05-28 09:11', itemsFound: 847, status: 'Idle' },
  { name: 'autoevolution.com', lastCrawled: '2026-05-27 22:05', itemsFound: 631, status: 'Active' },
  { name: 'motor1.com', lastCrawled: '2026-05-26 17:44', itemsFound: 325, status: 'Idle' },
]

const AI_TASKS = [
  { brand: 'Ferrari', type: 'Design DNA', status: 'completed', ts: '2026-05-30 11:20' },
  { brand: 'Porsche', type: 'Lineage Analysis', status: 'completed', ts: '2026-05-30 09:14' },
  { brand: 'BMW', type: 'Evolution Graph', status: 'running', ts: '2026-05-30 08:02' },
  { brand: 'Lamborghini', type: 'Design DNA', status: 'queued', ts: '2026-05-29 23:55' },
  { brand: 'Toyota', type: 'Lineage Analysis', status: 'failed', ts: '2026-05-29 18:30' },
]

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-400',
  running: 'text-primary',
  queued: 'text-yellow-400',
  failed: 'text-red-400',
  Idle: 'text-text-muted',
  Active: 'text-green-400',
}

export default function AdminPage() {
  const [crawlToast, setCrawlToast] = useState(false)

  const handleCrawl = () => {
    setCrawlToast(true)
    setTimeout(() => setCrawlToast(false), 3000)
  }

  const globalStats = [
    { label: 'Total Users', value: 47, icon: Users, color: 'text-primary' },
    { label: 'Total Models', value: 3007, icon: Car, color: 'text-gold' },
    { label: 'Total Brands', value: 37, icon: Globe, color: 'text-green-400' },
    { label: 'Graph Nodes', value: 322, icon: Network, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <h2 className="font-display text-2xl font-bold text-text-primary">Admin Overview</h2>

      {crawlToast && (
        <div className="fixed top-20 right-6 z-50 glass border border-primary/30 rounded-xl px-5 py-3 text-sm text-primary font-medium shadow-lg">
          Backend required to run crawler.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {globalStats.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-xl border border-border p-4"
          >
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <p className="font-display text-3xl font-bold text-text-primary">{value.toLocaleString()}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Crawler Status */}
      <div className="glass rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-text-primary">Crawler Status</h3>
          <button onClick={handleCrawl} className="btn-primary text-sm">
            <Play className="w-3.5 h-3.5" /> Run Crawl
          </button>
        </div>
        <div className="space-y-3">
          {CRAWLER_SOURCES.map(s => (
            <div key={s.name} className="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {s.lastCrawled}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-text-primary">{s.itemsFound.toLocaleString()}</p>
                <p className="text-xs text-text-muted">items</p>
              </div>
              <span className={`text-xs font-semibold ${STATUS_COLORS[s.status]}`}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent AI Tasks */}
      <div className="glass rounded-2xl border border-border p-6">
        <h3 className="font-display font-bold text-text-primary mb-5">Recent AI Tasks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-muted font-semibold uppercase tracking-wider pb-3">Brand</th>
                <th className="text-left text-xs text-text-muted font-semibold uppercase tracking-wider pb-3">Type</th>
                <th className="text-left text-xs text-text-muted font-semibold uppercase tracking-wider pb-3">Status</th>
                <th className="text-left text-xs text-text-muted font-semibold uppercase tracking-wider pb-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {AI_TASKS.map(task => (
                <tr key={task.brand + task.ts}>
                  <td className="py-3 text-text-primary font-medium">{task.brand}</td>
                  <td className="py-3 text-text-secondary">{task.type}</td>
                  <td className="py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_COLORS[task.status]}`}>
                      {task.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {task.status === 'running' && <Circle className="w-3 h-3 animate-pulse" />}
                      {task.status === 'queued' && <Clock className="w-3 h-3" />}
                      {task.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3 text-text-muted font-mono text-xs">{task.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
