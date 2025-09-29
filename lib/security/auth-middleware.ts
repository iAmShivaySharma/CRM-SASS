import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/mongodb/auth'
import { User } from '@/lib/mongodb/models'
import { logSecurityEvent } from './validation'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    workspaceId?: string
    permissions: string[]
  }
}

// Permission checking helper
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Check for wildcard permissions
  if (userPermissions.includes('*:*')) return true

  const [resource, action] = requiredPermission.split(':')

  // Check for resource wildcard
  if (userPermissions.includes(`${resource}:*`)) return true

  // Check for exact permission
  return userPermissions.includes(requiredPermission)
}

// Extract token from request
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Also check for token in cookies (for browser requests)
  const cookieToken = request.cookies.get('auth_token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

// Get client information for logging
function getClientInfo(request: NextRequest) {
  return {
    ip:
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
    referer: request.headers.get('referer') || 'unknown',
  }
}

// Main authentication middleware
export async function requireAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<
  { success: true; user: any } | { success: false; response: NextResponse }
> {
  try {
    const token = extractToken(request)

    if (!token) {
      logSecurityEvent(
        'auth_missing_token',
        {
          path: request.nextUrl.pathname,
          ...getClientInfo(request),
        },
        'medium'
      )

      return {
        success: false,
        response: NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        ),
      }
    }

    // Verify JWT token
    const decoded = verifyToken(token)
    if (!decoded || !decoded.userId) {
      logSecurityEvent(
        'auth_invalid_token',
        {
          path: request.nextUrl.pathname,
          ...getClientInfo(request),
        },
        'high'
      )

      return {
        success: false,
        response: NextResponse.json(
          { message: 'Invalid or expired token' },
          { status: 401 }
        ),
      }
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      logSecurityEvent(
        'auth_user_not_found',
        {
          userId: decoded.userId,
          path: request.nextUrl.pathname,
          ...getClientInfo(request),
        },
        'high'
      )

      return {
        success: false,
        response: NextResponse.json(
          { message: 'User not found' },
          { status: 401 }
        ),
      }
    }

    // Check if user account is active
    if (user.status === 'suspended' || user.status === 'deleted') {
      logSecurityEvent(
        'auth_suspended_user',
        {
          userId: user._id,
          email: user.email,
          status: user.status,
          ...getClientInfo(request),
        },
        'high'
      )

      return {
        success: false,
        response: NextResponse.json(
          { message: 'Account suspended or deactivated' },
          { status: 403 }
        ),
      }
    }

    // Get user permissions (simplified - in real app, get from workspace membership)
    const userPermissions = ['*:*'] // Admin permissions for now

    // Check required permission
    if (
      requiredPermission &&
      !hasPermission(userPermissions, requiredPermission)
    ) {
      logSecurityEvent(
        'auth_insufficient_permissions',
        {
          userId: user._id,
          email: user.email,
          requiredPermission,
          userPermissions,
          path: request.nextUrl.pathname,
          ...getClientInfo(request),
        },
        'medium'
      )

      return {
        success: false,
        response: NextResponse.json(
          { message: 'Insufficient permissions' },
          { status: 403 }
        ),
      }
    }

    // Update last activity
    await User.findByIdAndUpdate(user._id, {
      lastSignInAt: new Date(),
      lastActivityAt: new Date(),
    })

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        permissions: userPermissions,
      },
    }
  } catch (error) {
    logSecurityEvent(
      'auth_error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: request.nextUrl.pathname,
        ...getClientInfo(request),
      },
      'high'
    )

    return {
      success: false,
      response: NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      ),
    }
  }
}

// Workspace-specific authentication
export async function requireWorkspaceAuth(
  request: NextRequest,
  workspaceId: string,
  requiredPermission?: string
): Promise<
  | { success: true; user: any; workspace: any }
  | { success: false; response: NextResponse }
> {
  const authResult = await requireAuth(request, requiredPermission)

  if (!authResult.success) {
    return authResult
  }

  // TODO: Check workspace membership and permissions
  // For now, assume user has access to all workspaces

  return {
    success: true,
    user: authResult.user,
    workspace: { id: workspaceId },
  }
}

// API route wrapper for authentication
export function withAuth(
  handler: (
    request: NextRequest,
    context: { user: any }
  ) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (request: NextRequest, context: any) => {
    const authResult = await requireAuth(request, requiredPermission)

    if (!authResult.success) {
      return authResult.response
    }

    return handler(request, { ...context, user: authResult.user })
  }
}

// API route wrapper for workspace authentication
export function withWorkspaceAuth(
  handler: (
    request: NextRequest,
    context: { user: any; workspace: any; params: any }
  ) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (request: NextRequest, context: { params: any }) => {
    const workspaceId =
      context.params?.workspaceId ||
      request.nextUrl.searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace ID required' },
        { status: 400 }
      )
    }

    const authResult = await requireWorkspaceAuth(
      request,
      workspaceId,
      requiredPermission
    )

    if (!authResult.success) {
      return authResult.response
    }

    return handler(request, {
      ...context,
      user: authResult.user,
      workspace: authResult.workspace,
    })
  }
}

// Session management helpers
export function createSecureSession(userId: string, workspaceId?: string) {
  const sessionData = {
    userId,
    workspaceId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  }

  // In production, store in Redis or database
  return sessionData
}

export function invalidateSession(sessionId: string) {
  // In production, remove from Redis or database
  logSecurityEvent('session_invalidated', { sessionId }, 'low')
}

// Brute force protection
const loginAttempts = new Map<
  string,
  { count: number; lastAttempt: number; blockedUntil?: number }
>()

export function checkBruteForce(identifier: string): {
  allowed: boolean
  retryAfter?: number
} {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier)

  if (!attempts) {
    return { allowed: true }
  }

  // Check if still blocked
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((attempts.blockedUntil - now) / 1000),
    }
  }

  // Reset if last attempt was more than 15 minutes ago
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(identifier)
    return { allowed: true }
  }

  return { allowed: attempts.count < 5 }
}

export function recordFailedLogin(identifier: string) {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 }

  attempts.count++
  attempts.lastAttempt = now

  // Block for 1 hour after 5 failed attempts
  if (attempts.count >= 5) {
    attempts.blockedUntil = now + 60 * 60 * 1000 // 1 hour
    logSecurityEvent(
      'brute_force_detected',
      { identifier, attempts: attempts.count },
      'high'
    )
  }

  loginAttempts.set(identifier, attempts)
}

export function recordSuccessfulLogin(identifier: string) {
  loginAttempts.delete(identifier)
}
