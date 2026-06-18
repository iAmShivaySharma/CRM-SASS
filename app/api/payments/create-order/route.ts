import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Plan, Workspace, WorkspaceMember } from '@/lib/mongodb/client'
import { createOrder } from '@/lib/razorpay/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { planId } = await request.json()

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      )
    }

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

    const workspace = await Workspace.findById(membership.workspaceId)
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Look up the plan from DB
    const plan = await Plan.findById(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (plan.price === 0) {
      return NextResponse.json(
        { error: 'Cannot create an order for the free plan' },
        { status: 400 }
      )
    }

    // Check if already on this plan
    if (workspace.planId === planId && workspace.subscriptionStatus === 'active') {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      )
    }

    // Amount in paise (smallest currency unit)
    const amountInPaise = Math.round(plan.price * 100)

    const order = await createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_${workspace._id}_${planId}_${Date.now()}`,
      notes: {
        workspaceId: workspace._id.toString(),
        planId: planId,
        userId: auth.user._id.toString(),
        workspaceName: workspace.name,
      },
    })

    log.info('Razorpay order created', {
      orderId: order.id,
      workspaceId: workspace._id,
      planId,
      amount: amountInPaise,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      planName: plan.name,
      workspaceName: workspace.name,
    })
  } catch (error) {
    log.error('Error creating Razorpay order', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    )
  }
}
