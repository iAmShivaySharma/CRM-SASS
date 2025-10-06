import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Task, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  order: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
})

async function checkTaskAccess(taskId: string, userId: string) {
  const task = await Task.findById(taskId)
  if (!task) return null

  const project = await Project.findById(task.projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId: task.projectId,
    userId,
    status: 'active',
  })

  if (!projectMember && project.visibility !== 'workspace' && project.visibility !== 'public') {
    return null
  }

  return { task, project }
}

// GET /api/tasks/[id] - Get task details
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()
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

        const { id } = await params
        console.log('Task ID:', id)
        console.log('Checking task access...')
        const taskData = await checkTaskAccess(id, auth.user.id)

        if (!taskData) {
          console.log('Task not found or access denied')
          return NextResponse.json(
            { message: 'Task not found' },
            { status: 404 }
          )
        }

        console.log('Task access confirmed')

        // Populate the assignee for response
        await taskData.task.populate('assigneeId', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'tasks.view',
          `Viewed task: ${taskData.task.title}`,
          { entityType: 'Task', taskId: id }
        )

        const endTime = Date.now()
        console.log(`=== TASK DETAILS API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          task: {
            ...taskData.task.toJSON(),
            assignee: taskData.task.assigneeId,
          },
        })
      } catch (error) {
        console.error('=== TASK DETAILS API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// PUT /api/tasks/[id] - Update task
export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()


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

        const { id } = await params
        console.log('Task ID:', id)
        console.log('Checking task access...')
        const taskData = await checkTaskAccess(id, auth.user.id)

        if (!taskData) {
          console.log('Task not found or access denied')
          return NextResponse.json(
            { message: 'Task not found or access denied' },
            { status: 404 }
          )
        }

        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))

        const validationResult = updateTaskSchema.safeParse(body)

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

        console.log('Updating task...')
        // Update the task
        const updatedTask = await Task.findByIdAndUpdate(
          id,
          { ...validationResult.data, updatedAt: new Date() },
          { new: true }
        )

        // Populate the assignee for response
        await updatedTask?.populate('assigneeId', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'tasks.update',
          `Updated task: ${updatedTask?.title}`,
          { entityType: 'Task', taskId: id, changes: validationResult.data }
        )

        const endTime = Date.now()
        console.log(`=== UPDATE TASK API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          task: {
            ...updatedTask?.toJSON(),
            assignee: updatedTask?.assigneeId,
          },
        })
      } catch (error) {
        console.error('=== UPDATE TASK API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// DELETE /api/tasks/[id] - Delete task
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()


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

        const { id } = await params
        console.log('Task ID:', id)
        console.log('Checking task access...')
        const taskData = await checkTaskAccess(id, auth.user.id)

        if (!taskData) {
          console.log('Task not found or access denied')
          return NextResponse.json(
            { message: 'Task not found or access denied' },
            { status: 404 }
          )
        }

        console.log('Deleting task...')
        await Task.findByIdAndDelete(id)

        await logUserActivity(
          auth.user.id,
          'tasks.delete',
          `Deleted task: ${taskData.task.title}`,
          { entityType: 'Task', taskId: id }
        )

        const endTime = Date.now()
        console.log(`=== DELETE TASK API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('=== DELETE TASK API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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