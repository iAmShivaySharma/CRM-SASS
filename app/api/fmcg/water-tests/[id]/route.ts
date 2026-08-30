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

const updateWaterTestSchema = z.object({
  testDate: z.string().optional(),
  labName: z.string().optional(),
  labAccreditationNumber: z.string().optional(),
  sampleSource: z.string().optional(),
  parameters: z.array(waterTestParameterSchema).optional(),
  overallResult: z.enum(['pass', 'fail']).optional(),
  validUntil: z.string().optional(),
  reportUrl: z.string().optional(),
  remarks: z.string().optional(),
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

        const waterTest = await FmcgWaterTest.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!waterTest) {
          return NextResponse.json(
            { message: 'Water test not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          waterTest: { ...(waterTest as any), id: (waterTest as any)._id },
        })
      } catch (error) {
        log.error('Get FMCG water test error:', error)
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
        const validation = updateWaterTestSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.testDate)
          updateData.testDate = new Date(updateData.testDate)
        if (updateData.validUntil)
          updateData.validUntil = new Date(updateData.validUntil)

        const waterTest = await FmcgWaterTest.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!waterTest) {
          return NextResponse.json(
            { message: 'Water test not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_water_test_updated',
          'fmcg_water_test',
          { waterTestId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Water test updated successfully',
          waterTest: waterTest.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG water test error:', error)
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

        const waterTest = await FmcgWaterTest.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!waterTest) {
          return NextResponse.json(
            { message: 'Water test not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_water_test_deleted',
          'fmcg_water_test',
          { waterTestId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Water test deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG water test error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
