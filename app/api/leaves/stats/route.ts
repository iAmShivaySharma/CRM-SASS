import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { LeaveRequest } from '@/lib/mongodb/models'
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

    const now = new Date()

    // Start of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Start of current year
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)

    // Next 30 days
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Count pending requests
    const pendingCount = await LeaveRequest.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'pending'
    })

    // Count approved this month
    const approvedThisMonth = await LeaveRequest.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'approved',
      approvedDate: { $gte: monthStart, $lte: monthEnd }
    })

    // Total leave days used this year
    const yearlyUsage = await LeaveRequest.aggregate([
      {
        $match: {
          workspaceId: workspaceObjectId,
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalDaysUsed: { $sum: '$totalDays' }
        }
      }
    ])

    const totalDaysUsedThisYear = yearlyUsage[0]?.totalDaysUsed || 0

    // Upcoming leaves (next 30 days, approved)
    const upcomingLeaves = await LeaveRequest.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'approved',
      startDate: { $gte: now, $lte: next30Days }
    })

    // Leave type breakdown
    const leaveTypeBreakdown = await LeaveRequest.aggregate([
      {
        $match: {
          workspaceId: workspaceObjectId,
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      },
      { $sort: { totalDays: -1 } }
    ])

    return NextResponse.json({
      pendingCount,
      approvedThisMonth,
      totalDaysUsedThisYear,
      upcomingLeaves,
      leaveTypeBreakdown
    })
  } catch (error) {
    log.error('Get leave stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave statistics' },
      { status: 500 }
    )
  }
}
