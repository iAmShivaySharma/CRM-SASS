import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Invoice } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

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
        const type = url.searchParams.get('type') || 'tax_invoice'

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

        const prefix =
          type === 'credit_note' ? 'CN' : type === 'debit_note' ? 'DN' : 'INV'

        const lastInvoice = await Invoice.findOne({
          workspaceId,
          invoiceNumber: { $regex: `^${prefix}/` },
        })
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

        const invoiceNumber = `${prefix}/${fy}/${String(sequence).padStart(4, '0')}`

        return NextResponse.json({
          success: true,
          invoiceNumber,
          sequence,
        })
      } catch (error) {
        log.error('Get next invoice number error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
