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

const convertSchema = z.object({
  workspaceId: z.string().min(1),
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
        const validationResult = convertSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const quotation = await Quotation.findOne({ _id: id, workspaceId })
        if (!quotation) {
          return NextResponse.json(
            { message: 'Quotation not found' },
            { status: 404 }
          )
        }

        if (quotation.status === 'converted') {
          return NextResponse.json(
            { message: 'Quotation already converted to invoice' },
            { status: 400 }
          )
        }

        if (quotation.status !== 'accepted') {
          return NextResponse.json(
            {
              message: 'Only accepted quotations can be converted to invoices',
            },
            { status: 400 }
          )
        }

        // Return invoice-ready data (actual invoice creation uses the Invoice API)
        const invoiceData = {
          workspaceId,
          contactId: quotation.contactId,
          customerName: quotation.customerName,
          customerEmail: quotation.customerEmail,
          customerPhone: quotation.customerPhone,
          customerGstin: quotation.customerGstin,
          customerAddress: quotation.customerAddress,
          items: quotation.items.map((item: any) => ({
            name: item.name,
            description: item.description,
            hsnSac: item.hsnSac,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount: item.discount,
            discountType: item.discountType,
            taxRate: item.taxRate,
          })),
          notes: quotation.notes,
          termsAndConditions: quotation.termsAndConditions,
          quoteId: id,
          referenceNumber: quotation.quotationNumber,
        }

        quotation.status = 'converted'
        quotation.convertedAt = new Date()
        await quotation.save()

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'quotation',
          entityId: id,
          description: `Converted quotation ${quotation.quotationNumber} to invoice`,
        })

        logBusinessEvent('quotation_converted', auth.user.id, workspaceId, {
          quotationId: id,
          quotationNumber: quotation.quotationNumber,
          grandTotal: quotation.grandTotal,
        })

        return NextResponse.json({
          success: true,
          message:
            'Quotation marked as converted. Use the invoice data to create an invoice.',
          invoiceData,
        })
      } catch (error) {
        log.error('Convert quotation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
