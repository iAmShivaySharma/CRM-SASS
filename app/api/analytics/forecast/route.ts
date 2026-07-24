export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
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

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const cacheKey = `forecast:${workspaceId}`

    const data = await cached(
      cacheKey,
      async () => {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

        const [
          totalLeads,
          recentLeads,
          previousPeriodLeads,
          convertedLeads,
          previousConverted,
          pipelineValue,
          highPriorityLeads,
        ] = await Promise.all([
          Lead.countDocuments({ workspaceId }),
          Lead.countDocuments({
            workspaceId,
            createdAt: { $gte: thirtyDaysAgo },
          }),
          Lead.countDocuments({
            workspaceId,
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          }),
          Lead.countDocuments({
            workspaceId,
            convertedToContactId: { $exists: true, $ne: null },
            convertedAt: { $gte: thirtyDaysAgo },
          }),
          Lead.countDocuments({
            workspaceId,
            convertedToContactId: { $exists: true, $ne: null },
            convertedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          }),
          Lead.aggregate([
            {
              $match: {
                workspaceId,
                convertedToContactId: { $exists: false },
                value: { $gt: 0 },
              },
            },
            { $group: { _id: null, total: { $sum: '$value' } } },
          ]),
          Lead.countDocuments({
            workspaceId,
            priority: 'high',
            convertedToContactId: { $exists: false },
          }),
        ])

        const conversionRate =
          recentLeads > 0 ? (convertedLeads / recentLeads) * 100 : 0
        const previousConversionRate =
          previousPeriodLeads > 0
            ? (previousConverted / previousPeriodLeads) * 100
            : 0

        const leadGrowthRate =
          previousPeriodLeads > 0
            ? ((recentLeads - previousPeriodLeads) / previousPeriodLeads) * 100
            : 0

        const totalPipelineValue = pipelineValue[0]?.total || 0
        const projectedConversions = Math.round(
          (recentLeads * conversionRate) / 100
        )
        const avgDealValue =
          convertedLeads > 0 ? totalPipelineValue / totalLeads : 0
        const projectedRevenue = Math.round(projectedConversions * avgDealValue)

        const nextMonthLeads = Math.round(
          recentLeads * (1 + leadGrowthRate / 100)
        )
        const nextMonthConversions = Math.round(
          (nextMonthLeads * conversionRate) / 100
        )
        const nextMonthRevenue = Math.round(nextMonthConversions * avgDealValue)

        const leadsByPriority = await Lead.aggregate([
          {
            $match: {
              workspaceId,
              convertedToContactId: { $exists: false },
            },
          },
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 },
              totalValue: { $sum: '$value' },
            },
          },
        ])

        const priorityBreakdown = Object.fromEntries(
          leadsByPriority.map((p: any) => [
            p._id,
            { count: p.count, value: p.totalValue },
          ])
        )

        return {
          currentMonth: {
            leads: recentLeads,
            conversions: convertedLeads,
            conversionRate: Math.round(conversionRate * 10) / 10,
            pipelineValue: totalPipelineValue,
          },
          previousMonth: {
            leads: previousPeriodLeads,
            conversions: previousConverted,
            conversionRate: Math.round(previousConversionRate * 10) / 10,
          },
          forecast: {
            nextMonthLeads,
            nextMonthConversions,
            nextMonthRevenue,
            projectedRevenue,
            leadGrowthRate: Math.round(leadGrowthRate * 10) / 10,
          },
          pipeline: {
            totalLeads,
            totalValue: totalPipelineValue,
            highPriorityLeads,
            avgDealValue: Math.round(avgDealValue),
            priorityBreakdown,
          },
        }
      },
      300
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    )
  }
}
