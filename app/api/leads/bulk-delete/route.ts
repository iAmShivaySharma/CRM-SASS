import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { invalidateCache } from '@/lib/redis/cache'
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
    const { ids, workspaceId } = body

    if (!workspaceId || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'workspaceId and ids array are required' },
        { status: 400 }
      )
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { error: 'Cannot delete more than 500 leads at once' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.delete'
    )
    if (permError) return permError

    const result = await Lead.deleteMany({
      _id: { $in: ids },
      workspaceId,
    })

    await invalidateCache(`leads:${workspaceId}:*`)

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} lead(s) deleted successfully`,
    })
  } catch (error) {
    log.error('Bulk delete leads error:', error)
    return NextResponse.json(
      { error: 'Failed to delete leads' },
      { status: 500 }
    )
  }
}
