import { NextRequest, NextResponse } from 'next/server'
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

    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query
    const query: any = { workspaceId }

    if (status) {
      query.status = status
    }

    if (employeeId) {
      query.employeeId = employeeId
    }

    // Get total count
    const total = await LeaveRequest.countDocuments(query)

    // Get leave requests
    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'fullName email')
      .populate('approvedBy', 'fullName')
      .populate('leavePolicyId', 'name type')
      .sort({ appliedDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      leaveRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    log.error('Get leave requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
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
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      leavePolicyId,
      attachments,
      emergencyContact,
      handoverDetails
    } = body

    if (!leaveType || !startDate || !endDate || !totalDays || !reason || !leavePolicyId) {
      return NextResponse.json(
        { error: 'Missing required fields: leaveType, startDate, endDate, totalDays, reason, leavePolicyId' },
        { status: 400 }
      )
    }

    // Check for overlapping requests
    const overlapping = await LeaveRequest.getOverlappingRequests(
      auth.user._id,
      new Date(startDate),
      new Date(endDate)
    )

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: 'You already have a leave request overlapping with these dates' },
        { status: 409 }
      )
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      workspaceId,
      employeeId: auth.user._id,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays,
      reason,
      leavePolicyId,
      attachments,
      emergencyContact,
      handoverDetails
    })

    await leaveRequest.save()

    log.info('Leave request created', {
      userId: auth.user._id,
      workspaceId,
      leaveRequestId: leaveRequest._id,
      leaveType,
      startDate,
      endDate
    })

    return NextResponse.json(
      { success: true, leaveRequest },
      { status: 201 }
    )
  } catch (error) {
    log.error('Create leave request error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create leave request' },
      { status: 500 }
    )
  }
}
