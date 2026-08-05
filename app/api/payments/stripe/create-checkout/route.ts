import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Plan, Workspace, WorkspaceMember } from '@/lib/mongodb/client'
import { getStripe } from '@/lib/stripe/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { planId, successUrl, cancelUrl } = await request.json()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

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

    const workspace = await Workspace.findById(membership.workspaceId)
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const plan = await Plan.findById(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (plan.price === 0) {
      return NextResponse.json(
        { error: 'Cannot create checkout for free plan' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (workspace.currency || 'usd').toLowerCase(),
            product_data: {
              name: `${plan.name} Plan`,
              description: plan.description || `${plan.name} subscription`,
            },
            unit_amount: Math.round(plan.price * 100),
            recurring: {
              interval: plan.interval === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: auth.user.email,
      metadata: {
        workspaceId: workspace._id.toString(),
        planId: planId,
        userId: auth.user._id.toString(),
      },
      success_url: successUrl || `${appUrl}/plans?success=true`,
      cancel_url: cancelUrl || `${appUrl}/plans?canceled=true`,
    })

    log.info('Stripe checkout session created', {
      sessionId: session.id,
      workspaceId: workspace._id,
      planId,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    log.error('Error creating Stripe checkout', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
