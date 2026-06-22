import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  WorkspaceMember,
  Workspace,
  Subscription,
  Plan,
} from '@/lib/mongodb/client'
import { LicenseKey } from '@/lib/mongodb/models/LicenseKey'
import { log } from '@/lib/logging/logger'

const redeemSchema = z.object({
  key: z.string().min(1, 'License key is required').trim(),
})

// POST /api/licenses/redeem - Redeem a license key
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = redeemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: 'Validation error',
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { key } = parsed.data

    // Find the license key
    const license = await LicenseKey.findOne({ key: key.toUpperCase() })
    if (!license) {
      return NextResponse.json(
        { message: 'Invalid license key' },
        { status: 404 }
      )
    }

    // Validate status
    if (license.status !== 'active') {
      const statusMessages: Record<string, string> = {
        used: 'This license key has already been redeemed',
        expired: 'This license key has expired',
        revoked: 'This license key has been revoked',
      }
      return NextResponse.json(
        {
          message:
            statusMessages[license.status] || 'License key is not available',
        },
        { status: 400 }
      )
    }

    // Check expiration
    if (license.validUntil && new Date(license.validUntil) < new Date()) {
      license.status = 'expired'
      await license.save()
      return NextResponse.json(
        { message: 'This license key has expired' },
        { status: 400 }
      )
    }

    // Verify the plan exists
    const plan = await Plan.findById(license.planId)
    if (!plan) {
      return NextResponse.json(
        {
          message: 'The plan associated with this license key no longer exists',
        },
        { status: 400 }
      )
    }

    // Get user's current workspace
    const workspaceId =
      request.headers.get('x-workspace-id') || auth.user.lastActiveWorkspaceId
    if (!workspaceId) {
      return NextResponse.json(
        {
          message:
            'No active workspace found. Please select a workspace first.',
        },
        { status: 400 }
      )
    }

    // Verify user belongs to this workspace
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: auth.user.id,
      status: 'active',
    }).populate('roleId')

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this workspace' },
        { status: 403 }
      )
    }

    // Only workspace owner/admin can redeem licenses
    const role = membership.roleId as any
    if (!role || !['owner', 'admin'].includes(role.name?.toLowerCase())) {
      return NextResponse.json(
        { message: 'Only workspace owners and admins can redeem license keys' },
        { status: 403 }
      )
    }

    // Activate the license key
    await license.activate(auth.user.id, workspaceId)

    // Determine subscription end date
    // If validUntil is set on the license, use that; otherwise use a far-future date for lifetime
    const currentPeriodEnd = license.validUntil
      ? new Date(license.validUntil)
      : new Date('2099-12-31T23:59:59.999Z')

    // Create or update subscription
    const subscriptionData = {
      workspaceId,
      planId: license.planId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      metadata: {
        licenseKey: license.key,
        activationType: 'license',
        activatedAt: new Date(),
      },
    }

    const existingSubscription = await Subscription.findOne({ workspaceId })
    if (existingSubscription) {
      await Subscription.findByIdAndUpdate(
        existingSubscription._id,
        subscriptionData
      )
    } else {
      const subscription = new Subscription(subscriptionData)
      await subscription.save()
    }

    // Update workspace plan
    await Workspace.findByIdAndUpdate(workspaceId, {
      planId: license.planId,
      subscriptionStatus: 'active',
    })

    log.info(
      `License key ${license.key} redeemed by user ${auth.user.id} for workspace ${workspaceId} (plan: ${license.planId})`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan.name} plan`,
      plan: {
        id: plan._id,
        name: plan.name,
        features: plan.features,
      },
      subscription: {
        status: 'active',
        currentPeriodEnd,
        isLifetime: !license.validUntil,
      },
    })
  } catch (error: any) {
    // Handle activation errors from the model method
    if (error.message?.includes('License key')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    log.error('Redeem license key error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
