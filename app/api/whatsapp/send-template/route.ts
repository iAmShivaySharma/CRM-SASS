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

const sendTemplateSchema = z.object({
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
  to: z.string().min(10).max(15),
  templateName: z.string().min(1).max(100),
  language: z.string().max(10).optional(),
  variables: z.array(z.string()).optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
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
        const validationResult = sendTemplateSchema.safeParse(body)

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

        const result = await WhatsAppService.sendTemplateMessage(data)

        logBusinessEvent(
          'whatsapp_template_sent',
          auth.user.id,
          data.workspaceId,
          {
            to: data.to,
            templateName: data.templateName,
            success: result.success,
          }
        )

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              message: `Template send failed: ${result.error}`,
              messageId: result.messageId,
            },
            { status: 502 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Template message sent',
          messageId: result.messageId,
          waMessageId: result.waMessageId,
        })
      } catch (error) {
        log.error('WhatsApp template send error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
