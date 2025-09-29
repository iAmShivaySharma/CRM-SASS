import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'

// Create mock Next.js request
export function createMockRequest(
  options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: any
    query?: Record<string, string>
    cookies?: Record<string, string>
  } = {}
) {
  const {
    method = 'GET',
    url = '/api/test',
    headers = {},
    body,
    query = {},
    cookies = {},
  } = options

  // Build URL with query parameters
  const urlWithQuery = new URL(url, 'http://localhost:3000')
  Object.entries(query).forEach(([key, value]) => {
    urlWithQuery.searchParams.set(key, value)
  })

  const request = new Request(urlWithQuery.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // Cast to NextRequest to match API route expectations
  return request as NextRequest
}

// Create mock API response helper
export function createMockResponse() {
  const response = {
    status: 200,
    headers: new Map(),
    body: null,
    json: function (data: any) {
      this.body = data
      this.headers.set('Content-Type', 'application/json')
      return this
    },
    setStatus: function (status: number) {
      this.status = status
      return this
    },
    setHeader: function (key: string, value: string) {
      this.headers.set(key, value)
      return this
    },
  }

  return response
}

// Mock API route handler testing
export async function testApiRoute(
  handler: Function,
  options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: any
    query?: Record<string, string>
    params?: Record<string, string>
  } = {}
) {
  const request = createMockRequest(options)

  // Mock params if provided
  const mockParams = options.params ? { params: options.params } : {}

  try {
    const response = await handler(request, mockParams)

    // Extract response data
    const responseData = await response.json()

    return {
      status: response.status,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
      response,
    }
  } catch (error) {
    throw new Error(`API route test failed: ${error.message}`)
  }
}

// Validate API response structure
export function validateApiResponse(response: any, expectedStructure: any) {
  const errors: string[] = []

  function validateStructure(obj: any, expected: any, path = '') {
    for (const key in expected) {
      const currentPath = path ? `${path}.${key}` : key

      if (!(key in obj)) {
        errors.push(`Missing required field: ${currentPath}`)
        continue
      }

      const expectedType = expected[key]
      const actualValue = obj[key]

      if (typeof expectedType === 'string') {
        // Type check
        if (expectedType === 'array' && !Array.isArray(actualValue)) {
          errors.push(`Expected ${currentPath} to be an array`)
        } else if (
          expectedType !== 'array' &&
          typeof actualValue !== expectedType
        ) {
          errors.push(
            `Expected ${currentPath} to be ${expectedType}, got ${typeof actualValue}`
          )
        }
      } else if (typeof expectedType === 'object' && expectedType !== null) {
        // Nested object validation
        if (typeof actualValue === 'object' && actualValue !== null) {
          validateStructure(actualValue, expectedType, currentPath)
        } else {
          errors.push(`Expected ${currentPath} to be an object`)
        }
      }
    }
  }

  validateStructure(response, expectedStructure)
  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Common API response structures
export const apiResponseStructures = {
  success: {
    success: 'boolean',
    message: 'string',
  },

  successWithData: {
    success: 'boolean',
    message: 'string',
    data: 'object',
  },

  pagination: {
    success: 'boolean',
    data: 'array',
    pagination: {
      page: 'number',
      limit: 'number',
      total: 'number',
      pages: 'number',
    },
  },

  error: {
    success: 'boolean',
    message: 'string',
    errors: 'array',
  },

  validationError: {
    success: 'boolean',
    message: 'string',
    errors: 'array',
  },

  lead: {
    _id: 'string',
    name: 'string',
    email: 'string',
    workspaceId: 'string',
    status: 'string',
    priority: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },

  contact: {
    _id: 'string',
    name: 'string',
    email: 'string',
    workspaceId: 'string',
    category: 'string',
    status: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },

  webhook: {
    _id: 'string',
    name: 'string',
    webhookType: 'string',
    isActive: 'boolean',
    workspaceId: 'string',
    webhookUrl: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    // This would test the actual database connection
    // Implementation depends on the database client being used
    return { connected: true, error: null }
  } catch (error) {
    return { connected: false, error: error.message }
  }
}

// Mock rate limiting
export function mockRateLimit(shouldLimit = false) {
  return jest.fn().mockImplementation(() => {
    if (shouldLimit) {
      throw new Error('Rate limit exceeded')
    }
    return true
  })
}

// Mock authentication middleware
export function mockAuthMiddleware(shouldAuthenticate = true, user = null) {
  return jest.fn().mockImplementation(() => {
    if (!shouldAuthenticate) {
      return null
    }

    return (
      user || {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        workspaceId: 'test-workspace-id',
      }
    )
  })
}

// Generate test request IDs
export function generateTestRequestId() {
  return `test-request-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Mock webhook signature
export function generateMockWebhookSignature(payload: string, secret: string) {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

// Test helper for async operations
export async function expectAsyncError(
  asyncFn: () => Promise<any>,
  expectedError?: string
) {
  try {
    await asyncFn()
    throw new Error('Expected function to throw an error')
  } catch (error) {
    if (expectedError && !error.message.includes(expectedError)) {
      throw new Error(
        `Expected error message to contain "${expectedError}", got "${error.message}"`
      )
    }
    return error
  }
}
