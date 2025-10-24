import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Project, ProjectMember, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

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

// DELETE /api/projects/[id]/members/[memberId] - Remove member from project
export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string; memberId: string }> }
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

        const { id: projectId, memberId } = await params
        const project = await checkProjectAccess(projectId, auth.user.id, 'manage')

        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        // Check if member exists
        const member = await ProjectMember.findById(memberId)
        if (!member || member.projectId !== projectId) {
          return NextResponse.json(
            { message: 'Project member not found' },
            { status: 404 }
          )
        }

        // Remove the member
        await ProjectMember.findByIdAndUpdate(memberId, {
          status: 'removed',
          removedAt: new Date(),
          removedBy: auth.user.id,
        })

        await logUserActivity(
          auth.user.id,
          'project_members.remove',
          `Removed member from project: ${project.name}`,
          { entityType: 'ProjectMember', projectId, memberId }
        )

        return NextResponse.json({
          success: true,
          message: 'Member removed successfully',
        })
      } catch (error) {
        log.error('Remove project member error:', error)
        return NextResponse.json(
          {
            success: false,
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