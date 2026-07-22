import { type NextRequest, NextResponse } from 'next/server'
import {
  subDays,
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
} from 'date-fns'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Lead } from '@/lib/mongodb/client'
import { cached } from '@/lib/redis/cache'
import { checkPermission } from '@/lib/security/check-permission'

export const dynamic = 'force-dynamic'

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
    const granularity = searchParams.get('granularity') || 'day'

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

    const cacheKey = `analytics:${workspaceId}:timeseries:${granularity}:${from || ''}:${to || ''}`

    const convertedStatuses = ['converted', 'closed', 'won']

    let dateFormat: string
    let groupBy: any
    if (granularity === 'month') {
      dateFormat = 'yyyy-MM'
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      }
    } else if (granularity === 'week') {
      dateFormat = 'yyyy-MM-dd'
      groupBy = {
        year: { $isoWeekYear: '$createdAt' },
        week: { $isoWeek: '$createdAt' },
      }
    } else {
      dateFormat = 'yyyy-MM-dd'
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      }
    }

    const data = await cached(cacheKey, 300, async () => {
      const results = await Lead.aggregate([
        {
          $match: {
            workspaceId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: groupBy,
            leads: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$value', 0] } },
            conversions: {
              $sum: {
                $cond: [{ $in: ['$status', convertedStatuses] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 },
        },
      ])

      return results.map((r: any) => {
        let date: string
        if (granularity === 'month') {
          date = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`
        } else if (granularity === 'week') {
          const d = new Date(r._id.year, 0, 1 + (r._id.week - 1) * 7)
          date = format(d, 'yyyy-MM-dd')
        } else {
          date = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`
        }
        return {
          date,
          leads: r.leads,
          revenue: r.revenue,
          conversions: r.conversions,
        }
      })
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
