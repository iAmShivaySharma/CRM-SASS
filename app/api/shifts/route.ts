import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { Shift } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const workspaceId = auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build query
    const query: any = { workspaceId }
    if (!includeInactive) {
      query.isActive = true
    }

    // Get total count
    const total = await Shift.countDocuments(query)

    // Get shifts
    const shifts = await Shift.find(query)
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Get employee count for each shift (from Attendance model)
    const shiftsWithEmployeeCount = await Promise.all(
      shifts.map(async (shift) => {
        // Count unique users who have used this shift in the last 30 days
        const employeeCount = await require('@/lib/mongodb/models').Attendance.distinct('userId', {
          workspaceId,
          shiftId: shift._id,
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).then((users: any[]) => users.length)

        return {
          ...shift,
          employeeCount
        }
      })
    )

    return NextResponse.json({
      shifts: shiftsWithEmployeeCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    log.error('Get shifts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const workspaceId = auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      startTime,
      endTime,
      workingDays = [1, 2, 3, 4, 5], // Default to weekdays
      breakDuration = 60,
      graceTime = 15,
      description,
      isActive = true,
      isDefault = false,
      isFlexible = false,
      color = '#3B82F6',
      allowedWorkTypes = ['office', 'remote'],
      overtimeRules = {
        allowOvertime: true,
        maxOvertimeHours: 4,
        overtimeMultiplier: 1.5
      }
    } = body

    // Validate required fields
    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Name, start time, and end time are required' },
        { status: 400 }
      )
    }

    // Calculate total hours
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    let startMinutes = startHour * 60 + startMinute
    let endMinutes = endHour * 60 + endMinute

    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }

    const totalHours = Math.round(((endMinutes - startMinutes - breakDuration) / 60) * 100) / 100

    if (totalHours <= 0) {
      return NextResponse.json(
        { error: 'Invalid shift duration' },
        { status: 400 }
      )
    }

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await Shift.updateMany(
        { workspaceId, _id: { $ne: null } },
        { isDefault: false }
      )
    }

    // Create shift
    const shift = new Shift({
      name,
      workspaceId,
      startTime,
      endTime,
      workingDays,
      breakDuration,
      graceTime,
      description,
      isActive,
      isDefault,
      isFlexible,
      color,
      allowedWorkTypes,
      overtimeRules,
      totalHours,
      createdBy: auth.user.id
    })

    await shift.save()
    await shift.populate('createdBy', 'name email')

    log.info('Shift created', {
      userId: auth.user.id,
      workspaceId,
      shiftId: shift._id,
      shiftName: shift.name
    })

    return NextResponse.json({
      success: true,
      shift,
      message: 'Shift created successfully'
    })
  } catch (error) {
    log.error('Create shift error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create shift' },
      { status: 500 }
    )
  }
}