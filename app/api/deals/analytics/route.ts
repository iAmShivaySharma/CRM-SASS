import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Deal, PipelineStage } from '@/lib/mongodb/client'
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
        const pipelineId = url.searchParams.get('pipelineId')
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
        if (pipelineId) matchFilter.pipelineId = pipelineId
        if (dateFrom || dateTo) {
          matchFilter.createdAt = {}
          if (dateFrom) matchFilter.createdAt.$gte = new Date(dateFrom)
          if (dateTo) {
            const end = new Date(dateTo)
            end.setHours(23, 59, 59, 999)
            matchFilter.createdAt.$lte = end
          }
        }

        const [overview, byStage, byStatus, wonDeals, lostDeals, monthlyTrend] =
          await Promise.all([
            // Overall stats
            Deal.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: null,
                  totalDeals: { $sum: 1 },
                  totalValue: { $sum: '$value' },
                  avgValue: { $avg: '$value' },
                  openDeals: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] },
                  },
                  openValue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'open'] }, '$value', 0],
                    },
                  },
                  wonCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
                  },
                  wonValue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'won'] }, '$value', 0],
                    },
                  },
                  lostCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] },
                  },
                  lostValue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'lost'] }, '$value', 0],
                    },
                  },
                  weightedValue: {
                    $sum: {
                      $multiply: ['$value', { $divide: ['$probability', 100] }],
                    },
                  },
                },
              },
            ]),

            // By stage
            Deal.aggregate([
              { $match: { ...matchFilter, status: 'open' } },
              {
                $group: {
                  _id: '$stageId',
                  count: { $sum: 1 },
                  totalValue: { $sum: '$value' },
                  avgValue: { $avg: '$value' },
                  weightedValue: {
                    $sum: {
                      $multiply: ['$value', { $divide: ['$probability', 100] }],
                    },
                  },
                },
              },
              { $sort: { totalValue: -1 } },
            ]),

            // By status
            Deal.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalValue: { $sum: '$value' },
                },
              },
            ]),

            // Recent won deals
            Deal.find({ ...matchFilter, status: 'won' })
              .sort({ actualCloseDate: -1 })
              .limit(5)
              .select('title value actualCloseDate contactId')
              .populate('contactId', 'name company')
              .lean(),

            // Recent lost deals
            Deal.find({ ...matchFilter, status: 'lost' })
              .sort({ actualCloseDate: -1 })
              .limit(5)
              .select('title value actualCloseDate lostReason contactId')
              .populate('contactId', 'name company')
              .lean(),

            // Monthly trend (last 12 months)
            Deal.aggregate([
              { $match: matchFilter },
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                  },
                  created: { $sum: 1 },
                  totalValue: { $sum: '$value' },
                  won: {
                    $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
                  },
                  wonValue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'won'] }, '$value', 0],
                    },
                  },
                  lost: {
                    $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] },
                  },
                },
              },
              { $sort: { '_id.year': -1, '_id.month': -1 } },
              { $limit: 12 },
            ]),
          ])

        // Enrich stage data with names
        const stageIds = byStage.map((s: any) => s._id).filter(Boolean)
        const stages = await PipelineStage.find({
          _id: { $in: stageIds },
        })
          .select('name color order')
          .lean()
        const stageMap: Record<string, any> = {}
        stages.forEach((s: any) => {
          stageMap[s._id.toString()] = s
        })

        const stats = overview[0] || {
          totalDeals: 0,
          totalValue: 0,
          avgValue: 0,
          openDeals: 0,
          openValue: 0,
          wonCount: 0,
          wonValue: 0,
          lostCount: 0,
          lostValue: 0,
          weightedValue: 0,
        }

        const closedDeals = stats.wonCount + stats.lostCount
        const winRate =
          closedDeals > 0 ? Math.round((stats.wonCount / closedDeals) * 100) : 0

        return NextResponse.json({
          success: true,
          analytics: {
            overview: {
              ...stats,
              winRate,
              avgDealSize: Math.round(stats.avgValue || 0),
              weightedPipeline: Math.round(stats.weightedValue || 0),
            },
            byStage: byStage
              .map((s: any) => ({
                stageId: s._id,
                stageName: stageMap[s._id]?.name || 'Unknown',
                stageColor: stageMap[s._id]?.color || '#6366f1',
                order: stageMap[s._id]?.order ?? 99,
                count: s.count,
                totalValue: s.totalValue,
                avgValue: Math.round(s.avgValue),
                weightedValue: Math.round(s.weightedValue),
              }))
              .sort((a: any, b: any) => a.order - b.order),
            byStatus: byStatus.map((s: any) => ({
              status: s._id,
              count: s.count,
              totalValue: s.totalValue,
            })),
            recentWon: wonDeals.map((d: any) => ({
              ...d,
              id: d._id,
              contactId:
                typeof d.contactId === 'object' && d.contactId
                  ? { ...d.contactId, id: d.contactId._id }
                  : d.contactId,
            })),
            recentLost: lostDeals.map((d: any) => ({
              ...d,
              id: d._id,
              contactId:
                typeof d.contactId === 'object' && d.contactId
                  ? { ...d.contactId, id: d.contactId._id }
                  : d.contactId,
            })),
            monthlyTrend: monthlyTrend.reverse().map((m: any) => ({
              month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
              created: m.created,
              totalValue: m.totalValue,
              won: m.won,
              wonValue: m.wonValue,
              lost: m.lost,
            })),
          },
        })
      } catch (error) {
        log.error('Deal analytics error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
