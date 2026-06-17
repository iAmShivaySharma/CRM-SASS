import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailMessage } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const accountId = searchParams.get('accountId')
    const folder = searchParams.get('folder') || 'INBOX'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const isRead = searchParams.get('isRead')
    const isStarred = searchParams.get('isStarred')
    const isImportant = searchParams.get('isImportant')
    const hasAttachments = searchParams.get('hasAttachments')
    const priority = searchParams.get('priority')
    const direction = searchParams.get('direction')
    const dateRange = searchParams.get('dateRange')
    const linkedToCRM = searchParams.get('linkedToCRM')

    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const starred = searchParams.get('starred') === 'true'

    const query: any = {
      userId: auth.user.id,
      workspaceId,
      syncStatus: { $ne: 'ignored' }
    }

    if (accountId) {
      query.emailAccountId = accountId
    }

    if (folder && folder !== 'all') {
      if (folder === 'STARRED') {
        query.isStarred = true
      } else if (folder === 'IMPORTANT') {
        query.isImportant = true
      } else {
        query.folder = folder
      }
    }

    if (isRead === 'true') {
      query.isRead = true
    } else if (isRead === 'false' || unreadOnly) {
      query.isRead = false
    }

    if (isStarred === 'true' || starred) {
      query.isStarred = true
    }

    if (isImportant === 'true') {
      query.isImportant = true
    }

    if (hasAttachments === 'true') {
      query['attachments.0'] = { $exists: true }
    }

    if (priority) {
      query.priority = priority
    }

    if (direction) {
      query.direction = direction
    }

    if (dateRange) {
      const days = parseInt(dateRange)
      if (!isNaN(days)) {
        const since = new Date()
        since.setDate(since.getDate() - days)
        query.receivedAt = { $gte: since }
      }
    }

    if (linkedToCRM === 'true') {
      query.$or = [
        { linkedLeadId: { $exists: true, $ne: null } },
        { linkedContactId: { $exists: true, $ne: null } },
        { linkedProjectId: { $exists: true, $ne: null } },
        { linkedTaskId: { $exists: true, $ne: null } }
      ]
    }

    if (search) {
      query.$text = { $search: search }
    }

    const total = await EmailMessage.countDocuments(query)

    const messages = await EmailMessage.find(query)
      .select('-bodyHtml -bodyText -providerData.rawHeaders')
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