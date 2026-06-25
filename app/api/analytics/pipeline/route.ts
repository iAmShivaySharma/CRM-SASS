import { type NextRequest, NextResponse } from 'next/server'
import { subDays } from 'date-fns'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { cached } from '@/lib/redis/cache'

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

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const endDate = to ? new Date(to) : new Date()
    const startDate = from ? new Date(from) : subDays(endDate, 30)

    const cacheKey = `analytics:${workspaceId}:pipeline:${from || ''}:${to || ''}`

    const [results] = await cached(cacheKey, 300, () =>
      Lead.aggregate([
        {
          $match: {
            workspaceId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: { $ifNull: ['$status', 'new'] },
                  count: { $sum: 1 },
                  totalValue: { $sum: { $ifNull: ['$value', 0] } },
                },
              },
              { $sort: { count: -1 } },
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  totalLeads: { $sum: 1 },
                  totalValue: { $sum: { $ifNull: ['$value', 0] } },
                },
              },
            ],
          },
        },
      ])
    )

    const totalLeads = results.totals[0]?.totalLeads || 0

    const pipelineData = results.byStatus.map((group: any) => ({
      statusName: group._id,
      count: group.count,
      percentage: totalLeads > 0 ? (group.count / totalLeads) * 100 : 0,
      value: group.totalValue,
    }))

    return NextResponse.json({
      success: true,
      data: pipelineData,
    })
  } catch (error) {
    log.error('Pipeline analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
