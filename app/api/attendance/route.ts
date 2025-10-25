import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Attendance, Shift } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const userId = searchParams.get('userId') || auth.user._id
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')

    // Build query
    const query: any = {
      userId,
      workspaceId
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // Get total count
    const total = await Attendance.countDocuments(query)

    // Get attendance records
    const attendanceRecords = await Attendance.find(query)
      .populate('userId', 'name email avatar')
      .populate('approvedBy', 'name email')
      .populate('shiftId', 'name startTime endTime')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      attendanceRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    log.error('Get attendance records error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const body = await request.json()
    const workspaceId = body.workspaceId || auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const {
      action, // 'clock_in', 'clock_out', 'break_start', 'break_end'
      workType = 'office',
      location,
      notes
    } = body

    // Get user-agent info
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Get today's attendance record
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let attendance = await Attendance.findOne({
      userId: auth.user._id,
      workspaceId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    })

    const now = new Date()

    switch (action) {
      case 'clock_in':
        if (attendance) {
          return NextResponse.json(
            { error: 'Already clocked in today' },
            { status: 400 }
          )
        }

        // Get default shift
        const shift = await Shift.getDefaultShift(workspaceId)

        attendance = new Attendance({
          userId: auth.user._id,
          workspaceId,
          date: today,
          clockIn: now,
          status: 'clocked_in',
          workType,
          location: location ? {
            clockInLocation: location
          } : undefined,
          notes,
          ip,
          device: userAgent,
          shiftId: shift?._id,
          regularHours: shift?.totalHours || 8
        })

        // Check if late
        if (shift && !shift.isWithinGracePeriod(now, today)) {
          attendance.status = 'late'
        }

        await attendance.save()

        log.info('User clocked in', {
          userId: auth.user._id,
          workspaceId,
          attendanceId: attendance._id,
          clockInTime: now
        })

        break

      case 'clock_out':
        if (!attendance || attendance.status === 'clocked_out') {
          return NextResponse.json(
            { error: 'Not currently clocked in' },
            { status: 400 }
          )
        }

        attendance.clockOut = now
        attendance.status = 'clocked_out'

        if (location) {
          attendance.location = {
            ...attendance.location,
            clockOutLocation: location
          }
        }

        if (notes) {
          attendance.notes = attendance.notes ?
            `${attendance.notes}\nClock out: ${notes}` :
            `Clock out: ${notes}`
        }

        // Calculate work time and overtime
        const calculatedWorkTime = attendance.calculateTotalWorkTime()
        attendance.totalWorkTime = calculatedWorkTime
        attendance.overtimeMinutes = attendance.calculateOvertime()
        attendance.overtime = attendance.overtimeMinutes > 0

        await attendance.save()

        log.info('User clocked out', {
          userId: auth.user._id,
          workspaceId,
          attendanceId: attendance._id,
          clockOutTime: now,
          clockInTime: attendance.clockIn,
          totalBreakTime: attendance.totalBreakTime,
          calculatedWorkTime,
          totalWorkTime: attendance.totalWorkTime,
          overtimeMinutes: attendance.overtimeMinutes
        })

        break

      case 'break_start':
        if (!attendance || attendance.status !== 'clocked_in') {
          return NextResponse.json(
            { error: 'Must be clocked in to start break' },
            { status: 400 }
          )
        }

        if (attendance.breakStart && !attendance.breakEnd) {
          return NextResponse.json(
            { error: 'Already on break' },
            { status: 400 }
          )
        }

        attendance.breakStart = now
        attendance.breakEnd = undefined
        attendance.status = 'on_break'

        await attendance.save()
        break

      case 'break_end':
        if (!attendance || attendance.status !== 'on_break') {
          return NextResponse.json(
            { error: 'Not currently on break' },
            { status: 400 }
          )
        }

        attendance.breakEnd = now
        attendance.status = 'clocked_in'

        // Calculate break duration and add to total
        if (attendance.breakStart) {
          const breakDuration = Math.floor(
            (now.getTime() - attendance.breakStart.getTime()) / (1000 * 60)
          )
          attendance.totalBreakTime += breakDuration
        }

        await attendance.save()
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Populate fields for response
    await attendance.populate('shiftId', 'name startTime endTime')

    return NextResponse.json({
      success: true,
      attendance,
      message: `Successfully ${action.replace('_', ' ')}`
    })
  } catch (error) {
    log.error('Attendance action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Attendance action failed' },
      { status: 500 }
    )
  }
}