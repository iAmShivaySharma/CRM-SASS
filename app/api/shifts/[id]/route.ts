import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { Shift, Attendance } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    const workspaceId = auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const shift = await Shift.findOne({
      _id: params.id,
      workspaceId
    }).populate('createdBy', 'name email')

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Get employee count for this shift
    const employeeCount = await Attendance.distinct('userId', {
      workspaceId,
      shiftId: shift._id,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).then((users: any[]) => users.length)

    return NextResponse.json({
      ...shift.toObject(),
      employeeCount
    })
  } catch (error) {
    log.error('Get shift error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      workingDays,
      breakDuration,
      graceTime,
      description,
      isActive,
      isDefault,
      isFlexible,
      color,
      allowedWorkTypes,
      overtimeRules
    } = body

    const shift = await Shift.findOne({
      _id: params.id,
      workspaceId
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // If this is being set as default, unset other defaults
    if (isDefault && !shift.isDefault) {
      await Shift.updateMany(
        { workspaceId, _id: { $ne: params.id } },
        { isDefault: false }
      )
    }

    // Update shift fields
    if (name) shift.name = name
    if (startTime) shift.startTime = startTime
    if (endTime) shift.endTime = endTime
    if (workingDays) shift.workingDays = workingDays
    if (breakDuration !== undefined) shift.breakDuration = breakDuration
    if (graceTime !== undefined) shift.graceTime = graceTime
    if (description !== undefined) shift.description = description
    if (isActive !== undefined) shift.isActive = isActive
    if (isDefault !== undefined) shift.isDefault = isDefault
    if (isFlexible !== undefined) shift.isFlexible = isFlexible
    if (color) shift.color = color
    if (allowedWorkTypes) shift.allowedWorkTypes = allowedWorkTypes
    if (overtimeRules) shift.overtimeRules = overtimeRules

    await shift.save()
    await shift.populate('createdBy', 'name email')

    log.info('Shift updated', {
      userId: auth.user.id,
      workspaceId,
      shiftId: shift._id,
      shiftName: shift.name
    })

    return NextResponse.json({
      success: true,
      shift,
      message: 'Shift updated successfully'
    })
  } catch (error) {
    log.error('Update shift error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    const workspaceId = auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const shift = await Shift.findOne({
      _id: params.id,
      workspaceId
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Check if shift is being used by any attendance records
    const attendanceCount = await Attendance.countDocuments({
      workspaceId,
      shiftId: shift._id
    })

    if (attendanceCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete shift that has attendance records. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // If this is the default shift, make another active shift default
    if (shift.isDefault) {
      const anotherShift = await Shift.findOne({
        workspaceId,
        _id: { $ne: params.id },
        isActive: true
      })

      if (anotherShift) {
        anotherShift.isDefault = true
        await anotherShift.save()
      }
    }

    await Shift.deleteOne({ _id: params.id })

    log.info('Shift deleted', {
      userId: auth.user.id,
      workspaceId,
      shiftId: params.id,
      shiftName: shift.name
    })

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully'
    })
  } catch (error) {
    log.error('Delete shift error:', error)
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    )
  }
}