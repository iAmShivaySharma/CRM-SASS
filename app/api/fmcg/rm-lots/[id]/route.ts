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

const updateRmLotSchema = z.object({
  receiptDate: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierFssaiNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  materialName: z.string().optional(),
  quantityReceived: z.number().optional(),
  unit: z.string().optional(),
  supplierLotNumber: z.string().optional(),
  internalLotNumber: z.string().optional(),
  testStatus: z.enum(['accepted', 'rejected', 'under_test']).optional(),
  storageLocation: z.string().optional(),
  remarks: z.string().optional(),
  receivedBy: z.string().optional(),
})

export const GET = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const rmLot = await FmcgRmLot.findOne({ _id: id, workspaceId }).lean()
        if (!rmLot) {
          return NextResponse.json(
            { message: 'RM lot not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          rmLot: { ...(rmLot as any), id: (rmLot as any)._id },
        })
      } catch (error) {
        log.error('Get FMCG RM lot error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validation = updateRmLotSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.receiptDate) {
          updateData.receiptDate = new Date(updateData.receiptDate)
        }

        const rmLot = await FmcgRmLot.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!rmLot) {
          return NextResponse.json(
            { message: 'RM lot not found' },
            { status: 404 }
          )
        }

        logUserActivity(auth.user.id, 'fmcg_rm_lot_updated', 'fmcg_rm_lot', {
          rmLotId: id,
          workspaceId,
        })

        return NextResponse.json({
          success: true,
          message: 'RM lot updated successfully',
          rmLot: rmLot.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG RM lot error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const rmLot = await FmcgRmLot.findOneAndDelete({ _id: id, workspaceId })

        if (!rmLot) {
          return NextResponse.json(
            { message: 'RM lot not found' },
            { status: 404 }
          )
        }

        logUserActivity(auth.user.id, 'fmcg_rm_lot_deleted', 'fmcg_rm_lot', {
          rmLotId: id,
          workspaceId,
        })

        return NextResponse.json({
          success: true,
          message: 'RM lot deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG RM lot error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
