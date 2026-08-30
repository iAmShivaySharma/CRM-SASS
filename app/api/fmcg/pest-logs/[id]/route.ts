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

const updatePestLogSchema = z.object({
  weekEnding: z.string().optional(),
  type: z.enum(['internal_check', 'pco_visit']).optional(),
  entries: z.array(pestEntrySchema).optional(),
  pcoName: z.string().optional(),
  pcoLicenseNumber: z.string().optional(),
  treatmentChemicals: z.string().optional(),
  checkedBy: z.string().optional(),
  findings: z.string().optional(),
  reportUrl: z.string().optional(),
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

        const pestLog = await FmcgPestLog.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!pestLog) {
          return NextResponse.json(
            { message: 'Pest log not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          pestLog: { ...(pestLog as any), id: (pestLog as any)._id },
        })
      } catch (error) {
        log.error('Get FMCG pest log error:', error)
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
        const validation = updatePestLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.weekEnding) {
          updateData.weekEnding = new Date(updateData.weekEnding)
        }

        const pestLog = await FmcgPestLog.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!pestLog) {
          return NextResponse.json(
            { message: 'Pest log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_pest_log_updated',
          'fmcg_pest_log',
          { pestLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Pest log updated successfully',
          pestLog: pestLog.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG pest log error:', error)
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

        const pestLog = await FmcgPestLog.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!pestLog) {
          return NextResponse.json(
            { message: 'Pest log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_pest_log_deleted',
          'fmcg_pest_log',
          { pestLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Pest log deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG pest log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
