import { type NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const PROTECTED_ROUTES = [
  '/dashboard',
  '/leads',
  '/roles',
  '/workspace',
  '/settings',
  '/analytics',
  '/webhooks',
  '/blogs',
]

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth',
  '/',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/google',
  '/api/webhooks',
  '/shared',
  '/api/shared',
  '/blog',
  '/feed.xml',
]

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return false
  }
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret'
    )
    const { payload } = await jwtVerify(token, secret)
    return !!(payload.userId && payload.exp && payload.exp > Date.now() / 1000)
  } catch {
    return false
  }
}

const getAllowedOrigins = (): string[] => {
  if (!process.env.CORS_ORIGINS) {
    throw new Error('CORS_ORIGINS environment variable is not set')
  }
  return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
}

function handleCors(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name'
  )
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}

async function verifyAuthFromRequest(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      return await verifyToken(token)
    }

    const tokenCookie = request.cookies.get('auth_token')
    if (tokenCookie) {
      return await verifyToken(tokenCookie.value)
    }

    return false
  } catch {
    return false
  }
}

const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  '/api/auth/login': { requests: 5, windowMs: 15 * 60 * 1000 },
  '/api/auth/signup': { requests: 3, windowMs: 60 * 60 * 1000 },
  '/api/leads': { requests: 100, windowMs: 15 * 60 * 1000 },
  '/api/roles': { requests: 50, windowMs: 15 * 60 * 1000 },
  default: { requests: 200, windowMs: 15 * 60 * 1000 },
}

function getRateLimit(pathname: string) {
  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return limit
    }
  }
  return RATE_LIMITS.default
}

function checkRateLimit(
  key: string,
  limit: { requests: number; windowMs: number }
): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs })
    return true
  }

  if (record.count >= limit.requests) {
    return false
  }

  record.count++
  return true
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return handleCors(request, response)
  }

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  if (isProtectedRoute(pathname)) {
    const isAuthenticated = await verifyAuthFromRequest(request)

    if (!isAuthenticated) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        )
      }

      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname === '/login' || pathname === '/signup') {
    const isAuthenticated = await verifyAuthFromRequest(request)
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (pathname === '/') {
    const isAuthenticated = await verifyAuthFromRequest(request)
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  if (pathname.startsWith('/api/')) {
    const clientIP = getClientIP(request)
    const rateLimit = getRateLimit(pathname)
    const rateLimitKey = `${clientIP}:${pathname}`

    if (!checkRateLimit(rateLimitKey, rateLimit)) {
      return new NextResponse(
        JSON.stringify({
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rateLimit.windowMs / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateLimit.windowMs / 1000).toString(),
            'X-RateLimit-Limit': rateLimit.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(
              (Date.now() + rateLimit.windowMs) / 1000
            ).toString(),
          },
        }
      )
    }

    const record = rateLimitStore.get(rateLimitKey)
    if (record) {
      response.headers.set('X-RateLimit-Limit', rateLimit.requests.toString())
      response.headers.set(
        'X-RateLimit-Remaining',
        (rateLimit.requests - record.count).toString()
      )
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(record.resetTime / 1000).toString()
      )
    }
  }

  return handleCors(request, response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
