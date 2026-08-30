import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Invitation } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { rateLimit } from '@/lib/security/rate-limiter'
import { getClientIP } from '@/lib/utils/ip-utils'

const declineSchema = z.object({
  token: z.string().min(1),
})

export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    try {
      await connectToMongoDB()

      const clientIp = getClientIP(request)
      const rateLimitResult = await rateLimit(clientIp, 'api')
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { message: 'Too many requests' },
          { status: 429 }
        )
      }

      const body = await request.json()
      const validationResult = declineSchema.safeParse(body)

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

      const invitation = await Invitation.findOne({
        token,
        status: 'pending',
      })

      if (!invitation) {
        return NextResponse.json(
          { message: 'Invitation not found or already processed' },
          { status: 404 }
        )
      }

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        invitation.status = 'expired'
        await invitation.save()
        return NextResponse.json(
          { message: 'This invitation has already expired' },
          { status: 410 }
        )
      }

      invitation.status = 'cancelled'
      await invitation.save()

      log.info('Invitation declined', {
        invitationId: invitation._id,
        email: invitation.email,
        workspaceId: invitation.workspaceId,
      })

      return NextResponse.json({
        success: true,
        message: 'Invitation declined',
      })
    } catch (error) {
      log.error('Decline invitation error:', error)
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)
