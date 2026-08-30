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
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

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

        const matchFilter: any = { workspaceId }
        if (dateFrom || dateTo) {
          matchFilter.invoiceDate = {}
          if (dateFrom) matchFilter.invoiceDate.$gte = new Date(dateFrom)
          if (dateTo) {
            const end = new Date(dateTo)
            end.setHours(23, 59, 59, 999)
            matchFilter.invoiceDate.$lte = end
          }
        }

        const [overview, byStatus, byMonth, overdueInvoices, topCustomers] =
          await Promise.all([
            Invoice.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: null,
                  totalInvoices: { $sum: 1 },
                  totalAmount: { $sum: '$grandTotal' },
                  totalPaid: { $sum: '$amountPaid' },
                  totalDue: { $sum: '$amountDue' },
                  totalTax: { $sum: '$totalTax' },
                  totalCgst: { $sum: '$cgst' },
                  totalSgst: { $sum: '$sgst' },
                  totalIgst: { $sum: '$igst' },
                  avgInvoiceValue: { $avg: '$grandTotal' },
                },
              },
            ]),

            Invoice.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$grandTotal' },
                  totalDue: { $sum: '$amountDue' },
                },
              },
            ]),

            Invoice.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: {
                    year: { $year: '$invoiceDate' },
                    month: { $month: '$invoiceDate' },
                  },
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$grandTotal' },
                  totalPaid: { $sum: '$amountPaid' },
                  totalTax: { $sum: '$totalTax' },
                },
              },
              { $sort: { '_id.year': -1, '_id.month': -1 } },
              { $limit: 12 },
            ]),

            Invoice.find({
              ...matchFilter,
              status: { $in: ['sent', 'viewed', 'overdue'] },
              dueDate: { $lt: new Date() },
            })
              .select('invoiceNumber customerName grandTotal amountDue dueDate')
              .sort({ dueDate: 1 })
              .limit(10)
              .lean(),

            Invoice.aggregate([
              { $match: { ...matchFilter, status: { $ne: 'cancelled' } } },
              {
                $group: {
                  _id: '$customerName',
                  totalInvoices: { $sum: 1 },
                  totalAmount: { $sum: '$grandTotal' },
                  totalPaid: { $sum: '$amountPaid' },
                  totalDue: { $sum: '$amountDue' },
                },
              },
              { $sort: { totalAmount: -1 } },
              { $limit: 10 },
            ]),
          ])

        const stats = overview[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0,
          totalTax: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          avgInvoiceValue: 0,
        }

        return NextResponse.json({
          success: true,
          analytics: {
            overview: {
              ...stats,
              avgInvoiceValue: Math.round(stats.avgInvoiceValue || 0),
              collectionRate:
                stats.totalAmount > 0
                  ? Math.round((stats.totalPaid / stats.totalAmount) * 100)
                  : 0,
            },
            byStatus: byStatus.map((s: any) => ({
              status: s._id,
              count: s.count,
              totalAmount: s.totalAmount,
              totalDue: s.totalDue,
            })),
            monthlyTrend: byMonth.reverse().map((m: any) => ({
              month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
              count: m.count,
              totalAmount: m.totalAmount,
              totalPaid: m.totalPaid,
              totalTax: m.totalTax,
            })),
            overdueInvoices: overdueInvoices.map((inv: any) => ({
              ...inv,
              id: inv._id,
              daysOverdue: Math.ceil(
                (Date.now() - new Date(inv.dueDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
            })),
            topCustomers,
            gstSummary: {
              totalTax: stats.totalTax,
              cgst: stats.totalCgst,
              sgst: stats.totalSgst,
              igst: stats.totalIgst,
            },
          },
        })
      } catch (error) {
        log.error('Invoice analytics error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
