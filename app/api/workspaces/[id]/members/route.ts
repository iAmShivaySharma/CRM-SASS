import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkspaceMember, User } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

// GET /api/workspaces/[id]/members - Get workspace members
export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const startTime = Date.now()
      const { id: workspaceId } = await params

      try {
        await connectToMongoDB()

        // Verify authentication
        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        // Check if user has access to this workspace
        const userMembership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        })

        if (!userMembership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Get all active members of the workspace
        const members = await WorkspaceMember.find({
          workspaceId,
          status: 'active',
        })
          .populate('userId', 'fullName email')
          .lean()

        // Transform the data
        const transformedMembers = members.map((member: any) => ({
          id: member._id.toString(),
          userId: member.userId._id.toString(),
          workspaceId: member.workspaceId,
          roleId: member.roleId,
          status: member.status,
          joinedAt: member.joinedAt,
          user: {
            id: member.userId._id.toString(),
            fullName: member.userId.fullName,
            email: member.userId.email,
          },
        }))

        log.info(`Workspace members retrieved for workspace ${workspaceId}`, {
          workspaceId,
          memberCount: transformedMembers.length,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          members: transformedMembers,
        })
      } catch (error) {
        log.error('Get workspace members error:', error)
        return NextResponse.json(
          {
            success: false,
            message: 'Internal server error',
          },
          { status: 500 }
        )
      }
    }
  )
)
