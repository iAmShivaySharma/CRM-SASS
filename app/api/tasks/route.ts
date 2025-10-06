import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Task, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

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
  dependencies: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
})

async function checkProjectTaskAccess(projectId: string, userId: string) {
  const project = await Project.findById(projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    status: 'active',
  })

  if (!projectMember && project.visibility !== 'workspace' && project.visibility !== 'public') {
    return null
  }

  return project
}

// GET /api/tasks - Get tasks for a project
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== TASKS API DEBUG START ===')

      try {
        console.log('Connecting to MongoDB...')
        await connectToMongoDB()
        console.log('MongoDB connected successfully')

        console.log('Verifying auth token...')
        const auth = await verifyAuthToken(request)
        if (!auth) {
          console.log('Auth failed, returning 401')
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

        console.log('Request params:', { projectId, workspaceId, status, assigneeId, search })

        let query: any = {}

        if (projectId) {
          // Single project query
          console.log('Checking project access...')
          const project = await checkProjectTaskAccess(projectId, auth.user.id)
          if (!project) {
            console.log('Project not found or access denied')
            return NextResponse.json(
              { message: 'Project not found or access denied' },
              { status: 404 }
            )
          }
          query.projectId = projectId
          console.log('Project access confirmed')
        } else if (workspaceId) {
          // All projects in workspace query
          console.log('Fetching tasks for all projects in workspace...')

          // Get all projects in workspace that user has access to
          const userProjects = await ProjectMember.find({
            userId: auth.user.id,
            status: 'active',
          }).select('projectId')

          const publicProjects = await Project.find({
            workspaceId,
            $or: [
              { visibility: 'workspace' },
              { visibility: 'public' }
            ]
          }).select('_id')

          const accessibleProjectIds = [
            ...userProjects.map(pm => pm.projectId),
            ...publicProjects.map(p => p._id.toString())
          ]

          if (accessibleProjectIds.length === 0) {
            return NextResponse.json({ tasks: [] })
          }

          query.projectId = { $in: accessibleProjectIds }
          console.log('Found accessible projects:', accessibleProjectIds.length)
        } else {
          return NextResponse.json(
            { message: 'Either projectId or workspaceId is required' },
            { status: 400 }
          )
        }

        // Add additional filters
        if (status) query.status = status
        if (assigneeId) query.assigneeId = assigneeId
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ]
        }

        console.log('Built query:', JSON.stringify(query))

        const tasks = await Task.find(query)
          .populate('assigneeId', 'fullName email avatarUrl')
          .sort({ order: 1, createdAt: -1 })
          .lean()

        console.log('Retrieved tasks:', tasks.length)

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
          { entityType: 'Task', projectId, workspaceId, filters: { status, assigneeId, search } }
        )

        const endTime = Date.now()
        console.log(`=== TASKS API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({ tasks: formattedTasks })
      } catch (error) {
        console.error('=== TASKS API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// POST /api/tasks - Create a new task
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== CREATE TASK API DEBUG START ===')

      try {
        console.log('Connecting to MongoDB...')
        await connectToMongoDB()
        console.log('MongoDB connected successfully')

        console.log('Verifying auth token...')
        const auth = await verifyAuthToken(request)
        if (!auth) {
          console.log('Auth failed, returning 401')
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))

        const validationResult = createTaskSchema.safeParse(body)

        if (!validationResult.success) {
          console.log('Validation failed:', validationResult.error.errors)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        console.log('Checking project access...')
        const project = await checkProjectTaskAccess(validationResult.data.projectId, auth.user.id)
        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        console.log('Project access confirmed')

        // Get the highest order number for the status
        const lastTask = await Task.findOne({
          projectId: validationResult.data.projectId,
          status: validationResult.data.status,
        }).sort({ order: -1 })

        const order = lastTask ? lastTask.order + 1 : 0

        console.log('Creating new task with order:', order)

        const task = new Task({
          ...validationResult.data,
          workspaceId: project.workspaceId,
          createdBy: auth.user.id,
          order,
        })

        await task.save()
        console.log('Task created with ID:', task._id)

        // Populate the assignee for response
        await task.populate('assigneeId', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'tasks.create',
          `Created task: ${task.title}`,
          { entityType: 'Task', taskId: task._id, projectId: validationResult.data.projectId }
        )

        const endTime = Date.now()
        console.log(`=== CREATE TASK API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          task: {
            ...task.toJSON(),
            assignee: task.assigneeId,
          },
        })
      } catch (error) {
        console.error('=== CREATE TASK API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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