import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgBatch } from '@/lib/mongodb/models/FmcgBatch'
import { FmcgProduct } from '@/lib/mongodb/models/FmcgProduct'
import { FmcgSupplier } from '@/lib/mongodb/models/FmcgSupplier'
import { FmcgTestReport } from '@/lib/mongodb/models/FmcgTestReport'
import { FmcgDistribution } from '@/lib/mongodb/models/FmcgDistribution'

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const batchId = url.searchParams.get('batchId')
        const productId = url.searchParams.get('productId')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const batchQuery: any = { workspaceId }
        if (batchId) batchQuery._id = batchId
        if (productId) batchQuery.productId = productId
        if (dateFrom || dateTo) {
          batchQuery.manufacturingDate = {}
          if (dateFrom) batchQuery.manufacturingDate.$gte = new Date(dateFrom)
          if (dateTo) batchQuery.manufacturingDate.$lte = new Date(dateTo)
        }

        const batches = await FmcgBatch.find(batchQuery).sort({ createdAt: -1 }).limit(100).lean()

        const traceabilityData = await Promise.all(
          batches.map(async (batch: any) => {
            const [product, supplier, testReports, distributions] = await Promise.all([
              FmcgProduct.findOne({ _id: batch.productId, workspaceId }).lean(),
              batch.supplierId
                ? FmcgSupplier.findOne({ _id: batch.supplierId, workspaceId }).lean()
                : Promise.resolve(null),
              FmcgTestReport.find({ batchId: batch._id.toString(), workspaceId }).lean(),
              FmcgDistribution.find({ batchId: batch._id.toString(), workspaceId }).lean(),
            ])

            return {
              batch: { ...batch, id: batch._id },
              product: product ? { ...(product as any), id: (product as any)._id } : null,
              supplier: supplier
                ? { ...(supplier as any), id: (supplier as any)._id }
                : batch.supplierName
                  ? { name: batch.supplierName, fssaiLicenseNumber: batch.supplierFssaiNumber }
                  : null,
              testReports: testReports.map((r: any) => ({ ...r, id: r._id })),
              distributions: distributions.map((d: any) => ({ ...d, id: d._id })),
            }
          })
        )

        return NextResponse.json({
          success: true,
          traceability: traceabilityData,
          total: traceabilityData.length,
        })
      } catch (error) {
        log.error('Get FMCG traceability error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: false, logHeaders: true }
  )
)
