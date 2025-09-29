import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkspaceMember, Activity } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    // Verify the user is authenticated
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Log sign-out activity for all user's workspaces
    try {
      const userMemberships = await WorkspaceMember.find({
        userId: auth.user._id,
        status: 'active',
      })

      for (const membership of userMemberships) {
        await Activity.create({
          workspaceId: membership.workspaceId,
          performedBy: auth.user.id,
          activityType: 'deleted', // Using 'deleted' as closest match for sign-out
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
      console.error('Failed to log sign-out activity:', activityError)
      // Don't fail the sign-out if activity logging fails
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    })

    // Clear the auth cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
