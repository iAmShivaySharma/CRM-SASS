import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  Subscription,
  Plan,
  Workspace,
  WorkspaceMember,
} from '@/lib/mongodb/client'
import { createCashfreeSubscription } from '@/lib/cashfree/client'
import { log } from '@/lib/logging/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
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

    const workspaceId = membership.workspaceId

    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const subscription = await Subscription.findOne({ workspaceId })

    const plan = await Plan.findById(workspace.planId)

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

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { planId, cashfreePlanId } = await request.json()

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
        { error: 'Cannot create a subscription for the free plan' },
        { status: 400 }
      )
    }

    if (!cashfreePlanId) {
      return NextResponse.json(
        { error: 'cashfreePlanId is required for subscription creation' },
        { status: 400 }
      )
    }

    const cashfreeSubscription = await createCashfreeSubscription({
      subscriptionId: `sub_${workspace._id.toString().slice(-8)}_${Date.now()}`,
      planId: cashfreePlanId,
      customerEmail: auth.user.email,
      customerPhone: (auth.user as any).phone || '9999999999',
      customerName: auth.user.fullName || 'Customer',
      returnUrl: `${APP_URL}/plans?subscription_id={subscription_id}`,
      notifyUrl: `${APP_URL}/api/webhooks/cashfree`,
    })

    log.info('Cashfree subscription created', {
      cashfreeSubscriptionId: cashfreeSubscription.subscriptionId,
      workspaceId: workspace._id,
      planId,
    })

    return NextResponse.json({
      subscriptionId: cashfreeSubscription.subscriptionId,
      authorizationLink: cashfreeSubscription.authorizationLink,
      status: cashfreeSubscription.status,
      planId,
    })
  } catch (error) {
    log.error('Error creating Cashfree subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
