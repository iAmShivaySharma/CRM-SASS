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

const updateTemperatureLogSchema = z.object({
  date: z.string().optional(),
  location: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  loggedBy: z.string().optional(),
  anomalyNoted: z.boolean().optional(),
  anomalyDescription: z.string().optional(),
  actionTaken: z.string().optional(),
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

        const temperatureLog = await FmcgTemperatureLog.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!temperatureLog) {
          return NextResponse.json(
            { message: 'Temperature log not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          temperatureLog: {
            ...(temperatureLog as any),
            id: (temperatureLog as any)._id,
          },
        })
      } catch (error) {
        log.error('Get FMCG temperature log error:', error)
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
        const validation = updateTemperatureLogSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.date) updateData.date = new Date(updateData.date)

        const temperatureLog = await FmcgTemperatureLog.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!temperatureLog) {
          return NextResponse.json(
            { message: 'Temperature log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_temperature_log_updated',
          'fmcg_temperature_log',
          { temperatureLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Temperature log updated successfully',
          temperatureLog: temperatureLog.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG temperature log error:', error)
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

        const temperatureLog = await FmcgTemperatureLog.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!temperatureLog) {
          return NextResponse.json(
            { message: 'Temperature log not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_temperature_log_deleted',
          'fmcg_temperature_log',
          { temperatureLogId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Temperature log deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG temperature log error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
