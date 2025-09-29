import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceMember, User, Invitation } from '@/lib/mongodb/models'
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
import { hashPassword } from '@/lib/mongodb/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const acceptWithRegistrationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
})

// POST /api/invitations/accept-with-registration - Accept invitation and create user account
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Rate limiting - stricter for registration
        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'auth')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }

        // Parse and validate request body
        const body = await request.json()
        const validationResult = acceptWithRegistrationSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { token, fullName, password } = validationResult.data

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
          invitation.status = 'expired'
          await invitation.save()

          return NextResponse.json(
            { message: 'This invitation has expired' },
            { status: 410 }
          )
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: invitation.email })
        if (existingUser) {
          return NextResponse.json(
            {
              message: 'An account with this email already exists. Please log in instead.',
              requireLogin: true,
            },
            { status: 409 }
          )
        }

        // Create new user account
        const hashedPassword = await hashPassword(password)
        const newUser = new User({
          fullName,
          email: invitation.email,
          password: hashedPassword,
          emailVerified: true, // Consider email verified since they received the invitation
          createdAt: new Date(),
        })

        await newUser.save()

        // Create workspace membership
        const membership = new WorkspaceMember({
          workspaceId: invitation.workspaceId._id,
          userId: newUser._id,
          roleId: invitation.roleId._id,
          status: 'active',
          joinedAt: new Date(),
        })

        await membership.save()

        // Mark invitation as accepted
        invitation.status = 'accepted'
        invitation.acceptedAt = new Date()
        await invitation.save()

        // Log successful registration and acceptance
        logUserActivity(newUser._id, 'user_registered_via_invitation', 'user', {
          workspaceId: invitation.workspaceId._id,
          invitationId: invitation._id,
        })

        logUserActivity(newUser._id, 'invitation_accepted', 'workspace', {
          workspaceId: invitation.workspaceId._id,
          invitationId: invitation._id,
          roleName: invitation.roleId.name,
        })

        logBusinessEvent('invitation_accepted_with_registration', newUser._id, invitation.workspaceId._id, {
          invitationId: invitation._id,
          roleName: invitation.roleId.name,
          inviterUserId: invitation.invitedBy._id,
          duration: Date.now() - startTime,
        })

        // Create notification for invitation acceptance
        try {
          await NotificationService.createNotification({
            workspaceId: invitation.workspaceId._id,
            title: 'New User Joined',
            message: `${fullName} created an account and joined ${invitation.workspaceId.name}`,
            type: 'success',
            entityType: 'workspace',
            entityId: invitation.workspaceId._id.toString(),
            createdBy: newUser._id,
            notificationLevel: 'workspace',
            excludeUserIds: [newUser._id.toString()],
            targetUserIds: [invitation.invitedBy._id.toString()],
            metadata: {
              newUserName: fullName,
              newUserEmail: invitation.email,
              roleName: invitation.roleId.name,
              workspaceName: invitation.workspaceId.name,
              inviterName: invitation.invitedBy.fullName || invitation.invitedBy.email,
            },
          })
        } catch (notificationError) {
          console.error(
            'Failed to create user registration notification:',
            notificationError
          )
          // Don't fail the registration if notification fails
        }

        log.info(
          `New user registered and invitation accepted for workspace ${invitation.workspaceId._id}`,
          {
            userId: newUser._id,
            email: invitation.email,
            workspaceId: invitation.workspaceId._id,
            invitationId: invitation._id,
            duration: Date.now() - startTime,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Account created and invitation accepted successfully',
            user: {
              id: newUser._id,
              fullName: newUser.fullName,
              email: newUser.email,
            },
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
          { status: 201 }
        )
      } catch (error) {
        log.error('Error accepting invitation with registration:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to create account and accept invitation',
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