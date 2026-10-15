'use client'

import React, { useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { useAppStore, type AuthUser } from '@/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Seeds the Zustand auth slice from the server-resolved user exactly once,
// synchronously during the first render — before Navigation/anything else
// reads `auth` — so there's no flash of guest state for an already-logged-in
// user. Layouts persist across client-side navigation, so this never re-fires
// after login/logout; those update the store directly instead.
function AuthHydrator({ initialUser }: { initialUser: AuthUser | null }) {
  const seeded = useRef(false)
  if (!seeded.current) {
    useAppStore.setState({ auth: { status: initialUser ? 'authenticated' : 'guest', user: initialUser } })
    seeded.current = true
  }
  return null
}

export function AppProviders({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthHydrator initialUser={initialUser} />
        {children}
        {process.env['NODE_ENV'] === 'development' && <ReactQueryDevtools />}
      </LocaleProvider>
    </QueryClientProvider>
  )
}
