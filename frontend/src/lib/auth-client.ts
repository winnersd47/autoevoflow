import type { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'

export async function signOut(router: ReturnType<typeof useRouter>): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
  useAppStore.getState().setAuth(null)
  router.push('/')
  router.refresh()
}

let refreshInFlight: Promise<boolean> | null = null

// Call this from a 401 handler before retrying an authenticated request.
// Concurrent callers share one in-flight /api/auth/refresh call instead of
// each firing their own — the backend's refresh token isn't rotated on use,
// so racing calls wouldn't break anything, but there's no reason to make 5
// network round trips when 1 does. Returns whether the session is now valid.
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', { method: 'POST' })
      .then(res => res.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}
