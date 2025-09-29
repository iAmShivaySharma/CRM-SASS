import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Role, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

// DELETE /api/roles/[id] - Delete a role
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
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
        const roleId = params.id

        if (!workspaceId || !roleId) {
          return NextResponse.json(
            { message: 'Workspace ID and Role ID are required' },
            { status: 400 }
          )
        }

        // Verify user has access to this workspace
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

        // Check if role exists and is not default
        const role = await Role.findOne({
          _id: roleId,
          workspaceId,
        })

        if (!role) {
          return NextResponse.json(
            { message: 'Role not found' },
            { status: 404 }
          )
        }

        if (role.isDefault) {
          return NextResponse.json(
            { message: 'Cannot delete default role' },
            { status: 400 }
          )
        }

        // Check if role is being used by any members
        const membersUsingRole = await WorkspaceMember.countDocuments({
          workspaceId,
          roleId,
          status: 'active',
        })

        if (membersUsingRole > 0) {
          return NextResponse.json(
            {
              message: `Cannot delete role. ${membersUsingRole} member(s) are assigned to this role.`,
            },
            { status: 400 }
          )
        }

        // Delete the role
        await Role.findByIdAndDelete(roleId)

        logUserActivity(auth.user.id, 'role.delete', 'role', {
          workspaceId,
          roleId,
          roleName: role.name,
        })

        logBusinessEvent('role_deleted', auth.user.id, workspaceId, {
          roleId,
          roleName: role.name,
        })

        return NextResponse.json({
          success: true,
          message: 'Role deleted successfully',
        })
      } catch (error) {
        log.error('Delete role error:', error)
        return NextResponse.json({ message: 'Server error' }, { status: 500 })
      }
    }
  )
)
