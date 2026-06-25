import crypto from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import mongoose from 'mongoose'
import { requireAuth } from '@/lib/security/auth-middleware'
import {
  WorkspaceMember,
  Role,
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
import { emailService } from '@/lib/services/emailService'

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  roleId: z.string().min(1, 'Role is required'),
  message: z
    .string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
})

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
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

        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'api')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }

        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId } = await params

        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            {
              message: 'Access denied. You are not a member of this workspace.',
            },
            { status: 403 }
          )
        }

        const userPermissions = membership.roleId?.permissions || []
        if (
          !userPermissions.includes('members.view') &&
          !['Owner', 'Admin'].includes(membership.roleId?.name)
        ) {
          return NextResponse.json(
            {
              message:
                'Access denied. Insufficient permissions to view invitations.',
            },
            { status: 403 }
          )
        }

        const pendingInvites = await Invitation.find({
          workspaceId,
          status: 'pending',
        })
          .populate('roleId', 'name permissions')
          .populate('invitedBy', 'fullName email')
          .sort({ createdAt: -1 })

        const invitations = pendingInvites.map(invite => ({
          id: invite._id,
          email: invite.email,
          role: {
            id: invite.roleId._id,
            name: invite.roleId.name,
            permissions: invite.roleId.permissions,
          },
          invitedBy: {
            id: invite.invitedBy._id,
            name: invite.invitedBy.fullName || invite.invitedBy.email,
            email: invite.invitedBy.email,
          },
          invitedAt: invite.createdAt,
          expiresAt: invite.expiresAt,
          status: invite.status,
        }))

        logUserActivity(userId, 'invitations_viewed', 'workspace', {
          workspaceId,
          inviteCount: invitations.length,
        })

        log.info(
          `Invitations retrieved for workspace ${workspaceId} by user ${userId}`,
          {
            workspaceId,
            userId,
            inviteCount: invitations.length,
            duration: Date.now() - startTime,
          }
        )

        return NextResponse.json({
          success: true,
          invitations,
        })
      } catch (error) {
        log.error('Error retrieving workspace invitations:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to retrieve workspace invitations',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)

export const POST = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const startTime = Date.now()

      try {
        await connectToMongoDB()

        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'invites')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            {
              message: 'Too many invitation requests. Please try again later.',
            },
            { status: 429 }
          )
        }

        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId } = await params

        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validationResult = inviteUserSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { email, roleId, message } = validationResult.data

        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        })
          .populate('roleId')
          .populate('userId', 'fullName email')

        if (!membership) {
          return NextResponse.json(
            {
              message: 'Access denied. You are not a member of this workspace.',
            },
            { status: 403 }
          )
        }

        const userPermissions = membership.roleId?.permissions || []
        if (
          !userPermissions.includes('members.invite') &&
          !['Owner', 'Admin'].includes(membership.roleId?.name)
        ) {
          return NextResponse.json(
            {
              message:
                'Access denied. Insufficient permissions to invite members.',
            },
            { status: 403 }
          )
        }

        const role = await Role.findOne({ _id: roleId, workspaceId })
        if (!role) {
          return NextResponse.json(
            { message: 'Invalid role specified' },
            { status: 400 }
          )
        }

        const existingInvitation = await Invitation.findOne({
          workspaceId,
          email,
          status: 'pending',
        })

        if (existingInvitation) {
          return NextResponse.json(
            { message: 'User already has a pending invitation' },
            { status: 409 }
          )
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
          const existingMember = await WorkspaceMember.findOne({
            workspaceId,
            userId: existingUser._id,
            status: 'active',
          })

          if (existingMember) {
            return NextResponse.json(
              { message: 'User is already a member of this workspace' },
              { status: 409 }
            )
          }
        }

        const workspace = await Workspace.findById(workspaceId)
        if (!workspace) {
          return NextResponse.json(
            { message: 'Workspace not found' },
            { status: 404 }
          )
        }

        const inviteToken = generateInviteToken()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        const invitation = new Invitation({
          workspaceId,
          email,
          roleId,
          invitedBy: userId,
          token: inviteToken,
          expiresAt: expiresAt,
          status: 'pending',
        })

        await invitation.save()

        try {
          const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${inviteToken}`

          const emailResult = await emailService.sendInvitationEmail({
            email,
            workspaceName: workspace.name,
            roleName: role.name,
            inviterName: membership.userId.fullName || membership.userId.email,
            inviteToken,
            acceptUrl,
            message,
          })

          if (!emailResult.success) {
            log.warn(
              'Failed to send invitation email, but continuing with invitation creation',
              {
                email,
                workspaceId,
                error: emailResult.error,
              }
            )
          } else {
            log.info('Invitation email sent successfully', {
              email,
              workspaceId,
              messageId: emailResult.messageId,
            })
          }
        } catch (emailError) {
          log.error('Error sending invitation email:', emailError)
        }

        logUserActivity(userId, 'member_invited', 'workspace', {
          workspaceId,
          invitedEmail: email,
          roleId,
          roleName: role.name,
        })

        logBusinessEvent('member_invited', userId, workspaceId, {
          invitedEmail: email,
          roleId,
          roleName: role.name,
          duration: Date.now() - startTime,
        })

        try {
          await NotificationService.createNotification({
            workspaceId,
            title: 'Member Invited',
            message: `${membership.userId.fullName || membership.userId.email} invited ${email} to join the workspace as ${role.name}`,
            type: 'info',
            entityType: 'workspace',
            entityId: workspaceId,
            createdBy: userId,
            notificationLevel: 'workspace',
            excludeUserIds: [userId],
            metadata: {
              invitedEmail: email,
              roleName: role.name,
              inviterName:
                membership.userId.fullName || membership.userId.email,
            },
          })
        } catch (notificationError) {}

        log.info(
          `Member invited to workspace ${workspaceId} by user ${userId}`,
          {
            workspaceId,
            userId,
            invitedEmail: email,
            roleId,
            duration: Date.now() - startTime,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Invitation sent successfully',
            invitation: {
              id: invitation._id,
              email: invitation.email,
              role: {
                id: role._id,
                name: role.name,
              },
              invitedAt: invitation.createdAt,
              expiresAt: invitation.expiresAt,
            },
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Error sending workspace invitation:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to send workspace invitation',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)
