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
import { SmsService } from '@/lib/services/smsService'

const bulkSmsSchema = z.object({
  workspaceId: z.string().min(1),
  recipients: z
    .array(
      z.object({
        phone: z.string().min(10).max(15),
        variables: z.record(z.string()).optional(),
      })
    )
    .min(1)
    .max(500),
  message: z.string().min(1).max(1000),
  type: z.enum(['transactional', 'promotional']).optional(),
  templateId: z.string().optional(),
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
        const validationResult = bulkSmsSchema.safeParse(body)

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

        const result = await SmsService.sendBulk({
          workspaceId: data.workspaceId,
          recipients: data.recipients,
          message: data.message,
          type: data.type,
          templateId: data.templateId,
          sentBy: auth.user.id,
        })

        logBusinessEvent('bulk_sms_sent', auth.user.id, data.workspaceId, {
          total: result.total,
          sent: result.sent,
          failed: result.failed,
          type: data.type || 'transactional',
        })

        return NextResponse.json({
          success: true,
          message: `Bulk SMS completed: ${result.sent} sent, ${result.failed} failed`,
          result,
        })
      } catch (error) {
        log.error('Bulk SMS error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
