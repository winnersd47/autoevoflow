import { NextResponse } from 'next/server'
import type { AuthUser } from '@/store'

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const isProd = process.env.NODE_ENV === 'production'

// Tokens are freshly minted by our own backend over localhost — decoding the
// payload here is just to read `exp` for the cookie's maxAge, not a trust
// decision, so no signature check is needed.
function decodeExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    const { exp } = JSON.parse(json) as { exp?: number }
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

function maxAgeFor(token: string, fallbackSeconds: number): number {
  const exp = decodeExp(token)
  if (exp === null) return fallbackSeconds
  return Math.max(0, exp - Math.floor(Date.now() / 1000))
}

export function setAccessCookie(res: NextResponse, token: string): void {
  res.cookies.set('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: maxAgeFor(token, 30 * 60),
  })
}

export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set('refresh_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: maxAgeFor(token, 30 * 24 * 60 * 60),
  })
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set('access_token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 })
  res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 })
}

export interface BackendUser {
  id: number
  email: string
  name: string | null
  avatar_url: string | null
  role: 'user' | 'premium' | 'admin'
  oauth_provider: 'local' | 'google' | 'github'
}

export async function fetchProfile(accessToken: string): Promise<BackendUser | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as BackendUser
  } catch {
    return null
  }
}

export function toAuthUser(profile: BackendUser): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
  }
}
