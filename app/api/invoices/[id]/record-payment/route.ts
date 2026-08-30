import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Invoice, PaymentRecord, Contact, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'

const recordPaymentSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.number().min(0.01),
  paymentDate: z.string().optional(),
  paymentMethod: z
    .enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other'])
    .optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
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

        const validationResult = recordPaymentSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const {
          workspaceId,
          amount,
          paymentDate,
          paymentMethod,
          referenceNumber,
          notes,
        } = validationResult.data

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
            { message: 'Cannot record payment on a cancelled invoice' },
            { status: 400 }
          )
        }

        if (amount > invoice.amountDue) {
          return NextResponse.json(
            {
              message: `Payment amount (₹${amount}) exceeds amount due (₹${invoice.amountDue})`,
            },
            { status: 400 }
          )
        }

        const payment = await PaymentRecord.create({
          workspaceId,
          invoiceId: id,
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || 'upi',
          referenceNumber,
          notes,
          receivedBy: auth.user.id,
        })

        invoice.amountPaid += amount
        invoice.amountDue = Math.max(0, invoice.grandTotal - invoice.amountPaid)

        if (invoice.amountDue <= 0) {
          invoice.status = 'paid'
          invoice.paidDate = new Date()
        } else {
          invoice.status = 'partially_paid'
        }

        await invoice.save()

        // Update contact payment totals
        if (invoice.contactId) {
          await Contact.findByIdAndUpdate(invoice.contactId, {
            $inc: { totalPayments: amount },
            lastPaymentDate: new Date(),
          })
        }

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'invoice',
          entityId: id,
          description: `Recorded payment of ₹${amount.toLocaleString()} on invoice ${invoice.invoiceNumber}`,
          metadata: { amount, paymentMethod: paymentMethod || 'upi' },
        })

        await NotificationService.createNotification({
          workspaceId,
          title:
            invoice.amountDue <= 0
              ? 'Invoice Paid in Full'
              : 'Payment Recorded',
          message: `₹${amount.toLocaleString()} received on ${invoice.invoiceNumber}${invoice.amountDue <= 0 ? ' — Fully paid!' : ` — ₹${invoice.amountDue.toLocaleString()} remaining`}`,
          type: 'success',
          entityType: 'invoice',
          entityId: id,
          createdBy: auth.user.id,
          notificationLevel: 'team',
        }).catch(() => {})

        logBusinessEvent('payment_recorded', auth.user.id, workspaceId, {
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber,
          amount,
          totalPaid: invoice.amountPaid,
          remaining: invoice.amountDue,
          fullyPaid: invoice.amountDue <= 0,
        })

        return NextResponse.json({
          success: true,
          message:
            invoice.amountDue <= 0
              ? 'Payment recorded — Invoice fully paid!'
              : `Payment recorded — ₹${invoice.amountDue.toLocaleString()} remaining`,
          payment: payment.toJSON(),
          invoice: invoice.toJSON(),
        })
      } catch (error) {
        log.error('Record payment error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
