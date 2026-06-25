import { type NextRequest, NextResponse } from 'next/server'
import { subDays } from 'date-fns'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Lead } from '@/lib/mongodb/client'
import { log } from '@/lib/logging/logger'
import { cached } from '@/lib/redis/cache'
import { checkPermission } from '@/lib/security/check-permission'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToMongoDB()

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const compareFrom = searchParams.get('compareFrom')
    const compareTo = searchParams.get('compareTo')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      authResult.user.id,
      workspaceId,
      'analytics.view'
    )
    if (permError) return permError

    const endDate = to ? new Date(to) : new Date()
    const startDate = from ? new Date(from) : subDays(endDate, 30)

    const compareEndDate = compareTo
      ? new Date(compareTo)
      : subDays(startDate, 1)
    const compareStartDate = compareFrom
      ? new Date(compareFrom)
      : subDays(compareEndDate, 30)

    const convertedStatuses = ['converted', 'closed', 'won']
    const closedStatuses = ['converted', 'closed', 'won', 'lost', 'cancelled']

    const cacheKey = `analytics:${workspaceId}:dashboard:${from || ''}:${to || ''}`

    const [stats] = await cached(cacheKey, 300, () =>
      Lead.aggregate([
        { $match: { workspaceId } },
        {
          $facet: {
            currentPeriod: [
              {
                $match: {
                  createdAt: { $gte: startDate, $lte: endDate },
                },
              },
              {
                $group: {
                  _id: null,
                  totalLeads: { $sum: 1 },
                  convertedLeads: {
                    $sum: {
                      $cond: [{ $in: ['$status', convertedStatuses] }, 1, 0],
                    },
                  },
                  totalRevenue: { $sum: { $ifNull: ['$value', 0] } },
                  activeDeals: {
                    $sum: {
                      $cond: [
                        { $not: { $in: ['$status', closedStatuses] } },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            previousPeriod: [
              {
                $match: {
                  createdAt: { $gte: compareStartDate, $lte: compareEndDate },
                },
              },
              {
                $group: {
                  _id: null,
                  totalLeads: { $sum: 1 },
                  convertedLeads: {
                    $sum: {
                      $cond: [{ $in: ['$status', convertedStatuses] }, 1, 0],
                    },
                  },
                  totalRevenue: { $sum: { $ifNull: ['$value', 0] } },
                },
              },
            ],
            monthlyRevenue: [
              {
                $match: {
                  createdAt: {
                    $gte: subDays(new Date(), 30),
                    $lte: new Date(),
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ['$value', 0] } },
                },
              },
            ],
            newLeads: [
              {
                $match: {
                  createdAt: { $gte: subDays(new Date(), 7), $lte: new Date() },
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ])
    )

    const current = stats.currentPeriod[0] || {
      totalLeads: 0,
      convertedLeads: 0,
      totalRevenue: 0,
      activeDeals: 0,
    }
    const previous = stats.previousPeriod[0] || {
      totalLeads: 0,
      convertedLeads: 0,
      totalRevenue: 0,
    }

    const totalLeads = current.totalLeads
    const totalLeadsPrevious = previous.totalLeads
    const conversionRate =
      totalLeads > 0 ? (current.convertedLeads / totalLeads) * 100 : 0
    const conversionRatePrevious =
      totalLeadsPrevious > 0
        ? (previous.convertedLeads / totalLeadsPrevious) * 100
        : 0
    const totalRevenue = current.totalRevenue
    const totalRevenuePrevious = previous.totalRevenue

    const leadsGrowth =
      totalLeadsPrevious > 0
        ? ((totalLeads - totalLeadsPrevious) / totalLeadsPrevious) * 100
        : 0
    const revenueGrowth =
      totalRevenuePrevious > 0
        ? ((totalRevenue - totalRevenuePrevious) / totalRevenuePrevious) * 100
        : 0
    const growth = (leadsGrowth + revenueGrowth) / 2

    const monthlyRevenue = stats.monthlyRevenue[0]?.total || 0
    const newLeads = stats.newLeads[0]?.count || 0

    const salesTargetProgress = Math.min((totalRevenue / 100000) * 100, 100)
    const leadQualityScore = Math.min(conversionRate * 3.5, 100)
    const customerSatisfaction = 85 + Math.random() * 15

    const data = {
      totalLeads,
      totalLeadsPrevious,
      conversionRate,
      conversionRatePrevious,
      totalRevenue,
      totalRevenuePrevious,
      growth,
      growthPrevious: 0,
      activeDeals: current.activeDeals,
      monthlyRevenue,
      newLeads,
      salesTargetProgress,
      leadQualityScore,
      customerSatisfaction,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    log.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
