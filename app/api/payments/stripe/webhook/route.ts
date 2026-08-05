import { type NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Workspace, Subscription } from '@/lib/mongodb/client'
import { getStripe } from '@/lib/stripe/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const stripe = getStripe()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      log.error('Stripe webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown',
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    await connectToMongoDB()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const { workspaceId, planId, userId } = session.metadata || {}

        if (workspaceId && planId) {
          await Subscription.findOneAndUpdate(
            { workspaceId },
            {
              workspaceId,
              planId,
              status: 'active',
              provider: 'stripe',
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              metadata: { userId, sessionId: session.id },
            },
            { upsert: true, new: true }
          )

          await Workspace.findByIdAndUpdate(workspaceId, {
            planId,
            subscriptionStatus: 'active',
          })

          log.info('Stripe subscription activated', {
            workspaceId,
            planId,
            subscriptionId: session.subscription,
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const existingSub = await Subscription.findOne({
          stripeSubscriptionId: subscription.id,
        })

        if (existingSub) {
          existingSub.status =
            subscription.status === 'active' ? 'active' : 'past_due'
          existingSub.currentPeriodStart = new Date(
            subscription.current_period_start * 1000
          )
          existingSub.currentPeriodEnd = new Date(
            subscription.current_period_end * 1000
          )
          existingSub.cancelAtPeriodEnd = subscription.cancel_at_period_end
          await existingSub.save()
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const existingSub = await Subscription.findOne({
          stripeSubscriptionId: subscription.id,
        })

        if (existingSub) {
          existingSub.status = 'cancelled'
          existingSub.cancelledAt = new Date()
          await existingSub.save()

          await Workspace.findByIdAndUpdate(existingSub.workspaceId, {
            subscriptionStatus: 'cancelled',
          })

          log.info('Stripe subscription cancelled', {
            workspaceId: existingSub.workspaceId,
            subscriptionId: subscription.id,
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const existingSub = await Subscription.findOne({
          stripeSubscriptionId: invoice.subscription,
        })

        if (existingSub) {
          existingSub.status = 'past_due'
          await existingSub.save()

          await Workspace.findByIdAndUpdate(existingSub.workspaceId, {
            subscriptionStatus: 'past_due',
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
