import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Invoice,
  WorkspaceMember,
  Activity,
  Contact,
} from '@/lib/mongodb/client'
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

const invoiceItemSchema = z.object({
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

const createInvoiceSchema = z.object({
  type: z
    .enum(['tax_invoice', 'proforma', 'credit_note', 'debit_note'])
    .optional(),
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
  sellerName: z.string().optional(),
  sellerGstin: z.string().max(15).optional(),
  sellerAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().optional(),
  paymentTerms: z.string().max(500).optional(),
  bankDetails: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
  dealId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z
    .enum(['weekly', 'monthly', 'quarterly', 'yearly'])
    .optional(),
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
        const type = url.searchParams.get('type')
        const contactId = url.searchParams.get('contactId')
        const search = url.searchParams.get('search')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const sortBy = url.searchParams.get('sortBy') || 'createdAt'
        const sortOrder = url.searchParams.get('sortOrder') || 'desc'
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
        if (type) query.type = type
        if (contactId) query.contactId = contactId
        if (search) query.$text = { $search: search }
        if (dateFrom || dateTo) {
          query.invoiceDate = {}
          if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom)
          if (dateTo) {
            const end = new Date(dateTo)
            end.setHours(23, 59, 59, 999)
            query.invoiceDate.$lte = end
          }
        }

        const sortMap: Record<string, any> = {
          createdAt: { createdAt: sortOrder === 'asc' ? 1 : -1 },
          invoiceDate: { invoiceDate: sortOrder === 'asc' ? 1 : -1 },
          dueDate: { dueDate: sortOrder === 'asc' ? 1 : -1 },
          grandTotal: { grandTotal: sortOrder === 'asc' ? 1 : -1 },
          invoiceNumber: { invoiceNumber: sortOrder === 'asc' ? 1 : -1 },
        }
        const sortOption = search
          ? { score: { $meta: 'textScore' } }
          : sortMap[sortBy] || { createdAt: -1 }

        const [invoices, total] = await Promise.all([
          Invoice.find(query)
            .select(
              'invoiceNumber type status customerName customerEmail contactId invoiceDate dueDate grandTotal amountPaid amountDue currency createdAt'
            )
            .populate('contactId', 'name email company')
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean(),
          Invoice.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          invoices: invoices.map((inv: any) => ({
            ...inv,
            id: inv._id,
            contactId:
              typeof inv.contactId === 'object' && inv.contactId
                ? { ...inv.contactId, id: inv.contactId._id }
                : inv.contactId || null,
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
        log.error('Get invoices error:', error)
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
        const validationResult = createInvoiceSchema.safeParse(body)

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

        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })
        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const data = validationResult.data

        // Generate invoice number
        const lastInvoice = await Invoice.findOne({ workspaceId })
          .sort({ createdAt: -1 })
          .select('invoiceNumber')
          .lean()

        let sequence = 1
        if (lastInvoice) {
          const parts = (lastInvoice as any).invoiceNumber.split('/')
          const lastSeq = parseInt(parts[parts.length - 1])
          if (!isNaN(lastSeq)) sequence = lastSeq + 1
        }

        const now = new Date()
        const fy =
          now.getMonth() >= 3
            ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`
            : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`
        const prefix =
          data.type === 'credit_note'
            ? 'CN'
            : data.type === 'debit_note'
              ? 'DN'
              : 'INV'
        const invoiceNumber = `${prefix}/${fy}/${String(sequence).padStart(4, '0')}`

        // Determine inter-state
        const sellerState = data.sellerAddress?.state
        const buyerState = data.customerAddress?.state
        const isInterState = isInterStateTransaction(sellerState, buyerState)

        // Calculate totals
        const itemsWithDefaults = data.items.map(item => ({
          ...item,
          unit: item.unit || 'pcs',
          discount: item.discount || 0,
          discountType: item.discountType || ('percentage' as const),
          taxRate: item.taxRate ?? 18,
        }))

        const totals = calculateInvoiceTotals(itemsWithDefaults, isInterState)

        const invoice = await Invoice.create({
          workspaceId,
          invoiceNumber,
          type: data.type || 'tax_invoice',
          status: 'draft',
          contactId: data.contactId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerGstin: data.customerGstin,
          customerAddress: data.customerAddress,
          sellerName: data.sellerName,
          sellerGstin: data.sellerGstin,
          sellerAddress: data.sellerAddress,
          invoiceDate: data.invoiceDate
            ? new Date(data.invoiceDate)
            : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          ...totals,
          amountPaid: 0,
          amountDue: totals.grandTotal,
          placeOfSupply: data.placeOfSupply || buyerState,
          isInterState,
          reverseCharge: data.reverseCharge || false,
          paymentTerms: data.paymentTerms,
          bankDetails: data.bankDetails,
          dealId: data.dealId,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          termsAndConditions: data.termsAndConditions,
          isRecurring: data.isRecurring || false,
          recurringInterval: data.recurringInterval,
          reminders: [],
          createdBy: auth.user.id,
        })

        const populatedInvoice = await Invoice.findById(invoice._id)
          .populate('contactId', 'name email company')
          .populate('createdBy', 'fullName email')

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'created',
          entityType: 'invoice',
          entityId: invoice._id.toString(),
          description: `Created invoice ${invoiceNumber} for ${data.customerName} (₹${totals.grandTotal.toLocaleString()})`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'New Invoice Created',
          message: `${auth.user.fullName || auth.user.email} created invoice ${invoiceNumber} — ₹${totals.grandTotal.toLocaleString()}`,
          type: 'info',
          entityType: 'invoice',
          entityId: invoice._id.toString(),
          createdBy: auth.user.id,
          notificationLevel: 'team',
          excludeUserIds: [auth.user.id],
        }).catch(() => {})

        logUserActivity(auth.user.id, 'invoice_created', 'invoice', {
          invoiceId: invoice._id,
          invoiceNumber,
          grandTotal: totals.grandTotal,
          workspaceId,
        })

        logBusinessEvent('invoice_created', auth.user.id, workspaceId, {
          invoiceId: invoice._id,
          invoiceNumber,
          grandTotal: totals.grandTotal,
          type: data.type || 'tax_invoice',
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Invoice created successfully',
            invoice: populatedInvoice?.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'Invoice number already exists' },
            { status: 400 }
          )
        }
        log.error('Create invoice error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
