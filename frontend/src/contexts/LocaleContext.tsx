'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { type Locale, getT } from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('autoevoflow_locale') as Locale | null
      if (stored === 'en' || stored === 'ru') setLocaleState(stored)
    } catch { /* ignore */ }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem('autoevoflow_locale', l) } catch { /* ignore */ }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => getT(locale)(key, params),
    [locale]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
