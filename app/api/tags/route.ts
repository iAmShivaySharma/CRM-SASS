import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Tag, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  description: z.string().max(200).optional(),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  description: z.string().max(200).optional(),
})

// GET /api/tags - Get tags for a workspace
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

        // Get tags for the workspace
        const tags = await Tag.find({ workspaceId }).sort({ name: 1 })

        logBusinessEvent('tags_listed', auth.user.id, workspaceId, {
          count: tags.length,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          tags: tags.map(tag => tag.toJSON()),
        })
      } catch (error) {
        log.error('Get tags error:', error)
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

// POST /api/tags - Create a new tag
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
        const validationResult = createTagSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { name, color, description } = validationResult.data
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

        // Check if tag name already exists in workspace
        const existingTag = await Tag.findOne({ workspaceId, name })
        if (existingTag) {
          return NextResponse.json(
            { message: 'Tag name already exists in this workspace' },
            { status: 409 }
          )
        }

        // Create tag
        const tag = await Tag.create({
          workspaceId,
          name,
          color,
          description,
          createdBy: auth.user.id,
        })

        // Log activity
        logUserActivity(auth.user.id, 'tag_created', 'tag', {
          tagId: tag._id,
          tagName: name,
          workspaceId,
        })

        logBusinessEvent('tag_created', auth.user.id, workspaceId, {
          tagName: name,
          color,
          duration: Date.now() - startTime,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Tag created successfully',
            tag: tag.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create tag error:', error)
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
