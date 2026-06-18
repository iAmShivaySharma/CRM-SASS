import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Workspace, Subscription, WorkspaceMember } from '@/lib/mongodb/client'
import { verifyPaymentSignature } from '@/lib/razorpay/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = await request.json()

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      return NextResponse.json(
        { error: 'Missing required payment verification fields' },
        { status: 400 }
      )
    }

    // Verify the payment signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isValid) {
      log.warn('Invalid Razorpay payment signature', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        userId: auth.user._id,
      })
      return NextResponse.json(
        { error: 'Payment verification failed - invalid signature' },
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

    const workspaceId = membership.workspaceId

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1) // 1 month subscription period

    // Update or create the subscription record
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
        metadata: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          lastPaymentAt: now.toISOString(),
        },
      },
      { upsert: true, new: true }
    )

    // Update the workspace plan and subscription status
    await (Workspace as any).findByIdAndUpdate(workspaceId, {
      planId,
      subscriptionStatus: 'active',
    })

    log.info('Payment verified and subscription activated', {
      workspaceId,
      planId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
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
    log.error('Error verifying Razorpay payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}
