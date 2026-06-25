import { type NextRequest } from 'next/server'
import { verifyAuthToken } from './mongodb/auth'

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
  } catch {
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
