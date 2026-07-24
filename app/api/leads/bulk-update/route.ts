import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { leadIds, workspaceId, updates } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      )
    }

    if (leadIds.length > 500) {
      return NextResponse.json(
        { error: 'Cannot update more than 500 leads at once' },
        { status: 400 }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.edit'
    )
    if (permError) return permError

    const allowedFields: Record<string, boolean> = {
      statusId: true,
      assignedTo: true,
      priority: true,
      source: true,
    }

    const sanitizedUpdates: Record<string, any> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) {
        sanitizedUpdates[key] = value
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid fields to update. Allowed: statusId, assignedTo, priority, source',
        },
        { status: 400 }
      )
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds }, workspaceId },
      { $set: sanitizedUpdates }
    )

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Updated ${result.modifiedCount} leads`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to bulk update leads' },
      { status: 500 }
    )
  }
}
