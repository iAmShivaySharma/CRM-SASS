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

    // Get today's attendance
    const attendance = await Attendance.getTodayAttendance(auth.user._id, workspaceId)

    let todayAttendance = null
    let shift = null
    let canClockIn = true
    let canClockOut = false
    let canStartBreak = false
    let canEndBreak = false

    if (attendance) {
      await attendance.populate('shiftId', 'name startTime endTime totalHours')
      todayAttendance = attendance
      shift = attendance.shiftId

      // Determine available actions based on current status
      switch (attendance.status) {
        case 'clocked_in':
        case 'late':
          canClockIn = false
          canClockOut = true
          canStartBreak = true
          canEndBreak = false
          break
        case 'on_break':
          canClockIn = false
          canClockOut = false
          canStartBreak = false
          canEndBreak = true
          break
        case 'clocked_out':
          canClockIn = false
          canClockOut = false
          canStartBreak = false
          canEndBreak = false
          break
      }
    } else {
      // No attendance record for today - can clock in
      shift = await Shift.getDefaultShift(workspaceId)
    }

    // Calculate current work time if clocked in
    let currentWorkTime = 0
    let expectedClockOut = null

    if (attendance && attendance.status !== 'clocked_out') {
      currentWorkTime = attendance.calculateTotalWorkTime()

      // Debug logging
      log.info('Current work time calculation', {
        userId: auth.user._id,
        workspaceId,
        status: attendance.status,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        totalBreakTime: attendance.totalBreakTime,
        calculatedWorkTime: currentWorkTime
      })

      // Also update the totalWorkTime field for current work time display
      attendance.totalWorkTime = currentWorkTime

      // Calculate expected clock out time
      if (shift && attendance.clockIn && typeof shift === 'object' && 'totalHours' in shift) {
        const shiftDurationMs = shift.totalHours * 60 * 60 * 1000
        expectedClockOut = new Date(attendance.clockIn.getTime() + shiftDurationMs)
      }
    } else if (attendance && attendance.status === 'clocked_out') {
      // For clocked out status, use the saved totalWorkTime
      currentWorkTime = attendance.totalWorkTime || 0

      log.info('Clocked out work time', {
        userId: auth.user._id,
        workspaceId,
        savedTotalWorkTime: attendance.totalWorkTime,
        currentWorkTime
      })
    }

    // Get workspace attendance summary for today
    const today = new Date()
    const workspaceSummary = await Attendance.getWorkspaceSummary(workspaceId, today)

    return NextResponse.json({
      attendance: todayAttendance,
      shift,
      actions: {
        canClockIn,
        canClockOut,
        canStartBreak,
        canEndBreak
      },
      currentWorkTime,
      expectedClockOut,
      workspaceSummary
    })
  } catch (error) {
    log.error('Get today attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today\'s attendance' },
      { status: 500 }
    )
  }
}