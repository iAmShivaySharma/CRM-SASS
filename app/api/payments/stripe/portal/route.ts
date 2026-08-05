import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Subscription, WorkspaceMember } from '@/lib/mongodb/client'
import { getStripe } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const membership = await WorkspaceMember.findOne({
      userId: auth.user._id,
      status: 'active',
    }).sort({ createdAt: 1 })

    if (!membership) {
      return NextResponse.json(
        { error: 'No active workspace found' },
        { status: 404 }
      )
    }

    const subscription = await Subscription.findOne({
      workspaceId: membership.workspaceId,
      provider: 'stripe',
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe subscription found' },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/plans`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
