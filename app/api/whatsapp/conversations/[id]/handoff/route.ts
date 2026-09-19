import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppConversation } from '@/lib/mongodb/models/WhatsAppConversation'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

export const POST = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params

        const conversation = await WhatsAppConversation.findById(id)
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

        const body = await request.json()
        const { action, assignedTo } = body

        if (!action || !['take_over', 'release'].includes(action)) {
          return NextResponse.json(
            { message: 'Invalid action. Must be take_over or release' },
            { status: 400 }
          )
        }

        if (action === 'take_over') {
          const userId = assignedTo || auth.user.id
          conversation.mode = 'human'
          conversation.humanAssignedTo = userId
          await conversation.save()

          return NextResponse.json({
            success: true,
            conversation,
          })
        }

        if (action === 'release') {
          conversation.mode = conversation.aiEnabled ? 'ai' : 'idle'
          conversation.humanAssignedTo = undefined
          await conversation.save()

          return NextResponse.json({
            success: true,
            conversation,
          })
        }

        return NextResponse.json({ success: true, conversation })
      } catch (error) {
        log.error('Handoff error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
