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

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  projectId: z.string(),
  status: z.string().default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  sprintId: z.string().optional(),
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

async function checkProjectTaskAccess(projectId: string, userId: string) {
  const project = await Project.findById(projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    status: 'active',
  })

  if (
    !projectMember &&
    project.visibility !== 'workspace' &&
    project.visibility !== 'public'
  ) {
    return null
  }

  return project
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
        const projectId = url.searchParams.get('projectId')
        const workspaceId = url.searchParams.get('workspaceId')
        const status = url.searchParams.get('status')
        const assigneeId = url.searchParams.get('assigneeId')
        const search = url.searchParams.get('search')
        const sprintId = url.searchParams.get('sprintId')

        const query: any = {}

        if (projectId) {
          const project = await checkProjectTaskAccess(projectId, auth.user.id)
          if (!project) {
            return NextResponse.json(
              { message: 'Project not found or access denied' },
              { status: 404 }
            )
          }
          const permError = await checkPermission(
            auth.user.id,
            project.workspaceId.toString(),
            'tasks.view'
          )
          if (permError) return permError
          query.projectId = projectId
        } else if (workspaceId) {
          const permError = await checkPermission(
            auth.user.id,
            workspaceId,
            'tasks.view'
          )
          if (permError) return permError
          const workspaceProjects = await Project.find({
            workspaceId,
          }).select('_id')

          const workspaceProjectIds = workspaceProjects.map(p =>
            p._id.toString()
          )

          const userProjects = await ProjectMember.find({
            userId: auth.user.id,
            status: 'active',
            projectId: { $in: workspaceProjectIds },
          }).select('projectId')

          const publicProjects = await Project.find({
            workspaceId,
            $or: [{ visibility: 'workspace' }, { visibility: 'public' }],
          }).select('_id')

          const accessibleProjectIds = [
            ...userProjects.map(pm => pm.projectId),
            ...publicProjects.map(p => p._id.toString()),
          ]

          if (accessibleProjectIds.length === 0) {
            return NextResponse.json({ tasks: [] })
          }

          query.projectId = { $in: accessibleProjectIds }
        } else {
          return NextResponse.json(
            { message: 'Either projectId or workspaceId is required' },
            { status: 400 }
          )
        }

        if (status) query.status = status
        if (assigneeId) query.assigneeId = assigneeId
        if (sprintId === 'backlog') {
          query.sprintId = { $exists: false }
        } else if (sprintId) {
          query.sprintId = sprintId
        }
        if (search) {
          query.$text = { $search: search }
        }

        const tasks = await Task.find(query)
          .populate('assigneeId', 'fullName email avatarUrl')
          .sort({ order: 1, createdAt: -1 })
          .lean()

        const formattedTasks = tasks.map(task => ({
          ...task,
          id: task._id,
          assignee: task.assigneeId,
        }))

        await logUserActivity(
          auth.user.id,
          'tasks.list',
          projectId
            ? `Listed tasks for project: ${projectId}`
            : `Listed tasks for workspace: ${workspaceId}`,
          {
            entityType: 'Task',
            projectId,
            workspaceId,
            filters: { status, assigneeId, search },
          }
        )

        return NextResponse.json({ tasks: formattedTasks })
      } catch (error) {
        log.error('Get tasks error:', error)
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

        const validationResult = createTaskSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const project = await checkProjectTaskAccess(
          validationResult.data.projectId,
          auth.user.id
        )
        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          project.workspaceId.toString(),
          'tasks.create'
        )
        if (permError) return permError

        const lastTask = await Task.findOne({
          projectId: validationResult.data.projectId,
          status: validationResult.data.status,
        }).sort({ order: -1 })

        const order = lastTask ? lastTask.order + 1 : 0

        const task = new Task({
          ...validationResult.data,
          workspaceId: project.workspaceId,
          createdBy: auth.user.id,
          order,
        })

        await task.save()

        await task.populate('assigneeId', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'tasks.create',
          `Created task: ${task.title}`,
          {
            entityType: 'Task',
            taskId: task._id,
            projectId: validationResult.data.projectId,
          }
        )

        return NextResponse.json({
          task: {
            ...task.toJSON(),
            assignee: task.assigneeId,
          },
        })
      } catch (error) {
        log.error('Create task error:', error)
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
