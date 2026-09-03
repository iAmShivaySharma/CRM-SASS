export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { SocialOAuthConnection } from '@/lib/mongodb/models/SocialOAuthConnection'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const provider = searchParams.get('provider')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      )
    }

    await connectToMongoDB()

    const query: Record<string, unknown> = { workspaceId, isActive: true }
    if (provider) {
      query.provider = provider
    }

    const connections = await SocialOAuthConnection.find(query)
      .select('-accessToken -refreshToken')
      .lean()

    return NextResponse.json({ connections })
  } catch (error) {
    log.error('OAuth connections fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await connectToMongoDB()

    await SocialOAuthConnection.findByIdAndUpdate(id, { isActive: false })

    log.info('OAuth connection disconnected', {
      userId: auth.user.id,
      connectionId: id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('OAuth disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
