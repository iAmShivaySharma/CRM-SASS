import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Invoice, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const sendInvoiceSchema = z.object({
  workspaceId: z.string().min(1),
  channel: z.enum(['email', 'whatsapp', 'sms']).optional(),
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

        const validationResult = sendInvoiceSchema.safeParse(body)
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

        const invoice = await Invoice.findOne({ _id: id, workspaceId })
        if (!invoice) {
          return NextResponse.json(
            { message: 'Invoice not found' },
            { status: 404 }
          )
        }

        if (invoice.status === 'cancelled') {
          return NextResponse.json(
            { message: 'Cannot send a cancelled invoice' },
            { status: 400 }
          )
        }

        const now = new Date()
        if (invoice.status === 'draft') {
          invoice.status = 'sent'
        }
        invoice.sentAt = now
        invoice.reminders.push({
          sentAt: now,
          channel: channel || 'email',
        })

        await invoice.save()

        // TODO: Integrate with email/WhatsApp/SMS service to actually send

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'invoice',
          entityId: id,
          description: `Sent invoice ${invoice.invoiceNumber} via ${channel || 'email'}`,
        })

        logBusinessEvent('invoice_sent', auth.user.id, workspaceId, {
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber,
          channel: channel || 'email',
          grandTotal: invoice.grandTotal,
        })

        return NextResponse.json({
          success: true,
          message: `Invoice sent via ${channel || 'email'}`,
          invoice: invoice.toJSON(),
        })
      } catch (error) {
        log.error('Send invoice error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
