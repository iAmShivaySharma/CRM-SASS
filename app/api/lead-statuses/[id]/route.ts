import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { LeadStatus, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

// DELETE /api/lead-statuses/[id] - Delete a lead status
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const startTime = Date.now()

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
        const statusId = params.id

        if (!workspaceId || !statusId) {
          return NextResponse.json(
            { message: 'Workspace ID and Status ID are required' },
            { status: 400 }
          )
        }

        // Verify user has access to this workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Check if status exists and is not default
        const status = await LeadStatus.findOne({
          _id: statusId,
          workspaceId,
        })

        if (!status) {
          return NextResponse.json(
            { message: 'Status not found' },
            { status: 404 }
          )
        }

        if (status.isDefault) {
          return NextResponse.json(
            { message: 'Cannot delete default status' },
            { status: 400 }
          )
        }

        // Delete the status
        await LeadStatus.findByIdAndDelete(statusId)

        logUserActivity(auth.user.id, 'lead_status.delete', 'lead_status', {
          workspaceId,
          statusId,
          statusName: status.name,
        })

        logBusinessEvent('lead_status_deleted', auth.user.id, workspaceId, {
          statusId,
          statusName: status.name,
        })

        return NextResponse.json({
          success: true,
          message: 'Status deleted successfully',
        })
      } catch (error) {
        log.error('Delete lead status error:', error)
        return NextResponse.json({ message: 'Server error' }, { status: 500 })
      }
    }
  )
)
