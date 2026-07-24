import { type NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
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

    const user = await User.findById(auth.user.id)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { message: '2FA is already enabled' },
        { status: 400 }
      )
    }

    const generated = speakeasy.generateSecret({
      name: `CRM Pro (${user.email})`,
      issuer: 'CRM Pro',
    })

    user.twoFactorSecret = generated.base32
    await user.save()

    const qrCodeDataUrl = await QRCode.toDataURL(generated.otpauth_url || '')

    return NextResponse.json({
      success: true,
      secret: generated.base32,
      qrCode: qrCodeDataUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}
