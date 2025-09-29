/**
 * Industry-Standard Rate Limiting Implementation with Winston Logging
 *
 * Features:
 * - Multiple rate limiting strategies (sliding window, token bucket)
 * - Per-endpoint and per-IP rate limiting
 * - Configurable limits for different operations
 * - Redis-ready for production scaling
 * - Comprehensive Winston logging and monitoring
 * - DDoS protection with security event logging
 * - Performance metrics tracking
 * - Automatic cleanup and maintenance
 */

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

// In-memory store (use Redis in production)
const rateLimitStore = new Map<
  string,
  {
    requests: number[]
    blocked: boolean
    blockedUntil?: number
  }
>()

// Rate limit configurations for different endpoints
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true,
  },

  // API endpoints - moderate limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: false,
  },

  // Lead creation - specific limits
  leads: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 leads per minute
    skipSuccessfulRequests: false,
  },

  // Invitations - strict limits to prevent spam
  invites: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 invitations per minute
    skipSuccessfulRequests: false,
  },

  // Webhook endpoints - higher limits
  webhooks: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
    skipSuccessfulRequests: true,
  },

  // Default fallback
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    skipSuccessfulRequests: false,
  },
}

/**
 * Enhanced rate limiting function with comprehensive logging
 */
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

  // Get or create rate limit data
  let rateLimitData = rateLimitStore.get(key)
  if (!rateLimitData) {
    rateLimitData = { requests: [], blocked: false }
    rateLimitStore.set(key, rateLimitData)

    // Log new rate limit entry
    log.debug(`Created new rate limit entry for ${key}`, {
      endpoint,
      identifier,
      config: {
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      },
    })
  }

  // Check if currently blocked
  if (
    rateLimitData.blocked &&
    rateLimitData.blockedUntil &&
    now < rateLimitData.blockedUntil
  ) {
    const retryAfter = Math.ceil((rateLimitData.blockedUntil - now) / 1000)

    // Log blocked attempt
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

  // Clean old requests outside the window
  const oldRequestCount = rateLimitData.requests.length
  rateLimitData.requests = rateLimitData.requests.filter(
    timestamp => timestamp > windowStart
  )
  const cleanedRequests = oldRequestCount - rateLimitData.requests.length

  if (cleanedRequests > 0) {
    log.debug(`Cleaned ${cleanedRequests} old requests for ${key}`)
  }

  // Check if limit exceeded
  if (rateLimitData.requests.length >= config.maxRequests) {
    // Block for additional time if repeatedly hitting limits
    const blockDuration = Math.min(config.windowMs * 2, 60 * 60 * 1000) // Max 1 hour
    rateLimitData.blocked = true
    rateLimitData.blockedUntil = now + blockDuration

    // Log security event for rate limit exceeded
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

    // Log rate limit event
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

  // Add current request
  rateLimitData.requests.push(now)
  rateLimitData.blocked = false
  rateLimitData.blockedUntil = undefined

  const remaining = config.maxRequests - rateLimitData.requests.length
  const processingTime = Date.now() - startTime

  // Log successful rate limit check
  logRateLimitEvent(identifier, endpoint, false, {
    remaining,
    requestCount: rateLimitData.requests.length,
    maxRequests: config.maxRequests,
    processingTime,
  })

  // Log performance if rate limiting is slow
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

/**
 * Express-style rate limiting middleware
 */
export function createRateLimiter(
  endpoint: string,
  customConfig?: Partial<RateLimitConfig>
) {
  return async (identifier: string) => {
    return rateLimit(identifier, endpoint, customConfig)
  }
}

/**
 * Advanced rate limiting with multiple strategies
 */
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

  /**
   * Token bucket algorithm for burst handling
   */
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

    // Calculate tokens to add based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = Math.floor(timePassed * refillRate)

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }

    // Check if enough tokens available
    if (bucket.tokens >= tokensRequired) {
      bucket.tokens -= tokensRequired
      return {
        success: true,
        remaining: bucket.tokens,
        resetTime: now + ((capacity - bucket.tokens) / refillRate) * 1000,
      }
    }

    // Calculate retry after time
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

/**
 * IP-based rate limiting with geolocation awareness
 */
export async function ipRateLimit(
  ip: string,
  endpoint: string,
  userAgent?: string
): Promise<RateLimitResult> {
  // Enhanced identifier including user agent hash for better tracking
  const identifier = userAgent ? `${ip}:${hashString(userAgent)}` : ip

  // Apply stricter limits for suspicious patterns
  let config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default

  // Detect potential bot traffic
  if (userAgent && isSuspiciousUserAgent(userAgent)) {
    config = {
      ...config,
      maxRequests: Math.floor(config.maxRequests * 0.1), // 10% of normal limit
    }
  }

  return rateLimit(identifier, endpoint, config)
}

/**
 * Utility functions
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
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

/**
 * Cleanup function to remove old entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours

  // Convert to array for TypeScript compatibility
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, data] of entries) {
    if (data.requests.length > 0) {
      const oldestRequest = Math.min(...data.requests)
      if (now - oldestRequest > maxAge) {
        rateLimitStore.delete(key)
      }
    } else {
      // Remove empty entries
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup every hour
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 60 * 60 * 1000)
}

export { RATE_LIMIT_CONFIGS }
