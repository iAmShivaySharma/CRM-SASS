import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgTestReport } from '@/lib/mongodb/models/FmcgTestReport'

const parameterSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  unit: z.string().optional().default(''),
  minLimit: z.string().optional().default(''),
  maxLimit: z.string().optional().default(''),
  status: z.enum(['pass', 'fail']),
})

const createTestReportSchema = z.object({
  workspaceId: z.string().min(1),
  batchId: z.string().min(1),
  productId: z.string().min(1),
  reportNumber: z.string().min(1),
  testType: z.enum(['microbiological', 'chemical', 'physical', 'sensory', 'nutritional', 'pesticide', 'heavy_metals', 'other']),
  labName: z.string().min(1),
  labAccreditationNumber: z.string().optional(),
  sampleCollectedAt: z.string(),
  reportDate: z.string(),
  result: z.enum(['pass', 'fail', 'conditional_pass']),
  parameters: z.array(parameterSchema).optional().default([]),
  overallObservations: z.string().max(2000).optional(),
  reportUrl: z.string().optional(),
  certificateNumber: z.string().optional(),
  validUntil: z.string().optional(),
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
        const batchId = url.searchParams.get('batchId')
        const productId = url.searchParams.get('productId')
        const result = url.searchParams.get('result')
        const testType = url.searchParams.get('testType')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const query: any = { workspaceId }
        if (batchId) query.batchId = batchId
        if (productId) query.productId = productId
        if (result) query.result = result
        if (testType) query.testType = testType

        const skip = (page - 1) * limit

        const [reports, total] = await Promise.all([
          FmcgTestReport.find(query).sort({ reportDate: -1 }).skip(skip).limit(limit).lean(),
          FmcgTestReport.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          reports: reports.map((r: any) => ({ ...r, id: r._id })),
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
        log.error('Get FMCG test reports error:', error)
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
        const validation = createTestReportSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...reportData } = validation.data

        const existing = await FmcgTestReport.findOne({ workspaceId, reportNumber: reportData.reportNumber })
        if (existing) {
          return NextResponse.json({ message: 'Report number already exists in this workspace' }, { status: 409 })
        }

        const report = await FmcgTestReport.create({
          ...reportData,
          workspaceId,
          sampleCollectedAt: new Date(reportData.sampleCollectedAt),
          reportDate: new Date(reportData.reportDate),
          validUntil: reportData.validUntil ? new Date(reportData.validUntil) : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_test_report_created', 'fmcg_test_report', {
          reportId: report._id,
          reportNumber: report.reportNumber,
          workspaceId,
        })

        return NextResponse.json(
          { success: true, message: 'Test report created successfully', report: report.toJSON() },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG test report error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)
