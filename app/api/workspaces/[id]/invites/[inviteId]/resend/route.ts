import crypto from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import {
  WorkspaceMember,
  Invitation,
  Role,
  Workspace,
} from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import {
  logUserActivity,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'
import { emailService } from '@/lib/services/emailService'

export const POST = withSecurityLogging(
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
        })
          .populate('roleId')
          .populate('userId', 'fullName email')

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
        })

        if (!invitation) {
          return NextResponse.json(
            { message: 'Invitation not found' },
            { status: 404 }
          )
        }

        if (invitation.status === 'accepted') {
          return NextResponse.json(
            { message: 'Invitation already accepted' },
            { status: 400 }
          )
        }

        const newToken = crypto.randomBytes(32).toString('hex')
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        invitation.token = newToken
        invitation.expiresAt = newExpiry
        invitation.status = 'pending'
        await invitation.save()

        const [workspace, role] = await Promise.all([
          Workspace.findById(workspaceId),
          Role.findById(invitation.roleId),
        ])

        if (workspace && role) {
          const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${newToken}`

          const emailResult = await emailService.sendInvitationEmail({
            email: invitation.email,
            workspaceName: workspace.name,
            roleName: role.name,
            inviterName: membership.userId.fullName || membership.userId.email,
            inviteToken: newToken,
            acceptUrl,
          })

          if (!emailResult.success) {
            return NextResponse.json(
              {
                success: false,
                message:
                  'Invitation updated but email failed to send. Please try again.',
              },
              { status: 502 }
            )
          }
        }

        logUserActivity(userId, 'invitation_resent', 'workspace', {
          workspaceId,
          invitedEmail: invitation.email,
        })

        return NextResponse.json({
          success: true,
          message: 'Invitation resent with a new link',
          invitation: {
            id: invitation._id,
            email: invitation.email,
            expiresAt: newExpiry,
          },
        })
      } catch (error) {
        log.error('Resend invitation error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
