import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Asset, AssetAllocation, AssetMaintenance } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId)
    const now = new Date()
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Total assets count
    const totalAssets = await Asset.countDocuments({ workspaceId: workspaceObjectId })

    // Count by status
    const statusBreakdown = await Asset.aggregate([
      { $match: { workspaceId: workspaceObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const byStatus: Record<string, number> = {}
    for (const item of statusBreakdown) {
      byStatus[item._id] = item.count
    }

    // Total portfolio value
    const portfolioValue = await Asset.aggregate([
      { $match: { workspaceId: workspaceObjectId } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$purchasePrice' }
        }
      }
    ])

    const totalPortfolioValue = portfolioValue[0]?.totalValue || 0

    // Count by category with value
    const categoryBreakdown = await Asset.aggregate([
      { $match: { workspaceId: workspaceObjectId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$purchasePrice' }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Upcoming maintenance (next 30 days)
    const upcomingMaintenance = await AssetMaintenance.countDocuments({
      workspaceId: workspaceObjectId,
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledDate: { $gte: now, $lte: next30Days }
    })

    // Overdue returns from AssetAllocation
    const overdueReturns = await AssetAllocation.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'active',
      expectedReturnDate: { $lt: now }
    })

    return NextResponse.json({
      totalAssets,
      byStatus: {
        available: byStatus['available'] || 0,
        allocated: byStatus['allocated'] || 0,
        maintenance: byStatus['maintenance'] || 0,
        retired: byStatus['retired'] || 0,
        lost: byStatus['lost'] || 0,
        damaged: byStatus['damaged'] || 0
      },
      totalPortfolioValue,
      categoryBreakdown,
      upcomingMaintenance,
      overdueReturns
    })
  } catch (error) {
    log.error('Get asset stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset statistics' },
      { status: 500 }
    )
  }
}
