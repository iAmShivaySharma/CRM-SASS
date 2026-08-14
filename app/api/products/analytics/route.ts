import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Product, StockMovement } from '@/lib/mongodb/client'
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

        const [overview, byCategory, recentMovements, topMoving] =
          await Promise.all([
            Product.aggregate([
              { $match: { workspaceId, isActive: true } },
              {
                $group: {
                  _id: null,
                  totalProducts: { $sum: 1 },
                  totalStockValue: {
                    $sum: { $multiply: ['$currentStock', '$buyPrice'] },
                  },
                  totalSellValue: {
                    $sum: { $multiply: ['$currentStock', '$sellPrice'] },
                  },
                  outOfStock: {
                    $sum: { $cond: [{ $lte: ['$currentStock', 0] }, 1, 0] },
                  },
                  lowStock: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gt: ['$currentStock', 0] },
                            { $lte: ['$currentStock', '$lowStockThreshold'] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ]),

            Product.aggregate([
              { $match: { workspaceId, isActive: true } },
              {
                $group: {
                  _id: '$category',
                  count: { $sum: 1 },
                  totalStock: { $sum: '$currentStock' },
                  totalValue: {
                    $sum: { $multiply: ['$currentStock', '$buyPrice'] },
                  },
                },
              },
              { $sort: { totalValue: -1 } },
            ]),

            StockMovement.find({ workspaceId })
              .sort({ createdAt: -1 })
              .limit(20)
              .populate('productId', 'name sku')
              .populate('performedBy', 'fullName')
              .lean(),

            StockMovement.aggregate([
              { $match: { workspaceId, type: 'out' } },
              {
                $group: {
                  _id: '$productId',
                  totalOut: { $sum: '$quantity' },
                  movements: { $sum: 1 },
                },
              },
              { $sort: { totalOut: -1 } },
              { $limit: 10 },
            ]),
          ])

        // Enrich top moving with product names
        const topProductIds = topMoving.map((t: any) => t._id)
        const topProducts = await Product.find({ _id: { $in: topProductIds } })
          .select('name sku')
          .lean()
        const productMap: Record<string, any> = {}
        topProducts.forEach((p: any) => {
          productMap[p._id.toString()] = p
        })

        const stats = overview[0] || {
          totalProducts: 0,
          totalStockValue: 0,
          totalSellValue: 0,
          outOfStock: 0,
          lowStock: 0,
        }

        return NextResponse.json({
          success: true,
          analytics: {
            overview: {
              ...stats,
              potentialProfit: Math.round(
                stats.totalSellValue - stats.totalStockValue
              ),
            },
            byCategory: byCategory.map((c: any) => ({
              category: c._id || 'Uncategorized',
              count: c.count,
              totalStock: c.totalStock,
              totalValue: Math.round(c.totalValue),
            })),
            recentMovements: recentMovements.map((m: any) => ({
              ...m,
              id: m._id,
              productId:
                typeof m.productId === 'object' && m.productId
                  ? { ...m.productId, id: m.productId._id }
                  : m.productId,
              performedBy:
                typeof m.performedBy === 'object' && m.performedBy
                  ? { ...m.performedBy, id: m.performedBy._id }
                  : m.performedBy,
            })),
            topMovingProducts: topMoving.map((t: any) => ({
              productId: t._id,
              name: productMap[t._id]?.name || 'Unknown',
              sku: productMap[t._id]?.sku || '',
              totalOut: t.totalOut,
              movements: t.movements,
            })),
          },
        })
      } catch (error) {
        log.error('Inventory analytics error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
