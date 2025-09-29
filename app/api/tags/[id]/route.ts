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

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  description: z.string().max(200).optional(),
})

// GET /api/tags/[id] - Get tag details
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
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

        const { id: tagId } = params

        // Get tag
        const tag = await Tag.findById(tagId)
        if (!tag) {
          return NextResponse.json(
            { message: 'Tag not found' },
            { status: 404 }
          )
        }

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId: tag.workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        logBusinessEvent('tag_viewed', auth.user.id, tag.workspaceId, {
          tagId,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          tag: tag.toJSON(),
        })
      } catch (error) {
        log.error('Get tag error:', error)
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

// PUT /api/tags/[id] - Update tag
export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
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

        const { id: tagId } = params
        const body = await request.json()

        const validationResult = updateTagSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        // Get tag
        const tag = await Tag.findById(tagId)
        if (!tag) {
          return NextResponse.json(
            { message: 'Tag not found' },
            { status: 404 }
          )
        }

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId: tag.workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Check if new name conflicts with existing tag
        if (
          validationResult.data.name &&
          validationResult.data.name !== tag.name
        ) {
          const existingTag = await Tag.findOne({
            workspaceId: tag.workspaceId,
            name: validationResult.data.name,
            _id: { $ne: tagId },
          })
          if (existingTag) {
            return NextResponse.json(
              { message: 'Tag name already exists in this workspace' },
              { status: 409 }
            )
          }
        }

        // Update tag
        const updatedTag = await Tag.findByIdAndUpdate(
          tagId,
          validationResult.data,
          { new: true }
        )

        // Log activity
        logUserActivity(auth.user.id, 'tag_updated', 'tag', {
          tagId,
          tagName: updatedTag?.name,
          workspaceId: tag.workspaceId,
          changes: Object.keys(validationResult.data),
        })

        logBusinessEvent('tag_updated', auth.user.id, tag.workspaceId, {
          tagId,
          changes: validationResult.data,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Tag updated successfully',
          tag: updatedTag?.toJSON(),
        })
      } catch (error) {
        log.error('Update tag error:', error)
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

// DELETE /api/tags/[id] - Delete tag
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
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

        const { id: tagId } = params

        // Get tag
        const tag = await Tag.findById(tagId)
        if (!tag) {
          return NextResponse.json(
            { message: 'Tag not found' },
            { status: 404 }
          )
        }

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId: tag.workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Delete tag
        await Tag.findByIdAndDelete(tagId)

        // Log activity
        logUserActivity(auth.user.id, 'tag_deleted', 'tag', {
          tagId,
          tagName: tag.name,
          workspaceId: tag.workspaceId,
        })

        logBusinessEvent('tag_deleted', auth.user.id, tag.workspaceId, {
          tagId,
          tagName: tag.name,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Tag deleted successfully',
        })
      } catch (error) {
        log.error('Delete tag error:', error)
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
