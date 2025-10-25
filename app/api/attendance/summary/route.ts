import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Attendance, WorkspaceMember } from '@/lib/mongodb/models'
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
    const workspaceId = auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')

    // Default to today if no dates provided
    const today = new Date()
    const start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = endDate ? new Date(endDate) : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Build base query
    const baseQuery: any = {
      workspaceId,
      date: {
        $gte: start,
        $lt: end
      }
    }

    if (userId) {
      baseQuery.userId = userId
    }

    // Get attendance summary statistics
    const summary = await Attendance.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentDays: {
            $sum: {
              $cond: [
                { $in: ['$status', ['clocked_in', 'clocked_out', 'on_break', 'late']] },
                1,
                0
              ]
            }
          },
          absentDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          lateDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
            }
          },
          totalWorkMinutes: { $sum: '$totalWorkTime' },
          totalOvertimeMinutes: { $sum: '$overtimeMinutes' },
          averageWorkMinutes: { $avg: '$totalWorkTime' }
        }
      }
    ])

    const stats = summary[0] || {
      totalRecords: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalWorkMinutes: 0,
      totalOvertimeMinutes: 0,
      averageWorkMinutes: 0
    }

    // Calculate attendance rate
    const workingDays = stats.presentDays + stats.absentDays
    const attendanceRate = workingDays > 0 ? (stats.presentDays / workingDays) * 100 : 0

    // Convert minutes to hours
    const totalWorkHours = Math.round((stats.totalWorkMinutes / 60) * 100) / 100
    const totalOvertimeHours = Math.round((stats.totalOvertimeMinutes / 60) * 100) / 100
    const averageWorkHours = Math.round((stats.averageWorkMinutes / 60) * 100) / 100

    // Get today's workspace attendance summary (who's currently working)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          workspaceId,
          date: { $gte: todayStart, $lt: todayEnd }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: 1,
          userName: '$user.fullName',
          userEmail: '$user.email',
          status: 1,
          clockIn: 1,
          clockOut: 1,
          workType: 1,
          totalWorkTime: 1
        }
      },
      { $sort: { clockIn: 1 } }
    ])

    // Group today's attendance by status
    const todayByStatus = todayAttendance.reduce((acc: any, record: any) => {
      if (!acc[record.status]) {
        acc[record.status] = []
      }
      acc[record.status].push(record)
      return acc
    }, {})

    return NextResponse.json({
      summary: {
        totalDays: stats.totalRecords,
        workingDays,
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        lateDays: stats.lateDays,
        totalWorkHours,
        totalOvertimeHours,
        averageWorkHours,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      },
      todayAttendance: {
        total: todayAttendance.length,
        byStatus: todayByStatus,
        records: todayAttendance
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })
  } catch (error) {
    log.error('Get attendance summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    )
  }
}