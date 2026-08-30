import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { SmsTemplate, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  type: z.enum(['transactional', 'promotional', 'otp']).optional(),
  dltTemplateId: z.string().max(50).optional(),
  senderId: z.string().max(10).optional(),
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
        const type = url.searchParams.get('type')

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

        const query: any = { workspaceId, isActive: true }
        if (type) query.type = type

        const templates = await SmsTemplate.find(query)
          .sort({ createdAt: -1 })
          .lean()

        return NextResponse.json({
          success: true,
          templates: templates.map((t: any) => ({ ...t, id: t._id })),
        })
      } catch (error) {
        log.error('Get SMS templates error:', error)
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
        const validationResult = createTemplateSchema.safeParse(body)

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

        // Extract variables from content ({{variableName}})
        const variableMatches =
          validationResult.data.content.match(/\{\{(\w+)\}\}/g)
        const variables = variableMatches
          ? [...new Set(variableMatches.map(m => m.replace(/\{\{|\}\}/g, '')))]
          : []

        const template = await SmsTemplate.create({
          ...validationResult.data,
          workspaceId,
          variables,
          createdBy: auth.user.id,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'SMS template created successfully',
            template: template.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'A template with this name already exists' },
            { status: 400 }
          )
        }
        log.error('Create SMS template error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
