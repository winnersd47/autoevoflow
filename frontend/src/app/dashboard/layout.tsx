'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Heart, SplitSquareHorizontal, Search,
  Network, Bell, CreditCard, User, Settings2, Shield,
  LogOut, Menu, X, Zap,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/favorites', icon: Heart, label: 'Favourites' },
  { href: '/dashboard/comparisons', icon: SplitSquareHorizontal, label: 'Comparisons' },
  { href: '/dashboard/search', icon: Search, label: 'Visual Search' },
  { href: '/dashboard/evolution', icon: Network, label: 'Evolution Graph' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alerts' },
  { href: '/dashboard/store', icon: CreditCard, label: 'Premium' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
]

const ADMIN_NAV = [
  { href: '/dashboard/admin', icon: Settings2, label: 'Admin' },
  { href: '/dashboard/compliance', icon: Shield, label: 'Compliance' },
]

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Overview'
  const seg = pathname.split('/').pop() ?? ''
  return seg.charAt(0).toUpperCase() + seg.slice(1)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ email: string; username: string; role: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('autoevoflow_user')
    if (!raw) { router.push('/login'); return }
    try { setUser(JSON.parse(raw)) } catch { router.push('/login') }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('autoevoflow_user')
    router.push('/')
  }

  const isAdmin = user?.role === 'admin'
  const navItems = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <span className="font-display text-sm font-bold text-text-primary tracking-widest uppercase">AutoEvoFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${active
                  ? 'bg-primary/15 border border-primary/30 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {(user.username?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.username || 'User'}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-text-muted
              hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 bottom-0 z-40 bg-background/95 backdrop-blur-xl border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="relative w-64 h-full bg-background border-r border-border flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-6 border-b border-border bg-background/80 backdrop-blur-xl">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="font-display font-bold text-text-primary text-lg flex-1">
            {getPageTitle(pathname)}
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-text-muted">
              {user.username || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-muted
                hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
