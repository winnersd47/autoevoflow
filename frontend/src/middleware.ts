import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/brands',
  '/models',
  '/search',
  '/evolution',
  '/latest',
  '/brand',
  '/model',
  '/auth/google',
  '/auth/github',
]

const PREMIUM_PATHS = [
  '/dashboard',
  '/compare',
]

const ADMIN_PATHS = [
  '/dashboard/admin',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function requiresPremium(pathname: string): boolean {
  return PREMIUM_PATHS.some(p => pathname.startsWith(p))
}

function requiresAdmin(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname.startsWith(p))
}

const secret = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null

interface AccessTokenPayload {
  sub: string
  role?: 'user' | 'premium' | 'admin'
  type?: string
}

async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    if (payload['type'] !== 'access') return null
    return payload as unknown as AccessTokenPayload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value

  // This is a UX fast-path only — every real data call is re-verified by
  // FastAPI's own get_current_user regardless, so a false "authenticated"
  // here can't grant real access to anything.
  const payload = token ? await verifyAccessToken(token) : null

  if (isPublic(pathname)) {
    if (payload && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (requiresAdmin(pathname) && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Everything else that reaches here is a PREMIUM_PATHS route (the only
  // non-public paths that exist today) — any authenticated user may in.
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Исключаем статику Next (она отдаётся по /data, /images — НЕ /public!) и
    // публичные API-прокси, иначе граф (/data/evolution/graph.json) и картинки
    // ошибочно редиректятся на /login. Auth остаётся на dashboard/compare.
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|data/|images/|api/car-image|api/netcarshow-image|api/latest-cars|api/analysis|api/auth).*)',
  ],
}
