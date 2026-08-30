import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Appointment } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updateAppointmentSchema = z.object({
  startTime: z.string().optional(),
  duration: z.number().min(5).max(480).optional(),
  assignedTo: z.string().nullable().optional(),
  status: z
    .enum([
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ])
    .optional(),
  price: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
})

export const GET = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const appointment = await Appointment.findOne({ _id: id, workspaceId })
          .populate('serviceId', 'name duration color price')
          .populate('contactId', 'name email phone company')
          .populate('assignedTo', 'fullName email')
          .populate('createdBy', 'fullName email')

        if (!appointment) {
          return NextResponse.json(
            { message: 'Appointment not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          appointment: appointment.toJSON(),
        })
      } catch (error) {
        log.error('Get appointment error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
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
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateAppointmentSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

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

        const data = validationResult.data

        if (data.startTime) {
          appointment.startTime = new Date(data.startTime)
          const dur = data.duration || appointment.duration
          appointment.endTime = new Date(
            appointment.startTime.getTime() + dur * 60000
          )
        }
        if (data.duration && !data.startTime) {
          appointment.duration = data.duration
          appointment.endTime = new Date(
            appointment.startTime.getTime() + data.duration * 60000
          )
        }

        if (data.assignedTo !== undefined) {
          appointment.assignedTo = data.assignedTo || undefined
        }
        if (data.status) appointment.status = data.status
        if (data.price !== undefined) appointment.price = data.price
        if (data.notes !== undefined) appointment.notes = data.notes
        if (data.internalNotes !== undefined) {
          appointment.internalNotes = data.internalNotes
        }
        if (data.location !== undefined) appointment.location = data.location

        await appointment.save()

        const populated = await Appointment.findById(id)
          .populate('serviceId', 'name duration color price')
          .populate('contactId', 'name email phone')
          .populate('assignedTo', 'fullName email')

        return NextResponse.json({
          success: true,
          message: 'Appointment updated',
          appointment: populated?.toJSON(),
        })
      } catch (error) {
        log.error('Update appointment error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
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
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.delete'
        )
        if (permError) return permError

        const appointment = await Appointment.findOneAndDelete({
          _id: id,
          workspaceId,
        })
        if (!appointment) {
          return NextResponse.json(
            { message: 'Appointment not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Appointment deleted',
        })
      } catch (error) {
        log.error('Delete appointment error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
