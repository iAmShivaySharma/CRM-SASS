import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkspaceMember, Workspace, Subscription } from '@/lib/mongodb/client'
import { LicenseKey } from '@/lib/mongodb/models/LicenseKey'
import { log } from '@/lib/logging/logger'

const updateLicenseSchema = z.object({
  validUntil: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
  createdFor: z.string().max(255).optional(),
})

async function verifyAdmin(request: NextRequest) {
  const auth = await verifyAuthToken(request)
  if (!auth) return null

  const workspaceId =
    request.headers.get('x-workspace-id') || auth.user.lastActiveWorkspaceId
  if (!workspaceId) return null

  const membership = await WorkspaceMember.findOne({
    workspaceId,
    userId: auth.user.id,
    status: 'active',
  }).populate('roleId')

  if (!membership) return null

  const role = membership.roleId as any
  if (!role || !['owner', 'admin'].includes(role.name?.toLowerCase())) {
    return null
  }

  return auth
}

// GET /api/admin/licenses/[id] - Get single license details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    const license = await LicenseKey.findById(id)
      .populate('generatedBy', 'fullName email')
      .populate('activatedBy.userId', 'fullName email')
      .populate('activatedBy.workspaceId', 'name slug')
      .populate('revokedBy', 'fullName email')

    if (!license) {
      return NextResponse.json(
        { message: 'License key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      license,
    })
  } catch (error) {
    log.error('Get license key error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/licenses/[id] - Update license key metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateLicenseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: 'Validation error',
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const license = await LicenseKey.findById(id)
    if (!license) {
      return NextResponse.json(
        { message: 'License key not found' },
        { status: 404 }
      )
    }

    const { validUntil, note, createdFor } = parsed.data

    if (validUntil !== undefined) {
      license.validUntil = validUntil ? new Date(validUntil) : null
    }
    if (note !== undefined) {
      license.metadata.note = note
    }
    if (createdFor !== undefined) {
      license.metadata.createdFor = createdFor
    }

    await license.save()

    log.info(`License key ${license.key} updated by user ${auth.user.id}`)

    return NextResponse.json({
      success: true,
      license,
    })
  } catch (error) {
    log.error('Update license key error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/licenses/[id] - Revoke a license key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    const license = await LicenseKey.findById(id)
    if (!license) {
      return NextResponse.json(
        { message: 'License key not found' },
        { status: 404 }
      )
    }

    if (license.status === 'revoked') {
      return NextResponse.json(
        { message: 'License key is already revoked' },
        { status: 400 }
      )
    }

    const wasUsed = license.status === 'used'

    // Revoke the license key
    await license.revoke(auth.user.id)

    // If the key was already redeemed, downgrade the workspace
    if (wasUsed && license.activatedBy?.workspaceId) {
      const targetWorkspaceId = license.activatedBy.workspaceId

      // Downgrade subscription
      await Subscription.findOneAndUpdate(
        { workspaceId: targetWorkspaceId },
        {
          planId: 'free',
          status: 'cancelled',
          cancelledAt: new Date(),
          metadata: {
            licenseRevoked: true,
            revokedLicenseKey: license.key,
            revokedAt: new Date(),
          },
        }
      )

      // Downgrade workspace
      await Workspace.findByIdAndUpdate(targetWorkspaceId, {
        planId: 'free',
        subscriptionStatus: 'inactive',
      })

      log.info(
        `Workspace ${targetWorkspaceId} downgraded to free plan due to license revocation (key: ${license.key})`
      )
    }

    log.info(`License key ${license.key} revoked by user ${auth.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'License key revoked successfully',
      workspaceDowngraded: wasUsed,
    })
  } catch (error) {
    log.error('Revoke license key error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
