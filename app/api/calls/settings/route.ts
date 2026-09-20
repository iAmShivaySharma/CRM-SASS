import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { CallSettings, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const settingsSchema = z.object({
  workspaceId: z.string().min(1),
  provider: z.enum(['telecmi', 'exotel', 'custom']),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  callerId: z.string().min(1),
  webhookUrl: z.string().optional(),
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

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'settings.view'
        )
        if (permError) return permError

        const settings = await CallSettings.findOne({ workspaceId }).lean()

        return NextResponse.json({
          success: true,
          settings: settings
            ? { ...settings, id: (settings as any)._id }
            : null,
        })
      } catch (error) {
        log.error('Get call settings error:', error)
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
        const validationResult = settingsSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'settings.manage'
        )
        if (permError) return permError

        const settings = await CallSettings.findOneAndUpdate(
          { workspaceId },
          {
            ...validationResult.data,
            createdBy: auth.user.id,
            isActive: true,
          },
          { upsert: true, new: true }
        )

        return NextResponse.json({
          success: true,
          settings: settings.toJSON(),
        })
      } catch (error) {
        log.error('Save call settings error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
