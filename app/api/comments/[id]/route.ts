import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Comment } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { invalidateCache } from '@/lib/redis/cache'

const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
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

        const comment = await Comment.findById(id)
          .populate('createdBy', 'fullName email avatarUrl')
          .populate('editHistory.editedBy', 'fullName email avatarUrl')
          .populate('deletedBy', 'fullName email avatarUrl')

        if (!comment) {
          return NextResponse.json(
            { message: 'Comment not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ comment: comment.toJSON() })
      } catch (error) {
        log.error('Get comment error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.stack
                  : undefined
                : undefined,
          },
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
        const body = await request.json()

        const validationResult = updateCommentSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const comment = await Comment.findById(id)
        if (!comment) {
          return NextResponse.json(
            { message: 'Comment not found' },
            { status: 404 }
          )
        }

        if (comment.isDeleted) {
          return NextResponse.json(
            { message: 'Cannot edit a deleted comment' },
            { status: 400 }
          )
        }

        if (comment.createdBy.toString() !== auth.user.id) {
          return NextResponse.json(
            { message: 'You can only edit your own comments' },
            { status: 403 }
          )
        }

        // Push current content to edit history before updating
        comment.editHistory.push({
          content: comment.content,
          editedBy: auth.user.id,
          editedAt: new Date(),
        })

        comment.content = validationResult.data.content
        comment.isEdited = true
        comment.editedAt = new Date()

        await comment.save()
        await comment.populate('createdBy', 'fullName email avatarUrl')
        await comment.populate(
          'editHistory.editedBy',
          'fullName email avatarUrl'
        )

        await logUserActivity(
          auth.user.id,
          'comments.update',
          `Edited comment on ${comment.entityType}: ${comment.entityId}`,
          {
            entityType: 'Comment',
            commentId: comment._id,
            parentEntityType: comment.entityType,
            parentEntityId: comment.entityId,
          }
        )

        await invalidateCache(
          `comments:${comment.entityType}:${comment.entityId}`
        )

        return NextResponse.json({ comment: comment.toJSON() })
      } catch (error) {
        log.error('Update comment error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.stack
                  : undefined
                : undefined,
          },
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

        const comment = await Comment.findById(id)
        if (!comment) {
          return NextResponse.json(
            { message: 'Comment not found' },
            { status: 404 }
          )
        }

        if (comment.createdBy.toString() !== auth.user.id) {
          return NextResponse.json(
            { message: 'You can only delete your own comments' },
            { status: 403 }
          )
        }

        // Soft delete — preserves edit history
        comment.isDeleted = true
        comment.deletedAt = new Date()
        comment.deletedBy = auth.user.id
        await comment.save()

        await logUserActivity(
          auth.user.id,
          'comments.delete',
          `Deleted comment on ${comment.entityType}: ${comment.entityId}`,
          {
            entityType: 'Comment',
            commentId: comment._id,
            parentEntityType: comment.entityType,
            parentEntityId: comment.entityId,
          }
        )

        await invalidateCache(
          `comments:${comment.entityType}:${comment.entityId}`
        )

        return NextResponse.json({ success: true })
      } catch (error) {
        log.error('Delete comment error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.stack
                  : undefined
                : undefined,
          },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
