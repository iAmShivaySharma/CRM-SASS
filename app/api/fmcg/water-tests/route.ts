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
import { FmcgWaterTest } from '@/lib/mongodb/models/FmcgWaterTest'

const waterTestParameterSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['pass', 'fail']),
})

const createWaterTestSchema = z.object({
  workspaceId: z.string().min(1),
  testDate: z.string(),
  labName: z.string().min(1),
  labAccreditationNumber: z.string().optional(),
  sampleSource: z.string().min(1),
  parameters: z.array(waterTestParameterSchema).min(1),
  overallResult: z.enum(['pass', 'fail']),
  validUntil: z.string(),
  reportUrl: z.string().optional(),
  remarks: z.string().optional(),
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
        const overallResult = url.searchParams.get('overallResult')
        const sampleSource = url.searchParams.get('sampleSource')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (overallResult) query.overallResult = overallResult
        if (sampleSource) query.sampleSource = sampleSource
        if (dateFrom || dateTo) {
          query.testDate = {}
          if (dateFrom) query.testDate.$gte = new Date(dateFrom)
          if (dateTo) query.testDate.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [waterTests, total] = await Promise.all([
          FmcgWaterTest.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgWaterTest.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          waterTests: waterTests.map((w: any) => ({ ...w, id: w._id })),
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
        log.error('Get FMCG water tests error:', error)
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
        const validation = createWaterTestSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...testData } = validation.data

        const waterTest = await FmcgWaterTest.create({
          ...testData,
          workspaceId,
          testDate: new Date(testData.testDate),
          validUntil: new Date(testData.validUntil),
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_water_test_created',
          'fmcg_water_test',
          {
            waterTestId: waterTest._id,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Water test created successfully',
            waterTest: waterTest.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG water test error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
