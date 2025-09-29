import { NextRequest, NextResponse } from 'next/server'
import { dodoPayments, DodoWebhookEvent } from '@/lib/dodo/client'
import { Workspace, Subscription } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('dodo-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const isValid = dodoPayments.verifyWebhookSignature(body, signature)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event: DodoWebhookEvent = JSON.parse(body)

    // Handle different webhook events
    switch (event.type) {
      case 'customer.created':
        await handleCustomerCreated(event)
        break

      case 'subscription.created':
        await handleSubscriptionCreated(event)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(event)
        break

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCustomerCreated(event: DodoWebhookEvent) {
  const customer = event.data.object

  // Update workspace with Dodo customer ID
  if (customer.metadata?.workspace_id) {
    await (Workspace as any).findByIdAndUpdate(customer.metadata.workspace_id, {
      dodoCustomerId: customer.id,
    })
  }
}

async function handleSubscriptionCreated(event: DodoWebhookEvent) {
  const subscription = event.data.object

  // Create or update subscription record
  await (Subscription as any).findOneAndUpdate(
    { workspaceId: subscription.metadata.workspace_id },
    {
      workspaceId: subscription.metadata.workspace_id,
      dodoSubscriptionId: subscription.id,
      dodoCustomerId: subscription.customer_id,
      planId: subscription.metadata.plan_id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
    },
    { upsert: true, new: true }
  )
}

async function handleSubscriptionUpdated(event: DodoWebhookEvent) {
  const subscription = event.data.object

  // Update subscription record
  await (Subscription as any).findOneAndUpdate(
    { dodoSubscriptionId: subscription.id },
    {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
    }
  )
}

async function handleSubscriptionCanceled(event: DodoWebhookEvent) {
  const subscription = event.data.object

  // Update subscription status
  await (Subscription as any).findOneAndUpdate(
    { dodoSubscriptionId: subscription.id },
    {
      status: 'cancelled',
      cancelledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date(),
    }
  )
}

async function handlePaymentSucceeded(event: DodoWebhookEvent) {
  const invoice = event.data.object

  // Log successful payment and update subscription if needed
  if (invoice.subscription_id) {
    await (Subscription as any).findOneAndUpdate(
      { dodoSubscriptionId: invoice.subscription_id },
      { status: 'active' }
    )
  }
}

async function handlePaymentFailed(event: DodoWebhookEvent) {
  const invoice = event.data.object

  // Update subscription status for failed payment
  if (invoice.subscription_id) {
    await (Subscription as any).findOneAndUpdate(
      { dodoSubscriptionId: invoice.subscription_id },
      { status: 'past_due' }
    )
  }
}
