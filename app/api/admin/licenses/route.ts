import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkspaceMember, Plan } from '@/lib/mongodb/client'
import { LicenseKey } from '@/lib/mongodb/models/LicenseKey'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const generateKeysSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  count: z.number().int().min(1).max(100).default(1),
  validUntil: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
  createdFor: z.string().max(255).optional(),
})

// GET /api/admin/licenses - List all license keys with pagination and filters
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin access via workspace membership
    const workspaceId = request.headers.get('x-workspace-id') || auth.user.lastActiveWorkspaceId
    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace context required' },
        { status: 400 }
      )
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: auth.user.id,
      status: 'active',
    }).populate('roleId')

    if (!membership) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const role = membership.roleId as any
    if (!role || !['owner', 'admin'].includes(role.name?.toLowerCase())) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const status = searchParams.get('status')
    const planId = searchParams.get('planId')

    // Build filter
    const filter: Record<string, any> = {}
    if (status) filter.status = status
    if (planId) filter.planId = planId

    const skip = (page - 1) * limit

    const [licenses, total] = await Promise.all([
      LicenseKey.find(filter)
        .populate('generatedBy', 'fullName email')
        .populate('activatedBy.userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LicenseKey.countDocuments(filter),
    ])

    return NextResponse.json({
      success: true,
      licenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    log.error('List license keys error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/licenses - Generate new license keys
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

    // Check admin access via workspace membership
    const workspaceId = request.headers.get('x-workspace-id') || auth.user.lastActiveWorkspaceId
    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace context required' },
        { status: 400 }
      )
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: auth.user.id,
      status: 'active',
    }).populate('roleId')

    if (!membership) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const role = membership.roleId as any
    if (!role || !['owner', 'admin'].includes(role.name?.toLowerCase())) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = generateKeysSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation error', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { planId, count, validUntil, note, createdFor } = parsed.data

    // Verify plan exists
    const plan = await Plan.findById(planId)
    if (!plan) {
      return NextResponse.json(
        { message: 'Plan not found' },
        { status: 404 }
      )
    }

    // Generate unique keys with batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const generatedLicenses = []

    for (let i = 0; i < count; i++) {
      let key: string
      let attempts = 0
      const maxAttempts = 10

      // Ensure uniqueness
      do {
        key = (LicenseKey as any).generateKey()
        const existing = await LicenseKey.findOne({ key })
        if (!existing) break
        attempts++
      } while (attempts < maxAttempts)

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { message: 'Failed to generate unique key. Please try again.' },
          { status: 500 }
        )
      }

      const license = new LicenseKey({
        key: key!,
        planId,
        generatedBy: auth.user.id,
        validUntil: validUntil ? new Date(validUntil) : null,
        metadata: {
          note,
          createdFor,
          batchId: count > 1 ? batchId : undefined,
        },
      })

      await license.save()
      generatedLicenses.push(license)
    }

    log.info(`Generated ${count} license key(s) for plan ${planId} by user ${auth.user.id}`)

    return NextResponse.json({
      success: true,
      message: `${count} license key(s) generated successfully`,
      licenses: generatedLicenses,
      batchId: count > 1 ? batchId : undefined,
    }, { status: 201 })
  } catch (error) {
    log.error('Generate license keys error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
