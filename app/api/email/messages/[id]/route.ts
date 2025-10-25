import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailMessage } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    const { id: messageId } = await params
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const message = await EmailMessage.findOne({
      _id: messageId,
      userId: auth.user.id,
      workspaceId,
      syncStatus: { $ne: 'ignored' }
    })
      .populate('linkedLeadId', 'name email status')
      .populate('linkedContactId', 'name email')
      .populate('linkedProjectId', 'name')
      .populate('linkedTaskId', 'title')

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Mark as read if it was unread
    if (!message.isRead) {
      await message.markAsRead()
    }

    return NextResponse.json({ message })
  } catch (error) {
    log.error('Get email message error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email message' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    const { id: messageId } = await params
    const body = await request.json()
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const message = await EmailMessage.findOne({
      _id: messageId,
      userId: auth.user.id,
      workspaceId,
      syncStatus: { $ne: 'ignored' }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const {
      isRead,
      isStarred,
      folder,
      labels,
      linkedLeadId,
      linkedContactId,
      linkedProjectId,
      linkedTaskId,
      snoozeUntil
    } = body

    // Update fields
    if (typeof isRead === 'boolean') {
      if (isRead) {
        await message.markAsRead()
      } else {
        await message.markAsUnread()
      }
    }

    if (typeof isStarred === 'boolean') {
      if (isStarred) {
        await message.star()
      } else {
        await message.unstar()
      }
    }

    if (folder) {
      await message.moveToFolder(folder)
    }

    if (Array.isArray(labels)) {
      message.labels = labels
      await message.save()
    }

    // Update CRM links
    if (linkedLeadId !== undefined) {
      if (linkedLeadId) {
        await message.linkToLead(linkedLeadId)
      } else {
        message.linkedLeadId = undefined
      }
    }

    if (linkedContactId !== undefined) {
      if (linkedContactId) {
        await message.linkToContact(linkedContactId)
      } else {
        message.linkedContactId = undefined
      }
    }

    if (linkedProjectId !== undefined) {
      message.linkedProjectId = linkedProjectId || undefined
    }

    if (linkedTaskId !== undefined) {
      message.linkedTaskId = linkedTaskId || undefined
    }

    // Handle snoozing
    if (snoozeUntil) {
      await message.snooze(new Date(snoozeUntil))
    } else if (snoozeUntil === null) {
      await message.unsnooze()
    }

    await message.save()

    log.info(`Email message updated: ${messageId}`, {
      userId: auth.user.id,
      workspaceId,
      messageId
    })

    return NextResponse.json({
      success: true,
      message: 'Email message updated successfully'
    })
  } catch (error) {
    log.error('Update email message error:', error)
    return NextResponse.json(
      { error: 'Failed to update email message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    const { id: messageId } = await params
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const message = await EmailMessage.findOne({
      _id: messageId,
      userId: auth.user.id,
      workspaceId,
      syncStatus: { $ne: 'ignored' }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Move to trash instead of hard delete
    await message.moveToFolder('INBOX.Trash')

    log.info(`Email message moved to trash: ${messageId}`, {
      userId: auth.user.id,
      workspaceId,
      messageId
    })

    return NextResponse.json({
      success: true,
      message: 'Email message moved to trash'
    })
  } catch (error) {
    log.error('Delete email message error:', error)
    return NextResponse.json(
      { error: 'Failed to delete email message' },
      { status: 500 }
    )
  }
}