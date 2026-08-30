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
import { FmcgCalibrationLog } from '@/lib/mongodb/models/FmcgCalibrationLog'

const updateCalibrationLogSchema = z.object({
  equipmentName: z.string().optional(),
  equipmentId: z.string().optional(),
  calibrationDate: z.string().optional(),
  nextDueDate: z.string().optional(),
  method: z.string().optional(),
  result: z.enum(['pass', 'fail', 'adjusted']).optional(),
  referenceStandard: z.string().optional(),
  deviationFound: z.string().optional(),
  correctionApplied: z.string().optional(),
  calibratedBy: z.string().optional(),
  notes: z.string().optional(),
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

        const calibrationLog = await FmcgCalibrationLog.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!calibrationLog) {
          return NextResponse.json(
            { message: 'Calibration log not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          calibrationLog: {
            ...(calibrationLog as any),
            id: (calibrationLog as any)._id,
          },
        })
      } catch (error) {
        log.error('Get FMCG calibration log error:', error)
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
        const validation = updateCalibrationLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.calibrationDate)
          updateData.calibrationDate = new Date(updateData.calibrationDate)
        if (updateData.nextDueDate)
          updateData.nextDueDate = new Date(updateData.nextDueDate)

        const calibrationLog = await FmcgCalibrationLog.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!calibrationLog) {
          return NextResponse.json(
            { message: 'Calibration log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_calibration_log_updated',
          'fmcg_calibration_log',
          { calibrationLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Calibration log updated successfully',
          calibrationLog: calibrationLog.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG calibration log error:', error)
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

        const calibrationLog = await FmcgCalibrationLog.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!calibrationLog) {
          return NextResponse.json(
            { message: 'Calibration log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_calibration_log_deleted',
          'fmcg_calibration_log',
          { calibrationLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Calibration log deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG calibration log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
