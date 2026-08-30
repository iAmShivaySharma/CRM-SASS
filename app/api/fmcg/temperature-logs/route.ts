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
import { FmcgTemperatureLog } from '@/lib/mongodb/models/FmcgTemperatureLog'

const createTemperatureLogSchema = z.object({
  workspaceId: z.string().min(1),
  date: z.string(),
  location: z.string().min(1),
  temperature: z.number(),
  humidity: z.number().optional(),
  loggedBy: z.string().min(1),
  anomalyNoted: z.boolean().optional(),
  anomalyDescription: z.string().optional(),
  actionTaken: z.string().optional(),
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
        const location = url.searchParams.get('location')
        const anomalyNoted = url.searchParams.get('anomalyNoted')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (location) query.location = location
        if (anomalyNoted !== null && anomalyNoted !== undefined) {
          query.anomalyNoted = anomalyNoted === 'true'
        }
        if (dateFrom || dateTo) {
          query.date = {}
          if (dateFrom) query.date.$gte = new Date(dateFrom)
          if (dateTo) query.date.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [temperatureLogs, total] = await Promise.all([
          FmcgTemperatureLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgTemperatureLog.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          temperatureLogs: temperatureLogs.map((t: any) => ({
            ...t,
            id: t._id,
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
        log.error('Get FMCG temperature logs error:', error)
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
        const validation = createTemperatureLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...logData } = validation.data

        const temperatureLog = await FmcgTemperatureLog.create({
          ...logData,
          workspaceId,
          date: new Date(logData.date),
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_temperature_log_created',
          'fmcg_temperature_log',
          {
            temperatureLogId: temperatureLog._id,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Temperature log created successfully',
            temperatureLog: temperatureLog.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG temperature log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
