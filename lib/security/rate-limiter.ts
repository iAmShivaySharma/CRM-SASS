import { log } from '../logging/logger'
import { logRateLimitEvent } from '../logging/middleware'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (identifier: string) => string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

const rateLimitStore = new Map<
  string,
  {
    requests: number[]
    blocked: boolean
    blockedUntil?: number
  }
>()

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    skipSuccessfulRequests: true,
  },

  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    skipSuccessfulRequests: false,
  },

  leads: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    skipSuccessfulRequests: false,
  },

  invites: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    skipSuccessfulRequests: false,
  },

  webhooks: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    skipSuccessfulRequests: true,
  },

  default: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    skipSuccessfulRequests: false,
  },
}

export async function rateLimit(
  identifier: string,
  endpoint: string = 'default',
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const startTime = Date.now()
  const config = {
    ...(RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default),
    ...customConfig,
  }
  const key = config.keyGenerator
    ? config.keyGenerator(identifier)
    : `${endpoint}:${identifier}`

  const now = Date.now()
  const windowStart = now - config.windowMs

  let rateLimitData = rateLimitStore.get(key)
  if (!rateLimitData) {
    rateLimitData = { requests: [], blocked: false }
    rateLimitStore.set(key, rateLimitData)

    log.debug(`Created new rate limit entry for ${key}`, {
      endpoint,
      identifier,
      config: {
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      },
    })
  }

  if (
    rateLimitData.blocked &&
    rateLimitData.blockedUntil &&
    now < rateLimitData.blockedUntil
  ) {
    const retryAfter = Math.ceil((rateLimitData.blockedUntil - now) / 1000)

    logRateLimitEvent(identifier, endpoint, true, {
      reason: 'currently_blocked',
      blockedUntil: new Date(rateLimitData.blockedUntil).toISOString(),
      retryAfter,
    })

    return {
      success: false,
      remaining: 0,
      resetTime: rateLimitData.blockedUntil,
      retryAfter,
    }
  }

  const oldRequestCount = rateLimitData.requests.length
  rateLimitData.requests = rateLimitData.requests.filter(
    timestamp => timestamp > windowStart
  )
  const cleanedRequests = oldRequestCount - rateLimitData.requests.length

  if (cleanedRequests > 0) {
    log.debug(`Cleaned ${cleanedRequests} old requests for ${key}`)
  }

  if (rateLimitData.requests.length >= config.maxRequests) {
    const blockDuration = Math.min(config.windowMs * 2, 60 * 60 * 1000)
    rateLimitData.blocked = true
    rateLimitData.blockedUntil = now + blockDuration

    log.security(
      'Rate limit exceeded - potential DDoS attempt',
      {
        identifier,
        endpoint,
        requests: rateLimitData.requests.length,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        blockDuration,
        blockedUntil: new Date(rateLimitData.blockedUntil).toISOString(),
      },
      'high'
    )

    logRateLimitEvent(identifier, endpoint, true, {
      reason: 'limit_exceeded',
      requestCount: rateLimitData.requests.length,
      maxRequests: config.maxRequests,
      blockDuration,
      blockedUntil: new Date(rateLimitData.blockedUntil).toISOString(),
    })

    return {
      success: false,
      remaining: 0,
      resetTime: rateLimitData.blockedUntil,
      retryAfter: Math.ceil(blockDuration / 1000),
    }
  }

  rateLimitData.requests.push(now)
  rateLimitData.blocked = false
  rateLimitData.blockedUntil = undefined

  const remaining = config.maxRequests - rateLimitData.requests.length
  const processingTime = Date.now() - startTime

  logRateLimitEvent(identifier, endpoint, false, {
    remaining,
    requestCount: rateLimitData.requests.length,
    maxRequests: config.maxRequests,
    processingTime,
  })

  if (processingTime > 10) {
    log.performance(`Rate limiting check for ${endpoint}`, processingTime, {
      identifier,
      endpoint,
      requestCount: rateLimitData.requests.length,
    })
  }

  return {
    success: true,
    remaining,
    resetTime: now + config.windowMs,
  }
}

export function createRateLimiter(
  endpoint: string,
  customConfig?: Partial<RateLimitConfig>
) {
  return async (identifier: string) => {
    return rateLimit(identifier, endpoint, customConfig)
  }
}

export class AdvancedRateLimiter {
  private tokenBuckets = new Map<
    string,
    {
      tokens: number
      lastRefill: number
      capacity: number
      refillRate: number
    }
  >()

  async tokenBucket(
    identifier: string,
    capacity: number = 10,
    refillRate: number = 1, // tokens per second
    tokensRequired: number = 1
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const key = `bucket:${identifier}`

    let bucket = this.tokenBuckets.get(key)
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate,
      }
      this.tokenBuckets.set(key, bucket)
    }

    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = Math.floor(timePassed * refillRate)

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }

    if (bucket.tokens >= tokensRequired) {
      bucket.tokens -= tokensRequired
      return {
        success: true,
        remaining: bucket.tokens,
        resetTime: now + ((capacity - bucket.tokens) / refillRate) * 1000,
      }
    }

    const tokensNeeded = tokensRequired - bucket.tokens
    const retryAfter = Math.ceil(tokensNeeded / refillRate)

    return {
      success: false,
      remaining: bucket.tokens,
      resetTime: now + (capacity / refillRate) * 1000,
      retryAfter,
    }
  }
}

export async function ipRateLimit(
  ip: string,
  endpoint: string,
  userAgent?: string
): Promise<RateLimitResult> {
  const identifier = userAgent ? `${ip}:${hashString(userAgent)}` : ip

  let config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default

  if (userAgent && isSuspiciousUserAgent(userAgent)) {
    config = {
      ...config,
      maxRequests: Math.floor(config.maxRequests * 0.1),
    }
  }

  return rateLimit(identifier, endpoint, config)
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /requests/i,
  ]

  return suspiciousPatterns.some(pattern => pattern.test(userAgent))
}

export function cleanupRateLimitStore(): void {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000

  // Convert to array for TypeScript compatibility
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, data] of entries) {
    if (data.requests.length > 0) {
      const oldestRequest = Math.min(...data.requests)
      if (now - oldestRequest > maxAge) {
        rateLimitStore.delete(key)
      }
    } else {
      rateLimitStore.delete(key)
    }
  }
}

if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 60 * 60 * 1000)
}

export { RATE_LIMIT_CONFIGS }
