import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppMessage } from '@/lib/mongodb/models/WhatsAppMessage'
import { WhatsAppConversation } from '@/lib/mongodb/models/WhatsAppConversation'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import { WhatsAppService } from '@/lib/services/whatsappService'

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

    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')
    const phone = url.searchParams.get('phone')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.view'
    )
    if (permError) {
      return permError
    }

    if (phone) {
      const conversation = await WhatsAppService.getConversation({
        workspaceId,
        phone,
        page,
        limit,
      })

      const conversationState = await WhatsAppConversation.findOne({
        workspaceId,
        contactPhone: phone,
      }).lean()

      return NextResponse.json({
        success: true,
        ...conversation,
        state: conversationState || null,
      })
    }

    const rawConversations = await WhatsAppMessage.aggregate([
      { $match: { workspaceId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$direction', 'inbound'] }, '$from', '$to'],
          },
          accountId: { $first: '$accountId' },
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$direction', 'inbound'] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ])

    const states = await WhatsAppConversation.find({ workspaceId }).lean()
    const stateMap = new Map<string, any>()
    for (const s of states) {
      stateMap.set(s.contactPhone, s)
    }

    const conversations = rawConversations.map(conv => {
      const state = stateMap.get(conv._id)
      return {
        _id: state?._id?.toString() || conv._id,
        contactPhone: conv._id,
        accountId: state?.accountId || conv.accountId,
        contactName: state?.contactName || null,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
        unreadCount: state?.unreadCount ?? conv.unreadCount,
        status: state?.status || 'active',
        mode: state?.mode || 'idle',
        humanAssignedTo: state?.humanAssignedTo || null,
      }
    })

    return NextResponse.json({ success: true, conversations })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { conversationId, mode, status, aiEnabled } = body

    if (!conversationId) {
      return NextResponse.json(
        { message: 'conversationId is required' },
        { status: 400 }
      )
    }

    const conversation = await WhatsAppConversation.findById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { message: 'Conversation not found' },
        { status: 404 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      conversation.workspaceId,
      'leads.edit'
    )
    if (permError) {
      return permError
    }

    const updates: Record<string, any> = {}

    if (mode && ['ai', 'human', 'workflow', 'idle'].includes(mode)) {
      updates.mode = mode
      if (mode !== 'human') {
        updates.humanAssignedTo = null
      }
    }

    if (status && ['active', 'closed', 'archived'].includes(status)) {
      updates.status = status
    }

    if (typeof aiEnabled === 'boolean') {
      updates.aiEnabled = aiEnabled
    }

    const updated = await WhatsAppConversation.findByIdAndUpdate(
      conversationId,
      { $set: updates },
      { new: true }
    )

    return NextResponse.json({ success: true, conversation: updated })
  } catch {
    return NextResponse.json(
      { message: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
