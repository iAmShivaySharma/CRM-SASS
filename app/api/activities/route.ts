import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkspaceMember, Activity, User } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

export const GET = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
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
      const limit = parseInt(url.searchParams.get('limit') || '50')

      if (!workspaceId) {
        return NextResponse.json(
          {
            message: 'Workspace ID is required',
            activities: [],
            total: 0,
          },
          { status: 400 }
        )
      }

      const userMembership = await WorkspaceMember.findOne({
        workspaceId,
        userId: auth.user.id,
        status: 'active',
      })

      if (!userMembership) {
        return NextResponse.json(
          {
            message: 'Access denied',
            activities: [],
            total: 0,
          },
          { status: 403 }
        )
      }

      try {
        const activities = await Activity.find({
          workspaceId: workspaceId,
        })
          .select(
            'activityType entityType entityId description performedBy metadata createdAt workspaceId'
          )
          .populate('performedBy', 'fullName email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()

        const transformedActivities = activities.map(activity => ({
          id:
            typeof activity._id === 'string'
              ? activity._id
              : String(activity._id),
          type: activity.activityType,
          description:
            activity.description ||
            `${activity.activityType} on ${activity.entityType}`,
          userId: activity.performedBy?._id?.toString() || activity.performedBy,
          userName:
            activity.performedBy?.fullName ||
            activity.performedBy?.email ||
            'Unknown User',
          workspaceId: activity.workspaceId,
          createdAt: activity.createdAt,
          metadata: activity.metadata || {},
        }))

        return NextResponse.json({
          activities: transformedActivities,
          total: transformedActivities.length,
        })
      } catch (activityError) {
        return NextResponse.json({
          activities: [],
          total: 0,
        })
      }
    } catch (error) {
      const duration = Date.now() - startTime
      log.error(`Get activities failed after ${duration}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      return NextResponse.json({
        message: 'Failed to fetch activities',
        activities: [],
        total: 0,
      })
    }
  })
)
