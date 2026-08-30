import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Appointment } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
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
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const matchFilter: any = { workspaceId }
        if (dateFrom || dateTo) {
          matchFilter.startTime = {}
          if (dateFrom) matchFilter.startTime.$gte = new Date(dateFrom)
          if (dateTo) {
            const end = new Date(dateTo)
            end.setHours(23, 59, 59, 999)
            matchFilter.startTime.$lte = end
          }
        }

        const [overview, byStatus, byService, byDay, upcoming] =
          await Promise.all([
            Appointment.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  totalRevenue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0],
                    },
                  },
                  completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                  },
                  cancelled: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
                  },
                  noShow: {
                    $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
                  },
                  avgPrice: { $avg: '$price' },
                },
              },
            ]),

            Appointment.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ]),

            Appointment.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: '$serviceName',
                  count: { $sum: 1 },
                  revenue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0],
                    },
                  },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
            ]),

            Appointment.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: { $dayOfWeek: '$startTime' },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ]),

            Appointment.find({
              workspaceId,
              status: { $in: ['scheduled', 'confirmed'] },
              startTime: { $gte: new Date() },
            })
              .select('serviceName customerName startTime assignedTo price')
              .populate('assignedTo', 'fullName')
              .sort({ startTime: 1 })
              .limit(10)
              .lean(),
          ])

        const stats = overview[0] || {
          total: 0,
          totalRevenue: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          avgPrice: 0,
        }

        const completionRate =
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        return NextResponse.json({
          success: true,
          analytics: {
            overview: {
              ...stats,
              completionRate,
              noShowRate:
                stats.total > 0
                  ? Math.round((stats.noShow / stats.total) * 100)
                  : 0,
              avgPrice: Math.round(stats.avgPrice || 0),
            },
            byStatus: byStatus.map((s: any) => ({
              status: s._id,
              count: s.count,
            })),
            byService,
            byDayOfWeek: byDay.map((d: any) => ({
              day: dayNames[d._id - 1] || d._id,
              count: d.count,
            })),
            upcoming: upcoming.map((a: any) => ({
              ...a,
              id: a._id,
              assignedTo:
                typeof a.assignedTo === 'object' && a.assignedTo
                  ? { ...a.assignedTo, id: a.assignedTo._id }
                  : a.assignedTo,
            })),
          },
        })
      } catch (error) {
        log.error('Appointment analytics error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
