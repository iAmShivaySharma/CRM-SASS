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

const createCalibrationLogSchema = z.object({
  workspaceId: z.string().min(1),
  equipmentName: z.string().min(1),
  equipmentId: z.string().optional(),
  calibrationDate: z.string(),
  nextDueDate: z.string(),
  method: z.string().min(1),
  result: z.enum(['pass', 'fail', 'adjusted']),
  referenceStandard: z.string().optional(),
  deviationFound: z.string().optional(),
  correctionApplied: z.string().optional(),
  calibratedBy: z.string().min(1),
  notes: z.string().optional(),
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
        const equipmentName = url.searchParams.get('equipmentName')
        const result = url.searchParams.get('result')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (equipmentName) {
          query.equipmentName = { $regex: equipmentName, $options: 'i' }
        }
        if (result) query.result = result
        if (dateFrom || dateTo) {
          query.calibrationDate = {}
          if (dateFrom) query.calibrationDate.$gte = new Date(dateFrom)
          if (dateTo) query.calibrationDate.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [calibrationLogs, total] = await Promise.all([
          FmcgCalibrationLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgCalibrationLog.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          calibrationLogs: calibrationLogs.map((c: any) => ({
            ...c,
            id: c._id,
          })),
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
        log.error('Get FMCG calibration logs error:', error)
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
        const validation = createCalibrationLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...logData } = validation.data

        const calibrationLog = await FmcgCalibrationLog.create({
          ...logData,
          workspaceId,
          calibrationDate: new Date(logData.calibrationDate),
          nextDueDate: new Date(logData.nextDueDate),
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_calibration_log_created',
          'fmcg_calibration_log',
          {
            calibrationLogId: calibrationLog._id,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Calibration log created successfully',
            calibrationLog: calibrationLog.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG calibration log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
