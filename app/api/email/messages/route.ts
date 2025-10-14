import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailMessage } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    // Parse query parameters
    const accountId = searchParams.get('accountId')
    const folder = searchParams.get('folder') || 'INBOX'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const starred = searchParams.get('starred') === 'true'

    // Build query
    const query: any = {
      userId: auth.user.id,
      workspaceId,
      syncStatus: { $ne: 'ignored' }
    }

    if (accountId) {
      query.emailAccountId = accountId
    }

    if (folder !== 'all') {
      query.folder = folder
    }

    if (unreadOnly) {
      query.isRead = false
    }

    if (starred) {
      query.isStarred = true
    }

    if (search) {
      query.$text = { $search: search }
    }

    // Get total count
    const total = await EmailMessage.countDocuments(query)

    // Get messages with pagination
    const messages = await EmailMessage.find(query)
      .select('-bodyHtml -bodyText -providerData.rawHeaders') // Exclude large fields for list view
      .populate('linkedLeadId', 'name email status')
      .populate('linkedContactId', 'name email')
      .sort(search ? { score: { $meta: 'textScore' }, receivedAt: -1 } : { receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    log.error('Get email messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email messages' },
      { status: 500 }
    )
  }
}