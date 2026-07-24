import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Referral } from '@/lib/mongodb/models/Referral'

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    let referralCode = await Referral.findOne({
      referrerId: auth.user.id,
      referrerWorkspaceId: workspaceId,
      referredUserId: { $exists: false },
      status: 'pending',
    })

    if (!referralCode) {
      referralCode = await Referral.create({
        referrerId: auth.user.id,
        referrerWorkspaceId: workspaceId,
      })
    }

    const referrals = await Referral.find({
      referrerId: auth.user.id,
      referredUserId: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .lean()

    const stats = {
      totalReferred: referrals.length,
      signedUp: referrals.filter(r => r.status === 'signed_up').length,
      converted: referrals.filter(r => r.status === 'converted').length,
      rewarded: referrals.filter(r => r.status === 'rewarded').length,
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      success: true,
      referralCode: referralCode.referralCode,
      referralLink: `${appUrl}/register?ref=${referralCode.referralCode}`,
      referrals,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch referral data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const { referralCode } = await request.json()

    if (!referralCode) {
      return NextResponse.json(
        { message: 'referralCode is required' },
        { status: 400 }
      )
    }

    const referral = await Referral.findOne({
      referralCode,
      referredUserId: { $exists: false },
      status: 'pending',
    })

    if (!referral) {
      return NextResponse.json(
        { message: 'Invalid or used referral code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      valid: true,
      referrerId: referral.referrerId,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to validate referral' },
      { status: 500 }
    )
  }
}
