import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgRmLot } from '@/lib/mongodb/models/FmcgRmLot'

const createRmLotSchema = z.object({
  workspaceId: z.string().min(1),
  receiptDate: z.string(),
  supplierId: z.string().optional(),
  supplierName: z.string().min(1),
  supplierFssaiNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  materialName: z.string().min(1),
  quantityReceived: z.number().min(0),
  unit: z.string().min(1),
  supplierLotNumber: z.string().optional(),
  internalLotNumber: z.string().min(1),
  testStatus: z.enum(['accepted', 'rejected', 'under_test']).optional(),
  storageLocation: z.string().optional(),
  remarks: z.string().optional(),
  receivedBy: z.string().min(1),
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
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const materialName = url.searchParams.get('materialName')
        const testStatus = url.searchParams.get('testStatus')
        const search = url.searchParams.get('search')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (materialName) query.materialName = materialName
        if (testStatus) query.testStatus = testStatus
        if (search) {
          query.$or = [
            { internalLotNumber: { $regex: search, $options: 'i' } },
            { materialName: { $regex: search, $options: 'i' } },
            { supplierName: { $regex: search, $options: 'i' } },
          ]
        }

        const skip = (page - 1) * limit

        const [rmLots, total] = await Promise.all([
          FmcgRmLot.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgRmLot.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          rmLots: rmLots.map((r: any) => ({ ...r, id: r._id })),
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
        log.error('Get FMCG RM lots error:', error)
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
        const validation = createRmLotSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...lotData } = validation.data

        const existing = await FmcgRmLot.findOne({
          workspaceId,
          internalLotNumber: lotData.internalLotNumber,
        })
        if (existing) {
          return NextResponse.json(
            { message: 'Internal lot number already exists in this workspace' },
            { status: 409 }
          )
        }

        const rmLot = await FmcgRmLot.create({
          ...lotData,
          workspaceId,
          receiptDate: new Date(lotData.receiptDate),
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_rm_lot_created', 'fmcg_rm_lot', {
          rmLotId: rmLot._id,
          internalLotNumber: rmLot.internalLotNumber,
          workspaceId,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'RM lot created successfully',
            rmLot: rmLot.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG RM lot error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
