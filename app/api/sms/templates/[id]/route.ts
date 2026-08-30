import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { SmsTemplate } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(1000).optional(),
  type: z.enum(['transactional', 'promotional', 'otp']).optional(),
  dltTemplateId: z.string().max(50).optional(),
  senderId: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
})

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
        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateTemplateSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const template = await SmsTemplate.findOne({ _id: id, workspaceId })
        if (!template) {
          return NextResponse.json(
            { message: 'Template not found' },
            { status: 404 }
          )
        }

        const data = validationResult.data
        if (data.content) {
          const variableMatches = data.content.match(/\{\{(\w+)\}\}/g)
          template.variables = variableMatches
            ? [
                ...new Set(
                  variableMatches.map(m => m.replace(/\{\{|\}\}/g, ''))
                ),
              ]
            : []
        }

        Object.assign(template, data)
        await template.save()

        return NextResponse.json({
          success: true,
          message: 'Template updated successfully',
          template: template.toJSON(),
        })
      } catch (error) {
        log.error('Update SMS template error:', error)
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

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.delete'
        )
        if (permError) return permError

        const template = await SmsTemplate.findOne({ _id: id, workspaceId })
        if (!template) {
          return NextResponse.json(
            { message: 'Template not found' },
            { status: 404 }
          )
        }

        template.isActive = false
        await template.save()

        return NextResponse.json({
          success: true,
          message: 'Template deleted successfully',
        })
      } catch (error) {
        log.error('Delete SMS template error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
