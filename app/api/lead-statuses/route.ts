import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { LeadStatus, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const createLeadStatusSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  description: z.string().max(200).optional(),
  order: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
})

// GET /api/lead-statuses - Get lead statuses for a workspace
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

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

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Get lead statuses for the workspace
        const statuses = await LeadStatus.find({
          workspaceId,
          isActive: true,
        }).sort({ order: 1, name: 1 })

        logBusinessEvent('lead_statuses_listed', auth.user.id, workspaceId, {
          count: statuses.length,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          statuses: statuses.map(status => status.toJSON()),
        })
      } catch (error) {
        log.error('Get lead statuses error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: false,
      logHeaders: true,
    }
  )
)

// POST /api/lead-statuses - Create a new lead status
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

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
        const validationResult = createLeadStatusSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { name, color, description, order, isDefault } =
          validationResult.data
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Check if status name already exists in workspace
        const existingStatus = await LeadStatus.findOne({ workspaceId, name })
        if (existingStatus) {
          return NextResponse.json(
            { message: 'Status name already exists in this workspace' },
            { status: 409 }
          )
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
          await LeadStatus.updateMany(
            { workspaceId, isDefault: true },
            { isDefault: false }
          )
        }

        // Get next order if not provided
        let finalOrder = order
        if (finalOrder === undefined) {
          const lastStatus = await LeadStatus.findOne({ workspaceId }).sort({
            order: -1,
          })
          finalOrder = (lastStatus?.order || 0) + 1
        }

        // Create status
        const status = await LeadStatus.create({
          workspaceId,
          name,
          color,
          description,
          order: finalOrder,
          isDefault: isDefault || false,
          createdBy: auth.user.id,
        })

        // Log activity
        logUserActivity(auth.user.id, 'lead_status_created', 'lead_status', {
          statusId: status._id,
          statusName: name,
          workspaceId,
        })

        logBusinessEvent('lead_status_created', auth.user.id, workspaceId, {
          statusName: name,
          color,
          isDefault,
          duration: Date.now() - startTime,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Lead status created successfully',
            status: status.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create lead status error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: true,
      logHeaders: true,
    }
  )
)
