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
import { FmcgPestLog } from '@/lib/mongodb/models/FmcgPestLog'

const pestEntrySchema = z.object({
  area: z.string().min(1),
  evidenceFound: z.boolean(),
  actionTaken: z.string().optional(),
})

const createPestLogSchema = z.object({
  workspaceId: z.string().min(1),
  weekEnding: z.string(),
  type: z.enum(['internal_check', 'pco_visit']),
  entries: z.array(pestEntrySchema).min(1),
  pcoName: z.string().optional(),
  pcoLicenseNumber: z.string().optional(),
  treatmentChemicals: z.string().optional(),
  checkedBy: z.string().min(1),
  findings: z.string().optional(),
  reportUrl: z.string().optional(),
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
        const type = url.searchParams.get('type')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (type) query.type = type
        if (dateFrom || dateTo) {
          query.weekEnding = {}
          if (dateFrom) query.weekEnding.$gte = new Date(dateFrom)
          if (dateTo) query.weekEnding.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [pestLogs, total] = await Promise.all([
          FmcgPestLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgPestLog.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          pestLogs: pestLogs.map((p: any) => ({ ...p, id: p._id })),
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
        log.error('Get FMCG pest logs error:', error)
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
        const validation = createPestLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...logData } = validation.data

        const pestLog = await FmcgPestLog.create({
          ...logData,
          workspaceId,
          weekEnding: new Date(logData.weekEnding),
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_pest_log_created',
          'fmcg_pest_log',
          {
            pestLogId: pestLog._id,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Pest log created successfully',
            pestLog: pestLog.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG pest log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
