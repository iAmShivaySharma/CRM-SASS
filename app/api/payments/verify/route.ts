import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Workspace, Subscription, WorkspaceMember } from '@/lib/mongodb/client'
import { verifyCashfreePayment } from '@/lib/cashfree/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { orderId, planId } = await request.json()

    if (!orderId || !planId) {
      return NextResponse.json(
        { error: 'Missing required payment verification fields' },
        { status: 400 }
      )
    }

    const paymentResult = await verifyCashfreePayment(orderId)

    if (!paymentResult.success) {
      log.warn('Payment verification failed for Cashfree order', {
        orderId,
        error: paymentResult.error,
      })
      return NextResponse.json(
        { error: 'Payment verification failed - no successful payment' },
        { status: 400 }
      )
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

    const workspaceId = membership.workspaceId

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription = await (Subscription as any).findOneAndUpdate(
      { workspaceId },
      {
        workspaceId,
        planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cashfreeOrderId: orderId,
        cashfreePaymentId: paymentResult.paymentId,
        metadata: {
          cashfreeOrderId: orderId,
          cashfreePaymentId: paymentResult.paymentId,
          lastPaymentAt: now.toISOString(),
          amountPaid: paymentResult.amount,
          paymentMethod: paymentResult.paymentMethod,
        },
      },
      { upsert: true, new: true }
    )

    await (Workspace as any).findByIdAndUpdate(workspaceId, {
      planId,
      subscriptionStatus: 'active',
    })

    log.info('Payment verified and subscription activated', {
      workspaceId,
      planId,
      orderId,
      paymentId: paymentResult.paymentId,
      subscriptionId: subscription._id,
    })

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        id: subscription._id,
        planId: subscription.planId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    })
  } catch (error) {
    log.error('Error verifying Cashfree payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}
