import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Activity } from '@/lib/mongodb/client'
import { checkPermission } from '@/lib/security/check-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: contactId } = await params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'contacts.view'
    )
    if (permError) return permError

    const activities = await Activity.find({
      workspaceId,
      entityType: 'contact',
      entityId: contactId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      activities: (activities as any[]).map(a => ({
        id: a._id,
        activityType: a.activityType,
        description: a.description,
        performedBy: a.performedBy,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
