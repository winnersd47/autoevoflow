import { NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'
import type { AuthUser } from '@/store'

// Изначальный дизайн ждал отдельный FastAPI-бэкенд (AutoEvoFlow/backend) —
// он никогда не был задеплоен, все вызовы на BACKEND_URL висели на
// ERR_CONNECTION_REFUSED/"Network error" в форме логина. Сайт — личный
// проект с ОДНИМ владельцем, полноценный сервер пользователей ему не нужен:
// вход теперь проверяется локально (ADMIN_EMAIL/ADMIN_PASSWORD_HASH в
// .env.local, задаются через scripts/set-admin-password.js), а токены —
// самодельные JWT на том же JWT_SECRET, что уже проверяет middleware.ts.
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const isProd = process.env.NODE_ENV === 'production'
const secret = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null

const ACCESS_TTL_SECONDS = 30 * 60
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60

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
    maxAge: maxAgeFor(token, ACCESS_TTL_SECONDS),
  })
}

export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set('refresh_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: maxAgeFor(token, REFRESH_TTL_SECONDS),
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

export function toAuthUser(profile: BackendUser): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
  }
}

// ─── Единственный локальный аккаунт ────────────────────────────────────────

// Задаётся через `node scripts/set-admin-password.js <email> <пароль>` —
// пароль никогда не хранится в коде/логах, только scrypt-хэш в .env.local.
export function verifyAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const hashField = process.env.ADMIN_PASSWORD_HASH
  if (!adminEmail || !hashField) return false
  if (email.toLowerCase() !== adminEmail.toLowerCase()) return false

  const [salt, storedHash] = hashField.split(':')
  if (!salt || !storedHash) return false
  const candidate = crypto.scryptSync(password, salt, 64)
  const stored = Buffer.from(storedHash, 'hex')
  // Длины отличаются — timingSafeEqual бросит исключение, а не вернёт false.
  if (candidate.length !== stored.length) return false
  return crypto.timingSafeEqual(candidate, stored)
}

async function signToken(type: 'access' | 'refresh', ttlSeconds: number): Promise<string> {
  if (!secret) throw new Error('JWT_SECRET не задан в .env.local')
  return new SignJWT({ role: 'admin', type })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('1')
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secret)
}

export function signAccessToken(): Promise<string> {
  return signToken('access', ACCESS_TTL_SECONDS)
}

export function signRefreshToken(): Promise<string> {
  return signToken('refresh', REFRESH_TTL_SECONDS)
}

export async function verifyLocalToken(token: string, expectedType: 'access' | 'refresh'): Promise<boolean> {
  if (!secret) return false
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload['type'] === expectedType
  } catch {
    return false
  }
}

// Профиль — то же самое для всех вызовов (один аккаунт), просто проверяем,
// что токен подписан нами же, а не ходим на несуществующий /api/v1/auth/me.
export async function fetchProfile(accessToken: string): Promise<BackendUser | null> {
  const ok = await verifyLocalToken(accessToken, 'access')
  if (!ok) return null
  const email = process.env.ADMIN_EMAIL
  if (!email) return null
  return { id: 1, email, name: null, avatar_url: null, role: 'admin', oauth_provider: 'local' }
}
