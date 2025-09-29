/**
 * IP Address Extraction Utilities
 *
 * Provides robust IP address extraction from Next.js requests
 * with proper fallbacks for development and production environments.
 */

import { NextRequest } from 'next/server'

/**
 * Extract client IP address from Next.js request
 * Handles various proxy configurations and development environments
 */
export function getClientIP(request: NextRequest): string {
  // Try to get IP from various headers (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  const xClientIP = request.headers.get('x-client-ip')
  const xForwardedHost = request.headers.get('x-forwarded-host')

  // Handle x-forwarded-for (can contain multiple IPs)
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    // Return the first IP (original client)
    const clientIP = ips[0]
    if (isValidIP(clientIP)) {
      return clientIP
    }
  }

  // Try other headers
  if (realIP && isValidIP(realIP)) {
    return realIP
  }

  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP
  }

  if (xClientIP && isValidIP(xClientIP)) {
    return xClientIP
  }

  // Try to extract from request URL (for development)
  try {
    const url = new URL(request.url)
    if (url.hostname && url.hostname !== 'localhost') {
      return url.hostname
    }
  } catch (error) {
    // Ignore URL parsing errors
  }

  // Development fallback - use a consistent identifier
  if (process.env.NODE_ENV === 'development') {
    return 'dev-localhost'
  }

  // Production fallback
  return 'unknown-client'
}

/**
 * Validate if a string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false
  }

  // Remove any whitespace
  ip = ip.trim()

  // Check for empty string
  if (!ip) {
    return false
  }

  // IPv4 regex
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Get geographical information from IP (placeholder for future implementation)
 */
export function getIPGeolocation(ip: string): {
  country?: string
  city?: string
  region?: string
} {
  // Placeholder for IP geolocation service integration
  // Could integrate with services like MaxMind, IPinfo, etc.

  if (
    ip === 'dev-localhost' ||
    ip.includes('localhost') ||
    ip.includes('127.0.0.1')
  ) {
    return {
      country: 'Development',
      city: 'Local',
      region: 'Dev',
    }
  }

  return {}
}

/**
 * Check if IP is from a known bot or crawler
 */
export function isBotIP(ip: string): boolean {
  // Common bot IP patterns (extend as needed)
  const botPatterns = [
    /^66\.249\./, // Googlebot
    /^157\.55\./, // Bingbot
    /^40\.77\./, // Bingbot
    /^207\.46\./, // Bingbot
  ]

  return botPatterns.some(pattern => pattern.test(ip))
}

/**
 * Generate a rate limiting key from IP and additional context
 */
export function generateRateLimitKey(ip: string, context?: string): string {
  const baseKey = `rate_limit:${ip}`
  return context ? `${baseKey}:${context}` : baseKey
}

/**
 * Log IP information for debugging
 */
export function logIPInfo(request: NextRequest, extractedIP: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('IP Extraction Debug:', {
      extractedIP,
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'x-real-ip': request.headers.get('x-real-ip'),
        'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
        'x-client-ip': request.headers.get('x-client-ip'),
      },
      url: request.url,
      method: request.method,
    })
  }
}
