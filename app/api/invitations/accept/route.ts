import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import {
  WorkspaceMember,
  User,
  Workspace,
  Invitation,
} from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import {
  logUserActivity,
  logBusinessEvent,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'
import { rateLimit } from '@/lib/security/rate-limiter'
import { getClientIP } from '@/lib/utils/ip-utils'
import { NotificationService } from '@/lib/services/notificationService'
import { z } from 'zod'

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

// POST /api/invitations/accept - Accept a workspace invitation
export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()

    try {
      // Ensure database connection
      await connectToMongoDB()

      // Rate limiting
      const clientIp = getClientIP(request)
      const rateLimitResult = await rateLimit(clientIp, 'api')
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { message: 'Too many requests. Please try again later.' },
          { status: 429 }
        )
      }

      // Authentication
      const authResult = await requireAuth(request)
      if (!authResult.success) {
        return authResult.response
      }

      const userId = authResult.user.id
      const userEmail = authResult.user.email

      // Parse and validate request body
      const body = await request.json()
      const validationResult = acceptInvitationSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: 'Validation failed',
            errors: validationResult.error.errors,
          },
          { status: 400 }
        )
      }

      const { token } = validationResult.data

      // Find the invitation
      const invitation = await Invitation.findOne({
        token,
        status: 'pending',
      })
        .populate('workspaceId', 'name')
        .populate('roleId', 'name permissions')
        .populate('invitedBy', 'fullName email')

      if (!invitation) {
        return NextResponse.json(
          { message: 'Invalid or expired invitation token' },
          { status: 404 }
        )
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        // Mark invitation as expired
        invitation.status = 'expired'
        await invitation.save()

        return NextResponse.json(
          { message: 'This invitation has expired' },
          { status: 410 }
        )
      }

      // Check if the invitation email matches the authenticated user's email
      if (invitation.email !== userEmail) {
        return NextResponse.json(
          {
            message:
              'This invitation was sent to a different email address. Please log in with the correct account.',
          },
          { status: 403 }
        )
      }

      // Check if user is already a member of this workspace
      const existingMembership = await WorkspaceMember.findOne({
        workspaceId: invitation.workspaceId._id,
        userId,
        status: 'active',
      })

      if (existingMembership) {
        // Mark invitation as accepted anyway
        invitation.status = 'accepted'
        invitation.acceptedAt = new Date()
        await invitation.save()

        return NextResponse.json(
          {
            message: 'You are already a member of this workspace',
            workspace: {
              id: invitation.workspaceId._id,
              name: invitation.workspaceId.name,
            },
          },
          { status: 200 }
        )
      }

      // Create workspace membership
      const membership = new WorkspaceMember({
        workspaceId: invitation.workspaceId._id,
        userId,
        roleId: invitation.roleId._id,
        status: 'active',
        joinedAt: new Date(),
      })

      await membership.save()

      // Mark invitation as accepted
      invitation.status = 'accepted'
      invitation.acceptedAt = new Date()
      await invitation.save()

      // Log successful acceptance
      logUserActivity(userId, 'invitation_accepted', 'workspace', {
        workspaceId: invitation.workspaceId._id,
        invitationId: invitation._id,
        roleName: invitation.roleId.name,
      })

      logBusinessEvent(
        'invitation_accepted',
        userId,
        invitation.workspaceId._id,
        {
          invitationId: invitation._id,
          roleName: invitation.roleId.name,
          inviterUserId: invitation.invitedBy._id,
          duration: Date.now() - startTime,
        }
      )

      // Create notification for invitation acceptance
      try {
        await NotificationService.createNotification({
          workspaceId: invitation.workspaceId._id,
          title: 'Invitation Accepted',
          message: `${authResult.user.fullName || authResult.user.email} accepted the invitation to join ${invitation.workspaceId.name}`,
          type: 'success',
          entityType: 'workspace',
          entityId: invitation.workspaceId._id.toString(),
          createdBy: userId,
          notificationLevel: 'workspace',
          excludeUserIds: [userId], // Don't notify the person who accepted
          targetUserIds: [invitation.invitedBy._id.toString()], // Notify the inviter
          metadata: {
            acceptedBy: authResult.user.fullName || authResult.user.email,
            roleName: invitation.roleId.name,
            workspaceName: invitation.workspaceId.name,
            inviterName:
              invitation.invitedBy.fullName || invitation.invitedBy.email,
          },
        })
      } catch (notificationError) {
        console.error(
          'Failed to create invitation acceptance notification:',
          notificationError
        )
        // Don't fail the acceptance if notification fails
      }

      log.info(
        `Invitation accepted successfully for workspace ${invitation.workspaceId._id}`,
        {
          workspaceId: invitation.workspaceId._id,
          userId,
          invitationId: invitation._id,
          duration: Date.now() - startTime,
        }
      )

      return NextResponse.json(
        {
          success: true,
          message: 'Invitation accepted successfully',
          workspace: {
            id: invitation.workspaceId._id,
            name: invitation.workspaceId.name,
          },
          role: {
            id: invitation.roleId._id,
            name: invitation.roleId.name,
            permissions: invitation.roleId.permissions,
          },
          membership: {
            id: membership._id,
            joinedAt: membership.joinedAt,
          },
        },
        { status: 200 }
      )
    } catch (error) {
      log.error('Error accepting invitation:', error)

      return NextResponse.json(
        {
          success: false,
          message: 'Failed to accept invitation',
          error:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
        { status: 500 }
      )
    }
  })
)
