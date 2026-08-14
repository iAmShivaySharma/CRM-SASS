import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { WhatsAppService } from '@/lib/services/whatsappService'

const broadcastSchema = z.object({
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
  recipients: z
    .array(
      z.object({
        phone: z.string().min(10).max(15),
        variables: z.array(z.string()).optional(),
        contactId: z.string().optional(),
      })
    )
    .min(1)
    .max(1000),
  templateName: z.string().min(1).max(100),
  language: z.string().max(10).optional(),
})

export const POST = withSecurityLogging(
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
        const validationResult = broadcastSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const data = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          data.workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const result = await WhatsAppService.broadcastTemplate({
          workspaceId: data.workspaceId,
          accountId: data.accountId,
          recipients: data.recipients,
          templateName: data.templateName,
          language: data.language,
        })

        logBusinessEvent('whatsapp_broadcast', auth.user.id, data.workspaceId, {
          templateName: data.templateName,
          total: result.total,
          sent: result.sent,
          failed: result.failed,
        })

        return NextResponse.json({
          success: true,
          message: `Broadcast complete: ${result.sent} sent, ${result.failed} failed`,
          result,
        })
      } catch (error) {
        log.error('WhatsApp broadcast error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
