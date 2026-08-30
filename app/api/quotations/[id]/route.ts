import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Quotation } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { calculateInvoiceTotals } from '@/lib/utils/gst'

const updateQuotationSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(20).optional(),
  customerGstin: z.string().max(15).optional(),
  validUntil: z.string().nullable().optional(),
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

        const quotation = await Quotation.findOne({ _id: id, workspaceId })
          .populate('contactId', 'name email phone company')
          .populate('createdBy', 'fullName email')
          .populate('approvedBy', 'fullName email')

        if (!quotation) {
          return NextResponse.json(
            { message: 'Quotation not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          quotation: quotation.toJSON(),
        })
      } catch (error) {
        log.error('Get quotation error:', error)
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

        const validationResult = updateQuotationSchema.safeParse(body)
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

        const quotation = await Quotation.findOne({ _id: id, workspaceId })
        if (!quotation) {
          return NextResponse.json(
            { message: 'Quotation not found' },
            { status: 404 }
          )
        }

        if (['accepted', 'converted'].includes(quotation.status)) {
          return NextResponse.json(
            { message: 'Cannot modify an accepted or converted quotation' },
            { status: 400 }
          )
        }

        const data = validationResult.data

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
            quotation.isInterState
          )
          Object.assign(quotation, totals)
          quotation.version += 1
        }

        if (data.subject) quotation.subject = data.subject
        if (data.customerName) quotation.customerName = data.customerName
        if (data.customerEmail) quotation.customerEmail = data.customerEmail
        if (data.customerPhone) quotation.customerPhone = data.customerPhone
        if (data.customerGstin) quotation.customerGstin = data.customerGstin
        if (data.validUntil) quotation.validUntil = new Date(data.validUntil)
        if (data.validUntil === null) quotation.validUntil = undefined
        if (data.notes !== undefined) quotation.notes = data.notes
        if (data.termsAndConditions !== undefined)
          quotation.termsAndConditions = data.termsAndConditions
        if (data.internalNotes !== undefined)
          quotation.internalNotes = data.internalNotes

        await quotation.save()

        return NextResponse.json({
          success: true,
          message: 'Quotation updated',
          quotation: quotation.toJSON(),
        })
      } catch (error) {
        log.error('Update quotation error:', error)
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

        const quotation = await Quotation.findOneAndDelete({
          _id: id,
          workspaceId,
        })
        if (!quotation) {
          return NextResponse.json(
            { message: 'Quotation not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Quotation deleted',
        })
      } catch (error) {
        log.error('Delete quotation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
