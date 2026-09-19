import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppMessage } from '@/lib/mongodb/models/WhatsAppMessage'
import { WhatsAppConversation } from '@/lib/mongodb/models/WhatsAppConversation'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { WhatsAppService } from '@/lib/services/whatsappService'

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
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
        const modeFilter = url.searchParams.get('mode')
        const statusFilter = url.searchParams.get('status')
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
        if (permError) return permError

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
          })

          return NextResponse.json({
            success: true,
            ...conversation,
            state: conversationState
              ? {
                  id: conversationState._id,
                  mode: conversationState.mode,
                  humanAssignedTo: conversationState.humanAssignedTo,
                  aiEnabled: conversationState.aiEnabled,
                  status: conversationState.status,
                  activeWorkflowId: conversationState.activeWorkflowId,
                  contactName: conversationState.contactName,
                }
              : null,
          })
        }

        const convQuery: Record<string, any> = { workspaceId }
        if (modeFilter) {
          convQuery.mode = modeFilter
        }
        if (statusFilter) {
          convQuery.status = statusFilter
        }

        const conversationStates = await WhatsAppConversation.find(convQuery)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()

        const total = await WhatsAppConversation.countDocuments(convQuery)

        const stateMap = new Map<string, any>()
        for (const state of conversationStates) {
          stateMap.set(state.contactPhone, state)
        }

        const phoneNumbers = conversationStates.map((s: any) => s.contactPhone)

        const conversations = await WhatsAppMessage.aggregate([
          {
            $match: {
              workspaceId,
              $or: [
                { from: { $in: phoneNumbers } },
                { to: { $in: phoneNumbers } },
              ],
            },
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: {
                $cond: [{ $eq: ['$direction', 'inbound'] }, '$from', '$to'],
              },
              lastMessage: { $first: '$$ROOT' },
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
          { $sort: { 'lastMessage.createdAt': -1 } },
        ])

        const messageMap = new Map<string, any>()
        for (const conv of conversations) {
          messageMap.set(conv._id, conv)
        }

        const results = conversationStates.map((state: any) => {
          const msgData = messageMap.get(state.contactPhone)
          return {
            phone: state.contactPhone,
            lastMessage: msgData
              ? { ...msgData.lastMessage, id: msgData.lastMessage._id }
              : null,
            messageCount: msgData?.messageCount || 0,
            unreadCount: msgData?.unreadCount || 0,
            state: {
              id: state._id,
              mode: state.mode,
              humanAssignedTo: state.humanAssignedTo,
              aiEnabled: state.aiEnabled,
              status: state.status,
              activeWorkflowId: state.activeWorkflowId,
              contactName: state.contactName,
              lastInboundAt: state.lastInboundAt,
              lastOutboundAt: state.lastOutboundAt,
              lastMessagePreview: state.lastMessagePreview,
            },
          }
        })

        return NextResponse.json({
          success: true,
          conversations: results,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        })
      } catch (error) {
        log.error('Get conversations error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PATCH = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
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
        if (permError) return permError

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

        return NextResponse.json({
          success: true,
          conversation: updated,
        })
      } catch (error) {
        log.error('Update conversation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
