import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppTemplate } from '@/lib/mongodb/models/WhatsAppTemplate'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createTemplateSchema = z.object({
  accountId: z.string().min(1),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
  language: z.string().max(10).optional(),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).optional(),
  headerType: z.enum(['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO']).optional(),
  headerContent: z.string().optional(),
  bodyText: z.string().min(1).max(1024),
  footerText: z.string().max(60).optional(),
  buttons: z
    .array(
      z.object({
        type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
        text: z.string().max(25),
        url: z.string().optional(),
        phoneNumber: z.string().optional(),
      })
    )
    .optional(),
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
        const accountId = url.searchParams.get('accountId')
        const status = url.searchParams.get('status')

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
        if (accountId) query.accountId = accountId
        if (status) query.status = status

        const templates = await WhatsAppTemplate.find(query)
          .sort({ createdAt: -1 })
          .lean()

        return NextResponse.json({
          success: true,
          templates: templates.map((t: any) => ({ ...t, id: t._id })),
        })
      } catch (error) {
        log.error('Get WhatsApp templates error:', error)
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

        // Extract variables from body ({{1}}, {{2}} pattern)
        const variableMatches =
          validationResult.data.bodyText.match(/\{\{\d+\}\}/g)
        const variables = variableMatches
          ? variableMatches.map(m => m.replace(/\{\{|\}\}/g, ''))
          : []

        const template = await WhatsAppTemplate.create({
          ...validationResult.data,
          workspaceId,
          variables,
          status: 'PENDING',
          createdBy: auth.user.id,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'WhatsApp template created',
            template: template.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            {
              message: 'A template with this name and language already exists',
            },
            { status: 400 }
          )
        }
        log.error('Create WhatsApp template error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
