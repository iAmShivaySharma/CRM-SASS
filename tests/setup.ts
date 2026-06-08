import '@testing-library/jest-dom'

// Add Node.js globals for web APIs
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock Next.js server components globals for testing
global.Request =
  global.Request ||
  class Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      Object.assign(this, { url: input, ...init })
    }
  }

global.Response =
  global.Response ||
  class Response {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      Object.assign(this, { body, ...init })
    }
    json() {
      return Promise.resolve({})
    }
    text() {
      return Promise.resolve('')
    }
  }

global.Headers =
  global.Headers ||
  class Headers {
    private headers: Record<string, string> = {}
    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => (this.headers[key] = value))
        } else if (typeof init === 'object') {
          Object.assign(this.headers, init)
        }
      }
    }
    get(name: string) {
      return this.headers[name] || null
    }
    set(name: string, value: string) {
      this.headers[name] = value
    }
    has(name: string) {
      return name in this.headers
    }
  }

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock scrollTo
global.scrollTo = jest.fn()

// Mock fetch
global.fetch = jest.fn()

// Setup environment variables for tests
process.env.MONGODB_URI = 'mongodb://localhost:27017/crm_test'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.NODE_ENV = 'test'
process.env.SUPPRESS_JEST_WARNINGS = 'true'
