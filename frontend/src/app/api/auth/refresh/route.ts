import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_URL, setAccessCookie, clearAuthCookies } from '@/lib/auth-cookies'

export async function POST() {
  const refreshToken = cookies().get('refresh_token')?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  })

  if (!backendRes.ok) {
    // Refresh token expired/revoked — clear both cookies so the client
    // treats this as a real logout instead of retrying forever.
    const res = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    clearAuthCookies(res)
    return res
  }

  const { access_token } = (await backendRes.json()) as { access_token: string }
  const res = NextResponse.json({ ok: true })
  setAccessCookie(res, access_token)
  return res
}
