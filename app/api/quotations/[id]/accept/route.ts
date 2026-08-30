import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Quotation, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'

const acceptSchema = z.object({
  workspaceId: z.string().min(1),
  acceptedBy: z.string().max(100).optional(),
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
        const validationResult = acceptSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId, acceptedBy } = validationResult.data

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

        if (quotation.status === 'accepted') {
          return NextResponse.json(
            { message: 'Quotation already accepted' },
            { status: 400 }
          )
        }

        quotation.status = 'accepted'
        quotation.acceptedAt = new Date()
        quotation.acceptedBy = acceptedBy || auth.user.fullName
        await quotation.save()

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'quotation',
          entityId: id,
          description: `Quotation ${quotation.quotationNumber} accepted by ${quotation.acceptedBy}`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'Quotation Accepted!',
          message: `${quotation.quotationNumber} — ${quotation.customerName} accepted (₹${quotation.grandTotal.toLocaleString()})`,
          type: 'success',
          entityType: 'quotation',
          entityId: id,
          createdBy: auth.user.id,
          notificationLevel: 'team',
        }).catch(() => {})

        logBusinessEvent('quotation_accepted', auth.user.id, workspaceId, {
          quotationId: id,
          quotationNumber: quotation.quotationNumber,
          grandTotal: quotation.grandTotal,
        })

        return NextResponse.json({
          success: true,
          message: 'Quotation accepted',
          quotation: quotation.toJSON(),
        })
      } catch (error) {
        log.error('Accept quotation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
