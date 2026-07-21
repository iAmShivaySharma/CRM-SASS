import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Sprint, Task } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

const assignTasksSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  action: z.enum(['add', 'remove']),
})

export const POST = withSecurityLogging(
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

        const validationResult = assignTasksSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const sprint = await Sprint.findById(id)
        if (!sprint) {
          return NextResponse.json(
            { message: 'Sprint not found' },
            { status: 404 }
          )
        }

        const { taskIds, action } = validationResult.data

        if (action === 'add') {
          await Task.updateMany(
            { _id: { $in: taskIds }, projectId: sprint.projectId },
            { sprintId: id }
          )
        } else {
          await Task.updateMany(
            { _id: { $in: taskIds }, sprintId: id },
            { $unset: { sprintId: '' } }
          )
        }

        await logUserActivity(
          auth.user.id,
          `sprints.tasks.${action}`,
          `${action === 'add' ? 'Added' : 'Removed'} ${taskIds.length} task(s) ${action === 'add' ? 'to' : 'from'} sprint: ${sprint.name}`,
          {
            entityType: 'Sprint',
            sprintId: id,
            projectId: sprint.projectId,
            taskIds,
            action,
          }
        )

        return NextResponse.json({
          success: true,
          modifiedCount: taskIds.length,
        })
      } catch (error) {
        log.error('Assign tasks to sprint error:', error)
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
