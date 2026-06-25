import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Sprint } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { invalidateCache } from '@/lib/redis/cache'

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

        const sprint = await Sprint.findById(id)
        if (!sprint) {
          return NextResponse.json(
            { message: 'Sprint not found' },
            { status: 404 }
          )
        }

        if (sprint.status !== 'planning') {
          return NextResponse.json(
            { message: 'Only sprints in planning status can be started' },
            { status: 400 }
          )
        }

        // Check no other active sprint exists for this project
        const activeSprint = await Sprint.findOne({
          projectId: sprint.projectId,
          status: 'active',
        })

        if (activeSprint) {
          return NextResponse.json(
            {
              message: `Sprint "${activeSprint.name}" is already active. Complete or cancel it before starting a new one.`,
            },
            { status: 409 }
          )
        }

        sprint.status = 'active'
        await sprint.save()
        await sprint.populate('createdBy', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'sprints.start',
          `Started sprint: ${sprint.name}`,
          { entityType: 'Sprint', sprintId: id, projectId: sprint.projectId }
        )

        await invalidateCache(`sprints:${sprint.projectId}:*`)

        return NextResponse.json({ sprint: sprint.toJSON() })
      } catch (error) {
        log.error('Start sprint error:', error)
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
