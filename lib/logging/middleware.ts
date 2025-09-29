/**
 * Logging Middleware for Next.js API Routes
 *
 * Features:
 * - Request/Response logging
 * - Performance monitoring
 * - Error tracking
 * - Security event logging
 * - Rate limiting integration
 * - User activity tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { log } from './logger'

interface RequestLogData {
  method: string
  url: string
  userAgent?: string
  ip?: string
  userId?: string
  workspaceId?: string
  headers?: Record<string, string>
  body?: any
}

interface ResponseLogData {
  statusCode: number
  duration: number
  responseSize?: number
  error?: string
}

/**
 * HTTP Request/Response Logging Middleware
 */
export function withLogging<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: {
    logBody?: boolean
    logHeaders?: boolean
    logResponse?: boolean
    sensitiveFields?: string[]
  } = {}
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest
    const startTime = Date.now()

    // Extract request information
    const requestData: RequestLogData = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
    }

    // Add headers if requested (excluding sensitive ones)
    if (options.logHeaders) {
      const headers: Record<string, string> = {}
      request.headers.forEach((value, key) => {
        if (!isSensitiveHeader(key)) {
          headers[key] = value
        }
      })
      requestData.headers = headers
    }

    // Add body if requested and method allows it
    if (options.logBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.clone().json()
        requestData.body = sanitizeBody(body, options.sensitiveFields)
      } catch {
        // Body is not JSON or empty
      }
    }

    // Log incoming request
    log.info(`Incoming ${request.method} ${request.url}`, requestData)

    let response: NextResponse
    let error: Error | null = null

    try {
      // Execute the handler
      response = await handler(...args)
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')

      // Log error
      log.error(`API Error in ${request.method} ${request.url}`, {
        error: error.message,
        stack: error.stack,
        ...requestData,
      })

      // Return error response
      response = NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    const responseData: ResponseLogData = {
      statusCode: response.status,
      duration,
    }

    if (error) {
      responseData.error = error.message
    }

    // Log response
    log.http(request.method, request.url, response.status, duration, {
      ...requestData,
      ...responseData,
    })

    // Log performance if slow
    if (duration > 1000) {
      log.performance(
        `Slow API call: ${request.method} ${request.url}`,
        duration,
        {
          ...requestData,
          statusCode: response.status,
        }
      )
    }

    return response
  }
}

/**
 * Security Event Logging Middleware
 */
export function withSecurityLogging<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript injection
      /data:text\/html/i, // Data URI XSS
    ]

    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''

    // Check URL for suspicious patterns
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      log.security(
        'Suspicious URL pattern detected',
        {
          url,
          userAgent,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          pattern: 'URL_INJECTION_ATTEMPT',
        },
        'high'
      )
    }

    // Check for bot/crawler patterns
    const botPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i]

    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      log.security(
        'Bot/Crawler detected',
        {
          userAgent,
          url,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
        'low'
      )
    }

    return handler(...args)
  }
}

/**
 * Rate Limiting Logging Integration
 */
export function logRateLimitEvent(
  identifier: string,
  endpoint: string,
  blocked: boolean,
  details?: any
): void {
  if (blocked) {
    log.security(
      'Rate limit exceeded',
      {
        identifier,
        endpoint,
        blocked,
        ...details,
      },
      'medium'
    )
  } else {
    log.debug(
      `Rate limit check passed for ${identifier} on ${endpoint}`,
      details
    )
  }
}

/**
 * User Activity Logging
 */
export function logUserActivity(
  userId: string,
  action: string,
  resource: string,
  details?: any
): void {
  log.audit(action, userId, resource, details)
}

/**
 * Database Operation Logging
 */
export function logDatabaseOperation(
  operation: string,
  collection: string,
  duration: number,
  details?: any
): void {
  log.database(`${operation} on ${collection}`, duration, details)
}

/**
 * Business Event Logging
 */
export function logBusinessEvent(
  event: string,
  userId?: string,
  workspaceId?: string,
  details?: any
): void {
  log.business(event, {
    userId,
    workspaceId,
    ...details,
  })
}

/**
 * Error Boundary Logging
 */
export function logError(
  error: Error,
  context: string,
  additionalData?: any
): void {
  log.error(`Error in ${context}: ${error.message}`, {
    error: error.message,
    stack: error.stack,
    context,
    ...additionalData,
  })
}

// Helper functions
function isSensitiveHeader(headerName: string): boolean {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ]
  return sensitiveHeaders.includes(headerName.toLowerCase())
}

function sanitizeBody(body: any, sensitiveFields: string[] = []): any {
  if (!body || typeof body !== 'object') {
    return body
  }

  const defaultSensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
  ]

  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields]
  const sanitized = { ...body }

  for (const field of allSensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Performance Monitoring Decorator
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()

    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime

      log.performance(operationName, duration)

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      log.error(`${operationName} failed after ${duration}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      })

      throw error
    }
  }
}

const loggingMiddleware = {
  withLogging,
  withSecurityLogging,
  logRateLimitEvent,
  logUserActivity,
  logDatabaseOperation,
  logBusinessEvent,
  logError,
  withPerformanceMonitoring,
}

export default loggingMiddleware
