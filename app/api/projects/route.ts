import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Project,
  ProjectMember,
  WorkspaceMember,
  Task,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .default('#3b82f6'),
  visibility: z.enum(['private', 'workspace', 'public']).default('workspace'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workspaceId: z.string(),
  settings: z
    .object({
      allowMemberInvite: z.boolean().default(true),
      allowJoinRequests: z.boolean().default(true),
      defaultTaskStatus: z.string().default('todo'),
      enableTimeTracking: z.boolean().default(false),
    })
    .default({}),
})

export const GET = withSecurityLogging(
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

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const status = url.searchParams.get('status')
        const search = url.searchParams.get('search')
        const skip = (page - 1) * limit

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'projects.view'
        )
        if (permError) return permError

        const query: any = { workspaceId }

        if (status) {
          query.status = status
        }

        if (search) {
          query.$text = { $search: search }
        }

        const projectMemberProjects = await ProjectMember.find({
          userId: auth.user.id,
          status: 'active',
        }).distinct('projectId')

        const visibilityQuery = {
          ...query,
          $or: [
            { _id: { $in: projectMemberProjects } },
            { visibility: 'workspace' },
            { visibility: 'public' },
          ],
        }

        const total = await Project.countDocuments(visibilityQuery)

        const projects = await Project.find(visibilityQuery)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()

        const projectsWithCounts = await Promise.all(
          projects.map(async project => {
            const [memberCount, taskCount, completedTaskCount] =
              await Promise.all([
                ProjectMember.countDocuments({
                  projectId: project._id,
                  status: 'active',
                }),
                Task.countDocuments({ projectId: project._id }),
                Task.countDocuments({
                  projectId: project._id,
                  completed: true,
                }),
              ])

            return {
              ...project,
              id: project._id,
              memberCount,
              taskCount,
              completedTaskCount,
            }
          })
        )

        await logUserActivity(
          auth.user.id,
          'projects.list',
          'User listed projects',
          { entityType: 'Project', workspaceId, page, limit }
        )

        return NextResponse.json({
          projects: projectsWithCounts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        })
      } catch (error) {
        log.error('Get projects error:', error)
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

        const validationResult = createProjectSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'projects.create'
        )
        if (permError) return permError

        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }
        const existingProject = await Project.findOne({
          workspaceId,
          slug: validationResult.data.slug,
        })

        if (existingProject) {
          return NextResponse.json(
            { message: 'Project slug already exists in this workspace' },
            { status: 400 }
          )
        }

        const project = new Project({
          ...validationResult.data,
          createdBy: auth.user.id,
        })

        await project.save()
        const projectMember = new ProjectMember({
          projectId: project._id,
          userId: auth.user.id,
          roleId: member.roleId,
          status: 'active',
          joinedAt: new Date(),
        })

        await projectMember.save()

        await logUserActivity(
          auth.user.id,
          'projects.create',
          `Created project: ${project.name}`,
          { entityType: 'Project', projectId: project._id }
        )

        await logBusinessEvent('project_created', auth.user.id, workspaceId, {
          projectId: project._id,
          projectName: project.name,
        })

        return NextResponse.json({
          project: {
            ...project.toJSON(),
            memberCount: 1,
            taskCount: 0,
            completedTaskCount: 0,
          },
        })
      } catch (error) {
        log.error('Create project error:', error)
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
