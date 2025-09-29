/**
 * Workspace Invitations API Endpoint
 *
 * Handles workspace member invitations including:
 * - GET: List pending invitations
 * - POST: Send new invitation
 * - PUT: Resend invitation
 * - DELETE: Cancel invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import { WorkspaceMember, Role, User, Workspace, Invitation } from '@/lib/mongodb/models'
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
import { z } from 'zod'
import mongoose from 'mongoose'
import crypto from 'crypto'

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  roleId: z.string().min(1, 'Role is required'),
  message: z
    .string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
})

// Generate invitation token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// GET /api/workspaces/[id]/invites - List pending invitations
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
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
        const workspaceId = params.id

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Check if user has permission to view invitations
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

        // Check permissions
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

        // Get pending invitations
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

        // Log successful access
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

// POST /api/workspaces/[id]/invites - Send new invitation
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Rate limiting - stricter for invitations
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

        // Authentication
        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const workspaceId = params.id

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Parse and validate request body
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

        // Check if user has permission to invite members
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId').populate('userId', 'fullName email')

        if (!membership) {
          return NextResponse.json(
            {
              message: 'Access denied. You are not a member of this workspace.',
            },
            { status: 403 }
          )
        }

        // Check permissions
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

        // Validate role exists and belongs to workspace
        const role = await Role.findOne({ _id: roleId, workspaceId })
        if (!role) {
          return NextResponse.json(
            { message: 'Invalid role specified' },
            { status: 400 }
          )
        }

        // Check if user is already a member or has pending invitation
        // First check for existing invitations
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

        // Check if user is already a workspace member
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

        // Get workspace details for invitation
        const workspace = await Workspace.findById(workspaceId)
        if (!workspace) {
          return NextResponse.json(
            { message: 'Workspace not found' },
            { status: 404 }
          )
        }

        // Create invitation
        const inviteToken = generateInviteToken()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

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

        // Send invitation email
        try {
          const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${inviteToken}`

          const emailResult = await emailService.sendInvitationEmail({
            email,
            workspaceName: workspace.name,
            roleName: role.name,
            inviterName: membership.userId.fullName || membership.userId.email,
            inviteToken,
            acceptUrl,
            message
          })

          if (!emailResult.success) {
            log.warn('Failed to send invitation email, but continuing with invitation creation', {
              email,
              workspaceId,
              error: emailResult.error
            })
          } else {
            log.info('Invitation email sent successfully', {
              email,
              workspaceId,
              messageId: emailResult.messageId
            })
          }
        } catch (emailError) {
          log.error('Error sending invitation email:', emailError)
          // Don't fail the invitation creation if email fails
        }

        // Log successful invitation
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

        // Create notification for workspace invitation
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
            excludeUserIds: [userId], // Don't notify the inviter
            metadata: {
              invitedEmail: email,
              roleName: role.name,
              inviterName:
                membership.userId.fullName || membership.userId.email,
            },
          })
        } catch (notificationError) {
          console.error(
            'Failed to create invitation notification:',
            notificationError
          )
          // Don't fail the invitation if notification fails
        }

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
