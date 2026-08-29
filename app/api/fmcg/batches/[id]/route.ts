import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgBatch } from '@/lib/mongodb/models/FmcgBatch'

const updateBatchSchema = z.object({
  productId: z.string().optional(),
  batchNumber: z.string().optional(),
  manufacturingDate: z.string().optional(),
  expiryDate: z.string().optional(),
  bestBeforeDate: z.string().optional(),
  quantityProduced: z.number().optional(),
  quantityUnit: z.string().optional(),
  quantityRemaining: z.number().optional(),
  lineNumber: z.string().optional(),
  plantCode: z.string().optional(),
  qcStatus: z.enum(['pending', 'passed', 'failed', 'hold']).optional(),
  qcNotes: z.string().optional(),
  qcApprovedBy: z.string().optional(),
  qcApprovedAt: z.string().optional(),
  rawMaterialDetails: z.string().max(2000).optional(),
  packagingMaterial: z.string().optional(),
  storageLocation: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  dispatchDetails: z.string().max(2000).optional(),
  recallStatus: z.enum(['none', 'partial', 'full']).optional(),
  recallReason: z.string().optional(),
  recallDate: z.string().optional(),
  status: z.enum(['active', 'consumed', 'recalled', 'expired', 'destroyed']).optional(),
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

        const batch = await FmcgBatch.findOne({ _id: id, workspaceId }).lean()
        if (!batch) {
          return NextResponse.json({ message: 'Batch not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, batch: { ...(batch as any), id: (batch as any)._id } })
      } catch (error) {
        log.error('Get FMCG batch error:', error)
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
        const validation = updateBatchSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.manufacturingDate) updateData.manufacturingDate = new Date(updateData.manufacturingDate)
        if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate)
        if (updateData.bestBeforeDate) updateData.bestBeforeDate = new Date(updateData.bestBeforeDate)
        if (updateData.qcApprovedAt) updateData.qcApprovedAt = new Date(updateData.qcApprovedAt)
        if (updateData.recallDate) updateData.recallDate = new Date(updateData.recallDate)

        const batch = await FmcgBatch.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!batch) {
          return NextResponse.json({ message: 'Batch not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_batch_updated', 'fmcg_batch', { batchId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Batch updated successfully', batch: batch.toJSON() })
      } catch (error) {
        log.error('Update FMCG batch error:', error)
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

        const batch = await FmcgBatch.findOneAndDelete({ _id: id, workspaceId })

        if (!batch) {
          return NextResponse.json({ message: 'Batch not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_batch_deleted', 'fmcg_batch', { batchId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Batch deleted successfully' })
      } catch (error) {
        log.error('Delete FMCG batch error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    }
  )
)
