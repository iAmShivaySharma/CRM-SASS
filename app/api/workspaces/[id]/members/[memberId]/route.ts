import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import { WorkspaceMember, Activity } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import {
  logUserActivity,
  logBusinessEvent,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'
import { NotificationService } from '@/lib/services/notificationService'

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string; memberId: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId, memberId } = await params

        const callerMembership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!callerMembership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const callerPermissions = callerMembership.roleId?.permissions || []
        if (
          !callerPermissions.includes('members.remove') &&
          !['Owner', 'Admin'].includes(callerMembership.roleId?.name)
        ) {
          return NextResponse.json(
            { message: 'Insufficient permissions to remove members' },
            { status: 403 }
          )
        }

        const targetMembership = await WorkspaceMember.findOne({
          _id: memberId,
          workspaceId,
          status: 'active',
        })
          .populate('roleId')
          .populate('userId', 'fullName email')

        if (!targetMembership) {
          return NextResponse.json(
            { message: 'Member not found' },
            { status: 404 }
          )
        }

        if (targetMembership.roleId?.name === 'Owner') {
          return NextResponse.json(
            { message: 'Cannot remove the workspace owner' },
            { status: 403 }
          )
        }

        if (targetMembership.userId._id.toString() === userId) {
          return NextResponse.json(
            { message: 'Cannot remove yourself. Transfer ownership first.' },
            { status: 400 }
          )
        }

        targetMembership.status = 'removed'
        await targetMembership.save()

        const removedUserName =
          targetMembership.userId.fullName || targetMembership.userId.email

        await Activity.create({
          workspaceId,
          performedBy: userId,
          type: 'deleted',
          entityType: 'workspace_member',
          entityId: memberId,
          description: `Removed ${removedUserName} from workspace`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'Member Removed',
          message: `${authResult.user.fullName || authResult.user.email} removed ${removedUserName} from the workspace`,
          type: 'warning',
          entityType: 'workspace',
          entityId: workspaceId,
          createdBy: userId,
          notificationLevel: 'workspace',
          excludeUserIds: [userId],
        }).catch(() => {})

        logUserActivity(userId, 'member_removed', 'workspace', {
          workspaceId,
          removedUserId: targetMembership.userId._id,
          removedUserEmail: targetMembership.userId.email,
        })

        logBusinessEvent('member_removed', userId, workspaceId, {
          removedUserId: targetMembership.userId._id,
          removedUserName,
        })

        return NextResponse.json({
          success: true,
          message: `${removedUserName} has been removed from the workspace`,
        })
      } catch (error) {
        log.error('Remove member error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
