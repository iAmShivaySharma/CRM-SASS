import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Subscription, Workspace } from '@/lib/mongodb/client'
import { verifyWebhookSignature } from '@/lib/razorpay/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      log.warn('Razorpay webhook received without signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature)
    if (!isValid) {
      log.warn('Razorpay webhook signature verification failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    await connectToMongoDB()

    const event = JSON.parse(body)
    const eventType = event.event

    log.info('Razorpay webhook received', {
      eventType,
      payloadId: event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id,
    })

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(event)
        break

      case 'subscription.activated':
        await handleSubscriptionActivated(event)
        break

      case 'subscription.charged':
        await handleSubscriptionCharged(event)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event)
        break

      case 'subscription.paused':
        await handleSubscriptionPaused(event)
        break

      case 'subscription.resumed':
        await handleSubscriptionResumed(event)
        break

      case 'payment.failed':
        await handlePaymentFailed(event)
        break

      default:
        log.info('Unhandled Razorpay webhook event', { eventType })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error('Razorpay webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.captured - a payment has been successfully captured
 * This fires for one-time payments. Activate the subscription.
 */
async function handlePaymentCaptured(event: any) {
  const payment = event.payload.payment.entity
  const notes = payment.notes || {}
  const workspaceId = notes.workspaceId
  const planId = notes.planId

  if (!workspaceId || !planId) {
    log.warn('payment.captured webhook missing workspaceId or planId in notes', {
      paymentId: payment.id,
      notes,
    })
    return
  }

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  // Update or create subscription
  await (Subscription as any).findOneAndUpdate(
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
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id,
        lastPaymentAt: now.toISOString(),
        amountPaid: payment.amount,
        currency: payment.currency,
      },
    },
    { upsert: true, new: true }
  )

  // Update workspace
  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    planId,
    subscriptionStatus: 'active',
  })

  log.info('Subscription activated via payment.captured', {
    workspaceId,
    planId,
    paymentId: payment.id,
  })
}

/**
 * Handle subscription.activated - a Razorpay subscription has been activated
 */
async function handleSubscriptionActivated(event: any) {
  const subscription = event.payload.subscription.entity
  const notes = subscription.notes || {}
  const workspaceId = notes.workspaceId
  const planId = notes.planId

  if (!workspaceId) {
    log.warn('subscription.activated webhook missing workspaceId in notes', {
      subscriptionId: subscription.id,
    })
    return
  }

  const now = new Date()
  const periodEnd = subscription.current_end
    ? new Date(subscription.current_end * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      workspaceId,
      planId: planId || 'pro',
      status: 'active',
      currentPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      metadata: {
        razorpaySubscriptionId: subscription.id,
        lastPaymentAt: now.toISOString(),
      },
    },
    { upsert: true, new: true }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    planId: planId || 'pro',
    subscriptionStatus: 'active',
  })

  log.info('Subscription activated via webhook', {
    workspaceId,
    razorpaySubscriptionId: subscription.id,
  })
}

/**
 * Handle subscription.charged - a recurring charge was successful
 * Extend the subscription period
 */
async function handleSubscriptionCharged(event: any) {
  const subscription = event.payload.subscription.entity
  const payment = event.payload.payment?.entity
  const notes = subscription.notes || {}
  const workspaceId = notes.workspaceId

  if (!workspaceId) {
    log.warn('subscription.charged webhook missing workspaceId in notes', {
      subscriptionId: subscription.id,
    })
    return
  }

  const periodEnd = subscription.current_end
    ? new Date(subscription.current_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      status: 'active',
      currentPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : new Date(),
      currentPeriodEnd: periodEnd,
      metadata: {
        razorpaySubscriptionId: subscription.id,
        razorpayPaymentId: payment?.id,
        lastPaymentAt: new Date().toISOString(),
        chargeCount: subscription.paid_count,
      },
    }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'active',
  })

  log.info('Subscription charged and period extended', {
    workspaceId,
    razorpaySubscriptionId: subscription.id,
    periodEnd: periodEnd.toISOString(),
  })
}

/**
 * Handle subscription.cancelled
 */
async function handleSubscriptionCancelled(event: any) {
  const subscription = event.payload.subscription.entity
  const notes = subscription.notes || {}
  const workspaceId = notes.workspaceId

  if (!workspaceId) {
    log.warn('subscription.cancelled webhook missing workspaceId in notes', {
      subscriptionId: subscription.id,
    })
    return
  }

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelAtPeriodEnd: true,
    }
  )

  // Downgrade workspace to free plan
  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'cancelled',
  })

  log.info('Subscription cancelled via webhook', {
    workspaceId,
    razorpaySubscriptionId: subscription.id,
  })
}

/**
 * Handle subscription.paused
 */
async function handleSubscriptionPaused(event: any) {
  const subscription = event.payload.subscription.entity
  const notes = subscription.notes || {}
  const workspaceId = notes.workspaceId

  if (!workspaceId) return

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    { status: 'inactive' }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'inactive',
  })

  log.info('Subscription paused', {
    workspaceId,
    razorpaySubscriptionId: subscription.id,
  })
}

/**
 * Handle subscription.resumed
 */
async function handleSubscriptionResumed(event: any) {
  const subscription = event.payload.subscription.entity
  const notes = subscription.notes || {}
  const workspaceId = notes.workspaceId

  if (!workspaceId) return

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    { status: 'active' }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'active',
  })

  log.info('Subscription resumed', {
    workspaceId,
    razorpaySubscriptionId: subscription.id,
  })
}

/**
 * Handle payment.failed - mark subscription as past_due
 */
async function handlePaymentFailed(event: any) {
  const payment = event.payload.payment.entity
  const notes = payment.notes || {}
  const workspaceId = notes.workspaceId

  if (!workspaceId) {
    log.warn('payment.failed webhook missing workspaceId in notes', {
      paymentId: payment.id,
    })
    return
  }

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      status: 'past_due',
      metadata: {
        lastFailedPaymentId: payment.id,
        lastFailedAt: new Date().toISOString(),
        failureReason: payment.error_description || 'Payment failed',
      },
    }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'past_due',
  })

  log.warn('Payment failed, subscription marked as past_due', {
    workspaceId,
    paymentId: payment.id,
    errorCode: payment.error_code,
    errorDescription: payment.error_description,
  })
}
