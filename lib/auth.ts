import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { verifyAuthToken, generateToken } from './mongodb/auth'

export async function verifyMongoToken(request: NextRequest) {
  try {
    const result = await verifyAuthToken(request)
    if (!result) {
      return null
    }

    return {
      user: result.user,
      session: { user: result.user },
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export async function requireAuth(request: NextRequest) {
  const auth = await verifyMongoToken(request)

  if (!auth) {
    throw new Error('Authentication required')
  }

  return auth
}

export function createAuthResponse(message: string, status: number = 401) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Use MongoDB auth functions
export { generateToken as signToken }
export { verifyToken as verifyJwtToken } from './mongodb/auth'

// Function for JWT token verification (used by API routes)
export function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key'
  return jwt.verify(token, secret)
}
