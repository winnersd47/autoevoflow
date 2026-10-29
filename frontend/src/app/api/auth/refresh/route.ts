import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { setAccessCookie, clearAuthCookies, verifyLocalToken, signAccessToken } from '@/lib/auth-cookies'

export async function POST() {
  const refreshToken = cookies().get('refresh_token')?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  const ok = await verifyLocalToken(refreshToken, 'refresh')
  if (!ok) {
    // Истёк/подделан — чистим обе куки, чтобы клиент не ретраил бесконечно.
    const res = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    clearAuthCookies(res)
    return res
  }

  const accessToken = await signAccessToken()
  const res = NextResponse.json({ ok: true })
  setAccessCookie(res, accessToken)
  return res
}
