import { type NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { User } from '@/lib/mongodb/models'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { message: 'Verification code is required to disable 2FA' },
        { status: 400 }
      )
    }

    const user = await User.findById(auth.user.id)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { message: '2FA is not enabled' },
        { status: 400 }
      )
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token),
      window: 1,
    })

    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      )
    }

    user.twoFactorSecret = undefined
    user.twoFactorEnabled = false
    await user.save()

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
