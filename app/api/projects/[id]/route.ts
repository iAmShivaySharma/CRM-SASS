import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Project,
  ProjectMember,
  Task,
  WorkspaceMember,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

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

  const workspaceMember = await WorkspaceMember.findOne({
    userId,
    workspaceId: project.workspaceId,
    status: 'active',
  }).lean()

  if (!workspaceMember) return null

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    status: 'active',
  })
    .populate('roleId')
    .lean()

  if (!projectMember) {
    if (project.visibility === 'workspace' || project.visibility === 'public') {
      return permission === 'read' ? project : null
    }
    return null
  }

  return project
}

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

        const permError = await checkPermission(
          auth.user.id,
          project.workspaceId.toString(),
          'projects.view'
        )
        if (permError) return permError

        const [memberCount, taskCount, completedTaskCount] = await Promise.all([
          ProjectMember.countDocuments({ projectId: id, status: 'active' }),
          Task.countDocuments({ projectId: id }),
          Task.countDocuments({ projectId: id, completed: true }),
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
        const project = await checkProjectAccess(id, auth.user.id, 'manage')

        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          project.workspaceId.toString(),
          'projects.edit'
        )
        if (permError) return permError

        const body = await request.json()

        const validationResult = updateProjectSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

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

export const DELETE = withSecurityLogging(
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
        const project = await checkProjectAccess(id, auth.user.id, 'manage')

        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          project.workspaceId.toString(),
          'projects.delete'
        )
        if (permError) return permError

        if (project.createdBy !== auth.user.id) {
          return NextResponse.json(
            { message: 'Only project owner can delete project' },
            { status: 403 }
          )
        }

        await Promise.all([
          Project.findByIdAndDelete(id),
          ProjectMember.deleteMany({ projectId: id }),
          Task.deleteMany({ projectId: id }),
        ])

        await logUserActivity(
          auth.user.id,
          'projects.delete',
          `Deleted project: ${project.name}`,
          { entityType: 'Project', projectId: id }
        )

        return NextResponse.json({ success: true })
      } catch (error) {
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
