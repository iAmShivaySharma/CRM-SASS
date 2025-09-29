import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Generate valid JWT token for testing
export function generateTestJWT(payload = {}) {
  const defaultPayload = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      workspaceId: 'test-workspace-id',
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    ...payload,
  }

  return jwt.sign(defaultPayload, process.env.JWT_SECRET!)
}

// Generate expired JWT token for testing
export function generateExpiredJWT(payload = {}) {
  const expiredPayload = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      workspaceId: 'test-workspace-id',
    },
    iat: Math.floor(Date.now() / 1000) - 60 * 60 * 2, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour ago (expired)
    ...payload,
  }

  return jwt.sign(expiredPayload, process.env.JWT_SECRET!)
}

// Generate invalid JWT token for testing
export function generateInvalidJWT() {
  return 'invalid.jwt.token'
}

// Hash password for testing
export async function hashTestPassword(password: string) {
  return await bcrypt.hash(password, 12)
}

// Mock authentication headers
export function createAuthHeaders(token?: string) {
  const authToken = token || generateTestJWT()
  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  }
}

// Mock request with authentication
export function createAuthenticatedRequest(options = {}) {
  const token = generateTestJWT()
  return {
    headers: new Headers({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }),
    method: 'GET',
    ...options,
  }
}

// Mock unauthenticated request
export function createUnauthenticatedRequest(options = {}) {
  return {
    headers: new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    }),
    method: 'GET',
    ...options,
  }
}

// Verify JWT token structure
export function verifyJWTStructure(token: string) {
  try {
    const decoded = jwt.decode(token, { complete: true })
    return decoded && decoded.header && decoded.payload
  } catch {
    return false
  }
}

// Extract payload from JWT
export function extractJWTPayload(token: string) {
  try {
    return jwt.decode(token) as any
  } catch {
    return null
  }
}

// Mock user permissions
export const mockPermissions = {
  admin: [
    'leads:read',
    'leads:write',
    'leads:delete',
    'contacts:read',
    'contacts:write',
    'contacts:delete',
    'users:read',
    'users:write',
    'users:invite',
    'users:delete',
    'roles:read',
    'roles:write',
    'roles:delete',
    'webhooks:read',
    'webhooks:write',
    'webhooks:delete',
    'reports:read',
    'reports:write',
    'settings:read',
    'settings:write',
    'workspace:admin',
  ],
  manager: [
    'leads:read',
    'leads:write',
    'contacts:read',
    'contacts:write',
    'users:read',
    'users:invite',
    'roles:read',
    'webhooks:read',
    'reports:read',
    'settings:read',
  ],
  sales: [
    'leads:read',
    'leads:write',
    'contacts:read',
    'contacts:write',
    'reports:read',
  ],
  viewer: ['leads:read', 'contacts:read', 'reports:read'],
}

// Generate JWT with specific role
export function generateJWTWithRole(role: keyof typeof mockPermissions) {
  return generateTestJWT({
    user: {
      id: `test-${role}-id`,
      email: `${role}@example.com`,
      fullName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      workspaceId: 'test-workspace-id',
      role,
      permissions: mockPermissions[role],
    },
  })
}

// Mock workspace member data
export function createMockWorkspaceMember(role = 'admin', overrides = {}) {
  return {
    _id: 'test-member-id',
    workspaceId: 'test-workspace-id',
    userId: 'test-user-id',
    roleId: `test-${role}-role-id`,
    status: 'active',
    permissions: mockPermissions[role as keyof typeof mockPermissions] || [],
    isOwner: role === 'admin',
    joinedAt: new Date().toISOString(),
    ...overrides,
  }
}
