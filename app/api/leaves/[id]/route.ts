import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { LeaveRequest } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const leaveRequest = await LeaveRequest.findById(id)
      .populate('employeeId', 'fullName email')
      .populate('approvedBy', 'fullName')
      .populate('leavePolicyId', 'name type')
      .populate('handoverDetails.handoverTo', 'fullName email')

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ leaveRequest })
  } catch (error) {
    log.error('Get leave request error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave request' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const leaveRequest = await LeaveRequest.findById(id)

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    const isOwner = leaveRequest.employeeId.toString() === auth.user._id.toString()

    // Handle status changes
    if (body.status) {
      switch (body.status) {
        case 'approved':
          if (isOwner) {
            return NextResponse.json(
              { error: 'You cannot approve your own leave request' },
              { status: 403 }
            )
          }
          await leaveRequest.approve(auth.user._id, body.comments)

          log.info('Leave request approved', {
            leaveRequestId: id,
            approvedBy: auth.user._id
          })
          break

        case 'rejected':
          if (isOwner) {
            return NextResponse.json(
              { error: 'You cannot reject your own leave request' },
              { status: 403 }
            )
          }
          if (!body.rejectionReason) {
            return NextResponse.json(
              { error: 'Rejection reason is required' },
              { status: 400 }
            )
          }
          await leaveRequest.reject(auth.user._id, body.rejectionReason)

          log.info('Leave request rejected', {
            leaveRequestId: id,
            rejectedBy: auth.user._id
          })
          break

        case 'cancelled':
          if (!isOwner) {
            return NextResponse.json(
              { error: 'Only the request owner can cancel a leave request' },
              { status: 403 }
            )
          }
          if (leaveRequest.status !== 'pending') {
            return NextResponse.json(
              { error: 'Only pending leave requests can be cancelled' },
              { status: 400 }
            )
          }
          await leaveRequest.cancel()

          log.info('Leave request cancelled', {
            leaveRequestId: id,
            cancelledBy: auth.user._id
          })
          break

        default:
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 }
          )
      }

      const updated = await LeaveRequest.findById(id)
        .populate('employeeId', 'fullName email')
        .populate('approvedBy', 'fullName')
        .populate('leavePolicyId', 'name type')

      return NextResponse.json({ success: true, leaveRequest: updated })
    }

    // Regular field updates (only if pending and owned by user)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'You can only edit your own leave requests' },
        { status: 403 }
      )
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be edited' },
        { status: 400 }
      )
    }

    const allowedFields = ['leaveType', 'startDate', 'endDate', 'totalDays', 'reason', 'leavePolicyId', 'attachments', 'emergencyContact', 'handoverDetails']
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        leaveRequest[field] = body[field]
      }
    }

    await leaveRequest.save()

    log.info('Leave request updated', {
      leaveRequestId: id,
      updatedBy: auth.user._id
    })

    const updated = await LeaveRequest.findById(id)
      .populate('employeeId', 'fullName email')
      .populate('approvedBy', 'fullName')
      .populate('leavePolicyId', 'name type')

    return NextResponse.json({ success: true, leaveRequest: updated })
  } catch (error) {
    log.error('Update leave request error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update leave request' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const leaveRequest = await LeaveRequest.findById(id)

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    const isOwner = leaveRequest.employeeId.toString() === auth.user._id.toString()

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You can only delete your own leave requests' },
        { status: 403 }
      )
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be deleted' },
        { status: 400 }
      )
    }

    await LeaveRequest.findByIdAndDelete(id)

    log.info('Leave request deleted', {
      leaveRequestId: id,
      deletedBy: auth.user._id
    })

    return NextResponse.json({ success: true, message: 'Leave request deleted' })
  } catch (error) {
    log.error('Delete leave request error:', error)
    return NextResponse.json(
      { error: 'Failed to delete leave request' },
      { status: 500 }
    )
  }
}
