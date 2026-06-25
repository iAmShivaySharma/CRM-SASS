import { type NextRequest } from 'next/server'

export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const xClientIP = request.headers.get('x-client-ip')
  const xForwardedHost = request.headers.get('x-forwarded-host')

  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    const clientIP = ips[0]
    if (isValidIP(clientIP)) {
      return clientIP
    }
  }

  if (realIP && isValidIP(realIP)) {
    return realIP
  }

  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP
  }

  if (xClientIP && isValidIP(xClientIP)) {
    return xClientIP
  }

  try {
    const url = new URL(request.url)
    if (url.hostname && url.hostname !== 'localhost') {
      return url.hostname
    }
  } catch (error) {}

  if (process.env.NODE_ENV === 'development') {
    return 'dev-localhost'
  }

  return 'unknown-client'
}

function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false
  }

  ip = ip.trim()

  if (!ip) {
    return false
  }

  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

export function getIPGeolocation(ip: string): {
  country?: string
  city?: string
  region?: string
} {
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

export function isBotIP(ip: string): boolean {
  const botPatterns = [/^66\.249\./, /^157\.55\./, /^40\.77\./, /^207\.46\./]

  return botPatterns.some(pattern => pattern.test(ip))
}

export function generateRateLimitKey(ip: string, context?: string): string {
  const baseKey = `rate_limit:${ip}`
  return context ? `${baseKey}:${context}` : baseKey
}

export function logIPInfo(request: NextRequest, extractedIP: string): void {
  if (process.env.NODE_ENV === 'development') {
  }
}
