export const dynamic = 'force-dynamic'
import crypto from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/mongodb/auth'
import { User } from '@/lib/mongodb/models'
import { emailService } from '@/lib/services/emailService'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, workspaceName } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        {
          message: 'Email, password, and name are required',
        },
        { status: 400 }
      )
    }

    const result = await signUp({
      email,
      password,
      fullName: name,
      workspaceName,
    })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 400 })
    }

    const otp = crypto.randomInt(100000, 999999).toString()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    await User.findByIdAndUpdate(result.user?._id, {
      emailConfirmed: false,
      emailVerificationOtp: otp,
      emailVerificationExpires: otpExpires,
    })

    await emailService
      .sendEmail({
        to: email,
        subject: 'Verify Your Email — CRM Pro',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Verify Your Email</h2>
          <p>Hi ${name},</p>
          <p>Your verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f3f4f6; padding: 16px 32px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
        text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
      })
      .catch(() => {})

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: 'Verification code sent to your email',
      user: {
        id: result.user?._id,
        email: result.user?.email,
        fullName: result.user?.fullName,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
