import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Appointment,
  Service,
  Activity,
  WorkspaceMember,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'

const createAppointmentSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(1).max(100),
  contactId: z.string().optional(),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(20).optional(),
  assignedTo: z.string().optional(),
  startTime: z.string().min(1),
  duration: z.number().min(5).max(480),
  type: z.enum(['scheduled', 'walk_in']).optional(),
  price: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(['manual', 'online', 'phone', 'whatsapp']).optional(),
  location: z.string().max(200).optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const status = url.searchParams.get('status')
        const assignedTo = url.searchParams.get('assignedTo')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')
        const contactId = url.searchParams.get('contactId')
        const search = url.searchParams.get('search')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const skip = (page - 1) * limit

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

        const query: any = { workspaceId }
        if (status) query.status = status
        if (assignedTo) query.assignedTo = assignedTo
        if (contactId) query.contactId = contactId
        if (search) query.$text = { $search: search }

        if (dateFrom || dateTo) {
          query.startTime = {}
          if (dateFrom) query.startTime.$gte = new Date(dateFrom)
          if (dateTo) {
            const end = new Date(dateTo)
            end.setHours(23, 59, 59, 999)
            query.startTime.$lte = end
          }
        }

        const [appointments, total] = await Promise.all([
          Appointment.find(query)
            .populate('serviceId', 'name duration color price')
            .populate('contactId', 'name email phone')
            .populate('assignedTo', 'fullName email')
            .sort({ startTime: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Appointment.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          appointments: appointments.map((a: any) => ({
            ...a,
            id: a._id,
            serviceId:
              typeof a.serviceId === 'object' && a.serviceId
                ? { ...a.serviceId, id: a.serviceId._id }
                : a.serviceId || null,
            contactId:
              typeof a.contactId === 'object' && a.contactId
                ? { ...a.contactId, id: a.contactId._id }
                : a.contactId || null,
            assignedTo:
              typeof a.assignedTo === 'object' && a.assignedTo
                ? { ...a.assignedTo, id: a.assignedTo._id }
                : a.assignedTo || null,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        })
      } catch (error) {
        log.error('Get appointments error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const body = await request.json()
        const validationResult = createAppointmentSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = body
        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const data = validationResult.data
        const startTime = new Date(data.startTime)
        const endTime = new Date(startTime.getTime() + data.duration * 60000)

        // Check for conflicts
        if (data.assignedTo) {
          const conflict = await Appointment.findOne({
            workspaceId,
            assignedTo: data.assignedTo,
            status: { $nin: ['cancelled', 'no_show'] },
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          })

          if (conflict) {
            return NextResponse.json(
              {
                message: `Time slot conflicts with existing appointment "${conflict.serviceName}" at ${new Date(conflict.startTime).toLocaleTimeString('en-IN')}`,
              },
              { status: 409 }
            )
          }
        }

        // Get service details if provided
        let price = data.price ?? 0
        if (data.serviceId) {
          const service = await Service.findOne({
            _id: data.serviceId,
            workspaceId,
            isActive: true,
          })
          if (service && data.price === undefined) {
            price = service.price
          }
        }

        // Auto-schedule reminders (24h + 1h before)
        const reminders = []
        const oneDayBefore = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
        const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000)

        if (oneDayBefore > new Date()) {
          reminders.push({
            type: 'whatsapp' as const,
            scheduledFor: oneDayBefore,
            status: 'pending' as const,
          })
        }
        if (oneHourBefore > new Date()) {
          reminders.push({
            type: 'sms' as const,
            scheduledFor: oneHourBefore,
            status: 'pending' as const,
          })
        }

        const appointment = await Appointment.create({
          workspaceId,
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          contactId: data.contactId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          assignedTo: data.assignedTo,
          startTime,
          endTime,
          duration: data.duration,
          type: data.type || 'scheduled',
          price,
          notes: data.notes,
          source: data.source || 'manual',
          location: data.location,
          reminders,
          createdBy: auth.user.id,
        })

        const populated = await Appointment.findById(appointment._id)
          .populate('serviceId', 'name duration color price')
          .populate('contactId', 'name email phone')
          .populate('assignedTo', 'fullName email')

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'created',
          entityType: 'appointment',
          entityId: appointment._id.toString(),
          description: `Booked ${data.serviceName} for ${data.customerName} at ${startTime.toLocaleString('en-IN')}`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'New Appointment Booked',
          message: `${data.customerName} — ${data.serviceName} at ${startTime.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
          type: 'info',
          entityType: 'appointment',
          entityId: appointment._id.toString(),
          createdBy: auth.user.id,
          notificationLevel: data.assignedTo ? 'user' : 'team',
          targetUserId: data.assignedTo,
          excludeUserIds: [auth.user.id],
        }).catch(() => {})

        logBusinessEvent('appointment_created', auth.user.id, workspaceId, {
          appointmentId: appointment._id,
          serviceName: data.serviceName,
          customerName: data.customerName,
          price,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Appointment booked successfully',
            appointment: populated?.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create appointment error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
