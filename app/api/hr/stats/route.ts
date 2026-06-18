import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkspaceMember, Attendance, LeaveRequest, Asset } from '@/lib/mongodb/models'
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

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId)

    // Total active employees
    const totalEmployees = await WorkspaceMember.countDocuments({
      workspaceId: workspaceObjectId,
      isActive: true
    })

    // Today's attendance summary
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          workspaceId: workspaceObjectId,
          date: { $gte: todayStart, $lt: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                { $in: ['$status', ['clocked_in', 'clocked_out', 'on_break']] },
                1,
                0
              ]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
            }
          }
        }
      }
    ])

    const attendance = todayAttendance[0] || {
      total: 0,
      present: 0,
      absent: 0,
      late: 0
    }

    // Attendance rate
    const attendanceRate = totalEmployees > 0
      ? Math.round(((attendance.present + attendance.late) / totalEmployees) * 100 * 100) / 100
      : 0

    // Pending leave requests
    const pendingLeaves = await LeaveRequest.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'pending'
    })

    // Total assets and available assets
    const totalAssets = await Asset.countDocuments({
      workspaceId: workspaceObjectId
    })

    const availableAssets = await Asset.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'available'
    })

    return NextResponse.json({
      totalEmployees,
      todayAttendance: {
        present: attendance.present,
        absent: attendance.absent,
        late: attendance.late,
        total: attendance.total
      },
      attendanceRate,
      pendingLeaves,
      totalAssets,
      availableAssets
    })
  } catch (error) {
    log.error('Get HR stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HR statistics' },
      { status: 500 }
    )
  }
}
