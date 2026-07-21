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

const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
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

        const sprint = await Sprint.findById(id).populate(
          'createdBy',
          'fullName email avatarUrl'
        )

        if (!sprint) {
          return NextResponse.json(
            { message: 'Sprint not found' },
            { status: 404 }
          )
        }

        // Get task stats
        const tasks = await Task.find({ sprintId: id }).lean()
        const totalTasks = tasks.length
        const completedTasks = tasks.filter((t: any) => t.completed).length

        return NextResponse.json({
          sprint: {
            ...sprint.toJSON(),
            taskCount: totalTasks,
            completedTaskCount: completedTasks,
          },
        })
      } catch (error) {
        log.error('Get sprint error:', error)
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

        const validationResult = updateSprintSchema.safeParse(body)
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

        const updates: any = { ...validationResult.data }
        if (updates.startDate) updates.startDate = new Date(updates.startDate)
        if (updates.endDate) updates.endDate = new Date(updates.endDate)

        const updatedSprint = await Sprint.findByIdAndUpdate(id, updates, {
          new: true,
        }).populate('createdBy', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'sprints.update',
          `Updated sprint: ${updatedSprint?.name}`,
          { entityType: 'Sprint', sprintId: id }
        )

        return NextResponse.json({ sprint: updatedSprint?.toJSON() })
      } catch (error) {
        log.error('Update sprint error:', error)
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

        const sprint = await Sprint.findById(id)
        if (!sprint) {
          return NextResponse.json(
            { message: 'Sprint not found' },
            { status: 404 }
          )
        }

        if (sprint.status !== 'planning') {
          return NextResponse.json(
            { message: 'Only sprints in planning status can be deleted' },
            { status: 400 }
          )
        }

        // Remove sprintId from any tasks assigned to this sprint
        await Task.updateMany({ sprintId: id }, { $unset: { sprintId: '' } })
        await Sprint.findByIdAndDelete(id)

        await logUserActivity(
          auth.user.id,
          'sprints.delete',
          `Deleted sprint: ${sprint.name}`,
          { entityType: 'Sprint', sprintId: id, projectId: sprint.projectId }
        )

        return NextResponse.json({ success: true })
      } catch (error) {
        log.error('Delete sprint error:', error)
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
