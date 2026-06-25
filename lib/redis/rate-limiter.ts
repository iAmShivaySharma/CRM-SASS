import redis from './client'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const key = `rl:${endpoint}:${identifier}`

  try {
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`)
    pipeline.zcard(key)
    pipeline.expire(key, windowSeconds)

    const results = await pipeline.exec()
    const count = (results?.[2]?.[1] as number) || 0
    const resetAt = now + windowSeconds * 1000

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil(windowSeconds - (now - windowStart) / 1000),
      }
    }

    return {
      allowed: true,
      remaining: limit - count,
      resetAt,
    }
  } catch {
    return {
      allowed: true,
      remaining: limit,
      resetAt: now + windowSeconds * 1000,
    }
  }
}

export const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  'auth/login': { limit: 5, window: 900 },
  'auth/signup': { limit: 3, window: 3600 },
  'api/leads': { limit: 200, window: 900 },
  'api/analytics': { limit: 30, window: 900 },
  'api/webhooks': { limit: 100, window: 900 },
  'api/chat': { limit: 300, window: 900 },
  'api/default': { limit: 200, window: 900 },
}

export function getEndpointKey(pathname: string): string {
  if (pathname.startsWith('/api/auth/login')) return 'auth/login'
  if (pathname.startsWith('/api/auth/signup')) return 'auth/signup'
  if (pathname.startsWith('/api/leads')) return 'api/leads'
  if (pathname.startsWith('/api/analytics')) return 'api/analytics'
  if (pathname.startsWith('/api/webhooks')) return 'api/webhooks'
  if (pathname.startsWith('/api/chat')) return 'api/chat'
  return 'api/default'
}
