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

const updateCleaningLogSchema = z.object({
  date: z.string().optional(),
  shift: z.enum(['morning', 'afternoon', 'evening', 'full_day']).optional(),
  entries: z.array(cleaningEntrySchema).optional(),
  issuesNoted: z.string().optional(),
  supervisorName: z.string().optional(),
  supervisorSignOff: z.boolean().optional(),
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

        const cleaningLog = await FmcgCleaningLog.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!cleaningLog) {
          return NextResponse.json(
            { message: 'Cleaning log not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          cleaningLog: {
            ...(cleaningLog as any),
            id: (cleaningLog as any)._id,
          },
        })
      } catch (error) {
        log.error('Get FMCG cleaning log error:', error)
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
        const validation = updateCleaningLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.date) updateData.date = new Date(updateData.date)

        const cleaningLog = await FmcgCleaningLog.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!cleaningLog) {
          return NextResponse.json(
            { message: 'Cleaning log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_cleaning_log_updated',
          'fmcg_cleaning_log',
          { cleaningLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Cleaning log updated successfully',
          cleaningLog: cleaningLog.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG cleaning log error:', error)
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

        const cleaningLog = await FmcgCleaningLog.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!cleaningLog) {
          return NextResponse.json(
            { message: 'Cleaning log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_cleaning_log_deleted',
          'fmcg_cleaning_log',
          { cleaningLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Cleaning log deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG cleaning log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
