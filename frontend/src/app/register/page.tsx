'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, Zap } from 'lucide-react'
import { useAppStore, type AuthUser } from '@/store'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (!terms) { setError('Please accept the Terms of Service'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.username || undefined }),
      })
      const data = await res.json() as { user?: AuthUser; error?: string }
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      useAppStore.getState().setAuth(data.user ?? null)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error — is the server running?')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-black text-text-primary mb-1">Create account</h1>
          <p className="text-text-secondary text-sm">Join AutoEvoFlow — it&apos;s free</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-border rounded-xl pl-10 pr-4 py-3 text-sm
                    text-text-primary placeholder:text-text-muted outline-none
                    focus:border-primary/50 focus:bg-primary/5 transition-all duration-200"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={form.username}
                  onChange={set('username')}
                  placeholder="speedhunter42"
                  className="w-full bg-white/5 border border-border rounded-xl pl-10 pr-4 py-3 text-sm
                    text-text-primary placeholder:text-text-muted outline-none
                    focus:border-primary/50 focus:bg-primary/5 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-border rounded-xl pl-10 pr-10 py-3 text-sm
                    text-text-primary placeholder:text-text-muted outline-none
                    focus:border-primary/50 focus:bg-primary/5 transition-all duration-200"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-border rounded-xl pl-10 pr-4 py-3 text-sm
                    text-text-primary placeholder:text-text-muted outline-none
                    focus:border-primary/50 focus:bg-primary/5 transition-all duration-200"
                />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-border bg-white/5 accent-primary shrink-0"
              />
              <span className="text-sm text-text-secondary">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
              </span>
            </label>

            {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
