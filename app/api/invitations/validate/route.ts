import { NextRequest, NextResponse } from 'next/server'
import { Invitation } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { rateLimit } from '@/lib/security/rate-limiter'
import { getClientIP } from '@/lib/utils/ip-utils'
import { z } from 'zod'

const validateInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

// POST /api/invitations/validate - Validate an invitation token (no auth required)
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = validateInvitationSchema.safeParse(body)

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
        {
          valid: false,
          message: 'Invalid or expired invitation token'
        },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      // Mark invitation as expired
      invitation.status = 'expired'
      await invitation.save()

      return NextResponse.json(
        {
          valid: false,
          message: 'This invitation has expired'
        },
        { status: 410 }
      )
    }

    log.info('Invitation token validated successfully', {
      invitationId: invitation._id,
      workspaceId: invitation.workspaceId._id,
      email: invitation.email,
    })

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        workspace: {
          id: invitation.workspaceId._id,
          name: invitation.workspaceId.name,
        },
        role: {
          id: invitation.roleId._id,
          name: invitation.roleId.name,
        },
        invitedBy: {
          name: invitation.invitedBy.fullName || invitation.invitedBy.email,
          email: invitation.invitedBy.email,
        },
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    log.error('Error validating invitation:', error)

    return NextResponse.json(
      {
        valid: false,
        message: 'Failed to validate invitation',
        error:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    )
  }
}