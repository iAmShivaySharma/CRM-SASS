import { type NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Subscription, Workspace } from '@/lib/mongodb/client'
import { verifyWebhookSignature } from '@/lib/cashfree/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-webhook-signature')
    const timestamp = request.headers.get('x-webhook-timestamp')

    if (!signature || !timestamp) {
      log.warn('Cashfree webhook received without signature or timestamp')
      return NextResponse.json(
        { error: 'Missing signature or timestamp' },
        { status: 400 }
      )
    }

    const isValid = verifyWebhookSignature(body, signature, timestamp)
    if (!isValid) {
      log.warn('Cashfree webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    await connectToMongoDB()

    const event = JSON.parse(body)
    const eventType = event.type
    const eventData = event.data

    const eventId = `${eventType}_${eventData?.order?.order_id || eventData?.subscription?.subscription_id || ''}_${timestamp}`

    const existing = await Subscription.findOne({
      [`metadata.lastEventId`]: eventId,
    })
    if (existing) {
      log.info('Cashfree webhook duplicate, skipping', { eventId })
      return NextResponse.json({ received: true, duplicate: true })
    }

    log.info('Cashfree webhook received', {
      eventType,
      eventId,
    })

    switch (eventType) {
      case 'PAYMENT_SUCCESS':
        await handlePaymentSuccess(eventData, eventId)
        break

      case 'PAYMENT_FAILED':
        await handlePaymentFailed(eventData, eventId)
        break

      case 'SUBSCRIPTION_ACTIVATED':
        await handleSubscriptionActivated(eventData, eventId)
        break

      case 'SUBSCRIPTION_CHARGED':
        await handleSubscriptionCharged(eventData, eventId)
        break

      case 'SUBSCRIPTION_CANCELLED':
        await handleSubscriptionCancelled(eventData, eventId)
        break

      default:
        log.info('Unhandled Cashfree webhook event', { eventType })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error('Cashfree webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(data: any, eventId: string) {
  const order = data.order
  const payment = data.payment

  if (!order?.order_note) {
    log.warn('PAYMENT_SUCCESS webhook missing order_note', {
      orderId: order?.order_id,
    })
    return
  }

  const [planId, workspaceId] = order.order_note.split('|')

  if (!workspaceId || !planId) {
    log.warn(
      'PAYMENT_SUCCESS webhook missing workspaceId or planId in order_note',
      {
        orderId: order?.order_id,
        orderNote: order?.order_note,
      }
    )
    return
  }

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

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
      cashfreeOrderId: order.order_id,
      cashfreePaymentId: payment?.cf_payment_id,
      metadata: {
        cashfreePaymentId: payment?.cf_payment_id,
        cashfreeOrderId: order.order_id,
        lastPaymentAt: now.toISOString(),
        amountPaid: payment?.payment_amount,
        currency: payment?.payment_currency,
        lastEventId: eventId,
      },
    },
    { upsert: true, new: true }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    planId,
    subscriptionStatus: 'active',
  })

  log.info('Subscription activated via PAYMENT_SUCCESS', {
    workspaceId,
    planId,
    orderId: order.order_id,
  })
}

async function handlePaymentFailed(data: any, eventId: string) {
  const order = data.order
  const payment = data.payment

  if (!order?.order_note) {
    log.warn('PAYMENT_FAILED webhook missing order_note', {
      orderId: order?.order_id,
    })
    return
  }

  const [, workspaceId] = order.order_note.split('|')

  if (!workspaceId) {
    log.warn('PAYMENT_FAILED webhook missing workspaceId in order_note', {
      orderId: order?.order_id,
    })
    return
  }

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      status: 'past_due',
      metadata: {
        lastFailedPaymentId: payment?.cf_payment_id,
        lastFailedAt: new Date().toISOString(),
        failureReason: payment?.payment_message || 'Payment failed',
        lastEventId: eventId,
      },
    }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'past_due',
  })

  log.warn('Payment failed, subscription marked as past_due', {
    workspaceId,
    orderId: order.order_id,
    paymentId: payment?.cf_payment_id,
  })
}

async function handleSubscriptionActivated(data: any, eventId: string) {
  const subscription = data.subscription
  const workspaceId = subscription?.customer_details?.customer_id

  if (!workspaceId) {
    log.warn('SUBSCRIPTION_ACTIVATED webhook missing workspaceId', {
      subscriptionId: subscription?.subscription_id,
    })
    return
  }

  const now = new Date()
  const periodEnd = subscription?.current_end
    ? new Date(subscription.current_end)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      workspaceId,
      status: 'active',
      currentPeriodStart: subscription?.current_start
        ? new Date(subscription.current_start)
        : now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      cashfreeSubscriptionId: subscription?.subscription_id,
      metadata: {
        cashfreeSubscriptionId: subscription?.subscription_id,
        lastPaymentAt: now.toISOString(),
        lastEventId: eventId,
      },
    },
    { upsert: true, new: true }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'active',
  })

  log.info('Subscription activated via webhook', {
    workspaceId,
    cashfreeSubscriptionId: subscription?.subscription_id,
  })
}

async function handleSubscriptionCharged(data: any, eventId: string) {
  const subscription = data.subscription
  const payment = data.payment
  const workspaceId = subscription?.customer_details?.customer_id

  if (!workspaceId) {
    log.warn('SUBSCRIPTION_CHARGED webhook missing workspaceId', {
      subscriptionId: subscription?.subscription_id,
    })
    return
  }

  const periodEnd = subscription?.current_end
    ? new Date(subscription.current_end)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      status: 'active',
      currentPeriodStart: subscription?.current_start
        ? new Date(subscription.current_start)
        : new Date(),
      currentPeriodEnd: periodEnd,
      metadata: {
        cashfreeSubscriptionId: subscription?.subscription_id,
        cashfreePaymentId: payment?.cf_payment_id,
        lastPaymentAt: new Date().toISOString(),
        lastEventId: eventId,
      },
    }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'active',
  })

  log.info('Subscription charged and period extended', {
    workspaceId,
    cashfreeSubscriptionId: subscription?.subscription_id,
    periodEnd: periodEnd.toISOString(),
  })
}

async function handleSubscriptionCancelled(data: any, eventId: string) {
  const subscription = data.subscription
  const workspaceId = subscription?.customer_details?.customer_id

  if (!workspaceId) {
    log.warn('SUBSCRIPTION_CANCELLED webhook missing workspaceId', {
      subscriptionId: subscription?.subscription_id,
    })
    return
  }

  await (Subscription as any).findOneAndUpdate(
    { workspaceId },
    {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelAtPeriodEnd: true,
      'metadata.lastEventId': eventId,
    }
  )

  await (Workspace as any).findByIdAndUpdate(workspaceId, {
    subscriptionStatus: 'cancelled',
  })

  log.info('Subscription cancelled via webhook', {
    workspaceId,
    cashfreeSubscriptionId: subscription?.subscription_id,
  })
}
