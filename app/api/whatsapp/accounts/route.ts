import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createAccountSchema = z.object({
  provider: z.enum(['meta_cloud', 'wati', 'aisensy', 'gupshup']).optional(),
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().optional(),
  displayName: z.string().min(1).max(100),
  phoneNumber: z.string().min(10).max(15),
  accessToken: z.string().min(1),
  webhookVerifyToken: z.string().optional(),
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
          'leads.view'
        )
        if (permError) return permError

        const accounts = await WhatsAppAccount.find({
          workspaceId,
          isActive: true,
        })
          .sort({ createdAt: -1 })
          .lean()

        return NextResponse.json({
          success: true,
          accounts: accounts.map((a: any) => ({
            ...a,
            id: a._id,
            accessToken: undefined,
          })),
        })
      } catch (error) {
        log.error('Get WhatsApp accounts error:', error)
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
        const validationResult = createAccountSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = body
        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const account = await WhatsAppAccount.create({
          ...validationResult.data,
          workspaceId,
          createdBy: auth.user.id,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'WhatsApp account connected successfully',
            account: account.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'This phone number is already connected' },
            { status: 400 }
          )
        }
        log.error('Create WhatsApp account error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
