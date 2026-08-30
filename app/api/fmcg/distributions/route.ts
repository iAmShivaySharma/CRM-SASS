import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgDistribution } from '@/lib/mongodb/models/FmcgDistribution'

const createDistributionSchema = z.object({
  workspaceId: z.string().min(1),
  batchId: z.string().min(1),
  productId: z.string().min(1),
  dispatchDate: z.string(),
  deliveryDate: z.string().optional(),
  recipientType: z.enum(['distributor', 'retailer', 'wholesaler', 'direct_customer', 'export']),
  recipientName: z.string().min(1).max(200),
  recipientFssaiNumber: z.string().optional(),
  recipientGst: z.string().optional(),
  recipientAddress: z.string().max(500).optional(),
  recipientState: z.string().optional(),
  recipientCity: z.string().optional(),
  recipientPhone: z.string().optional(),
  invoiceNumber: z.string().optional(),
  quantityDispatched: z.number().min(0),
  quantityUnit: z.string().optional(),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  transporterName: z.string().optional(),
  lrNumber: z.string().optional(),
  status: z.enum(['dispatched', 'in_transit', 'delivered', 'returned', 'recalled']).optional(),
  notes: z.string().max(1000).optional(),
})

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
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const batchId = url.searchParams.get('batchId')
        const productId = url.searchParams.get('productId')
        const status = url.searchParams.get('status')
        const recipientType = url.searchParams.get('recipientType')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const query: any = { workspaceId }

        if (batchId) query.batchId = batchId
        if (productId) query.productId = productId
        if (status) query.status = status
        if (recipientType) query.recipientType = recipientType
        if (dateFrom || dateTo) {
          query.dispatchDate = {}
          if (dateFrom) query.dispatchDate.$gte = new Date(dateFrom)
          if (dateTo) query.dispatchDate.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [distributions, total] = await Promise.all([
          FmcgDistribution.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          FmcgDistribution.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          distributions: distributions.map((d: any) => ({ ...d, id: d._id })),
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
        log.error('Get FMCG distributions error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
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
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const validation = createDistributionSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...distData } = validation.data

        const distribution = await FmcgDistribution.create({
          ...distData,
          workspaceId,
          dispatchDate: new Date(distData.dispatchDate),
          deliveryDate: distData.deliveryDate ? new Date(distData.deliveryDate) : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_distribution_created', 'fmcg', {
          distributionId: distribution._id,
          batchId: distribution.batchId,
          workspaceId,
        })

        return NextResponse.json(
          { success: true, message: 'Distribution record created successfully', distribution: distribution.toJSON() },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG distribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)
