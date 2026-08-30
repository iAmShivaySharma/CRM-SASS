import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgDistribution } from '@/lib/mongodb/models/FmcgDistribution'

const updateDistributionSchema = z.object({
  batchId: z.string().optional(),
  productId: z.string().optional(),
  dispatchDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  recipientType: z.enum(['distributor', 'retailer', 'wholesaler', 'direct_customer', 'export']).optional(),
  recipientName: z.string().max(200).optional(),
  recipientFssaiNumber: z.string().optional(),
  recipientGst: z.string().optional(),
  recipientAddress: z.string().max(500).optional(),
  recipientState: z.string().optional(),
  recipientCity: z.string().optional(),
  recipientPhone: z.string().optional(),
  invoiceNumber: z.string().optional(),
  quantityDispatched: z.number().min(0).optional(),
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
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const distribution = await FmcgDistribution.findOne({ _id: id, workspaceId }).lean()
        if (!distribution) {
          return NextResponse.json({ message: 'Distribution record not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, distribution: { ...(distribution as any), id: (distribution as any)._id } })
      } catch (error) {
        log.error('Get FMCG distribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const body = await request.json()
        const validation = updateDistributionSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.dispatchDate) updateData.dispatchDate = new Date(updateData.dispatchDate)
        if (updateData.deliveryDate) updateData.deliveryDate = new Date(updateData.deliveryDate)

        const distribution = await FmcgDistribution.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!distribution) {
          return NextResponse.json({ message: 'Distribution record not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_distribution_updated', 'fmcg', { distributionId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Distribution updated successfully', distribution: distribution.toJSON() })
      } catch (error) {
        log.error('Update FMCG distribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const distribution = await FmcgDistribution.findOneAndDelete({ _id: id, workspaceId })

        if (!distribution) {
          return NextResponse.json({ message: 'Distribution record not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_distribution_deleted', 'fmcg', { distributionId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Distribution deleted successfully' })
      } catch (error) {
        log.error('Delete FMCG distribution error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    }
  )
)
