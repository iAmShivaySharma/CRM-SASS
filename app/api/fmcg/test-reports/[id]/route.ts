import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgTestReport } from '@/lib/mongodb/models/FmcgTestReport'

const updateTestReportSchema = z.object({
  batchId: z.string().optional(),
  productId: z.string().optional(),
  reportNumber: z.string().optional(),
  testType: z.enum(['microbiological', 'chemical', 'physical', 'sensory', 'nutritional', 'pesticide', 'heavy_metals', 'other']).optional(),
  labName: z.string().optional(),
  labAccreditationNumber: z.string().optional(),
  sampleCollectedAt: z.string().optional(),
  reportDate: z.string().optional(),
  result: z.enum(['pass', 'fail', 'conditional_pass']).optional(),
  parameters: z.array(z.object({
    name: z.string().min(1),
    value: z.string(),
    unit: z.string().optional().default(''),
    minLimit: z.string().optional().default(''),
    maxLimit: z.string().optional().default(''),
    status: z.enum(['pass', 'fail']),
  })).optional(),
  overallObservations: z.string().max(2000).optional(),
  reportUrl: z.string().optional(),
  certificateNumber: z.string().optional(),
  validUntil: z.string().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const report = await FmcgTestReport.findOne({ _id: id, workspaceId }).lean()
        if (!report) {
          return NextResponse.json({ message: 'Test report not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, report: { ...(report as any), id: (report as any)._id } })
      } catch (error) {
        log.error('Get FMCG test report error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const body = await request.json()
        const validation = updateTestReportSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.sampleCollectedAt) updateData.sampleCollectedAt = new Date(updateData.sampleCollectedAt)
        if (updateData.reportDate) updateData.reportDate = new Date(updateData.reportDate)
        if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil)

        const report = await FmcgTestReport.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!report) {
          return NextResponse.json({ message: 'Test report not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_test_report_updated', 'fmcg_test_report', { reportId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Test report updated successfully', report: report.toJSON() })
      } catch (error) {
        log.error('Update FMCG test report error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const report = await FmcgTestReport.findOneAndDelete({ _id: id, workspaceId })

        if (!report) {
          return NextResponse.json({ message: 'Test report not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_test_report_deleted', 'fmcg_test_report', { reportId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Test report deleted successfully' })
      } catch (error) {
        log.error('Delete FMCG test report error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    }
  )
)
