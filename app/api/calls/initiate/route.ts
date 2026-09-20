import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { CallSettings, CallLog } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const initiateCallSchema = z.object({
  workspaceId: z.string().min(1),
  to: z.string().min(1),
  from: z.string().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
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
        const validationResult = initiateCallSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId, to, from, leadId, contactId } =
          validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const settings = (await CallSettings.findOne({
          workspaceId,
          isActive: true,
        }).lean()) as any

        if (!settings) {
          return NextResponse.json(
            { message: 'Call settings not configured' },
            { status: 400 }
          )
        }

        const callerNumber = from || settings.callerId

        if (settings.provider === 'telecmi') {
          const response = await fetch('https://rest.telecmi.com/v2/calls', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${settings.apiKey}`,
              'x-api-key': settings.apiSecret,
            },
            body: JSON.stringify({
              from: callerNumber,
              to,
              action_url: settings.webhookUrl || undefined,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            log.error('TeleCMI call initiation failed:', data)
            return NextResponse.json(
              {
                success: false,
                message: data.message || 'Failed to initiate call',
              },
              { status: 400 }
            )
          }

          const callId = data.call_id || data.sid || data.id

          await CallLog.create({
            workspaceId,
            provider: 'telecmi',
            callId,
            direction: 'outbound',
            from: callerNumber,
            to,
            status: 'initiated',
            leadId: leadId || undefined,
            contactId: contactId || undefined,
            initiatedBy: auth.user.id,
            startedAt: new Date(),
            metadata: { telecmiResponse: data },
          })

          return NextResponse.json({
            success: true,
            callId,
          })
        }

        if (settings.provider === 'exotel') {
          return NextResponse.json(
            {
              success: false,
              message: 'Exotel integration coming soon',
            },
            { status: 400 }
          )
        }

        return NextResponse.json(
          {
            success: false,
            message: 'Unsupported provider',
          },
          { status: 400 }
        )
      } catch (error) {
        log.error('Initiate call error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
