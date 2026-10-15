import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { fetchProfile, toAuthUser } from '@/lib/auth-cookies'

export async function GET() {
  const accessToken = cookies().get('access_token')?.value
  if (!accessToken) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const profile = await fetchProfile(accessToken)
  return NextResponse.json({ user: profile ? toAuthUser(profile) : null })
}
