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

const sendSmsSchema = z.object({
  workspaceId: z.string().min(1),
  to: z.string().min(10).max(15),
  message: z.string().min(1).max(1000),
  type: z.enum(['transactional', 'promotional', 'otp']).optional(),
  templateId: z.string().optional(),
  variables: z.record(z.string()).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
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
        const validationResult = sendSmsSchema.safeParse(body)

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

        const result = await SmsService.sendSms({
          ...data,
          sentBy: auth.user.id,
        })

        logBusinessEvent('sms_sent', auth.user.id, data.workspaceId, {
          to: data.to,
          type: data.type || 'transactional',
          success: result.success,
        })

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              message: `SMS failed: ${result.error}`,
              logId: result.logId,
            },
            { status: 502 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'SMS sent successfully',
          logId: result.logId,
        })
      } catch (error) {
        log.error('Send SMS error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
