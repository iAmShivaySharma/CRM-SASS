import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Sprint, Project, ProjectMember, Task } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { cached, invalidateCache } from '@/lib/redis/cache'
import { checkPermission } from '@/lib/security/check-permission'

const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  projectId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})

async function checkProjectAccess(projectId: string, userId: string) {
  const project = (await Project.findById(projectId).lean()) as any
  if (!project) return null

  const member = await ProjectMember.findOne({
    projectId,
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
        const status = url.searchParams.get('status')

        if (!projectId) {
          return NextResponse.json(
            { message: 'projectId is required' },
            { status: 400 }
          )
        }

        const project = await checkProjectAccess(projectId, auth.user.id)
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

        const query: any = { projectId }
        if (status) query.status = status

        const sprints = await cached(
          `sprints:${projectId}:${status || 'all'}`,
          60,
          async () => {
            const sprintDocs = await Sprint.find(query)
              .populate('createdBy', 'fullName email avatarUrl')
              .sort({ startDate: -1 })
              .lean()

            // Get task counts for each sprint
            const sprintIds = sprintDocs.map((s: any) => s._id.toString())
            const taskCounts = await Task.aggregate([
              { $match: { sprintId: { $in: sprintIds } } },
              {
                $group: {
                  _id: '$sprintId',
                  total: { $sum: 1 },
                  completed: {
                    $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] },
                  },
                },
              },
            ])

            const countMap: Record<
              string,
              { total: number; completed: number }
            > = {}
            taskCounts.forEach((tc: any) => {
              countMap[tc._id] = { total: tc.total, completed: tc.completed }
            })

            return sprintDocs.map((sprint: any) => ({
              ...sprint,
              id: sprint._id,
              taskCount: countMap[sprint._id.toString()]?.total || 0,
              completedTaskCount:
                countMap[sprint._id.toString()]?.completed || 0,
            }))
          }
        )

        return NextResponse.json({ sprints })
      } catch (error) {
        log.error('Get sprints error:', error)
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
        const validationResult = createSprintSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { name, goal, projectId, startDate, endDate } =
          validationResult.data

        const project = await checkProjectAccess(projectId, auth.user.id)
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

        const start = new Date(startDate)
        const end = new Date(endDate)

        if (end <= start) {
          return NextResponse.json(
            { message: 'End date must be after start date' },
            { status: 400 }
          )
        }

        const sprint = new Sprint({
          name,
          goal,
          projectId,
          workspaceId: project.workspaceId,
          startDate: start,
          endDate: end,
          createdBy: auth.user.id,
        })

        await sprint.save()
        await sprint.populate('createdBy', 'fullName email avatarUrl')

        await logUserActivity(
          auth.user.id,
          'sprints.create',
          `Created sprint: ${sprint.name}`,
          {
            entityType: 'Sprint',
            sprintId: sprint._id,
            projectId,
          }
        )

        await invalidateCache(`sprints:${projectId}:*`)

        return NextResponse.json({
          sprint: {
            ...sprint.toJSON(),
            taskCount: 0,
            completedTaskCount: 0,
          },
        })
      } catch (error) {
        log.error('Create sprint error:', error)
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
