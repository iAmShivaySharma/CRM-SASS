import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Project, ProjectMember, Task } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  visibility: z.enum(['private', 'workspace', 'public']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  settings: z
    .object({
      allowMemberInvite: z.boolean().optional(),
      allowJoinRequests: z.boolean().optional(),
      defaultTaskStatus: z.string().optional(),
      enableTimeTracking: z.boolean().optional(),
    })
    .optional(),
})

async function checkProjectAccess(
  projectId: string,
  userId: string,
  permission: 'read' | 'manage' = 'read'
) {
  const project = await Project.findById(projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    status: 'active',
  }).populate('roleId')

  if (!projectMember) {
    // Check if project is visible to workspace
    if (project.visibility === 'workspace' || project.visibility === 'public') {
      return permission === 'read' ? project : null
    }
    return null
  }

  // For now, just check if user is a member
  // Later this should check actual permissions based on role
  return project
}

// GET /api/projects/[id] - Get project details
export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id } = await params
        const project = await checkProjectAccess(id, auth.user.id, 'read')

        if (!project) {
          return NextResponse.json(
            { message: 'Project not found' },
            { status: 404 }
          )
        }
        // Get additional project stats
        const [memberCount, taskCount, completedTaskCount] = await Promise.all([
          ProjectMember.countDocuments({ projectId: id, status: 'active' }),
          Task.countDocuments({ projectId: id }),
          Task.countDocuments({ projectId: id, status: 'completed' }),
        ])

        await logUserActivity(
          auth.user.id,
          'projects.view',
          `Viewed project: ${project.name}`,
          { entityType: 'Project', projectId: id }
        )

        const endTime = Date.now()
        return NextResponse.json({
          project: {
            ...project.toJSON(),
            memberCount,
            taskCount,
            completedTaskCount,
          },
        })
      } catch (error) {
        log.error('Get project error:', error)
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

// PUT /api/projects/[id] - Update project
export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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
        console.log('Project ID:', id)
        console.log('Checking project access...')
        const project = await checkProjectAccess(id, auth.user.id, 'manage')

        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))

        const validationResult = updateProjectSchema.safeParse(body)

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

        console.log('Updating project...')
        // Update the project
        const updatedProject = await Project.findByIdAndUpdate(
          id,
          { ...validationResult.data, updatedAt: new Date() },
          { new: true }
        )

        await logUserActivity(
          auth.user.id,
          'projects.update',
          `Updated project: ${updatedProject?.name}`,
          {
            entityType: 'Project',
            projectId: id,
            changes: validationResult.data,
          }
        )

        const endTime = Date.now()

        return NextResponse.json({
          project: updatedProject?.toJSON(),
        })
      } catch (error) {
        console.error('=== UPDATE PROJECT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Update project error:', error)
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

// DELETE /api/projects/[id] - Delete project
export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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
        console.log('Project ID:', id)
        console.log('Checking project access...')
        const project = await checkProjectAccess(id, auth.user.id, 'manage')

        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        // Check if user is project owner (creator)
        if (project.createdBy !== auth.user.id) {
          console.log('Only project owner can delete project')
          return NextResponse.json(
            { message: 'Only project owner can delete project' },
            { status: 403 }
          )
        }

        console.log('Deleting project and related data...')
        // Delete project and related data
        await Promise.all([
          Project.findByIdAndDelete(id),
          ProjectMember.deleteMany({ projectId: id }),
          Task.deleteMany({ projectId: id }),
          // We'll add document cleanup when those APIs are ready
        ])

        await logUserActivity(
          auth.user.id,
          'projects.delete',
          `Deleted project: ${project.name}`,
          { entityType: 'Project', projectId: id }
        )

        const endTime = Date.now()
        console.log(
          `=== DELETE PROJECT API SUCCESS (${endTime - startTime}ms) ===`
        )

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('=== DELETE PROJECT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Delete project error:', error)
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
