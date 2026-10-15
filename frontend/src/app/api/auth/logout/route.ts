import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_URL, clearAuthCookies } from '@/lib/auth-cookies'

export async function POST() {
  const refreshToken = cookies().get('refresh_token')?.value

  if (refreshToken) {
    // Best-effort — cookies get cleared regardless of whether the backend
    // blacklist call succeeds (it silently no-ops without Redis anyway).
    try {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
      })
    } catch {
      // ignore — logging out client-side still succeeds
    }
  }

  const res = NextResponse.json({ ok: true })
  clearAuthCookies(res)
  return res
}
