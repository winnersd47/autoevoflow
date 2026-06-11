'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Save, Key, Trash2, AlertTriangle, Check } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export default function ProfilePage() {
  const router = useRouter()
  const { locale, setLocale } = useLocale()
  const [user, setUser] = useState({ email: '', username: '', role: 'user' })
  const [saved, setSaved] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('autoevoflow_user') : null
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }
  }, [])

  const handleSave = () => {
    localStorage.setItem('autoevoflow_user', JSON.stringify(user))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const generateKey = () => {
    setApiKey('aef_demo_' + Math.random().toString(36).slice(2, 18))
  }

  const handleDelete = () => {
    localStorage.clear()
    router.push('/')
  }

  const initials = (user.username?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="font-display text-2xl font-bold text-text-primary">Profile</h2>

      {/* Avatar + basic info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-border p-6 space-y-5"
      >
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="font-display text-2xl font-black text-primary">{initials}</span>
          </div>
          <div>
            <p className="font-display font-bold text-text-primary">{user.username || 'User'}</p>
            <p className="text-sm text-text-muted">{user.email}</p>
            <span className="badge-surface text-xs capitalize">{user.role}</span>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Username</label>
          <input
            type="text"
            value={user.username}
            onChange={e => setUser(u => ({ ...u, username: e.target.value }))}
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm
              text-text-primary placeholder:text-text-muted outline-none
              focus:border-primary/50 focus:bg-primary/5 transition-all duration-200"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Email <span className="text-text-muted normal-case font-normal">(read-only in demo)</span>
          </label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full bg-white/3 border border-border rounded-xl px-4 py-3 text-sm
              text-text-muted cursor-not-allowed"
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Language</label>
          <div className="flex gap-2">
            {(['en', 'ru'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200
                  ${locale === lang
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-white/5 border-border text-text-secondary hover:border-white/20'
                  }`}
              >
                {lang === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary">
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </motion.div>

      {/* API Key */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl border border-border p-6 space-y-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-text-primary">API Key</h3>
          <span className="badge-surface text-xs">Premium</span>
        </div>
        {apiKey ? (
          <div>
            <div className="bg-black/40 border border-border rounded-xl px-4 py-3 font-mono text-sm text-primary break-all">
              {apiKey}
            </div>
            <p className="text-xs text-text-muted mt-2">This is a demo key — backend integration required for real API access.</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Generate an API key to integrate AutoEvoFlow data into your applications.</p>
        )}
        <button onClick={generateKey} className="btn-secondary text-sm">
          <Key className="w-4 h-4" />
          {apiKey ? 'Regenerate Key' : 'Generate API Key'}
        </button>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl border border-red-400/20 p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="font-display font-bold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-sm text-text-secondary">Permanently delete your account and all associated data. This action cannot be undone.</p>
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20 transition-all"
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            Delete Account
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-400/20 border border-red-400/40 text-red-400 hover:bg-red-400/30 transition-all"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
