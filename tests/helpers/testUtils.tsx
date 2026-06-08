import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { authSlice } from '@/lib/slices/authSlice'
import { workspaceSlice } from '@/lib/slices/workspaceSlice'
import { themeSlice } from '@/lib/slices/themeSlice'
import { AuthState } from '@/lib/slices/authSlice'

// Mock API for testing
const mockApi = createApi({
  reducerPath: 'mockApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Lead', 'Contact', 'User', 'Workspace'],
  endpoints: builder => ({}),
})

// Create a custom render function that includes providers
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: {
    auth?: Partial<AuthState>
    workspace?: any
    theme?: any
  }
  store?: any
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        workspace: workspaceSlice.reducer,
        theme: themeSlice.reducer,
        [mockApi.reducerPath]: mockApi.reducer,
      },
      preloadedState,
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware().concat(mockApi.middleware),
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}

// Mock authenticated user state
export const mockAuthenticatedUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  isAuthenticated: true,
  workspaceId: 'test-workspace-id',
  role: 'admin',
  permissions: ['leads:read', 'leads:write', 'contacts:read', 'contacts:write'],
}

// Mock workspace state
export const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  slug: 'test-workspace',
  currency: 'USD',
  timezone: 'UTC',
}

// Create mock store with authenticated state
export function createMockStore(initialState = {}) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      workspace: workspaceSlice.reducer,
      theme: themeSlice.reducer,
      [mockApi.reducerPath]: mockApi.reducer,
    },
    preloadedState: {
      auth: {
        user: mockAuthenticatedUser,
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      workspace: {
        current: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
      },
      theme: {
        mode: 'light',
        primaryColor: '#3b82f6',
      },
      ...initialState,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(mockApi.middleware),
  })
}

// Mock API responses
export const mockApiResponses = {
  leads: {
    success: true,
    leads: [
      {
        _id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
        status: 'new',
        priority: 'high',
        value: 5000,
        workspaceId: 'test-workspace-id',
        createdAt: '2025-09-23T10:00:00Z',
      },
      {
        _id: 'lead-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        company: 'Tech Solutions',
        status: 'contacted',
        priority: 'medium',
        value: 3000,
        workspaceId: 'test-workspace-id',
        createdAt: '2025-09-23T11:00:00Z',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      pages: 1,
    },
  },

  contacts: {
    success: true,
    contacts: [
      {
        _id: 'contact-1',
        name: 'Bob Johnson',
        email: 'bob@client.com',
        company: 'Client Corp',
        category: 'client',
        status: 'active',
        totalRevenue: 25000,
        workspaceId: 'test-workspace-id',
        createdAt: '2025-09-23T09:00:00Z',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    },
  },

  webhooks: {
    success: true,
    webhooks: [
      {
        _id: 'webhook-1',
        name: 'Facebook Lead Webhook',
        webhookType: 'facebook',
        isActive: true,
        totalRequests: 50,
        successfulRequests: 48,
        failedRequests: 2,
        workspaceId: 'test-workspace-id',
        webhookUrl: 'https://test.com/api/webhooks/receive/webhook-1',
      },
    ],
  },
}

// Wait for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

// Mock successful fetch response
export function mockFetchSuccess(data: any) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

// Mock failed fetch response
export function mockFetchError(
  status = 500,
  message = 'Internal Server Error'
) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
    text: () => Promise.resolve(JSON.stringify({ message })),
  })
}

// Generate test data
export function generateTestLead(overrides = {}) {
  return {
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '+1234567890',
    company: 'Test Company',
    status: 'new',
    priority: 'medium',
    value: 1000,
    source: 'test',
    workspaceId: 'test-workspace-id',
    ...overrides,
  }
}

export function generateTestContact(overrides = {}) {
  return {
    name: 'Test Contact',
    email: 'contact@example.com',
    phone: '+1987654321',
    company: 'Contact Company',
    category: 'prospect',
    status: 'active',
    priority: 'medium',
    workspaceId: 'test-workspace-id',
    ...overrides,
  }
}

export function generateTestUser(overrides = {}) {
  return {
    email: 'testuser@example.com',
    fullName: 'Test User',
    password: 'TestPassword123!',
    timezone: 'UTC',
    ...overrides,
  }
}

// Database test helpers
export async function clearTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'clearTestDatabase should only be called in test environment'
    )
  }

  // Clear test database collections
  // This will be implemented when database models are available
}

// Custom matchers
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      }
    }
  },

  toBeValidObjectId(received) {
    const objectIdRegex = /^[a-f\d]{24}$/i
    const pass = typeof received === 'string' && objectIdRegex.test(received)

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      }
    }
  },
})

// Export everything
export * from '@testing-library/react'
export * from '@testing-library/user-event'
