'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Star,
  Zap,
  Car,
  Network,
  BarChart3,
  Compass,
} from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { AppLogo } from '@/components/ui/AppLogo'
import { useAppStore } from '@/store'
import { signOut } from '@/lib/auth-client'

// ─── Language Switcher ─────────────────────────────────────────────────────────

function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
      title={locale === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/15 bg-white/5
        hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 font-mono tracking-wider"
    >
      {locale === 'en' ? 'RU' : 'EN'}
    </button>
  )
}

// ─── Logo (uses shared AppLogo component) ─────────────────────────────────────

function Logo() {
  return <AppLogo size="sm" withText className="flex-shrink-0" />
}

// ─── Nav Link ─────────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
        ${active
          ? 'text-[#00d4ff]'
          : 'text-white/50 hover:text-white/90'
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {active && (
        <>
          <motion.div
            layoutId="navActiveIndicator"
            className="absolute inset-0 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20"
            style={{ zIndex: -1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
          <motion.div
            layoutId="navActiveGlow"
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
            style={{ background: '#00d4ff', boxShadow: '0 0 8px rgba(0,212,255,0.8)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        </>
      )}
    </Link>
  )
}

// ─── User Dropdown ────────────────────────────────────────────────────────────

function UserDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user } = useAppStore(s => s.auth)
  const isGuest = !user
  const { t } = useLocale()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isGuest) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          bg-[#00d4ff] text-black hover:bg-[#00e8ff] hover:shadow-[0_0_16px_rgba(0,212,255,0.4)]
          transition-all duration-200 active:scale-[0.97]"
      >
        <Zap className="w-4 h-4" />
        {t('nav.signIn')}
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 p-1.5 rounded-xl border border-white/10 hover:border-white/20
          bg-white/5 hover:bg-white/8 transition-all duration-200"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff]/30 to-[#0066aa]/30 border border-[#00d4ff]/20
          flex items-center justify-center text-[#00d4ff] text-xs font-bold">
          {(user.name?.[0] ?? user.email[0] ?? 'U').toUpperCase()}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden border border-white/10 z-50"
            style={{
              background: 'rgba(10,10,20,0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div className="px-4 py-3 border-b border-white/8">
              <div className="text-sm font-semibold text-white">{user.name ?? user.email.split('@')[0]}</div>
              <div className="text-xs text-white/40">{user.email}</div>
            </div>
            {[
              { icon: User, label: t('nav.profile'), href: '/profile' },
              { icon: Star, label: t('nav.favorites'), href: '/favorites' },
              { icon: Settings, label: t('nav.settings'), href: '/settings' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/8">
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all"
                onClick={() => { setOpen(false); void signOut(router) }}
              >
                <LogOut className="w-4 h-4" />
                {t('nav.signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  pathname,
  navItems,
}: {
  open: boolean
  onClose: () => void
  pathname: string
  navItems: { label: string; href: string; icon: React.ElementType }[]
}) {
  const { t } = useLocale()
  const router = useRouter()
  const { user } = useAppStore(s => s.auth)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col border-r border-white/10"
            style={{
              background: 'rgba(5,5,10,0.97)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <Logo />
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${active
                        ? 'text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/20'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/8">
              {user ? (
                <button
                  onClick={() => { onClose(); void signOut(router) }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold
                    bg-white/5 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.signOut')}
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold
                    bg-[#00d4ff] text-black hover:bg-[#00e8ff] transition-all"
                >
                  <Zap className="w-4 h-4" />
                  {t('nav.signInUp')}
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Navigation ───────────────────────────────────────────────────────────

export function Navigation() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useLocale()

  const NAV_ITEMS = [
    { label: t('nav.home'), href: '/', icon: Car },
    { label: t('nav.brands'), href: '/brands', icon: Compass },
    { label: t('nav.evolution'), href: '/evolution', icon: Network },
    { label: t('nav.latest'), href: '/latest', icon: Zap },
    { label: t('nav.search'), href: '/search', icon: Search },
    { label: t('nav.compare'), href: '/compare', icon: BarChart3 },
  ]

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <motion.header
        animate={{
          backgroundColor: scrolled ? 'rgba(5,5,10,0.92)' : 'rgba(5,5,10,0.6)',
          borderBottomColor: scrolled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
          backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'blur(16px) saturate(160%)',
        }}
        transition={{ duration: 0.2 }}
        className="fixed top-0 left-0 right-0 z-30 border-b"
        style={{ WebkitBackdropFilter: 'inherit' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                />
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search shortcut */}
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10
                bg-white/4 text-white/30 hover:text-white/70 hover:border-white/20 hover:bg-white/6
                transition-all duration-200 text-xs font-mono"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('nav.search')}</span>
              <span className="px-1 py-0.5 rounded bg-white/8 text-white/25 text-[9px] border border-white/10">⌘K</span>
            </Link>

            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Notification bell */}
            <button
              className="relative p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title={t('nav.notifications')}
            >
              <Bell className="w-4.5 h-4.5" />
              {/* Dot indicator */}
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
                style={{ boxShadow: '0 0 4px rgba(0,212,255,0.8)' }}
              />
            </button>

            {/* User */}
            <UserDropdown />

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
        navItems={NAV_ITEMS}
      />

      {/* Top spacer */}
      <div className="h-16" />
    </>
  )
}

export default Navigation
