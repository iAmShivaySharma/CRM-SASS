import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Project, ProjectMember, User, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
})

async function checkProjectAccess(
  projectId: string,
  userId: string,
  permission: 'read' | 'manage' = 'read'
) {
  const project = await Project.findById(projectId)
  if (!project) return null

  // First check if user is a member of the workspace
  const workspaceMember = await WorkspaceMember.findOne({
    userId,
    workspaceId: project.workspaceId,
    status: 'active',
  })

  if (!workspaceMember) return null

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

// GET /api/projects/[id]/members - Get project members
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

        const { id: projectId } = await params
        const project = await checkProjectAccess(projectId, auth.user.id, 'read')

        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        // Get all project members
        const members = await ProjectMember.find({
          projectId,
          status: { $ne: 'removed' },
        })
          .populate('userId', 'fullName email avatarUrl')
          .populate('roleId', 'name permissions')
          .lean()

        // Transform the data to match the expected interface
        const transformedMembers = members.map((member: any) => ({
          id: member._id,
          projectId: member.projectId,
          userId: member.userId?._id,
          roleId: member.roleId?._id,
          status: member.status,
          invitedBy: member.invitedBy,
          invitedAt: member.invitedAt,
          joinedAt: member.joinedAt,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          user: member.userId ? {
            id: member.userId._id,
            fullName: member.userId.fullName,
            email: member.userId.email,
            avatarUrl: member.userId.avatarUrl,
          } : undefined,
          role: member.roleId ? {
            id: member.roleId._id,
            name: member.roleId.name,
            permissions: member.roleId.permissions,
          } : undefined,
        }))

        await logUserActivity(
          auth.user.id,
          'project_members.list',
          `Viewed members for project: ${project.name}`,
          { entityType: 'ProjectMember', projectId }
        )

        return NextResponse.json({
          members: transformedMembers,
        })
      } catch (error) {
        log.error('Get project members error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
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

// POST /api/projects/[id]/members - Add member to project
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

        const { id: projectId } = await params
        const project = await checkProjectAccess(projectId, auth.user.id, 'manage')

        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const body = await request.json()
        const validationResult = addMemberSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { userId, roleId } = validationResult.data

        // Check if user exists and is in the same workspace
        const user = await User.findById(userId)
        if (!user) {
          return NextResponse.json(
            { message: 'User not found' },
            { status: 404 }
          )
        }

        const workspaceMember = await WorkspaceMember.findOne({
          userId,
          workspaceId: project.workspaceId,
          status: 'active',
        })

        if (!workspaceMember) {
          return NextResponse.json(
            { message: 'User is not a member of this workspace' },
            { status: 400 }
          )
        }

        // Check if user is already a member
        const existingMember = await ProjectMember.findOne({
          projectId,
          userId,
          status: { $ne: 'removed' },
        })

        if (existingMember) {
          return NextResponse.json(
            { message: 'User is already a member of this project' },
            { status: 400 }
          )
        }

        // Create new project member
        const newMember = new ProjectMember({
          projectId,
          userId,
          roleId,
          status: 'active',
          invitedBy: auth.user.id,
          joinedAt: new Date(),
          workspaceId: project.workspaceId,
        })

        await newMember.save()

        // Populate the response
        const populatedMember = await ProjectMember.findById(newMember._id)
          .populate('userId', 'fullName email avatarUrl')
          .populate('roleId', 'name permissions')
          .lean() as any

        const transformedMember = {
          id: populatedMember!._id,
          projectId: populatedMember!.projectId,
          userId: populatedMember!.userId?._id,
          roleId: populatedMember!.roleId?._id,
          status: populatedMember!.status,
          invitedBy: populatedMember!.invitedBy,
          invitedAt: populatedMember!.invitedAt,
          joinedAt: populatedMember!.joinedAt,
          createdAt: populatedMember!.createdAt,
          updatedAt: populatedMember!.updatedAt,
          user: populatedMember!.userId ? {
            id: populatedMember!.userId._id,
            fullName: populatedMember!.userId.fullName,
            email: populatedMember!.userId.email,
            avatarUrl: populatedMember!.userId.avatarUrl,
          } : undefined,
          role: populatedMember!.roleId ? {
            id: populatedMember!.roleId._id,
            name: populatedMember!.roleId.name,
            permissions: populatedMember!.roleId.permissions,
          } : undefined,
        }

        await logUserActivity(
          auth.user.id,
          'project_members.add',
          `Added ${user.fullName} to project: ${project.name}`,
          { entityType: 'ProjectMember', projectId, userId }
        )

        return NextResponse.json({
          member: transformedMember,
        })
      } catch (error) {
        log.error('Add project member error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
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