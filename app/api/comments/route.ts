import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Comment,
  Task,
  Project,
  ProjectDocument,
  ProjectMember,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { cached, invalidateCache } from '@/lib/redis/cache'

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  entityType: z.enum(['task', 'project', 'document']),
  entityId: z.string().min(1),
  parentId: z.string().optional(),
})

async function verifyEntityAccess(
  entityType: string,
  entityId: string,
  userId: string
): Promise<{ workspaceId: string } | null> {
  if (entityType === 'task') {
    const task = (await Task.findById(entityId).lean()) as any
    if (!task) return null
    const project = (await Project.findById(task.projectId).lean()) as any
    if (!project) return null
    const member = await ProjectMember.findOne({
      projectId: task.projectId,
      userId,
      status: 'active',
    })
    if (
      !member &&
      project.visibility !== 'workspace' &&
      project.visibility !== 'public'
    ) {
      return null
    }
    return { workspaceId: project.workspaceId }
  }

  if (entityType === 'project') {
    const project = (await Project.findById(entityId).lean()) as any
    if (!project) return null
    const member = await ProjectMember.findOne({
      projectId: entityId,
      userId,
      status: 'active',
    })
    if (
      !member &&
      project.visibility !== 'workspace' &&
      project.visibility !== 'public'
    ) {
      return null
    }
    return { workspaceId: project.workspaceId }
  }

  if (entityType === 'document') {
    const doc = (await ProjectDocument.findById(entityId).lean()) as any
    if (!doc) return null
    const project = (await Project.findById(doc.projectId).lean()) as any
    if (!project) return null
    const member = await ProjectMember.findOne({
      projectId: doc.projectId,
      userId,
      status: 'active',
    })
    if (
      !member &&
      project.visibility !== 'workspace' &&
      project.visibility !== 'public'
    ) {
      return null
    }
    return { workspaceId: project.workspaceId }
  }

  return null
}

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
        const entityType = url.searchParams.get('entityType')
        const entityId = url.searchParams.get('entityId')

        if (!entityType || !entityId) {
          return NextResponse.json(
            { message: 'entityType and entityId are required' },
            { status: 400 }
          )
        }

        const access = await verifyEntityAccess(
          entityType,
          entityId,
          auth.user.id
        )
        if (!access) {
          return NextResponse.json(
            { message: 'Entity not found or access denied' },
            { status: 404 }
          )
        }

        const comments = await cached(
          `comments:${entityType}:${entityId}`,
          30,
          async () =>
            Comment.find({
              entityType,
              entityId,
              isDeleted: false,
            })
              .populate('createdBy', 'fullName email avatarUrl')
              .populate('editHistory.editedBy', 'fullName email avatarUrl')
              .sort({ createdAt: 1 })
              .lean()
        )

        const formattedComments = comments.map((comment: any) => ({
          ...comment,
          id: comment._id,
        }))

        return NextResponse.json({ comments: formattedComments })
      } catch (error) {
        log.error('Get comments error:', error)
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
        const validationResult = createCommentSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { content, entityType, entityId, parentId } =
          validationResult.data

        const access = await verifyEntityAccess(
          entityType,
          entityId,
          auth.user.id
        )
        if (!access) {
          return NextResponse.json(
            { message: 'Entity not found or access denied' },
            { status: 404 }
          )
        }

        if (parentId) {
          const parentComment = await Comment.findById(parentId)
          if (!parentComment || parentComment.entityId !== entityId) {
            return NextResponse.json(
              { message: 'Parent comment not found' },
              { status: 404 }
            )
          }
        }

        const comment = new Comment({
          content,
          entityType,
          entityId,
          parentId,
          workspaceId: access.workspaceId,
          createdBy: auth.user.id,
        })

        await comment.save()
        await comment.populate('createdBy', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'comments.create',
          `Added comment on ${entityType}: ${entityId}`,
          {
            entityType: 'Comment',
            commentId: comment._id,
            parentEntityType: entityType,
            parentEntityId: entityId,
          }
        )

        await invalidateCache(`comments:${entityType}:${entityId}`)

        return NextResponse.json({
          comment: comment.toJSON(),
        })
      } catch (error) {
        log.error('Create comment error:', error)
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
