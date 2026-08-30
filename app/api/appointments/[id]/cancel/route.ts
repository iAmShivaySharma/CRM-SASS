import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Appointment, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const cancelSchema = z.object({
  workspaceId: z.string().min(1),
  cancelReason: z.string().max(500).optional(),
})

export const POST = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
        const body = await request.json()
        const validationResult = cancelSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId, cancelReason } = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const appointment = await Appointment.findOne({ _id: id, workspaceId })
        if (!appointment) {
          return NextResponse.json(
            { message: 'Appointment not found' },
            { status: 404 }
          )
        }

        if (appointment.status === 'cancelled') {
          return NextResponse.json(
            { message: 'Appointment is already cancelled' },
            { status: 400 }
          )
        }

        appointment.status = 'cancelled'
        appointment.cancelReason = cancelReason
        await appointment.save()

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'appointment',
          entityId: id,
          description: `Cancelled appointment for ${appointment.customerName}${cancelReason ? ` — ${cancelReason}` : ''}`,
        })

        return NextResponse.json({
          success: true,
          message: 'Appointment cancelled',
          appointment: appointment.toJSON(),
        })
      } catch (error) {
        log.error('Cancel appointment error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
