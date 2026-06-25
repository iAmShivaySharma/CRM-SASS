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
import { invalidateCache } from '@/lib/redis/cache'

const completeSprintSchema = z.object({
  moveIncompleteTo: z.union([z.literal('backlog'), z.string()]),
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

        const validationResult = completeSprintSchema.safeParse(body)
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

        if (sprint.status !== 'active') {
          return NextResponse.json(
            { message: 'Only active sprints can be completed' },
            { status: 400 }
          )
        }

        const { moveIncompleteTo } = validationResult.data

        // Get incomplete tasks in this sprint
        const incompleteTasks = await Task.find({
          sprintId: id,
          completed: false,
        })

        const completedTasks = await Task.countDocuments({
          sprintId: id,
          completed: true,
        })

        // Move incomplete tasks
        if (incompleteTasks.length > 0) {
          if (moveIncompleteTo === 'backlog') {
            await Task.updateMany(
              { sprintId: id, completed: false },
              { $unset: { sprintId: '' } }
            )
          } else {
            // Move to another sprint
            const targetSprint = await Sprint.findById(moveIncompleteTo)
            if (!targetSprint) {
              return NextResponse.json(
                { message: 'Target sprint not found' },
                { status: 404 }
              )
            }
            await Task.updateMany(
              { sprintId: id, completed: false },
              { sprintId: moveIncompleteTo }
            )
          }
        }

        // Complete the sprint
        sprint.status = 'completed'
        sprint.completedAt = new Date()
        await sprint.save()
        await sprint.populate('createdBy', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'sprints.complete',
          `Completed sprint: ${sprint.name}`,
          {
            entityType: 'Sprint',
            sprintId: id,
            projectId: sprint.projectId,
            completedTasks,
            movedTasks: incompleteTasks.length,
            moveTarget: moveIncompleteTo,
          }
        )

        await invalidateCache(`sprints:${sprint.projectId}:*`)
        await invalidateCache(`tasks:*`)

        return NextResponse.json({
          sprint: sprint.toJSON(),
          summary: {
            completedTasks,
            movedTasks: incompleteTasks.length,
            moveTarget: moveIncompleteTo,
          },
        })
      } catch (error) {
        log.error('Complete sprint error:', error)
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
