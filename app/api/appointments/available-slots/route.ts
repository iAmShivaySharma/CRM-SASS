import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Appointment } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

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
        const date = url.searchParams.get('date')
        const assignedTo = url.searchParams.get('assignedTo')
        const duration = parseInt(url.searchParams.get('duration') || '30')
        const startHour = parseInt(url.searchParams.get('startHour') || '9')
        const endHour = parseInt(url.searchParams.get('endHour') || '20')

        if (!workspaceId || !date) {
          return NextResponse.json(
            { message: 'Workspace ID and date are required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const dayStart = new Date(date)
        dayStart.setHours(startHour, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(endHour, 0, 0, 0)

        const query: any = {
          workspaceId,
          status: { $nin: ['cancelled', 'no_show'] },
          startTime: { $gte: dayStart, $lt: dayEnd },
        }
        if (assignedTo) query.assignedTo = assignedTo

        const existingAppointments = await Appointment.find(query)
          .select('startTime endTime')
          .sort({ startTime: 1 })
          .lean()

        const bookedSlots = existingAppointments.map((a: any) => ({
          start: new Date(a.startTime).getTime(),
          end: new Date(a.endTime).getTime(),
        }))

        const slots: Array<{
          startTime: string
          endTime: string
          available: boolean
        }> = []
        const slotDuration = duration * 60000
        let current = dayStart.getTime()
        const now = Date.now()

        while (current + slotDuration <= dayEnd.getTime()) {
          const slotEnd = current + slotDuration
          const isPast = current < now
          const isConflict = bookedSlots.some(
            b => current < b.end && slotEnd > b.start
          )

          slots.push({
            startTime: new Date(current).toISOString(),
            endTime: new Date(slotEnd).toISOString(),
            available: !isPast && !isConflict,
          })

          current += 30 * 60000 // 30-minute increments
        }

        return NextResponse.json({
          success: true,
          date,
          duration,
          workingHours: { start: startHour, end: endHour },
          slots,
          totalSlots: slots.length,
          availableSlots: slots.filter(s => s.available).length,
        })
      } catch (error) {
        log.error('Get available slots error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
