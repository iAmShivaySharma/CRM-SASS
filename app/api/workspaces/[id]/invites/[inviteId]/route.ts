import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import { WorkspaceMember, Invitation } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import {
  logUserActivity,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string; inviteId: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId, inviteId } = await params

        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const userPermissions = membership.roleId?.permissions || []
        if (
          !userPermissions.includes('members.invite') &&
          !['Owner', 'Admin'].includes(membership.roleId?.name)
        ) {
          return NextResponse.json(
            { message: 'Insufficient permissions' },
            { status: 403 }
          )
        }

        const invitation = await Invitation.findOne({
          _id: inviteId,
          workspaceId,
          status: 'pending',
        })

        if (!invitation) {
          return NextResponse.json(
            { message: 'Invitation not found or already processed' },
            { status: 404 }
          )
        }

        invitation.status = 'cancelled'
        await invitation.save()

        logUserActivity(userId, 'invitation_cancelled', 'workspace', {
          workspaceId,
          invitedEmail: invitation.email,
        })

        return NextResponse.json({
          success: true,
          message: 'Invitation cancelled',
        })
      } catch (error) {
        log.error('Cancel invitation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
