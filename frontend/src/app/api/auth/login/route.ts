import { NextResponse } from 'next/server'
import { BACKEND_URL, setAccessCookie, setRefreshCookie, fetchProfile, toAuthUser } from '@/lib/auth-cookies'

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

  const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: 'no-store',
  })

  if (!backendRes.ok) {
    const detail = await backendRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: detail.detail ?? 'Invalid credentials' },
      { status: backendRes.status },
    )
  }

  const tokens = (await backendRes.json()) as { access_token: string; refresh_token: string }
  const profile = await fetchProfile(tokens.access_token)

  const res = NextResponse.json({ user: profile ? toAuthUser(profile) : null })
  setAccessCookie(res, tokens.access_token)
  setRefreshCookie(res, tokens.refresh_token)
  return res
}
