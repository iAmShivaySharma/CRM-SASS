export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/mongodb/auth'
import { WorkspaceMember } from '@/lib/mongodb/models/WorkspaceMember'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sign in user using MongoDB
    const result = await signIn({ email, password })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 401 })
    }

    await connectToMongoDB()
    let userRole: any = null
    let userPermissions: string[] = []

    if (result.user && result.workspace) {
      const membership = await WorkspaceMember.findOne({
        workspaceId: result.workspace._id,
        userId: result.user._id,
        status: 'active',
      }).populate('roleId')

      userRole = membership?.roleId as any
      userPermissions = userRole?.permissions || []
    }

    const response = NextResponse.json({
      user: {
        ...result.user?.toJSON(),
        role: userRole?.name || 'user',
        roleId: userRole?._id?.toString() || '',
        permissions: userPermissions,
      },
      workspace: result.workspace,
      success: true,
    })

    // Set secure HTTP-only cookie with JWT token
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
