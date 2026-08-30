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
import { FmcgCleaningLog } from '@/lib/mongodb/models/FmcgCleaningLog'

const cleaningEntrySchema = z.object({
  area: z.string().min(1),
  cleanedBy: z.string().min(1),
  time: z.string().min(1),
  sanitizerUsed: z.string().optional(),
  verified: z.boolean().optional(),
})

const createCleaningLogSchema = z.object({
  workspaceId: z.string().min(1),
  date: z.string(),
  shift: z.enum(['morning', 'afternoon', 'evening', 'full_day']),
  entries: z.array(cleaningEntrySchema).min(1),
  issuesNoted: z.string().optional(),
  supervisorName: z.string().min(1),
  supervisorSignOff: z.boolean().optional(),
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
        const shift = url.searchParams.get('shift')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (shift) query.shift = shift
        if (dateFrom || dateTo) {
          query.date = {}
          if (dateFrom) query.date.$gte = new Date(dateFrom)
          if (dateTo) query.date.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [cleaningLogs, total] = await Promise.all([
          FmcgCleaningLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgCleaningLog.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          cleaningLogs: cleaningLogs.map((c: any) => ({ ...c, id: c._id })),
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
        log.error('Get FMCG cleaning logs error:', error)
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
        const validation = createCleaningLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...logData } = validation.data

        const cleaningLog = await FmcgCleaningLog.create({
          ...logData,
          workspaceId,
          date: new Date(logData.date),
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_cleaning_log_created',
          'fmcg_cleaning_log',
          {
            cleaningLogId: cleaningLog._id,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Cleaning log created successfully',
            cleaningLog: cleaningLog.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG cleaning log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
