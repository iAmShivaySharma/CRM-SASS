import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Quotation, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const sendSchema = z.object({
  workspaceId: z.string().min(1),
  channel: z.enum(['email', 'whatsapp']).optional(),
})

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
        const body = await request.json()
        const validationResult = sendSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId, channel } = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const quotation = await Quotation.findOne({ _id: id, workspaceId })
        if (!quotation) {
          return NextResponse.json(
            { message: 'Quotation not found' },
            { status: 404 }
          )
        }

        if (quotation.status === 'draft') {
          quotation.status = 'sent'
        }
        quotation.sentAt = new Date()
        await quotation.save()

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'quotation',
          entityId: id,
          description: `Sent quotation ${quotation.quotationNumber} via ${channel || 'email'}`,
        })

        return NextResponse.json({
          success: true,
          message: `Quotation sent via ${channel || 'email'}`,
          quotation: quotation.toJSON(),
        })
      } catch (error) {
        log.error('Send quotation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
