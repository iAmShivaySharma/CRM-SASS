import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Plan, Workspace, WorkspaceMember } from '@/lib/mongodb/client'
import { createCashfreeOrder } from '@/lib/cashfree/client'
import { log } from '@/lib/logging/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { planId } = await request.json()

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
        { error: 'Cannot create an order for the free plan' },
        { status: 400 }
      )
    }

    if (
      workspace.planId === planId &&
      workspace.subscriptionStatus === 'active'
    ) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      )
    }

    const currency = workspace.currency || 'INR'

    const orderData = await createCashfreeOrder({
      amount: plan.price,
      currency,
      orderId: `order_${workspace._id.toString().slice(-8)}_${Date.now()}`,
      customerDetails: {
        customerId: workspace._id.toString(),
        customerEmail: auth.user.email,
        customerPhone: (auth.user as any).phone || '9999999999',
        customerName: auth.user.fullName || 'Customer',
      },
      returnUrl: `${APP_URL}/plans?order_id={order_id}`,
      notifyUrl: `${APP_URL}/api/webhooks/cashfree`,
      orderNote: `${planId}|${workspace._id.toString()}`,
    })

    log.info('Cashfree order created', {
      orderId: orderData.orderId,
      workspaceId: workspace._id,
      planId,
      amount: plan.price,
    })

    return NextResponse.json({
      orderId: orderData.orderId,
      paymentSessionId: orderData.paymentSessionId,
      orderStatus: orderData.orderStatus,
      planName: plan.name,
      workspaceName: workspace.name,
    })
  } catch (error: any) {
    log.error('Error creating Cashfree order', {
      error: error?.message || JSON.stringify(error),
    })
    return NextResponse.json(
      {
        error: error?.message || 'Failed to create payment order',
      },
      { status: 500 }
    )
  }
}
