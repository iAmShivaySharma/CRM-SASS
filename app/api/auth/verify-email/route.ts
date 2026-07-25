import { type NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { User, Workspace, WorkspaceMember, Role } from '@/lib/mongodb/models'
import { generateToken } from '@/lib/mongodb/auth'
import { seedWorkspaceDefaults } from '@/lib/mongodb/seedDefaults'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { message: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.emailConfirmed) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 400 }
      )
    }

    if (
      !user.emailVerificationOtp ||
      user.emailVerificationOtp !== otp ||
      !user.emailVerificationExpires ||
      new Date() > user.emailVerificationExpires
    ) {
      return NextResponse.json(
        { message: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    user.emailConfirmed = true
    user.emailConfirmedAt = new Date()
    user.emailVerificationOtp = undefined
    user.emailVerificationExpires = undefined
    user.lastSignInAt = new Date()
    await user.save()

    const membership = await WorkspaceMember.findOne({
      userId: user._id,
      status: 'active',
    })
      .populate('workspaceId')
      .populate('roleId')

    const workspace = membership?.workspaceId as any
    const userRole = membership?.roleId as any

    const token = generateToken(user._id)

    const response = NextResponse.json({
      success: true,
      user: {
        ...user.toJSON(),
        role: userRole?.name || 'Owner',
        roleId: userRole?._id?.toString() || '',
        permissions: userRole?.permissions || ['*:*'],
      },
      workspace,
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
