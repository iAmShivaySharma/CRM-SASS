import { NextRequest, NextResponse } from 'next/server'
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
import { z } from 'zod'

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

// GET /api/projects - Get projects for a workspace with pagination and filtering
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== PROJECTS API DEBUG START ===')

      try {
        console.log('Connecting to MongoDB...')
        await connectToMongoDB()
        console.log('MongoDB connected successfully')

        console.log('Verifying auth token...')
        const auth = await verifyAuthToken(request)
        console.log('Auth result:', auth ? 'Success' : 'Failed')
        if (!auth) {
          console.log('Auth failed, returning 401')
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

        console.log('Request params:', {
          workspaceId,
          page,
          limit,
          status,
          search,
        })

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        // Check if user has access to workspace
        console.log('Checking workspace access for user:', auth.user.id)
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          console.log('Access denied - user not a member of workspace')
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        console.log('Workspace access confirmed')

        // Build query for projects
        const query: any = { workspaceId }

        if (status) {
          query.status = status
        }

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ]
        }

        console.log('Built query:', JSON.stringify(query))

        // Get projects where user is a member or based on visibility
        const projectMemberProjects = await ProjectMember.find({
          userId: auth.user.id,
          status: 'active',
        }).distinct('projectId')

        console.log('User project memberships:', projectMemberProjects.length)

        // Extend query to include visibility rules
        const visibilityQuery = {
          ...query,
          $or: [
            { _id: { $in: projectMemberProjects } },
            { visibility: 'workspace' },
            { visibility: 'public' },
          ],
        }

        console.log(
          'Final query with visibility:',
          JSON.stringify(visibilityQuery)
        )

        // Get total count
        const total = await Project.countDocuments(visibilityQuery)
        console.log('Total projects found:', total)

        // Get paginated projects
        const projects = await Project.find(visibilityQuery)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()

        console.log('Retrieved projects:', projects.length)

        // Add member count and task counts for each project
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

        console.log('Added counts to projects')

        // Log user activity
        await logUserActivity(
          auth.user.id,
          'projects.list',
          'User listed projects',
          { entityType: 'Project', workspaceId, page, limit }
        )

        const endTime = Date.now()
        console.log(`=== PROJECTS API SUCCESS (${endTime - startTime}ms) ===`)

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
        console.error('=== PROJECTS API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// POST /api/projects - Create a new project
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== CREATE PROJECT API DEBUG START ===')

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

        const validationResult = createProjectSchema.safeParse(body)

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

        const { workspaceId } = validationResult.data

        console.log('Checking workspace access for user:', auth.user.id)
        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          console.log('Access denied - user not a member of workspace')
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        console.log('Workspace access confirmed')

        // Check if slug is unique within workspace
        console.log('Checking slug uniqueness:', validationResult.data.slug)
        const existingProject = await Project.findOne({
          workspaceId,
          slug: validationResult.data.slug,
        })

        if (existingProject) {
          console.log('Slug already exists')
          return NextResponse.json(
            { message: 'Project slug already exists in this workspace' },
            { status: 400 }
          )
        }

        // Create the project
        console.log('Creating new project...')
        const project = new Project({
          ...validationResult.data,
          createdBy: auth.user.id,
        })

        await project.save()
        console.log('Project created with ID:', project._id)

        // Add creator as project owner
        console.log('Adding creator as project member...')
        const projectMember = new ProjectMember({
          projectId: project._id,
          userId: auth.user.id,
          roleId: member.roleId, // Use their workspace role for now
          status: 'active',
          joinedAt: new Date(),
        })

        await projectMember.save()
        console.log('Project member added')

        // Log activities
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

        const endTime = Date.now()
        console.log(
          `=== CREATE PROJECT API SUCCESS (${endTime - startTime}ms) ===`
        )

        return NextResponse.json({
          project: {
            ...project.toJSON(),
            memberCount: 1,
            taskCount: 0,
            completedTaskCount: 0,
          },
        })
      } catch (error) {
        console.error('=== CREATE PROJECT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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
