import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppMessage } from '@/lib/mongodb/models/WhatsAppMessage'
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

        // If phone provided, get conversation history
        if (phone) {
          const conversation = await WhatsAppService.getConversation({
            workspaceId,
            phone,
            page,
            limit,
          })

          return NextResponse.json({
            success: true,
            ...conversation,
          })
        }

        // Otherwise, get list of recent conversations
        const conversations = await WhatsAppMessage.aggregate([
          { $match: { workspaceId } },
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
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ])

        return NextResponse.json({
          success: true,
          conversations: conversations.map((c: any) => ({
            phone: c._id,
            lastMessage: {
              ...c.lastMessage,
              id: c.lastMessage._id,
            },
            messageCount: c.messageCount,
            unreadCount: c.unreadCount,
          })),
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
