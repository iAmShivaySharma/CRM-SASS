import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Quotation, Activity, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'
import {
  calculateInvoiceTotals,
  isInterStateTransaction,
} from '@/lib/utils/gst'

const quotationItemSchema = z.object({
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

const createQuotationSchema = z.object({
  contactId: z.string().optional(),
  customerName: z.string().min(1).max(200),
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
  dealId: z.string().optional(),
  subject: z.string().min(1).max(300),
  validUntil: z.string().optional(),
  quotationDate: z.string().optional(),
  items: z.array(quotationItemSchema).min(1),
  sellerState: z.string().optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  approvalRequired: z.boolean().optional(),
})

export const GET = withSecurityLogging(
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

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const status = url.searchParams.get('status')
        const contactId = url.searchParams.get('contactId')
        const dealId = url.searchParams.get('dealId')
        const search = url.searchParams.get('search')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

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

        const query: any = { workspaceId }
        if (status) query.status = status
        if (contactId) query.contactId = contactId
        if (dealId) query.dealId = dealId
        if (search) query.$text = { $search: search }

        const [quotations, total] = await Promise.all([
          Quotation.find(query)
            .select(
              'quotationNumber version status customerName subject quotationDate validUntil grandTotal createdAt'
            )
            .populate('contactId', 'name email company')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Quotation.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          quotations: quotations.map((q: any) => ({
            ...q,
            id: q._id,
            contactId:
              typeof q.contactId === 'object' && q.contactId
                ? { ...q.contactId, id: q.contactId._id }
                : q.contactId || null,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        })
      } catch (error) {
        log.error('Get quotations error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

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
        const validationResult = createQuotationSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = body
        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const data = validationResult.data

        // Generate quotation number
        const lastQuote = await Quotation.findOne({ workspaceId })
          .sort({ createdAt: -1 })
          .select('quotationNumber')
          .lean()

        let sequence = 1
        if (lastQuote) {
          const parts = (lastQuote as any).quotationNumber.split('/')
          const lastSeq = parseInt(parts[parts.length - 1])
          if (!isNaN(lastSeq)) sequence = lastSeq + 1
        }

        const now = new Date()
        const fy =
          now.getMonth() >= 3
            ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`
            : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`
        const quotationNumber = `QT/${fy}/${String(sequence).padStart(4, '0')}`

        // Calculate totals
        const buyerState = data.customerAddress?.state
        const isInterState = isInterStateTransaction(
          data.sellerState,
          buyerState
        )

        const itemsWithDefaults = data.items.map(item => ({
          ...item,
          unit: item.unit || 'pcs',
          discount: item.discount || 0,
          discountType: item.discountType || ('percentage' as const),
          taxRate: item.taxRate ?? 18,
        }))

        const totals = calculateInvoiceTotals(itemsWithDefaults, isInterState)

        const quotation = await Quotation.create({
          workspaceId,
          quotationNumber,
          status: 'draft',
          contactId: data.contactId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerGstin: data.customerGstin,
          customerAddress: data.customerAddress,
          dealId: data.dealId,
          subject: data.subject,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          quotationDate: data.quotationDate
            ? new Date(data.quotationDate)
            : new Date(),
          ...totals,
          isInterState,
          sellerState: data.sellerState,
          notes: data.notes,
          termsAndConditions: data.termsAndConditions,
          approvalRequired: data.approvalRequired || false,
          createdBy: auth.user.id,
        })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'created',
          entityType: 'quotation',
          entityId: quotation._id.toString(),
          description: `Created quotation ${quotationNumber} for ${data.customerName} (₹${totals.grandTotal.toLocaleString()})`,
        })

        logBusinessEvent('quotation_created', auth.user.id, workspaceId, {
          quotationId: quotation._id,
          quotationNumber,
          grandTotal: totals.grandTotal,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Quotation created successfully',
            quotation: quotation.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'Quotation number already exists' },
            { status: 400 }
          )
        }
        log.error('Create quotation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
