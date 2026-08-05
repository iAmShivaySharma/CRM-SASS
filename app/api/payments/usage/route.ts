import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkspaceMember } from '@/lib/mongodb/client'
import { getWorkspaceUsage } from '@/lib/billing/plan-limits'

export async function GET(request: NextRequest) {
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

    const usage = await getWorkspaceUsage(membership.workspaceId.toString())

    return NextResponse.json(usage)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
