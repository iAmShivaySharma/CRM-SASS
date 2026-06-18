import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  Subscription,
  Plan,
  Workspace,
  WorkspaceMember,
} from '@/lib/mongodb/client'
import { createSubscription as createRazorpaySubscription } from '@/lib/razorpay/client'
import { log } from '@/lib/logging/logger'

// GET /api/payments/subscription - Get current subscription for workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    // Get user's active workspace
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

    const workspaceId = membership.workspaceId

    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Get the subscription
    const subscription = await Subscription.findOne({ workspaceId })

    // Get the current plan details
    const plan = await Plan.findById(workspace.planId)

    // Get all available plans
    const allPlans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 })

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription._id,
            planId: subscription.planId,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            cancelledAt: subscription.cancelledAt,
            metadata: subscription.metadata,
          }
        : null,
      currentPlan: plan
        ? {
            id: plan._id,
            name: plan.name,
            price: plan.price,
            interval: plan.interval,
            features: plan.features,
            limits: plan.limits,
          }
        : null,
      workspace: {
        id: workspace._id,
        name: workspace.name,
        planId: workspace.planId,
        subscriptionStatus: workspace.subscriptionStatus,
      },
      availablePlans: allPlans.map((p: any) => ({
        id: p._id,
        name: p.name,
        description: p.description,
        price: p.price,
        interval: p.interval,
        features: p.features,
        limits: p.limits,
      })),
    })
  } catch (error) {
    log.error('Error fetching subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

// POST /api/payments/subscription - Create a Razorpay subscription
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { planId, razorpayPlanId } = await request.json()

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      )
    }

    // Get user's workspace
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

    // Look up our internal plan
    const plan = await Plan.findById(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (plan.price === 0) {
      return NextResponse.json(
        { error: 'Cannot create a subscription for the free plan' },
        { status: 400 }
      )
    }

    // If a Razorpay plan ID is provided, use it; otherwise the caller must
    // have set up plans in the Razorpay dashboard and pass the ID
    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: 'razorpayPlanId is required for subscription creation' },
        { status: 400 }
      )
    }

    // Create subscription on Razorpay
    const razorpaySubscription = await createRazorpaySubscription({
      planId: razorpayPlanId,
      totalCount: 12,
      quantity: 1,
      customerNotify: true,
      notes: {
        workspaceId: workspace._id.toString(),
        planId: planId,
        userId: auth.user._id.toString(),
      },
    })

    log.info('Razorpay subscription created', {
      razorpaySubscriptionId: razorpaySubscription.id,
      workspaceId: workspace._id,
      planId,
    })

    return NextResponse.json({
      subscriptionId: razorpaySubscription.id,
      shortUrl: razorpaySubscription.short_url,
      status: razorpaySubscription.status,
      planId,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error) {
    log.error('Error creating Razorpay subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
