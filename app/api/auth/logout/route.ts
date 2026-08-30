export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkspaceMember, Activity } from '@/lib/mongodb/client'
import { log } from '@/lib/logging/logger'

const COOKIE_NAME = 'auth_token'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)

    if (auth) {
      try {
        const userMemberships = await WorkspaceMember.find({
          userId: auth.user._id,
          status: 'active',
        })

        for (const membership of userMemberships) {
          await Activity.create({
            workspaceId: membership.workspaceId,
            performedBy: auth.user.id,
            activityType: 'deleted',
            entityType: 'user',
            entityId: auth.user.id,
            description: `${auth.user.fullName} signed out`,
            metadata: {
              userEmail: auth.user.email,
              signOutTime: new Date().toISOString(),
              activitySubType: 'user_signed_out',
            },
          })
        }
      } catch (activityError) {
        log.warn('Failed to log sign-out activity:', activityError)
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    })

    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    log.error('Logout error:', error)

    const response = NextResponse.json({
      success: true,
      message: 'Signed out',
    })

    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  }
}
