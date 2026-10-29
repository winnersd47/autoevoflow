import { NextResponse } from 'next/server'
import {
  setAccessCookie, setRefreshCookie, fetchProfile, toAuthUser,
  verifyAdminCredentials, signAccessToken, signRefreshToken,
} from '@/lib/auth-cookies'

export async function POST(req: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
    return NextResponse.json(
      { error: 'Админ-аккаунт ещё не настроен — запустите scripts/set-admin-password.js' },
      { status: 503 },
    )
  }
  if (!verifyAdminCredentials(body.email, body.password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const accessToken = await signAccessToken()
  const refreshToken = await signRefreshToken()
  const profile = await fetchProfile(accessToken)

  const res = NextResponse.json({ user: profile ? toAuthUser(profile) : null })
  setAccessCookie(res, accessToken)
  setRefreshCookie(res, refreshToken)
  return res
}
