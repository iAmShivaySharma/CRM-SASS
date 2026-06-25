import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Task, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  sprintId: z.string().nullable().optional(),
  order: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number(),
      })
    )
    .optional(),
})

async function checkTaskAccess(taskId: string, userId: string) {
  const task = await Task.findById(taskId)
  if (!task) return null

  const project = (await Project.findById(task.projectId).lean()) as any
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId: task.projectId,
    userId,
    status: 'active',
  }).lean()

  if (
    !projectMember &&
    project.visibility !== 'workspace' &&
    project.visibility !== 'public'
  ) {
    return null
  }

  return { task, project }
}

export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id } = await params
        const taskData = await checkTaskAccess(id, auth.user.id)

        if (!taskData) {
          return NextResponse.json(
            { message: 'Task not found' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          taskData.project.workspaceId.toString(),
          'tasks.view'
        )
        if (permError) return permError

        await taskData.task.populate('assigneeId', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'tasks.view',
          `Viewed task: ${taskData.task.title}`,
          { entityType: 'Task', taskId: id }
        )

        return NextResponse.json({
          task: {
            ...taskData.task.toJSON(),
            assignee: taskData.task.assigneeId,
          },
        })
      } catch (error) {
        log.error('Get task error:', error)
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
    {
      logBody: false,
      logHeaders: true,
    }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id } = await params
        const taskData = await checkTaskAccess(id, auth.user.id)

        if (!taskData) {
          return NextResponse.json(
            { message: 'Task not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          taskData.project.workspaceId.toString(),
          'tasks.edit'
        )
        if (permError) return permError

        const body = await request.json()

        const validationResult = updateTaskSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const updateData: any = {
          ...validationResult.data,
          updatedAt: new Date(),
        }

        // Handle null sprintId — remove from sprint (backlog)
        if (updateData.sprintId === null) {
          delete updateData.sprintId
          await Task.findByIdAndUpdate(id, { $unset: { sprintId: '' } })
        }

        const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
          new: true,
        })

        await updatedTask?.populate('assigneeId', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'tasks.update',
          `Updated task: ${updatedTask?.title}`,
          { entityType: 'Task', taskId: id, changes: validationResult.data }
        )

        return NextResponse.json({
          task: {
            ...updatedTask?.toJSON(),
            assignee: updatedTask?.assigneeId,
          },
        })
      } catch (error) {
        log.error('Update task error:', error)
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
    {
      logBody: true,
      logHeaders: true,
    }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id } = await params
        const taskData = await checkTaskAccess(id, auth.user.id)

        if (!taskData) {
          return NextResponse.json(
            { message: 'Task not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          taskData.project.workspaceId.toString(),
          'tasks.delete'
        )
        if (permError) return permError

        await Task.findByIdAndDelete(id)

        await logUserActivity(
          auth.user.id,
          'tasks.delete',
          `Deleted task: ${taskData.task.title}`,
          { entityType: 'Task', taskId: id }
        )

        return NextResponse.json({ success: true })
      } catch (error) {
        log.error('Delete task error:', error)
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
    {
      logBody: false,
      logHeaders: true,
    }
  )
)
