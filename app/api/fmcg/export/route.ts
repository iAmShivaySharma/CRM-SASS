import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgProduct } from '@/lib/mongodb/models/FmcgProduct'
import { FmcgBatch } from '@/lib/mongodb/models/FmcgBatch'
import { FmcgFssaiLicense } from '@/lib/mongodb/models/FmcgFssaiLicense'
import { FmcgTestReport } from '@/lib/mongodb/models/FmcgTestReport'
import { FmcgDistribution } from '@/lib/mongodb/models/FmcgDistribution'
import { buildFmcgWorkbook } from '@/lib/excel/fmcgExport'

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
        const productIdFilter = url.searchParams.get('productId')
        const batchIdFilter = url.searchParams.get('batchId')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const productQuery: any = { workspaceId }
        if (productIdFilter) productQuery._id = productIdFilter

        const batchQuery: any = { workspaceId }
        if (batchIdFilter) batchQuery._id = batchIdFilter
        if (productIdFilter) batchQuery.productId = productIdFilter
        if (dateFrom || dateTo) {
          batchQuery.manufacturingDate = {}
          if (dateFrom) batchQuery.manufacturingDate.$gte = new Date(dateFrom)
          if (dateTo) batchQuery.manufacturingDate.$lte = new Date(dateTo)
        }

        const reportQuery: any = { workspaceId }
        if (batchIdFilter) reportQuery.batchId = batchIdFilter
        if (productIdFilter) reportQuery.productId = productIdFilter

        const [products, batches, licenses, reports, distributions] =
          await Promise.all([
            FmcgProduct.find(productQuery).lean(),
            FmcgBatch.find(batchQuery).lean(),
            FmcgFssaiLicense.find({ workspaceId }).lean(),
            FmcgTestReport.find(reportQuery).lean(),
            FmcgDistribution.find({ workspaceId }).lean(),
          ])

        const batchIds = batches.map((b: any) => b._id.toString())

        const reportsForBatches = batchIdFilter
          ? reports
          : reports.filter((r: any) => batchIds.includes(r.batchId?.toString()))

        logUserActivity(auth.user.id, 'fmcg_export', 'fmcg_export', {
          workspaceId,
          productCount: products.length,
          batchCount: batches.length,
          reportCount: reportsForBatches.length,
          distributionCount: distributions.length,
        })

        const buffer = buildFmcgWorkbook({
          products,
          batches,
          licenses,
          testReports: reportsForBatches,
          distributions,
        })

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="fssai-export-${workspaceId}-${new Date().toISOString().split('T')[0]}.xlsx"`,
          },
        })
      } catch (error) {
        log.error('FMCG export error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
