export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { authenticator } from 'otplib'
import { signIn } from '@/lib/mongodb/auth'
import { WorkspaceMember } from '@/lib/mongodb/models/WorkspaceMember'
import { User } from '@/lib/mongodb/models/User'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function POST(request: NextRequest) {
  try {
    const { email, password, twoFactorToken } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await signIn({ email, password })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 401 })
    }

    await connectToMongoDB()

    const user = await User.findById(result.user?._id)

    if (user?.twoFactorEnabled && user?.twoFactorSecret) {
      if (!twoFactorToken) {
        return NextResponse.json(
          {
            requiresTwoFactor: true,
            message: 'Two-factor authentication code required',
          },
          { status: 200 }
        )
      }

      const isValid = authenticator.verify({
        token: String(twoFactorToken),
        secret: user.twoFactorSecret,
      })

      if (!isValid) {
        return NextResponse.json(
          { message: 'Invalid two-factor code' },
          { status: 401 }
        )
      }
    }

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

    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
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
