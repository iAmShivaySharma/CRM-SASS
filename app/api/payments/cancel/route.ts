import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Workspace, WorkspaceMember, Subscription } from '@/lib/mongodb/client'
import { cancelSubscription } from '@/lib/razorpay/client'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
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

    const workspaceId = membership.workspaceId.toString()
    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    if (workspace.planId === 'free') {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      )
    }

    const subscription = await Subscription.findOne({ workspaceId })

    if (workspace.razorpaySubscriptionId) {
      try {
        await cancelSubscription(workspace.razorpaySubscriptionId)
      } catch (err) {
        log.warn('Razorpay cancel failed (may already be cancelled)', {
          error: err instanceof Error ? err.message : 'Unknown',
          subscriptionId: workspace.razorpaySubscriptionId,
        })
      }
    }

    if (subscription) {
      subscription.status = 'cancelled'
      subscription.cancelAtPeriodEnd = true
      subscription.cancelledAt = new Date()
      await subscription.save()
    }

    workspace.subscriptionStatus = 'cancelled'
    await workspace.save()

    log.info('Subscription cancelled', {
      workspaceId,
      userId: auth.user._id.toString(),
      planId: workspace.planId,
    })

    return NextResponse.json({
      message:
        'Subscription cancelled. Your plan will remain active until the end of the current billing period.',
      currentPeriodEnd: subscription?.currentPeriodEnd,
    })
  } catch (error) {
    log.error('Cancel subscription error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
