import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Invoice, PaymentRecord, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { calculateInvoiceTotals } from '@/lib/utils/gst'

const updateInvoiceSchema = z.object({
  status: z
    .enum([
      'draft',
      'sent',
      'viewed',
      'paid',
      'partially_paid',
      'overdue',
      'cancelled',
    ])
    .optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(20).optional(),
  customerGstin: z.string().max(15).optional(),
  customerAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  dueDate: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        hsnSac: z.string().max(20).optional(),
        quantity: z.number().min(0),
        unit: z.string().max(20).optional(),
        rate: z.number().min(0),
        discount: z.number().min(0).optional(),
        discountType: z.enum(['percentage', 'flat']).optional(),
        taxRate: z.number().min(0).max(100).optional(),
      })
    )
    .optional(),
  paymentTerms: z.string().max(500).optional(),
  bankDetails: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  internalNotes: z.string().max(1000).optional(),
})

export const GET = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const invoice = await Invoice.findOne({ _id: id, workspaceId })
          .populate('contactId', 'name email phone company')
          .populate('createdBy', 'fullName email')

        if (!invoice) {
          return NextResponse.json(
            { message: 'Invoice not found' },
            { status: 404 }
          )
        }

        const payments = await PaymentRecord.find({
          invoiceId: id,
          workspaceId,
        })
          .sort({ paymentDate: -1 })
          .populate('receivedBy', 'fullName email')
          .lean()

        return NextResponse.json({
          success: true,
          invoice: invoice.toJSON(),
          payments: payments.map((p: any) => ({
            ...p,
            id: p._id,
            receivedBy:
              typeof p.receivedBy === 'object' && p.receivedBy
                ? { ...p.receivedBy, id: p.receivedBy._id }
                : p.receivedBy,
          })),
        })
      } catch (error) {
        log.error('Get invoice error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
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
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateInvoiceSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

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

        if (
          invoice.status === 'paid' &&
          validationResult.data.status !== 'paid'
        ) {
          return NextResponse.json(
            { message: 'Cannot modify a fully paid invoice' },
            { status: 400 }
          )
        }

        const data = validationResult.data

        // Recalculate if items changed
        if (data.items) {
          const itemsWithDefaults = data.items.map(item => ({
            ...item,
            unit: item.unit || 'pcs',
            discount: item.discount || 0,
            discountType: item.discountType || ('percentage' as const),
            taxRate: item.taxRate ?? 18,
          }))
          const totals = calculateInvoiceTotals(
            itemsWithDefaults,
            invoice.isInterState
          )
          Object.assign(invoice, {
            items: totals.items,
            subtotal: totals.subtotal,
            totalDiscount: totals.totalDiscount,
            taxableAmount: totals.taxableAmount,
            cgst: totals.cgst,
            sgst: totals.sgst,
            igst: totals.igst,
            totalTax: totals.totalTax,
            roundOff: totals.roundOff,
            grandTotal: totals.grandTotal,
            amountDue: totals.grandTotal - invoice.amountPaid,
          })
        }

        if (data.customerName) invoice.customerName = data.customerName
        if (data.customerEmail) invoice.customerEmail = data.customerEmail
        if (data.customerPhone) invoice.customerPhone = data.customerPhone
        if (data.customerGstin) invoice.customerGstin = data.customerGstin
        if (data.customerAddress) invoice.customerAddress = data.customerAddress
        if (data.dueDate) invoice.dueDate = new Date(data.dueDate)
        if (data.dueDate === null) invoice.dueDate = undefined
        if (data.status) invoice.status = data.status
        if (data.paymentTerms !== undefined) {
          invoice.paymentTerms = data.paymentTerms
        }
        if (data.bankDetails) invoice.bankDetails = data.bankDetails
        if (data.notes !== undefined) invoice.notes = data.notes
        if (data.termsAndConditions !== undefined) {
          invoice.termsAndConditions = data.termsAndConditions
        }
        if (data.internalNotes !== undefined) {
          invoice.internalNotes = data.internalNotes
        }

        await invoice.save()

        return NextResponse.json({
          success: true,
          message: 'Invoice updated successfully',
          invoice: invoice.toJSON(),
        })
      } catch (error) {
        log.error('Update invoice error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.delete'
        )
        if (permError) return permError

        const invoice = await Invoice.findOne({ _id: id, workspaceId })
        if (!invoice) {
          return NextResponse.json(
            { message: 'Invoice not found' },
            { status: 404 }
          )
        }

        if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
          return NextResponse.json(
            {
              message:
                'Cannot delete an invoice with payments. Cancel it instead.',
            },
            { status: 400 }
          )
        }

        await Invoice.findByIdAndDelete(id)
        await PaymentRecord.deleteMany({ invoiceId: id })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'deleted',
          entityType: 'invoice',
          entityId: id,
          description: `Deleted invoice ${invoice.invoiceNumber}`,
        })

        return NextResponse.json({
          success: true,
          message: 'Invoice deleted successfully',
        })
      } catch (error) {
        log.error('Delete invoice error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
