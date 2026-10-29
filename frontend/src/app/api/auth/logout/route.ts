import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth-cookies'

export async function POST() {
  // Токены теперь самодельные JWT, отзывать на бэкенде нечего — просто чистим куки.
  const res = NextResponse.json({ ok: true })
  clearAuthCookies(res)
  return res
}
