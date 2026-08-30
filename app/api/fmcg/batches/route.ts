import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgBatch } from '@/lib/mongodb/models/FmcgBatch'

const createBatchSchema = z.object({
  workspaceId: z.string().min(1),
  productId: z.string().min(1),
  batchNumber: z.string().min(1),
  manufacturingDate: z.string(),
  expiryDate: z.string(),
  bestBeforeDate: z.string().optional(),
  quantityProduced: z.number().min(0),
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
        const productId = url.searchParams.get('productId')
        const qcStatus = url.searchParams.get('qcStatus')
        const status = url.searchParams.get('status')
        const search = url.searchParams.get('search')
        const expiryBefore = url.searchParams.get('expiryBefore')
        const expiryAfter = url.searchParams.get('expiryAfter')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const query: any = { workspaceId }

        if (productId) query.productId = productId
        if (qcStatus) query.qcStatus = qcStatus
        if (status) query.status = status
        if (search) {
          query.$or = [
            { batchNumber: { $regex: search, $options: 'i' } },
            { lineNumber: { $regex: search, $options: 'i' } },
            { plantCode: { $regex: search, $options: 'i' } },
          ]
        }
        if (expiryBefore || expiryAfter) {
          query.expiryDate = {}
          if (expiryAfter) query.expiryDate.$gte = new Date(expiryAfter)
          if (expiryBefore) query.expiryDate.$lte = new Date(expiryBefore)
        }

        const skip = (page - 1) * limit

        const [batches, total] = await Promise.all([
          FmcgBatch.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          FmcgBatch.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          batches: batches.map((b: any) => ({ ...b, id: b._id })),
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
        log.error('Get FMCG batches error:', error)
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
        const validation = createBatchSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...batchData } = validation.data

        const existing = await FmcgBatch.findOne({ workspaceId, batchNumber: batchData.batchNumber })
        if (existing) {
          return NextResponse.json({ message: 'Batch number already exists in this workspace' }, { status: 409 })
        }

        const batch = await FmcgBatch.create({
          ...batchData,
          workspaceId,
          manufacturingDate: new Date(batchData.manufacturingDate),
          expiryDate: new Date(batchData.expiryDate),
          bestBeforeDate: batchData.bestBeforeDate ? new Date(batchData.bestBeforeDate) : undefined,
          qcApprovedAt: batchData.qcApprovedAt ? new Date(batchData.qcApprovedAt) : undefined,
          recallDate: batchData.recallDate ? new Date(batchData.recallDate) : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_batch_created', 'fmcg_batch', {
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          workspaceId,
        })

        return NextResponse.json(
          { success: true, message: 'Batch created successfully', batch: batch.toJSON() },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG batch error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)
